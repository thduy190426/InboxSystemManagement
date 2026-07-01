CREATE TABLE IF NOT EXISTS message_reports (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  public_id CHAR(36) NOT NULL,
  message_id BIGINT UNSIGNED NOT NULL,
  conversation_id BIGINT UNSIGNED NOT NULL,
  reporter_id BIGINT UNSIGNED NOT NULL,
  reported_user_id BIGINT UNSIGNED NOT NULL,
  reason VARCHAR(255) NULL,
  status ENUM('pending', 'reviewed', 'dismissed') NOT NULL DEFAULT 'pending',
  reviewed_by BIGINT UNSIGNED NULL,
  reviewed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_message_reports_public_id (public_id),
  UNIQUE KEY uq_message_reports_message_reporter (message_id, reporter_id),
  KEY idx_message_reports_status_created (status, created_at),
  KEY idx_message_reports_reporter (reporter_id, created_at),
  KEY idx_message_reports_reported_user (reported_user_id, created_at),
  CONSTRAINT fk_message_reports_message
    FOREIGN KEY (message_id) REFERENCES messages (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_message_reports_conversation
    FOREIGN KEY (conversation_id) REFERENCES conversations (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_message_reports_reporter
    FOREIGN KEY (reporter_id) REFERENCES users (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_message_reports_reported_user
    FOREIGN KEY (reported_user_id) REFERENCES users (id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_message_reports_reviewed_by
    FOREIGN KEY (reviewed_by) REFERENCES users (id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
