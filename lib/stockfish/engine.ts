/**
 * StockfishEngine class — main-thread interface to Stockfish running in a Web Worker.
 *
 * Loads the Stockfish WASM binary directly as a Web Worker (the stockfish.js file
 * IS the worker script). Communicates via UCI protocol over postMessage.
 *
 * SECURITY GUARANTEE: All engine analysis runs entirely within the browser.
 * No game data is transmitted to any external server (Requirements 14.5, 14.6).
 */

import type { EngineEvaluation, EngineLine, EvalScore } from "@/lib/types";

/** Initialization timeout in milliseconds (30 seconds). */
const INIT_TIMEOUT_MS = 30_000;

/**
 * UCI scores are reported from the side-to-move's perspective. This normalizes
 * a score to white's perspective (positive = white better) based on the FEN.
 */
function normalizeScoreToWhite(score: EvalScore, fen: string): EvalScore {
  const sideToMove = fen.split(" ")[1];
  if (sideToMove === "b") {
    return { type: score.type, value: -score.value };
  }
  return score;
}

/**
 * StockfishEngine wraps the Stockfish Web Worker and exposes a Promise-based API
 * for position evaluation. All commands are serialized via an internal queue.
 */
export class StockfishEngine {
  private worker: Worker | null = null;
  private _isReady: boolean = false;
  private _isMultiThreaded: boolean = false;
  private queue: Promise<void> = Promise.resolve();
  private messageListeners: ((line: string) => void)[] = [];
  private currentMultiPV = 1;

