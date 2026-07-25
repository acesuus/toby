import { describe, test, expect } from "vitest";
import { classifyMove, classifyMoves } from "@/lib/classifier";
import { evalToWinPercent } from "@/lib/win-percent";
import { DEFAULT_THRESHOLDS } from "@/lib/types";
import type {
  EvalScore,
  ParsedMove,
  EngineEvaluation,
  ClassificationThresholds,
} from "@/lib/types";

/**
 * Unit tests for move classification logic.
 * Validates: Requirements 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8
 */

// Helper: compute the evalAfter cp value needed to produce a specific win% loss
// from the given color's perspective, given an evalBefore cp value.
function cpForWinPercentLoss(
  cpBefore: number,
  targetLoss: number,
  color: "white" | "black"
): number {
  const wpBefore = evalToWinPercent({ type: "cp", value: cpBefore }, color);
  const targetWpAfter = wpBefore - targetLoss;
  // Binary search for cp that gives targetWpAfter from same perspective.
  // For white: wp increases with cp, so if wp < target → lo = mid
  // For black: wp decreases with cp, so if wp > target → lo = mid
  let lo = -10000;
  let hi = 10000;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    const wp = evalToWinPercent({ type: "cp", value: mid }, color);
    if (color === "white") {
      if (wp < targetWpAfter) {
        lo = mid;
      } else {
        hi = mid;
      }
    } else {
      // For black: wp is inversely related to cp
      if (wp > targetWpAfter) {
        lo = mid;
      } else {
        hi = mid;
      }
    }
  }
  return Math.round((lo + hi) / 2);
}

