import { describe, expect, it } from "vitest";
import { getDepthValidationError } from "@/components/EngineLines";
import { formatEvaluation } from "@/components/EvalBar";
import {
  CurrentPositionAnalysis,
  type PositionAnalysisEngine,
} from "@/lib/current-position-analysis";
import { findGameContinuationIndex } from "@/lib/pv-navigation";
import type { EngineLine } from "@/lib/types";

const quietLine: EngineLine = {
  multipv: 1,
  score: { type: "cp", value: 24 },
  pv: ["e2e4"],
  depth: 12,
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function lineAt(depth: number): EngineLine[] {
  return [{ ...quietLine, depth }];
}

describe("review page position analysis", () => {
  it("formats centipawn and mate evaluations for the current-position eval bar", () => {
    expect(formatEvaluation({ type: "cp", value: 125 })).toBe("+1.25");
    expect(formatEvaluation({ type: "cp", value: -50 })).toBe("-0.50");
    expect(formatEvaluation({ type: "mate", value: 3 })).toBe("M3");
    expect(formatEvaluation({ type: "mate", value: -2 })).toBe("−M2");
    expect(formatEvaluation({ type: "mate", value: 0 })).toBe("Mate");
  });

  it("accepts only integer maximum depths from 10 through 25", () => {
    expect(getDepthValidationError(10)).toBeNull();
    expect(getDepthValidationError(25)).toBeNull();
    expect(getDepthValidationError(9)).toMatch(/10 to 25/);
    expect(getDepthValidationError(26)).toMatch(/10 to 25/);
    expect(getDepthValidationError(18.5)).toMatch(/whole number/);
    expect(getDepthValidationError(Number.NaN)).toMatch(/whole number/);
  });

  it("publishes depths 12 through the selected maximum in order", async () => {
    const calls: number[] = [];
    const updates: Array<{ depth: number; complete: boolean }> = [];
    const done = deferred<void>();
    const engine: PositionAnalysisEngine = {
      analyzeLines: async (_fen, depth, multiPV) => {
        expect(multiPV).toBe(3);
        calls.push(depth);
        return lineAt(depth);
      },
      stop: () => undefined,
    };
    const analysis = new CurrentPositionAnalysis(engine, 3, { debounceMs: 0 });

    analysis.analyze("current-fen", 18, {
      onResult: (_lines, depth, complete) => {
        updates.push({ depth, complete });
        if (complete) done.resolve();
      },
      onError: done.reject,
    });

    await done.promise;
    expect(calls).toEqual([12, 13, 14, 15, 16, 17, 18]);
    expect(updates).toEqual([
      { depth: 12, complete: false },
      { depth: 13, complete: false },
      { depth: 14, complete: false },
      { depth: 15, complete: false },
      { depth: 16, complete: false },
      { depth: 17, complete: false },
      { depth: 18, complete: true },
    ]);
  });

  it("publishes only the latest result when the position changes", async () => {
    const first = deferred<EngineLine[]>();
    const second = deferred<EngineLine[]>();
    const signals: AbortSignal[] = [];
    let callCount = 0;
    let stopCount = 0;
    const engine: PositionAnalysisEngine = {
      analyzeLines: (_fen, _depth, _multiPV, signal) => {
        if (signal) signals.push(signal);
        callCount += 1;
        return callCount === 1 ? first.promise : second.promise;
      },
      stop: () => { stopCount += 1; },
    };
    const analysis = new CurrentPositionAnalysis(engine, 3, { debounceMs: 0 });
    const published: Array<{ depth: number; lines: EngineLine[] }> = [];
    const errors: Error[] = [];

    analysis.analyze("old-fen", 18, {
      onResult: (lines, depth) => published.push({ depth, lines }),
      onError: (reason) => errors.push(reason),
    });
    analysis.analyze("new-fen", 12, {
      onResult: (lines, depth) => published.push({ depth, lines }),
      onError: (reason) => errors.push(reason),
    });

    expect(signals[0].aborted).toBe(true);
    first.resolve(lineAt(12));
    await Promise.resolve();
    expect(published).toEqual([]);

    const latestLines = lineAt(12);
    second.resolve(latestLines);
    await Promise.resolve();
    expect(published).toEqual([{ depth: 12, lines: latestLines }]);
    expect(errors).toEqual([]);
    expect(stopCount).toBeGreaterThanOrEqual(2);
  });

  it("does not use a single-PV batch result as a three-line live cache hit", async () => {
    const calls: number[] = [];
    const done = deferred<void>();
    const engine: PositionAnalysisEngine = {
      analyzeLines: async (_fen, depth) => {
        calls.push(depth);
        return lineAt(depth);
      },
      stop: () => undefined,
    };
    const analysis = new CurrentPositionAnalysis(engine, 3, { debounceMs: 0 });
    analysis.populateCache("current-fen", 14, lineAt(14), 1);

    analysis.analyze("current-fen", 14, {
      onResult: (_lines, _depth, complete) => { if (complete) done.resolve(); },
      onError: done.reject,
    });

    await done.promise;
    expect(calls).toEqual([12, 13, 14]);
  });
});

describe("engine-line game navigation", () => {
  const gameMoves = [
    { uci: "e2e4" },
    { uci: "e7e5" },
    { uci: "g1f3" },
    { uci: "b8c6" },
  ];

  it("returns the game index reached by a matching PV prefix", () => {
    expect(findGameContinuationIndex(gameMoves, -1, ["e2e4"])).toBe(0);
    expect(findGameContinuationIndex(gameMoves, 0, ["e7e5", "g1f3"])).toBe(2);
  });

  it("keeps divergent or out-of-range PV moves as previews", () => {
    expect(findGameContinuationIndex(gameMoves, 0, ["c7c5"])).toBeNull();
    expect(findGameContinuationIndex(gameMoves, 3, ["a2a3"])).toBeNull();
    expect(findGameContinuationIndex(gameMoves, 0, [])).toBeNull();
  });
});
