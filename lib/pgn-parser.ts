import { Chess } from "chess.js";
import type { ParsedGame, PGNHeaders, ParsedMove } from "@/lib/types";

const DEFAULT_STARTING_FEN =
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

// =============================================================================
// PGN Input Sanitization
// =============================================================================

/**
 * Regex patterns that indicate potential XSS/injection attempts in PGN input.
 * These patterns MUST cause the input to be rejected outright.
 */
const XSS_PATTERNS: RegExp[] = [
  /<script/i,
  /javascript:/i,
  /on\w+\s*=/i,
];

/**
 * Characters considered valid in PGN text. Matches:
 * - Alphanumeric (a-z, A-Z, 0-9)
 * - Whitespace: space, tab, newline, carriage return
 * - PGN notation symbols: . / - + # = * !? $ ~
 * - Structural: [] {} () " ;
 * - Extended: @ (email in headers), _ (names), , : (clock annotations), '
 *
 * Any character NOT matching this set (except those explicitly handled) will be stripped.
 */
const VALID_PGN_CHARS = /^[\x20-\x7E\t\n\r]*$/;

/**
 * Sanitizes PGN input by treating it as untrusted data.
 *
 * This function:
 * 1. Strips control characters (chars < 0x20 except \n, \r, \t)
 * 2. Strips HTML/script tags
 * 3. Rejects input containing XSS injection patterns (<script, javascript:, on\w+=)
 * 4. Validates that remaining content uses only PGN-valid characters
 *
 * @param pgn - Raw PGN text from untrusted source
 * @returns Cleaned PGN text safe for parsing
 * @throws Error if the input contains XSS/injection patterns
 */
export function sanitizePGN(pgn: string): string {
  // 1. Reject input containing XSS injection patterns
  for (const pattern of XSS_PATTERNS) {
    if (pattern.test(pgn)) {
      throw new Error(
        "PGN input rejected: contains potentially malicious content"
      );
    }
  }

  // 2. Strip control characters (chars < 0x20) except newline (\n), carriage return (\r), tab (\t)
  let cleaned = pgn.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

  // 3. Strip any HTML tags that might remain (e.g., <div>, <b>, etc.)
  cleaned = cleaned.replace(/<[^>]*>/g, "");

  // 4. Validate remaining content only contains PGN-valid characters (printable ASCII + whitespace)
  if (!VALID_PGN_CHARS.test(cleaned)) {
    // Strip non-ASCII characters rather than rejecting outright,
    // since some PGN files may contain accented player names in headers
    cleaned = cleaned.replace(/[^\x20-\x7E\t\n\r]/g, "");
  }

  return cleaned;
}

/**
 * Extracts PGN header tags from PGN text.
 * Headers follow the format: [TagName "TagValue"]
 */
function extractHeaders(pgn: string): Record<string, string> {
  const headers: Record<string, string> = {};
  const headerRegex = /\[(\w+)\s+"([^"]*)"\]/g;
  let match: RegExpExecArray | null;

  while ((match = headerRegex.exec(pgn)) !== null) {
    headers[match[1]] = match[2];
  }

  return headers;
}

/**
 * Maps raw header record to typed PGNHeaders.
 */
function mapHeaders(raw: Record<string, string>): PGNHeaders {
  return {
    event: raw["Event"] ?? undefined,
    site: raw["Site"] ?? undefined,
    date: raw["Date"] ?? undefined,
    white: raw["White"],
    black: raw["Black"],
    result: raw["Result"],
    eco: raw["ECO"] ?? undefined,
    opening: raw["Opening"] ?? undefined,
    timeControl: raw["TimeControl"] ?? undefined,
  };
}

/**
 * Strips comments ({...}), NAG annotations ($N, !, ?, !!, ??, !?, ?!),
 * and recursive annotation variations ((...)) from move text.
 * Handles nested parentheses for RAV.
 */
function stripAnnotations(moveText: string): string {
  // Remove curly brace comments
  let result = moveText.replace(/\{[^}]*\}/g, "");

  // Remove RAV (recursive annotation variations) — handle nested parentheses
  let prev = "";
  while (prev !== result) {
    prev = result;
    result = result.replace(/\([^()]*\)/g, "");
  }

  // Remove NAG annotations ($1, $2, etc.)
  result = result.replace(/\$\d+/g, "");

  // Remove symbolic annotations (!, ?, !!, ??, !?, ?!)
  result = result.replace(/[!?]{1,2}/g, "");

  return result;
}

/**
 * Extracts the move text section from PGN (everything after the headers).
 */
