/**
 * Web Worker entry point for Stockfish WASM engine.
 *
 * This worker runs Stockfish in an isolated thread, communicating with the
 * main thread via postMessage. It handles UCI protocol communication with
 * the engine and supports both multi-threaded (SharedArrayBuffer) and
 * single-threaded fallback modes.
 *
 * Requirements: 5.1, 5.2, 5.3, 14.1
 */

import type { EvalScore, EngineEvaluation } from "@/lib/types";

// Web Worker globals not included in the default DOM lib
declare function importScripts(...urls: string[]): void;

// --- Message Types ---

/** Commands sent from the main thread to this worker */
export type WorkerCommand =
  | { type: "initialize" }
  | { type: "evaluate"; fen: string; depth: number }
  | { type: "getBestMove"; fen: string; depth: number }
  | { type: "terminate" };

/** Responses sent from this worker back to the main thread */
export type WorkerResponse =
  | { type: "initialized"; success: boolean; error?: string; multiThreaded: boolean }
  | { type: "evaluation"; result: EngineEvaluation }
  | { type: "bestMove"; move: string }
  | { type: "error"; message: string };

// --- Worker State ---

/** The Stockfish engine instance (provides addMessageListener / postMessage) */
let stockfish: StockfishInstance | null = null;

/** Whether the engine is using multi-threaded mode */
let isMultiThreaded = false;

/** Whether the engine has been initialized successfully */
let isInitialized = false;

/**
 * Minimal interface for the Stockfish WASM instance.
 * The stockfish.js loader returns an object with these methods.
 */
interface StockfishInstance {
  addMessageListener(callback: (message: string) => void): void;
  removeMessageListener(callback: (message: string) => void): void;
  postMessage(command: string): void;
  terminate?(): void;
}

// --- Utility Functions ---

/**
 * Detects whether SharedArrayBuffer is available in this worker context.
 * SharedArrayBuffer requires cross-origin isolation headers.
 */
function isSharedArrayBufferAvailable(): boolean {
  try {
    return typeof SharedArrayBuffer !== "undefined";
  } catch {
    return false;
  }
}

/**
 * Loads the appropriate Stockfish script based on SharedArrayBuffer availability.
 * Uses importScripts to load the Stockfish JS loader, which returns an
 * initialization function.
 */
async function loadStockfish(): Promise<StockfishInstance> {
  isMultiThreaded = isSharedArrayBufferAvailable();
  const scriptPath = isMultiThreaded
    ? "/stockfish/stockfish.js"
    : "/stockfish/stockfish-single.js";

  // importScripts loads the stockfish script which defines a global factory function
  // The stockfish npm package exposes a default export function that creates the instance
  importScripts(scriptPath);

  // The stockfish.js script sets up a global `Stockfish` factory function
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globalScope = self as any;
  if (typeof globalScope.Stockfish === "function") {
    const instance: StockfishInstance = await globalScope.Stockfish();
    return instance;
  }

  throw new Error(
    `Failed to load Stockfish from ${scriptPath}: Stockfish factory not found on global scope`
  );
}

/**
 * Sends a UCI command to the Stockfish engine.
 */
function sendCommand(command: string): void {
  if (!stockfish) {
    throw new Error("Stockfish engine is not initialized");
  }
  stockfish.postMessage(command);
}

/**
 * Waits for the engine to respond with a specific message prefix.
 * Returns a promise that resolves with all collected output lines.
 */
function waitForResponse(
  endToken: string,
  collectFrom?: string
): Promise<string[]> {
  return new Promise((resolve, reject) => {
    if (!stockfish) {
      reject(new Error("Stockfish engine is not initialized"));
      return;
    }

    const lines: string[] = [];
    let collecting = !collectFrom;
    const timeoutId = setTimeout(() => {
      stockfish?.removeMessageListener(listener);
      reject(new Error(`Timeout waiting for engine response: ${endToken}`));
    }, 30000);

    const listener = (message: string) => {
      if (collectFrom && message.startsWith(collectFrom)) {
        collecting = true;
      }

      if (collecting) {
        lines.push(message);
      }

      if (message.startsWith(endToken)) {
        clearTimeout(timeoutId);
        stockfish?.removeMessageListener(listener);
        resolve(lines);
      }
    };

    stockfish.addMessageListener(listener);
  });
}

