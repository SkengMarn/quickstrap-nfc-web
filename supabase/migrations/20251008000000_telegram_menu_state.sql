-- Create table for storing Telegram menu navigation state
CREATE TABLE IF NOT EXISTS telegram_menu_state (
  user_id BIGINT PRIMARY KEY,
  current_menu TEXT NOT NULL,
  previous_menu TEXT,
  context JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_telegram_menu_state_updated
  ON telegram_menu_state(updated_at);

-- Add comment
COMMENT ON TABLE telegram_menu_state IS 'Stores the current menu navigation state for each Telegram user';
