# Implementation Plan: Chess Game Review

## Overview

Implement Toby's chess game review feature as a client-side pipeline: import → parse → analyze → classify → present. The implementation uses Next.js 16 App Router with React 19, TypeScript 5, chess.js for move validation, Stockfish WASM in a Web Worker for analysis, and Tailwind CSS 4 for styling. All computation runs in the browser with no backend required.

## Tasks

- [x] 1. Set up project foundation and shared types
  - [x] 1.1 Create shared TypeScript interfaces and types
    - Create `lib/types.ts` with all interfaces: Platform, GameListItem, ParsedGame, PGNHeaders, ParsedMove, EngineEvaluation, EvalScore, MoveGrade, ClassifiedMove, GameAccuracy, SideAccuracy, OpeningInfo, CriticalMoment, ClassificationThresholds, WinPercentConfig, GameReviewState, EvalGraphProps
    - Define default constants: DEFAULT_THRESHOLDS, WIN_PERCENT_MULTIPLIER, default analysis depth
    - _Requirements: 4.1, 4.2, 6.2, 7.1, 8.1, 9.1, 9.4, 9.5_

  - [x] 1.2 Configure cross-origin isolation headers in Next.js
    - Update `next.config.ts` to add Cross-Origin-Embedder-Policy: require-corp and Cross-Origin-Opener-Policy: same-origin headers to all responses
    - Add Content Security Policy with script-src 'self' 'wasm-unsafe-eval' and worker-src 'self'
    - _Requirements: 15.1, 15.2, 15.3, 15.4_

  - [x] 1.3 Install dependencies
    - Install `chess.js` for move validation and PGN parsing
    - Install `react-chessboard` (or `chessground`) for board rendering
    - Install `fast-check` as a dev dependency for property-based testing
    - Add stockfish WASM files to `public/stockfish/`
    - _Requirements: 5.1, 14.1_

- [x] 2. Implement Win Percentage Conversion module
  - [x] 2.1 Implement the win-percent conversion functions
    - Create `lib/win-percent.ts` with `centipawnToWinPercent(cp)` using the sigmoid formula: 50 + 50 * (2 / (1 + exp(-0.00368208 * cp)) - 1)
    - Implement `evalToWinPercent(score, perspective)` handling mate scores (100/0) and centipawn scores
    - Handle edge cases: NaN → 50, +Infinity → 100, -Infinity → 0
    - Ensure symmetry: white perspective + black perspective = 100
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

  - [x] 2.2 Write property tests for win-percent conversion
    - **Property 4: Win Percent Bounds** — for any finite cp value, result is in [0, 100]
    - **Property 5: Win Percent Symmetry** — white perspective + black perspective = 100
    - **Property 6: Win Percent Monotonicity** — cp1 < cp2 implies winPercent(cp1) < winPercent(cp2)
    - **Validates: Requirements 7.1, 7.3, 7.6**

  - [x] 2.3 Write unit tests for win-percent conversion
    - Test cp=0 returns exactly 50
    - Test mate scores: positive mate → 100 (white), negative mate → 0 (white)
    - Test edge cases: NaN, Infinity, -Infinity
    - Test large positive/negative cp values approach 100/0 asymptotically
    - _Requirements: 7.2, 7.4, 7.5, 7.7_

