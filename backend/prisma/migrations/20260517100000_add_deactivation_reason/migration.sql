-- Add deactivation tracking columns to users table
ALTER TABLE `users`
  ADD COLUMN `deactivated_at` DATETIME(3) NULL,
  ADD COLUMN `deactivation_reason` VARCHAR(500) NULL;
