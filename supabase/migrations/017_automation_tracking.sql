-- Migration: 017_automation_tracking.sql
-- Description: Add tracking columns for automation triggers and retry logic
-- This enables the automation system to track when predictions/analyses were triggered
-- and automatically retry failed generations after a buffer period.

-- ============================================================================
-- Add tracking columns to fixtures table
-- ============================================================================

-- Track when prediction generation was last triggered for this fixture
-- Used to prevent duplicate triggers and enable retry after buffer period
ALTER TABLE fixtures ADD COLUMN IF NOT EXISTS prediction_triggered_at TIMESTAMPTZ;

-- Track when post-match analysis was last triggered for this fixture
-- Same logic as prediction_triggered_at
ALTER TABLE fixtures ADD COLUMN IF NOT EXISTS analysis_triggered_at TIMESTAMPTZ;

-- ============================================================================
-- Indexes for efficient queries on tracking columns
-- ============================================================================

-- Partial index for prediction triggers (only non-null values)
CREATE INDEX IF NOT EXISTS idx_fixtures_prediction_triggered
  ON fixtures(prediction_triggered_at)
  WHERE prediction_triggered_at IS NOT NULL;

-- Partial index for analysis triggers (only non-null values)
CREATE INDEX IF NOT EXISTS idx_fixtures_analysis_triggered
  ON fixtures(analysis_triggered_at)
  WHERE analysis_triggered_at IS NOT NULL;

-- Composite index for prediction window queries (status + match_date + triggered_at)
-- Used by queryPredictionFixtures() to efficiently find fixtures needing predictions
CREATE INDEX IF NOT EXISTS idx_fixtures_prediction_window
  ON fixtures(status, match_date, prediction_triggered_at)
  WHERE status = 'NS';

-- Composite index for analysis window queries
-- Used by queryAnalysisFixtures() to efficiently find fixtures needing analysis
CREATE INDEX IF NOT EXISTS idx_fixtures_analysis_window
  ON fixtures(status, match_date, analysis_triggered_at)
  WHERE status = 'FT';

-- ============================================================================
-- Add comments for documentation
-- ============================================================================

COMMENT ON COLUMN fixtures.prediction_triggered_at IS
  'Timestamp when prediction generation was last triggered. Used for retry logic - if triggered >7 min ago but no prediction exists, fixture will be retried.';

COMMENT ON COLUMN fixtures.analysis_triggered_at IS
  'Timestamp when post-match analysis was last triggered. Same retry logic as predictions.';
