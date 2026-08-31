-- Comentários de share: WhatsApp opcional, cor de exibição (paleta fixa,
-- validada no backend), conteúdo agora nullable (comentário pode ser só
-- anexo), e tabela de anexos (imagem/PDF).
ALTER TABLE `share_comments`
  MODIFY `content` LONGTEXT NULL,
  ADD COLUMN `color` VARCHAR(191) NOT NULL DEFAULT 'default',
  ADD COLUMN `author_whatsapp` VARCHAR(191) NULL;

CREATE TABLE `share_comment_attachments` (
  `id` VARCHAR(191) NOT NULL,
  `comment_id` VARCHAR(191) NOT NULL,
  `filename` VARCHAR(191) NOT NULL,
  `mime_type` VARCHAR(191) NOT NULL,
  `size` INTEGER NOT NULL,
  `storage_key` VARCHAR(191) NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `share_comment_attachments_comment_id_idx` ON `share_comment_attachments`(`comment_id`);

ALTER TABLE `share_comment_attachments` ADD CONSTRAINT `share_comment_attachments_comment_id_fkey` FOREIGN KEY (`comment_id`) REFERENCES `share_comments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
