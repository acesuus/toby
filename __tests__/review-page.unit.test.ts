import { describe, expect, it } from "vitest";
import { getDepthValidationError } from "@/components/EngineLines";
import { formatEvaluation } from "@/components/EvalBar";
import {
  CurrentPositionAnalysis,
  type PositionAnalysisEngine,
} from "@/lib/current-position-analysis";
import type { EngineLine } from "@/lib/types";

const quietLine: EngineLine = {
  multipv: 1,
  score: { type: "cp", value: 24 },
  pv: ["e2e4"],
  depth: 18,
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

describe("review page position analysis", () => {
  it("formats centipawn and mate evaluations for the current-position eval bar", () => {
    expect(formatEvaluation({ type: "cp", value: 125 })).toBe("+1.25");
    expect(formatEvaluation({ type: "cp", value: -50 })).toBe("-0.50");
    expect(formatEvaluation({ type: "mate", value: 3 })).toBe("M3");
    expect(formatEvaluation({ type: "mate", value: -2 })).toBe("−M2");
    expect(formatEvaluation({ type: "mate", value: 0 })).toBe("Mate");
  });

  it("accepts only integer Stockfish depths from 10 through 25", () => {
    expect(getDepthValidationError(10)).toBeNull();
    expect(getDepthValidationError(25)).toBeNull();
    expect(getDepthValidationError(9)).toMatch(/10 to 25/);
    expect(getDepthValidationError(26)).toMatch(/10 to 25/);
    expect(getDepthValidationError(18.5)).toMatch(/whole number/);
    expect(getDepthValidationError(Number.NaN)).toMatch(/whole number/);
  });

  it("analyzes only the requested position with the configured depth and three lines", async () => {
    const calls: Array<{ fen: string; depth: number; multiPV: number }> = [];
    const engine: PositionAnalysisEngine = {
      analyzeLines: async (fen, depth, multiPV) => {
        calls.push({ fen, depth, multiPV });
        return [quietLine];
      },
      stop: () => undefined,
    };
    const analysis = new CurrentPositionAnalysis(engine, 3);
    const result = deferred<EngineLine[]>();

    analysis.analyze("current-fen", 22, {
      onResult: result.resolve,
      onError: result.reject,
    });

    await expect(result.promise).resolves.toEqual([quietLine]);
    expect(calls).toEqual([{ fen: "current-fen", depth: 22, multiPV: 3 }]);
  });

  it("publishes only the latest result when position or depth changes", async () => {
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
    const analysis = new CurrentPositionAnalysis(engine, 3);
    const published: EngineLine[][] = [];
    const errors: Error[] = [];

    analysis.analyze("old-fen", 18, { onResult: (lines) => published.push(lines), onError: (reason) => errors.push(reason) });
    analysis.analyze("new-fen", 24, { onResult: (lines) => published.push(lines), onError: (reason) => errors.push(reason) });

    expect(signals[0].aborted).toBe(true);
    first.resolve([{ ...quietLine, depth: 18 }]);
    await Promise.resolve();
    expect(published).toEqual([]);

    const latestLines = [{ ...quietLine, depth: 24 }];
    second.resolve(latestLines);
    await Promise.resolve();
    expect(published).toEqual([latestLines]);
    expect(errors).toEqual([]);
    expect(stopCount).toBeGreaterThanOrEqual(2);
  });
});
