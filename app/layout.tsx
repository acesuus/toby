import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Lora } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

import { AppShell } from "@/components/AppShell";

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
    <html lang="en" className={`${inter.variable} ${lora.variable} ${jetBrainsMono.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="flex min-h-full bg-[var(--bg)]" suppressHydrationWarning>
        <Providers>
          <AppShell>
            {children}
          </AppShell>
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