function extractMoveText(pgn: string): string {
  // Remove all header lines
  const withoutHeaders = pgn.replace(/\[\w+\s+"[^"]*"\]\s*/g, "");
  return withoutHeaders.trim();
}

/**
 * Converts a chess.js Move result into UCI notation.
 * UCI format: fromSquare + toSquare + promotionPiece (if any)
 * e.g., "e2e4", "g1f3", "e7e8q"
 */
function moveToUci(move: { from: string; to: string; promotion?: string }): string {
  return move.from + move.to + (move.promotion ?? "");
}

/**
 * Maximum allowed PGN input length in characters.
 */
export const MAX_PGN_LENGTH = 100_000;

/**
 * Parses a PGN string into a structured ParsedGame.
 *
 * All input is treated as untrusted. The parser sanitizes the PGN text before
 * processing — stripping control characters, HTML tags, and rejecting content
 * that contains XSS injection patterns.
 *
 * SECURITY GUARANTEE: All analysis runs entirely client-side in the browser.
 * No game data, PGN content, positions, or evaluation results are transmitted
 * to any external server during import, parsing, or analysis. This is an
 * architectural invariant of the application (Requirements 14.5, 14.6).
 *
 * @param pgn - The PGN text to parse (treated as untrusted input)
 * @returns A ParsedGame object with headers, moves, and starting FEN
 * @throws Error if input exceeds 100,000 characters, contains malicious content,
 *         required headers are missing, or moves are illegal
 */
export function parsePGN(pgn: string): ParsedGame {
  // 0. Enforce input size limit
  if (pgn.length > MAX_PGN_LENGTH) {
    throw new Error(
      `PGN input exceeds maximum allowed length of ${MAX_PGN_LENGTH} characters (received ${pgn.length})`
    );
  }

  // 0.5 Sanitize input — treat all PGN as untrusted (Requirement 14.3)
  const sanitizedPgn = sanitizePGN(pgn);

  // 1. Extract headers
  const rawHeaders = extractHeaders(sanitizedPgn);

  // 2. Validate required headers
  const missingHeaders: string[] = [];
  if (!rawHeaders["White"]) missingHeaders.push("White");
  if (!rawHeaders["Black"]) missingHeaders.push("Black");
  if (!rawHeaders["Result"]) missingHeaders.push("Result");

  if (missingHeaders.length > 0) {
    throw new Error(
      `Missing required PGN header(s): ${missingHeaders.join(", ")}`
    );
  }

  const headers = mapHeaders(rawHeaders);

  // 3. Determine starting FEN
  const startingFen = rawHeaders["FEN"] ?? DEFAULT_STARTING_FEN;

  // 4. Extract and strip move text
  const rawMoveText = extractMoveText(sanitizedPgn);
  const cleanMoveText = stripAnnotations(rawMoveText);

  // 5. Tokenize move text
  // Remove result tokens and move numbers, then split on whitespace
  const withoutResult = cleanMoveText
    .replace(/1-0|0-1|1\/2-1\/2|\*/g, "")
    .trim();

  const tokens = withoutResult
    .split(/\s+/)
    .filter((token) => token.length > 0)
    // Remove move number tokens like "1.", "1...", "12."
    .filter((token) => !/^\d+\.+$/.test(token));

  // 6. Initialize chess instance with starting FEN
  const chess = new Chess(startingFen);

  // 7. Replay moves and build ParsedMove array
  const moves: ParsedMove[] = [];
  let halfMoveIndex = 0;

  // Determine the starting move number and color from the FEN
  const fenParts = startingFen.split(" ");
  const startingColor = fenParts[1] === "b" ? "black" : "white";
  const startingMoveNumber = parseInt(fenParts[5] ?? "1", 10);

  for (const token of tokens) {
    // Skip empty tokens
    if (!token) continue;

    const fenBefore = chess.fen();
    const color: "white" | "black" =
      (halfMoveIndex % 2 === 0 && startingColor === "white") ||
      (halfMoveIndex % 2 === 1 && startingColor === "black")
        ? "white"
        : "black";

    // Calculate move number
    let moveNumber: number;
    if (startingColor === "white") {
      moveNumber = startingMoveNumber + Math.floor(halfMoveIndex / 2);
    } else {
      moveNumber =
        startingMoveNumber + Math.floor((halfMoveIndex + 1) / 2);
    }

    // Try to apply the move
    let moveResult;
    try {
      moveResult = chess.move(token);
    } catch {
      throw new Error(
        `Illegal move: "${token}" at move ${moveNumber} by ${color}`
      );
    }

    if (!moveResult) {
      throw new Error(
        `Illegal move: "${token}" at move ${moveNumber} by ${color}`
      );
    }

    const fenAfter = chess.fen();
    const uci = moveToUci(moveResult);

    moves.push({
      moveNumber,
      color,
      san: moveResult.san,
      uci,
      fenBefore,
      fenAfter,
    });

    halfMoveIndex++;
  }

  return {
    headers,
    moves,
    startingFen,
  };
}
