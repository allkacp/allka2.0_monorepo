-- Tema da plataforma (Personalizar Sidebar) salvo no servidor para valer para todos. Só cria uma tabela nova (nada existente é alterado).
CREATE TABLE `platform_theme` (
  `id` VARCHAR(191) NOT NULL DEFAULT 'default',
  `settings_json` LONGTEXT NOT NULL,
  `presets_json` LONGTEXT NULL,
  `updated_by_user_id` VARCHAR(191) NULL,
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
