/**
 * Shared types for the LLM coaching module.
 *
 * These types define the request/response contract between the client-side
 * payload builder and the server-side Coach API Route, as well as internal
 * state management for the coaching lifecycle.
 */

// ─── Grade Types ───────────────────────────────────────────────────────────────

/** Grades assigned to routine moves — handled by the template library. */
export type RoutineGrade = "best" | "good" | "book" | "excellent";

/** Grades assigned to notable moves — sent to the LLM for commentary. */
export type NotableGrade = "mistake" | "blunder" | "inaccuracy" | "brilliant";

// ─── Request Payload ───────────────────────────────────────────────────────────

/** A single notable move included in the batch request to the Coach API. */
export interface NotableMovePayload {
  /** Zero-based half-move index. */
  ply: number;
  /** Standard Algebraic Notation, e.g. "Nf3". */
  san: string;
  /** Classification grade for this notable move. */
  grade: NotableGrade;
  /** Win-percentage loss caused by this move. */
  winPercentLoss: number;
  /** Engine's best alternative move in UCI notation, e.g. "e2e4". */
  bestMove: string;
}

/** Game-level summary data included in the batch request. */
export interface GameSummaryPayload {
  whiteName: string;
  blackName: string;
  openingName: string;
  whiteAccuracy: number;
  blackAccuracy: number;
  /** Game result: "1-0", "0-1", or "1/2-1/2". */
  result: string;
}

/** The full batch request payload sent to POST /api/coach. */
export interface BatchRequest {
  notableMoves: NotableMovePayload[];
  gameSummary: GameSummaryPayload;
  playerColor: "white" | "black";
}

// ─── Response Payload ──────────────────────────────────────────────────────────

/** A single LLM-generated coaching remark for one notable move. */
export interface MoveComment {
  /** Zero-based half-move index matching the request's ply. */
  ply: number;
  /** 1–3 sentence coaching comment in Toby's voice. */
  comment: string;
}

/** The JSON response returned by the Coach API Route. */
export interface BatchResponse {
  /** 1–3 sentence LLM-generated game overview. */
  summary: string;
  /** One comment per notable move, keyed by ply. */
  moveComments: MoveComment[];
}

// ─── Template Library Input ────────────────────────────────────────────────────

/** Data required to generate a template phrase for a routine move. */
export interface TemplateMoveInput {
  /** Standard Algebraic Notation, e.g. "Nf3". */
  san: string;
  /** Which side played the move. */
  color: "white" | "black";
  /** Full move number (1-based). */
  moveNumber: number;
  /** Routine classification grade. */
  grade: RoutineGrade;
  /** Zero-based half-move index (used as deterministic selection seed). */
  ply: number;
}

// ─── Client-Side State ─────────────────────────────────────────────────────────

/** State managed by the useCoach hook for the LLM coaching lifecycle. */
export interface CoachState {
  /** Current status of the coaching batch request. */
  status: "idle" | "loading" | "ready" | "error";
  /** LLM-generated game summary, null until ready. */
  gameSummary: string | null;
  /** Map of ply → LLM comment for O(1) lookup. */
  moveComments: Map<number, string>;
  /** Error message when status is "error", null otherwise. */
  error: string | null;
}

// ─── Validation ────────────────────────────────────────────────────────────────

/** Discriminated union for validation results. */
export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };
