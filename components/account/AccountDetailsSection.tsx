"use client";

import type { AuthUser } from "@/lib/auth-context";
import { Mail, User } from "lucide-react";

interface AccountDetailsSectionProps {
  user: AuthUser | null;
}

export function AccountDetailsSection({ user }: AccountDetailsSectionProps) {
  if (!user) {
    return (
      <section className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 shrink-0 animate-pulse rounded-full bg-[var(--border)]" />
          <div className="space-y-2 flex-1">
            <div className="h-5 w-48 animate-pulse rounded bg-[var(--border)]" />
            <div className="h-4 w-32 animate-pulse rounded bg-[var(--border)]" />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-5 shadow-sm flex items-center gap-4">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-white shadow">
        <User className="h-6 w-6" />
      </div>
      <div className="flex flex-col">
        <h2 className="text-lg font-bold text-[var(--ink)]">
          {user.displayName || "Chess Player"}
        </h2>
        <div className="flex items-center gap-1.5 text-sm text-[var(--ink-muted)]">
          <Mail className="h-3.5 w-3.5" />
          <span>{user.email}</span>
        </div>
      </div>
    </section>
  );
}
