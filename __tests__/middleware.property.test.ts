import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fc from "fast-check";

/**
 * Property 4: Middleware route gating
 *
 * For any request to a protected route path and for any authentication state
 * (present or absent), the middleware SHALL redirect unauthenticated requests
 * to `/login?returnUrl=<path>` for page routes, return 401 JSON for API routes,
 * and allow authenticated requests to proceed unchanged. Public routes always
 * proceed regardless of auth state.
 *
 * **Validates: Requirements 6.1, 6.2**
 */

// ---------------------------------------------------------------------------
// Constants matching middleware.ts
// ---------------------------------------------------------------------------

const PUBLIC_ROUTES = ["/", "/login", "/signup", "/auth/callback", "/review"];
const PROTECTED_ROUTES = ["/library", "/account"];
const PROTECTED_API_PREFIXES = ["/api/games"];

// ---------------------------------------------------------------------------
// Mock setup
// ---------------------------------------------------------------------------

// Mock user object returned by supabase.auth.getUser()
const MOCK_USER = {
  id: "user-123",
  email: "test@example.com",
  app_metadata: {},
  user_metadata: { display_name: "Test User" },
  aud: "authenticated",
  created_at: "2024-01-01T00:00:00Z",
};

// Track what the mock returns
let mockGetUserResult: { data: { user: typeof MOCK_USER | null } };

// Mock @/lib/supabase/middleware
vi.mock("@/lib/supabase/middleware", () => ({
  createMiddlewareClient: () => ({
    auth: {
      getUser: () => Promise.resolve(mockGetUserResult),
    },
  }),
}));

// ---------------------------------------------------------------------------
// Minimal NextRequest / NextResponse mocks for next/server
// ---------------------------------------------------------------------------

class MockURL {
  pathname: string;
  searchParams: URLSearchParams;
  href: string;

  constructor(path: string, base?: string) {
    this.pathname = path;
    this.searchParams = new URLSearchParams();
    const resolvedBase = base ?? "http://localhost:3000";
    this.href = `${resolvedBase}${path}`;
  }

  toString() {
    const qs = this.searchParams.toString();
    return qs ? `${this.href}?${qs}` : this.href;
  }
}

class MockNextRequest {
  nextUrl: MockURL;
  url: string;
  cookies: { getAll: () => never[] };

  constructor(pathname: string) {
    this.nextUrl = new MockURL(pathname);
    this.url = `http://localhost:3000${pathname}`;
    this.cookies = { getAll: () => [] };
  }
}

// Track response types
type MockResponseType = "next" | "redirect" | "json";

interface MockResponseInfo {
  type: MockResponseType;
  status?: number;
  redirectUrl?: string;
  body?: unknown;
}

let lastResponse: MockResponseInfo;

vi.mock("next/server", () => ({
  NextRequest: MockNextRequest,
  NextResponse: {
    next: ({ request }: { request: unknown }) => {
      const res = {
        type: "next" as const,
        request,
        cookies: { set: vi.fn() },
      };
      lastResponse = { type: "next" };
      return res;
    },
    redirect: (url: MockURL | { toString(): string }) => {
      const redirectUrl = url.toString();
      lastResponse = { type: "redirect", redirectUrl };
      return { type: "redirect", redirectUrl };
    },
    json: (body: unknown, opts?: { status?: number }) => {
      lastResponse = { type: "json", body, status: opts?.status };
      return { type: "json", body, status: opts?.status };
    },
  },
}));

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** Generates a random protected page path (optionally with a sub-path) */
const protectedPagePathArb = fc.tuple(
  fc.constantFrom(...PROTECTED_ROUTES),
  fc.constantFrom("", "/settings", "/edit", "/details")
).map(([base, suffix]) => `${base}${suffix}`);

/** Generates a random protected API path (with required sub-path) */
const protectedApiPathArb = fc.tuple(
  fc.constantFrom(...PROTECTED_API_PREFIXES),
  fc.constantFrom("", "/123", "/abc-def", "/save")
).map(([base, suffix]) => `${base}${suffix}`);

/** Generates a random public route path */
const publicRoutePathArb = fc.constantFrom(...PUBLIC_ROUTES);

/** Generates a boolean auth state: true = authenticated, false = unauthenticated */
const authStateArb = fc.boolean();

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Property 4: Middleware route gating", () => {
  beforeEach(() => {
    lastResponse = { type: "next" };
  });

  it("unauthenticated requests to protected page routes get redirected to /login?returnUrl=<path>", async () => {
    const { middleware } = await import("@/middleware");

    await fc.assert(
      fc.asyncProperty(protectedPagePathArb, async (path) => {
        // Set unauthenticated state
        mockGetUserResult = { data: { user: null } };

        const request = new MockNextRequest(path) as unknown as Parameters<typeof middleware>[0];
        await middleware(request);

        expect(lastResponse.type).toBe("redirect");
        expect(lastResponse.redirectUrl).toContain("/login");
        expect(lastResponse.redirectUrl).toContain(`returnUrl=${encodeURIComponent(path)}`);
      }),
      { numRuns: 50 }
    );
  });

  it("unauthenticated requests to protected API routes get a 401 JSON response", async () => {
    const { middleware } = await import("@/middleware");

    await fc.assert(
      fc.asyncProperty(protectedApiPathArb, async (path) => {
        // Set unauthenticated state
        mockGetUserResult = { data: { user: null } };

        const request = new MockNextRequest(path) as unknown as Parameters<typeof middleware>[0];
        await middleware(request);

        expect(lastResponse.type).toBe("json");
        expect(lastResponse.status).toBe(401);
        expect(lastResponse.body).toEqual({ error: "Unauthorized" });
      }),
      { numRuns: 50 }
    );
  });

  it("authenticated requests to protected routes proceed normally", async () => {
    const { middleware } = await import("@/middleware");

    const protectedPathArb = fc.oneof(protectedPagePathArb, protectedApiPathArb);

    await fc.assert(
      fc.asyncProperty(protectedPathArb, async (path) => {
        // Set authenticated state
        mockGetUserResult = { data: { user: MOCK_USER } };

        const request = new MockNextRequest(path) as unknown as Parameters<typeof middleware>[0];
        await middleware(request);

        expect(lastResponse.type).toBe("next");
      }),
      { numRuns: 50 }
    );
  });

  it("public routes always proceed regardless of auth state", async () => {
    const { middleware } = await import("@/middleware");

    await fc.assert(
      fc.asyncProperty(publicRoutePathArb, authStateArb, async (path, isAuthenticated) => {
        // Set auth state based on generated boolean
        mockGetUserResult = { data: { user: isAuthenticated ? MOCK_USER : null } };

        const request = new MockNextRequest(path) as unknown as Parameters<typeof middleware>[0];
        await middleware(request);

        expect(lastResponse.type).toBe("next");
      }),
      { numRuns: 50 }
    );
  });
});
