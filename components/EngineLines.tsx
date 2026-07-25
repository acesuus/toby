"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import type { EngineLine, EvalScore } from "@/lib/types";

export type EngineAnalysisStatus = "initializing" | "analyzing" | "ready" | "error";

interface EngineLinesProps {
  fen: string;
  lines: EngineLine[];
  status: EngineAnalysisStatus;
  depth: number;
  multiThreaded: boolean;
  errorMessage?: string | null;
  onDepthChange: (depth: number) => void;
  /** Called when the user clicks a move in a PV line; receives the FEN after that move */
  onPvMoveClick?: (fen: string) => void;
}

export function getDepthValidationError(depth: number): string | null {
  return Number.isInteger(depth) && depth >= 10 && depth <= 25
    ? null
    : "Enter a whole number from 10 to 25.";
}

function formatEval(score: EvalScore): string {
  if (score.type === "mate") {
    const n = Math.abs(score.value);
    return score.value >= 0 ? `M${n}` : `−M${n}`;
  }
  const pawns = score.value / 100;
  return `${pawns > 0 ? "+" : ""}${pawns.toFixed(2)}`;
}

interface PvToken {
  label: string;
  fen: string;
}

function parsePvTokens(fen: string, uciMoves: string[], maxPlies = 10): PvToken[] {
  let chess: Chess;
  try { chess = new Chess(fen); } catch { return []; }
  const parts = fen.split(" ");
  let moveNum = parseInt(parts[5] || "1", 10);
  let whiteToMove = parts[1] !== "b";
  const tokens: PvToken[] = [];

  for (let i = 0; i < Math.min(uciMoves.length, maxPlies); i++) {
    const uci = uciMoves[i];
    let san: string;
    try {
      const move = chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.length > 4 ? uci.slice(4) : undefined });
      if (!move) break;
      san = move.san;
    } catch { break; }
    const label = whiteToMove
      ? `${moveNum}. ${san}`
      : i === 0 ? `${moveNum}... ${san}` : san;
    tokens.push({ label, fen: chess.fen() });
    if (!whiteToMove) moveNum++;
    whiteToMove = !whiteToMove;
  }
  return tokens;
}
function AnalysisIcon() {
  return (
    <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 15.5h12M5.5 12.5l3-3 2.5 2 4-5" />
      <circle cx="15" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="10" cy="10" r="2.5" />
      <path d="M10 2.5v2M10 15.5v2M17.5 10h-2M4.5 10h-2M15.3 4.7l-1.4 1.4M6.1 13.9l-1.4 1.4M15.3 15.3l-1.4-1.4M6.1 6.1 4.7 4.7" />
    </svg>
  );
}

