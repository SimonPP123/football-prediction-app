-- Migration 009: Add league_id to match_analysis and prediction_history for efficient league-based filtering

-- Add league_id column to match_analysis table
ALTER TABLE match_analysis ADD COLUMN IF NOT EXISTS league_id UUID REFERENCES leagues(id);

-- Create index for efficient league-based queries
CREATE INDEX IF NOT EXISTS idx_match_analysis_league_id ON match_analysis(league_id);

-- Backfill existing match_analysis records with league_id from their fixtures
UPDATE match_analysis ma
SET league_id = f.league_id
FROM fixtures f
WHERE ma.fixture_id = f.id AND ma.league_id IS NULL;

-- Add league_id column to prediction_history table
ALTER TABLE prediction_history ADD COLUMN IF NOT EXISTS league_id UUID REFERENCES leagues(id);

-- Create index for efficient league-based queries on prediction_history
CREATE INDEX IF NOT EXISTS idx_prediction_history_league_id ON prediction_history(league_id);

-- Backfill existing prediction_history records with league_id from their fixtures
UPDATE prediction_history ph
SET league_id = f.league_id
FROM predictions p
JOIN fixtures f ON p.fixture_id = f.id
WHERE ph.fixture_id = p.fixture_id AND ph.league_id IS NULL;

-- Alternative backfill directly from fixtures if prediction_history has fixture_id
UPDATE prediction_history ph
SET league_id = f.league_id
FROM fixtures f
WHERE ph.fixture_id = f.id AND ph.league_id IS NULL;
