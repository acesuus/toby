import type { EngineLine } from "@/lib/types";

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
  onResult: (lines: EngineLine[]) => void;
  onError: (error: Error) => void;
}

/**
 * Cache key: "fen\0depth" → engine lines.
 * Results are cached after each successful analysis so that revisiting
 * a position returns instantly without re-running the engine.
 */
function cacheKey(fen: string, depth: number): string {
  return `${fen}\0${depth}`;
}

/**
 * Coordinates one position search at a time with an in-memory cache.
 * Superseded requests are aborted, stopped in Stockfish, and prevented
 * from publishing stale results. Previously-analyzed positions resolve
 * synchronously from cache.
 */
export class CurrentPositionAnalysis {
  private requestId = 0;
  private controller: AbortController | null = null;
  private cache = new Map<string, EngineLine[]>();
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private debounceMs: number;

  constructor(
    private readonly engine: PositionAnalysisEngine,
    private readonly multiPV: number,
    options?: { debounceMs?: number }
  ) {
    this.debounceMs = options?.debounceMs ?? 150;
  }

  /**
   * Analyze a position. If cached, returns immediately via callback.
   * Otherwise debounces rapid navigation, then sends to the engine.
   */
  analyze(
    fen: string,
    depth: number,
    callbacks: PositionAnalysisCallbacks
  ): void {
    this.cancel();

    // Check cache first — instant return for previously-analyzed positions
    const key = cacheKey(fen, depth);
    const cached = this.cache.get(key);
    if (cached) {
      callbacks.onResult(cached);
      return;
    }

    // Also check if we have a result at a higher depth that satisfies this request
    for (const [k, lines] of this.cache) {
      if (k.startsWith(fen + "\0")) {
        const cachedDepth = parseInt(k.split("\0")[1], 10);
        if (cachedDepth >= depth) {
          callbacks.onResult(lines);
          return;
        }
      }
    }

    const requestId = this.requestId;

    // Debounce: wait before firing the engine to handle rapid navigation
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;

      // Verify this request is still current after the debounce delay
      if (requestId !== this.requestId) return;

      const controller = new AbortController();
      this.controller = controller;

      void this.engine
        .analyzeLines(fen, depth, this.multiPV, controller.signal)
        .then((lines) => {
          if (this.isCurrent(requestId, controller)) {
            this.cache.set(key, lines);
            callbacks.onResult(lines);
          }
        })
        .catch((reason: unknown) => {
          if (!this.isCurrent(requestId, controller)) return;
          const error = reason instanceof Error ? reason : new Error("Position analysis failed");
          if (error.name !== "AbortError") callbacks.onError(error);
        });
    }, this.debounceMs);
  }

  /**
   * Pre-populate the cache with results from a full-game review.
   * Call this after analyzeGame() completes so navigating reviewed
   * positions is instant.
   */
  populateCache(fen: string, depth: number, lines: EngineLine[]): void {
    this.cache.set(cacheKey(fen, depth), lines);
  }

  /**
   * Check if a position is already cached (useful for UI hints).
   */
  isCached(fen: string, depth: number): boolean {
    return this.cache.has(cacheKey(fen, depth));
  }

  /**
   * Clear the entire cache (e.g., when loading a new game).
   */
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

  private isCurrent(requestId: number, controller: AbortController): boolean {
    return requestId === this.requestId && !controller.signal.aborted;
  }
}
