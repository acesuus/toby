// =============================================================================
// TypeScript Types for Supabase Database Records
// =============================================================================

/** User profile record from the `profiles` table */
export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  last_login_at: string;
}

/** Game record from the `games` table */
export interface GameRecord {
  id: string;
  user_id: string;
  pgn: string;
  headers: {
    white: string;
    black: string;
    result: string;
    date?: string;
    timeControl?: string;
    opening?: string;
    eco?: string;
  };
  source_platform: "chesscom" | "lichess" | "manual";
  source_game_id: string | null;
  created_at: string;
  last_accessed_at: string;
}

/** Analysis record from the `game_analyses` table */
export interface GameAnalysis {
  id: string;
  game_id: string;
  classified_moves: Array<{
    san: string;
    uci: string;
    grade: string;
    winPercentLoss: number;
  }>;
  white_accuracy: number;
  black_accuracy: number;
  analysis_depth: number;
}

/** Game record joined with its analysis (nullable for games without analysis) */
export interface GameWithAnalysis extends GameRecord {
  game_analyses: GameAnalysis | null;
}

/** Response shape for paginated game list endpoint */
export interface PaginatedGamesResponse {
  games: GameWithAnalysis[];
  nextCursor: string | null;
}

/** Payload for saving a game to the library via POST /api/games */
export interface SaveGamePayload {
  pgn: string;
  headers: GameRecord["headers"];
  sourcePlatform?: "chesscom" | "lichess" | "manual";
  sourceGameId?: string | null;
  classifiedMoves?: GameAnalysis["classified_moves"];
  whiteAccuracy?: number;
  blackAccuracy?: number;
  analysisDepth?: number;
}
