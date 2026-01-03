-- Migration: 018_pre_match_tracking.sql
-- Description: Add pre_match_triggered_at column for pre-match deduplication
-- This prevents the same fixture from being triggered multiple times within the pre-match window

-- Add tracking column for pre-match triggers
ALTER TABLE fixtures ADD COLUMN IF NOT EXISTS pre_match_triggered_at TIMESTAMPTZ;

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_fixtures_pre_match_triggered
  ON fixtures(pre_match_triggered_at)
  WHERE pre_match_triggered_at IS NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN fixtures.pre_match_triggered_at IS
  'Timestamp when pre-match refresh was triggered. Used to prevent duplicate triggers within the same day.';
