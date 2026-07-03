ALTER TABLE users
  ADD COLUMN handle VARCHAR(32) NULL AFTER display_name,
  ADD UNIQUE KEY uq_users_handle (handle);