- [x] 3. Implement PGN Parser module
  - [x] 3.1 Implement PGN parsing logic
    - Create `lib/pgn-parser.ts` using chess.js for move replay and validation
    - Implement `parsePGN(pgn: string): ParsedGame` that extracts headers (White, Black, Result, ECO, Opening, TimeControl, etc.)
    - Replay all moves on an internal board to produce FEN before/after each half-move
    - Generate UCI notation for each move alongside SAN
    - Handle starting FEN from header tag or default starting position
    - Strip comments, annotations, and RAV (recursive annotation variations) before parsing moves
    - _Requirements: 4.1, 4.2, 4.4, 4.5, 4.6, 1.1_

  - [x] 3.2 Implement PGN validation and error handling
    - Validate required headers (White, Black, Result) are present; return error with missing header names
    - Validate move legality; return error identifying the illegal move's SAN, move number, and color
    - Enforce 100,000 character limit on input
    - Support castling (O-O, O-O-O), en passant, promotions (e8=Q), check/checkmate annotations
    - _Requirements: 1.2, 1.3, 1.5, 4.3, 4.5_

  - [x] 3.3 Write property tests for PGN parser
    - **Property 9: Parse Roundtrip Legality** — for any successfully parsed game, every move is legal from its fenBefore position
    - **Validates: Requirements 4.4**

  - [x] 3.4 Write unit tests for PGN parser
    - Test valid PGN with standard game (headers + moves parsed correctly)
    - Test missing required headers produce correct error
    - Test illegal move detection (correct move number, SAN, color reported)
    - Test special moves: castling, en passant, promotions
    - Test PGN with comments and annotations are stripped correctly
    - Test input exceeding 100,000 characters is rejected
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 4.1, 4.2, 4.3, 4.5, 4.6_

- [x] 4. Checkpoint - Core logic foundation
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement Game Fetcher module
  - [x] 5.1 Implement Chess.com API client
    - Create `lib/fetcher.ts` with `fetchRecentGames(platform, username)` and `fetchGamePGN(platform, gameId)`
    - Implement Chess.com archive API integration: fetch latest archives, retrieve up to 50 most recent games
    - Normalize Chess.com response into GameListItem format (id, white, black, result, timeControl, date, pgn)
    - Handle errors: user-not-found (distinct message), rate-limit, network error, 15-second timeout
    - Validate username format before API call (alphanumeric, underscores, hyphens, 3–25 characters)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [x] 5.2 Implement Lichess API client
    - Add Lichess API integration: fetch up to 20 most recent games via Lichess games API
    - Normalize Lichess response into GameListItem format
    - Handle errors: user-not-found, rate-limit, network error, empty response (zero games found)
    - Validate username format before API call (alphanumeric, hyphens, underscores, 2–20 characters)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

  - [x] 5.3 Write property tests for API normalization
    - **Property 11: API Normalization Completeness** — for any valid API response, normalized GameListItem contains all required fields
    - **Validates: Requirements 2.2, 3.2**

  - [x] 5.4 Write unit tests for Game Fetcher
    - Test Chess.com normalization with mocked API responses
    - Test Lichess normalization with mocked API responses
    - Test username validation (valid/invalid formats)
    - Test error handling: user-not-found, rate-limit, timeout
    - Test empty game list from Lichess
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.6, 2.7, 3.1, 3.2, 3.3, 3.4, 3.6, 3.7_

- [x] 6. Implement Stockfish Engine Worker
  - [x] 6.1 Create Web Worker entry point for Stockfish
    - Create `lib/stockfish/worker.ts` as the Web Worker entry point
    - Load Stockfish WASM binary and establish UCI protocol communication
    - Handle message passing: initialize, evaluate, getBestMove, terminate commands
    - Detect SharedArrayBuffer availability for multi-threaded vs single-threaded mode
    - _Requirements: 5.1, 5.2, 5.3, 14.1_

  - [x] 6.2 Implement StockfishEngine class
    - Create `lib/stockfish/engine.ts` implementing the StockfishEngine interface
    - Implement `initialize()`: spawn Worker, load WASM, configure hash/threads, verify isReady within 30 seconds
    - Implement `evaluate(fen, depth)`: send UCI commands, parse evaluation response into EngineEvaluation
    - Implement `getBestMove(fen, depth)` and `terminate()`
    - Process evaluations sequentially (queue requests, never concurrent)
    - Handle initialization failures: timeout (30s), memory limits, missing WASM binary
    - Retry once on invalid/unparseable Stockfish response before marking as error
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 6.1, 6.2, 6.3, 6.5, 6.6, 6.7, 6.8, 14.1, 14.4_

  - [x] 6.3 Implement analysis pipeline orchestrator
    - Create the `analyzeGame` function that iterates all positions (N+1) and calls engine.evaluate for each
    - Report progress via callback with strictly monotonically increasing values from ~0 to 1
    - Support cancellation (terminate engine on navigation away or new game import)
    - Transition status from "running" to "complete" when all evaluations finish
    - _Requirements: 6.1, 6.4, 6.5, 6.7_

  - [x] 6.4 Write property tests for analysis pipeline
    - **Property 1: Evaluation Coverage** — for N moves, produces exactly N+1 evaluations
    - **Property 10: Progress Monotonicity** — progress values are strictly monotonically increasing from ~0 to 1
    - **Validates: Requirements 6.1, 6.4**

  - [x] 6.5 Write unit tests for Stockfish Engine
    - Test initialization success path (isReady = true)
    - Test SharedArrayBuffer detection and fallback
    - Test 30-second timeout on initialization
    - Test sequential evaluation processing
    - Test clean termination during analysis
    - Test retry on invalid response
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.7, 6.5, 6.6, 6.8_

