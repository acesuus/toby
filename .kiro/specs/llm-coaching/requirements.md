# Requirements Document

## Introduction

This feature upgrades Toby's coaching system from a purely template-based approach to a hybrid model. Routine moves (best, good, book, excellent) continue to receive instant, client-side commentary from a canned phrase library. Notable moves (mistake, blunder, inaccuracy, brilliant) are batched into a single LLM API call per game review, returning personalized, position-grounded commentary in Toby's voice. The result is richer feedback on the moves that matter without adding per-move latency or excessive API costs.

## Glossary

- **Template_Library**: A client-side module (`lib/coach/templates.ts`) containing canned coaching phrases keyed by move classification, with multiple phrasing variants per grade to avoid repetition.
- **Routine_Move**: A move classified as best, good, book, or excellent by the existing classifier — handled entirely client-side with no LLM involvement.
- **Notable_Move**: A move classified as mistake, blunder, inaccuracy, or brilliant by the existing classifier — requiring LLM-generated commentary.
- **Coach_API_Route**: A Next.js App Router API route (`app/api/coach/route.ts`) that accepts a batch of notable moves plus a game summary and returns LLM-generated coaching commentary.
- **Batch_Request**: A single HTTP POST payload containing all notable moves and the game summary for one game review, sent to the Coach_API_Route.
- **Batch_Response**: The JSON object returned by the Coach_API_Route containing a game summary string and an array of move comments keyed by ply number.
- **Move_Comment**: A single LLM-generated coaching remark for one notable move, identified by its ply (half-move index).
- **Game_Summary**: A 1–3 sentence LLM-generated overview of the entire game, delivered alongside move comments.
- **Toby_Persona**: The voice, tone, and constraints defined in `TOBY_PERSONA.MD` that govern all coaching output — both template-based and LLM-generated.
- **LLM_Provider**: Google AI Studio using the Gemini 2.5 Flash model on the free tier (1,500 requests/day, no credit card required). Free-tier data-training terms are acceptable at this stage.
- **Generate_Coach_Comment**: A provider-abstraction function (`lib/coach/generate.ts`) that encapsulates all LLM provider details (model name, SDK, API key) so the provider can be swapped without modifying the route logic or persona file.
- **Classifier**: The existing move classification module (`lib/classifier.ts`) that grades each move as brilliant, book, best, excellent, good, inaccuracy, mistake, or blunder.
- **Ply**: A half-move index (zero-based) identifying a single move in the game sequence.

## Requirements

### Requirement 1: Template Library for Routine Moves

**User Story:** As a player reviewing a game, I want instant coaching comments on routine moves, so that I receive feedback without waiting for an API response.

#### Acceptance Criteria

1. THE Template_Library SHALL provide coaching phrases for each routine move grade: best, good, book, and excellent.
2. THE Template_Library SHALL contain a minimum of 3 phrasing variants per grade to reduce repetition across consecutive moves of the same classification.
3. WHEN a routine move is rendered in the review UI, THE Template_Library SHALL return a phrase selected deterministically based on the ply index so that the same move always produces the same comment.
4. THE Template_Library SHALL produce phrases that conform to the Toby_Persona voice rules: 1–3 sentences, sentence case, no emoji, grounded in move data.
5. THE Template_Library SHALL accept a move's SAN notation, color, move number, and grade as inputs and interpolate them into the selected phrase.

### Requirement 2: Batched LLM Coach API Route

**User Story:** As a player reviewing a game, I want rich, position-aware commentary on my notable moves, so that I understand the significance of mistakes and brilliant plays.

#### Acceptance Criteria

1. THE Coach_API_Route SHALL accept a POST request containing an array of notable moves and a game summary object in a single Batch_Request.
2. WHEN the Coach_API_Route receives a valid Batch_Request, THE Coach_API_Route SHALL send exactly one prompt to the LLM containing all notable moves and the game summary.
3. THE Coach_API_Route SHALL return a Batch_Response with the JSON structure: `{ summary: string, moveComments: { ply: number, comment: string }[] }`.
4. THE Coach_API_Route SHALL include the Toby_Persona system prompt so that all generated comments conform to Toby's voice and rules.
5. IF the Batch_Request contains zero notable moves, THEN THE Coach_API_Route SHALL return a Batch_Response with an empty moveComments array and a generic game summary.
6. IF the LLM service returns an error or times out, THEN THE Coach_API_Route SHALL return an HTTP 502 response with a JSON body containing an error message.
7. THE Coach_API_Route SHALL validate that each notable move in the request includes ply, SAN notation, grade, win-percentage loss, and the engine's best move before forwarding to the LLM.
8. IF the Batch_Request fails validation, THEN THE Coach_API_Route SHALL return an HTTP 400 response with a JSON body describing the validation failure.

