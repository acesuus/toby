/**
 * Template Library for routine and fallback coaching phrases.
 *
 * Provides instant, deterministic coaching commentary for routine moves
 * (best, good, book, excellent) and fallback phrases for notable moves
 * (mistake, blunder, inaccuracy, brilliant) when the LLM is unavailable.
 *
 * All phrases conform to the Toby persona: 1–3 sentences, sentence case,
 * no emoji, grounded in move data.
 */

import type { NotableGrade, RoutineGrade, TemplateMoveInput } from "./types";

// ─── Phrase Banks ──────────────────────────────────────────────────────────────

/**
 * Template phrases for routine move grades.
 * Each grade has ≥3 variants. Placeholders: {san}, {moveLabel}, {side}.
 */
const ROUTINE_TEMPLATES: Record<RoutineGrade, string[]> = {
  best: [
    "{moveLabel} is the top engine choice. {side} finds the sharpest continuation here.",
    "Exactly right. {moveLabel} is what the position was asking for.",
    "{moveLabel} lands on the strongest line. No improvement to suggest.",
    "The position demanded precision and {moveLabel} delivers it. {side} keeps full control.",
  ],
  good: [
    "{moveLabel} is solid. {side} holds the balance without conceding anything meaningful.",
    "A reasonable choice. {moveLabel} keeps the position together.",
    "{moveLabel} works here. {side} stays on course with no real ground given up.",
  ],
  book: [
    "{moveLabel} is still theory. A well-trodden path with no surprises.",
    "{moveLabel} keeps things in the book. Familiar ground for both sides.",
    "Opening prep at work. {moveLabel} follows the main line.",
    "{moveLabel} stays in known territory. The theory is doing the heavy lifting here.",
  ],
  excellent: [
    "{moveLabel} is excellent. {side} holds nearly everything the position had to offer.",
    "A precise choice. {moveLabel} keeps {side} on the best footing.",
    "{moveLabel} barely gives an inch. That kind of accuracy wins games quietly.",
  ],
};

/**
 * Fallback template phrases for notable move grades.
 * Used when the LLM is unavailable. Same placeholder system as routine templates.
 */
const NOTABLE_TEMPLATES: Record<NotableGrade, string[]> = {
  mistake: [
    "{moveLabel} costs real ground here. A pattern worth filing away for the future.",
    "The position shifts after {moveLabel}. {side} gives up more than intended.",
    "{moveLabel} is where things slip. Worth slowing down in positions like this next time.",
  ],
  blunder: [
    "{moveLabel} is the turning point. These are the moments to pause and double-check.",
    "A costly slip with {moveLabel}. Spotting this pattern next time is where progress lives.",
    "{moveLabel} lets it all tip over. The kind of moment that rewards a second look.",
  ],
  inaccuracy: [
    "{moveLabel} lets a little slip. Not costly, but the sharper path was there.",
    "A small imprecision with {moveLabel}. The position wanted something a touch more exact.",
    "{moveLabel} drifts slightly. {side} had a more precise option available.",
  ],
  brilliant: [
    "{moveLabel} is a real find. The kind of move you remember from a game.",
    "Brilliant. {moveLabel} changes the character of the position entirely.",
    "{moveLabel} creates something from nothing. That is the real magic in this game.",
  ],
};

/** Combined template bank for internal use. */
export const TEMPLATE_BANK: Record<RoutineGrade | NotableGrade, string[]> = {
  ...ROUTINE_TEMPLATES,
  ...NOTABLE_TEMPLATES,
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Replaces `{key}` placeholders in a template string with corresponding values.
 * Unknown keys are replaced with an empty string.
 */
export function interpolate(
  template: string,
  vars: Record<string, string>
): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? "");
}

/**
 * Formats a human-readable move label, e.g. "12. Nf3" or "12... Nf3".
 */
export function formatMoveLabel(
  moveNumber: number,
  color: "white" | "black",
  san: string
): string {
  const dots = color === "white" ? "." : "...";
  return `${moveNumber}${dots} ${san}`;
}

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns a coaching phrase for a routine move.
 * Selection is deterministic: same ply always produces the same phrase.
 */
export function getTemplatePhrase(input: TemplateMoveInput): string {
  const templates = TEMPLATE_BANK[input.grade];
  const index =
    ((input.ply % templates.length) + templates.length) % templates.length;
  const template = templates[index];
  return interpolate(template, {
    san: input.san,
    moveLabel: formatMoveLabel(input.moveNumber, input.color, input.san),
    side: input.color === "white" ? "White" : "Black",
  });
}

/**
 * Returns a fallback phrase for a notable move when LLM is unavailable.
 * Uses the same deterministic selection logic as getTemplatePhrase.
 */
export function getFallbackPhrase(
  input: Omit<TemplateMoveInput, "grade"> & { grade: NotableGrade }
): string {
  const templates = TEMPLATE_BANK[input.grade];
  const index =
    ((input.ply % templates.length) + templates.length) % templates.length;
  const template = templates[index];
  return interpolate(template, {
    san: input.san,
    moveLabel: formatMoveLabel(input.moveNumber, input.color, input.san),
    side: input.color === "white" ? "White" : "Black",
  });
}
