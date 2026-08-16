-- Conexões OAuth do projeto com plataformas externas (Meta Ads primeiro) +
-- histórico diário de métricas. Ver routes/project-connections.ts,
-- routes/meta-integration.ts, lib/meta-ads-sync.ts.

CREATE TABLE `project_connections` (
  `id`                      VARCHAR(191) NOT NULL,
  `project_id`              VARCHAR(191) NOT NULL,
  `provider`                VARCHAR(191) NOT NULL,
  `status`                  VARCHAR(191) NOT NULL DEFAULT 'connected',
  `external_account_id`     VARCHAR(191) NOT NULL,
  `external_account_name`   VARCHAR(191) NULL,
  `scopes`                  LONGTEXT     NULL,
  `access_token_encrypted`  LONGTEXT     NOT NULL,
  `token_expires_at`        DATETIME(3)  NULL,
  `last_synced_at`          DATETIME(3)  NULL,
  `last_error`              LONGTEXT     NULL,
  `connected_by_user_id`    VARCHAR(191) NOT NULL,
  `created_at`              DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`              DATETIME(3)  NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `project_connections_project_id_provider_key` (`project_id`, `provider`),
  INDEX `project_connections_project_id_idx` (`project_id`),
  INDEX `project_connections_provider_idx` (`provider`),
  INDEX `project_connections_status_idx` (`status`),
  INDEX `project_connections_connected_by_user_id_idx` (`connected_by_user_id`),
  CONSTRAINT `project_connections_project_id_fkey`
    FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `project_connection_metrics_daily` (
  `id`            VARCHAR(191) NOT NULL,
  `connection_id` VARCHAR(191) NOT NULL,
  `date`          DATE         NOT NULL,
  `impressions`   INT          NULL,
  `clicks`        INT          NULL,
  `spend`         DOUBLE       NULL,
  `reach`         INT          NULL,
  `ctr`           DOUBLE       NULL,
  `cpc`           DOUBLE       NULL,
  `raw`           JSON         NULL,
  `created_at`    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`    DATETIME(3)  NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `project_connection_metrics_daily_connection_id_date_key` (`connection_id`, `date`),
  INDEX `project_connection_metrics_daily_connection_id_idx` (`connection_id`),
  INDEX `project_connection_metrics_daily_date_idx` (`date`),
  CONSTRAINT `project_connection_metrics_daily_connection_id_fkey`
    FOREIGN KEY (`connection_id`) REFERENCES `project_connections`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
