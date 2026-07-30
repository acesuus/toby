"use client";

import { useState, FormEvent } from "react";
import type { Platform } from "@/lib/types";
import { PlatformProfileView } from "./PlatformProfileView";

interface PlatformCardProps {
  platform: Platform;
  connectedUsername: string | null;
  onConnect: (username: string) => Promise<void>;
  onDisconnect: () => Promise<void>;
}

import { toast } from "sonner";

function getPlatformDisplayName(platform: Platform): string {
  return platform === "chesscom" ? "Chess.com" : "Lichess";
}

export function PlatformCard({
  platform,
  connectedUsername,
  onConnect,
  onDisconnect,
}: PlatformCardProps) {
  const displayName = getPlatformDisplayName(platform);

  if (connectedUsername) {
    return (
      <ConnectedView
        platform={platform}
        displayName={displayName}
        username={connectedUsername}
        onDisconnect={onDisconnect}
      />
    );
  }

  return (
    <ConnectForm
      platform={platform}
      displayName={displayName}
      onConnect={onConnect}
    />
  );
}

// --- Connected View ---

interface ConnectedViewProps {
  platform: Platform;
  displayName: string;
  username: string;
  onDisconnect: () => Promise<void>;
}

function ConnectedView({
  platform,
  displayName,
  username,
  onDisconnect,
}: ConnectedViewProps) {
  const [disconnecting, setDisconnecting] = useState(false);

  const handleDisconnect = async () => {
    const confirmed = window.confirm(
      `Disconnect ${displayName} account "${username}"?`
    );
    if (!confirmed) return;

    setDisconnecting(true);
    try {
      await onDisconnect();
      toast.success(`${displayName} account disconnected`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to disconnect");
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <div className="space-y-3">
      <PlatformProfileView platform={platform} username={username} />
      <div className="flex justify-end px-2">
        <button
          onClick={handleDisconnect}
          disabled={disconnecting}
          className="text-xs font-medium text-[var(--danger)] hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {disconnecting ? "Disconnecting..." : `Disconnect ${displayName}`}
        </button>
      </div>
    </div>
  );
}

// --- Connect Form ---

interface ConnectFormProps {
  platform: Platform;
  displayName: string;
  onConnect: (username: string) => Promise<void>;
}

function ConnectForm({ platform, displayName, onConnect }: ConnectFormProps) {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null); // Keep this for inline validation error if needed

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    setLoading(true);
    setError(null);

    try {
      await onConnect(username.trim());
      toast.success(`Connected to ${displayName}!`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to connect";
      setError(message); // Keep inline error for context, and also toast if severe? Actually, just let it be inline.
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full overflow-hidden rounded-xl border border-[#3c3b39] bg-[#2b2b2b] text-white shadow-lg font-sans">
      <div className="bg-[#262522] p-6 border-b border-[#3c3b39] text-center">
        <h3 className="text-xl font-bold text-[#f1f1f1] mb-2">Connect {displayName}</h3>
        <p className="text-sm text-[#888]">Link your account to track your stats and recent games.</p>
      </div>
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div className="space-y-1.5">
          <label htmlFor={`username-${platform}`} className="text-sm font-semibold text-[#c3c3c2]">
            Username
          </label>
          <input
            id={`username-${platform}`}
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder={`Enter your ${displayName} username`}
            disabled={loading}
            className="w-full rounded-lg border border-[#3c3b39] bg-[#1f1e1b] px-4 py-2.5 text-sm text-white placeholder:text-[#666] focus:outline-none focus:ring-2 focus:ring-[#81b64c] focus:border-transparent disabled:opacity-50 transition-shadow"
          />
        </div>
        {error && (
          <p className="text-sm text-[#ca3431]">{error}</p>
        )}
        <button
          type="submit"
          disabled={loading || !username.trim()}
          className="w-full rounded-lg bg-[#81b64c] px-4 py-2.5 text-sm font-bold text-[#262522] hover:bg-[#92c55b] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Connecting..." : `Connect ${displayName}`}
        </button>
      </form>
    </div>
  );
}
