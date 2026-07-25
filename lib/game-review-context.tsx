"use client";

import {
  createContext,
  useContext,
  useReducer,
  type ReactNode,
} from "react";
import type {
  GameReviewState,
  GameListItem,
  ParsedGame,
  EngineEvaluation,
  ClassifiedMove,
  GameAccuracy,
} from "@/lib/types";
import { DEFAULT_ANALYSIS_DEPTH } from "@/lib/types";

// =============================================================================
// Action Types
// =============================================================================

export type GameReviewAction =
  | { type: "setImportMethod"; payload: "pgn" | "chesscom" | "lichess" | null }
  | { type: "setRawPgn"; payload: string | null }
  | { type: "setGameList"; payload: GameListItem[] }
  | { type: "selectGame"; payload: string | null }
  | { type: "setParsedGame"; payload: ParsedGame | null }
  | { type: "startAnalysis" }
  | { type: "updateProgress"; payload: number }
  | { type: "addEvaluation"; payload: EngineEvaluation }
  | { type: "completeAnalysis" }
  | { type: "setClassifiedMoves"; payload: ClassifiedMove[] }
  | { type: "setAccuracy"; payload: GameAccuracy | null }
  | { type: "navigateToMove"; payload: number }
  | { type: "setError"; payload: string | null }
  | { type: "setDepth"; payload: number };

// =============================================================================
// Initial State
// =============================================================================

export const initialState: GameReviewState = {
  importMethod: null,
  rawPgn: null,
  gameList: [],
  selectedGameId: null,
  parsedGame: null,
  analysisStatus: "idle",
  analysisProgress: 0,
  evaluations: [],
  analysisDepth: DEFAULT_ANALYSIS_DEPTH,
  classifiedMoves: [],
  gameAccuracy: null,
  currentMoveIndex: -1,
  error: null,
};

// =============================================================================
// Reducer
// =============================================================================

export function gameReviewReducer(
  state: GameReviewState,
  action: GameReviewAction
): GameReviewState {
  switch (action.type) {
    case "setImportMethod":
      return { ...state, importMethod: action.payload };

    case "setRawPgn":
      return { ...state, rawPgn: action.payload };

    case "setGameList":
      return { ...state, gameList: action.payload };

    case "selectGame":
      return { ...state, selectedGameId: action.payload };

    case "setParsedGame":
      return {
        ...state,
        parsedGame: action.payload,
        // Reset navigation when a new game is set
        currentMoveIndex: -1,
        // Reset analysis-related state
        evaluations: [],
        classifiedMoves: [],
        gameAccuracy: null,
        analysisStatus: "idle",
        analysisProgress: 0,
      };

    case "startAnalysis":
      return {
        ...state,
        analysisStatus: "running",
        analysisProgress: 0,
        evaluations: [],
        error: null,
      };

    case "updateProgress":
      return { ...state, analysisProgress: action.payload };

    case "addEvaluation":
      return {
        ...state,
        evaluations: [...state.evaluations, action.payload],
      };

    case "completeAnalysis":
      return { ...state, analysisStatus: "complete", analysisProgress: 1 };

    case "setClassifiedMoves":
      return { ...state, classifiedMoves: action.payload };

    case "setAccuracy":
      return { ...state, gameAccuracy: action.payload };

    case "navigateToMove": {
      const movesLength = state.parsedGame?.moves.length ?? 0;
      if (movesLength === 0) {
        // No parsed game or no moves — stay at -1
        return { ...state, currentMoveIndex: -1 };
      }
      // Clamp to [-1, moves.length - 1]
      const clamped = Math.max(-1, Math.min(action.payload, movesLength - 1));
      return { ...state, currentMoveIndex: clamped };
    }

    case "setError":
      return {
        ...state,
        error: action.payload,
        analysisStatus: action.payload ? "error" : state.analysisStatus,
      };

    case "setDepth": {
      const depth = action.payload;
      // Reject if analysis is running
      if (state.analysisStatus === "running") {
        return state;
      }
      // Reject if not an integer or outside [10, 25]
      if (!Number.isInteger(depth) || depth < 10 || depth > 25) {
        return state;
      }
      return { ...state, analysisDepth: depth };
    }

    default:
      return state;
  }
}

// =============================================================================
// Context
// =============================================================================

interface GameReviewContextValue {
  state: GameReviewState;
  dispatch: React.Dispatch<GameReviewAction>;
}

export const GameReviewContext = createContext<GameReviewContextValue | null>(
  null
);

// =============================================================================
// Provider Component
// =============================================================================

interface GameReviewProviderProps {
  children: ReactNode;
}

export function GameReviewProvider({ children }: GameReviewProviderProps) {
  const [state, dispatch] = useReducer(gameReviewReducer, initialState);

  return (
    <GameReviewContext.Provider value={{ state, dispatch }}>
      {children}
    </GameReviewContext.Provider>
  );
}

// =============================================================================
// Custom Hook
// =============================================================================

export function useGameReview(): GameReviewContextValue {
  const context = useContext(GameReviewContext);
  if (!context) {
    throw new Error("useGameReview must be used within a GameReviewProvider");
  }
  return context;
}
