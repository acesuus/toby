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

// Module-level variable controlling which user is currently "authenticated"
let currentUserId: string = "user-a-default";

// In-memory profiles store simulating the DB (keyed by user ID)
let profilesStore: Record<
  string,
  {
    id: string;
    chess_com_username: string | null;
    lichess_username: string | null;
  }
>;

function buildMockSupabase() {
  return {
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: { id: currentUserId, email: `${currentUserId}@test.com` } },
      })),
    },
    from: (table: string) => {
      if (table === "profiles") {
        return buildProfilesTable();
      }
      return {};
    },
  };
}

function buildProfilesTable() {
  return {
    select: (_fields?: string) => {
      const ctx: any = { filters: {} };
      const chain: any = {
        eq: (col: string, val: string) => {
          ctx.filters[col] = val;
          return chain;
        },
        single: async () => {
          const profile = profilesStore[ctx.filters["id"]];
          if (!profile) return { data: null, error: { message: "Not found" } };
          return {
            data: {
              chess_com_username: profile.chess_com_username,
              lichess_username: profile.lichess_username,
            },
            error: null,
          };
        },
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
        then: undefined as any,
      };
      chain.then = (resolve: any, reject?: any) => {
        const promise = (async () => {
          const profile = profilesStore[ctx.filters["id"]];
          if (profile) {
            Object.assign(profile, record);
          }
          return { error: null };
        })();
        return promise.then(resolve, reject);
      };
      return chain;
    },
  };
}

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => buildMockSupabase()),
}));

// Mock fetchRecentGames to always succeed (we're testing isolation, not verification)
vi.mock("@/lib/fetcher", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/fetcher")>();
  return {
    ...actual,
    fetchRecentGames: vi.fn(async () => []),
  };
});

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

// Generate distinct user IDs (UUID-like strings)
const userIdArb = fc
  .stringMatching(/^[a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12}$/)
  .filter((s) => s.length > 0);

// Valid platform usernames (3-20 chars, alnum + underscore/hyphen)
const validUsernameArb = fc
  .array(
    fc.constantFrom(
      ..."abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-".split("")
    ),
    { minLength: 3, maxLength: 20 }
  )
  .map((arr) => arr.join(""));

const platformArb = fc.constantFrom<"chesscom" | "lichess">("chesscom", "lichess");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createGetRequest(): NextRequest {
  return new NextRequest("http://localhost:3000/api/account/platforms", {
    method: "GET",
  });
}

function createPutRequest(body: { platform: string; username: string }): NextRequest {
  return new NextRequest("http://localhost:3000/api/account/platforms", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function createDeleteRequest(body: { platform: string }): NextRequest {
  return new NextRequest("http://localhost:3000/api/account/platforms", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// Property 8: Data isolation between users
// Validates: Requirements 8.2
// ---------------------------------------------------------------------------

describe("Account Platforms API - Property 8: Data isolation between users", () => {
  beforeEach(() => {
    profilesStore = {};
  });

  it("GET for user A never returns user B's data, PUT/DELETE for user A never modifies user B's data", async () => {
    const { GET, PUT, DELETE } = await import("@/app/api/account/platforms/route");

    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        userIdArb,
        validUsernameArb,
        validUsernameArb,
        validUsernameArb,
        validUsernameArb,
        platformArb,
        validUsernameArb,
        async (
          userAId,
          userBId,
          usernameA_chess,
          usernameA_lichess,
          usernameB_chess,
          usernameB_lichess,
          putPlatform,
          putUsername
        ) => {
          // Pre-condition: user IDs must be distinct
          fc.pre(userAId !== userBId);
          // Pre-condition: users have different usernames so we can detect leaks
          fc.pre(usernameA_chess !== usernameB_chess);
          fc.pre(usernameA_lichess !== usernameB_lichess);

          // Setup: both users exist with their own stored usernames
          profilesStore = {
            [userAId]: {
              id: userAId,
              chess_com_username: usernameA_chess,
              lichess_username: usernameA_lichess,
            },
            [userBId]: {
              id: userBId,
              chess_com_username: usernameB_chess,
              lichess_username: usernameB_lichess,
            },
          };

          // --- Test 1: GET as user A returns only A's data ---
          currentUserId = userAId;
          const getResponse = await GET();
          const getData = await getResponse.json();

          expect(getResponse.status).toBe(200);
          expect(getData.chess_com_username).toBe(usernameA_chess);
          expect(getData.lichess_username).toBe(usernameA_lichess);
          // Must NOT contain user B's data
          expect(getData.chess_com_username).not.toBe(usernameB_chess);
          expect(getData.lichess_username).not.toBe(usernameB_lichess);

          // --- Test 2: PUT as user A only modifies A's data ---
          currentUserId = userAId;
          const putRequest = createPutRequest({
            platform: putPlatform,
            username: putUsername,
          });
          const putResponse = await PUT(putRequest);

          // Verify user B's data is unchanged after PUT
          expect(profilesStore[userBId].chess_com_username).toBe(usernameB_chess);
          expect(profilesStore[userBId].lichess_username).toBe(usernameB_lichess);

          // Verify user A's data was updated (only the targeted column)
          const columnKey =
            putPlatform === "chesscom" ? "chess_com_username" : "lichess_username";
          if (putResponse.status === 200) {
            expect(profilesStore[userAId][columnKey]).toBe(putUsername);
          }

          // --- Test 3: DELETE as user A only modifies A's data ---
          // Reset user A's data to ensure we have something to delete
          profilesStore[userAId] = {
            id: userAId,
            chess_com_username: usernameA_chess,
            lichess_username: usernameA_lichess,
          };

          currentUserId = userAId;
          const deleteRequest = createDeleteRequest({ platform: putPlatform });
          const deleteResponse = await DELETE(deleteRequest);

          expect(deleteResponse.status).toBe(200);

          // Verify user B's data is STILL unchanged after DELETE
          expect(profilesStore[userBId].chess_com_username).toBe(usernameB_chess);
          expect(profilesStore[userBId].lichess_username).toBe(usernameB_lichess);

          // Verify user A's targeted column is now null
          expect(profilesStore[userAId][columnKey]).toBeNull();

          // Verify user A's other column is untouched
          const otherColumnKey =
            putPlatform === "chesscom" ? "lichess_username" : "chess_com_username";
          expect(profilesStore[userAId][otherColumnKey]).toBe(
            putPlatform === "chesscom" ? usernameA_lichess : usernameA_chess
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});
