import { describe, it, expect } from "vitest";
import { gameReviewReducer, initialState } from "@/lib/game-review-context";
import type { GameReviewState } from "@/lib/types";
import type { ParsedGame } from "@/lib/types";

/**
 * Helper: creates a state with a parsedGame containing `n` moves.
 */
function stateWithMoves(n: number, overrides?: Partial<GameReviewState>): GameReviewState {
  const moves = Array.from({ length: n }, (_, i) => ({
    moveNumber: Math.floor(i / 2) + 1,
    color: (i % 2 === 0 ? "white" : "black") as "white" | "black",
    san: "e4",
    uci: "e2e4",
    fenBefore: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    fenAfter: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
  }));

  const parsedGame: ParsedGame = {
    headers: { white: "Player1", black: "Player2", result: "1-0" },
    moves,
    startingFen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  };

  return { ...initialState, parsedGame, ...overrides };
}

describe("State Management - navigateToMove clamping", () => {
  it("clamps navigateToMove(15) to 9 when game has 10 moves", () => {
    const state = stateWithMoves(10);
    const result = gameReviewReducer(state, { type: "navigateToMove", payload: 15 });
    expect(result.currentMoveIndex).toBe(9);
  });

  it("clamps navigateToMove(-5) to -1 when game has 10 moves", () => {
    const state = stateWithMoves(10);
    const result = gameReviewReducer(state, { type: "navigateToMove", payload: -5 });
    expect(result.currentMoveIndex).toBe(-1);
  });
});

describe("State Management - forward/backward at boundaries", () => {
  it("forward at end: navigating to index 10 stays at 9 (moves.length - 1)", () => {
    const state = stateWithMoves(10, { currentMoveIndex: 9 });
    const result = gameReviewReducer(state, { type: "navigateToMove", payload: 10 });
    expect(result.currentMoveIndex).toBe(9);
  });

  it("backward at start: navigating to -2 stays at -1", () => {
    const state = stateWithMoves(10, { currentMoveIndex: -1 });
    const result = gameReviewReducer(state, { type: "navigateToMove", payload: -2 });
    expect(result.currentMoveIndex).toBe(-1);
  });
});

describe("State Management - setDepth validation", () => {
  it("accepts valid depth value of 15", () => {
    const result = gameReviewReducer(initialState, { type: "setDepth", payload: 15 });
    expect(result.analysisDepth).toBe(15);
  });

  it("rejects depth below range (5) — analysisDepth unchanged", () => {
    const state = { ...initialState, analysisDepth: 18 };
    const result = gameReviewReducer(state, { type: "setDepth", payload: 5 });
    expect(result.analysisDepth).toBe(18);
  });

  it("rejects non-integer depth (15.5) — analysisDepth unchanged", () => {
    const state = { ...initialState, analysisDepth: 18 };
    const result = gameReviewReducer(state, { type: "setDepth", payload: 15.5 });
    expect(result.analysisDepth).toBe(18);
  });

  it("rejects setDepth during running analysis", () => {
    const state: GameReviewState = { ...initialState, analysisStatus: "running", analysisDepth: 18 };
    const result = gameReviewReducer(state, { type: "setDepth", payload: 20 });
    expect(result.analysisDepth).toBe(18);
  });

  it("accepts boundary value 10 (minimum)", () => {
    const result = gameReviewReducer(initialState, { type: "setDepth", payload: 10 });
    expect(result.analysisDepth).toBe(10);
  });

  it("accepts boundary value 25 (maximum)", () => {
    const result = gameReviewReducer(initialState, { type: "setDepth", payload: 25 });
    expect(result.analysisDepth).toBe(25);
  });
});
