"use client";

import { useGameReview } from "@/lib/game-review-context";
import type { CriticalMoment, MoveGrade, SideAccuracy } from "@/lib/types";

const GRADE_ORDER: MoveGrade[] = ["brilliant", "book", "best", "excellent", "good", "inaccuracy", "mistake", "blunder"];
const GRADE_COLORS: Record<MoveGrade, string> = {
  brilliant: "bg-[#e6a817]", book: "bg-[var(--ink-muted)]", best: "bg-[var(--accent)]", excellent: "bg-[var(--good)]",
  good: "bg-[color-mix(in_srgb,var(--good)_70%,var(--surface))]", inaccuracy: "bg-[var(--caution)]",
  mistake: "bg-[var(--accent-warm)]", blunder: "bg-[var(--danger)]",
};
const GRADE_TEXT: Record<MoveGrade, string> = {
  brilliant: "text-[#e6a817]", book: "text-[var(--ink-muted)]", best: "text-[var(--accent)]", excellent: "text-[var(--good)]",
  good: "text-[var(--accent)]", inaccuracy: "text-[var(--caution)]", mistake: "text-[var(--accent-warm)]", blunder: "text-[var(--danger)]",
};
const GRADE_LABELS: Record<MoveGrade, string> = {
  brilliant: "✦ Brilliant", book: "◇ Book", best: "★ Best", excellent: "✓ Excellent", good: "+ Good",
  inaccuracy: "?! Inaccuracy", mistake: "? Mistake", blunder: "?? Blunder",
};

const sectionTitle = "mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--ink-muted)]";
const warmCard = "rounded-xl border border-[var(--border)] bg-[var(--control)] p-3";

export function GameSummary() {
  const { state } = useGameReview();
  const { gameAccuracy } = state;
  if (!gameAccuracy) return <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 text-center text-sm text-[var(--ink-muted)]">Complete analysis to see the game summary.</div>;
  const { white, black, opening, criticalMoments } = gameAccuracy;

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-card)] sm:p-6">
      <div className="mb-5 flex flex-col gap-2 border-b border-[var(--border)] pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--accent)]">Review complete</p><h2 className="mt-1 font-serif text-2xl font-semibold text-[var(--ink)]">Game summary</h2></div>
        <div className="text-sm text-[var(--ink-muted)]"><span className="mr-2 rounded-md bg-[var(--accent-soft)] px-2 py-1 font-mono text-xs font-bold text-[var(--accent)]">{opening.eco || "—"}</span>{opening.name}{opening.moves > 0 && <span className="ml-1 text-xs">· {opening.moves} plies</span>}</div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_1fr_1.35fr]">
        <section aria-label="Accuracy scores">
          <h3 className={sectionTitle}>Accuracy</h3>
          <div className="grid grid-cols-2 gap-2"><AccuracyCard side="white" data={white} /><AccuracyCard side="black" data={black} /></div>
        </section>
        <section aria-label="Average centipawn loss">
          <h3 className={sectionTitle}>Average loss</h3>
          <div className="grid grid-cols-2 gap-2"><CentipawnLossCard side="white" value={white.averageCentipawnLoss} /><CentipawnLossCard side="black" value={black.averageCentipawnLoss} /></div>
        </section>
        <section aria-label="Move grade breakdown">
          <h3 className={sectionTitle}>Move quality</h3>
          <div className="grid grid-cols-2 gap-2"><GradeBreakdown side="white" data={white} /><GradeBreakdown side="black" data={black} /></div>
        </section>
      </div>

      {criticalMoments.length > 0 && (
        <section aria-label="Critical moments" className="mt-5 border-t border-[var(--border)] pt-5">
          <h3 className={sectionTitle}>Critical moments</h3>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{criticalMoments.map((moment, index) => <CriticalMomentItem key={index} moment={moment} />)}</ul>
        </section>
      )}
    </div>
  );
}

function SideLabel({ side }: { side: "white" | "black" }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`size-2.5 rounded-full border ${side === "white" ? "border-[var(--border-strong)] bg-[#f7f2e7]" : "border-[#2e2620] bg-[#2e2620]"}`} aria-hidden="true" />
      <span className="text-[10px] font-semibold capitalize text-[var(--ink-muted)]">{side}</span>
    </div>
  );
}

function AccuracyCard({ side, data }: { side: "white" | "black"; data: SideAccuracy }) {
  return (
    <div className={warmCard}>
      <SideLabel side={side} />
      <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-[var(--ink)]">{data.accuracy.toFixed(1)}<span className="ml-0.5 text-xs font-normal text-[var(--ink-muted)]">%</span></p>
    </div>
  );
}

function GradeBreakdown({ side, data }: { side: "white" | "black"; data: SideAccuracy }) {
  const total = data.moveCount;
  return (
    <div className={warmCard}>
      <SideLabel side={side} />
      {total > 0 && (
        <div className="my-2.5 flex h-1.5 overflow-hidden rounded-full" role="img" aria-label={`Grade distribution for ${side}`}>
          {GRADE_ORDER.map((grade) => {
            const count = data.classifications[grade] ?? 0;
            return count ? <div key={grade} className={GRADE_COLORS[grade]} style={{ width: `${(count / total) * 100}%` }} title={`${GRADE_LABELS[grade]}: ${count}`} /> : null;
          })}
        </div>
      )}
      <div className="space-y-1">
        {GRADE_ORDER.map((grade) => {
          const count = data.classifications[grade] ?? 0;
          return count ? <div key={grade} className="flex items-center justify-between gap-2 text-[9px]"><span className={`truncate ${GRADE_TEXT[grade]}`}>{GRADE_LABELS[grade]}</span><span className="font-mono tabular-nums text-[var(--ink)]">{count}</span></div> : null;
        })}
      </div>
    </div>
  );
}

function CentipawnLossCard({ side, value }: { side: "white" | "black"; value: number }) {
  return (
    <div className={warmCard}>
      <SideLabel side={side} />
      <p className="mt-2 font-mono text-xl font-bold tabular-nums text-[var(--ink)]">{value.toFixed(1)}<span className="ml-1 text-[10px] font-normal text-[var(--ink-muted)]">cp</span></p>
    </div>
  );
}

function CriticalMomentItem({ moment }: { moment: CriticalMoment }) {
  const moveNum = Math.floor(moment.moveIndex / 2) + 1;
  const moveLabel = `${moveNum}${moment.moveIndex % 2 === 0 ? "." : "..."}`;
  return (
    <li className="flex items-start gap-2 rounded-xl border border-[var(--border)] bg-[var(--control)] px-3 py-2.5 text-sm">
      <span className="shrink-0 font-mono text-[10px] font-bold text-[var(--accent-warm)]">{moveLabel}</span>
      <span className="min-w-0 flex-1 text-xs leading-5 text-[var(--ink)]">{moment.description}</span>
      <span className="shrink-0 font-mono text-[10px] font-bold tabular-nums text-[var(--danger)]">{moment.evalSwing > 0 ? "+" : ""}{moment.evalSwing.toFixed(1)}%</span>
    </li>
  );
}
