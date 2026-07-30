interface GameStatsRowProps {
  timeControl: string;
  gamesPlayed: number;
  record: { wins: number; losses: number; draws: number };
}

export function GameStatsRow({ timeControl, gamesPlayed, record }: GameStatsRowProps) {
  return (
    <div className="space-y-1">
      <p className="text-sm text-[var(--ink)]">
        {timeControl} · {gamesPlayed} {gamesPlayed === 1 ? "game" : "games"}
      </p>
      <div className="flex gap-3 text-sm">
        <span className="text-[var(--good)]">
          W {record.wins}
        </span>
        <span className="text-[var(--danger)]">
          L {record.losses}
        </span>
        <span className="text-[var(--ink-muted)]">
          D {record.draws}
        </span>
      </div>
    </div>
  );
}
