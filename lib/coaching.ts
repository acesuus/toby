// =============================================================================
// Rule-based coaching templates for Toby (the fox wizard chess coach).
//
// This module turns the analysis data we already have (a ClassifiedMove plus
// light game context) into a short, grounded, in-character coaching line.
//
// It invents NO new analysis: every template only references data passed in
// (grade, win% loss, the move played, the engine's preferred move, game phase).
// Voice rules follow TOBY_PERSONA.md — 1–3 sentences, sentence case, grounded
// in the specific move, mistakes framed as fixable patterns, no emoji.
// =============================================================================

import type { ClassifiedMove, MoveGrade, OpeningInfo } from "@/lib/types";

/** Phase of the game, derived from half-move index (no board scan needed). */
export type GamePhase = "opening" | "middlegame" | "endgame";

export interface CoachingContext {
  /** Zero-based half-move index of the move being explained. */
  moveIndex: number;
  /** Total number of half-moves in the game. */
  totalMoves: number;
  /** Opening identification, when available. */
  opening?: OpeningInfo | null;
}

/** A single coaching remark for one move. */
export interface CoachingRemark {
  /** The half-move index this remark describes. */
  moveIndex: number;
  /** Toby's dialogue for this move (1–3 sentences). */
  text: string;
  /** The grade this remark is anchored to. */
  grade: MoveGrade;
}

// --- Helpers ----------------------------------------------------------------

/** Human-readable side name. */
function sideName(color: "white" | "black"): string {
  return color === "white" ? "White" : "Black";
}

/** Move label like "12. Nf3" or "12... Nf3". */
function moveLabel(move: ClassifiedMove): string {
  const dots = move.color === "white" ? "." : "...";
  return `${move.moveNumber}${dots} ${move.san}`;
}

/** Convert a UCI best move (e.g. "g1f3") into a readable target square hint. */
function bestMoveHint(uci: string): string | null {
  if (!uci || uci.length < 4) return null;
  const from = uci.slice(0, 2);
  const to = uci.slice(2, 4);
  return `${from}\u2013${to}`;
}

/**
 * Derive the game phase from the half-move index and total length.
 * Opening = first ~12 plies, endgame = last ~20% of a longer game.
 */
export function derivePhase(moveIndex: number, totalMoves: number): GamePhase {
  if (moveIndex < 12) return "opening";
  if (totalMoves >= 40 && moveIndex >= totalMoves - Math.max(16, Math.floor(totalMoves * 0.2))) {
    return "endgame";
  }
  return "middlegame";
}

/** Pick a template deterministically so a given move always reads the same. */
function pick(templates: string[], seed: number): string {
  if (templates.length === 0) return "";
  const index = ((seed % templates.length) + templates.length) % templates.length;
  return templates[index];
}

/** Round a win% loss to a friendly integer. */
function lossPoints(move: ClassifiedMove): number {
  return Math.round(move.winPercentLoss);
}

// --- Grade template banks ---------------------------------------------------

function bookTemplates(move: ClassifiedMove, ctx: CoachingContext): string[] {
  const opening = ctx.opening?.name && ctx.opening.name !== "Unknown Opening"
    ? ctx.opening.name
    : null;
  const base = [
    `${moveLabel(move)} is still theory — a well-worn path, no spells needed for this stretch.`,
    `${moveLabel(move)} keeps things in the book. Familiar ground, and there's comfort in knowing the road.`,
    `Opening prep, plain and simple: ${moveLabel(move)} follows the main line.`,
  ];
  if (opening) {
    base.push(`${moveLabel(move)} is right at home in the ${opening} — the theory is doing the work for you here.`);
  }
  return base;
}

function bestTemplates(move: ClassifiedMove): string[] {
  const side = sideName(move.color);
  return [
    `${moveLabel(move)} is the move — ${side} finds the sharpest continuation and holds the initiative.`,
    `Exactly right. ${moveLabel(move)} is what the position was asking for.`,
    `${moveLabel(move)} lands on the top line; ${side} keeps the reins firmly in hand.`,
    `No improvement to offer here — ${moveLabel(move)} is the strongest choice on the board.`,
  ];
}

function excellentTemplates(move: ClassifiedMove): string[] {
  return [
    `${moveLabel(move)} is excellent — it holds nearly everything the position had to offer.`,
    `A precise choice. ${moveLabel(move)} keeps ${sideName(move.color)} on the best footing.`,
    `${moveLabel(move)} barely gives an inch. That's the kind of accuracy that wins games quietly.`,
  ];
}

