"use client";

import { useMemo } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";

interface MiniBoardPreviewProps {
  pgn: string;
  className?: string;
}

export function MiniBoardPreview({ pgn, className }: MiniBoardPreviewProps) {
  const fen = useMemo(() => {
    try {
      const chess = new Chess();
      chess.loadPgn(pgn);
      return chess.fen();
    } catch (e) {
      return "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    }
  }, [pgn]);

  return (
    <div className={className || "aspect-square w-16 h-16 sm:w-20 sm:h-20 overflow-hidden rounded shadow-sm border border-[#3c3b39]"}>
      <Chessboard
        position={fen}
        allowDragging={false}
        allowDrawingArrows={false}
        showNotation={false}
        animationDurationInMs={0}
        lightSquareStyle={{ backgroundColor: "#F2E6D3" }}
        darkSquareStyle={{ backgroundColor: "#6B4A38" }}
      />
    </div>
  );
}
