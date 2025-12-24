-- Football Prediction System - Extended Schema
-- Run this in Supabase SQL Editor AFTER 001_initial_schema.sql

-- =====================================================
-- PLAYERS
-- =====================================================
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  api_id INTEGER UNIQUE NOT NULL,
  name TEXT NOT NULL,
  firstname TEXT,
  lastname TEXT,
  age INTEGER,
  birth_date DATE,
  birth_place TEXT,
  birth_country TEXT,
  nationality TEXT,
  height TEXT,
  weight TEXT,
  photo TEXT,
  injured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PLAYER SEASON STATS
-- =====================================================
CREATE TABLE IF NOT EXISTS player_season_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID REFERENCES players(id) NOT NULL,
  team_id UUID REFERENCES teams(id),
  league_id UUID REFERENCES leagues(id),
  season INTEGER NOT NULL,
  position TEXT,
  appearances INTEGER DEFAULT 0,
  lineups INTEGER DEFAULT 0,
  minutes INTEGER DEFAULT 0,
  rating DECIMAL(4,2),
  goals INTEGER DEFAULT 0,
  assists INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  tackles INTEGER DEFAULT 0,
  duels_total INTEGER DEFAULT 0,
  duels_won INTEGER DEFAULT 0,
  dribbles_attempts INTEGER DEFAULT 0,
  dribbles_success INTEGER DEFAULT 0,
  fouls_drawn INTEGER DEFAULT 0,
  fouls_committed INTEGER DEFAULT 0,
  yellow_cards INTEGER DEFAULT 0,
  yellowred_cards INTEGER DEFAULT 0,
  red_cards INTEGER DEFAULT 0,
  penalties_won INTEGER DEFAULT 0,
  penalties_committed INTEGER DEFAULT 0,
  penalties_scored INTEGER DEFAULT 0,
  penalties_missed INTEGER DEFAULT 0,
  penalties_saved INTEGER DEFAULT 0,
  passes_total INTEGER DEFAULT 0,
  passes_key INTEGER DEFAULT 0,
  passes_accuracy DECIMAL(5,2),
  shots_total INTEGER DEFAULT 0,
  shots_on INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(player_id, team_id, league_id, season)
);

-- =====================================================
-- PLAYER MATCH STATS (Per-fixture performance)
-- =====================================================
CREATE TABLE IF NOT EXISTS player_match_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fixture_id UUID REFERENCES fixtures(id) NOT NULL,
  player_id UUID REFERENCES players(id) NOT NULL,
  team_id UUID REFERENCES teams(id) NOT NULL,
  minutes INTEGER,
  number INTEGER,
  position TEXT,
  grid TEXT,
  rating DECIMAL(4,2),
  captain BOOLEAN DEFAULT false,
  substitute BOOLEAN DEFAULT false,
  goals INTEGER DEFAULT 0,
  assists INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  shots_total INTEGER DEFAULT 0,
  shots_on INTEGER DEFAULT 0,
  passes_total INTEGER DEFAULT 0,
  passes_key INTEGER DEFAULT 0,
  passes_accuracy DECIMAL(5,2),
  tackles INTEGER DEFAULT 0,
  blocks INTEGER DEFAULT 0,
  interceptions INTEGER DEFAULT 0,
  duels_total INTEGER DEFAULT 0,
  duels_won INTEGER DEFAULT 0,
  dribbles_attempts INTEGER DEFAULT 0,
  dribbles_success INTEGER DEFAULT 0,
  dribbles_past INTEGER DEFAULT 0,
  fouls_drawn INTEGER DEFAULT 0,
  fouls_committed INTEGER DEFAULT 0,
  yellow_cards INTEGER DEFAULT 0,
  red_cards INTEGER DEFAULT 0,
  penalties_won INTEGER DEFAULT 0,
  penalties_committed INTEGER DEFAULT 0,
  penalties_scored INTEGER DEFAULT 0,
  penalties_missed INTEGER DEFAULT 0,
  penalties_saved INTEGER DEFAULT 0,
  offsides INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(fixture_id, player_id)
);