  /**
   * Spawns the Stockfish Web Worker and initializes it via UCI protocol.
   */
  async initialize(): Promise<void> {
    let hasSharedArrayBuffer = false;
    try {
      hasSharedArrayBuffer = typeof SharedArrayBuffer !== "undefined";
    } catch {
      hasSharedArrayBuffer = false;
    }

    this._isMultiThreaded = hasSharedArrayBuffer;

    const workerPath = hasSharedArrayBuffer
      ? "/stockfish/stockfish.js"
      : "/stockfish/stockfish-single.js";

    // The stockfish.js file IS the worker script — load it directly
    this.worker = new Worker(workerPath);

    this.worker.onmessage = (event: MessageEvent) => {
      const line = typeof event.data === "string" ? event.data : String(event.data);
      for (const listener of [...this.messageListeners]) {
        listener(line);
      }
    };

    const initPromise = new Promise<void>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this._cleanup();
        reject(new Error("Stockfish initialization timed out after 30 seconds"));
      }, INIT_TIMEOUT_MS);

      const waitForUciOk = (line: string) => {
        if (line.includes("uciok")) {
          this._removeListener(waitForUciOk);
          clearTimeout(timeoutId);

          if (hasSharedArrayBuffer) {
            this._send("setoption name Threads value 4");
          }
          this._send("setoption name Hash value 32");

          const waitForReady = (readyLine: string) => {
            if (readyLine.includes("readyok")) {
              this._removeListener(waitForReady);
              this._isReady = true;
              resolve();
            }
          };
          this._addListener(waitForReady);
          this._send("isready");
        }
      };

      this._addListener(waitForUciOk);

      if (this.worker) {
        this.worker.onerror = (event) => {
          clearTimeout(timeoutId);
          this._cleanup();
          reject(new Error(`Stockfish worker error: ${event.message || "failed to load"}`));
        };
      }
    });

    this._send("uci");

    return initPromise;
  }

  /**
   * Evaluates a position at the given depth (MultiPV 1). Returns a full
   * EngineEvaluation with the score normalized to white's perspective.
   */
  async evaluate(fen: string, depth: number): Promise<EngineEvaluation> {
    return this._enqueue(() => this._evaluateOnce(fen, depth, true));
  }

  /**
   * Analyzes a position and returns the top N candidate lines (MultiPV).
   * Scores are normalized to white's perspective.
   */
  async analyzeLines(
    fen: string,
    depth: number,
    multiPV: number,
    signal?: AbortSignal
  ): Promise<EngineLine[]> {
    return this._enqueue(async () => {
      if (signal?.aborted) {
        const error = new Error("Position analysis cancelled");
        error.name = "AbortError";
        throw error;
      }

      const stopOnAbort = () => this.stop();
      signal?.addEventListener("abort", stopOnAbort, { once: true });

      try {
        const lines = await this._analyzeLinesOnce(fen, depth, multiPV);
        if (signal?.aborted) {
          const error = new Error("Position analysis cancelled");
          error.name = "AbortError";
          throw error;
        }
        return lines;
      } finally {
        signal?.removeEventListener("abort", stopOnAbort);
      }
    });
  }

  /**
   * Gets the best move for a position at the given depth.
   */
  async getBestMove(fen: string, depth: number): Promise<string> {
    return this._enqueue(async () => {
      const result = await this._evaluateOnce(fen, depth, true);
      return result.bestMove;
    });
  }

  /**
   * Sends a "stop" command to end the current search early. The in-flight
   * analysis will resolve with the best result found so far.
   */
  stop(): void {
    if (this.worker && this._isReady) {
      try {
        this.worker.postMessage("stop");
      } catch {
        // ignore
      }
    }
  }

  /**
   * Terminates the Web Worker and frees all resources.
   */
  terminate(): void {
    if (this.worker) {
      try {
        this.worker.postMessage("quit");
      } catch {
        // ignore
      }
      this.worker.terminate();
    }
    this._cleanup();
  }

  isReady(): boolean {
    return this._isReady;
  }

  isMultiThreaded(): boolean {
    return this._isMultiThreaded;
  }

  // --- Private Helpers ---

  private _enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.queue.then(operation);
    this.queue = result.then(() => undefined, () => undefined);
    return result;
  }

  private async _setMultiPV(value: number): Promise<void> {
    if (this.currentMultiPV === value) return;
    this.currentMultiPV = value;
    this._send(`setoption name MultiPV value ${value}`);
    await this._waitForReady();
  }

  private async _evaluateOnce(
    fen: string,
    depth: number,
    canRetry: boolean
  ): Promise<EngineEvaluation> {
    this._assertReady();

    try {
      await this._setMultiPV(1);
      await this._waitForReady();

      return await new Promise<EngineEvaluation>((resolve, reject) => {
        let lastInfo:
          | { depth: number; score: EvalScore; pv: string[]; nodes: number; time: number }
          | null = null;

        const timeoutId = setTimeout(() => {
          this._removeListener(listener);
          reject(new Error(`Evaluation timed out for position: ${fen}`));
        }, 60000);

        const listener = (line: string) => {
          if (
            line.startsWith("info") &&
            line.includes(" score ") &&
            !line.includes("upperbound") &&
            !line.includes("lowerbound")
          ) {
            const parsed = this._parseInfoLine(line);
            if (parsed && (!lastInfo || parsed.depth >= lastInfo.depth)) {
              lastInfo = parsed;
            }
          }

          if (line.startsWith("bestmove")) {
            clearTimeout(timeoutId);
            this._removeListener(listener);

            const bestMove = line.split(" ")[1] || "";

            if (!bestMove) {
              reject(new Error(`Failed to parse engine output for position: ${fen}`));
              return;
            }

            resolve({
              fen,
              depth: lastInfo?.depth || 0,
              score: normalizeScoreToWhite(lastInfo?.score || { type: "mate", value: 0 }, fen),
              bestMove,
              pv: lastInfo?.pv || [],
              nodes: lastInfo?.nodes || 0,
              time: lastInfo?.time || 0,
            });
          }
        };

        this._addListener(listener);
        this._send(`position fen ${fen}`);
        this._send(`go depth ${depth}`);
      });
    } catch (err) {
      if (canRetry) {
        return this._evaluateOnce(fen, depth, false);
      }
      throw err;
    }
  }

  private async _analyzeLinesOnce(
    fen: string,
    depth: number,
    multiPV: number
  ): Promise<EngineLine[]> {
    this._assertReady();

    await this._setMultiPV(multiPV);
    await this._waitForReady();

    return await new Promise<EngineLine[]>((resolve, reject) => {
      // Track the deepest info line seen for each multipv index
      const bestByPv = new Map<number, { depth: number; score: EvalScore; pv: string[] }>();

      const timeoutId = setTimeout(() => {
        this._removeListener(listener);
        // Resolve with whatever we have rather than erroring
        resolve(buildLines());
      }, 60000);

      const buildLines = (): EngineLine[] => {
        const lines: EngineLine[] = [];
        for (const [multipv, data] of bestByPv.entries()) {
          lines.push({
            multipv,
            score: normalizeScoreToWhite(data.score, fen),
            pv: data.pv,
            depth: data.depth,
          });
        }
        lines.sort((a, b) => a.multipv - b.multipv);
        return lines;
      };

      const listener = (line: string) => {
        if (
          line.startsWith("info") &&
          line.includes(" score ") &&
          line.includes(" multipv ") &&
          !line.includes("upperbound") &&
          !line.includes("lowerbound")
        ) {
          const parsed = this._parseInfoLine(line);
          if (parsed && parsed.multipv != null) {
            const existing = bestByPv.get(parsed.multipv);
            if (!existing || parsed.depth >= existing.depth) {
              bestByPv.set(parsed.multipv, {
                depth: parsed.depth,
                score: parsed.score,
                pv: parsed.pv,
              });
            }
          }
        }

        if (line.startsWith("bestmove")) {
          clearTimeout(timeoutId);
          this._removeListener(listener);
          resolve(buildLines());
        }
      };

      this._addListener(listener);
      this._send(`position fen ${fen}`);
      this._send(`go depth ${depth}`);
    });
  }

  private _parseInfoLine(line: string): {
    depth: number;
    multipv: number | null;
    score: EvalScore;
    pv: string[];
    nodes: number;
    time: number;
  } | null {
    const parts = line.split(/\s+/);

    const depthIdx = parts.indexOf("depth");
    const depth = depthIdx !== -1 ? parseInt(parts[depthIdx + 1], 10) : 0;

    const multipvIdx = parts.indexOf("multipv");
    const multipv = multipvIdx !== -1 ? parseInt(parts[multipvIdx + 1], 10) : null;

    const scoreIdx = parts.indexOf("score");
    if (scoreIdx === -1) return null;

    let score: EvalScore;
    const scoreType = parts[scoreIdx + 1];
    const scoreValue = parseInt(parts[scoreIdx + 2], 10);
    if (scoreType === "mate") {
      score = { type: "mate", value: scoreValue };
    } else {
      score = { type: "cp", value: scoreValue };
    }

    const nodesIdx = parts.indexOf("nodes");
    const nodes = nodesIdx !== -1 ? parseInt(parts[nodesIdx + 1], 10) : 0;

    const timeIdx = parts.indexOf("time");
    const time = timeIdx !== -1 ? parseInt(parts[timeIdx + 1], 10) : 0;

    const pvIdx = parts.indexOf("pv");
    const pv = pvIdx !== -1 ? parts.slice(pvIdx + 1) : [];

    return { depth, multipv, score, pv, nodes, time };
  }

  private _waitForReady(): Promise<void> {
    return new Promise<void>((resolve) => {
      const listener = (line: string) => {
        if (line.includes("readyok")) {
          this._removeListener(listener);
          resolve();
        }
      };
      this._addListener(listener);
      this._send("isready");
    });
  }

  private _send(command: string): void {
    if (!this.worker) {
      throw new Error("Cannot send command: worker is not available");
    }
    this.worker.postMessage(command);
  }

  private _addListener(listener: (line: string) => void): void {
    this.messageListeners.push(listener);
  }

  private _removeListener(listener: (line: string) => void): void {
    this.messageListeners = this.messageListeners.filter((l) => l !== listener);
  }

  private _assertReady(): void {
    if (!this._isReady || !this.worker) {
      throw new Error("Stockfish engine is not initialized");
    }
  }

  private _cleanup(): void {
    this._isReady = false;
    this._isMultiThreaded = false;
    this.messageListeners = [];
    this.currentMultiPV = 1;
    this.worker = null;
  }
}

/**
 * Factory function to create and initialize a StockfishEngine instance.
 */
export async function createStockfishEngine(): Promise<StockfishEngine> {
  const engine = new StockfishEngine();
  await engine.initialize();
  return engine;
}
