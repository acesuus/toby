# Requirements Document

## Introduction

Redesign the PlatformProfileView component into a visually rich, card-based chess profile display inspired by Chess.com profile cards. The redesigned component renders rating badges/chips per time control, extended game statistics (games played, win/loss/draw record), and a prominent username. Both Chess.com and Lichess profiles share a unified card layout differentiated only by a small platform logo/icon. The component remains embedded inline within the existing PlatformCard connected state.

## Glossary

- **ProfileCard**: The redesigned PlatformProfileView component that displays a user's chess profile in a card-based layout with rating badges and game statistics.
- **RatingBadge**: A styled chip element that displays a player's rating for a specific time control (Bullet, Blitz, Rapid).
- **GameStats**: Aggregated statistics for a time control including total games played and win/loss/draw record.
- **PlatformIcon**: A small visual indicator (icon or logo) placed on the ProfileCard to identify whether the profile is from Chess.com or Lichess.
- **TimeControl**: A chess game format category — Bullet, Blitz, or Rapid.
- **WLD_Record**: A win/loss/draw breakdown displayed as three numeric values for a given time control.
- **ProfileCard_Fetcher**: The data-fetching logic within PlatformProfileView that retrieves profile and statistics data from Chess.com or Lichess external APIs.

## Requirements

### Requirement 1: Extended Data Model

**User Story:** As a developer, I want the PlatformProfile type extended with game statistics, so that the ProfileCard can display richer data beyond just ratings.

#### Acceptance Criteria

1. THE ProfileCard_Fetcher SHALL include a games-played count for each TimeControl in the fetched profile data.
2. THE ProfileCard_Fetcher SHALL include a WLD_Record (wins, losses, draws) for each TimeControl in the fetched profile data.
3. WHEN fetching Chess.com stats, THE ProfileCard_Fetcher SHALL extract games-played and WLD_Record from the `chess_bullet`, `chess_blitz`, and `chess_rapid` record fields of the Chess.com `/pub/player/{username}/stats` API response.
4. WHEN fetching Lichess stats, THE ProfileCard_Fetcher SHALL extract games-played and WLD_Record from the `perfs.bullet`, `perfs.blitz`, and `perfs.rapid` fields of the Lichess `/api/user/{username}` API response.
5. THE PlatformRating type SHALL contain a `gamesPlayed` numeric field and a `record` object with `wins`, `losses`, and `draws` numeric fields in addition to the existing `timeControl` and `rating` fields.

### Requirement 2: Card-Based Layout

**User Story:** As a user, I want my chess profile displayed in a visually rich card layout, so that I can quickly see my ratings and stats at a glance.

#### Acceptance Criteria

1. THE ProfileCard SHALL render within a container styled with a rounded border, subtle shadow, and the project's surface-raised background color (`--surface-raised`).
2. THE ProfileCard SHALL display the username in a prominent position using a larger font weight and size relative to surrounding text.
3. THE ProfileCard SHALL display a PlatformIcon in the top-right corner of the card to identify the platform (Chess.com or Lichess).
4. THE ProfileCard SHALL render one RatingBadge for each TimeControl that has rating data available.
5. WHEN no rating data is available for any TimeControl, THE ProfileCard SHALL omit the RatingBadge section entirely.

### Requirement 3: Rating Badges

**User Story:** As a user, I want my ratings shown as distinct badge chips, so that each time control rating is easy to identify and visually appealing.

#### Acceptance Criteria

1. THE RatingBadge SHALL display the TimeControl label and the numeric rating value.
2. THE RatingBadge SHALL be styled as a rounded pill-shaped chip using the project's accent-soft background color (`--accent-soft`) and ink color (`--ink`).
3. THE RatingBadge SHALL use a monospace font (`font-notation` class) for the numeric rating value to ensure consistent digit alignment.
4. WHEN multiple RatingBadges are present, THE ProfileCard SHALL arrange them in a horizontal row with consistent spacing.

### Requirement 4: Game Statistics Display

**User Story:** As a user, I want to see my win/loss/draw record and total games per time control, so that I can understand my performance at a glance.

#### Acceptance Criteria

1. THE ProfileCard SHALL display the total games-played count for each TimeControl that has statistics available.
2. THE ProfileCard SHALL display the WLD_Record as three labeled values (W / L / D) for each TimeControl.
3. THE ProfileCard SHALL use the project's semantic colors for win (`--good`), loss (`--danger`), and draw (`--ink-muted`) values in the WLD_Record display.
4. WHEN a TimeControl has zero games played, THE ProfileCard SHALL omit that TimeControl from the statistics section.

### Requirement 5: Unified Layout Across Platforms

**User Story:** As a user, I want both my Chess.com and Lichess profiles to look the same structurally, so that my account page feels cohesive.

#### Acceptance Criteria

1. THE ProfileCard SHALL use an identical card structure, spacing, and typography for both Chess.com and Lichess profiles.
2. THE ProfileCard SHALL differentiate platforms only through the PlatformIcon rendered in the card corner.
3. THE PlatformIcon SHALL be a recognizable visual indicator sized at 16×16 pixels or equivalent.

### Requirement 6: Loading and Error States

**User Story:** As a user, I want clear feedback while my profile data loads or if something goes wrong, so that I understand the current state of the component.

#### Acceptance Criteria

1. WHILE profile data is loading, THE ProfileCard SHALL display an animated skeleton placeholder matching the card layout dimensions.
2. IF the external API request fails, THEN THE ProfileCard SHALL display the username and a descriptive status message indicating data is unavailable.
3. IF the external API request fails, THEN THE ProfileCard SHALL retain the card-based visual styling rather than collapsing to plain text.

### Requirement 7: Responsive and Accessible Design

**User Story:** As a user, I want the profile card to be readable and accessible regardless of device or assistive technology, so that the component works for everyone.

#### Acceptance Criteria

1. THE ProfileCard SHALL use relative sizing units so the card adapts to varying container widths without overflow or truncation.
2. THE ProfileCard SHALL include appropriate ARIA labels or semantic HTML elements so that screen readers can convey the username, ratings, and statistics.
3. THE ProfileCard SHALL maintain sufficient color contrast between text and background elements as defined by the project's existing CSS custom properties.
4. WHEN the user has `prefers-reduced-motion` enabled, THE ProfileCard SHALL disable skeleton loading animations.
