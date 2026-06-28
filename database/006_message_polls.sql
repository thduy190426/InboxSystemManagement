USE inbox_system_management;

ALTER TABLE messages
  MODIFY type ENUM('text', 'image', 'file', 'audio', 'video', 'system', 'poll') NOT NULL DEFAULT 'text';

CREATE TABLE IF NOT EXISTS message_polls (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  message_id BIGINT UNSIGNED NOT NULL,
  question VARCHAR(255) NOT NULL,
  allow_multiple TINYINT(1) NOT NULL DEFAULT 0,
  is_closed TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_message_polls_message (message_id),
  CONSTRAINT fk_message_polls_message
    FOREIGN KEY (message_id) REFERENCES messages (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS message_poll_options (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  poll_id BIGINT UNSIGNED NOT NULL,
  option_text VARCHAR(120) NOT NULL,
  position INT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_message_poll_options_poll (poll_id, position),
  CONSTRAINT fk_message_poll_options_poll
    FOREIGN KEY (poll_id) REFERENCES message_polls (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS message_poll_votes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  option_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_message_poll_votes_option_user (option_id, user_id),
  KEY idx_message_poll_votes_user (user_id, created_at),
  CONSTRAINT fk_message_poll_votes_option
    FOREIGN KEY (option_id) REFERENCES message_poll_options (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_message_poll_votes_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
