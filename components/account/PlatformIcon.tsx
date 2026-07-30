import { Crown, ChessKnight } from "lucide-react";
import type { Platform } from "@/lib/types";

interface PlatformIconProps {
  platform: Platform;
}

export function PlatformIcon({ platform }: PlatformIconProps) {
  if (platform === "chesscom") {
    return <Crown size={16} aria-hidden="true" />;
  }

  return <ChessKnight size={16} aria-hidden="true" />;
}
