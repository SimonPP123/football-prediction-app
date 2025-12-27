-- =====================================================
-- MATCH ANALYSIS
-- Post-match analysis with prediction accuracy tracking
-- =====================================================

CREATE TABLE IF NOT EXISTS match_analysis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Core References
  fixture_id UUID REFERENCES fixtures(id) ON DELETE CASCADE NOT NULL UNIQUE,
  home_team_id UUID REFERENCES teams(id) NOT NULL,
  away_team_id UUID REFERENCES teams(id) NOT NULL,

  -- Prediction Accuracy
  predicted_result VARCHAR(5),  -- '1', 'X', '2' from prediction
  actual_result VARCHAR(5),     -- '1', 'X', '2' calculated from goals
  prediction_correct BOOLEAN,

  predicted_score VARCHAR(10),  -- e.g., "2-1"
  actual_score VARCHAR(10),     -- e.g., "2-1"
  score_correct BOOLEAN,

  predicted_over_under VARCHAR(10),  -- 'Over' or 'Under'
  actual_over_under VARCHAR(10),
  over_under_correct BOOLEAN,

  predicted_btts VARCHAR(5),    -- 'Yes' or 'No'
  actual_btts VARCHAR(5),
  btts_correct BOOLEAN,

  overall_index INTEGER,        -- From original prediction (1-100)
  confidence_pct INTEGER,       -- From original prediction

  -- Accuracy Metrics
  accuracy_score DECIMAL(5,2),  -- Overall accuracy percentage (0-100)

  -- Factor Performance Analysis
  factors JSONB,                -- Copy of original prediction factors (A-F breakdown)
  factor_accuracy JSONB,        -- Analysis of which factors were accurate

  -- Team Performance Insights
  home_team_performance JSONB,  -- xG, possession, shots, key events
  away_team_performance JSONB,

  -- AI Analysis
  post_match_analysis TEXT,     -- AI-generated narrative analysis
  key_insights JSONB,           -- Array of key insights
  learning_points JSONB,        -- Array of lessons for future predictions
  surprises JSONB,              -- Array of unexpected outcomes

  -- Model Info
  model_version VARCHAR(100),   -- AI model used for analysis
  analysis_type VARCHAR(50) DEFAULT 'post_match',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_match_analysis_fixture ON match_analysis(fixture_id);
CREATE INDEX IF NOT EXISTS idx_match_analysis_teams ON match_analysis(home_team_id, away_team_id);
CREATE INDEX IF NOT EXISTS idx_match_analysis_created ON match_analysis(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_match_analysis_accuracy ON match_analysis(prediction_correct);

-- Enable RLS
ALTER TABLE match_analysis ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access" ON match_analysis FOR SELECT USING (true);

-- Allow service role full access
CREATE POLICY "Allow service role full access" ON match_analysis FOR ALL USING (
  auth.role() = 'service_role'
);

-- Comments
COMMENT ON TABLE match_analysis IS 'Post-match analysis comparing predictions to actual results with AI insights';
COMMENT ON COLUMN match_analysis.fixture_id IS 'Reference to the fixture that was analyzed';
COMMENT ON COLUMN match_analysis.factor_accuracy IS 'Analysis of which prediction factors (A-F) were accurate';
COMMENT ON COLUMN match_analysis.learning_points IS 'Insights to inject into future prediction contexts';
COMMENT ON COLUMN match_analysis.accuracy_score IS 'Overall accuracy percentage (0-100) calculated from all metrics';
