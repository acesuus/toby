import type { ParsedMove, PGNHeaders, OpeningInfo } from "./types";

// =============================================================================
// ECO Opening Database (common openings for move-matching)
// =============================================================================

interface ECOEntry {
  eco: string;
  name: string;
  moves: string[];
}

/**
 * Bundled ECO database of common chess openings.
 * Each entry contains the ECO code, name, and the move sequence (SAN) that
 * defines the opening line. Entries are ordered so longer lines appear first
 * within the same opening family, enabling longest-prefix matching.
 */
const ECO_DATABASE: ECOEntry[] = [
  // A00–A09: Uncommon Openings
  { eco: "A00", name: "Polish Opening", moves: ["b4"] },
  { eco: "A01", name: "Nimzo-Larsen Attack", moves: ["b3"] },
  { eco: "A02", name: "Bird's Opening", moves: ["f4"] },
  { eco: "A04", name: "Reti Opening", moves: ["Nf3", "d5", "c4"] },
  { eco: "A04", name: "Reti Opening", moves: ["Nf3"] },
  { eco: "A06", name: "Reti Opening", moves: ["Nf3", "d5"] },
  { eco: "A10", name: "English Opening", moves: ["c4"] },
  { eco: "A13", name: "English Opening", moves: ["c4", "e6"] },
  { eco: "A15", name: "English Opening: Anglo-Indian Defense", moves: ["c4", "Nf6"] },
  { eco: "A20", name: "English Opening: Reversed Sicilian", moves: ["c4", "e5"] },
  { eco: "A40", name: "Queen's Pawn Game", moves: ["d4", "e6"] },
  { eco: "A45", name: "Indian Defense", moves: ["d4", "Nf6"] },
  { eco: "A46", name: "Indian Defense: London System", moves: ["d4", "Nf6", "Nf3", "e6", "Bf4"] },
  { eco: "A48", name: "London System", moves: ["d4", "Nf6", "Nf3", "g6", "Bf4"] },

  // B00–B99: Semi-Open Games (1.e4 without 1...e5)
  { eco: "B00", name: "Nimzowitsch Defense", moves: ["e4", "Nc6"] },
  { eco: "B01", name: "Scandinavian Defense", moves: ["e4", "d5"] },
  { eco: "B02", name: "Alekhine's Defense", moves: ["e4", "Nf6"] },
  { eco: "B06", name: "Modern Defense", moves: ["e4", "g6"] },
  { eco: "B07", name: "Pirc Defense", moves: ["e4", "d6", "d4", "Nf6", "Nc3"] },
  { eco: "B10", name: "Caro-Kann Defense", moves: ["e4", "c6"] },
  { eco: "B12", name: "Caro-Kann Defense: Advance Variation", moves: ["e4", "c6", "d4", "d5", "e5"] },
  { eco: "B13", name: "Caro-Kann Defense: Exchange Variation", moves: ["e4", "c6", "d4", "d5", "exd5", "cxd5"] },
  { eco: "B15", name: "Caro-Kann Defense: Main Line", moves: ["e4", "c6", "d4", "d5", "Nc3"] },
  { eco: "B20", name: "Sicilian Defense", moves: ["e4", "c5"] },
  { eco: "B21", name: "Sicilian Defense: Smith-Morra Gambit", moves: ["e4", "c5", "d4", "cxd4", "c3"] },
  { eco: "B22", name: "Sicilian Defense: Alapin Variation", moves: ["e4", "c5", "c3"] },
  { eco: "B23", name: "Sicilian Defense: Closed", moves: ["e4", "c5", "Nc3"] },
  { eco: "B27", name: "Sicilian Defense: Hyperaccelerated Dragon", moves: ["e4", "c5", "Nf3", "g6"] },
  { eco: "B30", name: "Sicilian Defense: Old Sicilian", moves: ["e4", "c5", "Nf3", "Nc6"] },
  { eco: "B33", name: "Sicilian Defense: Open", moves: ["e4", "c5", "Nf3", "Nc6", "d4", "cxd4", "Nxd4"] },
  { eco: "B40", name: "Sicilian Defense: French Variation", moves: ["e4", "c5", "Nf3", "e6"] },
  { eco: "B50", name: "Sicilian Defense", moves: ["e4", "c5", "Nf3", "d6"] },
  { eco: "B54", name: "Sicilian Defense: Open", moves: ["e4", "c5", "Nf3", "d6", "d4", "cxd4", "Nxd4"] },
  { eco: "B60", name: "Sicilian Defense: Richter-Rauzer Variation", moves: ["e4", "c5", "Nf3", "d6", "d4", "cxd4", "Nxd4", "Nf6", "Nc3", "Nc6", "Bg5"] },
  { eco: "B72", name: "Sicilian Defense: Dragon Variation", moves: ["e4", "c5", "Nf3", "d6", "d4", "cxd4", "Nxd4", "Nf6", "Nc3", "g6"] },
  { eco: "B90", name: "Sicilian Defense: Najdorf Variation", moves: ["e4", "c5", "Nf3", "d6", "d4", "cxd4", "Nxd4", "Nf6", "Nc3", "a6"] },
  { eco: "B96", name: "Sicilian Defense: Najdorf, Polugaevsky Variation", moves: ["e4", "c5", "Nf3", "d6", "d4", "cxd4", "Nxd4", "Nf6", "Nc3", "a6", "Bg5"] },

  // C00–C19: French Defense
  { eco: "C00", name: "French Defense", moves: ["e4", "e6"] },
  { eco: "C01", name: "French Defense: Exchange Variation", moves: ["e4", "e6", "d4", "d5", "exd5", "exd5"] },
  { eco: "C02", name: "French Defense: Advance Variation", moves: ["e4", "e6", "d4", "d5", "e5"] },
  { eco: "C03", name: "French Defense: Tarrasch Variation", moves: ["e4", "e6", "d4", "d5", "Nd2"] },
  { eco: "C10", name: "French Defense: Classical Variation", moves: ["e4", "e6", "d4", "d5", "Nc3"] },
  { eco: "C11", name: "French Defense: Classical, Steinitz Variation", moves: ["e4", "e6", "d4", "d5", "Nc3", "Nf6"] },
  { eco: "C18", name: "French Defense: Winawer Variation", moves: ["e4", "e6", "d4", "d5", "Nc3", "Bb4"] },

  // C20–C99: Open Games (1.e4 e5)
  { eco: "C20", name: "King's Pawn Game", moves: ["e4", "e5"] },
  { eco: "C21", name: "Danish Gambit", moves: ["e4", "e5", "d4", "exd4", "c3"] },
  { eco: "C23", name: "Bishop's Opening", moves: ["e4", "e5", "Bc4"] },
  { eco: "C25", name: "Vienna Game", moves: ["e4", "e5", "Nc3"] },
  { eco: "C30", name: "King's Gambit", moves: ["e4", "e5", "f4"] },
  { eco: "C40", name: "King's Knight Opening", moves: ["e4", "e5", "Nf3"] },
  { eco: "C41", name: "Philidor Defense", moves: ["e4", "e5", "Nf3", "d6"] },
  { eco: "C42", name: "Petrov's Defense", moves: ["e4", "e5", "Nf3", "Nf6"] },
  { eco: "C44", name: "Scotch Game", moves: ["e4", "e5", "Nf3", "Nc6", "d4"] },
  { eco: "C45", name: "Scotch Game", moves: ["e4", "e5", "Nf3", "Nc6", "d4", "exd4", "Nxd4"] },
  { eco: "C46", name: "Three Knights Game", moves: ["e4", "e5", "Nf3", "Nc6", "Nc3"] },
  { eco: "C47", name: "Four Knights Game", moves: ["e4", "e5", "Nf3", "Nc6", "Nc3", "Nf6"] },
  { eco: "C50", name: "Italian Game", moves: ["e4", "e5", "Nf3", "Nc6", "Bc4"] },
  { eco: "C51", name: "Italian Game: Evans Gambit", moves: ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5", "b4"] },
  { eco: "C53", name: "Italian Game: Classical Variation", moves: ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5"] },
  { eco: "C54", name: "Italian Game: Giuoco Piano", moves: ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5", "c3"] },
  { eco: "C55", name: "Italian Game: Two Knights Defense", moves: ["e4", "e5", "Nf3", "Nc6", "Bc4", "Nf6"] },
  { eco: "C57", name: "Italian Game: Fried Liver Attack", moves: ["e4", "e5", "Nf3", "Nc6", "Bc4", "Nf6", "Ng5"] },
  { eco: "C60", name: "Ruy Lopez", moves: ["e4", "e5", "Nf3", "Nc6", "Bb5"] },
  { eco: "C65", name: "Ruy Lopez: Berlin Defense", moves: ["e4", "e5", "Nf3", "Nc6", "Bb5", "Nf6"] },
  { eco: "C68", name: "Ruy Lopez: Exchange Variation", moves: ["e4", "e5", "Nf3", "Nc6", "Bb5", "a6", "Bxc6"] },
  { eco: "C69", name: "Ruy Lopez: Exchange, Gligoric Variation", moves: ["e4", "e5", "Nf3", "Nc6", "Bb5", "a6", "Bxc6", "dxc6"] },
  { eco: "C70", name: "Ruy Lopez: Morphy Defense", moves: ["e4", "e5", "Nf3", "Nc6", "Bb5", "a6"] },
  { eco: "C78", name: "Ruy Lopez: Arkhangelsk Variation", moves: ["e4", "e5", "Nf3", "Nc6", "Bb5", "a6", "Ba4", "Nf6", "O-O", "b5"] },
  { eco: "C84", name: "Ruy Lopez: Closed", moves: ["e4", "e5", "Nf3", "Nc6", "Bb5", "a6", "Ba4", "Nf6", "O-O", "Be7"] },

  // D00–D99: Closed Games and Indian Defenses
  { eco: "D00", name: "Queen's Pawn Game", moves: ["d4", "d5"] },
  { eco: "D02", name: "Queen's Pawn Game: London System", moves: ["d4", "d5", "Nf3", "Nf6", "Bf4"] },
  { eco: "D04", name: "Queen's Pawn Game: Colle System", moves: ["d4", "d5", "Nf3", "Nf6", "e3"] },
  { eco: "D06", name: "Queen's Gambit", moves: ["d4", "d5", "c4"] },
  { eco: "D07", name: "Queen's Gambit: Chigorin Defense", moves: ["d4", "d5", "c4", "Nc6"] },
  { eco: "D10", name: "Queen's Gambit: Slav Defense", moves: ["d4", "d5", "c4", "c6"] },
  { eco: "D20", name: "Queen's Gambit Accepted", moves: ["d4", "d5", "c4", "dxc4"] },
  { eco: "D30", name: "Queen's Gambit Declined", moves: ["d4", "d5", "c4", "e6"] },
  { eco: "D35", name: "Queen's Gambit Declined: Exchange Variation", moves: ["d4", "d5", "c4", "e6", "Nc3", "Nf6", "cxd5", "exd5"] },
  { eco: "D37", name: "Queen's Gambit Declined: Three Knights", moves: ["d4", "d5", "c4", "e6", "Nc3", "Nf6", "Nf3"] },

  // E00–E99: Indian Defenses
  { eco: "E00", name: "Catalan Opening", moves: ["d4", "Nf6", "c4", "e6", "g3"] },
  { eco: "E12", name: "Queen's Indian Defense", moves: ["d4", "Nf6", "c4", "e6", "Nf3", "b6"] },
  { eco: "E15", name: "Queen's Indian Defense: Fianchetto Variation", moves: ["d4", "Nf6", "c4", "e6", "Nf3", "b6", "g3"] },
  { eco: "E20", name: "Nimzo-Indian Defense", moves: ["d4", "Nf6", "c4", "e6", "Nc3", "Bb4"] },
  { eco: "E32", name: "Nimzo-Indian Defense: Classical Variation", moves: ["d4", "Nf6", "c4", "e6", "Nc3", "Bb4", "Qc2"] },
  { eco: "E41", name: "Nimzo-Indian Defense: Hübner Variation", moves: ["d4", "Nf6", "c4", "e6", "Nc3", "Bb4", "e3"] },
  { eco: "E60", name: "King's Indian Defense", moves: ["d4", "Nf6", "c4", "g6"] },
  { eco: "E61", name: "King's Indian Defense", moves: ["d4", "Nf6", "c4", "g6", "Nc3"] },
  { eco: "E70", name: "King's Indian Defense: Classical Variation", moves: ["d4", "Nf6", "c4", "g6", "Nc3", "Bg7", "e4", "d6"] },
  { eco: "E76", name: "King's Indian Defense: Four Pawns Attack", moves: ["d4", "Nf6", "c4", "g6", "Nc3", "Bg7", "e4", "d6", "f4"] },
  { eco: "E80", name: "King's Indian Defense: Sämisch Variation", moves: ["d4", "Nf6", "c4", "g6", "Nc3", "Bg7", "e4", "d6", "f3"] },
  { eco: "E90", name: "King's Indian Defense: Classical", moves: ["d4", "Nf6", "c4", "g6", "Nc3", "Bg7", "e4", "d6", "Nf3"] },
  { eco: "E97", name: "King's Indian Defense: Mar del Plata", moves: ["d4", "Nf6", "c4", "g6", "Nc3", "Bg7", "e4", "d6", "Nf3", "O-O", "Be2", "e5"] },

  // A80–A99: Dutch Defense
  { eco: "A80", name: "Dutch Defense", moves: ["d4", "f5"] },
  { eco: "A83", name: "Dutch Defense: Staunton Gambit", moves: ["d4", "f5", "e4"] },
  { eco: "A87", name: "Dutch Defense: Leningrad Variation", moves: ["d4", "f5", "c4", "Nf6", "g3", "g6"] },

  // Grünfeld Defense
  { eco: "D70", name: "Grünfeld Defense", moves: ["d4", "Nf6", "c4", "g6", "Nc3", "d5"] },
  { eco: "D85", name: "Grünfeld Defense: Exchange Variation", moves: ["d4", "Nf6", "c4", "g6", "Nc3", "d5", "cxd5", "Nxd5", "e4"] },
];

// =============================================================================
// Opening Detection
// =============================================================================

/**
 * Detects the opening played in a game by matching moves against a bundled
 * ECO database, falling back to PGN header ECO/Opening values if no
 * move-match is found.
 *
 * Priority (per requirement 10.2):
 * 1. Move-matching against ECO database (longest prefix match)
 * 2. PGN header ECO + Opening values
 * 3. Fallback: { eco: "", name: "Unknown Opening", moves: 0 }
 */
export function detectOpening(
  moves: ParsedMove[],
  headers: PGNHeaders
): OpeningInfo {
  // Step 1: Try move-matching against the ECO database
  const moveMatchResult = matchMovesToECO(moves);

  if (moveMatchResult) {
    return moveMatchResult;
  }

  // Step 2: Fall back to PGN header ECO/Opening values
  if (headers.eco || headers.opening) {
    return {
      eco: headers.eco ?? "",
      name: headers.opening ?? "Unknown Opening",
      moves: 0,
    };
  }

  // Step 3: No match found from either source
  return {
    eco: "",
    name: "Unknown Opening",
    moves: 0,
  };
}

/**
 * Matches the game's moves against the ECO database, finding the longest
 * matching prefix. Returns the OpeningInfo for the longest match, or null
 * if no match is found.
 */
function matchMovesToECO(moves: ParsedMove[]): OpeningInfo | null {
  const gameSanMoves = moves.map((m) => m.san);

  let bestMatch: ECOEntry | null = null;
  let bestMatchLength = 0;

  for (const entry of ECO_DATABASE) {
    const entryLength = entry.moves.length;

    // Skip entries longer than the game itself
    if (entryLength > gameSanMoves.length) {
      continue;
    }

    // Only check entries that could be longer than our current best
    if (entryLength <= bestMatchLength) {
      continue;
    }

    // Check if the game starts with this opening's move sequence
    let matches = true;
    for (let i = 0; i < entryLength; i++) {
      if (gameSanMoves[i] !== entry.moves[i]) {
        matches = false;
        break;
      }
    }

    if (matches) {
      bestMatch = entry;
      bestMatchLength = entryLength;
    }
  }

  if (bestMatch) {
    return {
      eco: bestMatch.eco,
      name: bestMatch.name,
      moves: bestMatchLength,
    };
  }

  return null;
}
