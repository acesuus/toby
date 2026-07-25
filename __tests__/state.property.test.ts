import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { gameReviewReducer, initialState } from "@/lib/game-review-context";
import type { ParsedGame, ParsedMove, GameReviewState } from "@/lib/types";

/**
 * Helper: create a minimal ParsedGame with a given number of moves.
 */
function makeParsedGame(moveCount: number): ParsedGame {
  const moves: ParsedMove[] = Array.from({ length: moveCount }, (_, i) => ({
    moveNumber: Math.floor(i / 2) + 1,
    color: i % 2 === 0 ? "white" : "black",
    san: "e4",
    uci: "e2e4",
    fenBefore: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    fenAfter: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
  }));

  return {
    headers: { white: "White", black: "Black", result: "1-0" },
    moves,
    startingFen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  };
}

describe("State Management — Property-Based Tests", () => {
  /**
   * Property 8: Move Index Integrity
   * For any sequence of navigateToMove actions with arbitrary payloads (positive,
   * negative, very large values), currentMoveIndex always remains within
   * [-1, moves.length - 1].
   *
   * **Validates: Requirements 12.1**
   */
  it("Property 8: Move Index Integrity — currentMoveIndex always within [-1, moves.length - 1]", () => {
    fc.assert(
      fc.property(
        // Generate a move count between 1 and 100
        fc.integer({ min: 1, max: 100 }),
        // Generate an array of arbitrary navigation payloads
        fc.array(fc.integer({ min: -1000, max: 1000 }), { minLength: 1, maxLength: 50 }),
        (moveCount, navigationPayloads) => {
          // Set up state with a parsed game
          const parsedGame = makeParsedGame(moveCount);
          let state: GameReviewState = gameReviewReducer(initialState, {
            type: "setParsedGame",
            payload: parsedGame,
          });

          // Apply each navigation action and verify bounds after each
          for (const payload of navigationPayloads) {
            state = gameReviewReducer(state, {
              type: "navigateToMove",
              payload,
            });

            expect(state.currentMoveIndex).toBeGreaterThanOrEqual(-1);
            expect(state.currentMoveIndex).toBeLessThanOrEqual(moveCount - 1);
          }
        }
      ),
      { numRuns: 1000 }
    );
  });

  /**
   * Property 13: Depth Validation Bounds
   * For any user-provided depth value, the application accepts it only if it is
   * an integer in the range [10, 25]. Rejected values leave the state unchanged.
   *
   * **Validates: Requirements 13.1, 13.3**
   */
  it("Property 13: Depth Validation Bounds — only integers in [10, 25] are accepted", () => {
    fc.assert(
      fc.property(
        fc.double({ min: -1000, max: 1000, noNaN: true, noDefaultInfinity: true }),
        (depthValue) => {
          const previousDepth = initialState.analysisDepth;
          const state = gameReviewReducer(initialState, {
            type: "setDepth",
            payload: depthValue,
          });

          const isValidDepth =
            Number.isInteger(depthValue) && depthValue >= 10 && depthValue <= 25;

          if (isValidDepth) {
            // Valid depths are accepted
            expect(state.analysisDepth).toBe(depthValue);
          } else {
            // Invalid depths are rejected — state unchanged
            expect(state.analysisDepth).toBe(previousDepth);
          }
        }
      ),
      { numRuns: 1000 }
    );
  });
});
