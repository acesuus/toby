# Requirements Document

## Introduction

The Account Page provides authenticated Toby users with a centralized hub to manage their chess platform connections (Chess.com and Lichess), view profile information from those platforms, browse recent games, and manage basic account details. This feature builds on the existing Supabase auth system and fetcher module, adding persistent platform username storage and a dedicated `/account` route.

## Glossary

- **Account_Page**: The Next.js page at the `/account` route that displays user account details, connected platforms, and recent games
- **Platform_Connection**: A stored association between a Toby user and their username on Chess.com or Lichess
- **Connected_Platforms_Store**: The database table that persists platform usernames linked to a user's profile
- **Profile_Section**: The area of the Account Page that displays the user's Toby account information (email, display name)
- **Platform_Profile_View**: A UI section showing profile data fetched from a connected chess platform's public API
- **Import_Panel**: The existing component on the landing page where users enter a username to fetch games for analysis
- **Username_Validator**: The existing `validateUsername()` function that checks Chess.com and Lichess username format

## Requirements

### Requirement 1: Platform Username Storage

**User Story:** As an authenticated user, I want to link my Chess.com and Lichess usernames to my Toby account, so that the app remembers my platforms without me re-entering them.

#### Acceptance Criteria

1. THE Connected_Platforms_Store SHALL persist a chess_com_username and lichess_username per user profile
2. WHEN a user submits a platform username, THE Username_Validator SHALL validate the format before storage
3. WHEN a valid username is submitted, THE Connected_Platforms_Store SHALL save the username associated with the authenticated user's profile
4. IF the username validation fails, THEN THE Account_Page SHALL display the validation error and leave the stored value unchanged
5. THE Connected_Platforms_Store SHALL allow a user to have zero, one, or both platforms connected simultaneously

### Requirement 2: Platform Username Verification

**User Story:** As a user, I want confirmation that my entered username exists on Chess.com or Lichess, so that I know my connection is valid.

#### Acceptance Criteria

1. WHEN a user submits a platform username for connection, THE Account_Page SHALL verify the username exists by fetching data from the platform's public API
2. IF the platform API returns a not-found response, THEN THE Account_Page SHALL display an error indicating the username was not found on the platform
3. IF the platform API is unavailable or rate-limited, THEN THE Account_Page SHALL display a descriptive error and leave the stored value unchanged
4. WHEN verification succeeds, THE Account_Page SHALL save the username and display a success confirmation

### Requirement 3: Platform Disconnection

**User Story:** As a user, I want to disconnect a linked Chess.com or Lichess account, so that I can remove platforms I no longer use.

#### Acceptance Criteria

1. WHEN a user triggers disconnect for a connected platform, THE Connected_Platforms_Store SHALL remove the stored username for that platform
2. WHEN a platform is disconnected, THE Account_Page SHALL immediately stop displaying profile data and recent games for that platform
3. THE Account_Page SHALL require user confirmation before disconnecting a platform

### Requirement 4: Platform Profile Display

**User Story:** As a user, I want to see my Chess.com or Lichess profile information on my account page, so that I can verify the correct account is connected.

#### Acceptance Criteria

1. WHEN a platform is connected, THE Account_Page SHALL fetch and display the player's profile information from the platform's public API
2. THE Platform_Profile_View SHALL display the username and available rating information from the connected platform
3. IF the platform API is unavailable when loading profile data, THEN THE Account_Page SHALL display a fallback state showing the stored username with an indication that live data is unavailable
4. WHILE profile data is loading, THE Account_Page SHALL display a loading skeleton in place of the profile content

### Requirement 5: Recent Games Display

**User Story:** As a user, I want to see my recent games from connected platforms on my account page, so that I can quickly access games for review.

#### Acceptance Criteria

1. WHEN a platform is connected, THE Account_Page SHALL fetch and display up to 10 recent games from that platform
2. THE Account_Page SHALL display each game with the players' names, result, time control, and date
3. WHEN a user selects a game from the recent games list, THE Account_Page SHALL navigate the user to the review page with that game loaded
4. IF the platform API returns zero games, THEN THE Account_Page SHALL display a message indicating no recent games were found
5. WHILE recent games are loading, THE Account_Page SHALL display loading skeleton placeholders

### Requirement 6: Account Details Display

**User Story:** As a user, I want to see my Toby account information (email, display name) on the account page, so that I can verify my identity.

#### Acceptance Criteria

1. THE Account_Page SHALL display the authenticated user's email address
2. THE Account_Page SHALL display the authenticated user's display name
3. WHILE account data is loading, THE Account_Page SHALL display a loading skeleton

### Requirement 7: Import Panel Pre-fill

**User Story:** As a user, I want the import panel on the landing page to auto-fill my connected username, so that I don't have to type it every time I import games.

#### Acceptance Criteria

1. WHEN an authenticated user has a connected Chess.com username and selects the Chess.com import tab, THE Import_Panel SHALL pre-fill the username input with the stored Chess.com username
2. WHEN an authenticated user has a connected Lichess username and selects the Lichess import tab, THE Import_Panel SHALL pre-fill the username input with the stored Lichess username
3. WHEN no platform username is connected for the selected tab, THE Import_Panel SHALL leave the username input empty
4. THE Import_Panel SHALL allow the user to override the pre-filled username with a different value

### Requirement 8: Access Control

**User Story:** As the system owner, I want the account page to only be accessible to authenticated users, so that unauthenticated visitors cannot access private data.

#### Acceptance Criteria

1. WHEN an unauthenticated user navigates to `/account`, THE middleware SHALL redirect the user to `/login?returnUrl=/account`
2. THE Account_Page SHALL only display data belonging to the authenticated user
3. THE Connected_Platforms_Store SHALL enforce that users can only read and modify their own platform connections via Row Level Security

### Requirement 9: Database Migration

**User Story:** As a developer, I want platform connection data stored in the existing profiles table, so that the schema remains simple and connections are tied to user identity.

#### Acceptance Criteria

1. THE database migration SHALL add `chess_com_username` and `lichess_username` columns to the existing `profiles` table
2. THE migration SHALL define both columns as nullable TEXT type
3. THE existing Row Level Security policies on the `profiles` table SHALL apply to the new columns without modification

