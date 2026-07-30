// =============================================================================
// Shared TypeScript Interfaces and Types for Chess Game Review
// =============================================================================

// --- Platform Types ---

/** Supported chess platforms for game import */
export type Platform = "chesscom" | "lichess";

// --- Game Import Types ---

/** A game item from a platform API, normalized to a common format */
export interface GameListItem {
  id: string;
  white: string;
  black: string;
  result: string;
  timeControl: string;
  date: string;
  pgn: string;
}

// --- PGN Parsing Types ---

/** Standard PGN header tags */
export interface PGNHeaders {
  event?: string;
  site?: string;
  date?: string;
  white: string;
  black: string;
  result: string;
  eco?: string;
  opening?: string;
  timeControl?: string;
}

/** A single half-move with board positions before and after */
export interface ParsedMove {
  moveNumber: number;
  color: "white" | "black";
  /** Standard Algebraic Notation (e.g., "Nf3") */
  san: string;
  /** UCI notation (e.g., "g1f3") */
  uci: string;
  /** FEN before the move */
  fenBefore: string;
  /** FEN after the move */
  fenAfter: string;
}

/** A fully parsed game with headers, moves, and starting position */
export interface ParsedGame {
  headers: PGNHeaders;
  moves: ParsedMove[];
  startingFen: string;
}

// --- Engine Evaluation Types ---

/** Evaluation score: centipawns or mate-in-N, always from white's perspective */
export type EvalScore =
  | { type: "cp"; value: number }
  | { type: "mate"; value: number };

/** Full evaluation result from the Stockfish engine */
export interface EngineEvaluation {
  fen: string;
  depth: number;
  score: EvalScore;
  bestMove: string;
  /** Principal variation (sequence of UCI moves) */
  pv: string[];
  nodes: number;
  /** Time spent in milliseconds */
  time: number;
}

/** A single candidate line from MultiPV analysis (a "top move") */
export interface EngineLine {
  /** MultiPV index (1 = best line, 2 = second best, etc.) */
  multipv: number;
  /** Evaluation score, normalized to white's perspective */
  score: EvalScore;
  /** Principal variation (sequence of UCI moves) */
  pv: string[];
  /** Search depth reached for this line */
  depth: number;
}

// --- Move Classification Types ---

/** Quality grade assigned to a move */
export type MoveGrade =
  | "brilliant"
  | "book"
  | "best"
  | "excellent"
  | "good"
  | "inaccuracy"
  | "mistake"
  | "blunder";

/** A move with its classification and evaluation context */
export interface ClassifiedMove extends ParsedMove {
  grade: MoveGrade;
  evalBefore: EvalScore;
  evalAfter: EvalScore;
  bestMove: string;
  winPercentBefore: number;
  winPercentAfter: number;
  winPercentLoss: number;
}

// --- Accuracy & Game Summary Types ---

/** Per-side accuracy statistics */
export interface SideAccuracy {
  /** Weighted accuracy score 0-100 */
  accuracy: number;
  moveCount: number;
  classifications: Record<MoveGrade, number>;
  averageCentipawnLoss: number;
}

/** Opening identification */
export interface OpeningInfo {
  eco: string;
  name: string;
  /** Number of half-moves that followed the known opening line */
  moves: number;
}

/** A critical moment where a large evaluation swing occurred */
export interface CriticalMoment {
  moveIndex: number;
  /** e.g., "Blunder loses a piece" */
  description: string;
  /** Win-percentage swing magnitude */
  evalSwing: number;
}

/** Full game accuracy result */
export interface GameAccuracy {
  white: SideAccuracy;
  black: SideAccuracy;
  opening: OpeningInfo;
  criticalMoments: CriticalMoment[];
}

// --- Classification Configuration Types ---

/** Win-percentage loss thresholds for move classification */
export interface ClassificationThresholds {
  excellent: number;
  good: number;
  inaccuracy: number;
  mistake: number;
  blunder: number;
}

/** Configuration for the sigmoid win-percent conversion */
export interface WinPercentConfig {
  multiplier: number;
}

// --- UI Component Props ---

/** Props for the evaluation graph component */
export interface EvalGraphProps {
  evaluations: EvalScore[];
  classifications: ClassifiedMove[];
  currentMoveIndex: number;
  onMoveClick: (moveIndex: number) => void;
  /** Total positions in the game, including the starting position. */
  totalPositions?: number;
}

// --- Application State ---

/** Full application state for the game review flow */
export interface GameReviewState {
  // Import phase
  importMethod: "pgn" | "chesscom" | "lichess" | null;
  rawPgn: string | null;
  gameList: GameListItem[];
  selectedGameId: string | null;

  // Parsed game
  parsedGame: ParsedGame | null;

  // Analysis phase
  analysisStatus: "idle" | "running" | "complete" | "error";
  /** Progress from 0 to 1 */
  analysisProgress: number;
  evaluations: EngineEvaluation[];
  /** User-configurable maximum depth, default 18, range [10, 25] */
  analysisDepth: number;

  // Classification phase
  classifiedMoves: ClassifiedMove[];
  gameAccuracy: GameAccuracy | null;

  // Navigation
  currentMoveIndex: number;

  // Error state
  error: string | null;
}

// =============================================================================
// Default Constants
// =============================================================================

/** Default classification thresholds (win-percentage loss boundaries) */
export const DEFAULT_THRESHOLDS: ClassificationThresholds = {
  excellent: 0.5,
  good: 2,
  inaccuracy: 5,
  mistake: 10,
  blunder: Infinity,
};

/**
 * Sigmoid steepness multiplier for centipawn → win-percent conversion.
 * Based on the Lichess-style formula.
 */
export const WIN_PERCENT_MULTIPLIER = 0.00368208;

/** Default analysis depth (range: 10–25) */
export const DEFAULT_ANALYSIS_DEPTH = 18;

/** Reduced depth for full-game batch review (faster, still accurate for classification) */
export const FULL_GAME_REVIEW_DEPTH = 14;
