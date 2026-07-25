"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Chessboard } from "react-chessboard";
import { useGameReview } from "@/lib/game-review-context";

const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export default function Board({ previewFen }: { previewFen?: string | null }) {
  const { state } = useGameReview();
  const { parsedGame, currentMoveIndex } = state;
  const containerRef = useRef<HTMLDivElement>(null);
  const [boardWidth, setBoardWidth] = useState(400);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setBoardWidth(Math.floor(entry.contentRect.width));
    });
    observer.observe(container);
    setBoardWidth(Math.floor(container.clientWidth));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  const currentFen = useMemo(() => {
    if (previewFen) return previewFen;
    if (!parsedGame) return STARTING_FEN;
    if (currentMoveIndex === -1) return parsedGame.startingFen;
    return parsedGame.moves[currentMoveIndex].fenAfter;
  }, [previewFen, parsedGame, currentMoveIndex]);

  const squareStyles = useMemo<Record<string, React.CSSProperties>>(() => {
    if (!parsedGame || currentMoveIndex < 0) return {};
    const uci = parsedGame.moves[currentMoveIndex].uci;
    if (uci.length < 4) return {};
    const highlightStyle: React.CSSProperties = {
      backgroundColor: "rgba(193, 121, 59, 0.5)",
      boxShadow: "inset 0 0 0 3px rgba(92, 110, 81, 0.62)",
      transition: reduceMotion ? "none" : "background-color 150ms ease, box-shadow 150ms ease",
    };
    return { [uci.slice(0, 2)]: highlightStyle, [uci.slice(2, 4)]: highlightStyle };
  }, [parsedGame, currentMoveIndex, reduceMotion]);

  return (
    <div ref={containerRef} className="aspect-square w-full max-w-[720px] overflow-hidden rounded-xl bg-[var(--board-dark)] shadow-[var(--shadow-board)] ring-1 ring-[var(--border-strong)]" role="img" aria-label={parsedGame ? `Chess board showing position after move ${currentMoveIndex + 1}` : "Chess board showing starting position"}>
      <Chessboard options={{
        position: currentFen,
        allowDragging: false,
        allowDrawingArrows: false,
        squareStyles,
        showNotation: true,
        animationDurationInMs: reduceMotion ? 0 : 180,
        lightSquareStyle: { backgroundColor: "#F2E6D3" },
        darkSquareStyle: { backgroundColor: "#6B4A38" },
        lightSquareNotationStyle: { color: "rgba(107, 74, 56, 0.72)", fontFamily: "var(--font-jetbrains-mono)", fontWeight: 700 },
        darkSquareNotationStyle: { color: "rgba(242, 230, 211, 0.72)", fontFamily: "var(--font-jetbrains-mono)", fontWeight: 700 },
        boardStyle: { width: `${boardWidth}px`, height: `${boardWidth}px`, borderRadius: "12px" },
      }} />
    </div>
  );
}
