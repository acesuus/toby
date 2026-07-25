# Implementation Plan: LLM Coaching

## Overview

Upgrade Toby's coaching from a purely template-based system to a hybrid model. Routine moves get instant client-side phrases from a new template library; notable moves are batched into a single LLM call (Gemini 2.5 Flash via Google AI Studio) and displayed as the user navigates the review walkthrough. The implementation proceeds bottom-up: shared types → template library → server-side modules (validation, prompt, parse, generate, route) → client-side modules (payload builder, hook) → UI integration.

## Tasks

- [x] 1. Install dependency and set up shared types
  - [x] 1.1 Install `@google/generative-ai` package and create `lib/coach/types.ts`
    - Run `npm install @google/generative-ai`
    - Create `lib/coach/types.ts` with interfaces: `BatchRequest`, `BatchResponse`, `MoveComment`, `NotableMovePayload`, `GameSummaryPayload`, `TemplateMoveInput`, `RoutineGrade`, `NotableGrade`, `CoachState`, `ValidationResult`
    - Export all types for use across the coach module
    - _Requirements: 7.1, 7.2, 7.3, 8.1, 8.2_

- [x] 2. Implement Template Library
  - [x] 2.1 Create `lib/coach/templates.ts` with phrase banks and selection logic
    - Implement `TEMPLATE_BANK` with ≥3 phrase variants per routine grade (best, good, book, excellent) and ≥3 per notable grade (mistake, blunder, inaccuracy, brilliant)
    - Implement `getTemplatePhrase(input: TemplateMoveInput): string` with deterministic selection via `ply % variants.length`
    - Implement `getFallbackPhrase(input)` for notable moves when LLM is unavailable
    - Implement `interpolate()` and `formatMoveLabel()` helpers
    - Phrases must conform to Toby persona: 1–3 sentences, sentence case, no emoji, grounded in move data
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [ ]* 2.2 Write property tests for Template Library (Property 1: Output Validity)
    - **Property 1: Template Output Validity**
    - Use fast-check to generate random routine grades, plys, SAN strings, colors, move numbers
    - Assert output is 1–3 sentences, contains no emoji, includes the move's SAN or formatted move label
    - Minimum 100 iterations
    - **Validates: Requirements 1.1, 1.4, 1.5**

  - [ ]* 2.3 Write property test for Template Library (Property 2: Selection Determinism)
    - **Property 2: Template Selection Determinism**
    - Use fast-check to generate random `TemplateMoveInput` values
    - Call `getTemplatePhrase` twice with identical inputs and assert equality
    - Minimum 100 iterations
    - **Validates: Requirements 1.3**

- [x] 3. Implement request validation
  - [x] 3.1 Create `lib/coach/validate.ts` with `validateBatchRequest` function
    - Implement full validation logic per design: check playerColor, notableMoves array (ply, san, grade, winPercentLoss, bestMove), gameSummary object (whiteName, blackName, openingName, whiteAccuracy, blackAccuracy, result)
    - Return `ValidationResult<BatchRequest>` with descriptive error messages on failure
    - _Requirements: 2.7, 2.8, 7.1, 7.2, 7.3_

  - [ ]* 3.2 Write property test for validation (Property 6: Invalid Request Rejection)
    - **Property 6: Invalid Request Rejection**
    - Use fast-check to generate payloads with one field removed or corrupted
    - Assert that validation returns `ok: false` with a descriptive error
    - Minimum 100 iterations
    - **Validates: Requirements 2.7, 2.8**

- [x] 4. Implement prompt construction and LLM response parser
  - [x] 4.1 Create `lib/coach/prompt.ts` with system and user prompt builders
    - Implement `buildSystemPrompt()` that reads `TOBY_PERSONA.MD` content and appends JSON output format instructions
    - Implement `buildUserPrompt(request: BatchRequest): string` that formats game summary and notable moves into a structured prompt
    - Include all required fields per move: ply, SAN, grade, winPercentLoss, bestMove (UCI)
    - Include all summary fields: player names, opening, accuracies, result, playerColor
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ]* 4.2 Write property test for prompt construction (Property 7: Prompt Completeness)
    - **Property 7: Prompt Completeness for Notable Moves**
    - Use fast-check to generate arrays of notable moves and game summaries
    - Build prompt and assert all field values (ply, SAN, grade, winPercentLoss, bestMove) appear in the output string
    - Minimum 100 iterations
    - **Validates: Requirements 4.2**

  - [x] 4.3 Create `lib/coach/parse-response.ts` with `parseLLMResponse` function
    - Strip markdown code fences if present
    - Parse JSON, validate structure: `summary` (non-empty string), `moveComments` (array of `{ply, comment}`)
    - Verify `moveComments.length === expectedCount`
    - Trim all strings, throw descriptive errors on any structural issue
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [ ]* 4.4 Write property test for response parsing (Property 5: Response Comment Cardinality)
    - **Property 5: Response Comment Cardinality**
    - Use fast-check to generate N (1–15) and corresponding valid JSON responses with N comments
    - Assert parsed result has exactly N moveComments entries
    - Also test that wrong counts throw errors
    - Minimum 100 iterations
    - **Validates: Requirements 8.3**

