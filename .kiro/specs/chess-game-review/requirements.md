# Requirements Document

## Introduction

Toby is a client-side chess game review application. Users import chess games (via PGN paste, Chess.com, or Lichess), analyze them move-by-move using Stockfish WASM running in the browser, and receive a comprehensive review including move classifications, accuracy scores, an evaluation graph, and a game summary. All computation happens locally in the browser with no backend or user accounts required.

## Glossary

- **Game_Fetcher**: The module responsible for retrieving game data from Chess.com and Lichess public APIs
- **PGN_Parser**: The module that parses PGN (Portable Game Notation) text into a structured game representation with FEN positions
- **Stockfish_Engine**: The WASM-based chess engine running in a Web Worker that evaluates positions
- **Move_Classifier**: The module that assigns grades to moves based on win-percentage loss thresholds
- **Accuracy_Calculator**: The module that computes per-side accuracy scores and game summary statistics
- **Eval_Graph**: The interactive chart component displaying evaluation over the course of the game
- **Win_Percent**: A value in the range [0, 100] representing a side's estimated probability of winning from a given position
- **Centipawn**: A unit of evaluation equal to 1/100th of a pawn's value, from white's perspective
- **MoveGrade**: One of the classification labels: book, best, excellent, good, inaccuracy, mistake, blunder
- **FEN**: Forsyth–Edwards Notation, a standard for describing a chess position
- **PGN**: Portable Game Notation, a standard for recording chess games
- **UCI**: Universal Chess Interface, a protocol for communicating with chess engines
- **Critical_Moment**: A position in the game where a large evaluation swing occurred
- **Analysis_Pipeline**: The sequential process of import → parse → analyze → classify → present

## Requirements

### Requirement 1: Game Import via PGN Paste

**User Story:** As a user, I want to paste PGN text directly into the application, so that I can review any chess game I have in PGN format.

#### Acceptance Criteria

1. WHEN a user pastes valid PGN text of at most 100,000 characters containing at least one legal move and submits it, THE PGN_Parser SHALL parse it into a structured ParsedGame containing headers, moves, and a starting FEN within 2 seconds
2. IF a user submits PGN text that is missing any required header (White, Black, or Result), THEN THE PGN_Parser SHALL reject the input and return an error message indicating which required headers are missing
3. IF a user submits PGN text containing an illegal move, THEN THE PGN_Parser SHALL reject the input and identify the illegal move by its SAN notation, move number, and color (white or black)
4. IF the PGN parsing fails, THEN THE Application SHALL display the validation error inline and allow the user to edit and re-submit without clearing the previously loaded ParsedGame
5. IF a user submits PGN text exceeding 100,000 characters, THEN THE Application SHALL reject the input and display an error message indicating the maximum allowed length

### Requirement 2: Game Import via Chess.com

**User Story:** As a user, I want to import games from Chess.com by entering a username, so that I can review my online games without manually copying PGN.

#### Acceptance Criteria

1. WHEN a user enters a Chess.com username and requests game import, THE Game_Fetcher SHALL retrieve up to 50 of the most recent games from the Chess.com archives API, starting from the latest available monthly archive
2. WHEN the Chess.com API returns game data, THE Game_Fetcher SHALL normalize each game into a GameListItem containing id, player names, result, time control, date, and PGN
3. IF the Chess.com API returns a user-not-found error, THEN THE Application SHALL display an error message indicating the username was not found, distinct from network or timeout errors
4. IF the Chess.com API returns a rate-limit or network error, THEN THE Application SHALL display an error message indicating the type of failure (rate-limit or network) and allow the user to retry the request
5. IF a Chess.com API request fails, THEN THE Application SHALL offer PGN paste as a fallback import method
6. IF the user submits an empty username or a username containing characters not permitted by Chess.com (only alphanumeric characters, underscores, and hyphens allowed, between 3 and 25 characters), THEN THE Application SHALL display a validation error without making an API request
7. IF a Chess.com API request does not respond within 15 seconds, THEN THE Application SHALL abort the request and display a timeout error message with the option to retry

### Requirement 3: Game Import via Lichess

**User Story:** As a user, I want to import games from Lichess by entering a username, so that I can review my Lichess games without manually copying PGN.

#### Acceptance Criteria

1. WHEN a user enters a Lichess username and requests game import, THE Game_Fetcher SHALL retrieve at most 20 of the user's most recent games from the Lichess games API
2. WHEN the Lichess API returns game data, THE Game_Fetcher SHALL normalize each game into a GameListItem containing id, player names, result, time control, date, and PGN
3. IF the Lichess API returns a user-not-found error, THEN THE Application SHALL display a message indicating the username does not exist, distinct from network error messages
4. IF the Lichess API returns a rate-limit or network error, THEN THE Application SHALL display an error message indicating the nature of the failure (rate-limit or connectivity) and present a retry action
5. IF a Lichess API request fails, THEN THE Application SHALL offer PGN paste as a fallback import method
6. IF the user submits an empty username or a username that does not match Lichess format constraints (2–20 characters, alphanumeric, hyphens, and underscores only), THEN THE Application SHALL display a validation error without sending a request to the API
7. IF the Lichess API returns a successful response containing zero games, THEN THE Application SHALL display a message indicating no games were found for that user

