-- Sprint de produtos, bloco 3/6 — construtor + regras + prazos + precificacao.
-- 100% aditiva no sentido do PRODUTO: nenhuma das tabelas do catalogo
-- operacional (products/...) e tocada; os 162 produtos e o Legacy ficam
-- intactos. `catalog2_conditions` deixa de ser um stub parqueado e vira uma
-- estrutura TIPADA (gatilho -> efeito, vocabulario fechado). A tabela so
-- continha dado de demonstracao local; limpa antes do ALTER.

DELETE FROM `catalog2_conditions`;

-- AlterTable
ALTER TABLE `catalog2_addons` DROP COLUMN `adds_deliverables`,
    DROP COLUMN `deadline_delta_days`,
    DROP COLUMN `price_delta_hint`,
    ADD COLUMN `base_cost` DOUBLE NULL,
    ADD COLUMN `is_active` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `target_step_id` VARCHAR(191) NULL,
    ADD COLUMN `target_task_id` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `catalog2_conditions` DROP COLUMN `applies_to`,
    DROP COLUMN `effect_note`,
    DROP COLUMN `trigger_note`,
    ADD COLUMN `comparison_value` VARCHAR(191) NULL,
    ADD COLUMN `effect_type` VARCHAR(191) NOT NULL,
    ADD COLUMN `effect_value` TEXT NOT NULL,
    ADD COLUMN `explanation` TEXT NOT NULL,
    ADD COLUMN `is_active` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `operator` VARCHAR(191) NOT NULL,
    ADD COLUMN `sort_order` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `trigger_ref` VARCHAR(191) NULL,
    ADD COLUMN `trigger_source` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `catalog2_product_versions` ADD COLUMN `change_summary` TEXT NULL,
    ADD COLUMN `publish_client_action_id` VARCHAR(191) NULL,
    ADD COLUMN `updated_by_user_id` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `catalog2_products` ADD COLUMN `archived_at` DATETIME(3) NULL,
    ADD COLUMN `archived_by_user_id` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `catalog2_specialties` ADD COLUMN `hourly_rate_note` TEXT NULL,
    ADD COLUMN `max_hourly_rate` DOUBLE NULL;

-- AlterTable
ALTER TABLE `catalog2_task_ai` ADD COLUMN `currency` VARCHAR(191) NOT NULL DEFAULT 'BRL',
    ADD COLUMN `est_review_rounds` INTEGER NULL,
    ADD COLUMN `unit_cost_input_per_1k` DOUBLE NULL,
    ADD COLUMN `unit_cost_output_per_1k` DOUBLE NULL;

