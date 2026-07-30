import type { PlatformProfile } from "@/lib/account-types";
import { PlatformIcon } from "./PlatformIcon";
import { User, Swords, Zap, Timer, Calendar } from "lucide-react";

function BulletIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" stroke="none" className={className}>
      <g transform="rotate(-45 12 12)">
        {/* Speed lines */}
        <path d="M6 7H2a1 1 0 0 0 0 2h4a1 1 0 0 0 0-2zM4 15H1a1 1 0 0 0 0 2h3a1 1 0 0 0 0-2zM7 11H1a1 1 0 0 0 0 2h6a1 1 0 0 0 0-2z" opacity="0.35" />
        {/* Base */}
        <path d="M6 8a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h1V8z" />
        {/* Groove */}
        <path d="M7 8h1v8H7z" opacity="0.6"/>
        {/* Projectile */}
        <path d="M8 8h6c3 0 6.5 2 8 4-1.5 2-5 4-8 4H8z" />
      </g>
    </svg>
  );
}

import { MiniBoardPreview } from "./MiniBoardPreview";
import Link from "next/link";

interface ProfileCardProps {
  profile: PlatformProfile;
}

const platformLabel: Record<string, string> = {
  chesscom: "Chess.com",
  lichess: "Lichess",
};

function getTimeControlStyle(timeControl: string) {
  const tc = timeControl.toLowerCase();
  if (tc.includes("bullet")) return { icon: <BulletIcon className="w-5 h-5 text-yellow-500" />, bg: "bg-yellow-500/10 border border-yellow-500/30" };
  if (tc.includes("blitz")) return { icon: <Zap className="w-5 h-5 text-yellow-400" />, bg: "bg-yellow-400/10 border border-yellow-400/30" };
  if (tc.includes("rapid")) return { icon: <Timer className="w-5 h-5 text-green-500" />, bg: "bg-green-500/10 border border-green-500/30" };
  return { icon: <Swords className="w-5 h-5 text-gray-400" />, bg: "bg-gray-400/10 border border-gray-400/30" };
}

