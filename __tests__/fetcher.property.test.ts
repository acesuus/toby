import { describe, it, expect, afterEach, vi } from "vitest";
import * as fc from "fast-check";
import { fetchRecentGames } from "@/lib/fetcher";
import type { GameListItem } from "@/lib/types";

/**
 * Property 11: API Normalization Completeness
 * For any valid API response from Chess.com or Lichess, the normalized
 * GameListItem contains all required fields: id, white player, black player,
 * result, time control, date, and PGN.
 *
 * **Validates: Requirements 2.2, 3.2**
 */

// ---------------------------------------------------------------------------
// Arbitraries for Chess.com API responses
// ---------------------------------------------------------------------------

/** Generates a valid Chess.com game object */
const chesscomGameArb = fc.record({
  url: fc.stringMatching(/^https:\/\/www\.chess\.com\/game\/live\/\d{1,10}$/),
  pgn: fc.string(),
  time_control: fc.string({ minLength: 1 }),
  end_time: fc.integer({ min: 946684800, max: 2000000000 }), // valid unix timestamps
  white: fc.record({
    username: fc.stringMatching(/^[a-zA-Z0-9_-]{3,25}$/),
    result: fc.constantFrom("win", "loss", "draw", "timeout", "resigned", "abandoned"),
  }),
  black: fc.record({
    username: fc.stringMatching(/^[a-zA-Z0-9_-]{3,25}$/),
    result: fc.constantFrom("win", "loss", "draw", "timeout", "resigned", "abandoned"),
  }),
});

/** Generates a valid Chess.com games response for a given month */
const chesscomGamesResponseArb = fc
  .array(chesscomGameArb, { minLength: 1, maxLength: 5 })
  .map((games) => ({ games }));

// ---------------------------------------------------------------------------
// Arbitraries for Lichess API responses
// ---------------------------------------------------------------------------

/** Generates a valid Lichess game object */
const lichessGameArb = fc.record({
  id: fc.stringMatching(/^[a-zA-Z0-9]{8}$/),
  createdAt: fc.integer({ min: 1_600_000_000_000, max: 2_000_000_000_000 }),
  status: fc.constantFrom("mate", "resign", "draw", "stalemate", "timeout", "outoftime"),
  players: fc.record({
    white: fc.record({
      user: fc.record({
        name: fc.stringMatching(/^[a-zA-Z0-9_-]{2,20}$/),
        id: fc.stringMatching(/^[a-zA-Z0-9_-]{2,20}$/),
      }),
    }),
    black: fc.record({
      user: fc.record({
        name: fc.stringMatching(/^[a-zA-Z0-9_-]{2,20}$/),
        id: fc.stringMatching(/^[a-zA-Z0-9_-]{2,20}$/),
      }),
    }),
  }),
  winner: fc.constantFrom("white", "black", undefined),
  clock: fc.record({
    initial: fc.integer({ min: 0, max: 10800 }),
    increment: fc.integer({ min: 0, max: 60 }),
  }),
  pgn: fc.string(),
});

/** Generates an ndjson response body from an array of Lichess games */
const lichessNdjsonArb = fc
  .array(lichessGameArb, { minLength: 1, maxLength: 5 })
  .map((games) => games.map((g) => JSON.stringify(g)).join("\n"));

// ---------------------------------------------------------------------------
// Helper: Assert GameListItem has all required fields
// ---------------------------------------------------------------------------

function assertValidGameListItem(item: GameListItem): void {
  // All required fields must be present and be strings
  expect(item).toHaveProperty("id");
  expect(item).toHaveProperty("white");
  expect(item).toHaveProperty("black");
  expect(item).toHaveProperty("result");
  expect(item).toHaveProperty("timeControl");
  expect(item).toHaveProperty("date");
  expect(item).toHaveProperty("pgn");

  // Type checks
  expect(typeof item.id).toBe("string");
  expect(typeof item.white).toBe("string");
  expect(typeof item.black).toBe("string");
  expect(typeof item.result).toBe("string");
  expect(typeof item.timeControl).toBe("string");
  expect(typeof item.date).toBe("string");
  expect(typeof item.pgn).toBe("string");

  // id, white, and black must be non-empty
  expect(item.id.length).toBeGreaterThan(0);
  expect(item.white.length).toBeGreaterThan(0);
  expect(item.black.length).toBeGreaterThan(0);

  // result should be a valid chess result format
  expect(["1-0", "0-1", "½-½"]).toContain(item.result);

  // timeControl and date must be non-empty strings
  expect(item.timeControl.length).toBeGreaterThan(0);
  expect(item.date.length).toBeGreaterThan(0);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Property 11: API Normalization Completeness", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("Chess.com: normalized GameListItem contains all required fields for any valid API response", async () => {
    await fc.assert(
      fc.asyncProperty(
        chesscomGamesResponseArb,
        async (gamesResponse) => {
          // Mock fetch: responds to archives with a single archive URL,
          // then responds to that archive URL with the generated games
          const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>();

          fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
            const url = typeof input === "string" ? input : input.toString();

            if (url.includes("/games/archives")) {
              // Archives endpoint — return a single archive
              return new Response(
                JSON.stringify({
                  archives: [
                    "https://api.chess.com/pub/player/testuser/games/2024/01",
                  ],
                }),
                { status: 200, headers: { "Content-Type": "application/json" } }
              );
            }

            // Games endpoint — return generated games
            return new Response(JSON.stringify(gamesResponse), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            });
          });

          vi.stubGlobal("fetch", fetchMock);

          const result = await fetchRecentGames("chesscom", "testuser");

          // Every returned item must have all required fields
          expect(result.length).toBeGreaterThan(0);
          for (const item of result) {
            assertValidGameListItem(item);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it("Lichess: normalized GameListItem contains all required fields for any valid API response", async () => {
    await fc.assert(
      fc.asyncProperty(lichessNdjsonArb, async (ndjsonBody) => {
        // Mock fetch to return our generated ndjson response
        const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>();

        fetchMock.mockResolvedValueOnce(
          new Response(ndjsonBody, {
            status: 200,
            headers: { "Content-Type": "application/x-ndjson" },
          })
        );

        vi.stubGlobal("fetch", fetchMock);

        const result = await fetchRecentGames("lichess", "testuser");

        // Every returned item must have all required fields
        expect(result.length).toBeGreaterThan(0);
        for (const item of result) {
          assertValidGameListItem(item);
        }
      }),
      { numRuns: 50 }
    );
  });
});
