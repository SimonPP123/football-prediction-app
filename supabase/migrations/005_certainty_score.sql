-- =====================================================
-- CERTAINTY SCORE METRIC
-- Adds AI independent certainty assessment for predictions
-- =====================================================

-- Add certainty_score to predictions table
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS certainty_score INTEGER;

-- Add certainty_score to prediction_history table
ALTER TABLE prediction_history ADD COLUMN IF NOT EXISTS certainty_score INTEGER;

-- Add comments for documentation
COMMENT ON COLUMN predictions.certainty_score IS 'AI independent assessment of certainty in predicted outcome (1-100%). Based on data quality, factor alignment, and match uncertainty.';
COMMENT ON COLUMN prediction_history.certainty_score IS 'AI independent assessment of certainty in predicted outcome (1-100%). Based on data quality, factor alignment, and match uncertainty.';
