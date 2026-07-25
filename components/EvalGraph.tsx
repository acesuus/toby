"use client";

import { useCallback, useMemo, useRef } from "react";
import type { EvalScore, ClassifiedMove } from "@/lib/types";
import { evalToPawns, MAX_EVAL } from "@/lib/eval-graph-utils";

// =============================================================================
// Types
// =============================================================================

export interface EvalGraphProps {
  evaluations: EvalScore[];
  classifications: ClassifiedMove[];
  currentMoveIndex: number;
  onMoveClick: (moveIndex: number) => void;
  totalPositions?: number;
}

// =============================================================================
// Constants
// =============================================================================

const GRAPH_WIDTH = 800;
const GRAPH_HEIGHT = 300;
const PADDING_LEFT = 40;
const PADDING_RIGHT = 20;
const PADDING_TOP = 20;
const PADDING_BOTTOM = 30;

const PLOT_WIDTH = GRAPH_WIDTH - PADDING_LEFT - PADDING_RIGHT;
const PLOT_HEIGHT = GRAPH_HEIGHT - PADDING_TOP - PADDING_BOTTOM;

const MIDLINE_Y = PADDING_TOP + PLOT_HEIGHT / 2;

// =============================================================================
// Helpers
// =============================================================================

/** Convert a pawn value [-10, +10] to a Y coordinate in the plot */
function pawnsToY(pawns: number): number {
  // +10 is at the top, -10 is at the bottom
  const normalized = (MAX_EVAL - pawns) / (2 * MAX_EVAL);
  return PADDING_TOP + normalized * PLOT_HEIGHT;
}

/** Convert an index to an X coordinate in the plot */
function indexToX(index: number, totalPoints: number): number {
  if (totalPoints <= 1) return PADDING_LEFT;
  return PADDING_LEFT + (index / (totalPoints - 1)) * PLOT_WIDTH;
}

// =============================================================================
// Component
// =============================================================================

