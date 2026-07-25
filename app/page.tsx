"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useGameReview } from "@/lib/game-review-context";
import { ImportPanel } from "@/components/ImportPanel";
import { GameSelector } from "@/components/GameSelector";

function TobyMark() {
  return (
    <span className="grid size-9 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--accent)] shadow-[var(--shadow-card)]" aria-hidden="true">
      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 20h9M9 17h7l1 3H8l1-3Z" />
        <path d="M10 17c-1-3 0-5 3-7l-2-3 5-3c1 4 2 8-1 13" />
        <path d="M11 7 8 9l4 1" />
      </svg>
    </span>
  );
}

export default function Home() {
  const router = useRouter();
  const { state } = useGameReview();

  useEffect(() => {
    if (!state.parsedGame) return;
    const timer = setTimeout(() => router.push("/review"), 600);
    return () => clearTimeout(timer);
  }, [state.parsedGame, router]);

  return (
    <div className="min-h-screen px-4 pb-16 pt-5 sm:px-6 sm:pb-24 sm:pt-7">
      <header className="mx-auto flex w-full max-w-5xl items-center gap-3" aria-label="Toby home">
        <TobyMark />
        <span className="font-serif text-xl font-semibold tracking-[-0.02em] text-[var(--ink)]">Toby</span>
        <span className="ml-auto text-xs font-medium tracking-wide text-[var(--ink-muted)]">Chess review, at your table</span>
      </header>

      <main className="mx-auto mt-16 w-full max-w-5xl sm:mt-24">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">Private, thoughtful analysis</p>
          <h1 className="font-serif text-4xl font-semibold leading-[1.08] tracking-[-0.035em] text-[var(--ink)] sm:text-6xl">A quieter way to understand your game.</h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-[var(--ink-muted)] sm:text-lg">Bring a game from Chess.com, Lichess, or your own PGN. Toby reviews every move locally with Stockfish.</p>
        </div>

        <section aria-label="Import a game" className="mx-auto mt-10 max-w-3xl rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)] sm:mt-14">
          <ImportPanel />
        </section>
        {state.gameList.length > 0 && (
          <section aria-label="Select a game" className="mx-auto mt-8 max-w-3xl rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-card)] sm:p-6">
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">Recent games</p>
              <h2 className="mt-1 font-serif text-xl font-semibold text-[var(--ink)]">Choose a game to review</h2>
            </div>
            <GameSelector />
          </section>
        )}

        <p className="mx-auto mt-7 max-w-2xl text-center text-xs leading-5 text-[var(--ink-muted)]">Your game and analysis stay in this browser. No account or server upload required.</p>
      </main>
    </div>
  );
}
