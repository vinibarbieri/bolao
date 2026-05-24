-- Bolao 2026 - Initial Schema Migration
-- Run this in Supabase SQL Editor or via Supabase CLI

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE member_status AS ENUM ('pending', 'accepted', 'denied');
CREATE TYPE match_stage AS ENUM ('group', 'r32', 'r16', 'qf', 'sf', 'third', 'final');
CREATE TYPE match_status AS ENUM ('scheduled', 'live', 'finished');
CREATE TYPE player_position AS ENUM ('GK', 'DF', 'MF', 'FW');
CREATE TYPE knockout_round AS ENUM ('r32', 'r16', 'qf', 'sf', 'third', 'final', 'champion');
CREATE TYPE award_type AS ENUM ('golden_boot', 'golden_glove', 'top_assist', 'goal_of_tournament');
CREATE TYPE score_category AS ENUM ('group', 'knockout', 'awards', 'golden_trio');
CREATE TYPE tournament_stage AS ENUM ('pre_tournament', 'group_stage', 'knockout', 'finished');

-- ============================================================
-- IDENTITY & SOCIAL
-- ============================================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE leagues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  invite_code TEXT UNIQUE NOT NULL,
  owner_id UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE league_members (
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status member_status NOT NULL DEFAULT 'pending',
  invited_at TIMESTAMPTZ DEFAULT now(),
  responded_at TIMESTAMPTZ,
  PRIMARY KEY (league_id, user_id)
);

-- ============================================================
-- TOURNAMENT STRUCTURE
-- ============================================================

CREATE TABLE tournament_config (
  id INT PRIMARY KEY CHECK (id = 1),
  predictions_lock_at TIMESTAMPTZ NOT NULL,
  is_locked BOOLEAN DEFAULT false,
  current_stage TEXT NOT NULL DEFAULT 'pre_tournament'
);

CREATE TABLE teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  flag_url TEXT,
  group_letter CHAR(1) NOT NULL
);

CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  team_id TEXT NOT NULL REFERENCES teams(id),
  position player_position NOT NULL,
  external_api_id TEXT
);

CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage match_stage NOT NULL,
  group_letter CHAR(1),
  match_number INT,
  home_team_id TEXT REFERENCES teams(id),
  away_team_id TEXT REFERENCES teams(id),
  home_score INT,
  away_score INT,
  home_penalties INT,
  away_penalties INT,
  winner_team_id TEXT REFERENCES teams(id),
  motm_player_id UUID REFERENCES players(id),
  kickoff_at TIMESTAMPTZ NOT NULL,
  status match_status NOT NULL DEFAULT 'scheduled',
  external_api_id TEXT
);

CREATE TABLE group_standings (
  team_id TEXT PRIMARY KEY REFERENCES teams(id),
  group_letter CHAR(1),
  position INT,
  played INT DEFAULT 0,
  won INT DEFAULT 0,
  drawn INT DEFAULT 0,
  lost INT DEFAULT 0,
  gf INT DEFAULT 0,
  ga INT DEFAULT 0,
  gd INT DEFAULT 0,
  points INT DEFAULT 0,
  is_best_third BOOLEAN DEFAULT false
);

-- ============================================================
-- USER PREDICTIONS
-- ============================================================

CREATE TABLE prediction_visibility (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  is_public BOOLEAN DEFAULT false,
  unlocked_at TIMESTAMPTZ
);

CREATE TABLE group_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  group_letter CHAR(1) NOT NULL,
  team_id TEXT NOT NULL REFERENCES teams(id),
  predicted_position INT NOT NULL CHECK (predicted_position BETWEEN 1 AND 4),
  advances_as_third BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(user_id, group_letter, team_id),
  UNIQUE(user_id, group_letter, predicted_position)
);

CREATE TABLE group_score_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  match_id UUID NOT NULL REFERENCES matches(id),
  predicted_home_score INT,
  predicted_away_score INT,
  UNIQUE(user_id, match_id)
);

CREATE TABLE knockout_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  team_id TEXT NOT NULL REFERENCES teams(id),
  round knockout_round NOT NULL,
  UNIQUE(user_id, team_id, round)
);

CREATE TABLE bracket_picks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  bracket_slot INT NOT NULL,
  team_id TEXT NOT NULL REFERENCES teams(id),
  UNIQUE(user_id, bracket_slot)
);

CREATE TABLE award_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  award_type award_type NOT NULL,
  player_id UUID REFERENCES players(id),
  description TEXT,
  UNIQUE(user_id, award_type)
);

CREATE TABLE golden_trio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id),
  slot INT NOT NULL CHECK (slot IN (1,2,3)),
  UNIQUE(user_id, slot),
  UNIQUE(user_id, player_id)
);

-- ============================================================
-- ACTUAL RESULTS
-- ============================================================

CREATE TABLE actual_awards (
  award_type award_type PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES players(id),
  entered_by UUID REFERENCES profiles(id)
);

-- ============================================================
-- SCORING & LEADERBOARD
-- ============================================================

CREATE TABLE user_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category score_category NOT NULL,
  sub_detail TEXT,
  points INT NOT NULL,
  description TEXT
);

