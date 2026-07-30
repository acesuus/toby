/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import * as fc from "fast-check";
import type { GameListItem } from "@/lib/types";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

// Mock @/lib/fetcher
vi.mock("@/lib/fetcher", () => ({
  fetchRecentGames: vi.fn(),
}));

import { RecentGamesSection } from "@/components/account/RecentGamesSection";
import { fetchRecentGames } from "@/lib/fetcher";

const mockedFetchRecentGames = vi.mocked(fetchRecentGames);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

/**
 * Arbitrary for generating a date string in YYYY-MM-DD format.
 */
const dateStringArb = fc
  .integer({ min: 2020, max: 2025 })
  .chain((year) =>
    fc.integer({ min: 1, max: 12 }).chain((month) =>
      fc.integer({ min: 1, max: 28 }).map((day) => {
        const m = String(month).padStart(2, "0");
        const d = String(day).padStart(2, "0");
        return `${year}-${m}-${d}`;
      })
    )
  );

/**
 * Arbitrary for generating a valid GameListItem with random but non-empty fields.
 */
const gameListItemArb: fc.Arbitrary<GameListItem> = fc.record({
  id: fc.uuid(),
  white: fc.stringMatching(/^[a-zA-Z0-9_]{3,15}$/),
  black: fc.stringMatching(/^[a-zA-Z0-9_]{3,15}$/),
  result: fc.constantFrom("1-0", "0-1", "½-½"),
  timeControl: fc.constantFrom("300+0", "600+5", "180+2", "900+10", "60+0"),
  date: dateStringArb,
  pgn: fc.constant("[Event \"Game\"]\n1. e4 e5 *"),
});

describe("RecentGamesSection — Property-Based Tests", () => {
  /**
   * Property 5: Recent games display capped at 10
   *
   * For any list of N games returned from a platform API (where N >= 0),
   * the recent games section SHALL display exactly `min(N, 10)` game items.
   *
   * **Validates: Requirements 5.1**
   */
  it("Property 5: Recent games display capped at 10 — renders min(N, 10) items", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(gameListItemArb, { minLength: 0, maxLength: 50 }),
        async (games) => {
          mockedFetchRecentGames.mockResolvedValue(games);

          const { unmount } = render(
            <RecentGamesSection
              usernames={{ chess_com_username: "testuser", lichess_username: null }}
            />
          );

          const expectedCount = Math.min(games.length, 10);

          if (expectedCount === 0) {
            await waitFor(() => {
              expect(screen.getByText("No recent games found.")).toBeInTheDocument();
            });
            const section = screen.getByTestId("recent-games-section");
            const buttons = section.querySelectorAll("button");
            expect(buttons.length).toBe(0);
          } else {
            await waitFor(() => {
              const section = screen.getByTestId("recent-games-section");
              const listItems = section.querySelectorAll("li");
              expect(listItems.length).toBe(expectedCount);
            });

            const section = screen.getByTestId("recent-games-section");
            const listItems = section.querySelectorAll("li");
            expect(listItems.length).toBe(expectedCount);
          }

          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 6: Game item displays required fields
   *
   * For any GameListItem object with non-empty white, black, result, timeControl,
   * and date fields, rendering that game item SHALL produce output containing all
   * five values.
   *
   * **Validates: Requirements 5.2**
   */
  it("Property 6: Game item displays required fields — all five fields are visible in rendered output", async () => {
    await fc.assert(
      fc.asyncProperty(gameListItemArb, async (game) => {
        mockedFetchRecentGames.mockResolvedValue([game]);

        const { unmount } = render(
          <RecentGamesSection
            usernames={{ chess_com_username: "testuser", lichess_username: null }}
          />
        );

        // Wait for loading to finish and game data to appear
        await waitFor(() => {
          const section = screen.getByTestId("recent-games-section");
          const listItems = section.querySelectorAll("li");
          expect(listItems.length).toBe(1);
        });

        // Verify all five required fields are present in the rendered output
        const section = screen.getByTestId("recent-games-section");
        const content = section.textContent ?? "";

        expect(content).toContain(game.white);
        expect(content).toContain(game.black);
        expect(content).toContain(game.result);
        expect(content).toContain(game.timeControl);
        expect(content).toContain(game.date);

        unmount();
        mockedFetchRecentGames.mockReset();
      }),
      { numRuns: 100 }
    );
  });
});
