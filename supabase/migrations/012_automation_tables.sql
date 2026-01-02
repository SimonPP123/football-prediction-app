-- Migration: 012_automation_tables.sql
-- Description: Create tables for automation system (cron triggers, n8n webhooks, logging)

-- ============================================================================
-- Table: automation_logs
-- Description: Stores all automation trigger events and their results
-- ============================================================================
CREATE TABLE IF NOT EXISTS automation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Trigger info
  trigger_type TEXT NOT NULL,  -- 'pre-match', 'prediction', 'live', 'post-match', 'analysis', 'cron-check'
  cron_run_id UUID,            -- Groups all triggers from same cron run

  -- What was triggered
  league_id UUID REFERENCES leagues(id) ON DELETE SET NULL,
  fixture_ids UUID[],          -- Array of fixture IDs triggered
  fixture_count INTEGER DEFAULT 0,

  -- Webhook response
  webhook_url TEXT,
  webhook_status INTEGER,      -- HTTP status code (200, 500, etc.)
  webhook_response JSONB,      -- Full response from n8n
  webhook_duration_ms INTEGER, -- How long webhook took

  -- Result
  status TEXT NOT NULL,        -- 'success', 'error', 'skipped', 'no-action'
  message TEXT,
  error_message TEXT,

  -- Timing
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  -- Metadata
  details JSONB                -- Additional context (fixtures info, etc.)
);

-- Indexes for Activity page queries
CREATE INDEX IF NOT EXISTS idx_automation_logs_triggered_at ON automation_logs(triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_automation_logs_trigger_type ON automation_logs(trigger_type);
CREATE INDEX IF NOT EXISTS idx_automation_logs_status ON automation_logs(status);
CREATE INDEX IF NOT EXISTS idx_automation_logs_cron_run ON automation_logs(cron_run_id);
CREATE INDEX IF NOT EXISTS idx_automation_logs_league_id ON automation_logs(league_id);

-- Composite index for common Activity page queries
CREATE INDEX IF NOT EXISTS idx_automation_logs_type_date ON automation_logs(trigger_type, triggered_at DESC);

-- ============================================================================
-- Table: automation_config
-- Description: Stores automation configuration and settings
-- ============================================================================
CREATE TABLE IF NOT EXISTS automation_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Global settings
  is_enabled BOOLEAN DEFAULT true,
  last_cron_run TIMESTAMPTZ,
  last_cron_status TEXT,       -- 'success', 'error', 'running'

  -- Per-trigger settings
  pre_match_enabled BOOLEAN DEFAULT true,
  prediction_enabled BOOLEAN DEFAULT true,
  live_enabled BOOLEAN DEFAULT true,
  post_match_enabled BOOLEAN DEFAULT true,
  analysis_enabled BOOLEAN DEFAULT true,

  -- Timing settings (in minutes for pre-match/prediction, hours for post)
  pre_match_minutes_before INTEGER DEFAULT 30,
  prediction_minutes_before INTEGER DEFAULT 25,
  post_match_hours_after NUMERIC(4,2) DEFAULT 4,
  analysis_hours_after NUMERIC(4,2) DEFAULT 4.25,
  live_interval_minutes INTEGER DEFAULT 5,

  -- Webhook settings
  webhook_timeout_ms INTEGER DEFAULT 60000,
  retry_on_failure BOOLEAN DEFAULT true,
  max_retries INTEGER DEFAULT 3,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default config row (singleton pattern)
INSERT INTO automation_config (id)
SELECT gen_random_uuid()
WHERE NOT EXISTS (SELECT 1 FROM automation_config);

-- ============================================================================
-- Add is_active column to leagues table if not exists
-- Description: Allows enabling/disabling leagues for automation
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leagues' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE leagues ADD COLUMN is_active BOOLEAN DEFAULT true;
  END IF;
END $$;

-- Index for active leagues queries
CREATE INDEX IF NOT EXISTS idx_leagues_active ON leagues(is_active) WHERE is_active = true;

-- ============================================================================
-- RLS Policies for automation_logs
-- ============================================================================
ALTER TABLE automation_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read automation logs
CREATE POLICY "Allow read access for authenticated users"
  ON automation_logs FOR SELECT
  TO authenticated
  USING (true);

-- Allow service role to insert/update/delete
CREATE POLICY "Allow full access for service role"
  ON automation_logs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- RLS Policies for automation_config
-- ============================================================================
ALTER TABLE automation_config ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read config
CREATE POLICY "Allow read access for authenticated users"
  ON automation_config FOR SELECT
  TO authenticated
  USING (true);

-- Allow service role to update config
CREATE POLICY "Allow full access for service role"
  ON automation_config FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- Function to update updated_at timestamp
-- ============================================================================
CREATE OR REPLACE FUNCTION update_automation_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS trigger_automation_config_updated_at ON automation_config;
CREATE TRIGGER trigger_automation_config_updated_at
  BEFORE UPDATE ON automation_config
  FOR EACH ROW
  EXECUTE FUNCTION update_automation_config_updated_at();

-- ============================================================================
-- Comments for documentation
-- ============================================================================
COMMENT ON TABLE automation_logs IS 'Stores automation trigger events and webhook responses for monitoring in Activity page';
COMMENT ON TABLE automation_config IS 'Singleton table for automation configuration and settings';
COMMENT ON COLUMN automation_logs.trigger_type IS 'Type of trigger: pre-match, prediction, live, post-match, analysis, cron-check';
COMMENT ON COLUMN automation_logs.cron_run_id IS 'Groups all triggers from the same cron execution';
COMMENT ON COLUMN automation_logs.status IS 'Result status: success, error, skipped, no-action';
COMMENT ON COLUMN automation_config.is_enabled IS 'Master switch for automation system';
