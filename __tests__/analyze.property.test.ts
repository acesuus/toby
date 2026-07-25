import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { analyzeGame, AnalysisEngine } from "@/lib/stockfish/analyze";
import type { ParsedGame, ParsedMove, EngineEvaluation } from "@/lib/types";

/**
 * Mock AnalysisEngine that immediately returns a dummy EngineEvaluation.
 */
const mockEngine: AnalysisEngine = {
  evaluate: async (fen, depth) => ({
    fen,
    depth,
    score: { type: "cp", value: 0 },
    bestMove: "e2e4",
    pv: ["e2e4"],
    nodes: 1000,
    time: 100,
  }),
};

/**
 * Helper: create a ParsedGame with N moves using dummy FENs.
 */
function createMockParsedGame(numMoves: number): ParsedGame {
  const moves: ParsedMove[] = Array.from({ length: numMoves }, (_, i) => ({
    moveNumber: Math.floor(i / 2) + 1,
    color: i % 2 === 0 ? "white" : "black",
    san: "e4",
    uci: "e2e4",
    fenBefore: `fen-before-${i}`,
    fenAfter: `fen-after-${i}`,
  }));

  return {
    headers: {
      white: "Player1",
      black: "Player2",
      result: "1-0",
    },
    moves,
    startingFen: "startpos-fen",
  };
}

describe("Analysis Pipeline — Property-Based Tests", () => {
  /**
   * Property 1: Evaluation Coverage
   * For any game with N moves, the analysis pipeline produces exactly N+1 evaluations
   * (one per position including the starting position).
   *
   * **Validates: Requirements 6.1**
   */
  it("Property 1: Evaluation Coverage — for N moves, produces exactly N+1 evaluations", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 50 }),
        async (numMoves) => {
          const game = createMockParsedGame(numMoves);
          const evaluations = await analyzeGame(
            game,
            mockEngine,
            18,
            () => {}
          );
          expect(evaluations).toHaveLength(numMoves + 1);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 10: Progress Monotonicity
   * For any game being analyzed, the sequence of values reported by the onProgress
   * callback is strictly monotonically increasing from approximately 0 to 1.
   *
   * **Validates: Requirements 6.4**
   */
  it("Property 10: Progress Monotonicity — progress values are strictly increasing from ~0 to 1", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 50 }),
        async (numMoves) => {
          const game = createMockParsedGame(numMoves);
          const progressValues: number[] = [];

          await analyzeGame(game, mockEngine, 18, (progress) => {
            progressValues.push(progress);
          });

          // All progress values must be > 0 and <= 1
          for (const value of progressValues) {
            expect(value).toBeGreaterThan(0);
            expect(value).toBeLessThanOrEqual(1);
          }

          // The sequence must be strictly increasing
          for (let i = 1; i < progressValues.length; i++) {
            expect(progressValues[i]).toBeGreaterThan(progressValues[i - 1]);
          }

          // The last value must be exactly 1
          expect(progressValues[progressValues.length - 1]).toBe(1);
        }
      ),
      { numRuns: 100 }
    );
  });
});
