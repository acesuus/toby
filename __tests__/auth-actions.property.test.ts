import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fc from "fast-check";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

// Mock @/lib/supabase/server
const mockSignInWithPassword = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
    },
  })),
}));

import { validatePassword, signIn } from "@/lib/auth-actions";

describe("Auth Actions — Property-Based Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Property 1: Password validation rejects short passwords
   *
   * For any string with length less than 8 characters, validatePassword
   * SHALL reject the input and return an error specifying the minimum password length.
   *
   * **Validates: Requirements 1.4**
   */
  it("Property 1: rejects any password with length < 8", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 0, maxLength: 7 }), (shortPassword) => {
        const result = validatePassword(shortPassword);
        expect(result.valid).toBe(false);
        expect(result.error).toBe("Password must be at least 8 characters.");
      }),
      { numRuns: 500 }
    );
  });

  /**
   * Property 1 (complement): Password validation accepts passwords with length >= 8
   *
   * For any string with length >= 8, validatePassword SHALL accept the input
   * and return { valid: true } with no error.
   *
   * **Validates: Requirements 1.4**
   */
  it("Property 1 (complement): accepts any password with length >= 8", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 8, maxLength: 100 }), (validPassword) => {
        const result = validatePassword(validPassword);
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      }),
      { numRuns: 500 }
    );
  });

  /**
   * Property 2: Login errors are generic
   * For any invalid credential combination (wrong email, wrong password, or both),
   * the signIn function SHALL return the identical generic error message
   * "Invalid email or password." without distinguishing which field was incorrect
   * and without leaking the underlying Supabase error message.
   *
   * **Validates: Requirements 2.2**
   */
  it("Property 2: Login errors are generic — always returns identical message regardless of credentials or Supabase error", () => {
    fc.assert(
      fc.property(
        fc.emailAddress(),
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        async (email, password, supabaseErrorMessage) => {
          // Simulate Supabase returning a random error message for invalid credentials
          mockSignInWithPassword.mockResolvedValue({
            error: { message: supabaseErrorMessage },
          });

          const formData = new FormData();
          formData.set("email", email);
          formData.set("password", password);

          const result = await signIn(formData);

          // The error message must ALWAYS be the generic one
          expect(result.error).toBe("Invalid email or password.");

          // The Supabase error message must never leak through
          if (supabaseErrorMessage !== "Invalid email or password.") {
            expect(result.error).not.toBe(supabaseErrorMessage);
          }
        }
      ),
      { numRuns: 200 }
    );
  });
});