export function EngineLines({ fen, lines, status, depth, multiThreaded, errorMessage, onDepthChange, onPvMoveClick }: EngineLinesProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [draftDepth, setDraftDepth] = useState(String(depth));
  const [validationError, setValidationError] = useState<string | null>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const rows = useMemo(() => lines.map((line) => ({
    multipv: line.multipv,
    evalText: formatEval(line.score),
    positive: line.score.value >= 0,
    tokens: parsePvTokens(fen, line.pv),
  })), [lines, fen]);

  useEffect(() => {
    if (!isSettingsOpen) return;
    inputRef.current?.focus();

    const handlePointerDown = (event: PointerEvent) => {
      if (!settingsRef.current?.contains(event.target as Node)) setIsSettingsOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setIsSettingsOpen(false);
      settingsButtonRef.current?.focus();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSettingsOpen]);

  const statusText = status === "initializing"
    ? "Starting Stockfish…"
    : status === "analyzing"
      ? `Analyzing this position at depth ${depth}…`
      : status === "error"
        ? errorMessage || "Engine error"
        : `Ready at depth ${depth} · ${multiThreaded ? "multi-core" : "single-core"}`;

  const toggleSettings = () => {
    setDraftDepth(String(depth));
    setValidationError(null);
    setIsSettingsOpen((open) => !open);
  };

  const submitDepth = (event: { preventDefault: () => void }) => {
    event.preventDefault();
    const nextDepth = Number(draftDepth);
    const nextError = getDepthValidationError(nextDepth);
    setValidationError(nextError);
    if (nextError) return;
    onDepthChange(nextDepth);
    setIsSettingsOpen(false);
    settingsButtonRef.current?.focus();
  };

  return (
    <section aria-labelledby="engine-heading" className="relative">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-2.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[var(--accent)]">
            <AnalysisIcon />
            <h2 id="engine-heading" className="font-serif text-sm font-semibold text-[var(--ink)]">Engine lines</h2>
          </div>
          <p className={`mt-0.5 truncate text-[9px] font-medium ${status === "error" ? "text-[var(--danger)]" : "text-[var(--ink-muted)]"}`} role="status" aria-live="polite">{statusText}</p>
        </div>
        <div ref={settingsRef} className="relative flex shrink-0 items-center gap-2">
          <span className="rounded-md bg-[var(--control)] px-2 py-1 font-mono text-[9px] font-semibold text-[var(--ink-muted)]">Depth {depth}</span>
          <button ref={settingsButtonRef} type="button" onClick={toggleSettings} aria-label="Engine depth settings" aria-haspopup="dialog" aria-expanded={isSettingsOpen} className="grid size-8 place-items-center rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] text-[var(--ink-muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]">
            <SettingsIcon />
          </button>
          {isSettingsOpen && (
            <form onSubmit={submitDepth} role="dialog" aria-label="Engine depth settings" className="absolute right-0 top-10 z-30 w-56 rounded-xl border border-[var(--border-strong)] bg-[var(--surface-raised)] p-3 shadow-[var(--shadow-card)]">
              <label htmlFor="engine-depth" className="text-xs font-semibold text-[var(--ink)]">Analysis depth</label>
              <p id="engine-depth-hint" className="mt-0.5 text-[10px] leading-4 text-[var(--ink-muted)]">Choose a whole number from 10 to 25.</p>
              <input ref={inputRef} id="engine-depth" type="number" min={10} max={25} step={1} value={draftDepth} onChange={(event) => { setDraftDepth(event.target.value); setValidationError(null); }} aria-describedby={`engine-depth-hint${validationError ? " engine-depth-error" : ""}`} aria-invalid={Boolean(validationError)} className="mt-2 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2 font-mono text-sm text-[var(--ink)]" />
              {validationError && <p id="engine-depth-error" role="alert" className="mt-1 text-[10px] text-[var(--danger)]">{validationError}</p>}
              <div className="mt-3 flex justify-end gap-2">
                <button type="button" onClick={() => { setIsSettingsOpen(false); settingsButtonRef.current?.focus(); }} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[var(--ink-muted)] hover:bg-[var(--control)]">Cancel</button>
                <button type="submit" className="rounded-lg bg-[var(--accent)] px-2.5 py-1.5 text-xs font-semibold text-[#fffaf0] hover:bg-[var(--accent-hover)]">Apply</button>
              </div>
            </form>
          )}
        </div>
      </div>
      <div className="divide-y divide-[var(--border)]">
        {rows.length === 0 && (
          <div className="px-4 py-4 text-xs text-[var(--ink-muted)]" role="status">
            {status === "initializing"
              ? "Preparing the local engine…"
              : status === "analyzing"
                ? "Calculating the strongest continuations…"
                : status === "error"
                  ? "Analysis is unavailable for this position."
                  : "No candidate lines available."}
          </div>
        )}
        {rows.map((row) => (
          <div key={row.multipv} className="group flex items-start gap-3 px-4 py-2.5 transition-colors hover:bg-[var(--control)]">
            <span className={`min-w-[3.35rem] shrink-0 rounded-md border px-1.5 py-1 text-center font-mono text-[11px] font-bold tabular-nums ${row.positive ? "border-[var(--border)] bg-[var(--eval-light)] text-[#2e2620]" : "border-[#2e2620] bg-[var(--eval-dark)] text-[#f7f2e7]"}`}>
              {row.evalText}
            </span>
            <span className="flex min-w-0 flex-wrap gap-x-1 gap-y-0.5 pt-0.5 font-mono text-xs leading-5">
              {row.tokens.length === 0 && <span className="text-[var(--ink-muted)]">Line unavailable</span>}
              {row.tokens.map((token, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => onPvMoveClick?.(token.fen)}
                  className="rounded px-0.5 text-[var(--ink)] transition-colors hover:bg-[var(--accent-soft)] hover:text-[var(--accent)] focus-visible:outline-1 focus-visible:outline-[var(--accent)]"
                  title={`Navigate to this position`}
                >
                  {token.label}
                </button>
              ))}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
