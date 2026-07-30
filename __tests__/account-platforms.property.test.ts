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
  email: "player@example.com",
};

// In-memory profiles store simulating the DB
let profilesStore: Record<string, any>;

// Track whether update was called
let updateCalled: boolean;

function buildMockSupabase() {
  return {
    auth: {
      getUser: vi.fn(async () => ({ data: { user: MOCK_USER } })),
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
          return { data: { ...profile }, error: null };
        },
      };
      return chain;
    },
    update: (record: any) => {
      updateCalled = true;
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

// Partially mock @/lib/fetcher: keep real validateUsername, mock fetchRecentGames
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

const platformArb = fc.constantFrom<"chesscom" | "lichess">("chesscom", "lichess");

// Characters valid for platform usernames
const validCharArb = fc.constantFrom(
  ..."abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-".split("")
);

// Invalid special characters that should be rejected
const invalidCharArb = fc.constantFrom(
  ..."!@#$%^&*() ./\\+={}[]|<>?~`".split("")
);

// Generates strings that are INVALID for Chess.com (not matching /^[a-zA-Z0-9_-]{3,25}$/)
const invalidChesscomUsernameArb = fc.oneof(
  // Too short (1-2 chars from valid set)
  fc.array(validCharArb, { minLength: 1, maxLength: 2 }).map((arr) => arr.join("")),
  // Too long (26+ chars from valid set)
  fc.array(validCharArb, { minLength: 26, maxLength: 40 }).map((arr) => arr.join("")),
  // Contains invalid characters (with valid length range)
  fc.tuple(
    fc.array(validCharArb, { minLength: 1, maxLength: 10 }).map((a) => a.join("")),
    invalidCharArb,
    fc.array(validCharArb, { minLength: 1, maxLength: 10 }).map((a) => a.join(""))
  ).map(([pre, special, post]) => pre + special + post),
  // Empty string
  fc.constant("")
);

// Generates strings that are INVALID for Lichess (not matching /^[a-zA-Z0-9_-]{2,20}$/)
const invalidLichessUsernameArb = fc.oneof(
  // Too short (1 char from valid set)
  fc.array(validCharArb, { minLength: 1, maxLength: 1 }).map((arr) => arr.join("")),
  // Too long (21+ chars from valid set)
  fc.array(validCharArb, { minLength: 21, maxLength: 40 }).map((arr) => arr.join("")),
  // Contains invalid characters (with valid length range)
  fc.tuple(
    fc.array(validCharArb, { minLength: 1, maxLength: 8 }).map((a) => a.join("")),
    invalidCharArb,
    fc.array(validCharArb, { minLength: 1, maxLength: 8 }).map((a) => a.join(""))
  ).map(([pre, special, post]) => pre + special + post),
  // Empty string
  fc.constant("")
);

// ---------------------------------------------------------------------------
// Helper: create mock NextRequest for PUT
// ---------------------------------------------------------------------------

function createPutRequest(body: { platform: string; username: string }): NextRequest {
  return new NextRequest("http://localhost:3000/api/account/platforms", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Account Platforms API Property Tests", () => {
  beforeEach(() => {
    profilesStore = {
      [MOCK_USER.id]: {
        id: MOCK_USER.id,
        chess_com_username: "existing_user",
        lichess_username: "existing_lichess",
      },
    };
    updateCalled = false;
  });

  // =========================================================================
  // Property 1: Username format validation gate
  // Validates: Requirements 1.2, 1.4
  // =========================================================================
  describe("Property 1: Username format validation gate", () => {
    it("for any string where validateUsername returns non-null, PUT returns 400 and DB is unchanged", async () => {
      const { PUT } = await import("@/app/api/account/platforms/route");
      const { validateUsername } = await import("@/lib/fetcher");

      await fc.assert(
        fc.asyncProperty(
          platformArb,
          fc.oneof(
            // Platform-specific invalid username generators
            invalidChesscomUsernameArb,
            invalidLichessUsernameArb,
            // Completely random strings (many will be invalid)
            fc.string({ minLength: 0, maxLength: 50 })
          ),
          async (platform, username) => {
            // Pre-condition: only test cases where validateUsername returns non-null
            const validationResult = validateUsername(platform, username);
            fc.pre(validationResult !== null);

            // Reset state before each iteration
            profilesStore[MOCK_USER.id] = {
              id: MOCK_USER.id,
              chess_com_username: "existing_user",
              lichess_username: "existing_lichess",
            };
            updateCalled = false;

            const request = createPutRequest({ platform, username });
            const response = await PUT(request);
            const json = await response.json();

            // The API must reject with 400
            expect(response.status).toBe(400);
            expect(json.error).toBeDefined();
            expect(typeof json.error).toBe("string");

            // The database must NOT have been updated
            expect(updateCalled).toBe(false);
            expect(profilesStore[MOCK_USER.id].chess_com_username).toBe("existing_user");
            expect(profilesStore[MOCK_USER.id].lichess_username).toBe("existing_lichess");
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
