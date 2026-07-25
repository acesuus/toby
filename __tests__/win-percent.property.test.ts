import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { centipawnToWinPercent, evalToWinPercent } from "@/lib/win-percent";
import { EvalScore } from "@/lib/types";

describe("Win Percent Conversion — Property-Based Tests", () => {
  /**
   * Property 4: Win Percent Bounds
   * For any finite cp value, centipawnToWinPercent(cp) returns a value in [0, 100].
   *
   * **Validates: Requirements 7.1**
   */
  it("Property 4: Win Percent Bounds — result is always in [0, 100] for finite cp", () => {
    fc.assert(
      fc.property(
        fc.double({ min: -10000, max: 10000, noNaN: true, noDefaultInfinity: true }),
        (cp) => {
          const result = centipawnToWinPercent(cp);
          expect(result).toBeGreaterThanOrEqual(0);
          expect(result).toBeLessThanOrEqual(100);
        }
      ),
      { numRuns: 1000 }
    );
  });

  /**
   * Property 5: Win Percent Symmetry
   * For any EvalScore, evalToWinPercent(score, "white") + evalToWinPercent(score, "black") === 100
   *
   * **Validates: Requirements 7.6**
   */
  it("Property 5: Win Percent Symmetry — white + black perspective = 100", () => {
    const evalScoreArb: fc.Arbitrary<EvalScore> = fc.oneof(
      fc.double({ min: -10000, max: 10000, noNaN: true, noDefaultInfinity: true }).map(
        (v) => ({ type: "cp", value: v }) as EvalScore
      ),
      fc.integer({ min: -20, max: 20 })
        .filter((v) => v !== 0)
        .map((v) => ({ type: "mate", value: v }) as EvalScore)
    );

    fc.assert(
      fc.property(evalScoreArb, (score) => {
        const white = evalToWinPercent(score, "white");
        const black = evalToWinPercent(score, "black");
        expect(white + black).toBeCloseTo(100, 10);
      }),
      { numRuns: 1000 }
    );
  });

  /**
   * Property 6: Win Percent Monotonicity
   * For any two finite cp values where cp1 < cp2,
   * centipawnToWinPercent(cp1) < centipawnToWinPercent(cp2)
   *
   * We require a minimum separation of 1e-9 between cp1 and cp2 to avoid
   * subnormal floating-point pairs that cannot produce distinct sigmoid outputs
   * due to IEEE 754 precision limits. In practice, centipawn values are integers.
   *
   * **Validates: Requirements 7.3**
   */
  it("Property 6: Win Percent Monotonicity — cp1 < cp2 implies winPercent(cp1) < winPercent(cp2)", () => {
    fc.assert(
      fc.property(
        fc
          .tuple(
            fc.double({ min: -10000, max: 10000, noNaN: true, noDefaultInfinity: true }),
            fc.double({ min: -10000, max: 10000, noNaN: true, noDefaultInfinity: true })
          )
          .filter(([a, b]) => a < b && b - a > 1e-9),
        ([cp1, cp2]) => {
          const wp1 = centipawnToWinPercent(cp1);
          const wp2 = centipawnToWinPercent(cp2);
          expect(wp1).toBeLessThan(wp2);
        }
      ),
      { numRuns: 1000 }
    );
  });
});
