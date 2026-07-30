"use client";

import { useState } from "react";
import type { PlatformUsernames } from "@/lib/account-types";
import type { Platform } from "@/lib/types";
import { PlatformCard } from "./PlatformCard";

interface PlatformConnectionsSectionProps {
  usernames: PlatformUsernames;
  onUpdate: () => Promise<void>;
}

export function PlatformConnectionsSection({ usernames, onUpdate }: PlatformConnectionsSectionProps) {
  const [activeTab, setActiveTab] = useState<Platform>("chesscom");

  const handleConnect = async (platform: Platform, username: string) => {
    const res = await fetch("/api/account/platforms", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform, username }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to connect");
    }
    await onUpdate();
  };

  const handleDisconnect = async (platform: Platform) => {
    const res = await fetch("/api/account/platforms", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to disconnect");
    }
    await onUpdate();
  };

  return (
    <section className="space-y-6">
      {/* Segmented Control Tabs */}
      <div className="flex items-center justify-center bg-[var(--surface-raised)] p-1 rounded-full shadow-sm border border-[var(--border)] max-w-sm mx-auto">
        <button
          onClick={() => setActiveTab("chesscom")}
          className={`flex-1 py-1.5 px-4 text-sm font-medium rounded-full transition-colors ${
            activeTab === "chesscom"
              ? "bg-[var(--ink)] text-[var(--surface)] shadow"
              : "text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface)]"
          }`}
        >
          Chess.com
        </button>
        <button
          onClick={() => setActiveTab("lichess")}
          className={`flex-1 py-1.5 px-4 text-sm font-medium rounded-full transition-colors ${
            activeTab === "lichess"
              ? "bg-[var(--ink)] text-[var(--surface)] shadow"
              : "text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface)]"
          }`}
        >
          Lichess
        </button>
      </div>

      {/* Active Tab Content */}
      <div className="pt-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
        {activeTab === "chesscom" ? (
          <PlatformCard
            platform="chesscom"
            connectedUsername={usernames.chess_com_username}
            onConnect={(username) => handleConnect("chesscom", username)}
            onDisconnect={() => handleDisconnect("chesscom")}
          />
        ) : (
          <PlatformCard
            platform="lichess"
            connectedUsername={usernames.lichess_username}
            onConnect={(username) => handleConnect("lichess", username)}
            onDisconnect={() => handleDisconnect("lichess")}
          />
        )}
      </div>
    </section>
  );
}
