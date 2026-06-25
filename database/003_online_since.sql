USE inbox_system_management;

SET NAMES utf8mb4;
SET time_zone = '+00:00';

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS online_since DATETIME NULL AFTER last_seen_at;
