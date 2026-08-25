"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import type { GameWithAnalysis, PaginatedGamesResponse } from "@/lib/supabase/types";
import { Search, Trash2, Calendar, Target, Swords } from "lucide-react";
import { MiniBoardPreview } from "@/components/account/MiniBoardPreview";
import { getGameType } from "@/lib/game-utils";

type SortOption = "date_saved" | "date_played" | "accuracy";

import { toast } from "sonner";

export default function LibraryPage() {
  const { user, loading: authLoading } = useAuth();
  const [games, setGames] = useState<GameWithAnalysis[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("date_saved");

  const fetchGames = useCallback(async (cursor?: string) => {
    try {
      const url = new URL("/api/games", window.location.origin);
      url.searchParams.set("limit", "100"); // Fetch a larger batch for client-side sorting
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
      toast.error(err instanceof Error ? err.message : "Failed to load more games");
    } finally {
      setLoadingMore(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      return;
    }

    setDeletingId(id);
    try {
      const res = await fetch(`/api/games/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete game");
      setGames((prev) => prev.filter((g) => g.id !== id));
      setConfirmDeleteId(null);
      toast.success("Game removed from library");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete game");
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      // Handle PGN date format YYYY.MM.DD
      const normalized = dateStr.replace(/\./g, "-");
      return new Date(normalized).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const filteredAndSortedGames = useMemo(() => {
    let result = [...games];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(g => 
        g.headers.white.toLowerCase().includes(q) ||
        g.headers.black.toLowerCase().includes(q) ||
        (g.headers.opening && g.headers.opening.toLowerCase().includes(q))
      );
    }

    result.sort((a, b) => {
      if (sortBy === "date_saved") {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortBy === "date_played") {
        const dateA = a.headers.date ? new Date(a.headers.date.replace(/\./g, "-")).getTime() : 0;
        const dateB = b.headers.date ? new Date(b.headers.date.replace(/\./g, "-")).getTime() : 0;
        return dateB - dateA;
      }
      if (sortBy === "accuracy") {
        const accA = a.game_analyses ? (a.game_analyses.white_accuracy + a.game_analyses.black_accuracy) / 2 : 0;
        const accB = b.game_analyses ? (b.game_analyses.white_accuracy + b.game_analyses.black_accuracy) / 2 : 0;
        return accB - accA;
      }
      return 0;
    });

    return result;
  }, [games, searchQuery, sortBy]);

  if (authLoading) {
    return (
      <main className="min-h-screen bg-[var(--bg)] px-4 py-12">
        <div className="mx-auto max-w-5xl">
          <div className="h-8 w-48 animate-pulse rounded-lg bg-[var(--control)]" />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-xl bg-[var(--surface-raised)] shadow-sm border border-[var(--border)]" />
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
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="font-serif text-3xl font-semibold text-[var(--ink)]">Your Library</h1>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">Browse and revisit your saved game reviews.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-[var(--ink-muted)]" />
              </div>
              <input
                type="text"
                placeholder="Search players, openings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-9 pr-3 py-2 border border-[var(--border)] rounded-lg leading-5 bg-[var(--surface-raised)] text-[var(--ink)] placeholder-[var(--ink-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)] sm:text-sm"
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="block w-full sm:w-40 pl-3 pr-8 py-2 border border-[var(--border)] rounded-lg bg-[var(--surface-raised)] text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-[var(--accent)] sm:text-sm appearance-none"
              style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: `right 0.5rem center`, backgroundRepeat: `no-repeat`, backgroundSize: `1.5em 1.5em` }}
            >
              <option value="date_saved">Date Saved</option>
              <option value="date_played">Date Played</option>
              <option value="accuracy">Accuracy</option>
            </select>
          </div>
        </div>

        {error && (
          <div role="alert" className="mb-6 rounded-xl border border-[color-mix(in_srgb,var(--danger)_32%,transparent)] bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] px-4 py-3 text-sm text-[var(--danger)]">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-xl bg-[var(--surface-raised)] shadow-sm border border-[var(--border)]" />
            ))}
          </div>
        ) : games.length === 0 ? (
          <div className="mt-16 mb-16 text-center">
            <div className="mx-auto grid size-16 place-items-center rounded-xl bg-[var(--accent-soft)] text-3xl text-[var(--accent)]" aria-hidden="true">♞</div>
            <h2 className="mt-4 font-serif text-2xl font-semibold text-[var(--ink)]">No saved games yet</h2>
            <p className="mt-2 text-base text-[var(--ink-muted)]">Analyze a game and save it to build your library.</p>
            <Link
              href="/"
              className="mt-6 inline-flex rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[#fffaf0] transition hover:-translate-y-px hover:shadow-lg active:translate-y-0"
            >
              Import a game
            </Link>
          </div>
        ) : filteredAndSortedGames.length === 0 ? (
           <div className="mt-16 text-center py-12 border-2 border-dashed border-[var(--border)] rounded-xl">
             <p className="text-[var(--ink-muted)]">No games match your search.</p>
             <button onClick={() => setSearchQuery("")} className="mt-2 text-[var(--accent)] hover:underline text-sm font-medium">Clear search</button>
           </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredAndSortedGames.map((game) => {
                const isWin = game.headers.result === "1-0" || game.headers.result === "0-1";
                const isDraw = game.headers.result === "1/2-1/2" || game.headers.result === "½-½";
                
                return (
                  <Link
                    key={game.id}
                    href={`/review?gameId=${game.id}`}
                    className="group relative flex flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] shadow-sm transition-all hover:shadow-md hover:border-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                  >
                    <div className="flex items-start gap-3 p-3">
                      {/* Left: Mini Board */}
                      <MiniBoardPreview pgn={game.pgn} className="w-20 h-20 shrink-0 rounded shadow-sm border border-[#3c3b39] transition-transform group-hover:scale-[1.02]" />
                      
                      {/* Right: Game Details */}
                      <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-xs font-bold ${isWin ? 'text-[var(--accent)]' : isDraw ? 'text-[var(--ink-muted)]' : 'text-[#ca3431]'}`}>
                            {game.headers.result}
                          </span>
                          <span className="text-[10px] text-[var(--ink-muted)]">{formatDate(game.headers.date || game.created_at)}</span>
                        </div>
                        
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="size-2.5 shrink-0 rounded-sm border border-[#3c3b39] bg-white shadow-sm" aria-hidden="true" />
                            <span className="truncate text-xs font-semibold text-[var(--ink)]">{game.headers.white}</span>
                            {game.game_analyses && (
                              <span className="ml-auto text-[10px] font-medium text-[var(--ink-muted)]">
                                {game.game_analyses.white_accuracy.toFixed(1)}%
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="size-2.5 shrink-0 rounded-sm border border-[#3c3b39] bg-[#2b2b2b] shadow-sm" aria-hidden="true" />
                            <span className="truncate text-xs font-semibold text-[var(--ink)]">{game.headers.black}</span>
                            {game.game_analyses && (
                              <span className="ml-auto text-[10px] font-medium text-[var(--ink-muted)]">
                                {game.game_analyses.black_accuracy.toFixed(1)}%
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Footer: Opening & Actions */}
                    <div className="bg-[var(--surface)] px-3 py-2.5 border-t border-[var(--border)] flex items-center justify-between mt-auto">
                      <div className="flex items-center gap-1.5 text-xs text-[var(--ink-muted)] min-w-0">
                        {(() => {
                          const type = getGameType(game.headers.timeControl);
                          if (type) return <span title={type.label} aria-label={type.label} className="shrink-0">{type.icon}</span>;
                          return null;
                        })()}
                        <span className="shrink-0">{game.headers.timeControl}</span>
                        <span className="mx-0.5 opacity-50 shrink-0">•</span>
                        <span className="truncate" title={game.headers.opening}>{game.headers.opening || "Unknown Opening"}</span>
                      </div>
                      
                      <div className="shrink-0 relative z-10 ml-2">
                        {confirmDeleteId === game.id ? (
                          <div className="flex items-center gap-1 bg-[var(--surface)]">
                            <button
                              type="button"
                              onClick={(e) => handleDelete(game.id, e)}
                              disabled={deletingId === game.id}
                              className="rounded bg-[#ca3431] px-2 py-1 text-[10px] font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-50"
                            >
                              {deletingId === game.id ? "..." : "Del"}
                            </button>
                            <button
                              type="button"
                              onClick={(e) => { e.preventDefault(); setConfirmDeleteId(null); }}
                              className="rounded border border-[var(--border)] bg-[var(--surface-raised)] px-2 py-1 text-[10px] font-semibold text-[var(--ink)] hover:bg-[var(--surface)]"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); setConfirmDeleteId(game.id); }}
                            className="rounded p-1 text-[var(--ink-muted)] transition-colors hover:text-[#ca3431] sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100"
                            aria-label="Delete game"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {nextCursor && (
              <div className="mt-8 flex justify-center">
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="rounded-xl bg-[var(--surface)] border border-[var(--border)] px-6 py-2.5 text-sm font-semibold text-[var(--ink)] transition-colors hover:bg-[var(--surface-raised)] disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] shadow-sm"
                >
                  {loadingMore ? "Loading more..." : "Load more games"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
