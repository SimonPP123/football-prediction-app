-- Migration: 019_prediction_source.sql
-- Description: Add source column to track manual vs automated predictions

-- Add source column to predictions table
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';

-- Add check constraint for valid values
ALTER TABLE predictions ADD CONSTRAINT predictions_source_check
  CHECK (source IN ('manual', 'automation'));

-- Update existing predictions to 'manual' (they were created before automation)
UPDATE predictions SET source = 'manual' WHERE source IS NULL;

-- Add index for efficient queries
CREATE INDEX IF NOT EXISTS idx_predictions_source ON predictions(source);

-- Add same column to prediction_history for tracking
ALTER TABLE prediction_history ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';

-- Add source column to match_analysis table
ALTER TABLE match_analysis ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';

-- Add check constraint for valid values on match_analysis
ALTER TABLE match_analysis ADD CONSTRAINT match_analysis_source_check
  CHECK (source IN ('manual', 'automation'));

-- Update existing analyses to 'manual'
UPDATE match_analysis SET source = 'manual' WHERE source IS NULL;

-- Add index for efficient queries on match_analysis
CREATE INDEX IF NOT EXISTS idx_match_analysis_source ON match_analysis(source);

-- Comments for documentation
COMMENT ON COLUMN predictions.source IS
  'Source of prediction: manual (user-triggered) or automation (cron-triggered)';

COMMENT ON COLUMN match_analysis.source IS
  'Source of analysis: manual (user-triggered) or automation (cron-triggered)';
