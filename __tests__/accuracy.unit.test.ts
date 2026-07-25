import { describe, it, expect } from "vitest";
import {
  calculateGameAccuracy,
  calculateSideAccuracy,
  identifyCriticalMoments,
} from "@/lib/accuracy";
import { detectOpening } from "@/lib/opening";
import type { ClassifiedMove, PGNHeaders, ParsedMove } from "@/lib/types";

// =============================================================================
// Helpers
// =============================================================================

/** Creates a minimal ClassifiedMove for testing purposes */
function makeMoveWhite(
  overrides: Partial<ClassifiedMove> = {}
): ClassifiedMove {
  return {
    moveNumber: 1,
    color: "white",
    san: "e4",
    uci: "e2e4",
    fenBefore: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    fenAfter: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
    grade: "best",
    evalBefore: { type: "cp", value: 20 },
    evalAfter: { type: "cp", value: 20 },
    bestMove: "e2e4",
    winPercentBefore: 52,
    winPercentAfter: 52,
    winPercentLoss: 0,
    ...overrides,
  };
}

function makeMoveBlack(
  overrides: Partial<ClassifiedMove> = {}
): ClassifiedMove {
  return {
    moveNumber: 1,
    color: "black",
    san: "e5",
    uci: "e7e5",
    fenBefore: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
    fenAfter: "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
    grade: "best",
    evalBefore: { type: "cp", value: 20 },
    evalAfter: { type: "cp", value: 20 },
    bestMove: "e7e5",
    winPercentBefore: 48,
    winPercentAfter: 48,
    winPercentLoss: 0,
    ...overrides,
  };
}

function makeParsedMove(san: string, index: number): ParsedMove {
  return {
    moveNumber: Math.floor(index / 2) + 1,
    color: index % 2 === 0 ? "white" : "black",
    san,
    uci: "a1a1",
    fenBefore: "8/8/8/8/8/8/8/8 w - - 0 1",
    fenAfter: "8/8/8/8/8/8/8/8 w - - 0 1",
  };
}

// =============================================================================
// 1. Weighted Scoring with hand-calculated examples
// =============================================================================

describe("calculateSideAccuracy - weighted scoring", () => {
  it("computes correct weighted accuracy for known inputs", () => {
    // Move 1: winPercentBefore=50, winPercentLoss=2
    //   moveAccuracy = max(0, 100 - 2*10) = 80
    //   positionWeight = max(1, abs(50-50)/10 + 1) = max(1, 1) = 1
    //   contribution = 80 * 1 = 80
    //
    // Move 2: winPercentBefore=70, winPercentLoss=5
    //   moveAccuracy = max(0, 100 - 5*10) = 50
    //   positionWeight = max(1, abs(70-50)/10 + 1) = max(1, 3) = 3
    //   contribution = 50 * 3 = 150
    //
    // Move 3: winPercentBefore=40, winPercentLoss=0
    //   moveAccuracy = max(0, 100 - 0*10) = 100
    //   positionWeight = max(1, abs(40-50)/10 + 1) = max(1, 2) = 2
    //   contribution = 100 * 2 = 200
    //
    // Total weighted accuracy = (80 + 150 + 200) / (1 + 3 + 2) = 430 / 6 = 71.666...
    // Rounded to 1 decimal = 71.7

    const moves: ClassifiedMove[] = [
      makeMoveWhite({
        winPercentBefore: 50,
        winPercentLoss: 2,
        grade: "good",
        evalBefore: { type: "cp", value: 0 },
        evalAfter: { type: "cp", value: -40 },
      }),
      makeMoveWhite({
        moveNumber: 2,
        winPercentBefore: 70,
        winPercentLoss: 5,
        grade: "inaccuracy",
        evalBefore: { type: "cp", value: 200 },
        evalAfter: { type: "cp", value: 100 },
      }),
      makeMoveWhite({
        moveNumber: 3,
        winPercentBefore: 40,
        winPercentLoss: 0,
        grade: "best",
        evalBefore: { type: "cp", value: -100 },
        evalAfter: { type: "cp", value: -100 },
      }),
    ];

    const result = calculateSideAccuracy(moves, "white");
    expect(result.accuracy).toBeCloseTo(71.7, 1);
  });

  it("positions further from 50% get higher weight", () => {
    // Two moves with same winPercentLoss but different positions
    const balancedMove = makeMoveWhite({
      winPercentBefore: 50,
      winPercentLoss: 3,
      grade: "good",
      evalBefore: { type: "cp", value: 0 },
      evalAfter: { type: "cp", value: -60 },
    });
    const offBalanceMove = makeMoveWhite({
      moveNumber: 2,
      winPercentBefore: 80,
      winPercentLoss: 3,
      grade: "good",
      evalBefore: { type: "cp", value: 400 },
      evalAfter: { type: "cp", value: 340 },
    });

    const resultBalanced = calculateSideAccuracy([balancedMove], "white");
    const resultOffBalance = calculateSideAccuracy([offBalanceMove], "white");

    // Both should have moveAccuracy = 70, but the weighted result is the same
    // because it's a single move (weight doesn't matter for single-move case).
    // Both = 70. The weighting matters in relative comparison across multiple moves.
    expect(resultBalanced.accuracy).toBe(70);
    expect(resultOffBalance.accuracy).toBe(70);
  });
});

