import type { EvalScore } from "@/lib/types";

/** Maximum evaluation in pawns for graph clamping (±10) */
export const MAX_EVAL = 10;

/**
 * Convert an EvalScore to a clamped pawn value in [-10, +10].
 * Mate scores are mapped to the ±10 boundary.
 * Centipawn scores are divided by 100 and clamped.
 */
export function evalToPawns(score: EvalScore): number {
  if (score.type === "mate") {
    return score.value > 0 ? MAX_EVAL : -MAX_EVAL;
  }
  const pawns = score.value / 100;
  return Math.max(-MAX_EVAL, Math.min(MAX_EVAL, pawns));
}