- [x] 7. Checkpoint - Engine integration
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement Move Classifier module
  - [x] 8.1 Implement move classification logic
    - Create `lib/classifier.ts` with `classifyMoves(moves, evaluations)` function
    - Implement `classifyMove` applying the threshold logic: book (index < limit), best (within 0.1 of best), excellent (≤0.5), good (≤2), inaccuracy (≤5), mistake (≤10), blunder (>10)
    - Use win-percent module for cp→win% conversion per side's perspective
    - Return ClassifiedMove[] with grade, evalBefore, evalAfter, bestMove, winPercentBefore, winPercentAfter, winPercentLoss
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9_

  - [x] 8.2 Write property tests for move classification
    - **Property 2: Classification Totality** — every move gets exactly one grade
    - **Property 3: Monotone Thresholds** — smaller winPercentLoss implies equal or better grade
    - **Validates: Requirements 8.1, 8.9, 8.4, 8.5, 8.6, 8.7, 8.8**

  - [x] 8.3 Write unit tests for move classification
    - Test book move classification (index < book limit)
    - Test "best" classification (within 0.1 of engine best)
    - Test each threshold boundary: excellent/good/inaccuracy/mistake/blunder
    - Test classification from both white and black perspectives
    - _Requirements: 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8_

- [x] 9. Implement Accuracy Calculator module
  - [x] 9.1 Implement accuracy scoring logic
    - Create `lib/accuracy.ts` with `calculateGameAccuracy(classifiedMoves)` function
    - Implement weighted accuracy: moveAccuracy = max(0, 100 - wpLoss * 10), positionWeight = max(1, abs(wpBefore - 50) / 10 + 1)
    - Exclude book moves from accuracy calculation; return 100 if no non-book moves
    - Compute grade counts per side (sum must equal total half-moves for that side)
    - Compute average centipawn loss per side (excluding book moves)
    - Identify critical moments (win% swing > 10 points between consecutive positions)
    - Round final accuracy to one decimal place
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_

  - [x] 9.2 Implement opening detection
    - Implement `detectOpening(moves)` function using ECO code from PGN headers
    - Fall back to move-matching against a bundled ECO database if available
    - Return OpeningInfo with eco, name, and number of half-moves in known line
    - Return fallback ("Unknown Opening", eco="", moves=0) if no match found
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [x] 9.3 Write property tests for accuracy calculator
    - **Property 7: Accuracy Bounds** — accuracy is always in [0, 100], returns 100 for all-book moves
    - **Property 14: Grade Count Consistency** — sum of grade counts equals total moves for that side
    - **Validates: Requirements 9.1, 9.2, 9.5**

  - [x] 9.4 Write unit tests for accuracy calculator
    - Test weighted scoring with hand-calculated examples
    - Test book move exclusion
    - Test all-book returns 100
    - Test critical moment detection (swing > 10 points)
    - Test grade count totals match move count
    - Test opening detection from headers and fallback
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 10.1, 10.2, 10.4_

