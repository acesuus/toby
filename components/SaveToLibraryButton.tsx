"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useGameReview } from "@/lib/game-review-context";
import type { SaveGamePayload } from "@/lib/supabase/types";

type SaveStatus = "idle" | "saving" | "success" | "error";

interface SaveToLibraryButtonProps {
  variant?: "full" | "icon";
}

export function SaveToLibraryButton({ variant = "full" }: SaveToLibraryButtonProps) {
  const { user } = useAuth();
  const { state } = useGameReview();
  const router = useRouter();
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { parsedGame, classifiedMoves, gameAccuracy, analysisDepth, importMethod, selectedGameId } = state;

  async function handleSave() {
    if (!user) {
      router.push("/login?returnUrl=/review");
      return;
    }

    if (!parsedGame) return;

    setStatus("saving");
    setErrorMessage(null);

    const sourcePlatform: "chesscom" | "lichess" | "manual" =
      importMethod === "chesscom" || importMethod === "lichess"
        ? importMethod
        : "manual";

    const payload: SaveGamePayload = {
      pgn: state.rawPgn ?? "",
      headers: {
        white: parsedGame.headers.white,
        black: parsedGame.headers.black,
        result: parsedGame.headers.result,
        date: parsedGame.headers.date,
        timeControl: parsedGame.headers.timeControl,
        opening: parsedGame.headers.opening,
        eco: parsedGame.headers.eco,
      },
      sourcePlatform,
      sourceGameId: selectedGameId ?? null,
      classifiedMoves: classifiedMoves.map((m) => ({
        san: m.san,
        uci: m.uci,
        grade: m.grade,
        winPercentLoss: m.winPercentLoss,
      })),
      whiteAccuracy: gameAccuracy?.white.accuracy,
      blackAccuracy: gameAccuracy?.black.accuracy,
      analysisDepth,
    };

    try {
      const response = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? `Save failed (${response.status})`);
      }

      setStatus("success");
    } catch (err: unknown) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Failed to save game.");
    }
  }

  // Icon variant — compact save icon button
  if (variant === "icon") {
    if (status === "success") {
      return (
        <span className="grid size-7 place-items-center rounded-lg bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-[var(--accent)]" title="Saved">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M3.5 8.5L6.5 11.5L12.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      );
    }

    return (
      <button
        type="button"
        onClick={handleSave}
        disabled={status === "saving"}
        title={status === "saving" ? "Saving…" : "Save to Library"}
        className="grid size-7 place-items-center rounded-lg border border-[var(--border)] text-[var(--ink-muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-50"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M2 4a2 2 0 012-2h6l4 4v6a2 2 0 01-2 2H4a2 2 0 01-2-2V4z" stroke="currentColor" strokeWidth="1.3" />
          <path d="M5 2v4h5V2" stroke="currentColor" strokeWidth="1.3" />
          <rect x="5" y="9" width="6" height="3" rx="0.5" stroke="currentColor" strokeWidth="1.3" />
        </svg>
      </button>
    );
  }

  // Full variant (default)
  if (status === "success") {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] px-3 py-2 text-sm font-medium text-[var(--accent)]">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0">
          <path d="M3.5 8.5L6.5 11.5L12.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Saved to library
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleSave}
        disabled={status === "saving"}
        className="w-full rounded-lg border border-[var(--accent)] bg-transparent px-3 py-2.5 text-sm font-medium text-[var(--accent)] transition-colors hover:bg-[color-mix(in_srgb,var(--accent)_8%,transparent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "saving" ? "Saving…" : "Save to Library"}
      </button>
      {status === "error" && errorMessage && (
        <p role="alert" className="text-xs text-[var(--danger)]">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
