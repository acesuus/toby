# Requirements Document

## Introduction

This feature adds user authentication, session management, and a persistent database to Toby. Currently Toby runs entirely client-side with no accounts — games and analysis exist only in memory for the duration of a browser session. This feature introduces email/password sign-in/sign-up flows, server-side session management via Supabase Auth, a PostgreSQL database (hosted on Supabase) for users and their saved games, and API routes for CRUD operations. The goal is to let users build a personal library of reviewed games that persists across devices while keeping the existing client-side analysis workflow intact. OAuth providers (Google, GitHub) are out of scope for this iteration and may be added later.

## Glossary

- **Auth_System**: The Supabase Auth module responsible for email/password credential verification, session creation, and token management.
- **Session_Manager**: The Supabase Auth session layer that creates, validates, refreshes, and revokes user sessions using HTTP-only cookies via the Supabase SSR helpers.
- **Database**: The Supabase PostgreSQL database holding user profiles, saved games, and associated metadata.
- **Auth_Middleware**: Next.js middleware that intercepts requests to protected routes and verifies Supabase session validity before allowing access.
- **Auth_Provider**: A React context provider that exposes the current user's authentication state (sourced from Supabase) to client components.
- **Game_Store**: The server-side module responsible for CRUD operations on saved games in the Database via Supabase client.
- **Auth_UI**: The set of pages and components that render sign-in, sign-up, and account management interfaces.
- **Protected_Route**: A route that requires a valid authenticated session to access.
- **Public_Route**: A route accessible without authentication (home page, sign-in, sign-up).

## Requirements

### Requirement 1: User Registration

**User Story:** As a new user, I want to create an account with email and password, so that I can save my game reviews and access them across devices.

#### Acceptance Criteria

1. WHEN a user submits a valid email and password on the sign-up form, THE Auth_System SHALL create a new user record in the Database and establish a session.
2. WHEN registration succeeds, THE Auth_System SHALL send a confirmation email to the provided address.
3. IF a user submits a sign-up form with an email already associated with an existing account, THEN THE Auth_System SHALL return an error indicating the email is already registered.
4. IF a user submits a sign-up form with a password shorter than 8 characters, THEN THE Auth_System SHALL return a validation error specifying the minimum password length.
5. THE Auth_System SHALL store passwords using Supabase Auth's built-in bcrypt hashing.

### Requirement 2: User Login

**User Story:** As a returning user, I want to sign in with my email and password, so that I can access my saved games and continue reviewing.

#### Acceptance Criteria

1. WHEN a user submits valid email and password credentials, THE Auth_System SHALL verify the credentials and establish a session.
2. IF a user submits invalid credentials (wrong email or password), THEN THE Auth_System SHALL return a generic authentication error without revealing which field was incorrect.
3. IF a user has not confirmed their email address, THEN THE Auth_System SHALL return an error indicating email confirmation is required.

### Requirement 3: User Logout

**User Story:** As an authenticated user, I want to log out, so that my session is terminated and my account is secured on shared devices.

#### Acceptance Criteria

1. WHEN an authenticated user triggers the logout action, THE Session_Manager SHALL invalidate the current session and clear the session cookie from the browser.
2. WHEN logout completes, THE Auth_Provider SHALL update the client-side authentication state to unauthenticated and redirect the user to the home page.
3. THE Session_Manager SHALL ensure invalidated sessions cannot be reused for subsequent requests.

### Requirement 4: Session Management

**User Story:** As a user, I want my login to persist across page reloads and browser tabs, so that I do not need to sign in repeatedly.

#### Acceptance Criteria

1. THE Session_Manager SHALL use Supabase SSR helpers to store session tokens in HTTP-only, Secure, SameSite=Lax cookies.
2. WHEN a session token is present in a request, THE Session_Manager SHALL validate the token and attach the authenticated user identity to the request context.
3. WHILE a session is valid, THE Session_Manager SHALL refresh the session automatically using Supabase's built-in token refresh mechanism.
4. IF a session token is expired or invalid, THEN THE Session_Manager SHALL reject the request and clear the invalid cookie.

### Requirement 5: Auth State in Client Components

**User Story:** As a developer, I want a React context that exposes the current auth state, so that components can conditionally render based on login status.

#### Acceptance Criteria

1. THE Auth_Provider SHALL expose the current user object (id, email, name, avatar URL) or null if unauthenticated to all descendant client components.
2. WHILE the auth state is loading (initial page load), THE Auth_Provider SHALL expose an explicit loading state so components can render appropriate loading indicators.
3. WHEN the session becomes invalid (logout or expiration), THE Auth_Provider SHALL update the exposed state to unauthenticated without requiring a full page reload.

### Requirement 6: Route Protection

**User Story:** As a product owner, I want certain routes to require authentication, so that user-specific features are only accessible to logged-in users.

#### Acceptance Criteria

