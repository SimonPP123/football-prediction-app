-- Migration: 020_fixture_elapsed.sql
-- Description: Add elapsed (match minute) column for live matches

-- Add elapsed column to fixtures table
ALTER TABLE fixtures ADD COLUMN IF NOT EXISTS elapsed INTEGER;

-- Comment for documentation
COMMENT ON COLUMN fixtures.elapsed IS
  'Current match minute for live matches. NULL for scheduled/finished matches.';
