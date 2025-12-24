-- Football Prediction System - Initial Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- LEAGUES
-- =====================================================
CREATE TABLE IF NOT EXISTS leagues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  api_id INTEGER UNIQUE NOT NULL,
  name TEXT NOT NULL,
  country TEXT,
  logo TEXT,
  current_season INTEGER DEFAULT 2025,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- VENUES
-- =====================================================
CREATE TABLE IF NOT EXISTS venues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  api_id INTEGER UNIQUE,
  name TEXT NOT NULL,
  city TEXT,
  country TEXT,
  capacity INTEGER,
  surface TEXT,
  lat DECIMAL(10, 6),
  lng DECIMAL(10, 6),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TEAMS
-- =====================================================
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  api_id INTEGER UNIQUE NOT NULL,
  name TEXT NOT NULL,
  code TEXT,
  country TEXT,
  logo TEXT,
  venue_id UUID REFERENCES venues(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- FIXTURES
-- =====================================================
CREATE TABLE IF NOT EXISTS fixtures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  api_id INTEGER UNIQUE NOT NULL,
  league_id UUID REFERENCES leagues(id),
  season INTEGER NOT NULL,
  round TEXT,
  home_team_id UUID REFERENCES teams(id) NOT NULL,
  away_team_id UUID REFERENCES teams(id) NOT NULL,
  match_date TIMESTAMPTZ NOT NULL,
  venue_id UUID REFERENCES venues(id),
  referee TEXT,
  status TEXT DEFAULT 'NS',
  goals_home INTEGER,
  goals_away INTEGER,
  score_halftime JSONB,
  score_fulltime JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TEAM SEASON STATS
-- =====================================================
CREATE TABLE IF NOT EXISTS team_season_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID REFERENCES teams(id) NOT NULL,
  league_id UUID REFERENCES leagues(id),
  season INTEGER NOT NULL,
  fixtures_played INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  draws INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  goals_for INTEGER DEFAULT 0,
  goals_against INTEGER DEFAULT 0,
  goals_for_avg DECIMAL(4, 2),
  goals_against_avg DECIMAL(4, 2),
  clean_sheets INTEGER DEFAULT 0,
  failed_to_score INTEGER DEFAULT 0,
  penalties_scored INTEGER DEFAULT 0,
  penalties_missed INTEGER DEFAULT 0,
  form TEXT,
  home_stats JSONB,
  away_stats JSONB,
  goals_by_minute JSONB,
  cards_by_minute JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, league_id, season)
);

-- =====================================================
-- FIXTURE STATISTICS
-- =====================================================
CREATE TABLE IF NOT EXISTS fixture_statistics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fixture_id UUID REFERENCES fixtures(id) NOT NULL,
  team_id UUID REFERENCES teams(id) NOT NULL,
  shots_total INTEGER,
  shots_on_goal INTEGER,
  shots_off_goal INTEGER,
  shots_blocked INTEGER,
  shots_inside_box INTEGER,
  shots_outside_box INTEGER,
  corners INTEGER,
  offsides INTEGER,
  fouls INTEGER,
  ball_possession DECIMAL(5, 2),
  yellow_cards INTEGER,
  red_cards INTEGER,
  goalkeeper_saves INTEGER,
  passes_total INTEGER,
  passes_accurate INTEGER,
  passes_pct DECIMAL(5, 2),
  expected_goals DECIMAL(4, 2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(fixture_id, team_id)
);

-- =====================================================
-- FIXTURE EVENTS
-- =====================================================
CREATE TABLE IF NOT EXISTS fixture_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fixture_id UUID REFERENCES fixtures(id) NOT NULL,
  team_id UUID REFERENCES teams(id),
  elapsed INTEGER NOT NULL,
  extra_time INTEGER,
  type TEXT NOT NULL,
  detail TEXT,
  player_name TEXT,
  player_id INTEGER,
  assist_name TEXT,
  assist_id INTEGER,
  comments TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- STANDINGS
-- =====================================================
CREATE TABLE IF NOT EXISTS standings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  league_id UUID REFERENCES leagues(id) NOT NULL,
  season INTEGER NOT NULL,
  team_id UUID REFERENCES teams(id) NOT NULL,
  rank INTEGER NOT NULL,
  points INTEGER DEFAULT 0,
  goal_diff INTEGER DEFAULT 0,
  form TEXT,
  description TEXT,
  played INTEGER DEFAULT 0,
  won INTEGER DEFAULT 0,
  drawn INTEGER DEFAULT 0,
  lost INTEGER DEFAULT 0,
  goals_for INTEGER DEFAULT 0,
  goals_against INTEGER DEFAULT 0,
  home_record JSONB,
  away_record JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(league_id, season, team_id)
);

-- =====================================================
-- INJURIES
-- =====================================================
CREATE TABLE IF NOT EXISTS injuries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID REFERENCES teams(id) NOT NULL,
  player_name TEXT NOT NULL,
  player_id INTEGER,
  type TEXT,
  reason TEXT,
  fixture_id UUID REFERENCES fixtures(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PREDICTIONS (AI Outputs)
-- =====================================================
CREATE TABLE IF NOT EXISTS predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fixture_id UUID REFERENCES fixtures(id) NOT NULL UNIQUE,
  overall_index INTEGER CHECK (overall_index BETWEEN 1 AND 100),
  prediction_result TEXT CHECK (prediction_result IN ('1', 'X', '2', '1X', 'X2', '12')),
  confidence_level TEXT CHECK (confidence_level IN ('high', 'medium', 'low')),
  factors JSONB NOT NULL,
  analysis_text TEXT,
  key_factors JSONB,
  risk_factors JSONB,
  model_version TEXT DEFAULT 'v1.0',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ODDS
-- =====================================================
CREATE TABLE IF NOT EXISTS odds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fixture_id UUID REFERENCES fixtures(id) NOT NULL,
  bookmaker TEXT NOT NULL,
  bet_type TEXT NOT NULL,
  values JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(fixture_id, bookmaker, bet_type)
);

