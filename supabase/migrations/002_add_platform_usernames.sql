-- =============================================================================
-- Add platform username columns to profiles table
-- Stores Chess.com and Lichess usernames for connected platform accounts
-- =============================================================================

ALTER TABLE public.profiles
  ADD COLUMN chess_com_username TEXT DEFAULT NULL,
  ADD COLUMN lichess_username TEXT DEFAULT NULL;

COMMENT ON COLUMN public.profiles.chess_com_username IS 'Connected Chess.com username (verified via API)';
COMMENT ON COLUMN public.profiles.lichess_username IS 'Connected Lichess username (verified via API)';
