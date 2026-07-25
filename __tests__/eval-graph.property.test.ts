import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { evalToPawns } from "@/lib/eval-graph-utils";
import type { EvalScore } from "@/lib/types";

describe("Eval Graph — Property-Based Tests", () => {
  /**
   * Property 12: Eval Graph Clamping
   * For any EvalScore (centipawn values from -100000 to +100000, and mate values),
   * evalToPawns returns a value in [-10, +10].
   *
   * **Validates: Requirements 11.1**
   */
  it("Property 12: Eval Graph Clamping — all plotted values are clamped to [-10, +10] pawns for any evaluation input", () => {
    const evalScoreArb: fc.Arbitrary<EvalScore> = fc.oneof(
      // Centipawn scores across the full range
      fc.integer({ min: -100000, max: 100000 }).map(
        (v) => ({ type: "cp", value: v }) as EvalScore
      ),
      // Mate scores (positive = white mates, negative = black mates)
      fc.integer({ min: -200, max: 200 })
        .filter((v) => v !== 0)
        .map((v) => ({ type: "mate", value: v }) as EvalScore)
    );

    fc.assert(
      fc.property(evalScoreArb, (score) => {
        const pawns = evalToPawns(score);
        expect(pawns).toBeGreaterThanOrEqual(-10);
        expect(pawns).toBeLessThanOrEqual(10);
      }),
      { numRuns: 1000 }
    );
  });
});