- [x] 10. Checkpoint - Analysis pipeline complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Implement UI state management
  - [x] 11.1 Create GameReviewState context and reducer
    - Create a React context + useReducer pattern for GameReviewState
    - Implement actions: setImportMethod, setRawPgn, setGameList, selectGame, setParsedGame, startAnalysis, updateProgress, addEvaluation, completeAnalysis, setClassifiedMoves, setAccuracy, navigateToMove, setError, setDepth
    - Validate currentMoveIndex bounds (-1 to moves.length - 1)
    - Validate analysisDepth bounds (10–25, integer only)
    - _Requirements: 12.1, 12.5, 13.1, 13.2, 13.3_

  - [x] 11.2 Write property tests for state management
    - **Property 8: Move Index Integrity** — currentMoveIndex always within [-1, moves.length - 1]
    - **Property 13: Depth Validation Bounds** — only values in [10, 25] are accepted
    - **Validates: Requirements 12.1, 13.1, 13.3**

  - [x] 11.3 Write unit tests for state management
    - Test navigateToMove keeps index in bounds
    - Test forward/backward at boundaries stays in place
    - Test depth validation rejects out-of-range and non-integer values
    - Test depth control disabled during running analysis
    - _Requirements: 12.1, 12.4, 12.5, 13.1, 13.2, 13.3, 13.4_

- [x] 12. Implement Import Panel UI
  - [x] 12.1 Create ImportPanel component
    - Create `components/ImportPanel.tsx` with tabs/buttons for PGN paste, Chess.com, and Lichess import methods
    - Implement PGN paste textarea with submit button, character limit display, inline validation errors
    - Implement username input fields with platform-specific validation (format, length)
    - Show loading state during API fetch, error messages with retry option, fallback to PGN paste on failure
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.3, 2.4, 2.5, 2.6, 3.3, 3.4, 3.5, 3.6_

  - [x] 12.2 Create GameSelector component
    - Create `components/GameSelector.tsx` displaying fetched game list
    - Show player names, result, time control, date for each game
    - Handle selection and trigger PGN parsing on game select
    - Display "no games found" message for empty results
    - _Requirements: 2.1, 2.2, 3.1, 3.2, 3.7_

- [x] 13. Implement Board and Move Navigation UI
  - [x] 13.1 Create Board component
    - Create `components/Board.tsx` using react-chessboard (or chessground)
    - Display position from FEN based on currentMoveIndex
    - Highlight last move played
    - Ensure board is responsive and accessible
    - _Requirements: 12.2_

  - [x] 13.2 Create MoveList component
    - Create `components/MoveList.tsx` displaying all moves with move numbers
    - Color-code or badge moves by their classification grade
    - Highlight the currently selected move
    - Handle click on a move to navigate (update currentMoveIndex)
    - _Requirements: 12.2, 12.3_

  - [x] 13.3 Implement navigation controls
    - Add forward/backward buttons and keyboard arrow key handlers
    - Implement first-move and last-move jump buttons
    - Clamp navigation at bounds (-1 and moves.length - 1) without error
    - _Requirements: 12.1, 12.4, 12.5_

- [x] 14. Implement Evaluation Graph component
  - [x] 14.1 Create EvalGraph component
    - Create `components/EvalGraph.tsx` rendering an interactive SVG/Canvas chart
    - Plot evaluation clamped to ±10 pawns vs move number; render mate scores at ±10 boundary
    - Color regions: white above midline, black below
    - Highlight currently selected move with a distinct marker
    - Mark blunders and mistakes with distinct visual indicators (distinguishable from each other)
    - Handle click on graph points to navigate to nearest move
    - Show placeholders for unevaluated positions during incomplete analysis
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_

  - [x] 14.2 Write property tests for eval graph clamping
    - **Property 12: Eval Graph Clamping** — all plotted values are clamped to [-10, +10] pawns for any evaluation input
    - **Validates: Requirements 11.1**

