-- Create refresh_logs table for persistent activity history
-- This enables server-side logging of all data refresh operations

CREATE TABLE IF NOT EXISTS refresh_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'refresh',
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'pending')),
  message TEXT,
  details JSONB,
  league_id UUID REFERENCES leagues(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX idx_refresh_logs_created_at ON refresh_logs(created_at DESC);
CREATE INDEX idx_refresh_logs_category ON refresh_logs(category);
CREATE INDEX idx_refresh_logs_status ON refresh_logs(status);
CREATE INDEX idx_refresh_logs_league_id ON refresh_logs(league_id);

-- Composite index for filtered queries
CREATE INDEX idx_refresh_logs_category_created ON refresh_logs(category, created_at DESC);

-- Auto-cleanup function to keep only last 30 days of logs
CREATE OR REPLACE FUNCTION cleanup_old_refresh_logs()
RETURNS TRIGGER AS $$
BEGIN
  -- Only run cleanup occasionally (roughly every 100 inserts)
  IF random() < 0.01 THEN
    DELETE FROM refresh_logs WHERE created_at < NOW() - INTERVAL '30 days';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-cleanup
DROP TRIGGER IF EXISTS trigger_cleanup_refresh_logs ON refresh_logs;
CREATE TRIGGER trigger_cleanup_refresh_logs
  AFTER INSERT ON refresh_logs
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_old_refresh_logs();

-- Comment on table
COMMENT ON TABLE refresh_logs IS 'Persistent log of all data refresh operations for the Activity page';
