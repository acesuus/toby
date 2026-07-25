import { evalToWinPercent } from "@/lib/win-percent";
import type {
  ParsedMove,
  EngineEvaluation,
  ClassifiedMove,
  MoveGrade,
  ClassificationThresholds,
  EvalScore,
} from "@/lib/types";
import { DEFAULT_THRESHOLDS } from "@/lib/types";

/** Default number of half-moves considered "book" at the start of a game. */
const DEFAULT_BOOK_MOVE_LIMIT = 6;

/**
 * Classifies a single move based on win-percentage loss thresholds.
 *
 * @param evalBefore - Engine evaluation of the position before the move
 * @param evalAfter - Engine evaluation of the position after the played move
 * @param color - The side that played the move
 * @param moveIndex - Zero-based half-move index
 * @param bookMoveLimit - Number of initial half-moves to mark as "book"
 * @param thresholds - Win-percentage loss thresholds for classification
 * @returns The grade for this move
 */
export function classifyMove(
  evalBefore: EvalScore,
  evalAfter: EvalScore,
  color: "white" | "black",
  moveIndex: number,
  bookMoveLimit: number,
  thresholds: ClassificationThresholds
): MoveGrade {
  // Book moves: first N half-moves of the game
  if (moveIndex < bookMoveLimit) {
    return "book";
  }

  // Win percent from the moving side's perspective
  const wpBefore = evalToWinPercent(evalBefore, color);
  const wpAfterPlayed = evalToWinPercent(evalAfter, color);

  // Win percentage gain (positive = the move improved the position beyond expected)
  const winPercentGain = wpAfterPlayed - wpBefore;

  // "brilliant" check: the move significantly improves the position AND
  // the position wasn't already completely winning (gain matters more in balanced positions)
  if (winPercentGain > 2 && wpBefore < 90 && wpBefore > 10) {
    return "brilliant";
  }

  // "best" check: the engine eval before the move represents the best line,
  // so if the played move's resulting win% is within 0.1 of wpBefore, it's "best"
  if (wpAfterPlayed >= wpBefore - 0.1) {
    return "best";
  }

  // Win percentage loss from the moving side's perspective
  const winPercentLoss = wpBefore - wpAfterPlayed;

  if (winPercentLoss <= thresholds.excellent) return "excellent";
  if (winPercentLoss <= thresholds.good) return "good";
  if (winPercentLoss <= thresholds.inaccuracy) return "inaccuracy";
  if (winPercentLoss <= thresholds.mistake) return "mistake";
  return "blunder";
}

/**
 * Classifies all moves in a game given their evaluations.
 *
 * The evaluations array must have N+1 entries for N moves:
 * - evaluations[0] = evaluation of the starting position
 * - evaluations[i] = evaluation of the position before move i
 * - evaluations[i+1] = evaluation of the position after move i
 *
 * @param moves - Array of parsed moves from the game
 * @param evaluations - Array of engine evaluations (length = moves.length + 1)
 * @param thresholds - Optional custom classification thresholds
 * @param bookMoveLimit - Optional number of half-moves to consider as book (default: 6)
 * @returns Array of ClassifiedMove objects with grades and evaluation data
 */
export function classifyMoves(
  moves: ParsedMove[],
  evaluations: EngineEvaluation[],
  thresholds?: ClassificationThresholds,
  bookMoveLimit?: number
): ClassifiedMove[] {
  const effectiveThresholds = thresholds ?? DEFAULT_THRESHOLDS;
  const effectiveBookLimit = bookMoveLimit ?? DEFAULT_BOOK_MOVE_LIMIT;

  const classifiedMoves: ClassifiedMove[] = [];

  for (let i = 0; i < moves.length; i++) {
    const move = moves[i];
    const evalBefore = evaluations[i].score;
    const evalAfter = evaluations[i + 1].score;

    const wpBefore = evalToWinPercent(evalBefore, move.color);
    const wpAfterPlayed = evalToWinPercent(evalAfter, move.color);
    const winPercentLoss = Math.max(0, wpBefore - wpAfterPlayed);

    const grade = classifyMove(
      evalBefore,
      evalAfter,
      move.color,
      i,
      effectiveBookLimit,
      effectiveThresholds
    );

    classifiedMoves.push({
      ...move,
      grade,
      evalBefore,
      evalAfter,
      bestMove: evaluations[i].bestMove,
      winPercentBefore: wpBefore,
      winPercentAfter: wpAfterPlayed,
      winPercentLoss,
    });
  }

  return classifiedMoves;
}
