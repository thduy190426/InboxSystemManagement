USE inbox_system_management;

ALTER TABLE call_logs
MODIFY COLUMN status ENUM('ringing', 'ongoing', 'missed', 'declined', 'completed', 'cancelled') NOT NULL;
