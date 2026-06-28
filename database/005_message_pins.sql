USE inbox_system_management;

CREATE TABLE IF NOT EXISTS message_pins (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  message_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  conversation_id BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY unique_message_pin (message_id, user_id),
  KEY idx_message_pins_user (user_id, created_at),
  KEY idx_message_pins_conversation (conversation_id, created_at),
  CONSTRAINT fk_message_pins_message
    FOREIGN KEY (message_id) REFERENCES messages (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_message_pins_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_message_pins_conversation
    FOREIGN KEY (conversation_id) REFERENCES conversations (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
