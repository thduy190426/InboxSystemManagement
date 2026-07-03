ALTER TABLE conversation_participants
  ADD COLUMN message_request_status ENUM('none', 'pending') NOT NULL DEFAULT 'none';