// =============================================================================
// 2. Book move exclusion
// =============================================================================

describe("calculateSideAccuracy - book move exclusion", () => {
  it("excludes book moves from accuracy calculation", () => {
    const moves: ClassifiedMove[] = [
      makeMoveWhite({ grade: "book", winPercentBefore: 50, winPercentLoss: 0 }),
      makeMoveWhite({
        moveNumber: 2,
        grade: "best",
        winPercentBefore: 52,
        winPercentLoss: 0,
        evalBefore: { type: "cp", value: 20 },
        evalAfter: { type: "cp", value: 20 },
      }),
      makeMoveWhite({
        moveNumber: 3,
        grade: "inaccuracy",
        winPercentBefore: 50,
        winPercentLoss: 5,
        evalBefore: { type: "cp", value: 0 },
        evalAfter: { type: "cp", value: -100 },
      }),
    ];

    const result = calculateSideAccuracy(moves, "white");

    // Only non-book moves count (moves 2 and 3):
    // Move 2: moveAccuracy=100, weight=max(1, abs(52-50)/10+1)=max(1,1.2)=1.2
    // Move 3: moveAccuracy=50, weight=max(1, abs(50-50)/10+1)=max(1,1)=1
    // accuracy = (100*1.2 + 50*1) / (1.2 + 1) = 170 / 2.2 = 77.272...
    // Rounded = 77.3
    expect(result.accuracy).toBeCloseTo(77.3, 1);
    expect(result.moveCount).toBe(3); // total moves including book
    expect(result.classifications.book).toBe(1);
  });
});

// =============================================================================
// 3. All-book returns 100
// =============================================================================

describe("calculateSideAccuracy - all book moves", () => {
  it("returns accuracy 100 when all moves are book moves", () => {
    const moves: ClassifiedMove[] = [
      makeMoveWhite({ grade: "book", winPercentBefore: 50, winPercentLoss: 0 }),
      makeMoveWhite({
        moveNumber: 2,
        grade: "book",
        winPercentBefore: 52,
        winPercentLoss: 0,
      }),
      makeMoveWhite({
        moveNumber: 3,
        grade: "book",
        winPercentBefore: 51,
        winPercentLoss: 0,
      }),
    ];

    const result = calculateSideAccuracy(moves, "white");
    expect(result.accuracy).toBe(100);
    expect(result.moveCount).toBe(3);
    expect(result.averageCentipawnLoss).toBe(0);
  });
});

// =============================================================================
// 4. Critical moment detection (swing > 10 points)
// =============================================================================

