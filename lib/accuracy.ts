import type {
  ClassifiedMove,
  GameAccuracy,
  SideAccuracy,
  CriticalMoment,
  OpeningInfo,
  MoveGrade,
} from "@/lib/types";
import { evalToWinPercent } from "@/lib/win-percent";

/**
 * Calculates the full game accuracy result for both sides.
 *
 * @param classifiedMoves - Array of classified moves from the game
 * @returns GameAccuracy with per-side accuracy, opening info, and critical moments
 */
export function calculateGameAccuracy(
  classifiedMoves: ClassifiedMove[]
): GameAccuracy {
  const white = calculateSideAccuracy(classifiedMoves, "white");
  const black = calculateSideAccuracy(classifiedMoves, "black");
  const criticalMoments = identifyCriticalMoments(classifiedMoves);
  const opening: OpeningInfo = { eco: "", name: "Unknown Opening", moves: 0 };

  return { white, black, opening, criticalMoments };
}

/**
 * Calculates accuracy statistics for a single side (white or black).
 *
 * Weighted accuracy formula:
 * - moveAccuracy = max(0, 100 - winPercentLoss * 10)
 * - positionWeight = max(1, abs(winPercentBefore - 50) / 10 + 1)
 * - finalAccuracy = sum(moveAccuracy * positionWeight) / sum(positionWeight)
 *
 * Book moves are excluded from accuracy calculation.
 * If no non-book moves exist, accuracy is 100.
 *
 * @param classifiedMoves - All classified moves in the game
 * @param side - Which side to compute accuracy for
 * @returns SideAccuracy with accuracy score, move count, classifications, and avg CPL
 */
export function calculateSideAccuracy(
  classifiedMoves: ClassifiedMove[],
  side: "white" | "black"
): SideAccuracy {
  const sideMoves = classifiedMoves.filter((m) => m.color === side);
  const nonBookMoves = sideMoves.filter((m) => m.grade !== "book");

  // Grade counts: sum must equal total half-moves for that side
  const classifications = countGrades(sideMoves);

  // If no non-book moves, accuracy is 100
  if (nonBookMoves.length === 0) {
    return {
      accuracy: 100,
      moveCount: sideMoves.length,
      classifications,
      averageCentipawnLoss: 0,
    };
  }

  // Compute weighted accuracy
  let totalWeight = 0;
  let weightedAccuracy = 0;

  for (const move of nonBookMoves) {
    const positionWeight = Math.max(
      1,
      Math.abs(move.winPercentBefore - 50) / 10 + 1
    );
    const moveAccuracy = Math.max(0, 100 - move.winPercentLoss * 10);

    weightedAccuracy += moveAccuracy * positionWeight;
    totalWeight += positionWeight;
  }

  const rawAccuracy = weightedAccuracy / totalWeight;
  const accuracy = Math.round(rawAccuracy * 10) / 10;

  // Compute average centipawn loss (excluding book moves)
  const averageCentipawnLoss = computeAverageCentipawnLoss(nonBookMoves);

  return {
    accuracy,
    moveCount: sideMoves.length,
    classifications,
    averageCentipawnLoss,
  };
}

/**
 * Counts the number of each MoveGrade for a set of moves.
 * Ensures all grade keys are present in the result.
 *
 * @param moves - Moves to count grades for
 * @returns Record mapping each MoveGrade to its count
 */
function countGrades(moves: ClassifiedMove[]): Record<MoveGrade, number> {
  const counts: Record<MoveGrade, number> = {
    brilliant: 0,
    book: 0,
    best: 0,
    excellent: 0,
    good: 0,
    inaccuracy: 0,
    mistake: 0,
    blunder: 0,
  };

  for (const move of moves) {
    counts[move.grade]++;
  }

  return counts;
}

/**
 * Computes the average centipawn loss for a set of non-book moves.
 *
 * Uses evaluation scores to compute centipawn loss per move. For centipawn-type
 * evaluations, the loss is the perspective-adjusted difference. For mate scores,
 * we approximate using the win percentage loss converted back to centipawns.
 *
 * @param nonBookMoves - Non-book moves to compute average CPL for
 * @returns Average centipawn loss rounded to one decimal place
 */
