-- =====================================================
-- PREDICTION SYSTEM FIXES
-- Fixes orphaned predictions, adds prediction tracking for analysis
-- =====================================================

-- 1. Add CASCADE DELETE to predictions table (to prevent orphaned predictions)
-- First drop the existing constraint, then recreate with CASCADE
ALTER TABLE predictions DROP CONSTRAINT IF EXISTS predictions_fixture_id_fkey;
ALTER TABLE predictions ADD CONSTRAINT predictions_fixture_id_fkey
  FOREIGN KEY (fixture_id) REFERENCES fixtures(id) ON DELETE CASCADE;

-- 2. Add analyzed_prediction_history_id to match_analysis
-- This tracks which specific prediction from history was used for the analysis
ALTER TABLE match_analysis ADD COLUMN IF NOT EXISTS analyzed_prediction_history_id UUID REFERENCES prediction_history(id) ON DELETE SET NULL;

-- 3. Add composite index for faster history lookups (fixture + timestamp)
CREATE INDEX IF NOT EXISTS idx_prediction_history_fixture_created
  ON prediction_history(fixture_id, created_at DESC);

-- 4. Add index on match_analysis for analyzed_prediction_history_id lookups
CREATE INDEX IF NOT EXISTS idx_match_analysis_prediction_history
  ON match_analysis(analyzed_prediction_history_id);

-- Comments for documentation
COMMENT ON COLUMN match_analysis.analyzed_prediction_history_id IS 'References the specific prediction_history record that was used for this analysis. NULL if using current prediction.';
