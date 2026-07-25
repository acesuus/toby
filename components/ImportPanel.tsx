"use client";

import { useCallback, useRef, useState } from "react";
import { useGameReview } from "@/lib/game-review-context";
import { MAX_PGN_LENGTH, parsePGN } from "@/lib/pgn-parser";
import { fetchRecentGames, validateUsername } from "@/lib/fetcher";
import type { Platform } from "@/lib/types";

type ImportTab = "pgn" | "chesscom" | "lichess";

const fieldBase = "w-full rounded-xl border bg-[var(--surface-raised)] text-[var(--ink)] placeholder:text-[var(--ink-muted)]/65 shadow-[inset_0_1px_2px_rgba(46,38,32,0.04)] transition hover:border-[var(--border-strong)] disabled:cursor-not-allowed disabled:opacity-55";
const primaryButton = "rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[#fffaf0] shadow-[0_6px_16px_rgba(46,38,32,0.12)] transition hover:-translate-y-px hover:bg-[var(--accent-hover)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-45";
const secondaryButton = "rounded-xl border border-[var(--border-strong)] bg-[var(--surface-raised)] px-3 py-2.5 text-sm font-semibold text-[var(--ink)] transition hover:-translate-y-px hover:border-[var(--accent)] hover:text-[var(--accent)] active:translate-y-0";

export function ImportPanel() {
  const { state, dispatch } = useGameReview();
  const activeTab = (state.importMethod as ImportTab) ?? "pgn";
  const setActiveTab = useCallback((tab: ImportTab) => {
    dispatch({ type: "setImportMethod", payload: tab });
    dispatch({ type: "setError", payload: null });
  }, [dispatch]);

  return (
    <div className="w-full overflow-hidden rounded-2xl">
      <div className="flex overflow-x-auto border-b border-[var(--border)] bg-[var(--control)] px-2 pt-2" role="tablist" aria-label="Game import method">
        <TabButton label="Paste PGN" tab="pgn" activeTab={activeTab} onClick={setActiveTab} />
        <TabButton label="Chess.com" tab="chesscom" activeTab={activeTab} onClick={setActiveTab} />
        <TabButton label="Lichess" tab="lichess" activeTab={activeTab} onClick={setActiveTab} />
      </div>
      <div className="p-4 sm:p-7">
        {activeTab === "pgn" && <PgnTab />}
        {activeTab === "chesscom" && <PlatformTab platform="chesscom" />}
        {activeTab === "lichess" && <PlatformTab platform="lichess" />}
      </div>
    </div>
  );
}

interface TabButtonProps { label: string; tab: ImportTab; activeTab: ImportTab; onClick: (tab: ImportTab) => void; }
function TabButton({ label, tab, activeTab, onClick }: TabButtonProps) {
  const active = tab === activeTab;
  return (
    <button role="tab" aria-selected={active} aria-controls={`panel-${tab}`} id={`tab-${tab}`} className={`relative min-w-max flex-1 rounded-t-lg px-4 py-3 text-sm font-semibold transition ${active ? "bg-[var(--surface)] text-[var(--ink)] after:absolute after:inset-x-4 after:bottom-0 after:h-0.5 after:rounded-full after:bg-[var(--accent)]" : "text-[var(--ink-muted)] hover:bg-[var(--surface)]/55 hover:text-[var(--ink)]"}`} onClick={() => onClick(tab)}>
      {label}
    </button>
  );
}

function PgnTab() {
  const { dispatch } = useGameReview();
  const [pgnText, setPgnText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const charCount = pgnText.length;
  const isOverLimit = charCount > MAX_PGN_LENGTH;

  const handleParsePgn = useCallback((text: string) => {
    setError(null);
    setSuccess(false);
    if (text.length > MAX_PGN_LENGTH) {
      setError(`PGN exceeds maximum length of ${MAX_PGN_LENGTH.toLocaleString()} characters`);
      return;
    }
    if (text.trim().length === 0) {
      setError("Please enter PGN text or upload a .pgn file");
      return;
    }
    try {
      const parsed = parsePGN(text);
      dispatch({ type: "setParsedGame", payload: parsed });
      dispatch({ type: "setRawPgn", payload: text });
      dispatch({ type: "setError", payload: null });
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to parse PGN");
    }
  }, [dispatch]);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const text = loadEvent.target?.result as string;
      if (text) { setPgnText(text); handleParsePgn(text); }
    };
    reader.onerror = () => setError("Failed to read file");
    reader.readAsText(file);
    event.target.value = "";
  }, [handleParsePgn]);

  return (
    <div role="tabpanel" id="panel-pgn" aria-labelledby="tab-pgn" className="space-y-4">
      <div>
        <h2 className="font-serif text-xl font-semibold text-[var(--ink)]">Review a game</h2>
        <p className="mt-1 text-sm leading-6 text-[var(--ink-muted)]">Paste the full PGN below, or choose a file from your device.</p>
      </div>
      <label htmlFor="pgn-textarea" className="sr-only">Paste your PGN</label>
      <textarea id="pgn-textarea" className={`${fieldBase} h-52 resize-y p-4 font-mono text-xs leading-6 ${error ? "border-[var(--danger)]" : success ? "border-[var(--good)]" : "border-[var(--border-strong)]"}`} placeholder={`[Event "Casual Game"]\n[White "Player1"]\n[Black "Player2"]\n[Result "1-0"]\n\n1. e4 e5 2. Nf3 Nc6 ...`} value={pgnText} onChange={(event) => { setPgnText(event.target.value); setError(null); setSuccess(false); }} aria-invalid={!!error} aria-describedby={error ? "pgn-error" : "pgn-count"} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span id="pgn-count" className={`font-mono text-[10px] tabular-nums ${isOverLimit ? "font-semibold text-[var(--danger)]" : "text-[var(--ink-muted)]"}`}>{charCount.toLocaleString()} / {MAX_PGN_LENGTH.toLocaleString()}</span>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <input ref={fileInputRef} type="file" accept=".pgn,.txt" onChange={handleFileUpload} className="hidden" id="pgn-file-input" aria-label="Upload PGN file" />
          <button type="button" onClick={() => fileInputRef.current?.click()} className={`${secondaryButton} flex-1 sm:flex-none`}>Upload .pgn</button>
          <button type="button" onClick={() => handleParsePgn(pgnText)} disabled={pgnText.trim().length === 0} className={`${primaryButton} flex-1 sm:flex-none`}>Analyze game</button>
        </div>
      </div>
      {error && <p id="pgn-error" role="alert" className="rounded-xl border border-[color-mix(in_srgb,var(--danger)_30%,transparent)] bg-[color-mix(in_srgb,var(--danger)_9%,transparent)] px-3 py-2 text-sm text-[var(--danger)]">{error}</p>}
      {success && <p role="status" className="rounded-xl border border-[color-mix(in_srgb,var(--good)_38%,transparent)] bg-[color-mix(in_srgb,var(--good)_12%,transparent)] px-3 py-2 text-sm font-medium text-[var(--accent)]">Game ready. Opening the review table…</p>}
    </div>
  );
}

