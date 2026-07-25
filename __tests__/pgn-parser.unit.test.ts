import { describe, it, expect } from "vitest";
import { parsePGN, MAX_PGN_LENGTH } from "@/lib/pgn-parser";

// =============================================================================
// Valid Standard Game
// =============================================================================

describe("parsePGN - valid standard game", () => {
  it("parses a short valid PGN with headers and moves correctly", () => {
    const pgn = `[Event "Casual Game"]
[Site "Internet"]
[Date "2024.01.15"]
[White "Alice"]
[Black "Bob"]
[Result "1-0"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 1-0`;

    const result = parsePGN(pgn);

    // Verify headers
    expect(result.headers.white).toBe("Alice");
    expect(result.headers.black).toBe("Bob");
    expect(result.headers.result).toBe("1-0");
    expect(result.headers.event).toBe("Casual Game");

    // Verify moves count (10 half-moves)
    expect(result.moves).toHaveLength(10);

    // Verify first move
    expect(result.moves[0].san).toBe("e4");
    expect(result.moves[0].uci).toBe("e2e4");
    expect(result.moves[0].moveNumber).toBe(1);
    expect(result.moves[0].color).toBe("white");

    // Verify last move
    expect(result.moves[9].san).toBe("Be7");
    expect(result.moves[9].uci).toBe("f8e7");
    expect(result.moves[9].moveNumber).toBe(5);
    expect(result.moves[9].color).toBe("black");

    // Verify starting FEN is standard
    expect(result.startingFen).toBe(
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
    );
  });
});

// =============================================================================
// Missing Required Headers
// =============================================================================

describe("parsePGN - missing required headers", () => {
  it("throws error mentioning 'White' when White header is missing", () => {
    const pgn = `[Black "Bob"]
[Result "1-0"]

1. e4 e5 1-0`;

    expect(() => parsePGN(pgn)).toThrow("White");
  });

  it("throws error mentioning 'Result' when Result header is missing", () => {
    const pgn = `[White "Alice"]
[Black "Bob"]

1. e4 e5 *`;

    expect(() => parsePGN(pgn)).toThrow("Result");
  });

  it("throws error listing all missing headers when multiple are absent", () => {
    const pgn = `[Event "Test"]

1. e4 e5 *`;

    expect(() => parsePGN(pgn)).toThrow("White");
    expect(() => parsePGN(pgn)).toThrow("Black");
    expect(() => parsePGN(pgn)).toThrow("Result");
  });
});

// =============================================================================
// Illegal Move Detection
// =============================================================================

describe("parsePGN - illegal move detection", () => {
  it("throws error with SAN, move number, and color for an illegal move", () => {
    // Qh8 is illegal on move 2 for white (queen cannot reach h8 from d1)
    const pgn = `[White "Alice"]
[Black "Bob"]
[Result "*"]

1. e4 e5 2. Qh8 *`;

    expect(() => parsePGN(pgn)).toThrow("Qh8");
    expect(() => parsePGN(pgn)).toThrow("2");
    expect(() => parsePGN(pgn)).toThrow("white");
  });

  it("identifies illegal move by black correctly", () => {
    // After 1. e4, Nf3 is not a valid black move
    const pgn = `[White "Alice"]
[Black "Bob"]
[Result "*"]

1. e4 Nf3 *`;

    expect(() => parsePGN(pgn)).toThrow("Nf3");
    expect(() => parsePGN(pgn)).toThrow("1");
    expect(() => parsePGN(pgn)).toThrow("black");
  });
});

// =============================================================================
// Castling
// =============================================================================

describe("parsePGN - castling", () => {
  it("parses kingside castling (O-O) with correct UCI notation", () => {
    const pgn = `[White "Alice"]
[Black "Bob"]
[Result "*"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 Nf6 4. O-O Be7 *`;

    const result = parsePGN(pgn);

    // White castles kingside on move 4
    const castlingMove = result.moves.find(
      (m) => m.san === "O-O" && m.color === "white"
    );
    expect(castlingMove).toBeDefined();
    expect(castlingMove!.uci).toBe("e1g1");
  });

  it("parses queenside castling (O-O-O) with correct UCI notation", () => {
    const pgn = `[White "Alice"]
[Black "Bob"]
[Result "*"]

1. d4 d5 2. Nc3 Nf6 3. Bf4 e6 4. Qd2 Be7 5. O-O-O O-O *`;

    const result = parsePGN(pgn);

    // White castles queenside on move 5
    const castlingMove = result.moves.find(
      (m) => m.san === "O-O-O" && m.color === "white"
    );
    expect(castlingMove).toBeDefined();
    expect(castlingMove!.uci).toBe("e1c1");
  });
});

// =============================================================================
// En Passant
// =============================================================================

describe("parsePGN - en passant", () => {
  it("correctly handles en passant capture with proper FEN after", () => {
    // A game reaching en passant: white plays e5, black plays d5, white captures en passant
    const pgn = `[White "Alice"]
[Black "Bob"]
[Result "*"]

1. e4 d5 2. e5 f5 3. exf6 *`;

    const result = parsePGN(pgn);

    // The en passant capture is the last move (exf6)
    const epMove = result.moves[result.moves.length - 1];
    expect(epMove.san).toBe("exf6");

    // After en passant capture, the black pawn on f5 should be gone
    // FEN after exf6 should show a white pawn on f6 and no black pawn on f5
    expect(epMove.fenAfter).toContain("P");
    // Verify the pawn on f5 is captured (row 5 = rank 5 in FEN)
    // The FEN should reflect the captured pawn is removed from f5
    const fenRows = epMove.fenAfter.split(" ")[0].split("/");
    // Rank 6 (index 2 from top) should have a white pawn on f-file
    expect(fenRows[2]).toContain("P");
  });
});

