import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { validateUsername, fetchRecentGames } from "@/lib/fetcher";

// =============================================================================
// Username Validation Tests
// =============================================================================

describe("validateUsername", () => {
  describe("Chess.com", () => {
    it("returns null for a valid username (3+ chars, alphanumeric)", () => {
      expect(validateUsername("chesscom", "player1")).toBeNull();
    });

    it("returns error for a username that is too short (< 3 chars)", () => {
      const result = validateUsername("chesscom", "ab");
      expect(result).not.toBeNull();
      expect(result).toContain("3–25 characters");
    });

    it("returns error for an empty username", () => {
      const result = validateUsername("chesscom", "");
      expect(result).not.toBeNull();
      expect(result).toContain("empty");
    });

    it("returns error for a username with invalid characters", () => {
      const result = validateUsername("chesscom", "inv@lid!");
      expect(result).not.toBeNull();
      expect(result).toContain("letters, numbers, hyphens, and underscores");
    });
  });

  describe("Lichess", () => {
    it("returns null for a valid Lichess username (2+ chars)", () => {
      expect(validateUsername("lichess", "ab")).toBeNull();
    });

    it("returns error for a username that is too short (< 2 chars)", () => {
      const result = validateUsername("lichess", "a");
      expect(result).not.toBeNull();
      expect(result).toContain("2–20 characters");
    });
  });
});

// =============================================================================
// Fetch Mock Helpers
// =============================================================================

function mockFetch(impl: (url: string, ...args: unknown[]) => unknown) {
  globalThis.fetch = vi.fn(impl) as unknown as typeof fetch;
}

function createResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(typeof body === "string" ? body : JSON.stringify(body)),
    headers: new Headers(),
    redirected: false,
    statusText: "OK",
    type: "basic",
    url: "",
    clone: () => createResponse(body, status),
    body: null,
    bodyUsed: false,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    blob: () => Promise.resolve(new Blob()),
    formData: () => Promise.resolve(new FormData()),
    bytes: () => Promise.resolve(new Uint8Array()),
  } as unknown as Response;
}

// =============================================================================
// Chess.com Fetch Tests
// =============================================================================

describe("fetchRecentGames - Chess.com", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.useRealTimers();
  });

  it("returns normalized GameListItem[] from a successful response", async () => {
    const archivesResponse = {
      archives: ["https://api.chess.com/pub/player/player1/games/2024/01"],
    };
    const gamesResponse = {
      games: [
        {
          url: "https://www.chess.com/game/live/12345",
          white: { username: "player1", result: "win" },
          black: { username: "opponent1", result: "loss" },
          time_control: "600",
          end_time: 1704067200,
          pgn: "1. e4 e5 2. Nf3 *",
        },
      ],
    };

    mockFetch((url: string) => {
      if (url.includes("/archives")) {
        return Promise.resolve(createResponse(archivesResponse));
      }
      return Promise.resolve(createResponse(gamesResponse));
    });

    const games = await fetchRecentGames("chesscom", "player1");

    expect(games).toHaveLength(1);
    expect(games[0]).toEqual({
      id: "12345",
      white: "player1",
      black: "opponent1",
      result: "1-0",
      timeControl: "600",
      date: "2024-01-01",
      pgn: "1. e4 e5 2. Nf3 *",
    });
  });

  it("throws 'User not found' on 404 response", async () => {
    mockFetch(() => Promise.resolve(createResponse({}, 404)));

    await expect(fetchRecentGames("chesscom", "nobody123")).rejects.toThrow(
      "User not found"
    );
  });

  it("throws 'Rate limited' on 429 response", async () => {
    mockFetch(() => Promise.resolve(createResponse({}, 429)));

    await expect(fetchRecentGames("chesscom", "player1")).rejects.toThrow(
      "Rate limited"
    );
  });

  it("throws 'timed out' on AbortError", async () => {
    mockFetch(() => {
      const error = new DOMException("The operation was aborted.", "AbortError");
      return Promise.reject(error);
    });

    await expect(fetchRecentGames("chesscom", "player1")).rejects.toThrow(
      "timed out"
    );
  });

  it("preserves caller-initiated cancellation as an AbortError", async () => {
    mockFetch((_url: string, options: unknown) =>
      new Promise((_resolve, reject) => {
        const signal = (options as RequestInit).signal;
        signal?.addEventListener("abort", () => {
          reject(new DOMException("The operation was aborted.", "AbortError"));
        });
      })
    );

    const controller = new AbortController();
    const request = fetchRecentGames("chesscom", "player1", controller.signal);
    controller.abort();

    await expect(request).rejects.toMatchObject({ name: "AbortError" });
  });
});

// =============================================================================
// Lichess Fetch Tests
// =============================================================================

describe("fetchRecentGames - Lichess", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.useRealTimers();
  });

  it("returns normalized GameListItem[] from a successful ndjson response", async () => {
    const ndjson = JSON.stringify({
      id: "abc123",
      players: {
        white: { user: { name: "WhitePlayer", id: "whiteplayer" } },
        black: { user: { name: "BlackPlayer", id: "blackplayer" } },
      },
      winner: "white",
      status: "mate",
      clock: { initial: 300, increment: 3 },
      createdAt: 1704067200000,
      pgn: "1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7# 1-0",
    });

    mockFetch(() => Promise.resolve(createResponse(ndjson)));

    const games = await fetchRecentGames("lichess", "WhitePlayer");

    expect(games).toHaveLength(1);
    expect(games[0]).toEqual({
      id: "abc123",
      white: "WhitePlayer",
      black: "BlackPlayer",
      result: "1-0",
      timeControl: "300+3",
      date: "2024-01-01",
      pgn: "1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7# 1-0",
    });
  });

  it("throws 'User not found' on 404 response", async () => {
    mockFetch(() => Promise.resolve(createResponse("", 404)));

    await expect(fetchRecentGames("lichess", "nobody123")).rejects.toThrow(
      "User not found"
    );
  });

  it("throws 'Rate limited' on 429 response", async () => {
    mockFetch(() => Promise.resolve(createResponse("", 429)));

    await expect(fetchRecentGames("lichess", "player1")).rejects.toThrow(
      "Rate limited"
    );
  });

  it("returns empty array when 200 with no content (empty body)", async () => {
    mockFetch(() => Promise.resolve(createResponse("")));

    const games = await fetchRecentGames("lichess", "newplayer");

    expect(games).toEqual([]);
  });

  it("throws 'timed out' on AbortError", async () => {
    mockFetch(() => {
      const error = new DOMException("The operation was aborted.", "AbortError");
      return Promise.reject(error);
    });

    await expect(fetchRecentGames("lichess", "player1")).rejects.toThrow(
      "timed out"
    );
  });
});