describe("classifyMove", () => {
  const thresholds = DEFAULT_THRESHOLDS;
  const bookMoveLimit = 6;

  describe("book move classification", () => {
    test("move at index 0 (< bookMoveLimit=6) is classified as 'book'", () => {
      const evalBefore: EvalScore = { type: "cp", value: 0 };
      const evalAfter: EvalScore = { type: "cp", value: -500 };
      const grade = classifyMove(evalBefore, evalAfter, "white", 0, bookMoveLimit, thresholds);
      expect(grade).toBe("book");
    });

    test("move at index 3 (< bookMoveLimit=6) is classified as 'book'", () => {
      const evalBefore: EvalScore = { type: "cp", value: 100 };
      const evalAfter: EvalScore = { type: "cp", value: -200 };
      const grade = classifyMove(evalBefore, evalAfter, "white", 3, bookMoveLimit, thresholds);
      expect(grade).toBe("book");
    });

    test("move at index 5 (< bookMoveLimit=6) is classified as 'book'", () => {
      const evalBefore: EvalScore = { type: "cp", value: 50 };
      const evalAfter: EvalScore = { type: "cp", value: -1000 };
      const grade = classifyMove(evalBefore, evalAfter, "white", 5, bookMoveLimit, thresholds);
      expect(grade).toBe("book");
    });

    test("move at index 6 (== bookMoveLimit=6) is NOT classified as 'book'", () => {
      const evalBefore: EvalScore = { type: "cp", value: 0 };
      const evalAfter: EvalScore = { type: "cp", value: 0 };
      const grade = classifyMove(evalBefore, evalAfter, "white", 6, bookMoveLimit, thresholds);
      expect(grade).not.toBe("book");
    });
  });

  describe("best move classification", () => {
    test("move where wpAfter >= wpBefore - 0.1 is classified as 'best'", () => {
      // White's move: evalBefore cp=100, evalAfter cp=99 → loss < 0.1
      const evalBefore: EvalScore = { type: "cp", value: 100 };
      const evalAfter: EvalScore = { type: "cp", value: 99 };
      const grade = classifyMove(evalBefore, evalAfter, "white", 10, bookMoveLimit, thresholds);
      expect(grade).toBe("best");
    });

    test("move that improves position is classified as 'best'", () => {
      // If opponent blundered and now eval is better than before our move's eval
      const evalBefore: EvalScore = { type: "cp", value: 100 };
      const evalAfter: EvalScore = { type: "cp", value: 110 };
      const grade = classifyMove(evalBefore, evalAfter, "white", 10, bookMoveLimit, thresholds);
      expect(grade).toBe("best");
    });

    test("move with exactly wpBefore - 0.1 loss is classified as 'best'", () => {
      // Equal position: wpBefore = wpAfter = 50, so loss = 0
      const evalBefore: EvalScore = { type: "cp", value: 0 };
      const evalAfter: EvalScore = { type: "cp", value: 0 };
      const grade = classifyMove(evalBefore, evalAfter, "white", 10, bookMoveLimit, thresholds);
      expect(grade).toBe("best");
    });
  });

  describe("excellent classification (loss ≤ 0.5)", () => {
    test("move with win% loss ~0.3 is classified as 'excellent'", () => {
      const cpBefore = 200;
      const cpAfter = cpForWinPercentLoss(cpBefore, 0.3, "white");
      const evalBefore: EvalScore = { type: "cp", value: cpBefore };
      const evalAfter: EvalScore = { type: "cp", value: cpAfter };
      const grade = classifyMove(evalBefore, evalAfter, "white", 10, bookMoveLimit, thresholds);
      expect(grade).toBe("excellent");
    });

    test("move with win% loss at boundary 0.5 is classified as 'excellent'", () => {
      const cpBefore = 200;
      const cpAfter = cpForWinPercentLoss(cpBefore, 0.5, "white");
      const evalBefore: EvalScore = { type: "cp", value: cpBefore };
      const evalAfter: EvalScore = { type: "cp", value: cpAfter };
      const grade = classifyMove(evalBefore, evalAfter, "white", 10, bookMoveLimit, thresholds);
      expect(grade).toBe("excellent");
    });
  });

  describe("good classification (loss ≤ 2)", () => {
    test("move with win% loss ~1.5 is classified as 'good'", () => {
      const cpBefore = 200;
      const cpAfter = cpForWinPercentLoss(cpBefore, 1.5, "white");
      const evalBefore: EvalScore = { type: "cp", value: cpBefore };
      const evalAfter: EvalScore = { type: "cp", value: cpAfter };
      const grade = classifyMove(evalBefore, evalAfter, "white", 10, bookMoveLimit, thresholds);
      expect(grade).toBe("good");
    });

    test("move with win% loss at boundary 2 is classified as 'good'", () => {
      const cpBefore = 200;
      const cpAfter = cpForWinPercentLoss(cpBefore, 2, "white");
      const evalBefore: EvalScore = { type: "cp", value: cpBefore };
      const evalAfter: EvalScore = { type: "cp", value: cpAfter };
      const grade = classifyMove(evalBefore, evalAfter, "white", 10, bookMoveLimit, thresholds);
      expect(grade).toBe("good");
    });
  });

  describe("inaccuracy classification (loss ≤ 5)", () => {
    test("move with win% loss ~4 is classified as 'inaccuracy'", () => {
      const cpBefore = 200;
      const cpAfter = cpForWinPercentLoss(cpBefore, 4, "white");
      const evalBefore: EvalScore = { type: "cp", value: cpBefore };
      const evalAfter: EvalScore = { type: "cp", value: cpAfter };
      const grade = classifyMove(evalBefore, evalAfter, "white", 10, bookMoveLimit, thresholds);
      expect(grade).toBe("inaccuracy");
    });

    test("move with win% loss just below boundary 5 is classified as 'inaccuracy'", () => {
      const cpBefore = 200;
      const cpAfter = cpForWinPercentLoss(cpBefore, 4.9, "white");
      const evalBefore: EvalScore = { type: "cp", value: cpBefore };
      const evalAfter: EvalScore = { type: "cp", value: cpAfter };
      const grade = classifyMove(evalBefore, evalAfter, "white", 10, bookMoveLimit, thresholds);
      expect(grade).toBe("inaccuracy");
    });
  });

  describe("mistake classification (loss ≤ 10)", () => {
    test("move with win% loss ~8 is classified as 'mistake'", () => {
      const cpBefore = 200;
      const cpAfter = cpForWinPercentLoss(cpBefore, 8, "white");
      const evalBefore: EvalScore = { type: "cp", value: cpBefore };
      const evalAfter: EvalScore = { type: "cp", value: cpAfter };
      const grade = classifyMove(evalBefore, evalAfter, "white", 10, bookMoveLimit, thresholds);
      expect(grade).toBe("mistake");
    });

    test("move with win% loss just below boundary 10 is classified as 'mistake'", () => {
      const cpBefore = 200;
      const cpAfter = cpForWinPercentLoss(cpBefore, 9.9, "white");
      const evalBefore: EvalScore = { type: "cp", value: cpBefore };
      const evalAfter: EvalScore = { type: "cp", value: cpAfter };
      const grade = classifyMove(evalBefore, evalAfter, "white", 10, bookMoveLimit, thresholds);
      expect(grade).toBe("mistake");
    });
  });

  describe("blunder classification (loss > 10)", () => {
    test("move with win% loss ~15 is classified as 'blunder'", () => {
      const cpBefore = 200;
      const cpAfter = cpForWinPercentLoss(cpBefore, 15, "white");
      const evalBefore: EvalScore = { type: "cp", value: cpBefore };
      const evalAfter: EvalScore = { type: "cp", value: cpAfter };
      const grade = classifyMove(evalBefore, evalAfter, "white", 10, bookMoveLimit, thresholds);
      expect(grade).toBe("blunder");
    });

    test("move with win% loss ~25 is classified as 'blunder'", () => {
      const cpBefore = 200;
      const cpAfter = cpForWinPercentLoss(cpBefore, 25, "white");
      const evalBefore: EvalScore = { type: "cp", value: cpBefore };
      const evalAfter: EvalScore = { type: "cp", value: cpAfter };
      const grade = classifyMove(evalBefore, evalAfter, "white", 10, bookMoveLimit, thresholds);
      expect(grade).toBe("blunder");
    });
  });

  describe("black perspective", () => {
    test("black book move at index 1 is classified as 'book'", () => {
      const evalBefore: EvalScore = { type: "cp", value: 50 };
      const evalAfter: EvalScore = { type: "cp", value: 100 };
      const grade = classifyMove(evalBefore, evalAfter, "black", 1, bookMoveLimit, thresholds);
      expect(grade).toBe("book");
    });

    test("black best move (loss < 0.1 from black perspective)", () => {
      // From black's perspective: wpBefore = 100 - centipawnToWinPercent(-100) for cp=-100
      // evalBefore cp=-100 means black is ahead; from black perspective wp is high
      // evalAfter cp=-99: slightly worse for black but within 0.1
      const evalBefore: EvalScore = { type: "cp", value: -100 };
      const evalAfter: EvalScore = { type: "cp", value: -99 };
      const grade = classifyMove(evalBefore, evalAfter, "black", 10, bookMoveLimit, thresholds);
      expect(grade).toBe("best");
    });

    test("black blunder (large loss from black perspective)", () => {
      // evalBefore cp=-200 → black is winning. evalAfter cp=200 → white is winning.
      // From black perspective: wpBefore is high (~60+), wpAfter is low (~40-)
      // That's a huge loss > 10
      const evalBefore: EvalScore = { type: "cp", value: -200 };
      const evalAfter: EvalScore = { type: "cp", value: 200 };
      const grade = classifyMove(evalBefore, evalAfter, "black", 10, bookMoveLimit, thresholds);
      expect(grade).toBe("blunder");
    });

    test("black inaccuracy (moderate loss from black perspective)", () => {
      const cpBefore = -200; // Black is ahead
      const cpAfter = cpForWinPercentLoss(cpBefore, 3.5, "black");
      const evalBefore: EvalScore = { type: "cp", value: cpBefore };
      const evalAfter: EvalScore = { type: "cp", value: cpAfter };
      const grade = classifyMove(evalBefore, evalAfter, "black", 10, bookMoveLimit, thresholds);
      expect(grade).toBe("inaccuracy");
    });
  });
});

