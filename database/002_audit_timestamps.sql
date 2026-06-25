USE inbox_system_management;

SET NAMES utf8mb4;
SET time_zone = '+00:00';

DROP PROCEDURE IF EXISTS rename_seen_at_to_read_at;
DROP PROCEDURE IF EXISTS add_index_if_missing;
DROP PROCEDURE IF EXISTS add_column_if_missing;

DELIMITER $$

CREATE PROCEDURE add_column_if_missing(
  IN table_name_value VARCHAR(64),
  IN column_name_value VARCHAR(64),
  IN column_definition_value TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = table_name_value
      AND COLUMN_NAME = column_name_value
  ) THEN
    SET @ddl = CONCAT('ALTER TABLE `', table_name_value, '` ADD COLUMN ', column_definition_value);
    PREPARE statement FROM @ddl;
    EXECUTE statement;
    DEALLOCATE PREPARE statement;
  END IF;
END$$

CREATE PROCEDURE add_index_if_missing(
  IN table_name_value VARCHAR(64),
  IN index_name_value VARCHAR(64),
  IN index_definition_value TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = table_name_value
      AND INDEX_NAME = index_name_value
  ) THEN
    SET @ddl = CONCAT('ALTER TABLE `', table_name_value, '` ADD ', index_definition_value);
    PREPARE statement FROM @ddl;
    EXECUTE statement;
    DEALLOCATE PREPARE statement;
  END IF;
END$$

CREATE PROCEDURE rename_seen_at_to_read_at()
BEGIN
  IF EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'message_receipts'
      AND COLUMN_NAME = 'seen_at'
  ) AND NOT EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'message_receipts'
      AND COLUMN_NAME = 'read_at'
  ) THEN
    ALTER TABLE message_receipts CHANGE COLUMN seen_at read_at DATETIME NULL;
  END IF;
END$$

DELIMITER ;

CALL add_column_if_missing('user_sessions', 'updated_at', 'updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at');
CALL add_column_if_missing('password_reset_tokens', 'updated_at', 'updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at');
CALL add_column_if_missing('conversation_participants', 'created_at', 'created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER last_read_at');
CALL add_column_if_missing('conversation_participants', 'updated_at', 'updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at');
CALL add_column_if_missing('message_attachments', 'updated_at', 'updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at');

CALL rename_seen_at_to_read_at();
CALL add_column_if_missing('message_receipts', 'read_at', 'read_at DATETIME NULL AFTER delivered_at');
CALL add_column_if_missing('message_receipts', 'updated_at', 'updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at');
CALL add_index_if_missing('message_receipts', 'idx_message_receipts_read_at', 'KEY idx_message_receipts_read_at (read_at)');

CALL add_column_if_missing('message_reactions', 'updated_at', 'updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at');
CALL add_column_if_missing('notifications', 'updated_at', 'updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at');
CALL add_column_if_missing('call_logs', 'created_at', 'created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER duration_seconds');
CALL add_column_if_missing('call_logs', 'updated_at', 'updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at');
CALL add_column_if_missing('call_participants', 'created_at', 'created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER left_at');
CALL add_column_if_missing('call_participants', 'updated_at', 'updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at');

DROP PROCEDURE rename_seen_at_to_read_at;
DROP PROCEDURE add_index_if_missing;
DROP PROCEDURE add_column_if_missing;
