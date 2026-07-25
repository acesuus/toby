"use client";

import { useCallback, useEffect } from "react";
import { useGameReview } from "@/lib/game-review-context";

type IconName = "first" | "previous" | "next" | "last";

function NavIcon({ name }: { name: IconName }) {
  const previous = name === "previous" || name === "first";
  return (
    <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {(name === "first" || name === "last") && <path d={name === "first" ? "M5 4v12" : "M15 4v12"} />}
      <path d={previous ? "m13 4-6 6 6 6" : "m7 4 6 6-6 6"} />
    </svg>
  );
}

export function NavigationControls() {
  const { state, dispatch } = useGameReview();
  const { currentMoveIndex, parsedGame } = state;
  const movesLength = parsedGame?.moves.length ?? 0;
  const isAtStart = currentMoveIndex <= -1;
  const isAtEnd = currentMoveIndex >= movesLength - 1;

  const navigate = useCallback((index: number) => dispatch({ type: "navigateToMove", payload: index }), [dispatch]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const destinations: Record<string, number> = {
        ArrowLeft: currentMoveIndex - 1,
        ArrowRight: currentMoveIndex + 1,
        Home: -1,
        End: movesLength - 1,
      };
      if (e.key in destinations) {
        e.preventDefault();
        navigate(destinations[e.key]);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentMoveIndex, movesLength, navigate]);

  const controls: Array<{ name: IconName; label: string; disabled: boolean; destination: number }> = [
    { name: "first", label: "Go to starting position", disabled: isAtStart, destination: -1 },
    { name: "previous", label: "Go to previous move", disabled: isAtStart, destination: currentMoveIndex - 1 },
    { name: "next", label: "Go to next move", disabled: isAtEnd, destination: currentMoveIndex + 1 },
    { name: "last", label: "Go to last move", disabled: isAtEnd, destination: movesLength - 1 },
  ];

  return (
    <div className="flex items-center justify-between gap-2 border-t border-[var(--border)] bg-[var(--control)] px-3 py-3" aria-label="Move navigation">
      <span className="hidden text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--ink-muted)] sm:block">Navigate</span>
      <div className="flex flex-1 items-center justify-center gap-1.5 sm:flex-none">
        {controls.map((control) => (
          <button key={control.name} type="button" onClick={() => navigate(control.destination)} disabled={control.disabled} aria-label={control.label} title={control.label} className="grid size-9 place-items-center rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] text-[var(--ink)] shadow-[0_1px_2px_rgba(46,38,32,0.06)] transition hover:-translate-y-px hover:border-[var(--accent)] hover:text-[var(--accent)] active:translate-y-0 active:bg-[var(--accent-soft)] disabled:cursor-not-allowed disabled:opacity-35">
            <NavIcon name={control.name} />
          </button>
        ))}
      </div>
      <span className="min-w-14 text-right font-mono text-[10px] tabular-nums text-[var(--ink-muted)]">{currentMoveIndex + 1} / {movesLength}</span>
    </div>
  );
}
