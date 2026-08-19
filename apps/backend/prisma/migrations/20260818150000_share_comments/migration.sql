-- Comentários em dashboards/widgets compartilhados (ShareLink.permission =
-- "comment"). Sem duplicar target_id/target_type — o vínculo dashboard/
-- widget vem do próprio share_link_id. Ver routes/share.ts.
CREATE TABLE `share_comments` (
  `id` VARCHAR(191) NOT NULL,
  `share_link_id` VARCHAR(191) NOT NULL,
  `content` LONGTEXT NOT NULL,
  `author_name` VARCHAR(191) NULL,
  `author_email` VARCHAR(191) NOT NULL,
  `user_id` VARCHAR(191) NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'visible',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `share_comments_share_link_id_idx` ON `share_comments`(`share_link_id`);

ALTER TABLE `share_comments` ADD CONSTRAINT `share_comments_share_link_id_fkey` FOREIGN KEY (`share_link_id`) REFERENCES `share_links`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `share_comments` ADD CONSTRAINT `share_comments_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
