-- Auditoria persistente de ShareLink (item 8) — tabela nova, não altera
-- nenhuma coluna existente. Sobrevive a revogação/expiração/arquivamento
-- do link (FK sem cascade destrutivo além do próprio ShareLink; se o link
-- for hipoteticamente apagado — hoje nunca é, sempre soft-delete — o
-- histórico junto vai, mas isso não acontece no fluxo normal).
CREATE TABLE `share_link_activities` (
  `id` VARCHAR(191) NOT NULL,
  `share_link_id` VARCHAR(191) NOT NULL,
  `action` VARCHAR(191) NOT NULL,
  `actor_user_id` VARCHAR(191) NULL,
  `actor_name` VARCHAR(191) NULL,
  `actor_email` VARCHAR(191) NULL,
  `metadata` JSON NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `share_link_activities_share_link_id_created_at_idx` ON `share_link_activities`(`share_link_id`, `created_at`);

ALTER TABLE `share_link_activities` ADD CONSTRAINT `share_link_activities_share_link_id_fkey` FOREIGN KEY (`share_link_id`) REFERENCES `share_links`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
