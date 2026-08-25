"use client";

import { Sidebar } from "./Sidebar";
import { AuthHeader } from "./AuthHeader";
import Link from "next/link";
import { Logo } from "./Logo";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Sidebar />
      
      <div className="flex-1 flex flex-col min-h-screen min-w-0 md:ml-16 transition-[margin] duration-300 ease-in-out">
        <header className="md:hidden sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--bg)]/80 px-4 backdrop-blur-md">
          <nav className="flex items-center gap-4">
            <Link href="/" className="group flex items-center gap-2.5 focus:outline-none">
              <Logo className="text-[var(--ink)] w-8 h-8 transition-transform group-hover:scale-105 shrink-0" />
              <span className="font-serif text-xl font-bold tracking-tight text-[var(--ink)] transition-colors group-hover:text-[var(--accent)]">Toby</span>
            </Link>
          </nav>
          <AuthHeader />
        </header>
        
        <main className="flex-1 flex flex-col">
          {children}
        </main>
      </div>
    </>
  );
}
