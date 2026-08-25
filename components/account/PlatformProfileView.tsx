"use client";

import { useEffect, useState } from "react";
import type { Platform } from "@/lib/types";
import type { PlatformProfile, PlatformRating } from "@/lib/account-types";
import { ProfileCard } from "./ProfileCard";
import { ProfileCardSkeleton } from "./ProfileCardSkeleton";
import { ProfileCardError } from "./ProfileCardError";
import { fetchRecentGames } from "@/lib/fetcher";

interface PlatformProfileViewProps {
  platform: Platform;
  username: string;
}

interface ChessComStatsResponse {
  chess_bullet?: {
    last?: { rating: number };
    record?: { win: number; loss: number; draw: number };
  };
  chess_blitz?: {
    last?: { rating: number };
    record?: { win: number; loss: number; draw: number };
  };
  chess_rapid?: {
    last?: { rating: number };
    record?: { win: number; loss: number; draw: number };
  };
}

async function fetchChessComProfile(username: string): Promise<PlatformProfile> {
  const res = await fetch(`https://api.chess.com/pub/player/${username}/stats`);
  if (!res.ok) throw new Error("Failed to fetch Chess.com stats");

  const data: ChessComStatsResponse = await res.json();
  const ratings: PlatformRating[] = [];

  const timeControls = [
    { key: "chess_bullet", label: "Bullet" },
    { key: "chess_blitz", label: "Blitz" },
    { key: "chess_rapid", label: "Rapid" },
  ] as const;

  for (const { key, label } of timeControls) {
    const tc = data[key];
    if (tc?.last?.rating) {
      const record = tc.record ?? { win: 0, loss: 0, draw: 0 };
      const gamesPlayed = record.win + record.loss + record.draw;
      ratings.push({
        timeControl: label,
        rating: tc.last.rating,
        gamesPlayed,
        record: { wins: record.win, losses: record.loss, draws: record.draw },
      });
    }
  }
  
  const recentGames = await fetchRecentGames("chesscom", username).catch(() => []);
  return { username, platform: "chesscom", ratings, recentGames };
}

async function fetchLichessProfile(username: string): Promise<PlatformProfile> {
  const res = await fetch(`https://lichess.org/api/user/${username}`);
  if (!res.ok) throw new Error("Failed to fetch Lichess profile");

  const data = await res.json();
  const ratings: PlatformRating[] = [];

  const timeControls = [
    { key: "bullet", label: "Bullet" },
    { key: "blitz", label: "Blitz" },
    { key: "rapid", label: "Rapid" },
  ] as const;

  const totalGames = data.count?.all ?? 0;
  const totalWins = data.count?.win ?? 0;
  const totalLosses = data.count?.loss ?? 0;

  for (const { key, label } of timeControls) {
    const perf = data.perfs?.[key];
    if (perf?.rating) {
      const gamesPlayed = perf.games ?? 0;
      const ratio = totalGames > 0 ? gamesPlayed / totalGames : 0;
      const wins = Math.round(totalWins * ratio);
      const losses = Math.round(totalLosses * ratio);
      const draws = Math.max(0, gamesPlayed - wins - losses);

      ratings.push({
        timeControl: label,
        rating: perf.rating,
        gamesPlayed,
        record: { wins, losses, draws },
      });
    }
  }

  const recentGames = await fetchRecentGames("lichess", username).catch(() => []);
  return { username, platform: "lichess", ratings, recentGames };
}

export function PlatformProfileView({ platform, username }: PlatformProfileViewProps) {
  const [profile, setProfile] = useState<PlatformProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(false);

      try {
        const fetcher = platform === "chesscom" ? fetchChessComProfile : fetchLichessProfile;
        const result = await fetcher(username);
        if (!cancelled) setProfile(result);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [platform, username]);

  if (loading) {
    return <ProfileCardSkeleton />;
  }

  if (error || !profile) {
    return <ProfileCardError username={username} platform={platform} />;
  }

  return <ProfileCard profile={profile} />;
}
