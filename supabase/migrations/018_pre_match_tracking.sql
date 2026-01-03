-- Migration: 018_pre_match_tracking.sql
-- Description: Add tracking columns for pre-match and post-match deduplication
-- This prevents the same fixture from being triggered multiple times

-- Add tracking column for pre-match triggers
ALTER TABLE fixtures ADD COLUMN IF NOT EXISTS pre_match_triggered_at TIMESTAMPTZ;

-- Add tracking column for post-match triggers
ALTER TABLE fixtures ADD COLUMN IF NOT EXISTS post_match_triggered_at TIMESTAMPTZ;

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_fixtures_pre_match_triggered
  ON fixtures(pre_match_triggered_at)
  WHERE pre_match_triggered_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_fixtures_post_match_triggered
  ON fixtures(post_match_triggered_at)
  WHERE post_match_triggered_at IS NOT NULL;

-- Comments for documentation
COMMENT ON COLUMN fixtures.pre_match_triggered_at IS
  'Timestamp when pre-match refresh was triggered. Used to prevent duplicate triggers within the same day.';

COMMENT ON COLUMN fixtures.post_match_triggered_at IS
  'Timestamp when post-match refresh was triggered. Used to prevent duplicate triggers within the same day.';
