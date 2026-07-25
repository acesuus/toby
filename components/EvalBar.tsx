"use client";

import { useMemo } from "react";
import { evalToWinPercent } from "@/lib/win-percent";
import type { EvalScore } from "@/lib/types";

interface EvalBarProps {
  score: EvalScore | null;
  isLoading?: boolean;
}

export function formatEvaluation(score: EvalScore): string {
  if (score.type === "mate") {
    const n = Math.abs(score.value);
    if (n === 0) return "Mate";
    return score.value > 0 ? `M${n}` : `−M${n}`;
  }
  const pawns = score.value / 100;
  return `${pawns > 0 ? "+" : ""}${pawns.toFixed(2)}`;
}

function describeEvaluation(score: EvalScore | null, isLoading: boolean): string {
  if (!score) return isLoading ? "Evaluation pending" : "Evaluation unavailable";
  if (score.type === "mate") {
    if (score.value === 0) return "Checkmate";
    return `${score.value > 0 ? "White" : "Black"} has mate in ${Math.abs(score.value)}`;
  }
  if (score.value === 0) return "Position is equal, 0.00";
  return `${score.value > 0 ? "White" : "Black"} advantage, ${formatEvaluation(score)}`;
}

export function EvalBar({ score, isLoading = false }: EvalBarProps) {
  const model = useMemo(() => {
    const semanticPercent = score ? evalToWinPercent(score, "white") : 50;
    return {
      semanticPercent,
      visualPercent: Math.max(2, Math.min(98, semanticPercent)),
      label: score ? formatEvaluation(score) : "",
      description: describeEvaluation(score, isLoading),
      whiteLeading: (score?.value ?? 0) >= 0,
    };
  }, [score, isLoading]);

  return (
    <div
      className="relative w-6 shrink-0 self-stretch select-none overflow-hidden rounded-lg border border-[var(--border-strong)] bg-[var(--eval-dark)] shadow-[0_8px_20px_rgba(46,38,32,0.14)] sm:w-8"
      role="meter"
      aria-label="Stockfish position evaluation"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(model.semanticPercent)}
      aria-valuetext={model.description}
      aria-busy={isLoading && !score}
    >
      <div className="absolute inset-0 bg-[var(--eval-dark)]" aria-hidden="true" />
      <div className="absolute inset-x-0 bottom-0 bg-[var(--eval-light)] transition-[height] duration-300 ease-out motion-reduce:transition-none" style={{ height: `${model.visualPercent}%` }} aria-hidden="true" />
      <div className="absolute inset-x-0 top-1/2 h-px bg-[var(--accent-warm)]/50" aria-hidden="true" />
      <span className="absolute left-1/2 top-2 -translate-x-1/2 font-mono text-[7px] font-semibold tracking-widest text-[#f7f2e7]/65 [writing-mode:vertical-rl] sm:text-[8px]" aria-hidden="true">BLACK</span>
      <span className="absolute bottom-2 left-1/2 -translate-x-1/2 rotate-180 font-mono text-[7px] font-semibold tracking-widest text-[#2e2620]/60 [writing-mode:vertical-rl] sm:text-[8px]" aria-hidden="true">WHITE</span>
      {model.label ? (
        <span className={`absolute inset-x-0 z-10 text-center font-mono text-[8px] font-bold tabular-nums sm:text-[9px] ${model.whiteLeading ? "bottom-7 text-[#2e2620]" : "top-7 text-[#f7f2e7]"}`} aria-hidden="true">
          {model.label}
        </span>
      ) : (
        <span className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 font-mono text-[10px] font-bold text-[#f7f2e7]/75" aria-hidden="true">…</span>
      )}
    </div>
  );
}
