import type { EngineLine } from "@/lib/types";

export const MIN_PROGRESSIVE_DEPTH = 12;

export interface PositionAnalysisEngine {
  analyzeLines(
    fen: string,
    depth: number,
    multiPV: number,
    signal?: AbortSignal
  ): Promise<EngineLine[]>;
  stop(): void;
}

interface PositionAnalysisCallbacks {
  onResult: (lines: EngineLine[], completedDepth: number, complete: boolean) => void;
  onError: (error: Error) => void;
}

interface CachedAnalysis {
  fen: string;
  depth: number;
  multiPV: number;
  lines: EngineLine[];
}

function cacheKey(fen: string, depth: number, multiPV: number): string {
  return `${fen}\0${depth}\0${multiPV}`;
}

/** Coordinates progressive live analysis with cancellation and depth-aware caching. */
export class CurrentPositionAnalysis {
  private requestId = 0;
  private controller: AbortController | null = null;
  private cache = new Map<string, CachedAnalysis>();
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly debounceMs: number;

  constructor(
    private readonly engine: PositionAnalysisEngine,
    private readonly multiPV: number,
    options?: { debounceMs?: number }
  ) {
    this.debounceMs = options?.debounceMs ?? 150;
  }

  analyze(
    fen: string,
    maxDepth: number,
    callbacks: PositionAnalysisCallbacks
  ): void {
    this.cancel();
    const requestId = this.requestId;

    const completeCached = this.findCachedAtLeast(fen, maxDepth);
    if (completeCached) {
      callbacks.onResult(completeCached.lines, completeCached.depth, true);
      return;
    }

    const intermediate = this.findBestCachedAtOrBelow(fen, maxDepth);
    if (intermediate) {
      callbacks.onResult(intermediate.lines, intermediate.depth, false);
    }

    const firstDepth = Math.min(MIN_PROGRESSIVE_DEPTH, maxDepth);
    const startDepth = Math.max(firstDepth, (intermediate?.depth ?? firstDepth - 1) + 1);

    const start = () => {
      if (requestId !== this.requestId) return;
      const controller = new AbortController();
      this.controller = controller;
      void this.runProgressive(fen, startDepth, maxDepth, requestId, controller, callbacks);
    };

    if (this.debounceMs <= 0) start();
    else {
      this.debounceTimer = setTimeout(() => {
        this.debounceTimer = null;
        start();
      }, this.debounceMs);
    }
  }

  populateCache(
    fen: string,
    depth: number,
    lines: EngineLine[],
    multiPV = Math.max(1, lines.length)
  ): void {
    this.setCache({ fen, depth, multiPV, lines });
  }

  isCached(fen: string, maxDepth: number): boolean {
    return this.findCachedAtLeast(fen, maxDepth) !== null;
  }

  clearCache(): void {
    this.cache.clear();
  }

  cancel(): void {
    this.requestId += 1;
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.controller?.abort();
    this.controller = null;
    this.engine.stop();
  }

  dispose(): void {
    this.cancel();
    this.cache.clear();
  }

  private async runProgressive(
    fen: string,
    startDepth: number,
    maxDepth: number,
    requestId: number,
    controller: AbortController,
    callbacks: PositionAnalysisCallbacks
  ): Promise<void> {
    try {
      for (let depth = startDepth; depth <= maxDepth; depth += 1) {
        if (!this.isCurrent(requestId, controller)) return;

        const cached = this.findExact(fen, depth);
        const lines = cached?.lines ?? await this.engine.analyzeLines(
          fen,
          depth,
          this.multiPV,
          controller.signal
        );

        if (!this.isCurrent(requestId, controller)) return;
        if (!cached) this.setCache({ fen, depth, multiPV: this.multiPV, lines });
        callbacks.onResult(lines, depth, depth === maxDepth);
      }

      if (this.isCurrent(requestId, controller)) this.controller = null;
    } catch (reason: unknown) {
      if (!this.isCurrent(requestId, controller)) return;
      this.controller = null;
      const error = reason instanceof Error
        ? reason
        : new Error("Position analysis failed");
      if (error.name !== "AbortError") callbacks.onError(error);
    }
  }

  private setCache(entry: CachedAnalysis): void {
    this.cache.set(cacheKey(entry.fen, entry.depth, entry.multiPV), entry);
  }

  private compatibleEntries(fen: string): CachedAnalysis[] {
    return [...this.cache.values()].filter(
      (entry) => entry.fen === fen && entry.multiPV >= this.multiPV
    );
  }

  private findExact(fen: string, depth: number): CachedAnalysis | null {
    return this.compatibleEntries(fen).find((entry) => entry.depth === depth) ?? null;
  }

  private findCachedAtLeast(fen: string, depth: number): CachedAnalysis | null {
    return this.compatibleEntries(fen)
      .filter((entry) => entry.depth >= depth)
      .sort((a, b) => a.depth - b.depth)[0] ?? null;
  }

  private findBestCachedAtOrBelow(fen: string, depth: number): CachedAnalysis | null {
    return this.compatibleEntries(fen)
      .filter((entry) => entry.depth <= depth)
      .sort((a, b) => b.depth - a.depth)[0] ?? null;
  }

  private isCurrent(requestId: number, controller: AbortController): boolean {
    return requestId === this.requestId && !controller.signal.aborted;
  }
}
