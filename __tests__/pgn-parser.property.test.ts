import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { Chess } from "chess.js";
import { parsePGN } from "@/lib/pgn-parser";

describe("PGN Parser — Property-Based Tests", () => {
  /**
   * Property 9: Parse Roundtrip Legality
   * For any successfully parsed game, every move is legal from its fenBefore position.
   * Applying the SAN move to a fresh board set to fenBefore produces the fenAfter board.
   *
   * **Validates: Requirements 4.4**
   */
  it("Property 9: Parse Roundtrip Legality — every parsed move is legal from its fenBefore position", () => {
    // Generate a valid PGN by playing random legal moves using fast-check for determinism
    const validPgnArb = fc
      .integer({ min: 1, max: 40 })
      .chain((numMoves) =>
        fc
          .array(
            fc.double({ min: 0, max: 1, noNaN: true, noDefaultInfinity: true }),
            { minLength: numMoves, maxLength: numMoves }
          )
          .map((randoms) => {
            const chess = new Chess();
            for (const r of randoms) {
              const moves = chess.moves();
              if (moves.length === 0) break;
              const index = Math.floor(r * moves.length) % moves.length;
              chess.move(moves[index]);
            }
            // Build a PGN string with required headers
            const movesText = chess
              .history()
              .reduce((acc: string[], san, i) => {
                if (i % 2 === 0) {
                  acc.push(`${Math.floor(i / 2) + 1}. ${san}`);
                } else {
                  acc[acc.length - 1] += ` ${san}`;
                }
                return acc;
              }, [])
              .join(" ");

            const result = chess.isGameOver()
              ? chess.isCheckmate()
                ? chess.turn() === "w"
                  ? "0-1"
                  : "1-0"
                : "1/2-1/2"
              : "*";

            return `[White "Player1"]\n[Black "Player2"]\n[Result "${result}"]\n\n${movesText} ${result}`;
          })
      );

    fc.assert(
      fc.property(validPgnArb, (pgn) => {
        const parsed = parsePGN(pgn);

        // Verify each move is legal from its fenBefore position
        for (const move of parsed.moves) {
          const board = new Chess(move.fenBefore);

          // The SAN move must be legal from this position
          const legalMoves = board.moves();
          expect(legalMoves).toContain(move.san);

          // Applying the move should produce the fenAfter
          const result = board.move(move.san);
          expect(result).not.toBeNull();
          expect(board.fen()).toBe(move.fenAfter);
        }
      }),
      { numRuns: 200 }
    );
  });
});