function goodTemplates(move: ClassifiedMove): string[] {
  return [
    `${moveLabel(move)} is solid — it keeps the balance without conceding anything meaningful.`,
    `A reasonable move. ${moveLabel(move)} holds the position together.`,
    `${moveLabel(move)} is fine here; ${sideName(move.color)} stays on course.`,
  ];
}

function inaccuracyTemplates(move: ClassifiedMove): string[] {
  const loss = lossPoints(move);
  const hint = bestMoveHint(move.bestMove);
  const lines = [
    `${moveLabel(move)} lets a little slip — around ${loss}% of your edge. Not costly, but the sharper path was there.`,
    `A small imprecision with ${moveLabel(move)}. Worth noting the position wanted something a touch more exact.`,
  ];
  if (hint) {
    lines.push(`${moveLabel(move)} drifts slightly; the move around ${hint} would have held more of the position's promise.`);
  }
  return lines;
}

function mistakeTemplates(move: ClassifiedMove): string[] {
  const loss = lossPoints(move);
  const hint = bestMoveHint(move.bestMove);
  const lines = [
    `${moveLabel(move)} costs real ground — about ${loss}% of ${sideName(move.color)}'s chances. The kind of turn worth remembering for next time.`,
    `Here the position shifts against you: ${moveLabel(move)} hands over roughly ${loss}%. A pattern to file away, not a failure.`,
  ];
  if (hint) {
    lines.push(`${moveLabel(move)} lets the advantage go; the idea around ${hint} would have kept ${sideName(move.color)} in the driver's seat.`);
  }
  return lines;
}

function blunderTemplates(move: ClassifiedMove): string[] {
  const loss = lossPoints(move);
  const hint = bestMoveHint(move.bestMove);
  const lines = [
    `${moveLabel(move)} is the turning point — about ${loss}% of the game changes hands here. These are the moments to slow down and double-check.`,
    `A costly slip: ${moveLabel(move)} swings roughly ${loss}% the other way. Spotting this pattern next time is where the real progress lives.`,
  ];
  if (hint) {
    lines.push(`${moveLabel(move)} lets it all tip over; the move near ${hint} would have kept ${sideName(move.color)} safe.`);
  }
  return lines;
}

// --- Public API -------------------------------------------------------------

/**
 * Generate a single coaching remark for one classified move, in Toby's voice.
 * Purely rule-based — no engine calls, no invented analysis.
 */
export function getCoachingForMove(
  move: ClassifiedMove,
  ctx: CoachingContext
): CoachingRemark {
  let templates: string[];
  switch (move.grade) {
    case "brilliant":
      templates = [
        `${move.san} — now that's a find. The kind of move you don't forget.`,
        `Brilliant. ${move.san} changed the character of the position entirely.`,
        `${move.san} is the real magic in this game. A move that creates something from nothing.`,
      ];
      break;
    case "book":
      templates = bookTemplates(move, ctx);
      break;
    case "best":
      templates = bestTemplates(move);
      break;
    case "excellent":
      templates = excellentTemplates(move);
      break;
    case "good":
      templates = goodTemplates(move);
      break;
    case "inaccuracy":
      templates = inaccuracyTemplates(move);
      break;
    case "mistake":
      templates = mistakeTemplates(move);
      break;
    case "blunder":
      templates = blunderTemplates(move);
      break;
    default:
      templates = goodTemplates(move);
  }

  return {
    moveIndex: ctx.moveIndex,
    grade: move.grade,
    text: pick(templates, ctx.moveIndex),
  };
}

/**
 * Build a full walkthrough script: one remark per classified move, in order.
 */
export function buildCoachingScript(
  classifiedMoves: ClassifiedMove[],
  opening?: OpeningInfo | null
): CoachingRemark[] {
  return classifiedMoves.map((move, index) =>
    getCoachingForMove(move, {
      moveIndex: index,
      totalMoves: classifiedMoves.length,
      opening,
    })
  );
}

/**
 * An opening greeting Toby gives at the start of the walkthrough (move index -1,
 * the starting position). Grounded in opening + result-agnostic.
 */
export function getOpeningRemark(opening?: OpeningInfo | null): string {
  if (opening && opening.name && opening.name !== "Unknown Opening") {
    return `Let's walk through it. You opened with the ${opening.name} — I'll point out the moments that mattered as we go.`;
  }
  return `Let's walk through it together. I'll flag the moves that shaped the game as we step forward.`;
}
