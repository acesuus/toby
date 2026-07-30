# Implementation Plan: Account Page

## Overview

Implement a `/account` page for authenticated users to manage Chess.com and Lichess platform connections, view platform profiles and recent games, and see their Toby account details. The implementation builds on existing Supabase auth, middleware route protection, and the fetcher module. It adds persistent platform username storage, a server-side API route for connection management, and client-side components for the account UI.

## Tasks

- [x] 1. Database migration and type definitions
  - [x] 1.1 Create database migration to add platform username columns
    - Add `chess_com_username` (nullable TEXT) and `lichess_username` (nullable TEXT) columns to the existing `profiles` table
    - Add column comments describing their purpose
    - No new RLS policies needed — existing policies already restrict to `auth.uid() = id`
    - Create migration file at `supabase/migrations/` or document the SQL for manual execution
    - _Requirements: 9.1, 9.2, 9.3_

  - [x] 1.2 Define account-related TypeScript interfaces
    - Create `lib/account-types.ts` with `PlatformUsernames`, `PlatformProfile`, `PlatformRating`, `ConnectPlatformRequest`, `DisconnectPlatformRequest`, `PlatformUsernamesResponse`, and `ApiError` interfaces
    - Update `lib/supabase/types.ts` (if it exists) or add the `Profile` type extension with the new columns
    - _Requirements: 1.1, 1.5_

- [x] 2. API route for platform connection management
  - [x] 2.1 Implement GET /api/account/platforms route
    - Create `app/api/account/platforms/route.ts`
    - Implement `GET` handler that reads the authenticated user's `chess_com_username` and `lichess_username` from the profiles table
    - Return 401 for unauthenticated requests
    - Return 500 for database errors
    - _Requirements: 1.1, 8.2, 8.3_

  - [x] 2.2 Implement PUT /api/account/platforms route (connect)
    - Add `PUT` handler to the same route file
    - Parse request body for `platform` and `username`
    - Call `validateUsername()` from `lib/fetcher.ts` — return 400 if validation fails
    - Call `fetchRecentGames()` to verify the username exists on the platform — return 404 if not found, 502 if platform unavailable
    - On success, update the corresponding column in the profiles table
    - Return the saved username on success
    - _Requirements: 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4_

  - [x] 2.3 Implement DELETE /api/account/platforms route (disconnect)
    - Add `DELETE` handler to the same route file
    - Parse request body for `platform`
    - Set the corresponding username column to null
    - Return confirmation on success
    - _Requirements: 3.1_

  - [x] 2.4 Write property tests for platform connection API logic
    - **Property 1: Username format validation gate**
    - **Validates: Requirements 1.2, 1.4**
    - Generate random strings (valid and invalid per Chess.com/Lichess regex patterns), verify that `validateUsername` returning non-null always results in rejection

  - [x] 2.5 Write property tests for platform connection state
    - **Property 2: Platform connection combinations**
    - **Validates: Requirements 1.5**
    - Generate all valid combinations of `(chess_com_username: string | null, lichess_username: string | null)`, verify round-trip through save and read returns the same values

  - [x] 2.6 Write property test for disconnect operation
    - **Property 3: Disconnect removes stored username**
    - **Validates: Requirements 3.1**
    - Generate a platform choice and a stored username, disconnect that platform, verify the column becomes null while the other platform's username remains unchanged

- [x] 3. Platform usernames hook and account page skeleton
  - [x] 3.1 Create usePlatformUsernames hook
    - Create `lib/use-platform-usernames.ts`
    - Implement the hook that fetches from `GET /api/account/platforms` when user is authenticated
    - Return `{ usernames, loading, refetch }` interface
    - Handle unauthenticated state gracefully (return nulls, no fetch)
    - _Requirements: 1.1, 1.5_

  - [x] 3.2 Create Account Page route and layout
    - Create `app/account/page.tsx` as a client component
    - Use `useAuth()` for auth state and `usePlatformUsernames()` for platform data
    - Render a loading skeleton while data is loading
    - Compose three sections: AccountDetailsSection, PlatformConnectionsSection, RecentGamesSection
    - _Requirements: 6.3, 4.4, 5.5_