### Requirement 3: LLM Provider Abstraction

**User Story:** As a developer, I want LLM provider details isolated behind a single function, so that the provider can be swapped later without modifying the route logic or persona file.

#### Acceptance Criteria

1. THE Generate_Coach_Comment function SHALL encapsulate all provider-specific details: model name, SDK initialization, and API key retrieval.
2. THE Generate_Coach_Comment function SHALL use Google AI Studio with the Gemini 2.5 Flash model as the LLM_Provider.
3. THE Generate_Coach_Comment function SHALL accept a system prompt string and a user prompt string as inputs and return the model's text response.
4. THE Coach_API_Route SHALL call the Generate_Coach_Comment function rather than importing any provider SDK directly.
5. IF the LLM_Provider API key is missing from environment variables, THEN THE Generate_Coach_Comment function SHALL throw a descriptive error at invocation time.

### Requirement 4: LLM Prompt Construction

**User Story:** As the system maintainer, I want a well-structured prompt sent to the LLM, so that responses are consistent, grounded, and cost-efficient.

#### Acceptance Criteria

1. THE Coach_API_Route SHALL construct the LLM prompt with the Toby_Persona as the system message and the notable moves plus game summary as the user message.
2. THE Coach_API_Route SHALL include for each notable move: the ply number, SAN notation, move grade, win-percentage loss, and the engine's best alternative move in UCI notation.
3. THE Coach_API_Route SHALL include in the game summary section: player names, opening name, side accuracies, and game result.
4. THE Coach_API_Route SHALL instruct the LLM to produce exactly one comment per notable move, identified by ply, with each comment limited to 1–3 sentences.
5. THE Coach_API_Route SHALL instruct the LLM to produce a game summary of 1–3 sentences grounded in the supplied accuracy and classification data.

### Requirement 5: UI Integration for Routine Moves

**User Story:** As a player stepping through a review, I want to see coaching text appear instantly for routine moves, so that the experience feels responsive.

#### Acceptance Criteria

1. WHEN the user navigates to a routine move during the review walkthrough, THE CoachDialogue component SHALL display the Template_Library phrase for that move without a loading state.
2. THE CoachDialogue component SHALL render Template_Library phrases with the same visual styling and layout used for all coaching remarks.

### Requirement 6: UI Integration for Notable Moves

**User Story:** As a player stepping through a review, I want to see personalized LLM commentary on notable moves, so that I get meaningful insight on my errors and brilliances.

#### Acceptance Criteria

1. WHEN the game review begins and notable moves exist, THE review page SHALL send a single Batch_Request to the Coach_API_Route.
2. WHILE the Batch_Response has not yet resolved, THE CoachDialogue component SHALL display a loading skeleton when the user navigates to a notable move.
3. WHEN the Batch_Response resolves successfully, THE CoachDialogue component SHALL display the Move_Comment matching the current ply from the moveComments array.
4. IF the Batch_Response fails, THEN THE CoachDialogue component SHALL display a fallback message indicating that personalized commentary is unavailable and render the Template_Library phrase for the move's grade instead.
5. THE GameReviewSummary component SHALL display the Game_Summary from the Batch_Response in place of the default coach comment when available.

### Requirement 7: Request Payload Structure

**User Story:** As a developer integrating the coach API, I want a clearly defined request schema, so that the client sends well-formed data to the route.

#### Acceptance Criteria

1. THE Batch_Request payload SHALL include a `notableMoves` array where each element contains: `ply` (number), `san` (string), `grade` (string matching a Notable_Move classification), `winPercentLoss` (number), and `bestMove` (string in UCI notation).
2. THE Batch_Request payload SHALL include a `gameSummary` object containing: `whiteName` (string), `blackName` (string), `openingName` (string), `whiteAccuracy` (number), `blackAccuracy` (number), and `result` (string).
3. THE Batch_Request payload SHALL include a `playerColor` field (string: "white" or "black") identifying the reviewing player's side.

### Requirement 8: Response Payload Structure

**User Story:** As a developer consuming the coach API response, I want a predictable response schema, so that the UI can reliably render each comment to the correct move.

#### Acceptance Criteria

1. THE Batch_Response SHALL contain a `summary` field (string) with the LLM-generated Game_Summary.
2. THE Batch_Response SHALL contain a `moveComments` field (array) where each element has `ply` (number) and `comment` (string).
3. THE Batch_Response SHALL include exactly one entry in moveComments for each notable move present in the Batch_Request.
4. IF the LLM response cannot be parsed into the expected JSON structure, THEN THE Coach_API_Route SHALL return an HTTP 502 response with an error message indicating a parse failure.
