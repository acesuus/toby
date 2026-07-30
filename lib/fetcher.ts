import { Platform, GameListItem } from "./types";

// =============================================================================
// Username Validation
// =============================================================================

const CHESSCOM_USERNAME_RE = /^[a-zA-Z0-9_-]{3,25}$/;
const LICHESS_USERNAME_RE = /^[a-zA-Z0-9_-]{2,20}$/;

/**
 * Validates a username for the specified platform.
 * Returns an error message string if invalid, or null if valid.
 */
export function validateUsername(
  platform: Platform,
  username: string
): string | null {
  if (!username || username.trim().length === 0) {
    return "Username cannot be empty";
  }

  const trimmed = username.trim();

  if (platform === "chesscom") {
    if (!CHESSCOM_USERNAME_RE.test(trimmed)) {
      return "Chess.com username must be 3–25 characters and contain only letters, numbers, hyphens, and underscores";
    }
  } else {
    if (!LICHESS_USERNAME_RE.test(trimmed)) {
      return "Lichess username must be 2–20 characters and contain only letters, numbers, hyphens, and underscores";
    }
  }

  return null;
}

// =============================================================================
// Chess.com API Client
// =============================================================================

/**
 * Normalizes a Chess.com game object into a GameListItem.
 */
function normalizeChesscomGame(game: Record<string, unknown>): GameListItem {
  const white = game.white as Record<string, unknown> | undefined;
  const black = game.black as Record<string, unknown> | undefined;

  const whiteUsername = (white?.username as string) ?? "Unknown";
  const blackUsername = (black?.username as string) ?? "Unknown";

  const whiteResult = white?.result as string | undefined;
  const blackResult = black?.result as string | undefined;

  let result = "½-½";
  if (whiteResult === "win") result = "1-0";
  else if (blackResult === "win") result = "0-1";

  const timeControl = (game.time_control as string) ?? "?";
  const endTime = game.end_time as number | undefined;
  const date = endTime
    ? new Date(endTime * 1000).toISOString().split("T")[0]
    : "????.??.??";

  const pgn = (game.pgn as string) ?? "";
  const url = (game.url as string) ?? "";
  // Extract game ID from URL like https://www.chess.com/game/live/12345
  const idMatch = url.match(/\/(\d+)$/);
  const id = idMatch ? idMatch[1] : (game.uuid as string) ?? crypto.randomUUID();

  return { id, white: whiteUsername, black: blackUsername, result, timeControl, date, pgn };
}

/**
 * Fetches recent games from the Chess.com API.
 */
async function fetchChesscomGames(
  username: string,
  signal?: AbortSignal
): Promise<GameListItem[]> {
  const controller = new AbortController();
  const abortFromCaller = () => controller.abort();
  if (signal?.aborted) controller.abort();
  else signal?.addEventListener("abort", abortFromCaller, { once: true });
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    // Step 1: Fetch monthly archives list
    const archivesUrl = `https://api.chess.com/pub/player/${encodeURIComponent(username.trim().toLowerCase())}/games/archives`;
    const archivesRes = await fetch(archivesUrl, {
      signal: controller.signal,
      mode: "cors",
      credentials: "omit",
    });

    if (archivesRes.status === 404) {
      throw new Error("User not found on Chess.com");
    }
    if (archivesRes.status === 429) {
      throw new Error("Rate limited by Chess.com. Please try again later");
    }
    if (!archivesRes.ok) {
      throw new Error(`Chess.com API error: ${archivesRes.status}`);
    }

    const archivesData = (await archivesRes.json()) as { archives?: string[] };
    const archives = archivesData.archives ?? [];

    if (archives.length === 0) {
      return [];
    }

    // Step 2: Fetch games from the most recent archive(s), up to 50 games
    const games: GameListItem[] = [];
    // Start from the latest archive
    for (let i = archives.length - 1; i >= 0 && games.length < 50; i--) {
      const gamesRes = await fetch(archives[i], {
        signal: controller.signal,
        mode: "cors",
        credentials: "omit",
      });

      if (gamesRes.status === 429) {
        throw new Error("Rate limited by Chess.com. Please try again later");
      }
      if (!gamesRes.ok) continue;

      const gamesData = (await gamesRes.json()) as { games?: Record<string, unknown>[] };
      const monthGames = gamesData.games ?? [];

      // Add games in reverse order (most recent first)
      for (let j = monthGames.length - 1; j >= 0 && games.length < 50; j--) {
        games.push(normalizeChesscomGame(monthGames[j]));
      }
    }

    return games;
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        if (signal?.aborted) throw error;
        throw new Error("Chess.com request timed out. Please try again");
      }
      throw error;
    }
    throw new Error("Network error while contacting Chess.com");
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abortFromCaller);
  }
}

// =============================================================================
// Lichess API Client
// =============================================================================

/** Represents a single game from the Lichess ndjson response */
interface LichessGame {
  id: string;
  rated?: boolean;
  variant?: string;
  speed?: string;
  perf?: string;
  createdAt?: number;
  lastMoveAt?: number;
  status?: string;
  players?: {
    white?: { user?: { name?: string; id?: string } };
    black?: { user?: { name?: string; id?: string } };
  };
  winner?: string;
  pgn?: string;
  clock?: { initial?: number; increment?: number };
  moves?: string;
}