-- =====================================================
-- COACHES
-- =====================================================
CREATE TABLE IF NOT EXISTS coaches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  api_id INTEGER UNIQUE NOT NULL,
  name TEXT NOT NULL,
  firstname TEXT,
  lastname TEXT,
  age INTEGER,
  birth_date DATE,
  birth_place TEXT,
  birth_country TEXT,
  nationality TEXT,
  photo TEXT,
  team_id UUID REFERENCES teams(id),
  career JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TRANSFERS
-- =====================================================
CREATE TABLE IF NOT EXISTS transfers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_api_id INTEGER,
  player_id UUID REFERENCES players(id),
  player_name TEXT NOT NULL,
  from_team_api_id INTEGER,
  from_team_id UUID REFERENCES teams(id),
  from_team_name TEXT,
  to_team_api_id INTEGER,
  to_team_id UUID REFERENCES teams(id),
  to_team_name TEXT,
  transfer_date DATE,
  transfer_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TOP SCORERS / TOP ASSISTS
-- =====================================================
CREATE TABLE IF NOT EXISTS top_performers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  league_id UUID REFERENCES leagues(id) NOT NULL,
  season INTEGER NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('goals', 'assists', 'yellow_cards', 'red_cards')),
  rank INTEGER NOT NULL,
  player_api_id INTEGER,
  player_id UUID REFERENCES players(id),
  player_name TEXT NOT NULL,
  player_photo TEXT,
  team_api_id INTEGER,
  team_id UUID REFERENCES teams(id),
  team_name TEXT,
  team_logo TEXT,
  value INTEGER NOT NULL,
  appearances INTEGER,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(league_id, season, category, player_api_id)
);

-- =====================================================
-- API PREDICTIONS (from API-Football)
-- =====================================================
CREATE TABLE IF NOT EXISTS api_predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fixture_id UUID REFERENCES fixtures(id) NOT NULL UNIQUE,
  winner_id INTEGER,
  winner_name TEXT,
  winner_comment TEXT,
  win_or_draw BOOLEAN,
  under_over TEXT,
  goals_home TEXT,
  goals_away TEXT,
  advice TEXT,
  percent_home TEXT,
  percent_draw TEXT,
  percent_away TEXT,
  comparison JSONB,
  teams_comparison JSONB,
  h2h_summary JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PLAYER SQUADS (Current squad assignment)
-- =====================================================
CREATE TABLE IF NOT EXISTS player_squads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID REFERENCES players(id) NOT NULL,
  team_id UUID REFERENCES teams(id) NOT NULL,
  season INTEGER NOT NULL,
  number INTEGER,
  position TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(player_id, team_id, season)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_players_api_id ON players(api_id);
CREATE INDEX IF NOT EXISTS idx_players_name ON players(name);
CREATE INDEX IF NOT EXISTS idx_player_season_stats_player ON player_season_stats(player_id);
CREATE INDEX IF NOT EXISTS idx_player_season_stats_team ON player_season_stats(team_id);
CREATE INDEX IF NOT EXISTS idx_player_season_stats_season ON player_season_stats(season);
CREATE INDEX IF NOT EXISTS idx_player_match_stats_fixture ON player_match_stats(fixture_id);
CREATE INDEX IF NOT EXISTS idx_player_match_stats_player ON player_match_stats(player_id);
CREATE INDEX IF NOT EXISTS idx_coaches_team ON coaches(team_id);
CREATE INDEX IF NOT EXISTS idx_transfers_player ON transfers(player_id);
CREATE INDEX IF NOT EXISTS idx_transfers_date ON transfers(transfer_date);
CREATE INDEX IF NOT EXISTS idx_top_performers_category ON top_performers(category, season);
CREATE INDEX IF NOT EXISTS idx_player_squads_team ON player_squads(team_id);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_season_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_match_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE top_performers ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_squads ENABLE ROW LEVEL SECURITY;