### Requirement 4: PGN Parsing and Validation

**User Story:** As a user, I want my imported games to be fully parsed and validated, so that I can trust the analysis is based on a legal game.

#### Acceptance Criteria

1. WHEN valid PGN is provided, THE PGN_Parser SHALL extract all header tags including event, site, date, white, black, result, eco, opening, and time control, returning null for any optional header not present in the PGN text
2. WHEN valid PGN is provided, THE PGN_Parser SHALL replay all moves on an internal board and produce a ParsedMove for each half-move containing move number, color, SAN notation, UCI notation, FEN before, and FEN after
3. IF any move in the PGN is not legal from its preceding position, THEN THE PGN_Parser SHALL reject the input and return an error identifying the illegal move's SAN, move number, and color
4. WHEN valid PGN is provided, THE PGN_Parser SHALL produce a startingFen set to the value of the FEN header tag if present, or the standard chess starting position if the FEN header is absent
5. THE PGN_Parser SHALL correctly parse and validate castling (O-O, O-O-O), en passant captures, pawn promotions (e.g., e8=Q), and check/checkmate annotations (+ and #) such that the resulting FEN after each such move reflects the correct board state
6. WHEN valid PGN containing move annotations, comments, or recursive annotation variations (RAV) is provided, THE PGN_Parser SHALL ignore annotations and comments and parse only the main line moves

### Requirement 5: Stockfish Engine Initialization

**User Story:** As a user, I want the Stockfish engine to start reliably in my browser, so that I can analyze games regardless of my browser's specific capabilities.

#### Acceptance Criteria

1. WHEN the application initializes the engine, THE Stockfish_Engine SHALL load the WASM binary in a Web Worker separate from the main thread
2. WHEN SharedArrayBuffer is available, THE Stockfish_Engine SHALL use multi-threaded WASM for improved performance
3. WHEN SharedArrayBuffer is unavailable, THE Stockfish_Engine SHALL fall back to single-threaded WASM and display a persistent, non-blocking informational banner indicating that analysis will run in single-threaded mode and may be slower
4. WHEN initialization completes successfully, THE Stockfish_Engine SHALL report isReady as true within 30 seconds of the initialization request
5. IF the browser does not support WebAssembly or Web Workers, THEN THE Stockfish_Engine SHALL display an error explaining minimum browser requirements and SHALL NOT attempt to load the WASM binary
6. IF engine initialization fails due to memory limits, THEN THE Application SHALL display an error message indicating insufficient memory and suggest trying a different browser
7. IF engine initialization does not complete within 30 seconds, THEN THE Stockfish_Engine SHALL abort the attempt, report isReady as false, and display an error indicating a timeout occurred
8. IF the WASM binary fails to load due to a network error or corrupted file, THEN THE Stockfish_Engine SHALL display an error indicating the engine file could not be loaded and allow the user to retry initialization

### Requirement 6: Position Evaluation

**User Story:** As a user, I want each position in my game evaluated by Stockfish, so that I can understand the objective assessment at every point.

#### Acceptance Criteria

1. WHEN analysis is started for a game with N moves, THE Stockfish_Engine SHALL produce exactly N+1 evaluations (one per position including the starting position)
2. WHEN evaluating a position, THE Stockfish_Engine SHALL return the evaluation score (centipawn or mate), best move in UCI notation, principal variation as an array of UCI moves, node count as a positive integer, and time spent in milliseconds
3. THE Stockfish_Engine SHALL evaluate positions at a configurable depth between 10 and 25 inclusive, defaulting to 18
4. WHILE analysis is running, THE Stockfish_Engine SHALL report progress via a callback with strictly monotonically increasing values from approximately 0 to exactly 1, where the value after evaluating position i equals (i+1) divided by the total number of positions
5. WHEN a user navigates away or imports a new game during analysis, THE Stockfish_Engine SHALL terminate the current engine instance cleanly within 1 second and discard all partial evaluation results
6. THE Stockfish_Engine SHALL process evaluation requests sequentially, never evaluating two positions concurrently, to ensure deterministic results in single-threaded mode
7. WHEN all N+1 evaluations complete without error, THE Application SHALL transition the analysis status from "running" to "complete"
8. IF Stockfish returns an invalid or unparseable response for a position, THEN THE Stockfish_Engine SHALL retry the evaluation for that position once before marking the analysis as "error"

### Requirement 7: Win Percentage Conversion

**User Story:** As a developer, I want centipawn evaluations converted to win percentages, so that move quality can be assessed in human-interpretable terms.

#### Acceptance Criteria

1. THE Win_Percent module SHALL convert centipawn evaluations to win probability values in the range [0, 100] using the sigmoid formula: 50 + 50 * (2 / (1 + exp(-0.00368208 * cp)) - 1)
2. WHEN the centipawn evaluation is 0, THE Win_Percent module SHALL return exactly 50
3. THE Win_Percent module SHALL produce strictly monotonically increasing values as centipawn input increases for any two finite centipawn values
4. WHEN an evaluation indicates mate with a positive value (white delivers mate), THE Win_Percent module SHALL return 100 for white's perspective
5. WHEN an evaluation indicates mate with a negative value (black delivers mate), THE Win_Percent module SHALL return 0 for white's perspective
6. FOR ALL evaluations, THE Win_Percent module SHALL satisfy the symmetry property: evalToWinPercent(score, "white") + evalToWinPercent(score, "black") equals exactly 100
7. IF a non-finite centipawn value (NaN, Infinity, -Infinity) is provided, THEN THE Win_Percent module SHALL treat positive Infinity as 100, negative Infinity as 0, and NaN as 50

### Requirement 8: Move Classification

**User Story:** As a user, I want each of my moves classified by quality, so that I can identify which moves were good and which were mistakes.

#### Acceptance Criteria

1. THE Move_Classifier SHALL assign exactly one grade from the set {book, best, excellent, good, inaccuracy, mistake, blunder} to every move in the game
2. WHEN a move's index is below the configurable book move limit (default: 6 half-moves), THE Move_Classifier SHALL classify it as "book"
3. WHEN the played move's resulting win percentage from the moving side's perspective is within 0.1 percentage points of the best move's resulting win percentage from the same perspective, THE Move_Classifier SHALL classify it as "best"
4. WHEN a non-book, non-best move has win percentage loss (defined as the win percentage from the moving side's perspective before the move minus the win percentage from the moving side's perspective after the move) at most 0.5, THE Move_Classifier SHALL classify it as "excellent"
5. WHEN a non-book, non-best move has win percentage loss at most 2, THE Move_Classifier SHALL classify it as "good"
6. WHEN a non-book, non-best move has win percentage loss at most 5, THE Move_Classifier SHALL classify it as "inaccuracy"
7. WHEN a non-book, non-best move has win percentage loss at most 10, THE Move_Classifier SHALL classify it as "mistake"
8. WHEN a non-book, non-best move has win percentage loss greater than 10, THE Move_Classifier SHALL classify it as "blunder"
9. FOR ALL pairs of non-book moves in the same game, IF move A has a smaller win percentage loss than move B, THEN THE Move_Classifier SHALL assign a grade to A that is equal to or better than B's grade in the ordering: best > excellent > good > inaccuracy > mistake > blunder

### Requirement 9: Accuracy Scoring

**User Story:** As a user, I want an overall accuracy score for each player, so that I can quickly assess how well each side played.

#### Acceptance Criteria

1. THE Accuracy_Calculator SHALL produce a weighted accuracy score in the range [0, 100], rounded to one decimal place, for each side, where each move's individual accuracy is computed as max(0, 100 minus win-percentage-loss multiplied by 10)
2. WHEN computing accuracy, THE Accuracy_Calculator SHALL exclude book moves from the calculation
3. WHEN no non-book moves exist for a side, THE Accuracy_Calculator SHALL return an accuracy of 100
4. THE Accuracy_Calculator SHALL weight each move's contribution by a position weight defined as max(1, abs(winPercentBefore minus 50) divided by 10 plus 1), so that moves in positions further from equality carry more weight
5. THE Accuracy_Calculator SHALL compute a count of each MoveGrade per side, where the sum of all grade counts for a side equals the total number of half-moves played by that side
6. THE Accuracy_Calculator SHALL compute the average centipawn loss per side, excluding book moves from the calculation
7. THE Accuracy_Calculator SHALL identify critical moments where the win-percentage swing between consecutive positions exceeds 10 percentage points, including the move index, a textual description of what occurred, and the win-percentage swing magnitude

### Requirement 10: Opening Detection

**User Story:** As a user, I want to know which opening was played, so that I can study and improve my opening repertoire.

#### Acceptance Criteria

1. WHEN a game is analyzed, THE Accuracy_Calculator SHALL detect the opening by ECO code and name
2. WHEN the PGN headers contain an ECO tag, THE Accuracy_Calculator SHALL use the header value as the primary source for opening identification; WHEN move-matching is also performed, the move-match result SHALL take precedence over the header value
3. WHEN a game's moves match a known opening line in the ECO database, THE Accuracy_Calculator SHALL report the number of half-moves that followed the known line
4. IF no opening is detected from either PGN headers or move-matching, THEN THE Accuracy_Calculator SHALL return an OpeningInfo with eco set to an empty string, name set to "Unknown Opening", and moves set to 0

### Requirement 11: Evaluation Graph Display

**User Story:** As a user, I want to see a visual graph of the evaluation throughout the game, so that I can quickly identify turning points and trends.

#### Acceptance Criteria

1. THE Eval_Graph SHALL plot evaluation values clamped to the range of ±10 pawns against move number, where mate scores are rendered at the ±10 boundary
2. THE Eval_Graph SHALL color the region above the zero-evaluation midline in white and the region below in black to indicate which side holds the advantage
3. THE Eval_Graph SHALL highlight the currently selected move on the chart with a visually distinct marker
4. WHEN a user clicks a point on the graph, THE Eval_Graph SHALL navigate to the nearest move data point in the game view
5. THE Eval_Graph SHALL mark blunders with a distinct visual indicator and mistakes with a separate distinct indicator, such that the two are visually distinguishable from each other
6. WHEN analysis data is incomplete or unavailable, THE Eval_Graph SHALL render only the positions that have been evaluated and display a visual placeholder for unevaluated positions

### Requirement 12: Move Navigation

**User Story:** As a user, I want to navigate through the game move by move, so that I can study each position and understand the analysis.

#### Acceptance Criteria

1. THE Application SHALL maintain a currentMoveIndex that is always between -1 (starting position) and the total number of moves minus one
2. WHEN a user navigates to a move, THE Application SHALL display the board position, evaluation, and classification for that move
3. WHEN a user clicks a move in the move list, THE Application SHALL navigate to that move's position
4. THE Application SHALL provide forward and backward navigation controls (buttons and/or keyboard arrow keys) that increment or decrement currentMoveIndex by one
5. WHEN currentMoveIndex is -1 and the user requests backward navigation, THE Application SHALL remain at index -1 without error; WHEN currentMoveIndex equals moves.length minus 1 and the user requests forward navigation, THE Application SHALL remain at the last move without error
6. WHEN analysis is incomplete, THE Application SHALL allow navigation to any move index but display evaluation and classification only for moves that have been analyzed

### Requirement 13: Analysis Configuration

**User Story:** As a user, I want to configure the analysis depth, so that I can balance between analysis speed and accuracy.

#### Acceptance Criteria

1. THE Application SHALL allow users to set analysis depth to an integer value between 10 and 25 inclusive
2. THE Application SHALL default the analysis depth to 18
3. WHEN analysis depth is set to a value outside the range of 10 to 25 or to a non-integer value, THE Application SHALL reject the value, maintain the current setting, and display an inline error message indicating the valid range
4. WHILE analysis is running, THE Application SHALL disable the depth configuration control to prevent changes until analysis completes

### Requirement 14: Client-Side Architecture

**User Story:** As a user, I want all computation to happen in my browser, so that my games remain private and no internet is needed for analysis.

#### Acceptance Criteria

1. THE Application SHALL perform all engine analysis in a Web Worker such that no Stockfish computation executes on the main thread
2. THE Application SHALL require no backend server or user accounts for game analysis functionality
3. THE Application SHALL treat all imported PGN text as untrusted input, rejecting or stripping any content that is not valid PGN notation (headers, move text, comments, and standard annotations) before processing
4. WHEN Stockfish analysis completes, THE Application SHALL terminate the engine to free WASM memory
5. WHILE performing game analysis, THE Application SHALL not transmit game data, positions, or evaluation results to any external server
6. WHEN all application assets have been loaded, THE Application SHALL perform game analysis without requiring an active network connection

### Requirement 15: Cross-Origin Isolation

**User Story:** As a developer, I want proper cross-origin isolation headers configured, so that SharedArrayBuffer is available for multi-threaded Stockfish.

#### Acceptance Criteria

1. THE Application SHALL serve all HTTP responses with Cross-Origin-Embedder-Policy set to require-corp and Cross-Origin-Opener-Policy set to same-origin
2. THE Application SHALL include a Content Security Policy with script-src containing 'self' and 'wasm-unsafe-eval', and worker-src containing 'self', to permit Stockfish WASM execution in a Web Worker
3. WHEN a page is loaded in the browser, THE Application SHALL ensure that self.crossOriginIsolated evaluates to true, confirming SharedArrayBuffer availability
4. IF an external resource is loaded by the Application, THEN THE Application SHALL serve or reference that resource with appropriate CORS headers or crossorigin attributes so that it complies with the Cross-Origin-Embedder-Policy