/**
 * Formats a Lichess clock object into a time control string like "600+5".
 */
function formatLichessClock(clock?: { initial?: number; increment?: number }): string {
  if (!clock) return "?";
  const initial = clock.initial != null ? clock.initial : 0;
  const increment = clock.increment != null ? clock.increment : 0;
  return `${initial}+${increment}`;
}

/**
 * Derives a game result string from the Lichess winner field.
 */
function deriveLichessResult(winner?: string, status?: string): string {
  if (winner === "white") return "1-0";
  if (winner === "black") return "0-1";
  // Draw conditions: draw, stalemate, or no winner with a terminal status
  if (status === "draw" || status === "stalemate" || !winner) return "½-½";
  return "½-½";
}

/**
 * Normalizes a Lichess game JSON object into a GameListItem.
 */
function normalizeLichessGame(game: LichessGame): GameListItem {
  const whiteName =
    game.players?.white?.user?.name ??
    game.players?.white?.user?.id ??
    "Anonymous";
  const blackName =
    game.players?.black?.user?.name ??
    game.players?.black?.user?.id ??
    "Anonymous";

  const result = deriveLichessResult(game.winner, game.status);
  const timeControl = formatLichessClock(game.clock);

  const date = game.createdAt
    ? new Date(game.createdAt).toISOString().split("T")[0]
    : "????.??.??";

  const pgn = game.pgn ?? "";

  return {
    id: game.id,
    white: whiteName,
    black: blackName,
    result,
    timeControl,
    date,
    pgn,
  };
}

/**
 * Parses newline-delimited JSON (ndjson) text into an array of objects.
 */
function parseNdjson(text: string): LichessGame[] {
  if (!text || text.trim().length === 0) return [];

  return text
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as LichessGame);
}

/**
 * Fetches recent games from the Lichess API (ndjson format with PGN).
 */
async function fetchLichessGames(
  username: string,
  signal?: AbortSignal
): Promise<GameListItem[]> {
  const controller = new AbortController();
  const abortFromCaller = () => controller.abort();
  if (signal?.aborted) controller.abort();
  else signal?.addEventListener("abort", abortFromCaller, { once: true });
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const url = `https://lichess.org/api/games/user/${encodeURIComponent(username.trim())}?max=20&pgnInBody=true`;

    const response = await fetch(url, {
      signal: controller.signal,
      mode: "cors",
      credentials: "omit",
      headers: {
        Accept: "application/x-ndjson",
      },
    });

    if (response.status === 404) {
      throw new Error("User not found on Lichess");
    }
    if (response.status === 429) {
      throw new Error("Rate limited by Lichess. Please try again later");
    }
    if (!response.ok) {
      throw new Error(`Lichess API error: ${response.status}`);
    }

    const body = await response.text();

    // 200 with empty body means zero games found
    if (!body || body.trim().length === 0) {
      return [];
    }

    const games = parseNdjson(body);
    return games.map(normalizeLichessGame);
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        if (signal?.aborted) throw error;
        throw new Error("Lichess request timed out. Please try again");
      }
      throw error;
    }
    throw new Error("Network error while contacting Lichess");
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abortFromCaller);
  }
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Fetches recent games for the given platform and username.
 * Validates the username before making the API call.
 *
 * @throws Error with a descriptive message on failure (user-not-found, rate-limit, network, timeout)
 */
export async function fetchRecentGames(
  platform: Platform,
  username: string,
  signal?: AbortSignal
): Promise<GameListItem[]> {
  const validationError = validateUsername(platform, username);
  if (validationError) {
    throw new Error(validationError);
  }

  if (platform === "chesscom") {
    return fetchChesscomGames(username, signal);
  } else {
    return fetchLichessGames(username, signal);
  }
}

/**
 * Fetches PGN for a specific game by ID.
 *
 * For Chess.com: fetches the game page and extracts PGN.
 * For Lichess: uses the game export API.
 */
export async function fetchGamePGN(
  platform: Platform,
  gameId: string
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    let url: string;
    const headers: Record<string, string> = {};

    if (platform === "lichess") {
      url = `https://lichess.org/game/export/${encodeURIComponent(gameId)}`;
      headers["Accept"] = "application/x-chess-pgn";
    } else {
      // Chess.com: PGN is typically included in the game list already.
      // This endpoint serves as a fallback for fetching individual game PGN.
      url = `https://api.chess.com/pub/game/${encodeURIComponent(gameId)}`;
    }

    const response = await fetch(url, {
      signal: controller.signal,
      headers,
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch PGN from ${platform}: ${response.status}`
      );
    }

    if (platform === "lichess") {
      return await response.text();
    } else {
      const data = (await response.json()) as { pgn?: string };
      return data.pgn ?? "";
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        throw new Error(`${platform} PGN request timed out. Please try again`);
      }
      throw error;
    }
    throw new Error(`Network error fetching PGN from ${platform}`);
  } finally {
    clearTimeout(timeout);
  }
}
