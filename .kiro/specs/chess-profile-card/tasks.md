# Implementation Plan: Chess Profile Card

## Overview

Redesign the `PlatformProfileView` component into a visually rich, card-based chess profile display. This involves extending the `PlatformRating` type with game statistics, updating Chess.com and Lichess fetchers to extract richer data, and building new presentational sub-components (ProfileCard, RatingBadge, GameStatsRow, PlatformIcon, ProfileCardSkeleton, ProfileCardError).

## Tasks

- [x] 1. Extend data model and update fetchers
  - [x] 1.1 Extend `PlatformRating` type in `lib/account-types.ts`
    - Add `gamesPlayed: number` field
    - Add `record: { wins: number; losses: number; draws: number }` field
    - Keep existing `timeControl` and `rating` fields unchanged
    - _Requirements: 1.5_

  - [x] 1.2 Update Chess.com fetcher in `components/account/PlatformProfileView.tsx`
    - Extract `record` (win/loss/draw) from each time control's `record` field in the Chess.com stats response
    - Compute `gamesPlayed` as `record.win + record.loss + record.draw`
    - Push the extended `PlatformRating` object with `gamesPlayed` and `record`
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 1.3 Update Lichess fetcher in `components/account/PlatformProfileView.tsx`
    - Extract `gamesPlayed` from `perfs.{tc}.games`
    - Compute proportional W/L/D from top-level `count` object based on each time control's share of total games
    - Ensure `wins + losses + draws === gamesPlayed` by assigning remainder to draws
    - _Requirements: 1.1, 1.2, 1.4_

  - [x]* 1.4 Write property tests for fetcher normalization (Properties 1, 2, 8)
    - **Property 1: Record Sum Invariant** — For any Chess.com response, `wins + losses + draws === gamesPlayed`
    - **Property 2: Lichess Record Sum Invariant** — For any Lichess response, proportional calculation maintains `wins + losses + draws === gamesPlayed`
    - **Property 8: Non-Negative Statistics** — All numeric fields are non-negative for both fetchers
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5**

- [x] 2. Checkpoint - Ensure data layer is solid
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Build presentational sub-components
  - [x] 3.1 Create `components/account/PlatformIcon.tsx`
    - Accept `platform: Platform` prop
    - Render a 16×16 lucide-react icon (Crown for Chess.com, a horse/knight icon for Lichess)
    - _Requirements: 2.3, 5.2, 5.3_

  - [x] 3.2 Create `components/account/RatingBadge.tsx`
    - Accept `timeControl: string` and `rating: number` props
    - Render as rounded pill with `--accent-soft` background
    - Display time control label and rating in `font-notation` monospace class
    - Add `aria-label="{timeControl} rating: {rating}"` for accessibility
    - _Requirements: 3.1, 3.2, 3.3, 7.2_

  - [x] 3.3 Create `components/account/GameStatsRow.tsx`
    - Accept `timeControl`, `gamesPlayed`, and `record` props
    - Display time control label and total games count
    - Display W/L/D values with semantic colors (`--good`, `--danger`, `--ink-muted`)
    - Use text labels "W", "L", "D" so color is not the only indicator
    - _Requirements: 4.1, 4.2, 4.3_

  - [x]* 3.4 Write property tests for RatingBadge and GameStatsRow (Properties 5, 6)
    - **Property 5: Rating Badge Content Completeness** — Output contains both time control label and numeric rating value
    - **Property 6: Game Stats Content Completeness** — Output contains games-played count and all three W/L/D values
    - **Validates: Requirements 3.1, 4.1, 4.2**

- [x] 4. Build card layout components
  - [x] 4.1 Create `components/account/ProfileCard.tsx`
    - Accept `profile: PlatformProfile` prop
    - Render card container with rounded border, shadow, `--surface-raised` background
    - Display username prominently with larger font weight
    - Render PlatformIcon in top-right corner
    - Render RatingBadges in a horizontal flex-wrap row for each time control with rating > 0
    - Render GameStatsRow for each time control with gamesPlayed > 0
    - Add `role="region"` with `aria-label="Chess profile for {username} on {platform}"`
    - Use relative sizing units for responsive behavior
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.4, 4.4, 5.1, 7.1, 7.2, 7.3_

  - [x] 4.2 Create `components/account/ProfileCardSkeleton.tsx`
    - Mirror ProfileCard layout with animated placeholder blocks
    - Use `motion-safe:animate-pulse` for reduced-motion support
    - Add `aria-busy="true"` and `aria-label="Loading profile"`
    - _Requirements: 6.1, 7.4_

  - [x] 4.3 Create `components/account/ProfileCardError.tsx`
    - Accept `username` and `platform` props
    - Display username and status message ("Live data unavailable")
    - Maintain card container styling (rounded border, shadow, background)
    - Show PlatformIcon for context
    - _Requirements: 6.2, 6.3_

  - [x]* 4.4 Write property tests for ProfileCard rendering (Properties 3, 4, 7, 9)
    - **Property 3: Badge Count Matches Available Ratings** — For N time controls with positive rating, exactly N badges render
    - **Property 4: Zero-Games Filtering** — Time controls with `gamesPlayed === 0` do not appear in stats section
    - **Property 7: Error State Preserves Username** — Error card always renders the original username
    - **Property 9: Accessible Labels Present** — ProfileCard includes ARIA label with username; each badge has accessible label
    - **Validates: Requirements 2.4, 4.4, 6.2, 7.2**

- [x] 5. Integrate into PlatformProfileView
  - [x] 5.1 Rewrite `PlatformProfileView` to use new sub-components
    - Replace existing rendering logic with ProfileCard (success), ProfileCardSkeleton (loading), ProfileCardError (error)
    - Keep fetch + state management in PlatformProfileView
    - Ensure request cancellation on unmount/prop change is preserved
    - Verify integration within PlatformCard's ConnectedView
    - _Requirements: 2.1, 5.1, 5.2, 6.1, 6.2, 6.3_

  - [x]* 5.2 Write unit tests for integrated PlatformProfileView
    - Test loading state renders skeleton
    - Test success state renders ProfileCard with correct data
    - Test error state renders ProfileCardError with username
    - Test that both Chess.com and Lichess share the same card structure
    - _Requirements: 5.1, 6.1, 6.2, 6.3_

- [x] 6. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The implementation uses TypeScript, React 19, Tailwind CSS 4, and lucide-react icons
- fast-check is used for property-based testing

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "3.1"] },
    { "id": 2, "tasks": ["1.4", "3.2", "3.3"] },
    { "id": 3, "tasks": ["3.4", "4.1", "4.2", "4.3"] },
    { "id": 4, "tasks": ["4.4", "5.1"] },
    { "id": 5, "tasks": ["5.2"] }
  ]
}
```
