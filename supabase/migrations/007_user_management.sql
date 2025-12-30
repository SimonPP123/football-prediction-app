-- =====================================================
-- USER MANAGEMENT SYSTEM
-- Adds users table and activity logging for authentication
-- =====================================================

-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_login TIMESTAMPTZ,
  created_by UUID REFERENCES users(id)
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Only service role can access users table (sensitive data)
CREATE POLICY "Service role full access on users" ON users
  FOR ALL USING (auth.role() = 'service_role');

-- Index for fast username lookup
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Insert initial admin user (credentials managed separately)
INSERT INTO users (username, password_hash, is_admin, is_active)
VALUES ('predictme', '$2b$10$utOOaN6s2rdBXD/Fnfq1GO2z/uzaT.nWx9M8ibTUPtgFLJhWWMO12', true, true)
ON CONFLICT (username) DO NOTHING;

-- Activity log for audit trail
CREATE TABLE IF NOT EXISTS user_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on activity log
ALTER TABLE user_activity_log ENABLE ROW LEVEL SECURITY;

-- Only service role can access activity log
CREATE POLICY "Service role full access on user_activity_log" ON user_activity_log
  FOR ALL USING (auth.role() = 'service_role');

-- Index for activity log queries
CREATE INDEX IF NOT EXISTS idx_user_activity_user ON user_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_created ON user_activity_log(created_at DESC);

-- Comments for documentation
COMMENT ON TABLE users IS 'User accounts for authentication and authorization';
COMMENT ON COLUMN users.password_hash IS 'Bcrypt hashed password (cost factor 10)';
COMMENT ON COLUMN users.is_admin IS 'Admin users can access /admin and manage other users';
COMMENT ON COLUMN users.is_active IS 'Inactive users cannot log in';
COMMENT ON COLUMN users.created_by IS 'Reference to admin who created this user';

COMMENT ON TABLE user_activity_log IS 'Audit trail for user actions';
COMMENT ON COLUMN user_activity_log.action IS 'Action type: login, logout, create_user, update_user, delete_user';
