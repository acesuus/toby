"use client";

import { GameReviewProvider } from "@/lib/game-review-context";
import { AuthProvider } from "@/lib/auth-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <GameReviewProvider>
      <AuthProvider>{children}</AuthProvider>
    </GameReviewProvider>
  );
}