- [x] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement LLM provider and Coach API Route
  - [x] 6.1 Create `lib/coach/generate.ts` with `generateCoachComment` function
    - Initialize Google Generative AI SDK with `GOOGLE_AI_API_KEY` from `process.env`
    - Use model `gemini-2.5-flash`
    - Accept system prompt and user prompt, return model's text response
    - Throw descriptive error if API key is missing
    - No retry logic — let the route handle error responses
    - _Requirements: 3.1, 3.2, 3.3, 3.5_

  - [x] 6.2 Create `app/api/coach/route.ts` POST handler
    - Parse request body and validate using `validateBatchRequest` (return 400 on failure)
    - Handle zero notable moves edge case (return generic summary, empty moveComments, no LLM call)
    - Build system prompt via `buildSystemPrompt()` and user prompt via `buildUserPrompt()`
    - Call `generateCoachComment` exactly once (return 502 on LLM error)
    - Parse LLM response via `parseLLMResponse` (return 502 on parse failure)
    - Return 200 with `BatchResponse` JSON on success
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 3.4_

  - [ ]* 6.3 Write property test for single LLM call (Property 3: Single LLM Call Per Batch)
    - **Property 3: Single LLM Call Per Batch**
    - Use fast-check to generate valid BatchRequests with 1–10 notable moves
    - Mock `generateCoachComment` to count invocations and return valid JSON
    - Call the route handler and assert `generateCoachComment` was called exactly once
    - Minimum 100 iterations
    - **Validates: Requirements 2.2**

- [x] 7. Implement client-side payload builder and React hook
  - [x] 7.1 Create `lib/coach/payload.ts` with `buildBatchRequest` function
    - Filter `ClassifiedMove[]` to only notable grades (mistake, blunder, inaccuracy, brilliant)
    - Extract required fields per move: ply (index in classifiedMoves array), san, grade, winPercentLoss, bestMove
    - Assemble `GameSummaryPayload` from `GameAccuracy` and `PGNHeaders`
    - Accept `playerColor` parameter
    - Return typed `BatchRequest`
    - _Requirements: 7.1, 7.2, 7.3_

  - [ ]* 7.2 Write property test for payload builder (Property 8: Batch Request Payload Completeness)
    - **Property 8: Batch Request Payload Completeness**
    - Use fast-check to generate arrays of ClassifiedMove with notable grades plus valid GameAccuracy and PGNHeaders
    - Assert every notable move entry has all required fields and gameSummary has all required fields
    - Minimum 100 iterations
    - **Validates: Requirements 7.1, 7.2**

  - [x] 7.3 Create `lib/coach/use-coach.ts` React hook
    - Implement `useCoach(): UseCoachResult` hook
    - `fetchCoaching()` fires a single POST to `/api/coach` with the built payload
    - Store moveComments in a `Map<number, string>` for O(1) ply lookup
    - Expose `status` (idle | loading | ready | error), `gameSummary`, `getComment(ply)`
    - Implement AbortController for cleanup on unmount
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [ ]* 7.4 Write property test for comment lookup (Property 10: Correct Comment Displayed for Ply)
    - **Property 10: Correct Comment Displayed for Ply**
    - Use fast-check to generate arrays of `{ply, comment}` tuples, populate a Map, query random plys
    - Assert returned comment matches the expected value for that ply
    - Minimum 100 iterations
    - **Validates: Requirements 6.3**

- [x] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. UI Integration
  - [x] 9.1 Update `CoachDialogue` component with `loading` prop
    - Add optional `loading?: boolean` prop to `CoachDialogueProps`
    - When `loading` is true, render a skeleton placeholder (animated pulse lines) instead of text
    - Maintain all existing styling and layout
    - _Requirements: 6.2_

  - [x] 9.2 Integrate coach hook and template library into the review page
    - Import `useCoach` hook and `getTemplatePhrase` / `getFallbackPhrase` from `lib/coach/templates.ts`
    - Import `buildBatchRequest` from `lib/coach/payload.ts`
    - Call `fetchCoaching()` when coaching walkthrough starts and notable moves exist
    - For routine moves: display `getTemplatePhrase()` output directly (no loading state)
    - For notable moves: display LLM comment from `getComment(ply)`, show loading skeleton while pending, fall back to `getFallbackPhrase()` on error
    - Pass `loading` prop to `CoachDialogue` when navigating to a notable move while status is "loading"
    - _Requirements: 5.1, 5.2, 6.1, 6.2, 6.3, 6.4_

  - [x] 9.3 Integrate Game Summary into `GameReviewSummary` component
    - Update `GameReviewSummary` to accept an optional `llmSummary` prop
    - When `llmSummary` is available (from the hook's `gameSummary`), display it as the `coachComment` instead of the rule-based `generateCoachComment` function
    - _Requirements: 6.5_

- [x] 10. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The existing `lib/coaching.ts` remains available during migration; the new `lib/coach/templates.ts` supersedes it for the walkthrough
- `GOOGLE_AI_API_KEY` must be added to `.env.local` before testing the LLM integration
- All LLM provider details are isolated in `lib/coach/generate.ts` for future provider swaps

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "3.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "3.2", "4.1", "4.3"] },
    { "id": 3, "tasks": ["4.2", "4.4", "6.1", "7.1"] },
    { "id": 4, "tasks": ["6.2", "7.2", "6.3"] },
    { "id": 5, "tasks": ["7.3"] },
    { "id": 6, "tasks": ["7.4", "9.1"] },
    { "id": 7, "tasks": ["9.2", "9.3"] }
  ]
}
```
