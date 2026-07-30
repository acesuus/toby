"use client";

import Image from "next/image";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useGameReview } from "@/lib/game-review-context";
import { parsePGN } from "@/lib/pgn-parser";
import { ImportPanel } from "@/components/ImportPanel";
import { GameSelector } from "@/components/GameSelector";
import { Download, Cpu, Target, ArrowRight } from "lucide-react";

const SAMPLE_PGN = `[Event "Toby Sample Game"]
[Site "Local"]
[Date "2024.01.01"]
[Round "1"]
[White "Toby"]
[Black "Guest"]
[Result "1-0"]

1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7# 1-0`;

export default function Home() {
  const router = useRouter();
  const { state, dispatch } = useGameReview();

  useEffect(() => {
    if (!state.parsedGame) return;
    const timer = setTimeout(() => router.push("/review"), 600);
    return () => clearTimeout(timer);
  }, [state.parsedGame, router]);

  const loadSampleGame = () => {
    const parsedGame = parsePGN(SAMPLE_PGN);
    dispatch({ type: "setParsedGame", payload: parsedGame });
    dispatch({ type: "setRawPgn", payload: SAMPLE_PGN });
    dispatch({ type: "setError", payload: null });
  };

  return (
    <div className="min-h-screen px-4 pb-16 pt-5 sm:px-6 sm:pb-24 sm:pt-7">
      <main className="mx-auto mt-8 w-full max-w-5xl sm:mt-12">
        <div className="mx-auto grid max-w-4xl items-center gap-5 md:grid-cols-[minmax(0,1fr)_10rem] md:gap-8">
          <div className="mx-auto md:order-2" aria-hidden="true">
            <Image src="/mascot/toby_png.png" alt="" width={160} height={160} className="h-auto w-32 object-contain sm:w-36 md:w-40" priority />
          </div>
          <div className="text-center md:order-1 md:text-left">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">Chess review, at your table</p>
            <h1 className="font-serif text-4xl font-semibold leading-[1.08] tracking-[-0.035em] text-transparent bg-clip-text bg-gradient-to-br from-[var(--ink)] to-[color-mix(in_srgb,var(--ink)_60%,transparent)] sm:text-6xl">A quieter way to understand your game.</h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-[var(--ink-muted)] sm:text-lg md:mx-0">Import a game from Chess.com, Lichess, or a PGN. Stockfish analyzes every move, and Toby helps you understand the moments that mattered.</p>
          </div>
        </div>

        <div className="mx-auto mt-10 mb-2 flex w-full max-w-3xl flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4" aria-label="How Toby works">
          <div className="flex items-center gap-2.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--ink-muted)] shadow-sm transition-colors hover:border-[var(--accent)] hover:text-[var(--ink)]">
            <Download className="h-4 w-4 text-[var(--accent)]" />
            <span>Import a game</span>
          </div>

          <ArrowRight className="hidden h-4 w-4 text-[var(--border-strong)] sm:block" />
          
          <div className="flex items-center gap-2.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--ink-muted)] shadow-sm transition-colors hover:border-[var(--accent)] hover:text-[var(--ink)]">
            <Cpu className="h-4 w-4 text-[var(--accent)]" />
            <span>Analyze with Stockfish</span>
          </div>

          <ArrowRight className="hidden h-4 w-4 text-[var(--border-strong)] sm:block" />
          
          <div className="flex items-center gap-2.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--ink-muted)] shadow-sm transition-colors hover:border-[var(--accent)] hover:text-[var(--ink)]">
            <Target className="h-4 w-4 text-[var(--accent)]" />
            <span>Review turning points</span>
          </div>
        </div>

        <div className="relative mx-auto mt-4 max-w-3xl">
          <div className="absolute -inset-1 rounded-[2rem] bg-gradient-to-r from-[var(--accent)] to-[var(--good)] opacity-20 blur-2xl"></div>
          <section aria-label="Import a game" className="relative rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)]">
            <ImportPanel />
          </section>
        </div>
        <div className="mx-auto mt-4 flex max-w-3xl items-center justify-center gap-2 text-xs text-[var(--ink-muted)]">
          <span>No game handy?</span>
          <button type="button" onClick={loadSampleGame} className="font-semibold text-[var(--ink)] underline underline-offset-2 transition-colors hover:text-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]">Try a sample game</button>
        </div>

        {state.gameList.length > 0 && (
          <section aria-label="Select a game" className="mx-auto mt-8 max-w-3xl rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-card)] sm:p-6">
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">Recent games</p>
              <h2 className="mt-1 font-serif text-xl font-semibold text-[var(--ink)]">Choose a game to review</h2>
            </div>
            <GameSelector />
          </section>
        )}

        <div className="mx-auto mt-10 flex max-w-2xl items-center justify-center gap-2 text-center text-xs leading-5 text-[var(--ink-muted)]">
          <svg className="h-4 w-4 shrink-0 text-[var(--ink-muted)] opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
          <span>Stockfish analysis stays in your browser. Personalized coaching is requested only when you start a review.</span>
        </div>
      </main>
    </div>
  );
}