-- Visualização detalhada e histórico real de alerta (ata 2026-08, 8º lote).
-- created_by_user_id: quem criou manualmente (Avulso) — nulo em qualquer
-- origem automática e em Avulsos criados antes deste lote (nunca
-- inferido/backfilled).
ALTER TABLE `system_alerts` ADD COLUMN `created_by_user_id` VARCHAR(191) NULL;

-- Linha do tempo de eventos por ocorrência — tabela nova porque a única
-- auditoria existente (product_feedback_access_audits) é genérica, sem
-- índice por alerta, e nunca cobriu ações do destinatário.
CREATE TABLE `system_alert_events` (
  `id`             VARCHAR(191) NOT NULL,
  `alert_id`       VARCHAR(191) NOT NULL,
  `event_type`     VARCHAR(191) NOT NULL,
  `actor_user_id`  VARCHAR(191) NULL,
  `description`    TEXT         NOT NULL,
  `metadata_json`  TEXT         NULL,
  `created_at`     DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `system_alert_events_alert_id_created_at_idx` (`alert_id`, `created_at`),
  CONSTRAINT `system_alert_events_alert_id_fkey`
    FOREIGN KEY (`alert_id`) REFERENCES `system_alerts`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
