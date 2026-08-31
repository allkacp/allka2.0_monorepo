-- Motor de alertas automáticos (ata 2026-08, 2º lote): Padrão → Regra →
-- Verificação automática → Ocorrência. A ocorrência continua sendo um
-- `system_alerts` comum — só ganha referência opcional ao padrão/regra que a
-- originou, chave de deduplicação e dados de encerramento automático. Todas
-- as colunas novas são opcionais, então nenhum alerta existente é afetado.

CREATE TABLE `alert_standards` (
  `id`                     VARCHAR(191) NOT NULL,
  `key`                    VARCHAR(191) NOT NULL,
  `name`                   VARCHAR(191) NOT NULL,
  `title`                  VARCHAR(191) NOT NULL,
  `message`                LONGTEXT     NOT NULL,
  `default_severity`       VARCHAR(191) NOT NULL DEFAULT 'warning',
  `is_active`               BOOLEAN      NOT NULL DEFAULT true,
  `is_system`               BOOLEAN      NOT NULL DEFAULT false,
  `allowed_variables_json` LONGTEXT     NOT NULL,
  `created_at`             DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`             DATETIME(3)  NOT NULL,
  `created_by_id`          VARCHAR(191) NULL,
  `updated_by_id`          VARCHAR(191) NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `alert_standards_key_key` (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `alert_rules` (
  `id`                  VARCHAR(191) NOT NULL,
  `standard_id`         VARCHAR(191) NOT NULL,
  `name`                VARCHAR(191) NOT NULL,
  `trigger_type`        VARCHAR(191) NOT NULL,
  `is_active`           BOOLEAN      NOT NULL DEFAULT true,
  `lead_time_minutes`   INT          NULL,
  `severity_override`   VARCHAR(191) NULL,
  `config_json`         LONGTEXT     NULL,
  `created_at`          DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`          DATETIME(3)  NOT NULL,
  `created_by_id`       VARCHAR(191) NULL,
  `updated_by_id`       VARCHAR(191) NULL,
  PRIMARY KEY (`id`),
  INDEX `alert_rules_standard_id_idx` (`standard_id`),
  INDEX `alert_rules_trigger_type_idx` (`trigger_type`),
  CONSTRAINT `alert_rules_standard_id_fkey`
    FOREIGN KEY (`standard_id`) REFERENCES `alert_standards`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `system_alerts`
  ADD COLUMN `standard_id`        VARCHAR(191) NULL,
  ADD COLUMN `rule_id`            VARCHAR(191) NULL,
  ADD COLUMN `dedupe_key`         VARCHAR(191) NULL,
  ADD COLUMN `resolved_at`        DATETIME(3)  NULL,
  ADD COLUMN `resolution_reason`  VARCHAR(191) NULL;

CREATE INDEX `system_alerts_dedupe_key_idx` ON `system_alerts`(`dedupe_key`);
CREATE INDEX `system_alerts_rule_id_idx` ON `system_alerts`(`rule_id`);
CREATE INDEX `system_alerts_standard_id_idx` ON `system_alerts`(`standard_id`);

ALTER TABLE `system_alerts`
  ADD CONSTRAINT `system_alerts_standard_id_fkey`
  FOREIGN KEY (`standard_id`) REFERENCES `alert_standards`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `system_alerts`
  ADD CONSTRAINT `system_alerts_rule_id_fkey`
  FOREIGN KEY (`rule_id`) REFERENCES `alert_rules`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
