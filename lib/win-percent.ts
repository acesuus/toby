import { EvalScore, WIN_PERCENT_MULTIPLIER } from "./types";

/**
 * Converts a centipawn evaluation to a win percentage [0, 100] using the
 * Lichess-style sigmoid formula.
 *
 * Edge cases:
 * - NaN → 50 (treat as equal position)
 * - +Infinity → 100
 * - -Infinity → 0
 *
 * @param cp - Centipawn evaluation from white's perspective
 * @returns Win percentage in range [0, 100]
 */
export function centipawnToWinPercent(cp: number): number {
  if (Number.isNaN(cp)) return 50;
  if (cp === Infinity) return 100;
  if (cp === -Infinity) return 0;

  return 50 + 50 * (2 / (1 + Math.exp(-WIN_PERCENT_MULTIPLIER * cp)) - 1);
}

/**
 * Converts an engine evaluation score to a win percentage from the given
 * player's perspective.
 *
 * - Mate scores: positive mate value → 100 (white wins), negative → 0 (black wins)
 * - Centipawn scores: converted via the sigmoid formula
 * - Symmetry: evalToWinPercent(score, "white") + evalToWinPercent(score, "black") === 100
 *
 * @param score - Engine evaluation score (centipawn or mate)
 * @param perspective - Which side's win percentage to return
 * @returns Win percentage in range [0, 100]
 */
export function evalToWinPercent(
  score: EvalScore,
  perspective: "white" | "black"
): number {
  let wp: number;

  if (score.type === "mate") {
    wp = score.value > 0 ? 100 : 0;
  } else {
    wp = centipawnToWinPercent(score.value);
  }

  return perspective === "white" ? wp : 100 - wp;
}