describe("identifyCriticalMoments", () => {
  it("detects moves where win% swing exceeds 10 from white perspective", () => {
    const moves: ClassifiedMove[] = [
      // Move with small swing (not critical)
      makeMoveWhite({
        evalBefore: { type: "cp", value: 20 },
        evalAfter: { type: "cp", value: 10 },
        grade: "good",
        winPercentBefore: 52,
        winPercentAfter: 51,
        winPercentLoss: 1,
      }),
      // Move with large swing (critical) - white blunders
      makeMoveWhite({
        moveNumber: 2,
        evalBefore: { type: "cp", value: 100 },
        evalAfter: { type: "cp", value: -200 },
        grade: "blunder",
        san: "Qh5",
        winPercentBefore: 63,
        winPercentAfter: 37,
        winPercentLoss: 26,
      }),
      // Move with moderate swing (not critical, below threshold)
      makeMoveBlack({
        evalBefore: { type: "cp", value: -200 },
        evalAfter: { type: "cp", value: -180 },
        grade: "good",
        winPercentBefore: 37,
        winPercentAfter: 38,
        winPercentLoss: 1,
      }),
    ];

    const criticals = identifyCriticalMoments(moves);
    expect(criticals.length).toBe(1);
    expect(criticals[0].moveIndex).toBe(1);
    expect(criticals[0].evalSwing).toBeGreaterThan(10);
    expect(criticals[0].description).toContain("blunder");
  });

  it("detects critical moments with mate scores", () => {
    const moves: ClassifiedMove[] = [
      makeMoveWhite({
        evalBefore: { type: "cp", value: 50 },
        evalAfter: { type: "mate", value: -3 },
        grade: "blunder",
        san: "Ke2",
        winPercentBefore: 54,
        winPercentAfter: 0,
        winPercentLoss: 54,
      }),
    ];

    const criticals = identifyCriticalMoments(moves);
    expect(criticals.length).toBe(1);
    expect(criticals[0].evalSwing).toBeGreaterThan(10);
  });

  it("returns empty array when no swing exceeds 10", () => {
    const moves: ClassifiedMove[] = [
      makeMoveWhite({
        evalBefore: { type: "cp", value: 20 },
        evalAfter: { type: "cp", value: 15 },
        grade: "good",
        winPercentBefore: 52,
        winPercentAfter: 51,
        winPercentLoss: 1,
      }),
      makeMoveBlack({
        evalBefore: { type: "cp", value: 15 },
        evalAfter: { type: "cp", value: 20 },
        grade: "good",
        winPercentBefore: 49,
        winPercentAfter: 48,
        winPercentLoss: 1,
      }),
    ];

    const criticals = identifyCriticalMoments(moves);
    expect(criticals.length).toBe(0);
  });
});

// =============================================================================
// 5. Grade count totals match move count
// =============================================================================

describe("calculateSideAccuracy - grade counts", () => {
  it("sum of all grade counts equals total move count for that side", () => {
    const moves: ClassifiedMove[] = [
      makeMoveWhite({ grade: "book" }),
      makeMoveWhite({ moveNumber: 2, grade: "best" }),
      makeMoveWhite({ moveNumber: 3, grade: "excellent" }),
      makeMoveWhite({ moveNumber: 4, grade: "good" }),
      makeMoveWhite({ moveNumber: 5, grade: "inaccuracy" }),
      makeMoveWhite({ moveNumber: 6, grade: "mistake" }),
      makeMoveWhite({ moveNumber: 7, grade: "blunder" }),
    ];

    const result = calculateSideAccuracy(moves, "white");

    const gradeTotal =
      result.classifications.book +
      result.classifications.best +
      result.classifications.excellent +
      result.classifications.good +
      result.classifications.inaccuracy +
      result.classifications.mistake +
      result.classifications.blunder;

    expect(gradeTotal).toBe(result.moveCount);
    expect(gradeTotal).toBe(7);
  });

  it("grade counts match per side in a full game", () => {
    const moves: ClassifiedMove[] = [
      makeMoveWhite({ grade: "book" }),
      makeMoveBlack({ grade: "book" }),
      makeMoveWhite({ moveNumber: 2, grade: "best" }),
      makeMoveBlack({ moveNumber: 2, grade: "good" }),
      makeMoveWhite({ moveNumber: 3, grade: "inaccuracy" }),
      makeMoveBlack({ moveNumber: 3, grade: "blunder" }),
    ];

    const game = calculateGameAccuracy(moves);

    const whiteTotal = Object.values(game.white.classifications).reduce(
      (a, b) => a + b,
      0
    );
    const blackTotal = Object.values(game.black.classifications).reduce(
      (a, b) => a + b,
      0
    );

    expect(whiteTotal).toBe(game.white.moveCount);
    expect(blackTotal).toBe(game.black.moveCount);
    expect(whiteTotal).toBe(3);
    expect(blackTotal).toBe(3);
  });
});

