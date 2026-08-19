-- Dashboards padrão por perfil (item 9) + banners/avisos fixos (item 10).
-- Duas tabelas novas, não altera nenhuma coluna existente. Não migra nada
-- de localStorage — a personalização pessoal continua lá; templates só
-- entram como base inicial de quem ainda não personalizou (ver GET
-- /api/dashboard-templates/resolve em routes/dashboard-templates.ts).
CREATE TABLE `dashboard_templates` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `profile` VARCHAR(191) NOT NULL,
  `is_default` BOOLEAN NOT NULL DEFAULT false,
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `widgets` JSON NOT NULL,
  `created_by` VARCHAR(191) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `dashboard_templates_profile_is_active_idx` ON `dashboard_templates`(`profile`, `is_active`);
CREATE INDEX `dashboard_templates_profile_is_default_idx` ON `dashboard_templates`(`profile`, `is_default`);

ALTER TABLE `dashboard_templates` ADD CONSTRAINT `dashboard_templates_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE `dashboard_template_contents` (
  `id` VARCHAR(191) NOT NULL,
  `template_id` VARCHAR(191) NOT NULL,
  `type` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `body` TEXT NULL,
  `image_storage_key` VARCHAR(191) NULL,
  `image_mime_type` VARCHAR(191) NULL,
  `link_url` VARCHAR(191) NULL,
  `link_label` VARCHAR(191) NULL,
  `active` BOOLEAN NOT NULL DEFAULT true,
  `starts_at` DATETIME(3) NULL,
  `ends_at` DATETIME(3) NULL,
  `sort_order` INTEGER NOT NULL DEFAULT 0,
  `locked` BOOLEAN NOT NULL DEFAULT false,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `dashboard_template_contents_template_id_active_idx` ON `dashboard_template_contents`(`template_id`, `active`);

ALTER TABLE `dashboard_template_contents` ADD CONSTRAINT `dashboard_template_contents_template_id_fkey` FOREIGN KEY (`template_id`) REFERENCES `dashboard_templates`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
