import type { Metadata } from "next";
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

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${lora.variable} ${jetBrainsMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <Providers>
          <header className="flex h-10 shrink-0 items-center justify-between px-4">
            <span className="text-lg font-semibold text-[var(--ink)]">Toby</span>
            <AuthHeader />
          </header>
          {children}
        </Providers>
      </body>
    </html>
  );
}
