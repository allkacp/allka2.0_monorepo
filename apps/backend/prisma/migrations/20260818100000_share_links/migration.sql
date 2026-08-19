-- Compartilhamento de dashboard: link vira registro no banco (revogável,
-- escopo travado no servidor) em vez de payload Base64 auto-decodificável
-- pelo cliente. Ver routes/share.ts.
CREATE TABLE `share_links` (
  `id` VARCHAR(191) NOT NULL,
  `token` VARCHAR(191) NOT NULL,
  `target_id` VARCHAR(191) NOT NULL,
  `target_type` VARCHAR(191) NOT NULL,
  `target_title` VARCHAR(191) NOT NULL,
  `permission` VARCHAR(191) NOT NULL,
  `pin_hash` VARCHAR(191) NULL,
  `profile` VARCHAR(191) NOT NULL,
  `scope_id` VARCHAR(191) NULL,
  `period_type` VARCHAR(191) NULL,
  `period_from` DATETIME(3) NULL,
  `period_to` DATETIME(3) NULL,
  `period_label` VARCHAR(191) NULL,
  `allow_filter_changes` BOOLEAN NOT NULL DEFAULT false,
  `expires_at` DATETIME(3) NULL,
  `revoked_at` DATETIME(3) NULL,
  `created_by` VARCHAR(191) NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `share_links_token_key`(`token`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `share_links_created_by_idx` ON `share_links`(`created_by`);

ALTER TABLE `share_links` ADD CONSTRAINT `share_links_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
