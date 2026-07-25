"use client";

import { useCallback, useState } from "react";
import { useGameReview } from "@/lib/game-review-context";

interface AnalysisProgressProps { isMultiThreaded?: boolean; }

export function AnalysisProgress({ isMultiThreaded = true }: AnalysisProgressProps) {
  const { state, dispatch } = useGameReview();
  const { analysisStatus, analysisProgress, analysisDepth } = state;
  const [depthInput, setDepthInput] = useState(String(analysisDepth));
  const [depthError, setDepthError] = useState<string | null>(null);
  const isRunning = analysisStatus === "running";
  const percentComplete = Math.round(analysisProgress * 100);

  const handleDepthChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value;
    setDepthInput(raw);
    const parsed = Number(raw);
    if (!raw.trim()) { setDepthError("Depth is required"); return; }
    if (!Number.isInteger(parsed) || parsed < 10 || parsed > 25) {
      setDepthError("Depth must be an integer between 10 and 25");
      return;
    }
    setDepthError(null);
    dispatch({ type: "setDepth", payload: parsed });
  }, [dispatch]);

  return (
    <div className="w-full space-y-3">
      {!isMultiThreaded && (
        <div role="status" className="flex items-start gap-2 rounded-xl border border-[color-mix(in_srgb,var(--caution)_32%,transparent)] bg-[color-mix(in_srgb,var(--caution)_10%,transparent)] p-3 text-sm text-[var(--caution)]">
          <InfoIcon /><p>Running in single-threaded mode — analysis may take a little longer.</p>
        </div>
      )}
      {isRunning && (
        <div role="progressbar" aria-valuenow={percentComplete} aria-valuemin={0} aria-valuemax={100} aria-label={`Analysis progress: ${percentComplete}%`}>
          <div className="mb-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-muted)]"><span>Reviewing game</span><span className="font-mono">{percentComplete}%</span></div>
          <div className="h-1 overflow-hidden rounded-full bg-[var(--border)]"><div className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-300" style={{ width: `${percentComplete}%` }} /></div>
        </div>
      )}
      {analysisStatus === "complete" && <p className="text-sm font-semibold text-[var(--accent)]">Analysis complete</p>}
      {analysisStatus === "idle" && <p className="text-sm text-[var(--ink-muted)]">Ready to analyze</p>}
      <div className="space-y-1.5">
        <label htmlFor="analysis-depth" className="block text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ink-muted)]">Analysis depth</label>
        <div className="flex flex-wrap items-center gap-2">
          <input id="analysis-depth" type="number" min={10} max={25} step={1} value={depthInput} onChange={handleDepthChange} disabled={isRunning} aria-invalid={!!depthError} aria-describedby={depthError ? "depth-error" : "depth-hint"} className={`w-20 rounded-lg border bg-[var(--surface-raised)] px-3 py-2 font-mono text-sm text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-50 ${depthError ? "border-[var(--danger)]" : "border-[var(--border-strong)]"}`} />
          <span id="depth-hint" className="text-xs text-[var(--ink-muted)]">Range: 10–25</span>
        </div>
        {depthError && <p id="depth-error" role="alert" className="text-xs text-[var(--danger)]">{depthError}</p>}
      </div>
    </div>
  );
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className="mt-0.5 size-5 shrink-0" aria-hidden="true">
      <circle cx="10" cy="10" r="7.5" /><path d="M10 9v4M10 6.5h.01" strokeLinecap="round" />
    </svg>
  );
}