/**
 * Parses a UCI `info` line to extract evaluation data.
 * Example: "info depth 18 seldepth 24 multipv 1 score cp 35 nodes 284920 nps 1424600 time 200 pv e2e4 e7e5"
 */
function parseInfoLine(line: string): {
  depth: number;
  score: EvalScore;
  pv: string[];
  nodes: number;
  time: number;
} | null {
  if (!line.startsWith("info") || !line.includes("score")) {
    return null;
  }

  // Skip lines with "upperbound" or "lowerbound" — they are partial results
  if (line.includes("upperbound") || line.includes("lowerbound")) {
    return null;
  }

  const parts = line.split(" ");

  const depthIdx = parts.indexOf("depth");
  const depth = depthIdx !== -1 ? parseInt(parts[depthIdx + 1], 10) : 0;

  let score: EvalScore;
  const scoreIdx = parts.indexOf("score");
  if (scoreIdx !== -1) {
    const scoreType = parts[scoreIdx + 1];
    const scoreValue = parseInt(parts[scoreIdx + 2], 10);
    if (scoreType === "mate") {
      score = { type: "mate", value: scoreValue };
    } else {
      score = { type: "cp", value: scoreValue };
    }
  } else {
    return null;
  }

  const nodesIdx = parts.indexOf("nodes");
  const nodes = nodesIdx !== -1 ? parseInt(parts[nodesIdx + 1], 10) : 0;

  const timeIdx = parts.indexOf("time");
  const time = timeIdx !== -1 ? parseInt(parts[timeIdx + 1], 10) : 0;

  const pvIdx = parts.indexOf("pv");
  const pv = pvIdx !== -1 ? parts.slice(pvIdx + 1) : [];

  return { depth, score, pv, nodes, time };
}

/**
 * Parses the best move from a UCI `bestmove` line.
 * Example: "bestmove e2e4 ponder e7e5"
 */
function parseBestMove(line: string): string | null {
  if (!line.startsWith("bestmove")) {
    return null;
  }
  const parts = line.split(" ");
  return parts[1] || null;
}

// --- Command Handlers ---

/**
 * Handles the "initialize" command:
 * 1. Detect SharedArrayBuffer availability
 * 2. Load the appropriate Stockfish WASM binary
 * 3. Send UCI handshake commands
 * 4. Report success or failure
 */
async function handleInitialize(): Promise<void> {
  try {
    stockfish = await loadStockfish();

    // Send UCI handshake
    const uciReady = waitForResponse("uciok");
    sendCommand("uci");
    await uciReady;

    // Configure engine settings
    if (isMultiThreaded) {
      sendCommand("setoption name Threads value 4");
    }
    sendCommand("setoption name Hash value 32");

    // Verify engine is ready
    const readyPromise = waitForResponse("readyok");
    sendCommand("isready");
    await readyPromise;

    isInitialized = true;

    const response: WorkerResponse = {
      type: "initialized",
      success: true,
      multiThreaded: isMultiThreaded,
    };
    self.postMessage(response);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown initialization error";
    const response: WorkerResponse = {
      type: "initialized",
      success: false,
      error: errorMessage,
      multiThreaded: false,
    };
    self.postMessage(response);
  }
}

/**
 * Handles the "evaluate" command:
 * 1. Set the position from FEN
 * 2. Run analysis at the specified depth
 * 3. Parse info lines and bestmove
 * 4. Return full EngineEvaluation result
 */
