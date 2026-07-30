import type { Platform } from "@/lib/types";

/** Stored platform connection data from the profiles table */
export interface PlatformUsernames {
  chess_com_username: string | null;
  lichess_username: string | null;
}

/** Platform profile data fetched from the external API */
export interface PlatformProfile {
  username: string;
  platform: Platform;
  ratings: PlatformRating[];
  recentGames?: import("@/lib/types").GameListItem[];
}

/** A single rating entry for a time control, extended with game statistics */
export interface PlatformRating {
  timeControl: string;
  rating: number;
  gamesPlayed: number;
  record: {
    wins: number;
    losses: number;
    draws: number;
  };
}

/** Request body for PUT /api/account/platforms */
export interface ConnectPlatformRequest {
  platform: Platform;
  username: string;
}

/** Request body for DELETE /api/account/platforms */
export interface DisconnectPlatformRequest {
  platform: Platform;
}

/** Response from GET /api/account/platforms */
export type PlatformUsernamesResponse = PlatformUsernames;

/** Error response shape from API routes */
export interface ApiError {
  error: string;
}
