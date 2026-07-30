"use client";

import { forwardRef, useCallback, useEffect, useRef } from "react";
import { useGameReview } from "@/lib/game-review-context";
import type { MoveGrade } from "@/lib/types";

const GRADE_STYLES: Record<MoveGrade, string> = {
  brilliant: "bg-[color-mix(in_srgb,#e6a817_20%,transparent)] text-[#e6a817]",
  book: "bg-[color-mix(in_srgb,var(--ink-muted)_12%,transparent)] text-[var(--ink-muted)]",
  best: "bg-[var(--accent-soft)] text-[var(--accent)]",
  excellent: "bg-[color-mix(in_srgb,var(--good)_24%,transparent)] text-[color-mix(in_srgb,var(--good)_70%,var(--ink))]",
  good: "bg-[color-mix(in_srgb,var(--good)_15%,transparent)] text-[var(--accent)]",
  inaccuracy: "bg-[color-mix(in_srgb,var(--caution)_18%,transparent)] text-[var(--caution)]",
  mistake: "bg-[color-mix(in_srgb,var(--caution)_27%,transparent)] text-[var(--caution)]",
  blunder: "bg-[color-mix(in_srgb,var(--danger)_17%,transparent)] text-[var(--danger)]",
};

const GRADE_MARKERS: Record<MoveGrade, string> = {
  brilliant: "✦ Brilliant",
  book: "◇ Book",
  best: "★ Best",
  excellent: "✓ Great",
  good: "+ Good",
  inaccuracy: "?! Inacc.",
  mistake: "? Mist.",
  blunder: "?? Blunder",
};

const GRADE_LABELS: Record<MoveGrade, string> = {
  brilliant: "Brilliant move", book: "Book move", best: "Best move", excellent: "Excellent move", good: "Good move",
  inaccuracy: "Inaccuracy", mistake: "Mistake", blunder: "Blunder",
};

interface MoveRow {
  moveNumber: number;
  white: { index: number; san: string } | null;
  black: { index: number; san: string } | null;
}

export function MoveList() {
  const { state, dispatch } = useGameReview();
  const { parsedGame, classifiedMoves, currentMoveIndex } = state;
  const listRef = useRef<HTMLOListElement>(null);
  const activeMoveRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    activeMoveRef.current?.scrollIntoView({
      block: "nearest",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  }, [currentMoveIndex]);

  const handleMoveClick = useCallback((moveIndex: number) => {
    dispatch({ type: "navigateToMove", payload: moveIndex });
  }, [dispatch]);

  if (!parsedGame || parsedGame.moves.length === 0) {
    return <div className="p-4 text-sm text-[var(--ink-muted)]">No moves to display.</div>;
  }

  const moveRows: MoveRow[] = [];
  for (let i = 0; i < parsedGame.moves.length; i++) {
    const move = parsedGame.moves[i];
    if (move.color === "white") {
      moveRows.push({ moveNumber: move.moveNumber, white: { index: i, san: move.san }, black: null });
    } else {
      const lastRow = moveRows[moveRows.length - 1];
      if (lastRow && lastRow.moveNumber === move.moveNumber) lastRow.black = { index: i, san: move.san };
      else moveRows.push({ moveNumber: move.moveNumber, white: null, black: { index: i, san: move.san } });
    }
  }

  const gradeByIndex = new Map<number, MoveGrade>();
  for (const classified of classifiedMoves) {
    const index = parsedGame.moves.findIndex((move) => move.moveNumber === classified.moveNumber && move.color === classified.color);
    if (index !== -1) gradeByIndex.set(index, classified.grade);
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col" aria-labelledby="moves-heading">
      <div className="flex items-center justify-between border-y border-[var(--border)] px-4 py-2.5">
        <h2 id="moves-heading" className="font-serif text-sm font-semibold text-[var(--ink)]">Game moves</h2>
        <span className="font-mono text-[10px] text-[var(--ink-muted)]">{parsedGame.moves.length} moves</span>
      </div>
      <ol ref={listRef} className="min-h-48 flex-1 space-y-0.5 overflow-y-auto p-2 lg:min-h-0" aria-label="Game moves">
        {moveRows.map((row) => (
          <li key={row.moveNumber} className="grid grid-cols-[2rem_minmax(0,1fr)_minmax(0,1fr)] items-center gap-1 rounded-lg transition-colors hover:bg-[var(--control)]">
            <span className="pr-1 text-right font-mono text-[10px] tabular-nums text-[var(--ink-muted)]">{row.moveNumber}.</span>
            {row.white ? (
              <MoveButton ref={row.white.index === currentMoveIndex ? activeMoveRef : null} san={row.white.san} grade={gradeByIndex.get(row.white.index)} isActive={row.white.index === currentMoveIndex} onClick={() => handleMoveClick(row.white!.index)} label={`Move ${row.moveNumber} white: ${row.white.san}`} />
            ) : <span />}
            {row.black ? (
              <MoveButton ref={row.black.index === currentMoveIndex ? activeMoveRef : null} san={row.black.san} grade={gradeByIndex.get(row.black.index)} isActive={row.black.index === currentMoveIndex} onClick={() => handleMoveClick(row.black!.index)} label={`Move ${row.moveNumber} black: ${row.black.san}`} />
            ) : <span />}
          </li>
        ))}
      </ol>
    </section>
  );
}

interface MoveButtonProps {
  san: string;
  grade?: MoveGrade;
  isActive: boolean;
  onClick: () => void;
  label: string;
}

const MoveButton = forwardRef<HTMLButtonElement, MoveButtonProps>(function MoveButton({ san, grade, isActive, onClick, label }, ref) {
  const gradeLabel = grade ? GRADE_LABELS[grade] : undefined;
  return (
    <button ref={ref} type="button" onClick={onClick} aria-label={`${label}${gradeLabel ? `, ${gradeLabel}` : ""}`} aria-current={isActive ? "true" : undefined} className={`min-w-0 w-full rounded-md px-2.5 py-1.5 text-left font-mono text-xs transition-all active:scale-[0.98] ${isActive ? "bg-[color-mix(in_srgb,var(--accent)_15%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--accent)_60%,transparent)] font-bold text-[var(--accent)] shadow-sm" : "text-[var(--ink)] hover:bg-[var(--control)] hover:text-[var(--accent)]"}`}>
      <span className="flex min-w-0 items-center gap-1.5">
        <span className="min-w-0 flex-1 truncate">{san}</span>
        {grade && (
          <span className={`shrink-0 rounded px-1 py-0.5 font-sans text-[8px] font-bold leading-none ${isActive ? "bg-white/16 text-white" : GRADE_STYLES[grade]}`} title={gradeLabel} aria-hidden="true">
            {GRADE_MARKERS[grade]}
          </span>
        )}
      </span>
    </button>
  );
});