1. WHEN an unauthenticated user requests a Protected_Route, THE Auth_Middleware SHALL redirect the request to the sign-in page with a return URL parameter.
2. WHEN an authenticated user requests a Protected_Route, THE Auth_Middleware SHALL allow the request to proceed.
3. THE Auth_Middleware SHALL treat the following as Public_Routes: the home page, the sign-in page, the sign-up page, and the auth callback endpoint.
4. THE Auth_Middleware SHALL treat the following as Protected_Routes: the saved games library page, account settings page, and game save/delete API endpoints.
5. THE Auth_Middleware SHALL allow the review page to be accessible without authentication so that the existing client-side analysis flow remains functional for anonymous users.

### Requirement 7: Database Schema for Users

**User Story:** As a system, I need a persistent user profiles table, so that account information can be stored and queried alongside Supabase Auth records.

#### Acceptance Criteria

1. THE Database SHALL store user profile records in a `profiles` table containing: user identifier (references Supabase Auth user id), display name, avatar URL, creation timestamp, and last-login timestamp.
2. THE Database SHALL enforce a unique constraint on the user identifier field in the profiles table.
3. WHEN a new user registers via Supabase Auth, THE Database SHALL automatically create a corresponding profile record using a database trigger.

### Requirement 8: Database Schema for Saved Games

**User Story:** As a system, I need a persistent game storage schema, so that users can save, retrieve, and manage their reviewed games.

#### Acceptance Criteria

1. THE Database SHALL store game records in a `games` table containing: unique identifier (UUID), owner user id (foreign key to profiles), PGN text, game headers (white player, black player, result, date, time control, opening), source platform (chesscom, lichess, or manual), source game identifier (nullable), creation timestamp, and last-accessed timestamp.
2. THE Database SHALL store analysis results in a `game_analyses` table associated with a game record containing: classified moves (JSONB), accuracy score for white, accuracy score for black, and analysis depth used.
3. THE Database SHALL enforce that each game record belongs to exactly one user via a foreign key constraint with cascade delete.
4. THE Database SHALL support querying games by owner user with ordering by creation timestamp.
5. THE Database SHALL enforce Row Level Security (RLS) policies so that users can only read, insert, update, and delete their own game records.

### Requirement 9: Save Game to Library

**User Story:** As an authenticated user, I want to save a reviewed game to my library, so that I can revisit the analysis later.

#### Acceptance Criteria

1. WHEN an authenticated user triggers the save action after a game review completes, THE Game_Store SHALL persist the game PGN, headers, classified moves, and accuracy scores to the Database associated with the user's account.
2. IF the same game (matched by source platform and source game identifier) already exists in the user's library, THEN THE Game_Store SHALL update the existing record with the new analysis results rather than creating a duplicate.
3. IF an unauthenticated user triggers the save action, THEN THE Auth_UI SHALL prompt the user to sign in or sign up before saving.
4. WHEN a game is saved, THE Game_Store SHALL return the saved game record including its unique identifier.

### Requirement 10: Retrieve and Manage Saved Games

**User Story:** As an authenticated user, I want to browse my saved games and load them for re-review, so that I can track my progress over time.

#### Acceptance Criteria

1. WHEN an authenticated user navigates to the saved games library, THE Game_Store SHALL return a paginated list of the user's saved games ordered by creation timestamp descending.
2. WHEN an authenticated user selects a saved game from the library, THE Game_Store SHALL return the full game record including PGN and stored analysis results.
3. WHEN an authenticated user requests deletion of a saved game, THE Game_Store SHALL remove the game record from the Database and confirm deletion.
4. THE Game_Store SHALL return a maximum of 20 games per page and support cursor-based pagination for subsequent pages.
5. THE Game_Store SHALL only return games belonging to the requesting authenticated user; requests for other users' games SHALL be rejected.

### Requirement 11: Sign-In and Sign-Up UI

**User Story:** As a user, I want clear and accessible sign-in and sign-up pages, so that I can create an account or access my existing one.

#### Acceptance Criteria

1. THE Auth_UI SHALL render a sign-in page at the `/login` route containing email and password fields, a submit button, and a link to the sign-up page.
2. THE Auth_UI SHALL render a sign-up page at the `/signup` route containing email, display name, and password fields, a submit button, and a link to the sign-in page.
3. WHEN a form submission results in a validation or authentication error, THE Auth_UI SHALL display the error message adjacent to the relevant form field or at the top of the form.
4. THE Auth_UI SHALL meet WCAG 2.1 Level AA accessibility requirements including visible focus indicators, form labels associated with inputs, and error messages linked via aria-describedby.
5. THE Auth_UI SHALL follow the existing Toby visual identity: warm color palette, serif headings, Inter body text, rounded card containers, and the Moss accent color.

### Requirement 12: Authenticated Header and Navigation

**User Story:** As a user, I want to see my login status in the app header, so that I know whether I am signed in and can access account actions.

#### Acceptance Criteria

1. WHILE a user is authenticated, THE Auth_UI SHALL display the user's avatar and display name in the app header with a dropdown menu containing links to the saved games library, account settings, and a logout button.
2. WHILE a user is unauthenticated, THE Auth_UI SHALL display a "Sign in" link in the app header that navigates to the sign-in page.
3. WHILE the auth state is loading, THE Auth_UI SHALL display a skeleton placeholder in the header to prevent layout shift.
