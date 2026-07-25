"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { ClassifiedMove, GameAccuracy, PGNHeaders } from "@/lib/types";
import type { BatchResponse } from "@/lib/coach/types";
import { buildBatchRequest } from "@/lib/coach/payload";

export interface UseCoachResult {
  /** Loading state for the batch request */
  status: "idle" | "loading" | "ready" | "error";
  /** LLM-generated game summary (null until ready) */
  gameSummary: string | null;
  /** Get the LLM comment for a specific ply (null if not a notable move) */
  getComment(ply: number): string | null;
  /** Trigger the batch request */
  fetchCoaching(
    classifiedMoves: ClassifiedMove[],
    gameAccuracy: GameAccuracy,
    headers: PGNHeaders,
    playerColor: "white" | "black"
  ): void;
}

/**
 * React hook that manages the LLM coaching lifecycle.
 *
 * Fires a single batch POST to /api/coach when fetchCoaching is called,
 * stores move comments in a Map for O(1) ply lookup, and exposes
 * loading/error/ready status with an abort-on-unmount cleanup.
 */
export function useCoach(): UseCoachResult {
  const [status, setStatus] = useState<UseCoachResult["status"]>("idle");
  const [gameSummary, setGameSummary] = useState<string | null>(null);

  const moveCommentsRef = useRef<Map<number, string>>(new Map());
  const abortControllerRef = useRef<AbortController | null>(null);

  const getComment = useCallback((ply: number): string | null => {
    return moveCommentsRef.current.get(ply) ?? null;
  }, []);

  const fetchCoaching = useCallback(
    async (
      classifiedMoves: ClassifiedMove[],
      gameAccuracy: GameAccuracy,
      headers: PGNHeaders,
      playerColor: "white" | "black"
    ): Promise<void> => {
      // Abort any in-flight request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      const payload = buildBatchRequest(
        classifiedMoves,
        gameAccuracy,
        headers,
        playerColor
      );

      setStatus("loading");
      setGameSummary(null);
      moveCommentsRef.current = new Map();

      try {
        const response = await fetch("/api/coach", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        if (!response.ok) {
          setStatus("error");
          return;
        }

        const data: BatchResponse = await response.json();

        // Populate the Map from the response moveComments array
        const comments = new Map<number, string>();
        for (const mc of data.moveComments) {
          comments.set(mc.ply, mc.comment);
        }
        moveCommentsRef.current = comments;

        setGameSummary(data.summary);
        setStatus("ready");
      } catch (err: unknown) {
        // Don't set error state if the request was intentionally aborted
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
        setStatus("error");
      }
    },
    []
  );

  // Abort in-flight request on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return { status, gameSummary, getComment, fetchCoaching };
}
