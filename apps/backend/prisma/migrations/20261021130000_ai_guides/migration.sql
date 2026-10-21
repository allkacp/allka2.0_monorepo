-- R21-18: guias e métodos consultados pela IA de preenchimento do produto (tabela nova; aditivo).
CREATE TABLE `catalog2_ai_guides` (
  `id` VARCHAR(191) NOT NULL,
  `title` VARCHAR(160) NOT NULL,
  `content` LONGTEXT NOT NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `created_by_user_id` VARCHAR(191) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