-- AlterTable
ALTER TABLE `catalog2_task_steps` ADD COLUMN `estimated_minutes` INTEGER NULL,
    ADD COLUMN `is_conditional` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `catalog2_tasks` ADD COLUMN `estimated_minutes` INTEGER NULL,
    ADD COLUMN `is_conditional` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `requires_client_approval` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `requires_review` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `catalog2_variation_options` DROP COLUMN `client_info_requirements`,
    DROP COLUMN `deadline_delta_days`,
    DROP COLUMN `price_delta_hint`,
    ADD COLUMN `is_default` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE `catalog2_version_events` (
    `id` VARCHAR(191) NOT NULL,
    `version_id` VARCHAR(191) NOT NULL,
    `event_type` VARCHAR(191) NOT NULL,
    `actor_user_id` VARCHAR(191) NULL,
    `note` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `catalog2_version_events_version_id_created_at_idx`(`version_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `catalog2_option_effects` (
    `id` VARCHAR(191) NOT NULL,
    `variation_option_id` VARCHAR(191) NOT NULL,
    `effect_type` VARCHAR(191) NOT NULL,
    `effect_value` TEXT NOT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `catalog2_option_effects_variation_option_id_sort_order_idx`(`variation_option_id`, `sort_order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `catalog2_addon_effects` (
    `id` VARCHAR(191) NOT NULL,
    `addon_id` VARCHAR(191) NOT NULL,
    `effect_type` VARCHAR(191) NOT NULL,
    `effect_value` TEXT NOT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `catalog2_addon_effects_addon_id_sort_order_idx`(`addon_id`, `sort_order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `catalog2_task_dependencies` (
    `id` VARCHAR(191) NOT NULL,
    `task_id` VARCHAR(191) NOT NULL,
    `depends_on_task_id` VARCHAR(191) NOT NULL,

    INDEX `catalog2_task_dependencies_depends_on_task_id_idx`(`depends_on_task_id`),
    UNIQUE INDEX `catalog2_task_dependencies_task_id_depends_on_task_id_key`(`task_id`, `depends_on_task_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `catalog2_pricing_settings` (
    `id` VARCHAR(191) NOT NULL DEFAULT 'default',
    `tax_percent` DOUBLE NULL,
    `commission_percent` DOUBLE NULL,
    `operational_fee_percent` DOUBLE NULL,
    `profit_margin_percent` DOUBLE NULL,
    `human_review_percent` DOUBLE NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'BRL',
    `notes` TEXT NULL,
    `updated_by_user_id` VARCHAR(191) NULL,
    `updated_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `catalog2_conditions_version_id_sort_order_idx` ON `catalog2_conditions`(`version_id`, `sort_order`);

-- CreateIndex
CREATE UNIQUE INDEX `catalog2_product_versions_publish_client_action_id_key` ON `catalog2_product_versions`(`publish_client_action_id`);

-- AddForeignKey
ALTER TABLE `catalog2_version_events` ADD CONSTRAINT `catalog2_version_events_version_id_fkey` FOREIGN KEY (`version_id`) REFERENCES `catalog2_product_versions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `catalog2_option_effects` ADD CONSTRAINT `catalog2_option_effects_variation_option_id_fkey` FOREIGN KEY (`variation_option_id`) REFERENCES `catalog2_variation_options`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `catalog2_addons` ADD CONSTRAINT `catalog2_addons_target_task_id_fkey` FOREIGN KEY (`target_task_id`) REFERENCES `catalog2_tasks`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `catalog2_addons` ADD CONSTRAINT `catalog2_addons_target_step_id_fkey` FOREIGN KEY (`target_step_id`) REFERENCES `catalog2_task_steps`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `catalog2_addon_effects` ADD CONSTRAINT `catalog2_addon_effects_addon_id_fkey` FOREIGN KEY (`addon_id`) REFERENCES `catalog2_addons`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `catalog2_task_dependencies` ADD CONSTRAINT `catalog2_task_dependencies_task_id_fkey` FOREIGN KEY (`task_id`) REFERENCES `catalog2_tasks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `catalog2_task_dependencies` ADD CONSTRAINT `catalog2_task_dependencies_depends_on_task_id_fkey` FOREIGN KEY (`depends_on_task_id`) REFERENCES `catalog2_tasks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- ── Dados estruturais REALMENTE fixos: as 4 fases 4Fs (bloco 3, correcao
--    1.2 — sai do seed no boot). Idempotente por `key`. Nunca ha novas
--    fases: e a metodologia. Pilares/categorias/especialidades continuam
--    dinamicos, por script explicito.
INSERT INTO `catalog2_four_f` (`id`, `key`, `name`, `sort_order`, `created_at`, `updated_at`)
VALUES
  ('c2f-fundacao',   'fundacao',   'F1 — Fundação',   1, NOW(3), NOW(3)),
  ('c2f-fluxo',      'fluxo',      'F2 — Fluxo',      2, NOW(3), NOW(3)),
  ('c2f-forca',      'forca',      'F3 — Força',      3, NOW(3), NOW(3)),
  ('c2f-fidelizacao','fidelizacao','F4 — Fidelização',4, NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `sort_order` = VALUES(`sort_order`);

-- Linha singleton do modulo de precificacao — todos os percentuais NULOS
-- ("aguardando definicao comercial"; o calculo nunca inventa valor).
INSERT INTO `catalog2_pricing_settings` (`id`, `currency`, `updated_at`, `created_at`)
VALUES ('default', 'BRL', NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE `currency` = `currency`;