describe("classifyMoves (integration)", () => {
  test("classifies a small game with known evaluations", () => {
    // A 4-move game: 2 book moves (indices 0,1), then a best move, then a blunder
    const moves: ParsedMove[] = [
      { moveNumber: 1, color: "white", san: "e4", uci: "e2e4", fenBefore: "start", fenAfter: "fen1" },
      { moveNumber: 1, color: "black", san: "e5", uci: "e7e5", fenBefore: "fen1", fenAfter: "fen2" },
      { moveNumber: 2, color: "white", san: "Nf3", uci: "g1f3", fenBefore: "fen2", fenAfter: "fen3" },
      { moveNumber: 2, color: "black", san: "Nc6", uci: "b8c6", fenBefore: "fen3", fenAfter: "fen4" },
    ];

    // Evaluations: N+1 = 5 evaluations for 4 moves
    // Move 0 (white, index 0): book (index < 6)
    // Move 1 (black, index 1): book (index < 6)
    // Move 2 (white, index 2): book (index < 6)
    // Move 3 (black, index 3): book (index < 6)
    // All are book since bookMoveLimit defaults to 6
    const evaluations: EngineEvaluation[] = [
      { fen: "start", depth: 18, score: { type: "cp", value: 20 }, bestMove: "e2e4", pv: ["e2e4"], nodes: 1000, time: 100 },
      { fen: "fen1", depth: 18, score: { type: "cp", value: 15 }, bestMove: "e7e5", pv: ["e7e5"], nodes: 1000, time: 100 },
      { fen: "fen2", depth: 18, score: { type: "cp", value: 25 }, bestMove: "g1f3", pv: ["g1f3"], nodes: 1000, time: 100 },
      { fen: "fen3", depth: 18, score: { type: "cp", value: 20 }, bestMove: "b8c6", pv: ["b8c6"], nodes: 1000, time: 100 },
      { fen: "fen4", depth: 18, score: { type: "cp", value: 30 }, bestMove: "f1c4", pv: ["f1c4"], nodes: 1000, time: 100 },
    ];

    const result = classifyMoves(moves, evaluations);

    expect(result).toHaveLength(4);
    // All first 4 moves are book (default limit is 6)
    expect(result[0].grade).toBe("book");
    expect(result[1].grade).toBe("book");
    expect(result[2].grade).toBe("book");
    expect(result[3].grade).toBe("book");

    // Verify ClassifiedMove has all expected fields
    expect(result[0].evalBefore).toEqual({ type: "cp", value: 20 });
    expect(result[0].evalAfter).toEqual({ type: "cp", value: 15 });
    expect(result[0].bestMove).toBe("e2e4");
    expect(result[0].san).toBe("e4");
    expect(result[0].color).toBe("white");
    expect(typeof result[0].winPercentBefore).toBe("number");
    expect(typeof result[0].winPercentAfter).toBe("number");
    expect(typeof result[0].winPercentLoss).toBe("number");
  });

  test("classifies non-book moves correctly with custom book limit", () => {
    const moves: ParsedMove[] = [
      { moveNumber: 1, color: "white", san: "e4", uci: "e2e4", fenBefore: "start", fenAfter: "fen1" },
      { moveNumber: 1, color: "black", san: "e5", uci: "e7e5", fenBefore: "fen1", fenAfter: "fen2" },
      { moveNumber: 2, color: "white", san: "Qh5", uci: "d1h5", fenBefore: "fen2", fenAfter: "fen3" },
    ];

    // Use bookMoveLimit=1 so only move 0 is book
    // Move 1 (black, index 1): evalBefore cp=20, evalAfter cp=20 → best (no loss)
    // Move 2 (white, index 2): evalBefore cp=20, evalAfter cp=-500 → blunder (huge loss)
    const evaluations: EngineEvaluation[] = [
      { fen: "start", depth: 18, score: { type: "cp", value: 20 }, bestMove: "e2e4", pv: ["e2e4"], nodes: 1000, time: 100 },
      { fen: "fen1", depth: 18, score: { type: "cp", value: 20 }, bestMove: "e7e5", pv: ["e7e5"], nodes: 1000, time: 100 },
      { fen: "fen2", depth: 18, score: { type: "cp", value: 20 }, bestMove: "g1f3", pv: ["g1f3"], nodes: 1000, time: 100 },
      { fen: "fen3", depth: 18, score: { type: "cp", value: -500 }, bestMove: "e1g1", pv: ["e1g1"], nodes: 1000, time: 100 },
    ];

    const result = classifyMoves(moves, evaluations, DEFAULT_THRESHOLDS, 1);

    expect(result).toHaveLength(3);
    expect(result[0].grade).toBe("book"); // index 0 < bookMoveLimit=1
    expect(result[1].grade).toBe("best"); // black: wpBefore(cp=20, black)=~49.1, wpAfter(cp=20, black)=~49.1 → no loss
    expect(result[2].grade).toBe("blunder"); // white: wpBefore(cp=20, white)=~50.9, wpAfter(cp=-500, white)=~14 → loss ~37
  });
});
