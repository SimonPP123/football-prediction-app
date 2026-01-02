-- Migration: Add webhook URL configuration to automation_config
-- This allows webhook URLs to be configured from the UI instead of hardcoded env vars

-- Add webhook URL columns to automation_config table
ALTER TABLE automation_config ADD COLUMN IF NOT EXISTS prediction_webhook_url TEXT;
ALTER TABLE automation_config ADD COLUMN IF NOT EXISTS analysis_webhook_url TEXT;
ALTER TABLE automation_config ADD COLUMN IF NOT EXISTS pre_match_webhook_url TEXT;
ALTER TABLE automation_config ADD COLUMN IF NOT EXISTS live_webhook_url TEXT;
ALTER TABLE automation_config ADD COLUMN IF NOT EXISTS post_match_webhook_url TEXT;
ALTER TABLE automation_config ADD COLUMN IF NOT EXISTS webhook_secret TEXT;

-- Add comments for documentation
COMMENT ON COLUMN automation_config.prediction_webhook_url IS 'n8n webhook URL for AI prediction generation';
COMMENT ON COLUMN automation_config.analysis_webhook_url IS 'n8n webhook URL for post-match AI analysis';
COMMENT ON COLUMN automation_config.pre_match_webhook_url IS 'n8n webhook URL for pre-match data refresh';
COMMENT ON COLUMN automation_config.live_webhook_url IS 'n8n webhook URL for live match data refresh';
COMMENT ON COLUMN automation_config.post_match_webhook_url IS 'n8n webhook URL for post-match data refresh';
COMMENT ON COLUMN automation_config.webhook_secret IS 'Shared secret for X-Webhook-Secret header authentication';