-- Public read policies
CREATE POLICY "Allow public read access" ON players FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON player_season_stats FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON player_match_stats FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON coaches FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON transfers FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON top_performers FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON api_predictions FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON player_squads FOR SELECT USING (true);

-- Service role full access
CREATE POLICY "Allow service role full access" ON players FOR ALL USING (true);
CREATE POLICY "Allow service role full access" ON player_season_stats FOR ALL USING (true);
CREATE POLICY "Allow service role full access" ON player_match_stats FOR ALL USING (true);
CREATE POLICY "Allow service role full access" ON coaches FOR ALL USING (true);
CREATE POLICY "Allow service role full access" ON transfers FOR ALL USING (true);
CREATE POLICY "Allow service role full access" ON top_performers FOR ALL USING (true);
CREATE POLICY "Allow service role full access" ON api_predictions FOR ALL USING (true);
CREATE POLICY "Allow service role full access" ON player_squads FOR ALL USING (true);

-- =====================================================
-- ADD MISSING COLUMNS TO INJURIES
-- =====================================================
ALTER TABLE injuries ADD COLUMN IF NOT EXISTS player_id UUID REFERENCES players(id);
ALTER TABLE injuries ADD COLUMN IF NOT EXISTS injury_type TEXT;
ALTER TABLE injuries ADD COLUMN IF NOT EXISTS injury_reason TEXT;
ALTER TABLE injuries ADD COLUMN IF NOT EXISTS reported_date DATE;

-- Add unique constraint for injuries
ALTER TABLE injuries DROP CONSTRAINT IF EXISTS injuries_player_date_unique;
DO $$ BEGIN
  ALTER TABLE injuries ADD CONSTRAINT injuries_player_date_unique UNIQUE (player_id, reported_date);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- ADD MISSING COLUMNS TO HEAD_TO_HEAD
-- =====================================================
ALTER TABLE head_to_head ADD COLUMN IF NOT EXISTS matches_played INTEGER DEFAULT 0;
ALTER TABLE head_to_head ADD COLUMN IF NOT EXISTS team1_wins INTEGER DEFAULT 0;
ALTER TABLE head_to_head ADD COLUMN IF NOT EXISTS team2_wins INTEGER DEFAULT 0;
ALTER TABLE head_to_head ADD COLUMN IF NOT EXISTS draws INTEGER DEFAULT 0;
ALTER TABLE head_to_head ADD COLUMN IF NOT EXISTS team1_goals INTEGER DEFAULT 0;
ALTER TABLE head_to_head ADD COLUMN IF NOT EXISTS team2_goals INTEGER DEFAULT 0;
ALTER TABLE head_to_head ADD COLUMN IF NOT EXISTS last_fixtures JSONB;

-- =====================================================
-- ADD MISSING COLUMNS TO FIXTURE_EVENTS
-- =====================================================
ALTER TABLE fixture_events ADD COLUMN IF NOT EXISTS player_id_uuid UUID REFERENCES players(id);
ALTER TABLE fixture_events ADD COLUMN IF NOT EXISTS assist_player_id UUID REFERENCES players(id);
ALTER TABLE fixture_events ADD COLUMN IF NOT EXISTS assist_player_name TEXT;
ALTER TABLE fixture_events ADD COLUMN IF NOT EXISTS event_time INTEGER;
ALTER TABLE fixture_events ADD COLUMN IF NOT EXISTS event_type TEXT;
ALTER TABLE fixture_events ADD COLUMN IF NOT EXISTS event_detail TEXT;

-- Add unique constraint for fixture_events
ALTER TABLE fixture_events DROP CONSTRAINT IF EXISTS fixture_events_unique;
DO $$ BEGIN
  ALTER TABLE fixture_events ADD CONSTRAINT fixture_events_unique UNIQUE (fixture_id, event_time, event_type, player_name);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- UPDATE LEAGUES SEASON
-- =====================================================
UPDATE leagues SET current_season = 2025 WHERE api_id = 39;