CREATE TABLE leaderboard_cache (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  total_points INT DEFAULT 0,
  group_points INT DEFAULT 0,
  knockout_points INT DEFAULT 0,
  award_points INT DEFAULT 0,
  trio_points INT DEFAULT 0,
  champion_correct BOOLEAN DEFAULT false,
  rank INT,
  PRIMARY KEY (user_id, league_id)
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_score_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE knockout_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bracket_picks ENABLE ROW LEVEL SECURITY;
ALTER TABLE award_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE golden_trio ENABLE ROW LEVEL SECURITY;
ALTER TABLE prediction_visibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_cache ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read all, update own
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Leagues: readable by members
CREATE POLICY "leagues_select" ON leagues FOR SELECT USING (true);
CREATE POLICY "leagues_insert" ON leagues FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- League members: readable by league members
CREATE POLICY "league_members_select" ON league_members FOR SELECT USING (true);
CREATE POLICY "league_members_insert" ON league_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "league_members_update" ON league_members FOR UPDATE USING (auth.uid() = user_id);

-- Predictions: own data only, locked check
CREATE POLICY "group_preds_select" ON group_predictions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "group_preds_insert" ON group_predictions FOR INSERT
  WITH CHECK (auth.uid() = user_id AND (SELECT is_locked FROM tournament_config WHERE id = 1) = false);
CREATE POLICY "group_preds_update" ON group_predictions FOR UPDATE
  USING (auth.uid() = user_id AND (SELECT is_locked FROM tournament_config WHERE id = 1) = false);
CREATE POLICY "group_preds_delete" ON group_predictions FOR DELETE
  USING (auth.uid() = user_id AND (SELECT is_locked FROM tournament_config WHERE id = 1) = false);

CREATE POLICY "score_preds_select" ON group_score_predictions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "score_preds_insert" ON group_score_predictions FOR INSERT
  WITH CHECK (auth.uid() = user_id AND (SELECT is_locked FROM tournament_config WHERE id = 1) = false);
CREATE POLICY "score_preds_update" ON group_score_predictions FOR UPDATE
  USING (auth.uid() = user_id AND (SELECT is_locked FROM tournament_config WHERE id = 1) = false);

CREATE POLICY "knockout_preds_select" ON knockout_predictions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "knockout_preds_insert" ON knockout_predictions FOR INSERT
  WITH CHECK (auth.uid() = user_id AND (SELECT is_locked FROM tournament_config WHERE id = 1) = false);
CREATE POLICY "knockout_preds_delete" ON knockout_predictions FOR DELETE
  USING (auth.uid() = user_id AND (SELECT is_locked FROM tournament_config WHERE id = 1) = false);

CREATE POLICY "bracket_select" ON bracket_picks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "bracket_insert" ON bracket_picks FOR INSERT
  WITH CHECK (auth.uid() = user_id AND (SELECT is_locked FROM tournament_config WHERE id = 1) = false);
CREATE POLICY "bracket_delete" ON bracket_picks FOR DELETE
  USING (auth.uid() = user_id AND (SELECT is_locked FROM tournament_config WHERE id = 1) = false);

CREATE POLICY "award_preds_select" ON award_predictions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "award_preds_insert" ON award_predictions FOR INSERT
  WITH CHECK (auth.uid() = user_id AND (SELECT is_locked FROM tournament_config WHERE id = 1) = false);
CREATE POLICY "award_preds_delete" ON award_predictions FOR DELETE
  USING (auth.uid() = user_id AND (SELECT is_locked FROM tournament_config WHERE id = 1) = false);

CREATE POLICY "trio_select" ON golden_trio FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "trio_insert" ON golden_trio FOR INSERT
  WITH CHECK (auth.uid() = user_id AND (SELECT is_locked FROM tournament_config WHERE id = 1) = false);
CREATE POLICY "trio_delete" ON golden_trio FOR DELETE
  USING (auth.uid() = user_id AND (SELECT is_locked FROM tournament_config WHERE id = 1) = false);

CREATE POLICY "visibility_select" ON prediction_visibility FOR SELECT USING (true);
CREATE POLICY "visibility_insert" ON prediction_visibility FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "visibility_update" ON prediction_visibility FOR UPDATE USING (auth.uid() = user_id);

-- Scores & leaderboard: readable by all authenticated
CREATE POLICY "scores_select" ON user_scores FOR SELECT USING (true);
CREATE POLICY "leaderboard_select" ON leaderboard_cache FOR SELECT USING (true);

-- ============================================================
-- AUTO-PROFILE CREATION ON SIGN-UP
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'Anonymous'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  INSERT INTO public.prediction_visibility (user_id, is_public)
  VALUES (NEW.id, false);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_matches_stage ON matches(stage);
CREATE INDEX idx_matches_group ON matches(group_letter);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_group_preds_user ON group_predictions(user_id);
CREATE INDEX idx_knockout_preds_user ON knockout_predictions(user_id);
CREATE INDEX idx_bracket_picks_user ON bracket_picks(user_id);
CREATE INDEX idx_leaderboard_league ON leaderboard_cache(league_id);
CREATE INDEX idx_user_scores_user ON user_scores(user_id);