interface PlatformTabProps { platform: Platform; }
function PlatformTab({ platform }: PlatformTabProps) {
  const { dispatch } = useGameReview();
  const [username, setUsername] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const platformLabel = platform === "chesscom" ? "Chess.com" : "Lichess";

  const handleBlur = useCallback(() => {
    setValidationError(username.trim() ? validateUsername(platform, username) : null);
  }, [platform, username]);

  const handleSubmit = useCallback(async () => {
    const issue = validateUsername(platform, username);
    if (issue) { setValidationError(issue); return; }
    setValidationError(null);
    setFetchError(null);
    setIsLoading(true);
    try {
      const games = await fetchRecentGames(platform, username);
      dispatch({ type: "setGameList", payload: games });
      dispatch({ type: "setError", payload: null });
    } catch (err: unknown) {
      setFetchError(err instanceof Error ? err.message : "Failed to fetch games");
    } finally { setIsLoading(false); }
  }, [platform, username, dispatch]);

  const displayError = validationError || fetchError;
  const inputId = `${platform}-username`;

  return (
    <div role="tabpanel" id={`panel-${platform}`} aria-labelledby={`tab-${platform}`} className="space-y-5">
      <div>
        <h2 className="font-serif text-xl font-semibold text-[var(--ink)]">Find your recent games</h2>
        <p className="mt-1 text-sm leading-6 text-[var(--ink-muted)]">Enter your {platformLabel} username. You’ll choose a game before analysis begins.</p>
      </div>
      <div className="space-y-2">
        <label htmlFor={inputId} className="block text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ink-muted)]">{platformLabel} username</label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input id={inputId} type="text" className={`${fieldBase} min-w-0 flex-1 border-[var(--border-strong)] px-3.5 py-2.5 text-sm ${validationError ? "border-[var(--danger)]" : ""}`} placeholder={`Enter ${platformLabel} username`} value={username} onChange={(event) => { setUsername(event.target.value); setValidationError(null); setFetchError(null); }} onBlur={handleBlur} onKeyDown={(event) => { if (event.key === "Enter" && !isLoading) handleSubmit(); }} disabled={isLoading} aria-invalid={!!validationError} aria-describedby={displayError ? `${platform}-error` : undefined} />
          <button type="button" onClick={handleSubmit} disabled={isLoading || username.trim().length === 0} className={`${primaryButton} whitespace-nowrap sm:min-w-36`}>
            {isLoading ? <span className="flex items-center justify-center gap-2"><LoadingSpinner />Finding games…</span> : "Find games"}
          </button>
        </div>
      </div>
      {displayError && (
        <div id={`${platform}-error`} role="alert" className="space-y-2 rounded-xl border border-[color-mix(in_srgb,var(--danger)_30%,transparent)] bg-[color-mix(in_srgb,var(--danger)_9%,transparent)] px-3 py-2 text-sm text-[var(--danger)]">
          <p>{displayError}</p>
          {fetchError && <div className="flex flex-wrap gap-3"><button type="button" onClick={handleSubmit} className="text-xs font-semibold underline underline-offset-2 hover:no-underline">Try again</button><button type="button" onClick={() => { dispatch({ type: "setImportMethod", payload: "pgn" }); dispatch({ type: "setError", payload: null }); }} className="text-xs font-semibold text-[var(--ink-muted)] underline underline-offset-2 hover:no-underline">Paste PGN instead</button></div>}
        </div>
      )}
    </div>
  );
}

function LoadingSpinner() {
  return (
    <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-80" fill="currentColor" d="M21 12a9 9 0 0 0-9-9v3a6 6 0 0 1 6 6h3Z" />
    </svg>
  );
}