export function EvalGraph({
  evaluations,
  classifications,
  currentMoveIndex,
  onMoveClick,
  totalPositions,
}: EvalGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  const totalPoints = evaluations.length;
  const plotPointCount = Math.max(
    totalPoints,
    totalPositions ?? (classifications.length > 0 ? classifications.length + 1 : totalPoints)
  );

  // Build data points for evaluated positions
  const points = useMemo(() => {
    return evaluations.map((evalScore, i) => {
      const pawns = evalToPawns(evalScore);
      const x = indexToX(i, plotPointCount);
      const y = pawnsToY(pawns);
      return { x, y, pawns, index: i, evaluated: true };
    });
  }, [evaluations, plotPointCount]);

  // Build path for the evaluation line
  const linePath = useMemo(() => {
    if (points.length === 0) return "";
    return points
      .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
      .join(" ");
  }, [points]);

  // Build filled area paths (white above midline, black below)
  const { whiteAreaPath, blackAreaPath } = useMemo(() => {
    if (points.length === 0) return { whiteAreaPath: "", blackAreaPath: "" };

    // White area: from midline up to the eval line (clamped to midline as floor)
    const whitePoints = points.map((p) => ({
      x: p.x,
      y: Math.min(p.y, MIDLINE_Y),
    }));
    const whitePath =
      `M ${whitePoints[0].x} ${MIDLINE_Y} ` +
      whitePoints.map((p) => `L ${p.x} ${p.y}`).join(" ") +
      ` L ${whitePoints[whitePoints.length - 1].x} ${MIDLINE_Y} Z`;

    // Black area: from midline down to the eval line (clamped to midline as ceiling)
    const blackPoints = points.map((p) => ({
      x: p.x,
      y: Math.max(p.y, MIDLINE_Y),
    }));
    const blackPath =
      `M ${blackPoints[0].x} ${MIDLINE_Y} ` +
      blackPoints.map((p) => `L ${p.x} ${p.y}`).join(" ") +
      ` L ${blackPoints[blackPoints.length - 1].x} ${MIDLINE_Y} Z`;

    return { whiteAreaPath: whitePath, blackAreaPath: blackPath };
  }, [points]);

  // Build classification lookup: moveIndex -> grade
  const classificationMap = useMemo(() => {
    const map = new Map<number, string>();
    classifications.forEach((c, i) => {
      map.set(i, c.grade);
    });
    return map;
  }, [classifications]);

  // Prefer the caller's game length so incomplete analysis still shows pending positions.
  const expectedTotal = useMemo(() => {
    if (totalPositions && totalPositions > 0) return totalPositions;
    if (classifications.length > 0) return classifications.length + 1;
    return totalPoints;
  }, [classifications.length, totalPoints, totalPositions]);

  // Placeholder dots for unevaluated positions
  const placeholderDots = useMemo(() => {
    if (totalPoints >= expectedTotal) return [];
    const dots = [];
    for (let i = totalPoints; i < expectedTotal; i++) {
      const x = indexToX(i, expectedTotal);
      dots.push({ x, index: i });
    }
    return dots;
  }, [totalPoints, expectedTotal]);

  // Handle click on SVG to navigate to nearest move
  const handleClick = useCallback(
    (event: React.MouseEvent<SVGSVGElement>) => {
      const svg = svgRef.current;
      if (!svg || totalPoints === 0) return;

      const rect = svg.getBoundingClientRect();
      const clientX = event.clientX - rect.left;
      const svgX = (clientX / rect.width) * GRAPH_WIDTH;

      // Find nearest point index
      let nearestIndex = 0;
      let nearestDist = Infinity;

      const pointCount = Math.max(totalPoints, expectedTotal);
      for (let i = 0; i < pointCount; i++) {
        const px = indexToX(i, pointCount);
        const dist = Math.abs(svgX - px);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestIndex = i;
        }
      }

      // Convert point index to move index (index 0 = starting position = moveIndex -1)
      const moveIndex = nearestIndex - 1;
      onMoveClick(moveIndex);
    },
    [totalPoints, expectedTotal, onMoveClick]
  );

  const handleKeyDown = useCallback((event: React.KeyboardEvent<SVGSVGElement>) => {
    let destination: number | null = null;
    if (event.key === "ArrowLeft") destination = currentMoveIndex - 1;
    if (event.key === "ArrowRight") destination = currentMoveIndex + 1;
    if (event.key === "Home") destination = -1;
    if (event.key === "End") destination = Math.max(-1, expectedTotal - 2);
    if (destination === null) return;
    event.preventDefault();
    onMoveClick(Math.max(-1, Math.min(destination, expectedTotal - 2)));
  }, [currentMoveIndex, expectedTotal, onMoveClick]);

  // Current move marker position
  const currentMarker = useMemo(() => {
    // currentMoveIndex -1 = starting position (index 0 in evaluations)
    const evalIndex = currentMoveIndex + 1;
    if (evalIndex < 0 || evalIndex >= totalPoints) return null;

    const point = points[evalIndex];
    if (!point) return null;
    return { x: point.x, y: point.y };
  }, [currentMoveIndex, totalPoints, points]);

  // Y-axis labels
  const yAxisLabels = [-10, -5, 0, 5, 10];

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${GRAPH_WIDTH} ${GRAPH_HEIGHT}`}
      className="h-auto w-full cursor-pointer select-none rounded-lg focus-visible:outline-none"
      aria-label="Evaluation graph. Use left and right arrow keys to navigate positions; white advantage is above the midline and black advantage below."
      aria-valuemin={-1}
      aria-valuemax={Math.max(-1, expectedTotal - 2)}
      aria-valuenow={currentMoveIndex}
      aria-valuetext={currentMoveIndex < 0 ? "Starting position" : `Move ${currentMoveIndex + 1}`}
      role="slider"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      {/* Background */}
      <rect
        x={PADDING_LEFT}
        y={PADDING_TOP}
        width={PLOT_WIDTH}
        height={PLOT_HEIGHT}
        fill="#f0f0f0"
      />

      {/* White advantage area (above midline) */}
      {whiteAreaPath && (
        <path
          d={whiteAreaPath}
          fill="rgba(255, 255, 255, 0.8)"
          stroke="none"
        />
      )}

      {/* Black advantage area (below midline) */}
      {blackAreaPath && (
        <path
          d={blackAreaPath}
          fill="rgba(30, 30, 30, 0.7)"
          stroke="none"
        />
      )}

      {/* Midline at y=0 */}
      <line
        x1={PADDING_LEFT}
        y1={MIDLINE_Y}
        x2={PADDING_LEFT + PLOT_WIDTH}
        y2={MIDLINE_Y}
        stroke="#888"
        strokeWidth="1"
        strokeDasharray="4 2"
      />

      {/* Y-axis grid lines and labels */}
      {yAxisLabels.map((val) => {
        const y = pawnsToY(val);
        return (
          <g key={`y-${val}`}>
            {val !== 0 && (
              <line
                x1={PADDING_LEFT}
                y1={y}
                x2={PADDING_LEFT + PLOT_WIDTH}
                y2={y}
                stroke="#ddd"
                strokeWidth="0.5"
              />
            )}
            <text
              x={PADDING_LEFT - 5}
              y={y + 4}
              textAnchor="end"
              fontSize="10"
              fill="#666"
            >
              {val > 0 ? `+${val}` : val}
            </text>
          </g>
        );
      })}

      {/* Evaluation line */}
      {linePath && (
        <path
          d={linePath}
          fill="none"
          stroke="#2563eb"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}

      {/* Placeholder dots for unevaluated positions */}
      {placeholderDots.map((dot) => (
        <circle
          key={`placeholder-${dot.index}`}
          cx={dot.x}
          cy={MIDLINE_Y}
          r="3"
          fill="#ccc"
          stroke="#999"
          strokeWidth="0.5"
          strokeDasharray="2 1"
          opacity="0.6"
        />
      ))}

      {/* Blunder and mistake markers */}
      {points.map((point) => {
        // point.index 0 is starting position, classifications are for moves (index 1+)
        const moveIdx = point.index - 1;
        const grade = classificationMap.get(moveIdx);
        if (grade === "blunder") {
          return (
            <circle
              key={`blunder-${point.index}`}
              cx={point.x}
              cy={point.y}
              r="5"
              fill="#ef4444"
              stroke="#991b1b"
              strokeWidth="1.5"
            />
          );
        }
        if (grade === "mistake") {
          return (
            <circle
              key={`mistake-${point.index}`}
              cx={point.x}
              cy={point.y}
              r="4"
              fill="#f97316"
              stroke="#9a3412"
              strokeWidth="1.5"
            />
          );
        }
        return null;
      })}

      {/* Current move marker */}
      {currentMarker && (
        <circle
          cx={currentMarker.x}
          cy={currentMarker.y}
          r="6"
          fill="#3b82f6"
          stroke="#fff"
          strokeWidth="2"
        />
      )}

      {/* X-axis label */}
      <text
        x={PADDING_LEFT + PLOT_WIDTH / 2}
        y={GRAPH_HEIGHT - 5}
        textAnchor="middle"
        fontSize="11"
        fill="#666"
      >
        Move Number
      </text>

      {/* Y-axis label */}
      <text
        x="12"
        y={PADDING_TOP + PLOT_HEIGHT / 2}
        textAnchor="middle"
        fontSize="11"
        fill="#666"
        transform={`rotate(-90, 12, ${PADDING_TOP + PLOT_HEIGHT / 2})`}
      >
        Eval (pawns)
      </text>
    </svg>
  );
}

export default EvalGraph;
