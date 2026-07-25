import type { BatchResponse } from "./types";

/**
 * Parses the raw LLM text response into a validated BatchResponse.
 *
 * Handles markdown code fences that LLMs often wrap around JSON output,
 * validates the structural integrity of the response, and trims all strings.
 *
 * @param raw - The raw string response from the LLM
 * @param expectedCount - The number of move comments expected (must match notableMoves.length)
 * @returns A validated BatchResponse with trimmed strings
 * @throws Error with a descriptive message on any structural issue
 */
export function parseLLMResponse(
  raw: string,
  expectedCount: number
): BatchResponse {
  // Strip markdown code fences if present (LLMs often wrap JSON in ```json...```)
  const cleaned = raw
    .replace(/^```(?:json)?\s*\n?/m, "")
    .replace(/\n?```\s*$/m, "")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error("LLM response is not valid JSON");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("LLM response is not a JSON object");
  }

  const obj = parsed as Record<string, unknown>;

  // Validate summary field
  if (typeof obj.summary !== "string" || !obj.summary.trim()) {
    throw new Error("Missing or empty 'summary' field");
  }

  // Validate moveComments field
  if (!Array.isArray(obj.moveComments)) {
    throw new Error("Missing 'moveComments' array");
  }

  if (obj.moveComments.length !== expectedCount) {
    throw new Error(
      `Expected ${expectedCount} move comments, got ${obj.moveComments.length}`
    );
  }

  for (const mc of obj.moveComments) {
    if (
      typeof mc.ply !== "number" ||
      typeof mc.comment !== "string" ||
      !mc.comment.trim()
    ) {
      throw new Error(
        "Invalid moveComment entry: requires ply (number) and comment (non-empty string)"
      );
    }
  }

  return {
    summary: obj.summary.trim(),
    moveComments: obj.moveComments.map(
      (mc: { ply: number; comment: string }) => ({
        ply: mc.ply,
        comment: mc.comment.trim(),
      })
    ),
  };
}
