import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { calculateSideAccuracy } from "@/lib/accuracy";
import type { ClassifiedMove, MoveGrade } from "@/lib/types";

// --- Arbitrary generators ---

/** Generate a ClassifiedMove with arbitrary grades and win percent values */
const classifiedMoveArb: fc.Arbitrary<ClassifiedMove> = fc.record({
  moveNumber: fc.integer({ min: 1, max: 50 }),
  color: fc.constantFrom("white" as const, "black" as const),
  san: fc.constant("e4"),
  uci: fc.constant("e2e4"),
  fenBefore: fc.constant("fen"),
  fenAfter: fc.constant("fen"),
  grade: fc.constantFrom(
    "book" as const,
    "best" as const,
    "excellent" as const,
    "good" as const,
    "inaccuracy" as const,
    "mistake" as const,
    "blunder" as const
  ),
  evalBefore: fc.constant({ type: "cp" as const, value: 0 }),
  evalAfter: fc.constant({ type: "cp" as const, value: 0 }),
  bestMove: fc.constant("e2e4"),
  winPercentBefore: fc.double({ min: 0, max: 100, noNaN: true }),
  winPercentAfter: fc.double({ min: 0, max: 100, noNaN: true }),
  winPercentLoss: fc.double({ min: 0, max: 50, noNaN: true }),
});

/** Generate an array of ClassifiedMoves all for one side (white) */
const whiteSideMovesArb: fc.Arbitrary<ClassifiedMove[]> = fc
  .array(classifiedMoveArb, { minLength: 1, maxLength: 30 })
  .map((moves) => moves.map((m) => ({ ...m, color: "white" as const })));

/** Generate an all-book-moves array for one side */
const allBookMovesArb: fc.Arbitrary<ClassifiedMove[]> = fc
  .array(classifiedMoveArb, { minLength: 1, maxLength: 20 })
  .map((moves) =>
    moves.map((m) => ({ ...m, color: "white" as const, grade: "book" as const }))
  );

describe("Accuracy Calculator — Property-Based Tests", () => {
  /**
   * Property 7: Accuracy Bounds
   * For any set of classified moves, the accuracy score for each side
   * is always in the range [0, 100], and returns 100 when no non-book moves exist.
   *
   * **Validates: Requirements 9.1, 9.2**
   */
  it("Property 7: Accuracy Bounds — accuracy is always in [0, 100]", () => {
    fc.assert(
      fc.property(whiteSideMovesArb, (moves) => {
        const result = calculateSideAccuracy(moves, "white");
        expect(result.accuracy).toBeGreaterThanOrEqual(0);
        expect(result.accuracy).toBeLessThanOrEqual(100);
      }),
      { numRuns: 500 }
    );
  });

  it("Property 7: Accuracy Bounds — returns 100 for all-book moves", () => {
    fc.assert(
      fc.property(allBookMovesArb, (moves) => {
        const result = calculateSideAccuracy(moves, "white");
        expect(result.accuracy).toBe(100);
      }),
      { numRuns: 200 }
    );
  });

  /**
   * Property 14: Grade Count Consistency
   * For any side in an analyzed game, the sum of all grade counts
   * (book + best + excellent + good + inaccuracy + mistake + blunder)
   * equals the total number of moves played by that side.
   *
   * **Validates: Requirements 9.5**
   */
  it("Property 14: Grade Count Consistency — sum of grade counts equals total moves for that side", () => {
    fc.assert(
      fc.property(
        fc.array(classifiedMoveArb, { minLength: 1, maxLength: 40 }),
        (moves) => {
          const whiteMoves = moves.filter((m) => m.color === "white");
          const blackMoves = moves.filter((m) => m.color === "black");

          if (whiteMoves.length > 0) {
            const whiteResult = calculateSideAccuracy(moves, "white");
            const whiteGradeSum = Object.values(whiteResult.classifications).reduce(
              (sum, count) => sum + count,
              0
            );
            expect(whiteGradeSum).toBe(whiteMoves.length);
          }

          if (blackMoves.length > 0) {
            const blackResult = calculateSideAccuracy(moves, "black");
            const blackGradeSum = Object.values(blackResult.classifications).reduce(
              (sum, count) => sum + count,
              0
            );
            expect(blackGradeSum).toBe(blackMoves.length);
          }
        }
      ),
      { numRuns: 500 }
    );
  });
});
