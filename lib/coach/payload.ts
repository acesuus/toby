import type { ClassifiedMove, GameAccuracy, PGNHeaders } from "@/lib/types";
import type {
  BatchRequest,
  NotableMovePayload,
  GameSummaryPayload,
  NotableGrade,
} from "./types";

/**
 * Grades that qualify a move as "notable" and warrant LLM commentary.
 */
const NOTABLE_GRADES: Set<string> = new Set([
  "mistake",
  "blunder",
  "inaccuracy",
  "brilliant",
]);

/**
 * Builds a BatchRequest payload from classified moves, game accuracy,
 * PGN headers, and the reviewing player's color.
 *
 * Filters the classified moves to only those with notable grades and
 * extracts the required fields for the Coach API Route.
 */
export function buildBatchRequest(
  classifiedMoves: ClassifiedMove[],
  gameAccuracy: GameAccuracy,
  headers: PGNHeaders,
  playerColor: "white" | "black"
): BatchRequest {
  const notableMoves: NotableMovePayload[] = classifiedMoves
    .map((move, index) => ({ move, index }))
    .filter(({ move }) => NOTABLE_GRADES.has(move.grade))
    .map(({ move, index }) => ({
      ply: index,
      san: move.san,
      grade: move.grade as NotableGrade,
      winPercentLoss: move.winPercentLoss,
      bestMove: move.bestMove,
    }));

  const gameSummary: GameSummaryPayload = {
    whiteName: headers.white,
    blackName: headers.black,
    openingName: gameAccuracy.opening.name,
    whiteAccuracy: gameAccuracy.white.accuracy,
    blackAccuracy: gameAccuracy.black.accuracy,
    result: headers.result,
  };

  return { notableMoves, gameSummary, playerColor };
}
