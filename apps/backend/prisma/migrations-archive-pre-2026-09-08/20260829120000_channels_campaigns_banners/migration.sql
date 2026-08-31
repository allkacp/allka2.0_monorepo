-- Bloco 5/5 (ata 2026-08) — "Canais, campanhas, reengajamento e banners
-- obrigatórios". 100% aditiva: 7 tabelas novas, nenhuma alteração de coluna
-- existente, nenhum registro atual muda de comportamento.
--
-- O deploy limpo de migrations (prisma migrate deploy do zero) SEGUE
-- BLOQUEADO pelo BOM em `0_baseline` — pendência obrigatória a corrigir
-- antes da publicação. Esta migration foi validada por comparação de schema
-- (prisma migrate diff = "empty") e aplicada de forma controlada no banco
-- local (mysql < migration.sql), nunca `prisma db push --accept-data-loss`.

-- Outbox central de entregas por canal.
CREATE TABLE `communication_deliveries` (
  `id`                VARCHAR(191) NOT NULL,
  `origin`            VARCHAR(191) NOT NULL,
  `origin_id`         VARCHAR(191) NULL,
  `recipient_user_id` VARCHAR(191) NOT NULL,
  `channel`           VARCHAR(191) NOT NULL,
  `status`            VARCHAR(191) NOT NULL DEFAULT 'pending',
  `scheduled_for`     DATETIME(3)  NOT NULL,
  `first_attempt_at`  DATETIME(3)  NULL,
  `last_attempt_at`   DATETIME(3)  NULL,
  `attempts`          INT          NOT NULL DEFAULT 0,
  `delivered_at`      DATETIME(3)  NULL,
  `failed_at`         DATETIME(3)  NULL,
  `failure_summary`   TEXT         NULL,
  `idempotency_key`   VARCHAR(191) NOT NULL,
  `metadata_json`     TEXT         NULL,
  `preview_json`      TEXT         NULL,
  `created_at`        DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`        DATETIME(3)  NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `communication_deliveries_idempotency_key_key` (`idempotency_key`),
  INDEX `communication_deliveries_status_scheduled_for_idx` (`status`, `scheduled_for`),
  INDEX `communication_deliveries_origin_origin_id_idx` (`origin`, `origin_id`),
  INDEX `communication_deliveries_recipient_user_id_idx` (`recipient_user_id`),
  INDEX `communication_deliveries_channel_status_idx` (`channel`, `status`),
  CONSTRAINT `communication_deliveries_recipient_user_id_fkey`
    FOREIGN KEY (`recipient_user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Campanhas de comunicação (distintas do model `campaigns` legado, que é de
-- indicação/comissão de Partner).
CREATE TABLE `communication_campaigns` (
  `id`                   VARCHAR(191) NOT NULL,
  `internal_name`        VARCHAR(191) NOT NULL,
  `title`                VARCHAR(191) NOT NULL,
  `body`                 LONGTEXT     NOT NULL,
  `image_file_name`      VARCHAR(191) NULL,
  `image_alt`            VARCHAR(191) NULL,
  `link_url`             VARCHAR(191) NULL,
  `channels_json`        LONGTEXT     NOT NULL,
  `audience_json`        LONGTEXT     NOT NULL,
  `status`               VARCHAR(191) NOT NULL DEFAULT 'draft',
  `is_reengagement`      BOOLEAN      NOT NULL DEFAULT false,
  `inactivity_days`      INT          NULL,
  `scheduled_at`         DATETIME(3)  NULL,
  `starts_at`            DATETIME(3)  NULL,
  `ends_at`              DATETIME(3)  NULL,
  `target_environment`   VARCHAR(191) NULL,
  `activated_at`         DATETIME(3)  NULL,
  `activated_by_user_id` VARCHAR(191) NULL,
  `completed_at`         DATETIME(3)  NULL,
  `created_at`           DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`           DATETIME(3)  NOT NULL,
  `created_by_user_id`   VARCHAR(191) NULL,
  PRIMARY KEY (`id`),
  INDEX `communication_campaigns_status_scheduled_at_idx` (`status`, `scheduled_at`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `campaign_recipient_states` (
  `id`                VARCHAR(191) NOT NULL,
  `campaign_id`       VARCHAR(191) NOT NULL,
  `recipient_user_id` VARCHAR(191) NOT NULL,
  `state`             VARCHAR(191) NOT NULL DEFAULT 'queued',
  `reason`            VARCHAR(191) NULL,
  `processed_at`      DATETIME(3)  NULL,
  `created_at`        DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `campaign_recipient_states_campaign_id_recipient_user_id_key` (`campaign_id`, `recipient_user_id`),
  INDEX `campaign_recipient_states_campaign_id_state_idx` (`campaign_id`, `state`),
  CONSTRAINT `campaign_recipient_states_campaign_id_fkey`
    FOREIGN KEY (`campaign_id`) REFERENCES `communication_campaigns`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `mandatory_banners` (
  `id`                 VARCHAR(191) NOT NULL,
  `title`              VARCHAR(191) NOT NULL,
  `body`               LONGTEXT     NOT NULL,
  `image_file_name`    VARCHAR(191) NULL,
  `image_alt`          VARCHAR(191) NULL,
  `link_url`           VARCHAR(191) NULL,
  `kind`               VARCHAR(191) NOT NULL DEFAULT 'obrigatorio',
  `ack_button_label`   VARCHAR(191) NOT NULL DEFAULT 'Li e estou ciente',
  `version`            INT          NOT NULL DEFAULT 1,
  `audience_json`      LONGTEXT     NOT NULL,
  `starts_at`          DATETIME(3)  NOT NULL,
  `ends_at`            DATETIME(3)  NULL,
  `is_active`          BOOLEAN      NOT NULL DEFAULT true,
  `is_cancelled`       BOOLEAN      NOT NULL DEFAULT false,
  `created_at`         DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`         DATETIME(3)  NOT NULL,
  `created_by_user_id` VARCHAR(191) NULL,
  PRIMARY KEY (`id`),
  INDEX `mandatory_banners_is_active_starts_at_idx` (`is_active`, `starts_at`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `banner_acknowledgements` (
  `id`              VARCHAR(191) NOT NULL,
  `banner_id`       VARCHAR(191) NOT NULL,
  `user_id`         VARCHAR(191) NOT NULL,
  `version`         INT          NOT NULL,
  `acknowledged_at` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `banner_acknowledgements_banner_id_user_id_version_key` (`banner_id`, `user_id`, `version`),
  INDEX `banner_acknowledgements_user_id_idx` (`user_id`),
  CONSTRAINT `banner_acknowledgements_banner_id_fkey`
    FOREIGN KEY (`banner_id`) REFERENCES `mandatory_banners`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `banner_acknowledgements_user_id_fkey`
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `push_subscriptions` (
  `id`            VARCHAR(191) NOT NULL,
  `user_id`       VARCHAR(191) NOT NULL,
  `endpoint`      TEXT         NOT NULL,
  `endpoint_hash` VARCHAR(191) NOT NULL,
  `p256dh`        VARCHAR(191) NOT NULL,
  `auth`          VARCHAR(191) NOT NULL,
  `user_agent`    VARCHAR(191) NULL,
  `enabled`       BOOLEAN      NOT NULL DEFAULT true,
  `created_at`    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `last_used_at`  DATETIME(3)  NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `push_subscriptions_endpoint_hash_key` (`endpoint_hash`),
  INDEX `push_subscriptions_user_id_enabled_idx` (`user_id`, `enabled`),
  CONSTRAINT `push_subscriptions_user_id_fkey`
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `user_communication_channel_prefs` (
  `user_id`          VARCHAR(191) NOT NULL,
  `platform_enabled` BOOLEAN      NOT NULL DEFAULT true,
  `email_enabled`    BOOLEAN      NOT NULL DEFAULT true,
  `whatsapp_enabled` BOOLEAN      NOT NULL DEFAULT false,
  `push_enabled`     BOOLEAN      NOT NULL DEFAULT false,
  `marketing_opt_in` BOOLEAN      NOT NULL DEFAULT false,
  `updated_at`       DATETIME(3)  NOT NULL,
  PRIMARY KEY (`user_id`),
  CONSTRAINT `user_communication_channel_prefs_user_id_fkey`
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
