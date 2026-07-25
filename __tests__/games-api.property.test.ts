import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fc from "fast-check";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mock setup
// ---------------------------------------------------------------------------

// Mock next/headers (needed by createServerSupabaseClient)
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => ({
    getAll: vi.fn(() => []),
    set: vi.fn(),
  })),
}));

const MOCK_USER = {
  id: "user-abc-123",
  email: "player@chess.com",
};

// Store for simulating a database of games
let gamesStore: Record<string, any>;
let analysesStore: Record<string, any>;

// Build a mock supabase client that simulates chained queries
function buildMockSupabase() {
  return {
    auth: {
      getUser: vi.fn(async () => ({ data: { user: MOCK_USER } })),
    },
    from: (table: string) => {
      if (table === "games") {
        return buildGamesTable();
      }
      if (table === "game_analyses") {
        return buildAnalysesTable();
      }
      return {};
    },
  };
}

function buildGamesTable() {
  return {
    insert: (record: any) => ({
      select: () => ({
        single: async () => {
          const id = crypto.randomUUID();
          const now = new Date().toISOString();
          const game = {
            id,
            user_id: record.user_id,
            pgn: record.pgn,
            headers: record.headers,
            source_platform: record.source_platform,
            source_game_id: record.source_game_id,
            created_at: now,
            last_accessed_at: now,
          };
          gamesStore[id] = game;
          return { data: game, error: null };
        },
      }),
    }),
    select: (fields?: string) => {
      // This returns a chainable object for different query patterns
      const ctx: any = { filters: {}, orderCol: null, ascending: true, limitVal: null, ltFilters: {} };
      const chain: any = {
        eq: (col: string, val: string) => {
          ctx.filters[col] = val;
          return chain;
        },
        lt: (col: string, val: string) => {
          ctx.ltFilters[col] = val;
          return chain;
        },
        order: (col: string, opts?: { ascending: boolean }) => {
          ctx.orderCol = col;
          ctx.ascending = opts?.ascending ?? true;
          return chain;
        },
        limit: (n: number) => {
          ctx.limitVal = n;
          return chain;
        },
        single: async () => {
          // Find matching game
          const results = Object.values(gamesStore).filter((g: any) => {
            return Object.entries(ctx.filters).every(([k, v]) => g[k] === v);
          });
          if (results.length === 0) return { data: null, error: { message: "Not found" } };
          const game = results[0] as any;
          // If select includes analyses, attach them
          if (fields && fields.includes("game_analyses")) {
            game.game_analyses = analysesStore[game.id] || null;
          }
          return { data: game, error: null };
        },
        maybeSingle: async () => {
          const results = Object.values(gamesStore).filter((g: any) => {
            return Object.entries(ctx.filters).every(([k, v]) => g[k] === v);
          });
          return { data: results.length > 0 ? results[0] : null, error: null };
        },
        then: undefined as any, // make it awaitable
      };
      // Make the chain itself thenable (for paginated queries where result is awaited directly)
      chain.then = (resolve: any, reject?: any) => {
        const promise = (async () => {
          let results = Object.values(gamesStore).filter((g: any) => {
            return Object.entries(ctx.filters).every(([k, v]) => g[k] === v);
          });
          // Apply lt filters
          for (const [col, val] of Object.entries(ctx.ltFilters)) {
            results = results.filter((g: any) => g[col] < val);
          }
          // Apply ordering
          if (ctx.orderCol) {
            results.sort((a: any, b: any) => {
              if (ctx.ascending) return a[ctx.orderCol] < b[ctx.orderCol] ? -1 : 1;
              return a[ctx.orderCol] > b[ctx.orderCol] ? -1 : 1;
            });
          }
          // Apply limit
          if (ctx.limitVal) {
            results = results.slice(0, ctx.limitVal);
          }
          // Attach analyses if requested
          if (fields && fields.includes("game_analyses")) {
            results = results.map((g: any) => ({
              ...g,
              game_analyses: analysesStore[g.id] || null,
            }));
          }
          return { data: results, error: null };
        })();
        return promise.then(resolve, reject);
      };
      return chain;
    },
    update: (record: any) => {
      const ctx: any = { filters: {} };
      const chain: any = {
        eq: (col: string, val: string) => {
          ctx.filters[col] = val;
          return chain;
        },
        select: () => ({
          single: async () => {
            const results = Object.values(gamesStore).filter((g: any) => {
              return Object.entries(ctx.filters).every(([k, v]) => g[k] === v);
            });
            if (results.length === 0) return { data: null, error: { message: "Not found" } };
            const game = results[0] as any;
            Object.assign(game, record);
            return { data: game, error: null };
          },
        }),
      };
      return chain;
    },
    delete: () => {
      const ctx: any = { filters: {} };
      const chain: any = {
        eq: (col: string, val: string) => {
          ctx.filters[col] = val;
          return chain;
        },
        then: undefined as any,
      };
      chain.then = (resolve: any, reject?: any) => {
        const promise = (async () => {
          const id = ctx.filters["id"];
          if (id && gamesStore[id]) {
            delete gamesStore[id];
            delete analysesStore[id];
          }
          return { error: null };
        })();
        return promise.then(resolve, reject);
      };
      return chain;
    },
  };
}

