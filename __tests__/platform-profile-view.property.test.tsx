/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import * as fc from "fast-check";
import { PlatformProfileView } from "@/components/account/PlatformProfileView";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

/**
 * Helper: build the Chess.com API response shape from ratings.
 */
function buildChessComResponse(ratings: { timeControl: string; rating: number }[]) {
  const response: Record<string, { last: { rating: number }; record: { win: number; loss: number; draw: number } }> = {};
  for (const r of ratings) {
    const key = `chess_${r.timeControl.toLowerCase()}`;
    response[key] = { last: { rating: r.rating }, record: { win: 10, loss: 5, draw: 3 } };
  }
  return response;
}

/**
 * Helper: build the Lichess API response shape from ratings.
 */
function buildLichessResponse(ratings: { timeControl: string; rating: number }[]) {
  const perfs: Record<string, { rating: number; games: number }> = {};
  for (const r of ratings) {
    perfs[r.timeControl.toLowerCase()] = { rating: r.rating, games: 18 };
  }
  const totalGames = ratings.length * 18;
  return { perfs, count: { all: totalGames, win: 10, loss: 5, draw: 3 } };
}

describe("PlatformProfileView — Property-Based Tests", () => {
  /**
   * Property 4: Profile view displays all required fields
   *
   * For any valid PlatformProfile object containing a username and a non-empty
   * array of ratings, rendering the PlatformProfileView component SHALL produce
   * output containing the username string and every rating's time control label
   * and numeric value.
   *
   * **Validates: Requirements 4.2**
   */
  it("Property 4: Profile view displays all required fields — username and all ratings are visible", async () => {
    // The component only supports Blitz, Rapid, Bullet time controls
    const timeControls = ["Blitz", "Rapid", "Bullet"] as const;

    const platformArb = fc.constantFrom("chesscom" as const, "lichess" as const);

    const usernameArb = fc.stringMatching(/^[a-zA-Z0-9_]{3,20}$/);

    // Generate a non-empty subset of time controls with random ratings
    const ratingsArb = fc
      .subarray([...timeControls], { minLength: 1, maxLength: 3 })
      .chain((controls) =>
        fc.tuple(
          ...controls.map((tc) =>
            fc.integer({ min: 100, max: 3500 }).map((rating) => ({
              timeControl: tc,
              rating,
            }))
          )
        )
      );

    await fc.assert(
      fc.asyncProperty(platformArb, usernameArb, ratingsArb, async (platform, username, ratings) => {
        // Build the appropriate mock response
        const responseBody =
          platform === "chesscom"
            ? buildChessComResponse(ratings)
            : buildLichessResponse(ratings);

        // Mock global fetch to return the profile data
        const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
          new Response(JSON.stringify(responseBody), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        );

        const { unmount } = render(
          <PlatformProfileView platform={platform} username={username} />
        );

        // Wait for loading state to resolve — skeleton uses aria-busy="true"
        await waitFor(() => {
          expect(screen.queryByLabelText("Loading profile")).not.toBeInTheDocument();
        });

        // Verify username is displayed directly (ProfileCard renders username as plain text)
        expect(screen.getByText(username)).toBeInTheDocument();

        // Verify each rating is displayed via RatingBadge aria-label
        for (const r of ratings) {
          expect(
            screen.getByLabelText(`${r.timeControl} rating: ${r.rating}`)
          ).toBeInTheDocument();
        }

        unmount();
        fetchMock.mockRestore();
      }),
      { numRuns: 100 }
    );
  });
});
