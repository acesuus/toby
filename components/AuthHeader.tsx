"use client";

import { useAuth } from "@/lib/auth-context";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export function AuthHeader() {
  const { user, loading, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Close dropdown on Escape key
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  // Loading state: skeleton placeholder to prevent layout shift
  if (loading) {
    return (
      <div
        className="h-8 w-24 animate-pulse rounded-lg bg-[var(--control)]"
        aria-hidden="true"
      />
    );
  }

  // Unauthenticated state: "Sign in" button
  if (!user) {
    return (
      <Link
        href="/login"
        className="rounded-full bg-[var(--ink)] px-4 py-2 text-xs font-semibold text-[var(--bg)] shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2"
      >
        Sign in
      </Link>
    );
  }

  // Authenticated state: avatar + name + dropdown
  const initials = user.displayName
    ? user.displayName.charAt(0).toUpperCase()
    : user.email.charAt(0).toUpperCase();

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Account menu"
        className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] pl-1.5 pr-3 py-1.5 transition-all hover:border-[var(--border-strong)] hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
      >
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt=""
            className="h-7 w-7 rounded-full object-cover border border-[var(--border)]"
          />
        ) : (
          <span
            className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-bold text-[#fffaf0]"
            aria-hidden="true"
          >
            {initials}
          </span>
        )}
        <span className="text-xs font-semibold text-[var(--ink)] hidden sm:inline">
          {user.displayName || user.email.split("@")[0]}
        </span>
        <svg className="w-3.5 h-3.5 text-[var(--ink-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Account actions"
          className="absolute right-0 top-full mt-2 w-56 rounded-2xl bg-[var(--surface-raised)]/95 py-2 border border-[var(--border-strong)] shadow-[var(--shadow-card)] backdrop-blur-md z-50 overflow-hidden"
        >
          <div className="px-4 py-2 border-b border-[var(--border)] mb-1">
             <p className="text-[10px] font-bold text-[var(--ink-muted)] uppercase tracking-widest">Signed in as</p>
             <p className="text-sm font-bold text-[var(--ink)] truncate mt-0.5">{user.email}</p>
          </div>
          <Link
            href="/library"
            role="menuitem"
            tabIndex={0}
            onClick={() => setOpen(false)}
            className="block w-full px-4 py-2.5 text-left text-sm font-medium text-[var(--ink-muted)] hover:bg-[var(--control)] hover:text-[var(--ink)] transition-colors focus:outline-none"
          >
            Library
          </Link>
          <Link
            href="/account"
            role="menuitem"
            tabIndex={0}
            onClick={() => setOpen(false)}
            className="block w-full px-4 py-2.5 text-left text-sm font-medium text-[var(--ink-muted)] hover:bg-[var(--control)] hover:text-[var(--ink)] transition-colors focus:outline-none"
          >
            Account
          </Link>
          <hr className="my-1 border-[var(--border)]" />
          <button
            type="button"
            role="menuitem"
            tabIndex={0}
            onClick={() => {
              setOpen(false);
              signOut();
            }}
            className="block w-full px-4 py-2.5 text-left text-sm font-medium text-[var(--danger)] hover:bg-[var(--control)] transition-colors focus:outline-none"
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
