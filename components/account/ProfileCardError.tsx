import type { Platform } from "@/lib/types";
import { PlatformIcon } from "./PlatformIcon";

interface ProfileCardErrorProps {
  username: string;
  platform: Platform;
}

export function ProfileCardError({ username, platform }: ProfileCardErrorProps) {
  return (
    <div
      role="region"
      aria-label={`Chess profile for ${username} on ${platform}`}
      className="rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] shadow-[var(--shadow-card)] p-4"
    >
      <div className="flex items-center justify-between">
        <span className="text-base font-semibold text-[var(--ink)]">
          {username}
        </span>
        <PlatformIcon platform={platform} />
      </div>
      <p className="mt-2 text-sm text-[var(--ink-muted)]">
        Live data unavailable
      </p>
    </div>
  );
}
