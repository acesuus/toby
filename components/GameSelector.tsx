"use client";

import { useState } from "react";
import { useGameReview } from "@/lib/game-review-context";
import { parsePGN } from "@/lib/pgn-parser";
import { getGameType } from "@/lib/game-utils";

export function GameSelector() {
  const { state, dispatch } = useGameReview();
  const [parseError, setParseError] = useState<string | null>(null);
  const [errorGameId, setErrorGameId] = useState<string | null>(null);
  const { gameList, selectedGameId } = state;

  function handleSelectGame(gameId: string) {
    setParseError(null);
    setErrorGameId(null);
    const game = gameList.find((item) => item.id === gameId);
    if (!game) return;
    dispatch({ type: "selectGame", payload: gameId });
    try {
      dispatch({ type: "setParsedGame", payload: parsePGN(game.pgn) });
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Failed to parse PGN");
      setErrorGameId(gameId);
      dispatch({ type: "setParsedGame", payload: null });
    }
  }

  if (gameList.length === 0) {
    return <div role="status" className="rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--control)] p-6 text-center text-sm text-[var(--ink-muted)]">No games found for this player.</div>;
  }

  return (
    <ul role="list" aria-label="Game list" className="max-h-80 space-y-1.5 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--control)] p-2">
      {gameList.map((game) => {
        const selected = game.id === selectedGameId;
        const hasError = game.id === errorGameId && parseError !== null;
        return (
          <li key={game.id}>
            <button type="button" onClick={() => handleSelectGame(game.id)} aria-current={selected ? "true" : undefined} className={`w-full rounded-xl border px-3.5 py-3 text-left text-sm transition hover:-translate-y-px active:translate-y-0 ${selected ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--ink)] shadow-sm" : "border-transparent bg-[var(--surface)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-raised)]"}`}>
              <div className="flex items-start justify-between gap-3">
                <span className="min-w-0 truncate font-semibold text-[var(--ink)]">{game.white} <span className="font-normal text-[var(--ink-muted)]">vs</span> {game.black}</span>
                <span className="shrink-0 rounded-md bg-[var(--surface-raised)] px-2 py-0.5 font-mono text-[10px] font-semibold text-[var(--ink)]">{game.result}</span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[10px] text-[var(--ink-muted)]">
                {(() => {
                  const type = getGameType(game.timeControl, game.timeClass);
                  if (type) {
                    return <span title={type.label} aria-label={type.label} className="shrink-0">{type.icon}</span>;
                  }
                  return null;
                })()}
                {game.timeControl && <span>{game.timeControl}</span>}
                {game.timeControl && game.date && <span aria-hidden="true">·</span>}
                {game.date && <span>{game.date}</span>}
              </div>
              {hasError && <p role="alert" className="mt-2 text-xs text-[var(--danger)]">{parseError}</p>}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
