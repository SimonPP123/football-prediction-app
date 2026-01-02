-- Migration: Password Reset Tokens and Session Management
-- Date: January 2026
-- Purpose: Add password reset flow and session invalidation

-- ============================================
-- PART 1: Password Reset Tokens
-- ============================================

-- Create password reset tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,  -- bcrypt hash of the token (not stored in plaintext)
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,  -- NULL if not used, timestamp when used
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES users(id)  -- Admin who generated the token (if admin reset)
);

-- Index for fast lookups by user
CREATE INDEX IF NOT EXISTS idx_password_reset_user_id ON password_reset_tokens(user_id);

-- Index for cleanup of expired tokens
CREATE INDEX IF NOT EXISTS idx_password_reset_expires ON password_reset_tokens(expires_at);

-- Enable RLS - service role only (tokens should never be exposed to clients)
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Only service role can access this table
CREATE POLICY "Service role only for password_reset_tokens"
  ON password_reset_tokens
  FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- PART 2: Session Version for Invalidation
-- ============================================

-- Add session_version column to users table
-- When incremented, all existing sessions for that user become invalid
ALTER TABLE users ADD COLUMN IF NOT EXISTS session_version INTEGER DEFAULT 1;

-- Comment for documentation
COMMENT ON COLUMN users.session_version IS 'Increment to invalidate all active sessions for this user';
COMMENT ON TABLE password_reset_tokens IS 'Stores bcrypt hashes of password reset tokens with expiration';

-- ============================================
-- PART 3: Cleanup Function
-- ============================================

-- Function to clean up expired tokens (can be called by cron)
CREATE OR REPLACE FUNCTION cleanup_expired_password_tokens()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM password_reset_tokens
  WHERE expires_at < now()
  RETURNING * INTO deleted_count;

  RETURN COALESCE(deleted_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
