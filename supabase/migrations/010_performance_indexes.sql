-- =====================================================
-- PERFORMANCE INDEXES
-- Adds missing indexes for query optimization
-- =====================================================

-- Composite index for fixtures - heavily used for upcoming/completed fixture queries
CREATE INDEX IF NOT EXISTS idx_fixtures_league_status_date
  ON fixtures(league_id, status, match_date);

-- Index for team season stats by league
CREATE INDEX IF NOT EXISTS idx_team_season_stats_league
  ON team_season_stats(league_id);

-- Index for injuries by team (for injury lookups during prediction)
CREATE INDEX IF NOT EXISTS idx_injuries_team
  ON injuries(team_id);

-- Index for odds by fixture and bet type (for odds lookups)
CREATE INDEX IF NOT EXISTS idx_odds_fixture_bettype
  ON odds(fixture_id, bet_type);

-- Index for predictions by league (for filtered predictions queries)
CREATE INDEX IF NOT EXISTS idx_predictions_league
  ON predictions(league_id);

-- Index for prediction_history by fixture (for history lookups)
CREATE INDEX IF NOT EXISTS idx_prediction_history_fixture
  ON prediction_history(fixture_id);

-- Index for match_analysis by fixture (already exists as unique, but adding for clarity)
-- Note: This might already exist from the unique constraint
CREATE INDEX IF NOT EXISTS idx_match_analysis_fixture
  ON match_analysis(fixture_id);

-- Index for match_analysis by team IDs (for memory context queries)
CREATE INDEX IF NOT EXISTS idx_match_analysis_home_team
  ON match_analysis(home_team_id);

CREATE INDEX IF NOT EXISTS idx_match_analysis_away_team
  ON match_analysis(away_team_id);

-- Index for fixture_statistics by fixture
CREATE INDEX IF NOT EXISTS idx_fixture_statistics_fixture
  ON fixture_statistics(fixture_id);

-- Index for fixture_events by fixture
CREATE INDEX IF NOT EXISTS idx_fixture_events_fixture
  ON fixture_events(fixture_id);

-- Comments for documentation
COMMENT ON INDEX idx_fixtures_league_status_date IS 'Optimizes queries for upcoming/completed fixtures filtered by league';
COMMENT ON INDEX idx_team_season_stats_league IS 'Optimizes team stats queries filtered by league';
COMMENT ON INDEX idx_odds_fixture_bettype IS 'Optimizes odds lookups for specific fixtures and bet types';
COMMENT ON INDEX idx_predictions_league IS 'Optimizes prediction queries filtered by league';
COMMENT ON INDEX idx_prediction_history_fixture IS 'Optimizes prediction history lookups';
COMMENT ON INDEX idx_match_analysis_home_team IS 'Optimizes memory context queries for home team analyses';
COMMENT ON INDEX idx_match_analysis_away_team IS 'Optimizes memory context queries for away team analyses';
