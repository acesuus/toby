# Implementation Plan: User Auth and Database

## Overview

This plan implements user authentication (Supabase Auth), session management, PostgreSQL database (profiles and games tables with RLS), API routes for CRUD game operations, auth UI pages, and route protection for Toby. Tasks progress from foundational setup (Supabase clients, types, environment) through auth flows and middleware, then database-backed game CRUD, and finally UI integration.

## Tasks

- [x] 1. Set up Supabase client utilities and types
  - [x] 1.1 Install dependencies and create Supabase client modules
    - Install `@supabase/supabase-js` and `@supabase/ssr`
    - Create `lib/supabase/client.ts` (browser client using `createBrowserClient`)
    - Create `lib/supabase/server.ts` (server client using `createServerClient` with cookie helpers)
    - Create `lib/supabase/middleware.ts` (middleware client using request/response cookies)
    - Create `.env.local.example` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` placeholders
    - _Requirements: 4.1_

  - [x] 1.2 Create TypeScript types for database records
    - Create `lib/supabase/types.ts` with `Profile`, `GameRecord`, `GameAnalysis`, `GameWithAnalysis`, `PaginatedGamesResponse`, and `SaveGamePayload` interfaces
    - _Requirements: 7.1, 8.1, 8.2_

- [x] 2. Implement auth middleware and route protection
  - [x] 2.1 Create Next.js middleware for auth gating
    - Create root `middleware.ts` with public/protected route lists
    - Implement session validation via `supabase.auth.getUser()`
    - Redirect unauthenticated page requests to `/login?returnUrl=<path>`
    - Return 401 JSON for unauthenticated API requests
    - Configure matcher to exclude static assets
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 2.2 Write property test for middleware route gating
    - **Property 4: Middleware route gating**
    - Generate random route/auth state combinations and verify correct redirect/allow behavior
    - **Validates: Requirements 6.1, 6.2**

- [x] 3. Implement Auth Provider and context
  - [x] 3.1 Create AuthProvider with user state and session listener
    - Create `lib/auth-context.tsx` with `AuthContext`, `useAuth` hook, and `AuthProvider` component
    - Implement `mapUser` function to transform Supabase User to AuthUser interface
    - Subscribe to `onAuthStateChange` for real-time state updates
    - Expose `user`, `loading`, and `signOut` from context
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 3.2 Write property test for user mapping
    - **Property 3: User mapping preserves all fields**
    - Generate random Supabase User objects, verify `mapUser` correctly maps id, email, displayName, avatarUrl
    - **Validates: Requirements 5.1**

  - [x] 3.3 Integrate AuthProvider into the root layout
    - Wrap app children with `AuthProvider` in `app/layout.tsx` (inside existing providers)
    - _Requirements: 5.1_

- [x] 4. Implement auth actions and validation
  - [x] 4.1 Create auth validation and server actions
    - Create `lib/auth-actions.ts` with `signUp`, `signIn`, and `signOut` server actions
    - Implement password length validation (minimum 8 characters)
    - Return generic error message for invalid credentials (no field-specific indication)
    - _Requirements: 1.1, 1.4, 2.1, 2.2, 3.1_

  - [x] 4.2 Write property test for password validation
    - **Property 1: Password validation rejects short passwords**
    - Generate random strings with length < 8, verify rejection with appropriate error
    - **Validates: Requirements 1.4**

  - [x] 4.3 Write property test for generic login errors
    - **Property 2: Login errors are generic**
    - Generate random invalid credential pairs, verify identical generic error message returned
    - **Validates: Requirements 2.2**

- [x] 5. Checkpoint - Core auth infrastructure
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement auth UI pages
  - [x] 6.1 Create sign-in page at `/login`
    - Create `app/login/page.tsx` with email and password fields, submit button, link to sign-up
    - Handle form submission via Supabase client `signInWithPassword`
    - Display generic error messages on failure
    - Support `returnUrl` query parameter for post-login redirect
    - Follow Toby visual identity (warm palette, serif headings, Inter body, rounded cards, Moss accent)
    - Implement WCAG 2.1 AA: visible focus indicators, labels, aria-describedby for errors
    - _Requirements: 2.1, 2.2, 11.1, 11.3, 11.4, 11.5_

  - [x] 6.2 Create sign-up page at `/signup`
    - Create `app/signup/page.tsx` with email, display name, and password fields, submit button, link to sign-in
    - Handle form submission via Supabase client `signUp` with display_name in metadata
    - Validate password length client-side before submission
    - Show success message indicating confirmation email sent
    - Display error messages on failure (duplicate email, validation errors)
    - Follow Toby visual identity and WCAG 2.1 AA accessibility
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 11.2, 11.3, 11.4, 11.5_

  - [x] 6.3 Create auth callback route
    - Create `app/auth/callback/route.ts` to handle email confirmation redirects
    - Exchange auth code for session via `supabase.auth.exchangeCodeForSession`
    - Redirect to home page after successful confirmation
    - _Requirements: 1.2, 2.3_

  - [x] 6.4 Write unit tests for auth UI pages
    - Test login form renders email, password fields and submit button
    - Test signup form renders email, display name, password fields and submit button
    - Test error messages render with aria-describedby associations
    - _Requirements: 11.1, 11.2, 11.4_

- [x] 7. Implement authenticated header and navigation
  - [x] 7.1 Create AuthHeader component
    - Create `components/AuthHeader.tsx` with conditional rendering based on auth state
    - Show skeleton placeholder while loading (prevent layout shift)
    - Show "Sign in" link when unauthenticated
    - Show avatar, display name, and dropdown menu (Library, Account, Sign Out) when authenticated
    - _Requirements: 12.1, 12.2, 12.3_

  - [x] 7.2 Integrate AuthHeader into root layout header
    - Add `AuthHeader` component to the app header in `app/layout.tsx`
    - _Requirements: 12.1, 12.2_

- [x] 8. Implement database schema (SQL migration)
  - [x] 8.1 Create SQL migration file for Supabase
    - Create `supabase/migrations/001_initial_schema.sql` with profiles table, games table, game_analyses table
    - Include auto-profile-creation trigger on `auth.users` insert
    - Include RLS policies for all tables (users can only access own records)
    - Include indexes for user-games query performance
    - Include unique constraint for game deduplication by source
    - _Requirements: 7.1, 7.2, 7.3, 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 9. Implement Game Store API routes
  - [x] 9.1 Create list and save games API route
    - Create `app/api/games/route.ts` with GET (paginated list) and POST (save/upsert) handlers
    - Implement cursor-based pagination with max 20 records per page
    - Implement upsert logic: match by source_platform + source_game_id for existing games
    - Insert game_analyses record alongside game on save
    - Return 401 for unauthenticated requests
    - _Requirements: 9.1, 9.2, 9.4, 10.1, 10.4, 10.5_

  - [x] 9.2 Create single game and delete API route
    - Create `app/api/games/[id]/route.ts` with GET (full record with analysis) and DELETE handlers
    - GET returns complete game record including PGN and analysis data
    - Update `last_accessed_at` on GET
    - DELETE removes game and confirms deletion
    - Scope all queries to authenticated user's records
    - _Requirements: 10.2, 10.3, 10.5_

  - [x] 9.3 Write property tests for game save round-trip
    - **Property 6: Save game round-trip**
    - Generate random valid SaveGamePayload, verify persistence and UUID in response
    - **Validates: Requirements 9.1, 9.4**

  - [x] 9.4 Write property test for save idempotence
    - **Property 7: Save idempotence for sourced games**
    - Generate games with source_platform and source_game_id, save twice, verify single record
    - **Validates: Requirements 9.2**

  - [x] 9.5 Write property tests for pagination
    - **Property 8: Pagination ordering invariant**
    - Generate random timestamp sets, verify descending order in response
    - **Property 9: Pagination size invariant**
    - Generate random game counts, verify ≤20 items and correct nextCursor
    - **Validates: Requirements 10.1, 10.4**

  - [x] 9.6 Write property test for delete-then-retrieve
    - **Property 10: Delete then retrieve yields not-found**
    - Delete a game, then GET by id, verify 404 response
    - **Validates: Requirements 10.3**

  - [x] 9.7 Write property test for get complete record
    - **Property 11: Get game returns complete record**
    - Generate game with analysis, GET by id, verify all fields present
    - **Validates: Requirements 10.2**

- [x] 10. Checkpoint - API routes and database
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Wire save game into the review workflow
  - [x] 11.1 Add save-to-library action in game review UI
    - Add a "Save to Library" button in the game review summary (visible after analysis completes)
    - If user is authenticated, POST game data to `/api/games`
    - If user is unauthenticated, prompt to sign in (redirect to login with returnUrl)
    - Show success/error feedback after save attempt
    - _Requirements: 9.1, 9.3_

  - [x] 11.2 Create saved games library page
    - Create `app/library/page.tsx` showing paginated list of user's saved games
    - Fetch from `/api/games` with cursor-based pagination
    - Display game headers (players, result, date, opening) in card layout
    - Support loading a saved game into the review page
    - Support deleting a game from the library
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [x] 12. Final checkpoint - Full integration
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The database schema task (8.1) produces a SQL migration file to be run against the Supabase project — it does not require a running database during implementation
- Environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) must be configured in `.env.local` before runtime testing

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1", "3.1", "4.1", "8.1"] },
    { "id": 2, "tasks": ["2.2", "3.2", "3.3", "4.2", "4.3"] },
    { "id": 3, "tasks": ["6.1", "6.2", "6.3", "7.1"] },
    { "id": 4, "tasks": ["6.4", "7.2", "9.1", "9.2"] },
    { "id": 5, "tasks": ["9.3", "9.4", "9.5", "9.6", "9.7"] },
    { "id": 6, "tasks": ["11.1", "11.2"] }
  ]
}
```
