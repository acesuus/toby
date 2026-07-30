"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Board from "@/components/Board";
import {
  EngineLines,
  type EngineAnalysisStatus,
  type PvMoveSelection,
} from "@/components/EngineLines";
import { EvalBar } from "@/components/EvalBar";
import { GameReviewSummary } from "@/components/GameReviewSummary";
import { MoveList } from "@/components/MoveList";
import { NavigationControls } from "@/components/NavigationControls";
import { SaveToLibraryButton } from "@/components/SaveToLibraryButton";
import { calculateGameAccuracy } from "@/lib/accuracy";
import { classifyMoves } from "@/lib/classifier";
import { CoachDialogue } from "@/components/CoachDialogue";
import { buildCoachingScript, getOpeningRemark } from "@/lib/coaching";
import { useCoach } from "@/lib/coach/use-coach";
import { getTemplatePhrase, getFallbackPhrase } from "@/lib/coach/templates";
import type { NotableGrade, RoutineGrade } from "@/lib/coach/types";
import { CurrentPositionAnalysis } from "@/lib/current-position-analysis";
import { useGameReview } from "@/lib/game-review-context";
import { findGameContinuationIndex } from "@/lib/pv-navigation";
import { analyzeGame } from "@/lib/stockfish/analyze";
import { StockfishEngine } from "@/lib/stockfish/engine";
import type { EngineLine } from "@/lib/types";
import { FULL_GAME_REVIEW_DEPTH } from "@/lib/types";
import { evalToWinPercent } from "@/lib/win-percent";

const MULTI_PV = 3;

type EnginePhase = "initializing" | "ready" | "error";

interface PositionAnalysisState {
  key: string;
  status: Exclude<EngineAnalysisStatus, "initializing">;
  lines: EngineLine[];
  depth: number | null;
  error: string | null;
}

function resultForSide(result: string, side: "white" | "black"): string | null {
  if (result === "1/2-1/2" || result === "½-½") return "½";
  if (result === "1-0") return side === "white" ? "1" : "0";
  if (result === "0-1") return side === "black" ? "1" : "0";
  return null;
}

function PlayerRow({ name, result, side }: { name: string; result: string | null; side: "white" | "black" }) {
  return (
    <div className="flex h-6 min-w-0 items-center justify-between gap-3 px-0.5" aria-label={result ? `${name}, score ${result}` : name}>
      <span className="flex min-w-0 items-center gap-1.5">
        <span className={`size-2.5 shrink-0 rounded-sm border border-[var(--border-strong)] ${side === "white" ? "bg-[var(--eval-light)]" : "bg-[var(--eval-dark)]"}`} aria-hidden="true" />
        <span className="truncate text-[11px] font-semibold text-[var(--ink)]">{name}</span>
      </span>
      {result && <span className="font-mono text-[11px] font-bold text-[var(--ink-muted)]">{result}</span>}
    </div>
  );
}

function generateCoachComment(whiteAcc: number, blackAcc: number): string {
  if (whiteAcc >= 90 && blackAcc >= 90) return "Exceptional play from both sides!";
  if (whiteAcc >= 80 && blackAcc >= 80) return "Strong play from both sides!";
  if (whiteAcc < 60 || blackAcc < 60) return "A rough game — let's find the key moments.";
  return "A few missed opportunities. Let's take a closer look.";
}

