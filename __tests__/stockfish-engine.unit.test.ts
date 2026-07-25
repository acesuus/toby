import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Unit tests for StockfishEngine class.
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.7, 6.5, 6.6, 6.8
 *
 * Since StockfishEngine creates a Web Worker (unavailable in Node.js),
 * we mock the Worker constructor and simulate the UCI text protocol.
 */

// --- Mock Worker Implementation ---

class MockWorker {
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public onerror: ((event: ErrorEvent) => void) | null = null;
  private terminated = false;

  /** Controls how the mock responds to UCI commands. Override per test. */
  public onPostMessage: ((data: string) => void) | null = null;

  postMessage(data: unknown) {
    if (this.terminated) return;
    if (this.onPostMessage && typeof data === "string") {
      this.onPostMessage(data);
    }
  }

  terminate() {
    this.terminated = true;
  }

  /** Simulate the engine sending a UCI response line */
  simulateResponse(line: string) {
    if (this.onmessage) {
      this.onmessage({ data: line } as MessageEvent);
    }
  }

  get isTerminated() {
    return this.terminated;
  }
}

// --- Test Setup ---

let mockWorkerInstance: MockWorker;

beforeEach(() => {
  vi.stubGlobal(
    "Worker",
    class extends MockWorker {
      constructor() {
        super();
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        mockWorkerInstance = this;
      }
    }
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

// Dynamic import to ensure the mock is in place before module loads
async function loadEngine() {
  const mod = await import("@/lib/stockfish/engine");
  return mod;
}

// --- Helper: set up UCI initialization flow ---

function setupInitFlow(multiThreaded = false) {
  // Simulate the UCI initialization handshake
  mockWorkerInstance.onPostMessage = (cmd: string) => {
    if (cmd === "uci") {
      setTimeout(() => {
        mockWorkerInstance.simulateResponse("id name Stockfish 18");
        mockWorkerInstance.simulateResponse("uciok");
      }, 5);
    } else if (cmd === "isready") {
      setTimeout(() => {
        mockWorkerInstance.simulateResponse("readyok");
      }, 5);
    }
  };

  // Mock SharedArrayBuffer detection
  if (multiThreaded) {
    vi.stubGlobal("SharedArrayBuffer", ArrayBuffer);
  }
}

// --- Tests ---

describe("StockfishEngine", () => {
  describe("Initialization", () => {
    test("initialization success sets isReady to true", async () => {
      const { StockfishEngine } = await loadEngine();

      vi.stubGlobal(
        "Worker",
        class extends MockWorker {
          constructor() {
            super();
            // eslint-disable-next-line @typescript-eslint/no-this-alias
            mockWorkerInstance = this;
            this.onPostMessage = (cmd) => {
              if (cmd === "uci") {
                setTimeout(() => {
                  this.simulateResponse("id name Stockfish 18");
                  this.simulateResponse("uciok");
                }, 5);
              } else if (cmd === "isready") {
                setTimeout(() => {
                  this.simulateResponse("readyok");
                }, 5);
              }
            };
          }
        }
      );

      const engine = new StockfishEngine();
      await engine.initialize();

      expect(engine.isReady()).toBe(true);
    });

    test("initialization reports multiThreaded based on SharedArrayBuffer", async () => {
      vi.stubGlobal("SharedArrayBuffer", ArrayBuffer);
      const { StockfishEngine } = await loadEngine();

      vi.stubGlobal(
        "Worker",
        class extends MockWorker {
          constructor() {
            super();
            // eslint-disable-next-line @typescript-eslint/no-this-alias
            mockWorkerInstance = this;
            this.onPostMessage = (cmd) => {
              if (cmd === "uci") {
                setTimeout(() => {
                  this.simulateResponse("uciok");
                }, 5);
              } else if (cmd === "isready") {
                setTimeout(() => {
                  this.simulateResponse("readyok");
                }, 5);
              }
            };
          }
        }
      );

      const engine = new StockfishEngine();
      await engine.initialize();

      expect(engine.isMultiThreaded()).toBe(true);
    });

    test("initialization rejects after 30 second timeout", async () => {
      vi.useFakeTimers();
      const { StockfishEngine } = await loadEngine();

      // Worker never responds
      vi.stubGlobal(
        "Worker",
        class extends MockWorker {
          constructor() {
            super();
            // eslint-disable-next-line @typescript-eslint/no-this-alias
            mockWorkerInstance = this;
            this.onPostMessage = () => {}; // Never respond
          }
        }
      );

      const engine = new StockfishEngine();
      const initPromise = engine.initialize();
      const resultPromise = initPromise.catch((err) => err);

      await vi.advanceTimersByTimeAsync(30_001);

      const error = await resultPromise;
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain("timed out");
      expect(engine.isReady()).toBe(false);

      vi.useRealTimers();
    });
  });

  describe("Evaluation", () => {
    test("evaluate returns parsed EngineEvaluation", async () => {
      const { StockfishEngine } = await loadEngine();

      vi.stubGlobal(
        "Worker",
        class extends MockWorker {
          constructor() {
            super();
            // eslint-disable-next-line @typescript-eslint/no-this-alias
            mockWorkerInstance = this;
            this.onPostMessage = (cmd) => {
              if (cmd === "uci") {
                setTimeout(() => this.simulateResponse("uciok"), 5);
              } else if (cmd === "isready") {
                setTimeout(() => this.simulateResponse("readyok"), 5);
              } else if (cmd.startsWith("go depth")) {
                setTimeout(() => {
                  this.simulateResponse("info depth 18 score cp 35 nodes 284920 time 200 pv e2e4 e7e5");
                  this.simulateResponse("bestmove e2e4 ponder e7e5");
                }, 10);
              }
            };
          }
        }
      );

      const engine = new StockfishEngine();
      await engine.initialize();

      const result = await engine.evaluate(
        "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        18
      );

      expect(result.score).toEqual({ type: "cp", value: 35 });
      expect(result.bestMove).toBe("e2e4");
      expect(result.pv).toContain("e2e4");
      expect(result.nodes).toBe(284920);
    });

    test("evaluations are processed sequentially", async () => {
      const { StockfishEngine } = await loadEngine();
      const evalOrder: string[] = [];

      vi.stubGlobal(
        "Worker",
        class extends MockWorker {
          constructor() {
            super();
            // eslint-disable-next-line @typescript-eslint/no-this-alias
            mockWorkerInstance = this;
            this.onPostMessage = (cmd) => {
              if (cmd === "uci") {
                setTimeout(() => this.simulateResponse("uciok"), 5);
              } else if (cmd === "isready") {
                setTimeout(() => this.simulateResponse("readyok"), 5);
              } else if (cmd.startsWith("position fen")) {
                evalOrder.push(cmd);
              } else if (cmd.startsWith("go depth")) {
                const delay = evalOrder.length === 1 ? 50 : 20;
                setTimeout(() => {
                  this.simulateResponse("info depth 18 score cp 0 nodes 1000 time 100 pv e2e4");
                  this.simulateResponse("bestmove e2e4");
                }, delay);
              }
            };
          }
        }
      );

      const engine = new StockfishEngine();
      await engine.initialize();

      const eval1 = engine.evaluate("fen1 w - - 0 1", 18);
      const eval2 = engine.evaluate("fen2 w - - 0 1", 18);

      await Promise.all([eval1, eval2]);

      // Both evaluations should have been sent
      expect(evalOrder).toHaveLength(2);
      expect(evalOrder[0]).toContain("fen1");
      expect(evalOrder[1]).toContain("fen2");
    });
  });

  describe("Termination", () => {
    test("terminate() calls worker.terminate() and resets state", async () => {
      const { StockfishEngine } = await loadEngine();

      vi.stubGlobal(
        "Worker",
        class extends MockWorker {
          constructor() {
            super();
            // eslint-disable-next-line @typescript-eslint/no-this-alias
            mockWorkerInstance = this;
            this.onPostMessage = (cmd) => {
              if (cmd === "uci") {
                setTimeout(() => this.simulateResponse("uciok"), 5);
              } else if (cmd === "isready") {
                setTimeout(() => this.simulateResponse("readyok"), 5);
              }
            };
          }
        }
      );

      const engine = new StockfishEngine();
      await engine.initialize();
      expect(engine.isReady()).toBe(true);

      engine.terminate();

      expect(engine.isReady()).toBe(false);
      expect(mockWorkerInstance.isTerminated).toBe(true);
    });
  });

  describe("Retry on Error", () => {
    test("evaluate retries once on error then resolves on second attempt", async () => {
      const { StockfishEngine } = await loadEngine();
      let evalAttempt = 0;

      vi.stubGlobal(
        "Worker",
        class extends MockWorker {
          constructor() {
            super();
            // eslint-disable-next-line @typescript-eslint/no-this-alias
            mockWorkerInstance = this;
            this.onPostMessage = (cmd) => {
              if (cmd === "uci") {
                setTimeout(() => this.simulateResponse("uciok"), 5);
              } else if (cmd === "isready") {
                setTimeout(() => this.simulateResponse("readyok"), 5);
              } else if (cmd.startsWith("go depth")) {
                evalAttempt++;
                setTimeout(() => {
                  if (evalAttempt === 1) {
                    // First attempt: no info line, only bestmove with empty → will fail parse
                    this.simulateResponse("bestmove (none)");
                  } else {
                    // Second attempt: valid response
                    this.simulateResponse("info depth 18 score cp 42 nodes 5000 time 300 pv d2d4");
                    this.simulateResponse("bestmove d2d4");
                  }
                }, 5);
              }
            };
          }
        }
      );

      const engine = new StockfishEngine();
      await engine.initialize();

      const result = await engine.evaluate(
        "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        18
      );

      expect(result.score).toEqual({ type: "cp", value: 42 });
      expect(result.bestMove).toBe("d2d4");
      expect(evalAttempt).toBe(2);
    });
  });

  describe("Engine Not Initialized", () => {
    test("evaluate throws if engine not initialized", async () => {
      const { StockfishEngine } = await loadEngine();

      vi.stubGlobal(
        "Worker",
        class extends MockWorker {
          constructor() {
            super();
            // eslint-disable-next-line @typescript-eslint/no-this-alias
            mockWorkerInstance = this;
            this.onPostMessage = () => {};
          }
        }
      );

      const engine = new StockfishEngine();
      // Don't initialize

      await expect(
        engine.evaluate(
          "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
          18
        )
      ).rejects.toThrow("not initialized");
    });
  });
});
