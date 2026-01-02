-- Migration: Add custom prediction prompt to automation_config
-- This allows storing custom AI prompts in the database instead of localStorage

ALTER TABLE automation_config
ADD COLUMN IF NOT EXISTS custom_prediction_prompt TEXT;

-- Add comment explaining the column
COMMENT ON COLUMN automation_config.custom_prediction_prompt IS 'Custom factor analysis prompt for AI predictions. If NULL, uses default prompt.';
