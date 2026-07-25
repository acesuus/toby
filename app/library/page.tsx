"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import type { GameWithAnalysis, PaginatedGamesResponse } from "@/lib/supabase/types";

export default function LibraryPage() {
  const { user, loading: authLoading } = useAuth();
  const [games, setGames] = useState<GameWithAnalysis[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const fetchGames = useCallback(async (cursor?: string) => {
    try {
      const url = new URL("/api/games", window.location.origin);
      url.searchParams.set("limit", "20");
      if (cursor) url.searchParams.set("cursor", cursor);

      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("Failed to load games");

      const data: PaginatedGamesResponse = await res.json();
      return data;
    } catch (err) {
      throw err instanceof Error ? err : new Error("Failed to load games");
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;

    setLoading(true);
    setError(null);
    fetchGames()
      .then((data) => {
        setGames(data.games);
        setNextCursor(data.nextCursor);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [user, authLoading, fetchGames]);

  const handleLoadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await fetchGames(nextCursor);
      setGames((prev) => [...prev, ...data.games]);
      setNextCursor(data.nextCursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load more games");
    } finally {
      setLoadingMore(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/games/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete game");
      setGames((prev) => prev.filter((g) => g.id !== id));
      setConfirmDeleteId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete game");
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  if (authLoading) {
    return (
      <main className="min-h-screen bg-[var(--bg)] px-4 py-12">
        <div className="mx-auto max-w-4xl">
          <div className="h-8 w-48 animate-pulse rounded-lg bg-[var(--control)]" />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-44 animate-pulse rounded-xl bg-[var(--surface-raised)] shadow-[var(--shadow-card)]" />
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="grid min-h-screen place-items-center bg-[var(--bg)] px-4">
        <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-8 text-center shadow-[var(--shadow-card)]">
          <h1 className="font-serif text-2xl font-semibold text-[var(--ink)]">Sign in to view your library</h1>
          <p className="mt-2 text-sm text-[var(--ink-muted)]">You need to be logged in to access your saved games.</p>
          <Link
            href="/login?returnUrl=/library"
            className="mt-5 inline-flex rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[#fffaf0] transition hover:-translate-y-px hover:bg-[var(--accent-hover)] active:translate-y-0"
          >
            Sign in
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--bg)] px-4 py-12">
      <div className="mx-auto max-w-4xl">
        <h1 className="font-serif text-3xl font-semibold text-[var(--ink)]">Your Library</h1>
        <p className="mt-1 text-sm text-[var(--ink-muted)]">Browse and revisit your saved game reviews.</p>

        {error && (
          <div role="alert" className="mt-4 rounded-xl border border-[color-mix(in_srgb,var(--danger)_32%,transparent)] bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] px-4 py-2 text-sm text-[var(--danger)]">
            {error}
          </div>
        )}

        {loading ? (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-44 animate-pulse rounded-xl bg-[var(--surface-raised)] shadow-[var(--shadow-card)]" />
            ))}
          </div>
        ) : games.length === 0 ? (
          <div className="mt-12 text-center">
            <div className="mx-auto grid size-14 place-items-center rounded-xl bg-[var(--accent-soft)] text-2xl text-[var(--accent)]" aria-hidden="true">♞</div>
            <h2 className="mt-4 font-serif text-xl font-semibold text-[var(--ink)]">No saved games yet</h2>
            <p className="mt-2 text-sm text-[var(--ink-muted)]">Analyze a game and save it to build your library.</p>
            <Link
              href="/"
              className="mt-5 inline-flex rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[#fffaf0] transition hover:-translate-y-px hover:bg-[var(--accent-hover)] active:translate-y-0"
            >
              Import a game
            </Link>
          </div>
        ) : (
          <>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {games.map((game) => (
                <article
                  key={game.id}
                  className="relative flex flex-col rounded-xl bg-[var(--surface-raised)] p-5 shadow-[var(--shadow-card)] transition hover:shadow-lg"
                >
                  {/* Players */}
                  <div className="flex items-center gap-2">
                    <span className="size-3 shrink-0 rounded-sm border border-[var(--border-strong)] bg-[var(--eval-light)]" aria-hidden="true" />
                    <span className="truncate text-sm font-semibold text-[var(--ink)]">{game.headers.white}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="size-3 shrink-0 rounded-sm border border-[var(--border-strong)] bg-[var(--eval-dark)]" aria-hidden="true" />
                    <span className="truncate text-sm font-semibold text-[var(--ink)]">{game.headers.black}</span>
                  </div>

                  {/* Result */}
                  <div className="mt-3 text-xs font-bold text-[var(--ink-muted)]">
                    {game.headers.result}
                  </div>

                  {/* Opening & Date */}
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-[var(--ink-muted)]">
                    {game.headers.opening && <span className="truncate">{game.headers.opening}</span>}
                    {game.headers.date && <span>{formatDate(game.headers.date)}</span>}
                  </div>

                  {/* Accuracy badges (if analysis exists) */}
                  {game.game_analyses && (
                    <div className="mt-3 flex gap-2">
                      <span className="rounded-md bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--accent)]">
                        W: {game.game_analyses.white_accuracy.toFixed(1)}%
                      </span>
                      <span className="rounded-md bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--accent)]">
                        B: {game.game_analyses.black_accuracy.toFixed(1)}%
                      </span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-auto flex items-center gap-2 pt-4">
                    <Link
                      href={`/review?gameId=${game.id}`}
                      className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-[#fffaf0] transition-colors hover:bg-[var(--accent-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                    >
                      Review
                    </Link>

                    {confirmDeleteId === game.id ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleDelete(game.id)}
                          disabled={deletingId === game.id}
                          className="rounded-lg bg-[var(--danger)] px-2.5 py-1.5 text-xs font-semibold text-[#fffaf0] transition-colors hover:opacity-90 disabled:opacity-50"
                        >
                          {deletingId === game.id ? "Deleting…" : "Confirm"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs font-semibold text-[var(--ink-muted)] transition-colors hover:bg-[var(--surface)]"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(game.id)}
                        className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--ink-muted)] transition-colors hover:border-[var(--danger)] hover:text-[var(--danger)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--danger)]"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>

            {nextCursor && (
              <div className="mt-8 flex justify-center">
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-[#fffaf0] transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                >
                  {loadingMore ? "Loading…" : "Load more"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
