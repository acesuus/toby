import React from "react";
import { Zap, Timer, Swords } from "lucide-react";

export function BulletIcon({ className }: { className?: string }) {
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

export function getGameType(timeControl?: string, timeClass?: string): { label: string; icon: React.ReactNode } | null {
  if (timeClass) {
    const tc = timeClass.toLowerCase();
    if (tc === "bullet") return { label: "Bullet", icon: <BulletIcon className="h-3.5 w-3.5 text-red-500" /> };
    if (tc === "blitz") return { label: "Blitz", icon: <Zap className="h-3.5 w-3.5 text-yellow-400" /> };
    if (tc === "rapid") return { label: "Rapid", icon: <Timer className="h-3.5 w-3.5 text-green-500" /> };
    if (tc === "classical" || tc === "daily" || tc === "correspondence") return { label: "Classical", icon: <Swords className="h-3.5 w-3.5 text-gray-400" /> };
  }

  if (!timeControl || timeControl === "-" || timeControl === "?") return null;
  const parts = timeControl.split("+");
  const baseSeconds = parseInt(parts[0], 10);
  if (isNaN(baseSeconds)) return null;

  if (baseSeconds < 180) {
    return { label: "Bullet", icon: <BulletIcon className="h-3.5 w-3.5 text-red-500" /> };
  } else if (baseSeconds < 600) {
    return { label: "Blitz", icon: <Zap className="h-3.5 w-3.5 text-yellow-400" /> };
  } else if (baseSeconds < 3600) {
    return { label: "Rapid", icon: <Timer className="h-3.5 w-3.5 text-green-500" /> };
  } else {
    return { label: "Classical", icon: <Swords className="h-3.5 w-3.5 text-gray-400" /> };
  }
}