export function ProfileCard({ profile }: ProfileCardProps) {
  const { username, platform, ratings, recentGames } = profile;
  const displayPlatform = platformLabel[platform] ?? platform;

  const ratedControls = ratings.filter((r) => r.rating > 0);

  return (
    <div
      role="region"
      aria-label={`Chess profile for ${username} on ${displayPlatform}`}
      className="w-full overflow-hidden rounded-xl border border-[#3c3b39] bg-[#2b2b2b] text-white shadow-lg font-sans flex flex-col"
    >
      {/* Header Profile Section */}
      <div className="flex items-center gap-4 bg-[#262522] p-4 border-b border-[#3c3b39]">
        {/* Avatar Placeholder */}
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-[#1f1e1b] border border-[#3c3b39]">
          <User className="h-8 w-8 text-[#888]" />
        </div>

        {/* User Info */}
        <div className="flex flex-col overflow-hidden">
          <div className="flex items-center gap-2">
            <span className="truncate text-xl font-bold text-[#f1f1f1]">
              {username}
            </span>
            <div className="flex h-5 w-5 items-center justify-center rounded bg-[#81b64c] text-[#262522]">
              <PlatformIcon platform={platform} />
            </div>
          </div>
          <span className="text-sm text-[#888]">{displayPlatform} Member</span>
        </div>
      </div>

      {/* Stats Grid */}
      {ratedControls.length > 0 ? (
        <div className={`grid grid-cols-1 gap-px bg-[#3c3b39] ${
          ratedControls.length === 1 ? "sm:grid-cols-1" :
          ratedControls.length === 2 ? "sm:grid-cols-2" :
          ratedControls.length === 3 ? "sm:grid-cols-3" :
          "sm:grid-cols-2 lg:grid-cols-4"
        }`}>
          {ratedControls.map((r) => {
            const style = getTimeControlStyle(r.timeControl);
            return (
              <div
                key={r.timeControl}
                className="flex items-center gap-4 p-4 bg-[#2b2b2b] hover:bg-[#32312f] transition-colors"
              >
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded ${style.bg}`}>
                  {style.icon}
                </div>

                <div className="flex flex-col flex-1">
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-sm font-semibold text-[#c3c3c2]">
                      {r.timeControl}
                    </span>
                    <span className="font-mono text-3xl font-bold tracking-tight text-white">
                      {r.rating}
                    </span>
                  </div>

                {r.gamesPlayed > 0 && (
                  <div className="mt-2 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-[#888]">{r.gamesPlayed} games</span>
                      <div className="flex gap-2">
                        <span className="text-[#81b64c]">{r.record.wins}W</span>
                        <span className="text-[#ca3431]">{r.record.losses}L</span>
                        <span className="text-[#888]">{r.record.draws}D</span>
                      </div>
                    </div>
                    {/* Win/Loss/Draw Stacked Bar */}
                    <div className="w-full h-1 flex rounded-full overflow-hidden opacity-80">
                      <div style={{ width: `${(r.record.wins / r.gamesPlayed) * 100}%` }} className="bg-[#81b64c]" title={`Wins: ${r.record.wins}`} />
                      <div style={{ width: `${(r.record.draws / r.gamesPlayed) * 100}%` }} className="bg-[#888]" title={`Draws: ${r.record.draws}`} />
                      <div style={{ width: `${(r.record.losses / r.gamesPlayed) * 100}%` }} className="bg-[#ca3431]" title={`Losses: ${r.record.losses}`} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        </div>
      ) : (
        <div className="p-8 text-center text-sm text-[#888] border-b border-[#3c3b39]">
          No rated games played yet.
        </div>
      )}

      {/* Recent Games Block */}
      {recentGames && recentGames.length > 0 && (
        <div className="border-t border-[#3c3b39] bg-[#262522]">
          <div className="px-4 py-3 flex items-center justify-between border-b border-[#3c3b39]">
             <h4 className="text-sm font-semibold text-[#c3c3c2]">Recent Games</h4>
          </div>
          
          <div className="flex flex-col">
            {recentGames.map((game, idx) => {
              const isWin =
                (game.white.toLowerCase() === username.toLowerCase() && game.result === "1-0") ||
                (game.black.toLowerCase() === username.toLowerCase() && game.result === "0-1");
              const isDraw = game.result === "½-½";
              
              const resultColor = isDraw ? "text-[#888]" : isWin ? "text-[#81b64c]" : "text-[#ca3431]";
              const resultIcon = isDraw ? "½" : isWin ? "+" : "-";

              return (
                <Link
                  key={game.id}
                  href={`/review`}
                  onClick={() => sessionStorage.setItem("reviewPgn", game.pgn)}
                  className="flex items-center gap-4 px-4 py-3 hover:bg-[#32312f] transition-colors border-b border-[#3c3b39] last:border-0"
                >
                  {/* For the first game, show mini board, else just an icon */}
                  {idx === 0 ? (
                    <MiniBoardPreview pgn={game.pgn} />
                  ) : (
                     <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-[#1f1e1b] shadow-sm">
                       <span className={`text-xl font-bold ${resultColor}`}>{resultIcon}</span>
                     </div>
                  )}
                  
                  <div className="flex flex-col flex-1 overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="truncate text-sm font-medium text-white">
                         {game.white} <span className="text-[#888] font-normal mx-1">vs</span> {game.black}
                      </span>
                      <span className={`text-sm font-bold ml-2 ${resultColor}`}>{game.result}</span>
                    </div>
                    
                    <div className="mt-1 flex items-center gap-2 text-xs text-[#888]">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{game.date}</span>
                      <span className="mx-1">•</span>
                      <span>{game.timeControl}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
