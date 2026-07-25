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

  // Unauthenticated state: "Sign in" link
  if (!user) {
    return (
      <Link
        href="/login"
        className="text-sm font-semibold text-[var(--accent)] hover:underline focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 rounded px-2 py-1"
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
        className="flex items-center gap-2 rounded-lg px-2 py-1 transition-colors hover:bg-[var(--control)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2"
      >
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt=""
            className="h-8 w-8 rounded-full object-cover"
          />
        ) : (
          <span
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-semibold text-white"
            aria-hidden="true"
          >
            {initials}
          </span>
        )}
        <span className="text-sm font-medium text-[var(--ink)] hidden sm:inline">
          {user.displayName || user.email}
        </span>
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Account actions"
          className="absolute right-0 top-full mt-2 w-48 rounded-lg bg-[var(--surface-raised)] py-1 shadow-[var(--shadow-card)] border border-[var(--border)] z-50"
        >
          <Link
            href="/library"
            role="menuitem"
            tabIndex={0}
            onClick={() => setOpen(false)}
            className="block w-full px-4 py-2 text-left text-sm text-[var(--ink)] hover:bg-[var(--control)] focus:bg-[var(--control)] focus:outline-none"
          >
            Library
          </Link>
          <Link
            href="/account"
            role="menuitem"
            tabIndex={0}
            onClick={() => setOpen(false)}
            className="block w-full px-4 py-2 text-left text-sm text-[var(--ink)] hover:bg-[var(--control)] focus:bg-[var(--control)] focus:outline-none"
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
            className="block w-full px-4 py-2 text-left text-sm text-[var(--ink)] hover:bg-[var(--control)] focus:bg-[var(--control)] focus:outline-none"
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