function buildAnalysesTable() {
  return {
    insert: async (record: any) => {
      analysesStore[record.game_id] = {
        id: crypto.randomUUID(),
        game_id: record.game_id,
        classified_moves: record.classified_moves || [],
        white_accuracy: record.white_accuracy || 0,
        black_accuracy: record.black_accuracy || 0,
        analysis_depth: record.analysis_depth || 18,
      };
      return { data: analysesStore[record.game_id], error: null };
    },
    upsert: async (record: any) => {
      analysesStore[record.game_id] = {
        id: analysesStore[record.game_id]?.id || crypto.randomUUID(),
        game_id: record.game_id,
        classified_moves: record.classified_moves || [],
        white_accuracy: record.white_accuracy || 0,
        black_accuracy: record.black_accuracy || 0,
        analysis_depth: record.analysis_depth || 18,
      };
      return { data: analysesStore[record.game_id], error: null };
    },
  };
}

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => buildMockSupabase()),
}));

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const saveGamePayloadArb = fc.record({
  pgn: fc.string({ minLength: 1, maxLength: 500 }),
  headers: fc.record({
    white: fc.string({ minLength: 1, maxLength: 50 }),
    black: fc.string({ minLength: 1, maxLength: 50 }),
    result: fc.constantFrom("1-0", "0-1", "1/2-1/2"),
    date: fc.option(fc.date().map(d => d.toISOString().split("T")[0]), { nil: undefined }),
  }),
  sourcePlatform: fc.option(fc.constantFrom("chesscom", "lichess", "manual"), { nil: undefined }),
  sourceGameId: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
  classifiedMoves: fc.option(
    fc.array(
      fc.record({
        san: fc.string({ minLength: 1, maxLength: 7 }),
        uci: fc.string({ minLength: 4, maxLength: 5 }),
        grade: fc.constantFrom("brilliant", "great", "best", "good", "inaccuracy", "mistake", "blunder"),
        winPercentLoss: fc.float({ min: 0, max: 100, noNaN: true }),
      }),
      { minLength: 1, maxLength: 20 }
    ),
    { nil: undefined }
  ),
  whiteAccuracy: fc.option(fc.float({ min: 0, max: 100, noNaN: true }), { nil: undefined }),
  blackAccuracy: fc.option(fc.float({ min: 0, max: 100, noNaN: true }), { nil: undefined }),
  analysisDepth: fc.option(fc.integer({ min: 1, max: 30 }), { nil: undefined }),
});

// ---------------------------------------------------------------------------
// Helper: create mock NextRequest
// ---------------------------------------------------------------------------

