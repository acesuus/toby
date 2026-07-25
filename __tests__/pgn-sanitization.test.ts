import { describe, it, expect } from "vitest";
import { sanitizePGN, parsePGN } from "@/lib/pgn-parser";

// =============================================================================
// sanitizePGN — Control Character Stripping
// =============================================================================

describe("sanitizePGN - control character stripping", () => {
  it("strips null bytes and other control characters", () => {
    const input = "1. e4\x00 e5\x01 2. Nf3\x02";
    const result = sanitizePGN(input);
    expect(result).toBe("1. e4 e5 2. Nf3");
  });

  it("preserves newlines, carriage returns, and tabs", () => {
    const input = "[White \"Alice\"]\n[Black \"Bob\"]\r\n\t1. e4";
    const result = sanitizePGN(input);
    expect(result).toBe("[White \"Alice\"]\n[Black \"Bob\"]\r\n\t1. e4");
  });

  it("strips ASCII control chars 0x0B (vertical tab) and 0x0C (form feed)", () => {
    const input = "1. e4\x0Be5\x0C2. Nf3";
    const result = sanitizePGN(input);
    expect(result).toBe("1. e4e52. Nf3");
  });

  it("strips DEL character (0x7F)", () => {
    const input = "1. e4\x7F e5";
    const result = sanitizePGN(input);
    expect(result).toBe("1. e4 e5");
  });
});

// =============================================================================
// sanitizePGN — XSS/Injection Rejection
// =============================================================================

describe("sanitizePGN - XSS injection rejection", () => {
  it("rejects input containing <script tag", () => {
    const input = '[White "<script>alert(1)</script>"]';
    expect(() => sanitizePGN(input)).toThrow("potentially malicious content");
  });

  it("rejects input containing <SCRIPT (case-insensitive)", () => {
    const input = '[White "<SCRIPT>alert(1)</SCRIPT>"]';
    expect(() => sanitizePGN(input)).toThrow("potentially malicious content");
  });

  it("rejects input containing javascript: protocol", () => {
    const input = '[Site "javascript:alert(1)"]';
    expect(() => sanitizePGN(input)).toThrow("potentially malicious content");
  });

  it("rejects input containing event handlers (onclick=)", () => {
    const input = '[White "test" onclick="alert(1)"]';
    expect(() => sanitizePGN(input)).toThrow("potentially malicious content");
  });

  it("rejects input containing onmouseover= pattern", () => {
    const input = '{onmouseover=alert(1)} 1. e4 e5';
    expect(() => sanitizePGN(input)).toThrow("potentially malicious content");
  });

  it("rejects input containing onerror= pattern", () => {
    const input = '<img onerror=alert(1)>';
    expect(() => sanitizePGN(input)).toThrow("potentially malicious content");
  });
});

// =============================================================================
// sanitizePGN — HTML Tag Stripping
// =============================================================================

describe("sanitizePGN - HTML tag stripping", () => {
  it("strips HTML div tags from input", () => {
    const input = "<div>1. e4 e5</div>";
    const result = sanitizePGN(input);
    expect(result).toBe("1. e4 e5");
  });

  it("strips bold/italic tags from input", () => {
    const input = "1. <b>e4</b> <i>e5</i>";
    const result = sanitizePGN(input);
    expect(result).toBe("1. e4 e5");
  });

  it("strips self-closing tags like <br/> and <hr/>", () => {
    const input = "1. e4<br/> e5<hr/>";
    const result = sanitizePGN(input);
    expect(result).toBe("1. e4 e5");
  });

  it("strips tags with attributes", () => {
    const input = '<a href="http://evil.com">1. e4 e5</a>';
    const result = sanitizePGN(input);
    expect(result).toBe("1. e4 e5");
  });
});

// =============================================================================
// sanitizePGN — Non-ASCII Character Handling
// =============================================================================

describe("sanitizePGN - non-ASCII character handling", () => {
  it("strips non-ASCII characters (accented names are normalized)", () => {
    const input = '[White "José"]\n[Black "Bob"]\n[Result "1-0"]\n1. e4 1-0';
    const result = sanitizePGN(input);
    // The accented 'é' is stripped, leaving 'Jos'
    expect(result).not.toContain("é");
    expect(result).toContain("Jos");
  });

  it("strips emoji characters from input", () => {
    const input = "1. e4 🎉 e5";
    const result = sanitizePGN(input);
    expect(result).not.toContain("🎉");
  });
});

// =============================================================================
// sanitizePGN — Valid PGN Preservation
// =============================================================================

describe("sanitizePGN - valid PGN preservation", () => {
  it("preserves a clean, standard PGN unchanged", () => {
    const input = `[White "Alice"]
[Black "Bob"]
[Result "1-0"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 1-0`;
    const result = sanitizePGN(input);
    expect(result).toBe(input);
  });

  it("preserves PGN comments in curly braces", () => {
    const input = "1. e4 {Best by test} e5";
    const result = sanitizePGN(input);
    expect(result).toBe(input);
  });

  it("preserves NAG annotations ($1, $2)", () => {
    const input = "1. e4 $1 e5 $2";
    const result = sanitizePGN(input);
    expect(result).toBe(input);
  });

  it("preserves result markers (1-0, 0-1, 1/2-1/2, *)", () => {
    const input = "1. e4 e5 1/2-1/2";
    const result = sanitizePGN(input);
    expect(result).toBe(input);
  });

  it("preserves castling notation (O-O, O-O-O)", () => {
    const input = "4. O-O Be7 5. O-O-O Bg7";
    const result = sanitizePGN(input);
    expect(result).toBe(input);
  });

  it("preserves promotion notation (e8=Q)", () => {
    const input = "45. e8=Q Kf7";
    const result = sanitizePGN(input);
    expect(result).toBe(input);
  });

  it("preserves check and checkmate annotations (+ and #)", () => {
    const input = "23. Qh7# 1-0";
    const result = sanitizePGN(input);
    expect(result).toBe(input);
  });
});

// =============================================================================
// Integration — parsePGN with sanitization
// =============================================================================

describe("parsePGN - sanitization integration", () => {
  it("successfully parses PGN with embedded control characters after sanitization", () => {
    const pgn = `[White "Alice"]\x00
[Black "Bob"]\x01
[Result "1-0"]

1. e4\x02 e5 2. Nf3 Nc6 1-0`;

    const result = parsePGN(pgn);
    expect(result.moves).toHaveLength(4);
    expect(result.headers.white).toBe("Alice");
  });

  it("rejects PGN containing script injection attempt", () => {
    const pgn = `[White "<script>alert('xss')</script>"]
[Black "Bob"]
[Result "1-0"]

1. e4 e5 1-0`;

    expect(() => parsePGN(pgn)).toThrow("potentially malicious content");
  });

  it("strips HTML tags from PGN and still parses correctly", () => {
    const pgn = `[White "Alice"]
[Black "Bob"]
[Result "1-0"]

<p>1. e4 e5 2. Nf3 Nc6</p> 1-0`;

    const result = parsePGN(pgn);
    expect(result.moves).toHaveLength(4);
  });

  it("rejects PGN with javascript: protocol in header value", () => {
    const pgn = `[White "Alice"]
[Black "Bob"]
[Result "1-0"]
[Site "javascript:void(0)"]

1. e4 e5 1-0`;

    expect(() => parsePGN(pgn)).toThrow("potentially malicious content");
  });
});
