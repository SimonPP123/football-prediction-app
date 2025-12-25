-- =====================================================
-- PREDICTION ENHANCEMENTS
-- Adds score predictions, model selection, and history
-- =====================================================

-- Add new columns to predictions table
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS score_predictions JSONB;
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS most_likely_score VARCHAR(10);
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS model_used VARCHAR(100) DEFAULT 'gpt-4o';

-- Add additional prediction data columns if they don't exist
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS home_win_pct INTEGER;
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS draw_pct INTEGER;
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS away_win_pct INTEGER;
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS over_under_2_5 VARCHAR(10);
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS btts VARCHAR(5);
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS value_bet TEXT;
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS confidence_pct INTEGER;

-- Create prediction history table for versioning
CREATE TABLE IF NOT EXISTS prediction_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fixture_id UUID REFERENCES fixtures(id) ON DELETE CASCADE,
  model_used VARCHAR(100),
  prediction_result VARCHAR(5),
  overall_index INTEGER,
  factors JSONB,
  score_predictions JSONB,
  most_likely_score VARCHAR(10),
  analysis_text TEXT,
  key_factors JSONB,
  risk_factors JSONB,
  home_win_pct INTEGER,
  draw_pct INTEGER,
  away_win_pct INTEGER,
  over_under_2_5 VARCHAR(10),
  btts VARCHAR(5),
  value_bet TEXT,
  confidence_pct INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_prediction_history_fixture ON prediction_history(fixture_id);
CREATE INDEX IF NOT EXISTS idx_prediction_history_created ON prediction_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prediction_history_model ON prediction_history(model_used);

-- Add comment to table
COMMENT ON TABLE prediction_history IS 'Stores previous versions of predictions for a fixture, enabling regeneration history tracking';
