-- Resolução formal de alerta crítico (ata 2026-08, 10º lote). Campos NOVOS
-- e distintos de resolved_at/resolution_reason (motor automático,
-- inalterados) — evita conflito de semântica com expiração/regra.
ALTER TABLE `system_alerts`
  ADD COLUMN `manual_resolved_at` DATETIME(3) NULL,
  ADD COLUMN `resolved_by_user_id` VARCHAR(191) NULL,
  ADD COLUMN `resolution_action` VARCHAR(191) NULL,
  ADD COLUMN `resolution_description` TEXT NULL,
  ADD COLUMN `resolution_client_action_id` VARCHAR(191) NULL;

CREATE UNIQUE INDEX `system_alerts_resolution_client_action_id_key` ON `system_alerts`(`resolution_client_action_id`);
