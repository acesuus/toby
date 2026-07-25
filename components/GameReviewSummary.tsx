"use client";

import Image from "next/image";
import type { MoveGrade } from "@/lib/types";

interface GameReviewSummaryProps {
  whiteName: string;
  blackName: string;
  whiteAccuracy: number;
  blackAccuracy: number;
  whiteWinPercent: number;
  whiteClassifications: Record<MoveGrade, number>;
  blackClassifications: Record<MoveGrade, number>;
  coachComment?: string;
  llmSummary?: string | null;
  onStartReview: () => void;
}

// ---------------------------------------------------------------------------
// Icons — simple recognizable shapes with a small twist of personality
// ---------------------------------------------------------------------------

function BrilliantIcon({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path d="M8 1.5L9.2 6.2L14 8L9.2 9.8L8 14.5L6.8 9.8L2 8L6.8 6.2L8 1.5Z" fill="currentColor" />
    </svg>
  );
}

function BestIcon({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <circle cx="8" cy="8" r="6.5" fill="currentColor" opacity="0.15" />
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M5 8.2L7.2 10.3L11 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ExcellentIcon({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path d="M4 10L8 5L12 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 7V14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function GoodIcon({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path d="M5 7.5L6.8 3.5C7 3 7.5 2.8 8 3C8.5 3.2 8.8 3.8 8.6 4.3L7.8 6.5H12C12.8 6.5 13.3 7.3 13 8L11.5 12.5C11.3 13 10.8 13.5 10.2 13.5H5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="2.5" y="7" width="2.5" height="6.5" rx="0.8" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

function InaccuracyIcon({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path d="M3 8C4.5 5 5.5 11 7 8C8.5 5 9.5 11 11 8C12.5 5 13 8 13 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function MistakeIcon({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path d="M4 6L8 11L12 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 2V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function BlunderIcon({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <circle cx="8" cy="8" r="6" fill="currentColor" opacity="0.12" />
      <path d="M5.5 5.5L10.5 10.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M10.5 5.5L5.5 10.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

const classifications: Array<{
  key: MoveGrade;
  label: string;
  symbol: string;
  symbolClass: string;
  badgeClass: string;
}> = [
  { key: "brilliant", label: "Brilliant", symbol: "!!", symbolClass: "text-[#c9a227]", badgeClass: "bg-[#3a2f0a]" },
  { key: "best", label: "Best", symbol: "★", symbolClass: "text-[#7cb45e]", badgeClass: "bg-[#1a2e14]" },
  { key: "excellent", label: "Excellent", symbol: "!", symbolClass: "text-[#96bc4b]", badgeClass: "bg-[#222e18]" },
  { key: "good", label: "Good", symbol: "✓", symbolClass: "text-[#a8cc6b]", badgeClass: "bg-[#2a3320]" },
  { key: "inaccuracy", label: "Inaccuracy", symbol: "?!", symbolClass: "text-[#d4a83a]", badgeClass: "bg-[#352c10]" },
  { key: "mistake", label: "Mistake", symbol: "?", symbolClass: "text-[#e08c3a]", badgeClass: "bg-[#3a2212]" },
  { key: "blunder", label: "Blunder", symbol: "??", symbolClass: "text-[#d45a4a]", badgeClass: "bg-[#3a1612]" },
];

// ---------------------------------------------------------------------------
// Accuracy ring component
// ---------------------------------------------------------------------------

function AccuracyRing({ accuracy, label }: { accuracy: number; label: string }) {
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (accuracy / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative size-[60px]">
        <svg width="60" height="60" viewBox="0 0 60 60" className="rotate-[-90deg]">
          <circle cx="30" cy="30" r={radius} fill="none" stroke="var(--border)" strokeWidth="4" />
          <circle
            cx="30"
            cy="30"
            r={radius}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-sm font-bold tabular-nums text-[var(--ink)]">
          {accuracy.toFixed(0)}
        </span>
      </div>
      <span className="max-w-[5rem] truncate text-[10px] font-medium text-[var(--ink-muted)]">{label}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function GameReviewSummary({
  whiteName,
  blackName,
  whiteAccuracy,
  blackAccuracy,
  whiteClassifications,
  blackClassifications,
  coachComment,
  llmSummary,
  onStartReview,
}: GameReviewSummaryProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] shadow-[var(--shadow-card)]">
      {/* Review heading */}
      <div className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-3">
        <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-full bg-[var(--accent-soft)]" aria-hidden="true">
          <Image src="/mascot/toby_vector.svg" alt="" width={36} height={36} unoptimized className="size-full object-contain" />
        </span>
        <div className="min-w-0">
          <h2 className="font-serif text-sm font-semibold text-[var(--ink)]">Game review</h2>
          <p className="truncate text-[11px] text-[var(--ink-muted)]">
            {llmSummary || coachComment || "Let’s see how you played."}
          </p>
        </div>
      </div>

      <div className="p-3">
        {/* One shared grid keeps every count directly below its score ring. */}
        <div
          className="grid items-end gap-x-2 border-b border-[var(--border)] pb-3"
          style={{ gridTemplateColumns: "minmax(7rem, 1fr) 60px 34px 60px" }}
        >
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--ink-muted)]">Move quality</p>
            <p className="mt-1 text-[11px] text-[var(--ink-muted)]">Accuracy</p>
          </div>
          <AccuracyRing accuracy={whiteAccuracy} label={whiteName} />
          <span className="self-center text-center font-serif text-[11px] font-semibold text-[var(--ink-muted)]">vs</span>
          <AccuracyRing accuracy={blackAccuracy} label={blackName} />
        </div>

        <div className="divide-y divide-[var(--border)]">
          {classifications.map(({ key, label, symbol, symbolClass, badgeClass }) => {
            const wCount = whiteClassifications[key] ?? 0;
            const bCount = blackClassifications[key] ?? 0;

            return (
              <div
                key={key}
                className="grid min-h-10 items-center gap-x-2"
                style={{ gridTemplateColumns: "minmax(7rem, 1fr) 60px 34px 60px" }}
              >
                <span className="text-xs font-medium text-[var(--ink)]">{label}</span>
                <span className="text-center text-sm font-bold tabular-nums text-[var(--ink)]">{wCount}</span>
                <span
                  className={`grid size-7 place-items-center justify-self-center rounded-full font-mono text-[10px] font-black leading-none shadow-sm ${badgeClass} ${symbolClass}`}
                  title={label}
                  aria-label={`${label} classification`}
                >
                  {symbol}
                </span>
                <span className="text-center text-sm font-bold tabular-nums text-[var(--ink)]">{bCount}</span>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onStartReview}
          className="mt-3 w-full rounded-xl bg-[var(--accent)] py-3 text-sm font-bold text-[#fffaf0] shadow-sm transition hover:-translate-y-px hover:bg-[var(--accent-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] active:translate-y-0 motion-reduce:transform-none"
        >
          Start review
        </button>
      </div>
    </section>
  );
}
