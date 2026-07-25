import { describe, it, expect, vi } from "vitest";
import * as fc from "fast-check";

// Mock the Supabase client module since auth-context.tsx imports it
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      signOut: vi.fn().mockResolvedValue({}),
    },
  }),
}));

import { mapUser } from "@/lib/auth-context";

// --- Arbitrary generators ---

/** Generate a random UUID-like string */
const uuidArb = fc.uuid();

/** Generate a random email string */
const emailArb = fc.emailAddress();

/** Generate a random Supabase User-like object */
const supabaseUserArb = fc.record({
  id: uuidArb,
  email: fc.option(emailArb, { nil: undefined }),
  user_metadata: fc.record({
    display_name: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
    avatar_url: fc.option(fc.webUrl(), { nil: undefined }),
  }),
  // Required fields to satisfy User type shape (minimal stubs)
  app_metadata: fc.constant({}),
  aud: fc.constant("authenticated"),
  created_at: fc.constant("2024-01-01T00:00:00Z"),
});

describe("Auth Context — Property-Based Tests", () => {
  /**
   * Property 3: User mapping preserves all fields
   *
   * For any valid Supabase User object containing id, email, and user_metadata
   * (with display_name and avatar_url), the mapUser transformation SHALL produce
   * an AuthUser object where id, email, displayName, and avatarUrl are correctly
   * mapped from the source fields.
   *
   * **Validates: Requirements 5.1**
   */
  it("Property 3: mapUser(null) always returns null", () => {
    fc.assert(
      fc.property(fc.constant(null), (input) => {
        expect(mapUser(input)).toBeNull();
      }),
      { numRuns: 10 }
    );
  });

  it("Property 3: mapUser preserves id field", () => {
    fc.assert(
      fc.property(supabaseUserArb, (user) => {
        const result = mapUser(user as any);
        expect(result).not.toBeNull();
        expect(result!.id).toBe(user.id);
      }),
      { numRuns: 500 }
    );
  });

  it("Property 3: mapUser maps email with fallback to empty string", () => {
    fc.assert(
      fc.property(supabaseUserArb, (user) => {
        const result = mapUser(user as any);
        expect(result).not.toBeNull();
        expect(result!.email).toBe(user.email ?? "");
      }),
      { numRuns: 500 }
    );
  });

  it("Property 3: mapUser maps displayName from user_metadata.display_name", () => {
    fc.assert(
      fc.property(supabaseUserArb, (user) => {
        const result = mapUser(user as any);
        expect(result).not.toBeNull();
        expect(result!.displayName).toBe(user.user_metadata?.display_name ?? null);
      }),
      { numRuns: 500 }
    );
  });

  it("Property 3: mapUser maps avatarUrl from user_metadata.avatar_url", () => {
    fc.assert(
      fc.property(supabaseUserArb, (user) => {
        const result = mapUser(user as any);
        expect(result).not.toBeNull();
        expect(result!.avatarUrl).toBe(user.user_metadata?.avatar_url ?? null);
      }),
      { numRuns: 500 }
    );
  });
});
