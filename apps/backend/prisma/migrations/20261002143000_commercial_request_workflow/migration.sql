-- Campos operacionais opcionais. A migração não altera solicitações nem produtos existentes.
ALTER TABLE `catalog2_commercial_requests`
  ADD COLUMN `internal_note` TEXT NULL,
  ADD COLUMN `assigned_to_user_id` VARCHAR(191) NULL,
  ADD COLUMN `proposed_price` DOUBLE NULL,
  ADD COLUMN `proposed_deadline_days` DOUBLE NULL,
  ADD COLUMN `proposal_valid_until` DATETIME(3) NULL,
  ADD COLUMN `client_response_note` TEXT NULL,
  ADD COLUMN `converted_project_id` VARCHAR(191) NULL,
  ADD COLUMN `history_json` LONGTEXT NULL;

CREATE INDEX `catalog2_commercial_requests_assigned_to_user_id_idx`
  ON `catalog2_commercial_requests`(`assigned_to_user_id`);
