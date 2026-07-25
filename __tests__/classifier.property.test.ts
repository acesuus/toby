import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { classifyMoves, classifyMove } from "@/lib/classifier";
import { evalToWinPercent } from "@/lib/win-percent";
import { DEFAULT_THRESHOLDS } from "@/lib/types";
import type {
  ParsedMove,
  EngineEvaluation,
  EvalScore,
  MoveGrade,
} from "@/lib/types";

/**
 * Grade ordering from best (0) to worst (5). "book" is excluded from
 * monotone-threshold comparison because it is assigned by move index, not loss.
 */
const GRADE_ORDER: Record<MoveGrade, number> = {
  brilliant: -2,
  book: -1,
  best: 0,
  excellent: 1,
  good: 2,
  inaccuracy: 3,
  mistake: 4,
  blunder: 5,
};

const VALID_GRADES: MoveGrade[] = [
  "brilliant",
  "book",
  "best",
  "excellent",
  "good",
  "inaccuracy",
  "mistake",
  "blunder",
];

// --- Arbitrary generators ---

/** Generate an EvalScore (centipawn or mate) */
const evalScoreArb: fc.Arbitrary<EvalScore> = fc.oneof(
  fc
    .double({ min: -5000, max: 5000, noNaN: true, noDefaultInfinity: true })
    .map((v) => ({ type: "cp", value: v }) as EvalScore),
  fc
    .integer({ min: -20, max: 20 })
    .filter((v) => v !== 0)
    .map((v) => ({ type: "mate", value: v }) as EvalScore)
);

/** Generate a minimal ParsedMove (only fields needed by classifier) */
const parsedMoveArb = (index: number): fc.Arbitrary<ParsedMove> =>
  fc.record({
    moveNumber: fc.constant(Math.floor(index / 2) + 1),
    color: fc.constant(index % 2 === 0 ? "white" : "black") as fc.Arbitrary<
      "white" | "black"
    >,
    san: fc.constant("e4"),
    uci: fc.constant("e2e4"),
    fenBefore: fc.constant(
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
    ),
    fenAfter: fc.constant(
      "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1"
    ),
  });

/** Generate an EngineEvaluation with a given score */
const engineEvalArb = (score: EvalScore): fc.Arbitrary<EngineEvaluation> =>
  fc.constant({
    fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    depth: 18,
    score,
    bestMove: "e2e4",
    pv: ["e2e4"],
    nodes: 100000,
    time: 500,
  });

describe("Move Classification — Property-Based Tests", () => {
  /**
   * Property 2: Classification Totality
   * For any move in an analyzed game, the Move Classifier SHALL assign exactly
   * one grade from the set {book, best, excellent, good, inaccuracy, mistake, blunder}.
   *
   * **Validates: Requirements 8.1**
   */
  it("Property 2: Classification Totality — every move gets exactly one valid grade", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }).chain((numMoves) => {
          // Generate numMoves moves and numMoves+1 evaluations
          const movesArb = fc.tuple(
            ...Array.from({ length: numMoves }, (_, i) => parsedMoveArb(i))
          );
          const evalsArb = fc.tuple(
            ...Array.from({ length: numMoves + 1 }, () => evalScoreArb)
          );
          return fc.tuple(movesArb, evalsArb);
        }),
        ([moves, evalScores]) => {
          const parsedMoves: ParsedMove[] = moves;
          const evaluations: EngineEvaluation[] = evalScores.map((score) => ({
            fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
            depth: 18,
            score,
            bestMove: "e2e4",
            pv: ["e2e4"],
            nodes: 100000,
            time: 500,
          }));

          const result = classifyMoves(parsedMoves, evaluations);

          // Every move gets exactly one grade
          expect(result).toHaveLength(parsedMoves.length);
          for (const classified of result) {
            expect(VALID_GRADES).toContain(classified.grade);
          }
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * Property 3: Monotone Thresholds
   * For any two non-book moves of the same color, if move A has a smaller
   * winPercentLoss than move B, then A's grade is equal to or better than B's grade.
   *
   * We test this by calling classifyMove directly with the same evalBefore but
   * different evalAfter values, computing the actual win% losses, and verifying
   * that the grade ordering is monotone with respect to loss magnitude.
   *
   * **Validates: Requirements 8.9, 8.4, 8.5, 8.6, 8.7, 8.8**
   */
  it("Property 3: Monotone Thresholds — smaller winPercentLoss implies equal or better grade", () => {
    fc.assert(
      fc.property(
        fc.record({
          // Centipawn value for the position before the move
          cpBefore: fc.integer({ min: -3000, max: 3000 }),
          // Two different centipawn values for after the move
          cpAfterA: fc.integer({ min: -3000, max: 3000 }),
          cpAfterB: fc.integer({ min: -3000, max: 3000 }),
          color: fc.constantFrom("white" as const, "black" as const),
        }),
        ({ cpBefore, cpAfterA, cpAfterB, color }) => {
          const evalBefore: EvalScore = { type: "cp", value: cpBefore };
          const evalAfterA: EvalScore = { type: "cp", value: cpAfterA };
          const evalAfterB: EvalScore = { type: "cp", value: cpAfterB };

          // Compute actual win% losses from the moving side's perspective
          const wpBefore = evalToWinPercent(evalBefore, color);
          const wpAfterPlayedA = evalToWinPercent(evalAfterA, color);
          const wpAfterPlayedB = evalToWinPercent(evalAfterB, color);
          const lossA = wpBefore - wpAfterPlayedA;
          const lossB = wpBefore - wpAfterPlayedB;

          // Only test when lossA < lossB with meaningful separation
          // and both are non-negative (positive loss = move made things worse)
          if (lossA >= lossB - 0.001 || lossA < 0 || lossB < 0) return;

          const moveIndex = 10; // well past book limit of 6
          const bookMoveLimit = 6;

          const gradeA = classifyMove(
            evalBefore,
            evalAfterA,
            color,
            moveIndex,
            bookMoveLimit,
            DEFAULT_THRESHOLDS
          );
          const gradeB = classifyMove(
            evalBefore,
            evalAfterB,
            color,
            moveIndex,
            bookMoveLimit,
            DEFAULT_THRESHOLDS
          );

          // A has smaller loss, so A's grade should be equal or better (lower ordinal)
          expect(GRADE_ORDER[gradeA]).toBeLessThanOrEqual(
            GRADE_ORDER[gradeB]
          );
        }
      ),
      { numRuns: 500 }
    );
  });
});
