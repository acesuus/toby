/**
 * Analysis pipeline orchestrator for chess game review.
 *
 * Iterates all positions in a parsed game (N+1 for N moves), evaluates each
 * using the provided engine, reports progress via callback, and supports
 * cancellation through AbortSignal.
 *
 * Requirements: 6.1, 6.4, 6.5, 6.7
 */

import type { ParsedGame, EngineEvaluation } from "@/lib/types";

/**
 * Interface for an engine that can evaluate positions.
 * Decoupled from the concrete StockfishEngine class for testability.
 */
export interface AnalysisEngine {
  evaluate(fen: string, depth: number): Promise<EngineEvaluation>;
}

/**
 * Analyzes all positions in a parsed game sequentially.
 *
 * For a game with N moves, this produces exactly N+1 evaluations
 * (the starting position plus each position after a move).
 *
 * @param parsedGame - The parsed game containing moves and starting FEN
 * @param engine - An object implementing the AnalysisEngine interface
 * @param depth - Analysis depth (10–25)
 * @param onProgress - Callback receiving strictly monotonically increasing values from ~0 to 1
 * @param signal - Optional AbortSignal for cancellation support
 * @param onEvaluation - Optional callback invoked as each position finishes
 * @returns Array of N+1 EngineEvaluation results
 * @throws Error with message "Analysis cancelled" if signal is aborted
 */
export async function analyzeGame(
  parsedGame: ParsedGame,
  engine: AnalysisEngine,
  depth: number,
  onProgress: (progress: number) => void,
  signal?: AbortSignal,
  onEvaluation?: (
    evaluation: EngineEvaluation,
    positionIndex: number,
    completedEvaluations: readonly EngineEvaluation[]
  ) => void
): Promise<EngineEvaluation[]> {
  const positions = [
    parsedGame.startingFen,
    ...parsedGame.moves.map((m) => m.fenAfter),
  ];
  const evaluations: EngineEvaluation[] = [];

  for (let i = 0; i < positions.length; i++) {
    if (signal?.aborted) {
      throw new Error("Analysis cancelled");
    }

    const evaluation = await engine.evaluate(positions[i], depth);

    // Check again after the async evaluation in case cancellation
    // happened while we were waiting for the engine response
    if (signal?.aborted) {
      throw new Error("Analysis cancelled");
    }

    evaluations.push(evaluation);
    onEvaluation?.(evaluation, i, evaluations);
    onProgress((i + 1) / positions.length);
  }

  return evaluations;
}
