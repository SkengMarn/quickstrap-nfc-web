-- Create tables for Telegram bot authentication

-- Table for login sessions (temporary state during login)
CREATE TABLE IF NOT EXISTS telegram_login_sessions (
  user_id BIGINT PRIMARY KEY,
  step TEXT NOT NULL CHECK (step IN ('email', 'password')),
  email TEXT,
  attempts INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for authenticated sessions
CREATE TABLE IF NOT EXISTS telegram_auth_sessions (
  user_id BIGINT PRIMARY KEY,
  email TEXT NOT NULL,
  session_expiry TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_telegram_login_sessions_updated
  ON telegram_login_sessions(updated_at);

CREATE INDEX IF NOT EXISTS idx_telegram_auth_sessions_expiry
  ON telegram_auth_sessions(session_expiry);

-- Auto-cleanup old login sessions (older than 10 minutes)
CREATE OR REPLACE FUNCTION cleanup_telegram_login_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM telegram_login_sessions
  WHERE updated_at < NOW() - INTERVAL '10 minutes';
END;
$$ LANGUAGE plpgsql;

-- Auto-cleanup expired auth sessions
CREATE OR REPLACE FUNCTION cleanup_telegram_auth_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM telegram_auth_sessions
  WHERE session_expiry < NOW();
END;
$$ LANGUAGE plpgsql;

-- Optional: Set up periodic cleanup (uncomment if using pg_cron)
-- SELECT cron.schedule('cleanup-telegram-sessions', '*/5 * * * *',
--   'SELECT cleanup_telegram_login_sessions(); SELECT cleanup_telegram_auth_sessions();'
-- );

COMMENT ON TABLE telegram_login_sessions IS 'Temporary storage for Telegram bot login flow state';
COMMENT ON TABLE telegram_auth_sessions IS 'Active authenticated sessions for Telegram bot users';
