-- Imagem opcional, Alertas Programados e expiração de ocorrência (ata
-- 2026-08, 4º lote). Todas as colunas novas são opcionais — nenhum registro
-- existente é afetado.

ALTER TABLE `alert_standards`
  ADD COLUMN `image_file_name` VARCHAR(191) NULL,
  ADD COLUMN `image_alt` VARCHAR(191) NULL;

CREATE TABLE `alert_schedules` (
  `id`                         VARCHAR(191) NOT NULL,
  `name`                       VARCHAR(191) NOT NULL,
  `title`                      VARCHAR(191) NOT NULL,
  `message`                    LONGTEXT     NOT NULL,
  `severity`                   VARCHAR(191) NOT NULL DEFAULT 'warning',
  `image_file_name`            VARCHAR(191) NULL,
  `image_alt`                  VARCHAR(191) NULL,
  `user_id`                    VARCHAR(191) NULL,
  `recurrence_type`            VARCHAR(191) NOT NULL,
  `weekdays_json`              LONGTEXT     NULL,
  `time_of_day`                VARCHAR(191) NOT NULL,
  `timezone`                   VARCHAR(191) NOT NULL DEFAULT 'America/Sao_Paulo',
  `starts_at`                  DATETIME(3)  NOT NULL,
  `ends_at`                    DATETIME(3)  NULL,
  `occurrence_expires_minutes` INT          NULL,
  `is_active`                  BOOLEAN      NOT NULL DEFAULT true,
  `is_archived`                BOOLEAN      NOT NULL DEFAULT false,
  `archived_at`                DATETIME(3)  NULL,
  `last_run_at`                DATETIME(3)  NULL,
  `next_run_at`                DATETIME(3)  NULL,
  `created_at`                 DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`                 DATETIME(3)  NOT NULL,
  `created_by_id`              VARCHAR(191) NULL,
  `updated_by_id`              VARCHAR(191) NULL,
  PRIMARY KEY (`id`),
  INDEX `alert_schedules_is_active_next_run_at_idx` (`is_active`, `next_run_at`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `system_alerts`
  ADD COLUMN `image_file_name` VARCHAR(191) NULL,
  ADD COLUMN `image_alt`       VARCHAR(191) NULL,
  ADD COLUMN `expires_at`      DATETIME(3)  NULL,
  ADD COLUMN `schedule_id`     VARCHAR(191) NULL;

CREATE INDEX `system_alerts_schedule_id_idx` ON `system_alerts`(`schedule_id`);
CREATE INDEX `system_alerts_expires_at_idx` ON `system_alerts`(`expires_at`);

ALTER TABLE `system_alerts`
  ADD CONSTRAINT `system_alerts_schedule_id_fkey`
  FOREIGN KEY (`schedule_id`) REFERENCES `alert_schedules`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