function createPostRequest(body: any): NextRequest {
  return new NextRequest("http://localhost:3000/api/games", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function createGetRequest(params?: Record<string, string>): NextRequest {
  const url = new URL("http://localhost:3000/api/games");
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  return new NextRequest(url.toString(), { method: "GET" });
}

function createGetByIdRequest(id: string): NextRequest {
  return new NextRequest(`http://localhost:3000/api/games/${id}`, { method: "GET" });
}

function createDeleteRequest(id: string): NextRequest {
  return new NextRequest(`http://localhost:3000/api/games/${id}`, { method: "DELETE" });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Games API Property Tests", () => {
  beforeEach(() => {
    gamesStore = {};
    analysesStore = {};
  });

  // =========================================================================
  // Property 6: Save game round-trip
  // Validates: Requirements 9.1, 9.4
  // =========================================================================
  describe("Property 6: Save game round-trip", () => {
    it("persists all fields and returns a valid UUID", async () => {
      const { POST } = await import("@/app/api/games/route");

      await fc.assert(
        fc.asyncProperty(saveGamePayloadArb, async (payload) => {
          // Reset store for each iteration
          gamesStore = {};
          analysesStore = {};

          const request = createPostRequest(payload);
          const response = await POST(request);
          const json = await response.json();

          // Should return 201 with game data
          expect(response.status).toBe(201);
          expect(json.game).toBeDefined();
          expect(json.game.id).toBeDefined();

          // UUID format validation (v4-like)
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          expect(json.game.id).toMatch(uuidRegex);

          // Verify persisted fields match input
          expect(json.game.pgn).toBe(payload.pgn);
          expect(json.game.headers).toEqual(payload.headers);
          expect(json.game.source_platform).toBe(payload.sourcePlatform ?? "manual");
        }),
        { numRuns: 20 }
      );
    });
  });

  // =========================================================================
  // Property 7: Save idempotence for sourced games
  // Validates: Requirements 9.2
  // =========================================================================
  describe("Property 7: Save idempotence for sourced games", () => {
    it("saving the same sourced game twice results in a single record (update not duplicate)", async () => {
      const { POST } = await import("@/app/api/games/route");

      const sourcedPayloadArb = fc.record({
        pgn: fc.string({ minLength: 1, maxLength: 500 }),
        headers: fc.record({
          white: fc.string({ minLength: 1, maxLength: 50 }),
          black: fc.string({ minLength: 1, maxLength: 50 }),
          result: fc.constantFrom("1-0", "0-1", "1/2-1/2"),
          date: fc.option(fc.date().map(d => d.toISOString().split("T")[0]), { nil: undefined }),
        }),
        sourcePlatform: fc.constantFrom("chesscom" as const, "lichess" as const),
        sourceGameId: fc.string({ minLength: 1, maxLength: 20 }),
      });

      await fc.assert(
        fc.asyncProperty(sourcedPayloadArb, async (payload) => {
          // Reset store for each iteration
          gamesStore = {};
          analysesStore = {};

          const request1 = createPostRequest(payload);
          const response1 = await POST(request1);
          expect(response1.status).toBe(201);

          // Save again with the same source identifiers
          const request2 = createPostRequest({ ...payload, pgn: payload.pgn + " updated" });
          const response2 = await POST(request2);
          const json2 = await response2.json();

          // Should return 200 (update, not 201 create)
          expect(response2.status).toBe(200);
          expect(json2.game).toBeDefined();

          // Only one game should exist in the store
          const allGames = Object.values(gamesStore);
          expect(allGames.length).toBe(1);
        }),
        { numRuns: 20 }
      );
    });
  });

  // =========================================================================
  // Property 8: Pagination ordering invariant
  // Validates: Requirements 10.1
  // Property 9: Pagination size invariant
  // Validates: Requirements 10.4
  // =========================================================================
  describe("Property 8 & 9: Pagination ordering and size invariants", () => {
    it("returns games in descending order by created_at", async () => {
      const { GET } = await import("@/app/api/games/route");

      const timestampsArb = fc.array(
        fc.integer({ min: new Date("2020-01-01").getTime(), max: new Date("2030-01-01").getTime() }).map(t => new Date(t)),
        { minLength: 2, maxLength: 30 }
      );

      await fc.assert(
        fc.asyncProperty(timestampsArb, async (timestamps) => {
          // Reset store
          gamesStore = {};
          analysesStore = {};

          // Seed the store with games having specific timestamps
          timestamps.forEach((ts, i) => {
            const id = crypto.randomUUID();
            gamesStore[id] = {
              id,
              user_id: MOCK_USER.id,
              pgn: `game-${i}`,
              headers: { white: "W", black: "B", result: "1-0" },
              source_platform: "manual",
              source_game_id: null,
              created_at: ts.toISOString(),
              last_accessed_at: ts.toISOString(),
            };
          });

          const request = createGetRequest();
          const response = await GET(request);
          const json = await response.json();

          expect(response.status).toBe(200);
          expect(json.games).toBeDefined();

          // Property 8: Verify descending order
          for (let i = 1; i < json.games.length; i++) {
            const prev = new Date(json.games[i - 1].created_at).getTime();
            const curr = new Date(json.games[i].created_at).getTime();
            expect(prev).toBeGreaterThanOrEqual(curr);
          }

          // Property 9: Verify at most 20 items
          expect(json.games.length).toBeLessThanOrEqual(20);

          // Property 9: nextCursor correctness
          if (timestamps.length > 20) {
            expect(json.nextCursor).not.toBeNull();
          } else {
            expect(json.nextCursor).toBeNull();
          }
        }),
        { numRuns: 20 }
      );
    });
  });

  // =========================================================================
  // Property 10: Delete then retrieve yields not-found
  // Validates: Requirements 10.3
  // =========================================================================
  describe("Property 10: Delete then retrieve yields not-found", () => {
    it("after deleting a game, GET by id returns 404", async () => {
      const { POST } = await import("@/app/api/games/route");
      const { GET, DELETE } = await import("@/app/api/games/[id]/route");

      await fc.assert(
        fc.asyncProperty(saveGamePayloadArb, async (payload) => {
          // Reset store
          gamesStore = {};
          analysesStore = {};

          // Create a game
          const createReq = createPostRequest(payload);
          const createRes = await POST(createReq);
          const { game } = await createRes.json();
          expect(game).toBeDefined();

          const gameId = game.id;

          // Delete the game
          const deleteReq = createDeleteRequest(gameId);
          const deleteRes = await DELETE(deleteReq, { params: Promise.resolve({ id: gameId }) });
          const deleteJson = await deleteRes.json();
          expect(deleteJson.deleted).toBe(true);

          // Retrieve should return 404
          const getReq = createGetByIdRequest(gameId);
          const getRes = await GET(getReq, { params: Promise.resolve({ id: gameId }) });
          expect(getRes.status).toBe(404);
        }),
        { numRuns: 20 }
      );
    });
  });

  // =========================================================================
  // Property 11: Get game returns complete record
  // Validates: Requirements 10.2
  // =========================================================================
  describe("Property 11: Get game returns complete record", () => {
    it("GET by id returns full game with PGN, headers, and analysis data", async () => {
      const { POST } = await import("@/app/api/games/route");
      const { GET } = await import("@/app/api/games/[id]/route");

      const payloadWithAnalysisArb = fc.record({
        pgn: fc.string({ minLength: 1, maxLength: 500 }),
        headers: fc.record({
          white: fc.string({ minLength: 1, maxLength: 50 }),
          black: fc.string({ minLength: 1, maxLength: 50 }),
          result: fc.constantFrom("1-0", "0-1", "1/2-1/2"),
          date: fc.option(fc.date().map(d => d.toISOString().split("T")[0]), { nil: undefined }),
        }),
        classifiedMoves: fc.array(
          fc.record({
            san: fc.string({ minLength: 1, maxLength: 7 }),
            uci: fc.string({ minLength: 4, maxLength: 5 }),
            grade: fc.constantFrom("brilliant", "great", "best", "good", "inaccuracy", "mistake", "blunder"),
            winPercentLoss: fc.float({ min: 0, max: 100, noNaN: true }),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        whiteAccuracy: fc.float({ min: 0, max: 100, noNaN: true }),
        blackAccuracy: fc.float({ min: 0, max: 100, noNaN: true }),
        analysisDepth: fc.integer({ min: 1, max: 30 }),
      });

      await fc.assert(
        fc.asyncProperty(payloadWithAnalysisArb, async (payload) => {
          // Reset store
          gamesStore = {};
          analysesStore = {};

          // Create a game with analysis
          const createReq = createPostRequest(payload);
          const createRes = await POST(createReq);
          const { game } = await createRes.json();
          expect(game).toBeDefined();

          const gameId = game.id;

          // GET by id
          const getReq = createGetByIdRequest(gameId);
          const getRes = await GET(getReq, { params: Promise.resolve({ id: gameId }) });
          const getJson = await getRes.json();

          expect(getRes.status).toBe(200);
          expect(getJson.game).toBeDefined();

          // Verify all fields present
          expect(getJson.game.id).toBe(gameId);
          expect(getJson.game.pgn).toBe(payload.pgn);
          expect(getJson.game.headers).toEqual(payload.headers);

          // Verify analysis data is attached
          expect(getJson.game.game_analyses).toBeDefined();
          expect(getJson.game.game_analyses).not.toBeNull();
          expect(getJson.game.game_analyses.classified_moves).toEqual(payload.classifiedMoves);
          expect(getJson.game.game_analyses.white_accuracy).toBe(payload.whiteAccuracy);
          expect(getJson.game.game_analyses.black_accuracy).toBe(payload.blackAccuracy);
          expect(getJson.game.game_analyses.analysis_depth).toBe(payload.analysisDepth);
        }),
        { numRuns: 20 }
      );
    });
  });
});
