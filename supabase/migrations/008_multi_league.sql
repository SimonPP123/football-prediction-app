-- Multi-League Support Migration
-- This migration adds support for multiple leagues with scalable architecture

-- =====================================================
-- STEP 1: ADD CONFIGURATION COLUMNS TO LEAGUES TABLE
-- =====================================================
-- Add new columns for league configuration
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS odds_sport_key TEXT;
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS country_code TEXT;
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false;
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 999;
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';

-- Update existing Premier League with config
UPDATE leagues
SET
  odds_sport_key = 'soccer_epl',
  country_code = 'GB',
  is_active = true,
  display_order = 1
WHERE api_id = 39;

-- =====================================================
-- STEP 2: ADD LEAGUE_ID TO TEAMS TABLE
-- =====================================================
-- Add league_id column to teams (nullable initially for backfill)
ALTER TABLE teams ADD COLUMN IF NOT EXISTS league_id UUID REFERENCES leagues(id);

-- Backfill existing teams with Premier League ID
UPDATE teams
SET league_id = (SELECT id FROM leagues WHERE api_id = 39 LIMIT 1)
WHERE league_id IS NULL;

-- =====================================================
-- STEP 3: ADD LEAGUE_ID TO PREDICTIONS TABLE
-- =====================================================
-- Add league_id column to predictions for efficient querying
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS league_id UUID REFERENCES leagues(id);

-- Backfill predictions with league_id from their fixtures
UPDATE predictions p
SET league_id = f.league_id
FROM fixtures f
WHERE p.fixture_id = f.id AND p.league_id IS NULL;

-- =====================================================
-- STEP 4: CHANGE UNIQUE CONSTRAINTS TO COMPOSITE KEYS
-- =====================================================
-- Drop old unique constraint on teams.api_id
ALTER TABLE teams DROP CONSTRAINT IF EXISTS teams_api_id_key;

-- Create new composite unique constraint for teams
ALTER TABLE teams ADD CONSTRAINT teams_api_id_league_unique UNIQUE(api_id, league_id);

-- Drop old unique constraint on fixtures.api_id
ALTER TABLE fixtures DROP CONSTRAINT IF EXISTS fixtures_api_id_key;

-- Create new composite unique constraint for fixtures
ALTER TABLE fixtures ADD CONSTRAINT fixtures_api_id_league_unique UNIQUE(api_id, league_id);

-- =====================================================
-- STEP 5: PRE-SEED TOP 5 EUROPEAN LEAGUES
-- =====================================================
-- Insert other major leagues (Premier League already exists)
INSERT INTO leagues (api_id, name, country, logo, current_season, odds_sport_key, country_code, is_active, display_order)
VALUES
  (140, 'La Liga', 'Spain', 'https://media.api-sports.io/football/leagues/140.png', 2024, 'soccer_spain_la_liga', 'ES', false, 2),
  (78, 'Bundesliga', 'Germany', 'https://media.api-sports.io/football/leagues/78.png', 2024, 'soccer_germany_bundesliga', 'DE', false, 3),
  (135, 'Serie A', 'Italy', 'https://media.api-sports.io/football/leagues/135.png', 2024, 'soccer_italy_serie_a', 'IT', false, 4),
  (61, 'Ligue 1', 'France', 'https://media.api-sports.io/football/leagues/61.png', 2024, 'soccer_france_ligue_one', 'FR', false, 5)
ON CONFLICT (api_id) DO UPDATE SET
  odds_sport_key = EXCLUDED.odds_sport_key,
  country_code = EXCLUDED.country_code,
  display_order = EXCLUDED.display_order;

-- =====================================================
-- STEP 6: CREATE INDEXES FOR LEAGUE-BASED QUERIES
-- =====================================================
-- Teams by league
CREATE INDEX IF NOT EXISTS idx_teams_league ON teams(league_id);

-- Fixtures by league and date (for upcoming matches)
CREATE INDEX IF NOT EXISTS idx_fixtures_league_date ON fixtures(league_id, match_date);

-- Predictions by league
CREATE INDEX IF NOT EXISTS idx_predictions_league ON predictions(league_id);

-- Composite index for fixtures by league, status, and date
CREATE INDEX IF NOT EXISTS idx_fixtures_league_status_date ON fixtures(league_id, status, match_date);

-- =====================================================
-- STEP 7: CREATE HELPER FUNCTION FOR DEFAULT LEAGUE
-- =====================================================
CREATE OR REPLACE FUNCTION get_default_league_id()
RETURNS UUID AS $$
BEGIN
  RETURN (SELECT id FROM leagues WHERE api_id = 39 LIMIT 1);
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- STEP 8: ADD RLS POLICIES FOR NEW LEAGUE DATA
-- =====================================================
-- Ensure RLS policies allow access to league data
DROP POLICY IF EXISTS "Allow public read access for leagues config" ON leagues;
CREATE POLICY "Allow public read access for leagues config"
ON leagues FOR SELECT USING (true);

-- =====================================================
-- STEP 9: CREATE VIEW FOR ACTIVE LEAGUES
-- =====================================================
CREATE OR REPLACE VIEW active_leagues AS
SELECT
  id,
  api_id,
  name,
  country,
  logo,
  current_season,
  odds_sport_key,
  country_code,
  display_order,
  settings
FROM leagues
WHERE is_active = true
ORDER BY display_order ASC;

-- =====================================================
-- VERIFICATION QUERIES (Run manually to verify)
-- =====================================================
-- Check leagues: SELECT * FROM leagues ORDER BY display_order;
-- Check teams have league_id: SELECT COUNT(*) FROM teams WHERE league_id IS NOT NULL;
-- Check predictions have league_id: SELECT COUNT(*) FROM predictions WHERE league_id IS NOT NULL;
-- Check constraints: SELECT conname FROM pg_constraint WHERE conrelid = 'teams'::regclass;
