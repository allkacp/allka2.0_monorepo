-- Reunião 10/09 ("precificação dos 36 produtos funcional para teste").
-- Estrutura de simulação PROVISÓRIA totalmente separada do singleton
-- comercial real (catalog2_pricing_settings) — nova tabela própria, campos
-- aditivos (defaults compatíveis com dados existentes) em
-- catalog2_product_versions (prazo comercial provisório por produto) e
-- catalog2_tasks (persiste o sinal de ambiguidade do classificador).
-- AlterTable
ALTER TABLE `catalog2_product_versions`
  ADD COLUMN `provisional_commercial_deadline_days` INTEGER NULL,
  ADD COLUMN `provisional_deadline_reason` TEXT NULL,
  ADD COLUMN `provisional_deadline_source` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `catalog2_tasks`
  ADD COLUMN `effort_ambiguous` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `effort_ambiguous_reason` TEXT NULL;

-- CreateTable
CREATE TABLE `catalog2_pricing_simulation_settings` (
    `id` VARCHAR(191) NOT NULL DEFAULT 'default',
    `tax_percent` DOUBLE NULL,
    `commission_percent` DOUBLE NULL,
    `operational_fee_percent` DOUBLE NULL,
    `profit_margin_percent` DOUBLE NULL,
    `human_review_percent` DOUBLE NULL,
    `component_order_json` TEXT NULL,
    `is_provisional` BOOLEAN NOT NULL DEFAULT true,
    `source` VARCHAR(191) NOT NULL DEFAULT 'provisional_simulation_v1',
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