- [x] 15. Implement Game Summary and Analysis Progress UI
  - [x] 15.1 Create GameSummary component
    - Create `components/GameSummary.tsx` displaying per-side accuracy scores, grade breakdowns, average centipawn loss
    - Show opening name and ECO code
    - Display critical moments with move index and description
    - _Requirements: 9.1, 9.5, 9.6, 9.7, 10.1_

  - [x] 15.2 Create AnalysisProgress component
    - Create `components/AnalysisProgress.tsx` with a progress bar during analysis
    - Display percentage complete (derived from onProgress callback)
    - Show analysis depth setting with validation (10–25)
    - Disable depth control while analysis is running
    - Show single-threaded mode info banner when SharedArrayBuffer unavailable
    - _Requirements: 6.4, 13.1, 13.2, 13.3, 13.4, 5.3_

- [x] 16. Checkpoint - UI components complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 17. Wire all components into pages
  - [x] 17.1 Implement the landing/import page
    - Update `app/page.tsx` to serve as the landing page with ImportPanel and GameSelector
    - Connect import actions to GameReviewState context
    - Handle game selection and navigate to review page with parsed game
    - _Requirements: 1.1, 1.4, 2.1, 3.1_

  - [x] 17.2 Implement the review page
    - Create `app/review/page.tsx` with the full review layout: Board, MoveList, EvalGraph, GameSummary, AnalysisProgress
    - Wire state: start analysis on page load when parsedGame is available
    - Connect navigation (MoveList clicks, EvalGraph clicks, keyboard/buttons) to currentMoveIndex
    - Show evaluation/classification for current move once available
    - Allow navigation even when analysis is incomplete (show data only for analyzed moves)
    - Terminate engine on unmount or new game import
    - _Requirements: 12.2, 12.3, 12.4, 12.6, 6.5, 14.4, 14.5_

  - [x] 17.3 Set up GameReviewState provider in layout
    - Wrap the app with GameReviewState context provider in `app/layout.tsx` or a client-side wrapper
    - Ensure state persists across page navigation (landing → review)
    - _Requirements: 14.2_

- [x] 18. Implement security and input sanitization
  - [x] 18.1 Add PGN input sanitization
    - Ensure PGN parser treats all input as untrusted: strip non-PGN content, reject anything that is not valid headers, move text, comments, or standard annotations
    - Verify no game data is transmitted externally during analysis
    - _Requirements: 14.3, 14.5, 14.6_

- [x] 19. Final checkpoint - Full integration
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The Stockfish WASM binary must be placed in `public/stockfish/` and loaded from there
- Cross-origin isolation headers are essential for SharedArrayBuffer (multi-threaded mode)
- All state management uses React context + useReducer — no external state library needed

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3"] },
    { "id": 1, "tasks": ["2.1", "3.1", "5.1", "5.2"] },
    { "id": 2, "tasks": ["2.2", "2.3", "3.2", "5.3", "5.4"] },
    { "id": 3, "tasks": ["3.3", "3.4", "6.1"] },
    { "id": 4, "tasks": ["6.2", "6.3"] },
    { "id": 5, "tasks": ["6.4", "6.5", "8.1"] },
    { "id": 6, "tasks": ["8.2", "8.3", "9.1", "9.2"] },
    { "id": 7, "tasks": ["9.3", "9.4", "11.1"] },
    { "id": 8, "tasks": ["11.2", "11.3", "12.1", "12.2"] },
    { "id": 9, "tasks": ["13.1", "13.2", "13.3", "14.1", "15.1", "15.2"] },
    { "id": 10, "tasks": ["14.2"] },
    { "id": 11, "tasks": ["17.1", "17.2", "17.3"] },
    { "id": 12, "tasks": ["18.1"] }
  ]
}
```
