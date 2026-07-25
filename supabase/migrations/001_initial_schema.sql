-- =============================================================================
-- Initial Database Schema for Toby
-- Creates profiles, games, and game_analyses tables with RLS policies
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (auto-created via trigger on auth.users insert)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique constraint on id (inherent from PK, explicit for clarity)
ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_unique UNIQUE (id);

-- Games table
CREATE TABLE public.games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  pgn TEXT NOT NULL,
  headers JSONB NOT NULL DEFAULT '{}',
  source_platform TEXT NOT NULL DEFAULT 'manual' CHECK (source_platform IN ('chesscom', 'lichess', 'manual')),
  source_game_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_accessed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for querying user's games ordered by creation
CREATE INDEX idx_games_user_created ON public.games(user_id, created_at DESC);

-- Unique constraint for deduplication by source
CREATE UNIQUE INDEX idx_games_source_unique
  ON public.games(user_id, source_platform, source_game_id)
  WHERE source_game_id IS NOT NULL;

-- Game analyses table (one-to-one with games)
CREATE TABLE public.game_analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL UNIQUE REFERENCES public.games(id) ON DELETE CASCADE,
  classified_moves JSONB NOT NULL DEFAULT '[]',
  white_accuracy REAL NOT NULL DEFAULT 0,
  black_accuracy REAL NOT NULL DEFAULT 0,
  analysis_depth INTEGER NOT NULL DEFAULT 18
);

-- Trigger to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'display_name',
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- Row Level Security
-- =============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_analyses ENABLE ROW LEVEL SECURITY;

-- Profiles: users can only read/update their own
CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Games: full CRUD on own records only
CREATE POLICY "Users can read own games" ON public.games
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own games" ON public.games
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own games" ON public.games
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own games" ON public.games
  FOR DELETE USING (auth.uid() = user_id);

-- Game analyses: inherit access from parent game
CREATE POLICY "Users can read own analyses" ON public.game_analyses
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.games WHERE games.id = game_analyses.game_id AND games.user_id = auth.uid()
  ));
CREATE POLICY "Users can insert own analyses" ON public.game_analyses
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.games WHERE games.id = game_analyses.game_id AND games.user_id = auth.uid()
  ));
CREATE POLICY "Users can update own analyses" ON public.game_analyses
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM public.games WHERE games.id = game_analyses.game_id AND games.user_id = auth.uid()
  ));
CREATE POLICY "Users can delete own analyses" ON public.game_analyses
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM public.games WHERE games.id = game_analyses.game_id AND games.user_id = auth.uid()
  ));