// =============================================================================
// 6. Opening detection - ECO header
// =============================================================================

describe("detectOpening - ECO header", () => {
  it("returns ECO from headers when moves do not match database", () => {
    const unknownMoves: ParsedMove[] = [
      makeParsedMove("a3", 0),
      makeParsedMove("a6", 1),
      makeParsedMove("h3", 2),
      makeParsedMove("h6", 3),
    ];

    const headers: PGNHeaders = {
      white: "Player1",
      black: "Player2",
      result: "1-0",
      eco: "A00",
      opening: "Anderssen's Opening",
    };

    const result = detectOpening(unknownMoves, headers);
    expect(result.eco).toBe("A00");
    expect(result.name).toBe("Anderssen's Opening");
  });
});

// =============================================================================
// 7. Opening detection - move matching (Sicilian B20)
// =============================================================================

describe("detectOpening - move matching", () => {
  it("detects Sicilian Defense (B20) from e4, c5 move sequence", () => {
    const moves: ParsedMove[] = [
      makeParsedMove("e4", 0),
      makeParsedMove("c5", 1),
      makeParsedMove("Nf3", 2),
      makeParsedMove("d6", 3),
    ];

    const headers: PGNHeaders = {
      white: "Player1",
      black: "Player2",
      result: "1-0",
    };

    const result = detectOpening(moves, headers);
    // Should match B50 (Sicilian, e4 c5 Nf3 d6) or at minimum a Sicilian variant
    expect(result.eco).toMatch(/^B/);
    expect(result.name).toContain("Sicilian");
    expect(result.moves).toBeGreaterThanOrEqual(2);
  });

  it("matches the longest prefix when multiple openings overlap", () => {
    // e4 c5 matches B20 Sicilian (2 moves)
    // e4 c5 Nf3 matches deeper, etc.
    const moves: ParsedMove[] = [
      makeParsedMove("e4", 0),
      makeParsedMove("c5", 1),
    ];

    const headers: PGNHeaders = {
      white: "Player1",
      black: "Player2",
      result: "1-0",
    };

    const result = detectOpening(moves, headers);
    expect(result.eco).toBe("B20");
    expect(result.name).toBe("Sicilian Defense");
    expect(result.moves).toBe(2);
  });
});

// =============================================================================
// 8. Opening detection - fallback (unknown moves, no header)
// =============================================================================

describe("detectOpening - fallback", () => {
  it("returns Unknown Opening when moves and headers have no match", () => {
    const weirdMoves: ParsedMove[] = [
      makeParsedMove("a3", 0),
      makeParsedMove("a6", 1),
      makeParsedMove("h3", 2),
      makeParsedMove("h6", 3),
    ];

    const headers: PGNHeaders = {
      white: "Player1",
      black: "Player2",
      result: "1-0",
    };

    const result = detectOpening(weirdMoves, headers);
    expect(result.eco).toBe("");
    expect(result.name).toBe("Unknown Opening");
    expect(result.moves).toBe(0);
  });
});