- [x] 4. Account details and platform connection components
  - [x] 4.1 Implement AccountDetailsSection component
    - Create `components/account/AccountDetailsSection.tsx`
    - Display user email and display name from auth context
    - Show loading skeleton when data is pending
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 4.2 Implement PlatformCard component with connect/disconnect
    - Create `components/account/PlatformCard.tsx`
    - When disconnected: show ConnectForm with username input and "Connect" button
    - When connected: show stored username, PlatformProfileView, and a "Disconnect" button
    - Handle loading and error states for connect/disconnect operations
    - _Requirements: 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3_

  - [x] 4.3 Implement PlatformConnectionsSection component
    - Create `components/account/PlatformConnectionsSection.tsx`
    - Render a PlatformCard for Chess.com and one for Lichess
    - Pass `onUpdate` callback for refetching after connect/disconnect
    - Show loading skeletons while platform data loads
    - _Requirements: 1.5, 4.4_

  - [x] 4.4 Implement PlatformProfileView component
    - Create `components/account/PlatformProfileView.tsx`
    - Fetch and display the connected player's profile (username + ratings) from the platform's public API
    - Show fallback state if platform API is unavailable (stored username + "Live data unavailable")
    - Show loading skeleton while fetching
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 4.5 Write property test for PlatformProfileView display
    - **Property 4: Profile view displays all required fields**
    - **Validates: Requirements 4.2**
    - Generate random `PlatformProfile` objects with username and non-empty ratings arrays, verify rendered output contains all fields

- [x] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Recent games section
  - [x] 6.1 Implement RecentGamesSection component
    - Create `components/account/RecentGamesSection.tsx`
    - For each connected platform, fetch up to 10 recent games using `fetchRecentGames()` from `lib/fetcher.ts`
    - Display each game with players' names, result, time control, and date
    - Navigate to `/review` with the game loaded when a game is clicked
    - Show "No recent games found" if platform returns zero games
    - Show loading skeletons while fetching, error state with retry on failure
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 6.2 Write property test for recent games cap
    - **Property 5: Recent games display capped at 10**
    - **Validates: Requirements 5.1**
    - Generate arrays of 0–50 GameListItem objects, verify the section renders exactly `min(N, 10)` items

  - [x] 6.3 Write property test for game item display
    - **Property 6: Game item displays required fields**
    - **Validates: Requirements 5.2**
    - Generate random GameListItem objects with non-empty white, black, result, timeControl, and date fields, verify rendered output contains all five values

- [x] 7. Import panel pre-fill integration
  - [x] 7.1 Modify ImportPanel to accept and use stored usernames
    - Update `PlatformTab` to accept an optional `defaultUsername` prop
    - Initialize username state with `defaultUsername` when provided
    - In the parent `ImportPanel`, call `usePlatformUsernames()` and pass stored usernames to each PlatformTab
    - Ensure user can still override the pre-filled username
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [x] 7.2 Write property test for import panel pre-fill
    - **Property 7: Import panel pre-fills stored username for connected platform**
    - **Validates: Requirements 7.1, 7.2**
    - Generate valid platform usernames, verify the input field initializes with the stored value

- [x] 8. Data isolation and access control verification
  - [x] 8.1 Write property test for data isolation
    - **Property 8: Data isolation between users**
    - **Validates: Requirements 8.2**
    - Generate two distinct user IDs with different stored usernames, verify API isolation (GET for user A never returns user B's data, PUT/DELETE for user A never modifies user B's data)

- [x] 9. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The middleware already protects `/account` — no additional route protection code needed
- The existing `lib/fetcher.ts` module provides `validateUsername()` and `fetchRecentGames()` which are reused directly
- Database migration should be applied before implementing API routes

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1", "2.2", "2.3"] },
    { "id": 2, "tasks": ["2.4", "2.5", "2.6", "3.1"] },
    { "id": 3, "tasks": ["3.2", "4.1"] },
    { "id": 4, "tasks": ["4.2", "4.3", "4.4"] },
    { "id": 5, "tasks": ["4.5", "6.1"] },
    { "id": 6, "tasks": ["6.2", "6.3", "7.1"] },
    { "id": 7, "tasks": ["7.2", "8.1"] }
  ]
}
```
