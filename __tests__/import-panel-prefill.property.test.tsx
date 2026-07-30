/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import * as fc from "fast-check";

// Mutable mock state that can be changed per test iteration
let mockImportMethod: string = "chesscom";
let mockUsernames = {
  chess_com_username: null as string | null,
  lichess_username: null as string | null,
};

const mockDispatch = vi.fn();

// Mock @/lib/game-review-context
vi.mock("@/lib/game-review-context", () => ({
  useGameReview: () => ({
    state: { get importMethod() { return mockImportMethod; } },
    dispatch: (...args: unknown[]) => mockDispatch(...args),
  }),
}));

// Mock @/lib/use-platform-usernames
vi.mock("@/lib/use-platform-usernames", () => ({
  usePlatformUsernames: () => ({
    usernames: mockUsernames,
    loading: false,
    refetch: vi.fn(),
  }),
}));

// Mock @/lib/fetcher
vi.mock("@/lib/fetcher", () => ({
  validateUsername: () => null,
  fetchRecentGames: vi.fn().mockResolvedValue([]),
}));

// Mock @/lib/pgn-parser
vi.mock("@/lib/pgn-parser", () => ({
  MAX_PGN_LENGTH: 50000,
  parsePGN: vi.fn(),
}));

import { ImportPanel } from "@/components/ImportPanel";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

beforeEach(() => {
  mockImportMethod = "chesscom";
  mockUsernames = { chess_com_username: null, lichess_username: null };
});

/**
 * Arbitrary for generating valid platform usernames.
 * Chess.com and Lichess usernames: 3-20 chars, alphanumeric + underscore/hyphen.
 */
const validUsernameArb = fc.stringMatching(/^[a-zA-Z0-9_-]{3,20}$/);

describe("ImportPanel Pre-fill — Property-Based Tests", () => {
  /**
   * Property 7: Import panel pre-fills stored username for connected platform
   *
   * For any platform that has a stored username, when the corresponding import
   * tab is selected, the username input field SHALL be initialized with the
   * stored username value.
   *
   * **Validates: Requirements 7.1, 7.2**
   */
  it("Property 7: Chess.com tab pre-fills stored username", () => {
    fc.assert(
      fc.property(validUsernameArb, (username) => {
        // Set mock state for this iteration
        mockImportMethod = "chesscom";
        mockUsernames = {
          chess_com_username: username,
          lichess_username: null,
        };

        const { unmount } = render(<ImportPanel />);

        const input = screen.getByLabelText(/Chess\.com username/i) as HTMLInputElement;
        expect(input.value).toBe(username);

        unmount();
      }),
      { numRuns: 100 }
    );
  });

  it("Property 7: Lichess tab pre-fills stored username", () => {
    fc.assert(
      fc.property(validUsernameArb, (username) => {
        // Set mock state for this iteration
        mockImportMethod = "lichess";
        mockUsernames = {
          chess_com_username: null,
          lichess_username: username,
        };

        const { unmount } = render(<ImportPanel />);

        const input = screen.getByLabelText(/Lichess username/i) as HTMLInputElement;
        expect(input.value).toBe(username);

        unmount();
      }),
      { numRuns: 100 }
    );
  });
});
