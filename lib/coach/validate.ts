import type { BatchRequest, ValidationResult } from "./types";

/**
 * Validates an incoming request body against the BatchRequest schema.
 *
 * Checks:
 * - Top-level shape is a non-null object
 * - playerColor is "white" or "black"
 * - notableMoves is an array with valid entries (ply, san, grade, winPercentLoss, bestMove)
 * - gameSummary is an object with all required fields
 *
 * Returns a discriminated union: { ok: true, data } on success, { ok: false, error } on failure.
 */
export function validateBatchRequest(
  body: unknown
): ValidationResult<BatchRequest> {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Body must be a JSON object" };
  }

  const { notableMoves, gameSummary, playerColor } = body as Record<
    string,
    unknown
  >;

  // playerColor
  if (playerColor !== "white" && playerColor !== "black") {
    return { ok: false, error: "playerColor must be 'white' or 'black'" };
  }

  // notableMoves array
  if (!Array.isArray(notableMoves)) {
    return { ok: false, error: "notableMoves must be an array" };
  }

  const validGrades = new Set(["mistake", "blunder", "inaccuracy", "brilliant"]);

  for (let i = 0; i < notableMoves.length; i++) {
    const m = notableMoves[i];

    if (typeof m.ply !== "number" || m.ply < 0) {
      return {
        ok: false,
        error: `notableMoves[${i}].ply must be a non-negative number`,
      };
    }

    if (typeof m.san !== "string" || !m.san) {
      return {
        ok: false,
        error: `notableMoves[${i}].san must be a non-empty string`,
      };
    }

    if (!validGrades.has(m.grade)) {
      return {
        ok: false,
        error: `notableMoves[${i}].grade must be mistake|blunder|inaccuracy|brilliant`,
      };
    }

    if (typeof m.winPercentLoss !== "number" || m.winPercentLoss < 0) {
      return {
        ok: false,
        error: `notableMoves[${i}].winPercentLoss must be a non-negative number`,
      };
    }

    if (typeof m.bestMove !== "string" || !m.bestMove) {
      return {
        ok: false,
        error: `notableMoves[${i}].bestMove must be a non-empty string`,
      };
    }
  }

  // gameSummary
  if (!gameSummary || typeof gameSummary !== "object") {
    return { ok: false, error: "gameSummary must be an object" };
  }

  const gs = gameSummary as Record<string, unknown>;

  if (typeof gs.whiteName !== "string" || !gs.whiteName) {
    return { ok: false, error: "gameSummary.whiteName required" };
  }

  if (typeof gs.blackName !== "string" || !gs.blackName) {
    return { ok: false, error: "gameSummary.blackName required" };
  }

  if (typeof gs.openingName !== "string" || !gs.openingName) {
    return { ok: false, error: "gameSummary.openingName required" };
  }

  if (typeof gs.whiteAccuracy !== "number" || gs.whiteAccuracy < 0) {
    return { ok: false, error: "gameSummary.whiteAccuracy required" };
  }

  if (typeof gs.blackAccuracy !== "number" || gs.blackAccuracy < 0) {
    return { ok: false, error: "gameSummary.blackAccuracy required" };
  }

  if (typeof gs.result !== "string" || !gs.result) {
    return { ok: false, error: "gameSummary.result required" };
  }

  return { ok: true, data: body as BatchRequest };
}
