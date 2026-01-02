-- =====================================================
-- ADDITIONAL INDEXES AND CONSTRAINTS
-- Audit fix: January 2026
-- Ensures proper indexes and constraints for performance
-- =====================================================

-- =====================================================
-- FIX: fixture_events unique constraint
-- The code upserts with (fixture_id, elapsed, type, player_name)
-- but the existing constraint used (fixture_id, event_time, event_type, player_name)
-- =====================================================

-- Drop the old constraint if it exists (uses wrong column names)
ALTER TABLE fixture_events DROP CONSTRAINT IF EXISTS fixture_events_unique;

-- Add constraint on the correct columns that match the code
DO $$ BEGIN
  ALTER TABLE fixture_events ADD CONSTRAINT fixture_events_unique
    UNIQUE (fixture_id, elapsed, type, player_name);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- COMPOSITE INDEXES FOR COMMON QUERY PATTERNS
-- =====================================================

-- Fixtures: Common query for league + date range
CREATE INDEX IF NOT EXISTS idx_fixtures_league_date
  ON fixtures(league_id, match_date DESC);

-- Fixtures: Common query for status + date (live matches, recent completed)
CREATE INDEX IF NOT EXISTS idx_fixtures_status_date
  ON fixtures(status, match_date DESC);

-- Teams: Lookup by league (for refresh operations)
CREATE INDEX IF NOT EXISTS idx_teams_league
  ON teams(league_id) WHERE league_id IS NOT NULL;

-- Standings: Full composite for common queries
CREATE INDEX IF NOT EXISTS idx_standings_league_season_rank
  ON standings(league_id, season, rank);

-- Predictions: Common query for league + date
CREATE INDEX IF NOT EXISTS idx_predictions_league_date
  ON predictions(league_id, created_at DESC);

-- Match analysis: Lookup for memory context by league
CREATE INDEX IF NOT EXISTS idx_match_analysis_league
  ON match_analysis(league_id);

-- =====================================================
-- PARTIAL INDEXES FOR SPECIFIC QUERIES
-- =====================================================

-- Fixtures: Upcoming matches (NS status)
CREATE INDEX IF NOT EXISTS idx_fixtures_upcoming
  ON fixtures(match_date)
  WHERE status = 'NS';

-- Fixtures: Live matches
CREATE INDEX IF NOT EXISTS idx_fixtures_live
  ON fixtures(match_date)
  WHERE status IN ('1H', '2H', 'HT', 'ET', 'BT', 'P');

-- Fixtures: Completed matches (for post-match processing)
CREATE INDEX IF NOT EXISTS idx_fixtures_completed
  ON fixtures(match_date DESC)
  WHERE status IN ('FT', 'AET', 'PEN');

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON INDEX idx_fixtures_league_date IS 'Optimizes fixture queries filtered by league with date ordering';
COMMENT ON INDEX idx_fixtures_status_date IS 'Optimizes queries for fixtures by status with date ordering';
COMMENT ON INDEX idx_standings_league_season_rank IS 'Optimizes standings queries for league tables';
COMMENT ON INDEX idx_fixtures_upcoming IS 'Partial index for upcoming (not started) fixtures';
COMMENT ON INDEX idx_fixtures_live IS 'Partial index for live/in-play fixtures';
COMMENT ON INDEX idx_fixtures_completed IS 'Partial index for completed fixtures';