export default function ReviewPage() {
  const { state, dispatch } = useGameReview();
  const { parsedGame, analysisDepth, currentMoveIndex, error, analysisStatus, analysisProgress, gameAccuracy } = state;
  const analysisRef = useRef<CurrentPositionAnalysis | null>(null);
  const generationRef = useRef(0);
  const requestKeyRef = useRef("");
  const [enginePhase, setEnginePhase] = useState<EnginePhase>("initializing");
  const [engineError, setEngineError] = useState<string | null>(null);
  const [isMultiThreaded, setIsMultiThreaded] = useState(false);
  const [positionAnalysis, setPositionAnalysis] = useState<PositionAnalysisState>({
    key: "",
    status: "analyzing",
    lines: [],
    depth: null,
    error: null,
  });

  // When full review completes, show the review results view (replaces tabs)
  const [showReviewResults, setShowReviewResults] = useState(false);

  // Preview FEN from clicking a PV move (overrides board display temporarily)
  const [previewFen, setPreviewFen] = useState<string | null>(null);

  // Coaching walkthrough mode
  const [isCoaching, setIsCoaching] = useState(false);

  // LLM coaching hook
  const { status: coachStatus, gameSummary: llmSummary, getComment, fetchCoaching } = useCoach();

  // Full-game review engine ref and abort controller
  const reviewEngineRef = useRef<StockfishEngine | null>(null);
  const reviewAbortRef = useRef<AbortController | null>(null);

  const baseFen = parsedGame
    ? currentMoveIndex === -1
      ? parsedGame.startingFen
      : parsedGame.moves[currentMoveIndex]?.fenAfter ?? parsedGame.startingFen
    : "";
  const currentFen = previewFen ?? baseFen;
  const analysisKey = `${currentFen}\u0000${analysisDepth}`;

  // Clear preview when user navigates via move list or arrows
  useEffect(() => {
    queueMicrotask(() => setPreviewFen(null));
  }, [currentMoveIndex]);

  useEffect(() => {
    if (!parsedGame) return;

    const generation = ++generationRef.current;
    const engine = new StockfishEngine();
    queueMicrotask(() => {
      if (generationRef.current !== generation) return;
      setEnginePhase("initializing");
      setEngineError(null);
      setPositionAnalysis({ key: "", status: "analyzing", lines: [], depth: null, error: null });
    });

    void engine.initialize().then(() => {
      if (generationRef.current !== generation) {
        engine.terminate();
        return;
      }
      analysisRef.current = new CurrentPositionAnalysis(engine, MULTI_PV);
      setIsMultiThreaded(engine.isMultiThreaded());
      setEnginePhase("ready");
    }).catch((reason: unknown) => {
      if (generationRef.current !== generation) return;
      setEngineError(reason instanceof Error ? reason.message : "Stockfish failed to start");
      setEnginePhase("error");
    });

    return () => {
      generationRef.current += 1;
      requestKeyRef.current = "";
      analysisRef.current?.dispose();
      analysisRef.current = null;
      engine.terminate();
    };
  }, [parsedGame]);

  useEffect(() => {
    const analysis = analysisRef.current;
    if (!analysis || enginePhase !== "ready" || !currentFen) return;

    requestKeyRef.current = analysisKey;

    const beginAnalysis = () => {
      if (requestKeyRef.current !== analysisKey) return;
      if (!analysis.isCached(currentFen, analysisDepth)) {
        setPositionAnalysis({
          key: analysisKey,
          status: "analyzing",
          lines: [],
          depth: null,
          error: null,
        });
      }

      analysis.analyze(currentFen, analysisDepth, {
        onResult: (lines, completedDepth, complete) => {
          if (requestKeyRef.current !== analysisKey) return;
          setPositionAnalysis({
            key: analysisKey,
            status: complete ? "ready" : "analyzing",
            lines,
            depth: completedDepth,
            error: null,
          });
        },
        onError: (analysisError) => {
          if (requestKeyRef.current !== analysisKey) return;
          setPositionAnalysis((current) => ({
            ...current,
            key: analysisKey,
            status: "error",
            error: analysisError.message,
          }));
        },
      });
    };

    queueMicrotask(beginAnalysis);

    return () => {
      if (requestKeyRef.current === analysisKey) requestKeyRef.current = "";
      analysis.cancel();
    };
  }, [analysisDepth, analysisKey, currentFen, enginePhase]);

  // Cancel full-game review on unmount or when game changes
  useEffect(() => {
    return () => {
      reviewAbortRef.current?.abort();
      reviewAbortRef.current = null;
      reviewEngineRef.current?.terminate();
      reviewEngineRef.current = null;
    };
  }, [parsedGame]);

  const startFullGameReview = useCallback(async () => {
    if (!parsedGame) return;

    // Cancel any in-progress review
    reviewAbortRef.current?.abort();
    reviewEngineRef.current?.terminate();

    const abortController = new AbortController();
    reviewAbortRef.current = abortController;

    dispatch({ type: "startAnalysis" });

    try {
      const engine = new StockfishEngine();
      reviewEngineRef.current = engine;
      await engine.initialize();

      if (abortController.signal.aborted) {
        engine.terminate();
        return;
      }

      const evaluations = await analyzeGame(
        parsedGame,
        engine,
        FULL_GAME_REVIEW_DEPTH,
        (progress) => {
          dispatch({ type: "updateProgress", payload: progress });
        },
        abortController.signal,
        (evaluation) => {
          dispatch({ type: "addEvaluation", payload: evaluation });
        }
      );

      if (abortController.signal.aborted) {
        engine.terminate();
        return;
      }

      // Classify moves and calculate accuracy
      const classified = classifyMoves(parsedGame.moves, evaluations);
      dispatch({ type: "setClassifiedMoves", payload: classified });

      const accuracy = calculateGameAccuracy(classified);
      dispatch({ type: "setAccuracy", payload: accuracy });
      dispatch({ type: "completeAnalysis" });
      setShowReviewResults(true);

      // Populate the per-position cache with full-game results so that
      // navigating through reviewed positions is instant.
      // Cache at FULL_GAME_REVIEW_DEPTH — the per-position analyzer will
      // accept this for any requested depth <= FULL_GAME_REVIEW_DEPTH.
      if (analysisRef.current) {
        const positions = [parsedGame.startingFen, ...parsedGame.moves.map((m) => m.fenAfter)];
        for (let i = 0; i < evaluations.length; i++) {
          const ev = evaluations[i];
          analysisRef.current.populateCache(positions[i], FULL_GAME_REVIEW_DEPTH, [
            { multipv: 1, score: ev.score, pv: ev.pv, depth: ev.depth },
          ]);
        }
      }

      // Clean up the dedicated engine
      engine.terminate();
      reviewEngineRef.current = null;
      if (reviewAbortRef.current === abortController) {
        reviewAbortRef.current = null;
      }
    } catch (err: unknown) {
      if (
        abortController.signal.aborted ||
        (err instanceof Error && err.message === "Analysis cancelled")
      ) {
        // Expected when the user cancels or navigates away.
        return;
      }
      reviewAbortRef.current = null;
      reviewEngineRef.current = null;
      dispatch({ type: "setError", payload: err instanceof Error ? err.message : "Full-game analysis failed" });
    }
  }, [parsedGame, dispatch]);

  const cancelFullGameReview = useCallback(() => {
    reviewAbortRef.current?.abort();
    reviewAbortRef.current = null;
    reviewEngineRef.current?.terminate();
    reviewEngineRef.current = null;
    dispatch({ type: "cancelAnalysis" });
  }, [dispatch]);

  const handlePvMoveClick = useCallback((selection: PvMoveSelection) => {
    if (!parsedGame) return;
    const gameMoveIndex = findGameContinuationIndex(
      parsedGame.moves,
      currentMoveIndex,
      selection.uciMoves
    );

    if (gameMoveIndex !== null) {
      dispatch({ type: "navigateToMove", payload: gameMoveIndex });
      return;
    }

    setPreviewFen(selection.fen);
  }, [currentMoveIndex, dispatch, parsedGame]);

  if (!parsedGame) {
    return (
      <main className="grid min-h-screen place-items-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center shadow-[var(--shadow-card)]">
          <div className="mx-auto grid size-11 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]" aria-hidden="true">♞</div>
          <h1 className="mt-4 font-serif text-2xl font-semibold text-[var(--ink)]">No game at the table</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">Import a PGN or choose a recent game to explore its positions.</p>
          <Link href="/" className="mt-5 inline-flex rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[#fffaf0] transition hover:-translate-y-px hover:bg-[var(--accent-hover)] active:translate-y-0 motion-reduce:transition-none">Import a game</Link>
        </div>
      </main>
    );
  }

  const hasCurrentAnalysis = positionAnalysis.key === analysisKey;
  const engineLines = hasCurrentAnalysis ? positionAnalysis.lines : [];
  const engineStatus: EngineAnalysisStatus = enginePhase === "initializing"
    ? "initializing"
    : enginePhase === "error"
      ? "error"
      : hasCurrentAnalysis
        ? positionAnalysis.status
        : "analyzing";
  const visibleError = enginePhase === "error"
    ? engineError
    : hasCurrentAnalysis
      ? positionAnalysis.error
      : null;
  const currentEval = engineLines[0]?.score ?? null;
  const blackResult = resultForSide(parsedGame.headers.result, "black");
  const whiteResult = resultForSide(parsedGame.headers.result, "white");

  // Rule-based coaching script (one remark per classified move)
  const coachingScript = state.classifiedMoves.length > 0
    ? buildCoachingScript(state.classifiedMoves, gameAccuracy?.opening ?? null)
    : [];
  const canCoach = isCoaching && coachingScript.length > 0;

  // Determine per-move coaching text using the hybrid approach:
  // - Opening remark (currentMoveIndex === -1): use existing getOpeningRemark
  // - Routine moves (best, good, book, excellent): use getTemplatePhrase() directly
  // - Notable moves (mistake, blunder, inaccuracy, brilliant): use LLM comment, fallback to getFallbackPhrase()
  const ROUTINE_GRADES: Set<string> = new Set(["best", "good", "book", "excellent"]);
  const NOTABLE_GRADES: Set<string> = new Set(["mistake", "blunder", "inaccuracy", "brilliant"]);

  const currentClassifiedMove = currentMoveIndex >= 0 ? state.classifiedMoves[currentMoveIndex] : null;
  const isNotableMove = currentClassifiedMove != null && NOTABLE_GRADES.has(currentClassifiedMove.grade);
  const isRoutineMove = currentClassifiedMove != null && ROUTINE_GRADES.has(currentClassifiedMove.grade);

  let coachText: string;
  if (currentMoveIndex < 0) {
    // Opening remark
    coachText = getOpeningRemark(gameAccuracy?.opening ?? null);
  } else if (isRoutineMove && currentClassifiedMove && parsedGame) {
    // Routine move: use template phrase directly (no loading state)
    coachText = getTemplatePhrase({
      san: currentClassifiedMove.san,
      color: parsedGame.moves[currentMoveIndex].color,
      moveNumber: parsedGame.moves[currentMoveIndex].moveNumber,
      grade: currentClassifiedMove.grade as RoutineGrade,
      ply: currentMoveIndex,
    });
  } else if (isNotableMove && currentClassifiedMove && parsedGame) {
    // Notable move: use LLM comment if ready, fallback otherwise
    const llmComment = coachStatus === "ready" ? getComment(currentMoveIndex) : null;
    if (llmComment) {
      coachText = llmComment;
    } else if (coachStatus === "loading") {
      // Will show skeleton via loading prop
      coachText = "";
    } else {
      // Error or no LLM comment available: use fallback template
      coachText = getFallbackPhrase({
        san: currentClassifiedMove.san,
        color: parsedGame.moves[currentMoveIndex].color,
        moveNumber: parsedGame.moves[currentMoveIndex].moveNumber,
        grade: currentClassifiedMove.grade as NotableGrade,
        ply: currentMoveIndex,
      });
    }
  } else {
    // Fallback to legacy coaching script if classification data doesn't match
    coachText = coachingScript[currentMoveIndex]?.text ?? "";
  }

  const coachGrade = currentMoveIndex >= 0
    ? coachingScript[currentMoveIndex]?.grade ?? null
    : null;
  const lastMoveIndex = parsedGame.moves.length - 1;
  const modeLabel = canCoach
    ? "Coaching Walkthrough"
    : analysisStatus === "running" || (showReviewResults && analysisStatus === "complete" && gameAccuracy)
      ? "Game Review"
      : "Live Analysis";

  return (
    <div className="min-h-screen px-2 py-2 [--board-size:min(36rem,calc(100vw-3.75rem))] lg:h-[calc(100dvh-3rem)] lg:min-h-0 lg:overflow-hidden lg:px-4 lg:[--board-size:min(36rem,calc(100vw-29rem),calc(100dvh-5rem))]">
      <main className="mx-auto flex h-full w-full max-w-[1200px] flex-col">
        {error && (
          <div role="alert" className="mb-2 rounded-xl border border-[color-mix(in_srgb,var(--danger)_32%,transparent)] bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] px-4 py-2 text-sm text-[var(--danger)]">
            {error}
          </div>
        )}

        <div className="grid min-h-0 flex-1 items-start gap-3 lg:grid-cols-[calc(var(--board-size)+2.5rem)_minmax(21rem,1fr)]">
          <section aria-label="Game position" className="mx-auto w-fit min-w-0 lg:mx-0">
            <div className="grid grid-cols-[1.5rem_var(--board-size)] gap-x-2 sm:grid-cols-[2rem_var(--board-size)]">
              <div aria-hidden="true" />
              <PlayerRow name={parsedGame.headers.black} result={blackResult} side="black" />
            </div>

            <div className="my-0.5 grid grid-cols-[1.5rem_var(--board-size)] items-stretch gap-x-2 sm:grid-cols-[2rem_var(--board-size)]">
              <EvalBar score={currentEval} isLoading={engineStatus === "initializing" || engineStatus === "analyzing"} />
              <div className="w-[var(--board-size)]"><Board previewFen={previewFen} /></div>
            </div>

            <div className="grid grid-cols-[1.5rem_var(--board-size)] gap-x-2 sm:grid-cols-[2rem_var(--board-size)]">
              <div aria-hidden="true" />
              <PlayerRow name={parsedGame.headers.white} result={whiteResult} side="white" />
            </div>
          </section>

          <aside aria-label="Position analysis console" className="flex min-h-[26rem] flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)] lg:h-full lg:min-h-0">
            <div className="shrink-0 border-b border-[var(--border)] bg-[var(--control)] px-4 py-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-muted)]">
                {modeLabel}
              </span>
            </div>

            {/* Coaching walkthrough dialogue */}
            {canCoach && (
              <CoachDialogue
                text={coachText}
                grade={coachGrade}
                step={currentMoveIndex + 2}
                totalSteps={parsedGame.moves.length + 1}
                canPrev={currentMoveIndex > -1}
                canNext={currentMoveIndex < lastMoveIndex}
                onPrev={() => dispatch({ type: "navigateToMove", payload: currentMoveIndex - 1 })}
                onNext={() => dispatch({ type: "navigateToMove", payload: currentMoveIndex + 1 })}
                onExit={() => setIsCoaching(false)}
                loading={isNotableMove && coachStatus === "loading"}
              />
            )}

            {/* ============================================================= */}
            {/* REVIEW RESULTS VIEW — replaces tabs when review is complete    */}
            {/* ============================================================= */}
            {showReviewResults && analysisStatus === "complete" && gameAccuracy && !canCoach ? (
              <>
                {/* Header with back button and save icon */}
                <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-3 py-2">
                  <span className="text-xs font-semibold text-[var(--ink)]">Game Review</span>
                  <div className="flex items-center gap-2">
                    <SaveToLibraryButton variant="icon" />
                    <button
                      type="button"
                      onClick={() => setShowReviewResults(false)}
                      className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-[11px] font-semibold text-[var(--ink-muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
                    >
                      Back to Analysis
                    </button>
                  </div>
                </div>

                {/* Review content — scrollable */}
                <div className="min-h-0 flex-1 overflow-y-auto p-3">
                  <GameReviewSummary
                    whiteName={parsedGame.headers.white}
                    blackName={parsedGame.headers.black}
                    whiteAccuracy={gameAccuracy.white.accuracy}
                    blackAccuracy={gameAccuracy.black.accuracy}
                    whiteWinPercent={
                      state.evaluations.length > 0
                        ? evalToWinPercent(state.evaluations[state.evaluations.length - 1].score, "white")
                        : 50
                    }
                    whiteClassifications={gameAccuracy.white.classifications}
                    blackClassifications={gameAccuracy.black.classifications}
                    coachComment={generateCoachComment(gameAccuracy.white.accuracy, gameAccuracy.black.accuracy)}
                    llmSummary={llmSummary}
                    onStartReview={() => {
                      setIsCoaching(true);
                      dispatch({ type: "navigateToMove", payload: -1 });
                      // Trigger LLM coaching if there are notable moves
                      if (state.classifiedMoves.length > 0 && gameAccuracy && parsedGame) {
                        const hasNotable = state.classifiedMoves.some(m =>
                          ["mistake", "blunder", "inaccuracy", "brilliant"].includes(m.grade)
                        );
                        if (hasNotable) {
                          fetchCoaching(state.classifiedMoves, gameAccuracy, parsedGame.headers, "white"); // TODO: determine actual playerColor
                        }
                      }
                    }}
                  />
                </div>
              </>
            ) : (
              <>
                {/* ============================================================= */}
                {/* ANALYSIS VIEW — progressive engine lines above game moves  */}
                {/* ============================================================= */}

                {/* Full-game review: progress bar while running */}
                {analysisStatus === "running" && (
                  <div className="border-b border-[var(--border)] px-4 py-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[var(--ink)]">Analyzing game…</span>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-[10px] font-bold text-[var(--ink-muted)]">
                          {Math.round(analysisProgress * 100)}%
                        </span>
                        <button
                          type="button"
                          onClick={cancelFullGameReview}
                          className="rounded-lg border border-[var(--border-strong)] bg-[var(--surface-raised)] px-2.5 py-1 text-[11px] font-semibold text-[var(--ink)] transition-colors hover:border-[var(--danger)] hover:text-[var(--danger)]"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[var(--control)]">
                      <div
                        className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-200"
                        style={{ width: `${Math.round(analysisProgress * 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                  {!canCoach && (
                    <EngineLines
                      fen={currentFen}
                      lines={engineLines}
                      status={engineStatus}
                      depth={analysisDepth}
                      reachedDepth={hasCurrentAnalysis ? positionAnalysis.depth : null}
                      multiThreaded={isMultiThreaded}
                      errorMessage={visibleError}
                      onDepthChange={(depth) => dispatch({ type: "setDepth", payload: depth })}
                      onPvMoveClick={handlePvMoveClick}
                    />
                  )}
                  <MoveList />
                </div>

                {/* Full-game batch action sits below live position tools. */}
                {analysisStatus === "idle" && (
                  <div className="shrink-0 border-t border-[var(--border)] px-4 py-3">
                    <p className="mb-2.5 text-[11px] leading-[1.4] text-[var(--ink-muted)]">
                      Let Toby analyze your entire game to find key mistakes, blunders, and brilliant moves.
                    </p>
                    <button
                      type="button"
                      onClick={startFullGameReview}
                      className="w-full relative overflow-hidden rounded-lg bg-[var(--accent)] px-3 py-2.5 text-xs font-semibold text-[#fffaf0] shadow-sm ring-1 ring-inset ring-[color-mix(in_srgb,white_20%,transparent)] transition-all hover:bg-[var(--accent-hover)] hover:shadow-md active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                    >
                      Generate Full Game Report
                    </button>
                  </div>
                )}

                {analysisStatus === "complete" && !showReviewResults && (
                  <div className="shrink-0 border-t border-[var(--border)] px-4 py-2">
                    <button
                      type="button"
                      onClick={() => setShowReviewResults(true)}
                      className="w-full rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-[#fffaf0] transition-colors hover:bg-[var(--accent-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                    >
                      View Review Results
                    </button>
                  </div>
                )}

                {/* Navigation always pinned at bottom */}
                <NavigationControls />
              </>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}
