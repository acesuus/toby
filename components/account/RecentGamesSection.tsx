"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { PlatformUsernames } from "@/lib/account-types";
import type { GameListItem } from "@/lib/types";
import { fetchRecentGames } from "@/lib/fetcher";
import { getGameType } from "@/lib/game-utils";

interface RecentGamesSectionProps {
  usernames: PlatformUsernames;
}

export function RecentGamesSection({ usernames }: RecentGamesSectionProps) {
  const router = useRouter();
  const [games, setGames] = useState<GameListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("All");

  const loadGames = async () => {
    setLoading(true);
    setError(null);
    const allGames: GameListItem[] = [];

    try {
      if (usernames.chess_com_username) {
        const chessGames = await fetchRecentGames("chesscom", usernames.chess_com_username);
        allGames.push(...chessGames);
      }
      if (usernames.lichess_username) {
        const lichessGames = await fetchRecentGames("lichess", usernames.lichess_username);
        allGames.push(...lichessGames);
      }
      // Sort by date descending
      allGames.sort((a, b) => b.date.localeCompare(a.date));
      setGames(allGames);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load games");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const hasConnection = usernames.chess_com_username || usernames.lichess_username;
    if (hasConnection) {
      loadGames();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usernames.chess_com_username, usernames.lichess_username]);

  const handleGameClick = (game: GameListItem) => {
    sessionStorage.setItem("reviewPgn", game.pgn);
    router.push("/review");
  };

  // No platforms connected
  if (!usernames.chess_com_username && !usernames.lichess_username) {
    return (
      <section className="space-y-3" data-testid="recent-games-section">
        <h2 className="text-lg font-semibold text-[var(--ink)]">Recent Games</h2>
        <p className="text-sm text-[var(--ink-muted)]">
          Connect a platform to see your recent games.
        </p>
      </section>
    );
  }

  // Loading
  if (loading) {
    return (
      <section className="space-y-3" data-testid="recent-games-section">
        <h2 className="text-lg font-semibold text-[var(--ink)]">Recent Games</h2>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded bg-[var(--surface)]" />
          ))}
        </div>
      </section>
    );
  }

  // Error
  if (error) {
    return (
      <section className="space-y-3" data-testid="recent-games-section">
        <h2 className="text-lg font-semibold text-[var(--ink)]">Recent Games</h2>
        <p className="text-sm text-red-600">{error}</p>
        <button
          onClick={loadGames}
          className="text-xs font-medium text-[var(--accent)] hover:opacity-80"
        >
          Retry
        </button>
      </section>
    );
  }

  // No games found
  if (games.length === 0) {
    return (
      <section className="space-y-3" data-testid="recent-games-section">
        <h2 className="text-lg font-semibold text-[var(--ink)]">Recent Games</h2>
        <p className="text-sm text-[var(--ink-muted)]">No recent games found.</p>
      </section>
    );
  }

  // Games list
  const filteredGames = filter === "All" 
    ? games.slice(0, 10) 
    : games.filter((g) => getGameType(g.timeControl)?.label === filter).slice(0, 10);

  return (
    <section className="space-y-4" data-testid="recent-games-section">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--ink)]">Recent Games</h2>
        <div className="flex items-center gap-1.5 rounded-lg bg-[var(--surface-raised)] p-1">
          {["All", "Bullet", "Blitz", "Rapid"].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${filter === cat ? "bg-[var(--surface)] text-[var(--ink)] shadow-sm" : "text-[var(--ink-muted)] hover:text-[var(--ink)]"}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>
      
      {filteredGames.length === 0 ? (
        <p className="text-sm text-[var(--ink-muted)]">No {filter !== "All" ? filter.toLowerCase() : "recent"} games found.</p>
      ) : (
        <ul className="space-y-1">
          {filteredGames.map((game) => (
            <li key={game.id}>
              <button
                onClick={() => handleGameClick(game)}
                className="w-full rounded px-3 py-2 text-left hover:bg-[var(--surface)] transition-colors"
              >
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--ink)]">
                    {game.white} vs {game.black}
                  </span>
                  <span className="text-[var(--ink-muted)]">{game.result}</span>
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-[var(--ink-muted)]">
                  {(() => {
                    const type = getGameType(game.timeControl);
                    if (type) {
                      return <span title={type.label} aria-label={type.label} className="shrink-0">{type.icon}</span>;
                    }
                    return null;
                  })()}
                  <span>{game.timeControl}</span>
                  <span>·</span>
                  <span>{game.date}</span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