async function handleEvaluate(fen: string, depth: number): Promise<void> {
  if (!isInitialized || !stockfish) {
    const response: WorkerResponse = {
      type: "error",
      message: "Engine is not initialized",
    };
    self.postMessage(response);
    return;
  }

  try {
    // Set position
    sendCommand(`position fen ${fen}`);

    // Start collecting output and begin search
    const searchPromise = waitForResponse("bestmove");
    sendCommand(`go depth ${depth}`);
    const lines = await searchPromise;

    // Parse the last valid info line for the deepest evaluation
    let lastInfo: ReturnType<typeof parseInfoLine> = null;
    for (const line of lines) {
      const parsed = parseInfoLine(line);
      if (parsed && parsed.depth <= depth) {
        if (!lastInfo || parsed.depth >= lastInfo.depth) {
          lastInfo = parsed;
        }
      }
    }

    // Parse the bestmove line
    const bestMoveLine = lines.find((l) => l.startsWith("bestmove"));
    const bestMove = bestMoveLine ? parseBestMove(bestMoveLine) : null;

    if (!lastInfo || !bestMove) {
      const response: WorkerResponse = {
        type: "error",
        message: `Failed to parse engine output for position: ${fen}`,
      };
      self.postMessage(response);
      return;
    }

    const result: EngineEvaluation = {
      fen,
      depth: lastInfo.depth,
      score: lastInfo.score,
      bestMove,
      pv: lastInfo.pv,
      nodes: lastInfo.nodes,
      time: lastInfo.time,
    };

    const response: WorkerResponse = { type: "evaluation", result };
    self.postMessage(response);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Evaluation failed";
    const response: WorkerResponse = { type: "error", message: errorMessage };
    self.postMessage(response);
  }
}

/**
 * Handles the "getBestMove" command:
 * Similar to evaluate but only returns the best move string.
 */
async function handleGetBestMove(fen: string, depth: number): Promise<void> {
  if (!isInitialized || !stockfish) {
    const response: WorkerResponse = {
      type: "error",
      message: "Engine is not initialized",
    };
    self.postMessage(response);
    return;
  }

  try {
    sendCommand(`position fen ${fen}`);

    const searchPromise = waitForResponse("bestmove");
    sendCommand(`go depth ${depth}`);
    const lines = await searchPromise;

    const bestMoveLine = lines.find((l) => l.startsWith("bestmove"));
    const bestMove = bestMoveLine ? parseBestMove(bestMoveLine) : null;

    if (!bestMove) {
      const response: WorkerResponse = {
        type: "error",
        message: `Failed to get best move for position: ${fen}`,
      };
      self.postMessage(response);
      return;
    }

    const response: WorkerResponse = { type: "bestMove", move: bestMove };
    self.postMessage(response);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "getBestMove failed";
    const response: WorkerResponse = { type: "error", message: errorMessage };
    self.postMessage(response);
  }
}

/**
 * Handles the "terminate" command:
 * Send quit to Stockfish, clean up resources, and close the worker.
 */
function handleTerminate(): void {
  if (stockfish) {
    try {
      sendCommand("quit");
    } catch {
      // Engine may already be terminated
    }
    if (stockfish.terminate) {
      stockfish.terminate();
    }
    stockfish = null;
  }
  isInitialized = false;
  self.close();
}

// --- Worker Message Handler ---

self.onmessage = (event: MessageEvent<WorkerCommand>) => {
  const command = event.data;

  switch (command.type) {
    case "initialize":
      handleInitialize();
      break;
    case "evaluate":
      handleEvaluate(command.fen, command.depth);
      break;
    case "getBestMove":
      handleGetBestMove(command.fen, command.depth);
      break;
    case "terminate":
      handleTerminate();
      break;
    default:
      self.postMessage({
        type: "error",
        message: `Unknown command: ${(command as { type: string }).type}`,
      } satisfies WorkerResponse);
  }
};