-- =====================================================
-- WEATHER
-- =====================================================
CREATE TABLE IF NOT EXISTS weather (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fixture_id UUID REFERENCES fixtures(id) NOT NULL UNIQUE,
  temperature DECIMAL(4, 1),
  feels_like DECIMAL(4, 1),
  wind_speed DECIMAL(5, 2),
  wind_direction INTEGER,
  precipitation DECIMAL(5, 2),
  humidity INTEGER,
  weather_code INTEGER,
  description TEXT,
  fetched_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- REFEREE STATS (Aggregated)
-- =====================================================
CREATE TABLE IF NOT EXISTS referee_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  matches_refereed INTEGER DEFAULT 0,
  avg_yellow_cards DECIMAL(4, 2),
  avg_red_cards DECIMAL(4, 2),
  avg_fouls DECIMAL(5, 2),
  penalties_per_match DECIMAL(4, 3),
  home_win_pct DECIMAL(5, 2),
  away_win_pct DECIMAL(5, 2),
  draw_pct DECIMAL(5, 2),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- LINEUPS
-- =====================================================
CREATE TABLE IF NOT EXISTS lineups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fixture_id UUID REFERENCES fixtures(id) NOT NULL,
  team_id UUID REFERENCES teams(id) NOT NULL,
  formation TEXT,
  starting_xi JSONB,
  substitutes JSONB,
  coach_name TEXT,
  coach_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(fixture_id, team_id)
);

-- =====================================================
-- HEAD TO HEAD
-- =====================================================
CREATE TABLE IF NOT EXISTS head_to_head (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team1_id UUID REFERENCES teams(id) NOT NULL,
  team2_id UUID REFERENCES teams(id) NOT NULL,
  fixture_data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team1_id, team2_id)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_fixtures_date ON fixtures(match_date);
CREATE INDEX IF NOT EXISTS idx_fixtures_teams ON fixtures(home_team_id, away_team_id);
CREATE INDEX IF NOT EXISTS idx_fixtures_status ON fixtures(status);
CREATE INDEX IF NOT EXISTS idx_fixtures_season ON fixtures(season);
CREATE INDEX IF NOT EXISTS idx_standings_season ON standings(league_id, season);
CREATE INDEX IF NOT EXISTS idx_predictions_fixture ON predictions(fixture_id);
CREATE INDEX IF NOT EXISTS idx_fixture_stats_fixture ON fixture_statistics(fixture_id);
CREATE INDEX IF NOT EXISTS idx_injuries_team ON injuries(team_id);
CREATE INDEX IF NOT EXISTS idx_events_fixture ON fixture_events(fixture_id);
CREATE INDEX IF NOT EXISTS idx_lineups_fixture ON lineups(fixture_id);

-- =====================================================
-- INSERT PREMIER LEAGUE
-- =====================================================
INSERT INTO leagues (api_id, name, country, logo, current_season)
VALUES (39, 'Premier League', 'England', 'https://media.api-sports.io/football/leagues/39.png', 2025)
ON CONFLICT (api_id) DO UPDATE SET
  name = EXCLUDED.name,
  logo = EXCLUDED.logo,
  current_season = EXCLUDED.current_season;

-- =====================================================
-- ROW LEVEL SECURITY (Optional but recommended)
-- =====================================================
-- Enable RLS on all tables
ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE fixtures ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_season_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE fixture_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE fixture_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE standings ENABLE ROW LEVEL SECURITY;
ALTER TABLE injuries ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE odds ENABLE ROW LEVEL SECURITY;
ALTER TABLE weather ENABLE ROW LEVEL SECURITY;
ALTER TABLE referee_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE lineups ENABLE ROW LEVEL SECURITY;
ALTER TABLE head_to_head ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (adjust as needed)
CREATE POLICY "Allow public read access" ON leagues FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON venues FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON teams FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON fixtures FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON team_season_stats FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON fixture_statistics FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON fixture_events FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON standings FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON injuries FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON predictions FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON odds FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON weather FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON referee_stats FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON lineups FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON head_to_head FOR SELECT USING (true);

-- Service role can do everything (for n8n and import scripts)
CREATE POLICY "Allow service role full access" ON leagues FOR ALL USING (true);
CREATE POLICY "Allow service role full access" ON venues FOR ALL USING (true);
CREATE POLICY "Allow service role full access" ON teams FOR ALL USING (true);
CREATE POLICY "Allow service role full access" ON fixtures FOR ALL USING (true);
CREATE POLICY "Allow service role full access" ON team_season_stats FOR ALL USING (true);
CREATE POLICY "Allow service role full access" ON fixture_statistics FOR ALL USING (true);
CREATE POLICY "Allow service role full access" ON fixture_events FOR ALL USING (true);
CREATE POLICY "Allow service role full access" ON standings FOR ALL USING (true);
CREATE POLICY "Allow service role full access" ON injuries FOR ALL USING (true);
CREATE POLICY "Allow service role full access" ON predictions FOR ALL USING (true);
CREATE POLICY "Allow service role full access" ON odds FOR ALL USING (true);
CREATE POLICY "Allow service role full access" ON weather FOR ALL USING (true);
CREATE POLICY "Allow service role full access" ON referee_stats FOR ALL USING (true);
CREATE POLICY "Allow service role full access" ON lineups FOR ALL USING (true);
CREATE POLICY "Allow service role full access" ON head_to_head FOR ALL USING (true);
