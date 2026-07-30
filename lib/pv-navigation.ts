import type { ParsedMove } from "@/lib/types";

/**
 * Returns the game move reached by a clicked PV prefix when that prefix exactly
 * follows the imported game from the current position. Divergent engine lines
 * return null and should remain a temporary board preview.
 */
export function findGameContinuationIndex(
  gameMoves: readonly Pick<ParsedMove, "uci">[],
  currentMoveIndex: number,
  pvMoves: readonly string[]
): number | null {
  if (pvMoves.length === 0) return null;

  const firstGameIndex = currentMoveIndex + 1;
  if (firstGameIndex < 0 || firstGameIndex + pvMoves.length > gameMoves.length) {
    return null;
  }

  for (let offset = 0; offset < pvMoves.length; offset += 1) {
    if (gameMoves[firstGameIndex + offset]?.uci !== pvMoves[offset]) return null;
  }

  return firstGameIndex + pvMoves.length - 1;
}