function computeAverageCentipawnLoss(
  nonBookMoves: ClassifiedMove[]
): number {
  if (nonBookMoves.length === 0) return 0;

  let totalCpLoss = 0;

  for (const move of nonBookMoves) {
    const { evalBefore, evalAfter, color } = move;

    if (evalBefore.type === "cp" && evalAfter.type === "cp") {
      // Both are centipawn evaluations - compute direct cp loss from perspective
      const factor = color === "white" ? 1 : -1;
      const cpBefore = evalBefore.value * factor;
      const cpAfter = evalAfter.value * factor;
      const cpLoss = Math.max(0, cpBefore - cpAfter);
      totalCpLoss += cpLoss;
    } else {
      // At least one is a mate score - approximate using win percent loss
      // Convert wp loss back to approximate centipawns using inverse of sigmoid
      // A simpler approach: use winPercentLoss directly as a proxy
      // wpLoss of 1 point ≈ ~27cp at cp=0, but varies. Use a linear approximation.
      totalCpLoss += winPercentLossToCentipawns(move.winPercentLoss);
    }
  }

  const avg = totalCpLoss / nonBookMoves.length;
  return Math.round(avg * 10) / 10;
}

/**
 * Approximates centipawn loss from win-percentage loss.
 * Uses the inverse of the sigmoid near the midpoint as a rough conversion.
 * At wp=50, 1% wp ≈ 27cp. This is an approximation for mate-involved positions.
 *
 * @param wpLoss - Win percentage loss
 * @returns Approximate centipawn loss
 */
function winPercentLossToCentipawns(wpLoss: number): number {
  // Near the center of the sigmoid, 1 win% point ≈ 27 centipawns
  // For larger swings this overestimates, but it's a reasonable approximation
  // when mate scores are involved.
  return wpLoss * 27;
}

/**
 * Identifies critical moments in the game where a large evaluation swing occurred.
 * A critical moment is defined as a position where the win-percentage swing
 * between consecutive positions exceeds 10 percentage points.
 *
 * The swing is measured from white's perspective for consistency.
 *
 * @param classifiedMoves - All classified moves in the game
 * @returns Array of CriticalMoment objects
 */
export function identifyCriticalMoments(
  classifiedMoves: ClassifiedMove[]
): CriticalMoment[] {
  const criticalMoments: CriticalMoment[] = [];

  for (let i = 0; i < classifiedMoves.length; i++) {
    const move = classifiedMoves[i];

    // Compute win% swing from white's perspective for consistency
    const wpBeforeWhite = evalToWinPercent(move.evalBefore, "white");
    const wpAfterWhite = evalToWinPercent(move.evalAfter, "white");
    const swing = Math.abs(wpAfterWhite - wpBeforeWhite);

    if (swing > 10) {
      const description = generateCriticalMomentDescription(move, swing);
      criticalMoments.push({
        moveIndex: i,
        description,
        evalSwing: Math.round(swing * 10) / 10,
      });
    }
  }

  return criticalMoments;
}

/**
 * Generates a human-readable description for a critical moment.
 *
 * @param move - The classified move that caused the swing
 * @param swing - The win-percentage swing magnitude
 * @returns A descriptive string
 */
function generateCriticalMomentDescription(
  move: ClassifiedMove,
  swing: number
): string {
  const side = move.color === "white" ? "White" : "Black";
  const gradeDescriptions: Record<MoveGrade, string> = {
    brilliant: "brilliant move",
    book: "book move",
    best: "best move",
    excellent: "excellent move",
    good: "good move",
    inaccuracy: "inaccuracy",
    mistake: "mistake",
    blunder: "blunder",
  };

  const gradeText = gradeDescriptions[move.grade];
  return `${side}'s ${gradeText} (${move.san}) caused a ${Math.round(swing)}% swing`;
}