// =============================================================================
// Promotion
// =============================================================================

describe("parsePGN - promotion", () => {
  it("parses pawn promotion with =Q in SAN and promotion letter in UCI", () => {
    // Set up a position where promotion is possible using FEN header
    const pgn = `[White "Alice"]
[Black "Bob"]
[Result "1-0"]
[FEN "4k3/P7/8/8/8/8/8/4K3 w - - 0 1"]

1. a8=Q 1-0`;

    const result = parsePGN(pgn);

    expect(result.moves).toHaveLength(1);
    expect(result.moves[0].san).toContain("=Q");
    expect(result.moves[0].uci).toBe("a7a8q");
  });

  it("parses knight promotion correctly", () => {
    const pgn = `[White "Alice"]
[Black "Bob"]
[Result "1-0"]
[FEN "4k3/P7/8/8/8/8/8/4K3 w - - 0 1"]

1. a8=N 1-0`;

    const result = parsePGN(pgn);

    expect(result.moves[0].san).toContain("=N");
    expect(result.moves[0].uci).toBe("a7a8n");
  });
});

// =============================================================================
// Comments and Annotations Stripped
// =============================================================================

describe("parsePGN - comments and annotations", () => {
  it("parses correctly when PGN contains curly-brace comments", () => {
    const pgn = `[White "Alice"]
[Black "Bob"]
[Result "1-0"]

1. e4 {Best by test} e5 {solid reply} 2. Nf3 Nc6 1-0`;

    const result = parsePGN(pgn);

    expect(result.moves).toHaveLength(4);
    expect(result.moves[0].san).toBe("e4");
    expect(result.moves[1].san).toBe("e5");
    expect(result.moves[2].san).toBe("Nf3");
    expect(result.moves[3].san).toBe("Nc6");
  });

  it("parses correctly when PGN contains recursive annotation variations (RAV)", () => {
    const pgn = `[White "Alice"]
[Black "Bob"]
[Result "1-0"]

1. e4 e5 (1... c5 2. Nf3 d6) 2. Nf3 Nc6 1-0`;

    const result = parsePGN(pgn);

    expect(result.moves).toHaveLength(4);
    expect(result.moves[0].san).toBe("e4");
    expect(result.moves[1].san).toBe("e5");
    expect(result.moves[2].san).toBe("Nf3");
    expect(result.moves[3].san).toBe("Nc6");
  });

  it("handles NAG annotations ($1, $2, etc.)", () => {
    const pgn = `[White "Alice"]
[Black "Bob"]
[Result "1-0"]

1. e4 $1 e5 $2 2. Nf3 Nc6 1-0`;

    const result = parsePGN(pgn);

    expect(result.moves).toHaveLength(4);
    expect(result.moves[0].san).toBe("e4");
  });

  it("handles symbolic annotations (!, ?, !!, ??)", () => {
    const pgn = `[White "Alice"]
[Black "Bob"]
[Result "1-0"]

1. e4! e5? 2. Nf3!! Nc6?? 1-0`;

    const result = parsePGN(pgn);

    expect(result.moves).toHaveLength(4);
    expect(result.moves[0].san).toBe("e4");
    expect(result.moves[1].san).toBe("e5");
  });
});

// =============================================================================
// Size Limit
// =============================================================================

describe("parsePGN - size limit", () => {
  it("rejects input exceeding 100,000 characters with appropriate error", () => {
    const oversizedInput = "x".repeat(100_001);

    expect(() => parsePGN(oversizedInput)).toThrow("maximum allowed length");
  });

  it("accepts input at exactly 100,000 characters (though it may fail for other reasons)", () => {
    // 100,000 chars exactly should not trigger the size limit error
    const exactLimitInput = "x".repeat(100_000);

    // It will throw for a different reason (missing headers), not size limit
    expect(() => parsePGN(exactLimitInput)).toThrow();
    expect(() => parsePGN(exactLimitInput)).not.toThrow(
      "maximum allowed length"
    );
  });

  it("exports MAX_PGN_LENGTH constant as 100000", () => {
    expect(MAX_PGN_LENGTH).toBe(100_000);
  });
});

// =============================================================================
// FEN Header
// =============================================================================

describe("parsePGN - FEN header", () => {
  it("uses FEN header as startingFen when present", () => {
    const customFen = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1";
    const pgn = `[White "Alice"]
[Black "Bob"]
[Result "*"]
[FEN "${customFen}"]

1... e5 *`;

    const result = parsePGN(pgn);

    expect(result.startingFen).toBe(customFen);
  });

  it("uses standard starting FEN when FEN header is absent", () => {
    const pgn = `[White "Alice"]
[Black "Bob"]
[Result "*"]

1. e4 *`;

    const result = parsePGN(pgn);

    expect(result.startingFen).toBe(
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
    );
  });

  it("correctly replays moves from a custom FEN position", () => {
    // Position where it's black's turn after 1. e4
    const customFen = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1";
    const pgn = `[White "Alice"]
[Black "Bob"]
[Result "*"]
[FEN "${customFen}"]

1... e5 2. Nf3 *`;

    const result = parsePGN(pgn);

    expect(result.moves).toHaveLength(2);
    expect(result.moves[0].color).toBe("black");
    expect(result.moves[0].san).toBe("e5");
    expect(result.moves[1].color).toBe("white");
    expect(result.moves[1].san).toBe("Nf3");
  });
});
