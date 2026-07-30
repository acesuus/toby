"use client";

import Image from "next/image";
import type { MoveGrade } from "@/lib/types";

interface CoachDialogueProps {
  /** Toby's line for the current position. */
  text: string;
  /** Grade of the current move, used for a subtle accent (optional). */
  grade?: MoveGrade | null;
  /** 1-based position in the walkthrough, e.g. "3 of 40". */
  step: number;
  totalSteps: number;
  /** Step controls. */
  onPrev: () => void;
  onNext: () => void;
  onExit: () => void;
  canPrev: boolean;
  canNext: boolean;
  /** When true, show a skeleton placeholder instead of the coaching text. */
  loading?: boolean;
}

const GRADE_ACCENT: Record<MoveGrade, string> = {
  brilliant: "text-[var(--accent)]",
  book: "text-[var(--ink-muted)]",
  best: "text-[var(--accent)]",
  excellent: "text-[var(--good)]",
  good: "text-[var(--accent)]",
  inaccuracy: "text-[var(--caution)]",
  mistake: "text-[var(--caution)]",
  blunder: "text-[var(--danger)]",
};

const GRADE_LABEL: Record<MoveGrade, string> = {
  brilliant: "Brilliant",
  book: "Book",
  best: "Best move",
  excellent: "Excellent",
  good: "Good",
  inaccuracy: "Inaccuracy",
  mistake: "Mistake",
  blunder: "Blunder",
};

export function CoachDialogue({
  text,
  grade,
  step,
  totalSteps,
  onPrev,
  onNext,
  onExit,
  canPrev,
  canNext,
  loading,
}: CoachDialogueProps) {
  return (
    <section
      aria-label="Toby's coaching"
      className="relative h-28 shrink-0 border-b border-[var(--border)] bg-[var(--control)] px-4 py-2 pl-[4.5rem]"
    >
      {/* Mascot — anchored bottom-left, sized to fill panel height */}
      <div className="absolute bottom-1 left-1.5 top-1 w-12" aria-hidden="true">
        <Image src="/mascot/toby_png.png" alt="" fill sizes="48px" className="object-contain object-bottom" />
      </div>

      <div className="flex h-full min-w-0 flex-col justify-between">
          <div className="flex shrink-0 items-center justify-between gap-2">
            <span className="font-serif text-xs font-semibold text-[var(--ink)]">Toby</span>
            <div className="flex items-center gap-2">
              <span className={`inline-block min-w-[4.75rem] text-right text-[10px] font-semibold ${grade ? GRADE_ACCENT[grade] : "text-transparent"}`} aria-hidden={!grade}>
                {grade ? GRADE_LABEL[grade] : "\u00A0"}
              </span>
              <span className="font-mono text-[10px] text-[var(--ink-muted)]">
                {step} / {totalSteps}
              </span>
            </div>
          </div>

          {loading ? (
            <div className="mt-0.5 space-y-1.5" aria-label="Loading coaching comment">
              <div className="h-3.5 w-3/4 animate-pulse rounded bg-[var(--border)]" />
              <div className="h-3.5 w-1/2 animate-pulse rounded bg-[var(--border)]" />
            </div>
          ) : (
            <div className="mt-0.5 max-h-10 overflow-y-auto">
              <p
                className="text-[13px] leading-5 text-[var(--ink)]"
                aria-live="polite"
              >
                {text}
              </p>
            </div>
          )}

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onPrev}
              disabled={!canPrev}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-2.5 py-1 text-[11px] font-semibold text-[var(--ink)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={onNext}
              disabled={!canNext}
              className="rounded-lg bg-[var(--accent)] px-3 py-1 text-[11px] font-semibold text-[#fffaf0] transition-colors hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {canNext ? "Next →" : "Done"}
            </button>
            <button
              type="button"
              onClick={onExit}
              className="ml-auto rounded-lg px-2 py-1 text-[11px] font-semibold text-[var(--ink-muted)] transition-colors hover:text-[var(--ink)]"
            >
              Exit review
            </button>
          </div>
        </div>
    </section>
  );
}
