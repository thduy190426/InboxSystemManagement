ALTER TABLE users
  ADD COLUMN IF NOT EXISTS show_activity_status TINYINT(1) NOT NULL DEFAULT 1 AFTER online_since;
