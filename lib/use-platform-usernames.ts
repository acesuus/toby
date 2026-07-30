"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import type { PlatformUsernames } from "@/lib/account-types";

interface UsePlatformUsernamesReturn {
  usernames: PlatformUsernames;
  loading: boolean;
  refetch: () => Promise<void>;
}

export function usePlatformUsernames(): UsePlatformUsernamesReturn {
  const { user } = useAuth();
  const [usernames, setUsernames] = useState<PlatformUsernames>({
    chess_com_username: null,
    lichess_username: null,
  });
  const [loading, setLoading] = useState(true);

  const fetchUsernames = useCallback(async () => {
    if (!user) {
      setUsernames({ chess_com_username: null, lichess_username: null });
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/account/platforms");
      if (res.ok) {
        const data = await res.json();
        setUsernames(data);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchUsernames();
  }, [fetchUsernames]);

  return { usernames, loading, refetch: fetchUsernames };
}
