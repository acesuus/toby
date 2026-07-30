"use client";

import { useAuth } from "@/lib/auth-context";
import { usePlatformUsernames } from "@/lib/use-platform-usernames";
import { AccountDetailsSection } from "@/components/account/AccountDetailsSection";
import { PlatformConnectionsSection } from "@/components/account/PlatformConnectionsSection";

function AccountPageSkeleton() {
  return (
    <div className="min-h-screen px-4 pb-16 pt-5 sm:px-6">
      <main className="mx-auto w-full max-w-3xl space-y-8">
        {/* Title skeleton */}
        <div className="h-9 w-40 animate-pulse rounded bg-[var(--border)]" />

        {/* Account details skeleton */}
        <div className="space-y-3">
          <div className="h-5 w-32 animate-pulse rounded bg-[var(--border)]" />
          <div className="h-4 w-56 animate-pulse rounded bg-[var(--border)]" />
          <div className="h-4 w-44 animate-pulse rounded bg-[var(--border)]" />
        </div>

        {/* Platform connections skeleton */}
        <div className="space-y-3">
          <div className="h-5 w-48 animate-pulse rounded bg-[var(--border)]" />
          <div className="h-24 w-full animate-pulse rounded bg-[var(--border)]" />
          <div className="h-24 w-full animate-pulse rounded bg-[var(--border)]" />
        </div>
      </main>
    </div>
  );
}

export default function AccountPage() {
  const { user, loading: authLoading } = useAuth();
  const { usernames, loading: usernamesLoading, refetch } = usePlatformUsernames();

  if (authLoading || usernamesLoading) {
    return <AccountPageSkeleton />;
  }

  return (
    <div className="min-h-screen px-4 pb-16 pt-5 sm:px-6">
      <main className="mx-auto w-full max-w-3xl space-y-8">
        <h1 className="font-serif text-3xl font-semibold text-[var(--ink)]">Account</h1>
        <AccountDetailsSection user={user} />
        <PlatformConnectionsSection usernames={usernames} onUpdate={refetch} />
      </main>
    </div>
  );
}
