import type { Metadata } from "next";
import Link from "next/link";
import { Inter, JetBrains_Mono, Lora } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { AuthHeader } from "@/components/AuthHeader";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  display: "swap",
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Toby — Chess Game Review", template: "%s · Toby" },
  description: "Private, in-browser chess analysis with Stockfish.",
};

import { Toaster } from "sonner";

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${lora.variable} ${jetBrainsMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <Providers>
          <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--bg)]/80 px-4 backdrop-blur-md sm:px-6">
            <nav className="flex items-center gap-8">
              <Link href="/" className="group flex items-center gap-2.5 focus:outline-none">
                <span className="grid size-8 place-items-center rounded-lg bg-[var(--accent)] text-[#fffaf0] shadow-sm font-serif font-bold leading-none transition-transform group-hover:scale-105">T</span>
                <span className="font-serif text-xl font-bold tracking-tight text-[var(--ink)] transition-colors group-hover:text-[var(--accent)]">Toby</span>
              </Link>
              <div className="hidden sm:flex items-center gap-6 mt-0.5">
                <Link href="/library" className="rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-[var(--ink-muted)] transition-colors hover:bg-[var(--control)] hover:text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]">Library</Link>
              </div>
            </nav>
            <AuthHeader />
          </header>
          {children}
          <Toaster
            theme="system"
            toastOptions={{
              classNames: {
                toast: "bg-[var(--surface-raised)] border-[var(--border)] text-[var(--ink)] font-sans shadow-md rounded-xl",
                description: "text-[var(--ink-muted)]",
                error: "bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] border-[color-mix(in_srgb,var(--danger)_32%,transparent)] text-[var(--danger)]",
                success: "bg-[var(--surface-raised)] border-[var(--border)] text-[var(--accent)]",
              }
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
