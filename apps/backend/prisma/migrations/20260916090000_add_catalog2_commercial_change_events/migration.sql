-- AlterTable
ALTER TABLE `catalog2_quotes` ADD COLUMN `price_protection_anchor_source` VARCHAR(20) NULL;

-- CreateTable
CREATE TABLE `catalog2_commercial_change_events` (
    `id` VARCHAR(191) NOT NULL,
    `scope` VARCHAR(191) NOT NULL,
    `product_id` VARCHAR(191) NULL,
    `specialty_id` VARCHAR(191) NULL,
    `version_id` VARCHAR(191) NULL,
    `occurred_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actor_user_id` VARCHAR(191) NULL,
    `note` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `catalog2_commercial_change_events_scope_occurred_at_idx`(`scope`, `occurred_at`),
    INDEX `catalog2_commercial_change_events_product_id_occurred_at_idx`(`product_id`, `occurred_at`),
    INDEX `catalog2_commercial_change_events_specialty_id_occurred_at_idx`(`specialty_id`, `occurred_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Item 4.1: quotes com price_protection_started_at já gravado ANTES desta
-- mudança usaram a semântica antiga (data da PRIMEIRA CONSULTA, não a data
-- real da alteração comercial) — marca essas linhas explicitamente como
-- "detected_fallback" para nunca serem confundidas com uma âncora real do
-- log de eventos, sem tentar adivinhar retroativamente a data verdadeira.
UPDATE `catalog2_quotes`
SET `price_protection_anchor_source` = 'detected_fallback'
WHERE `price_protection_started_at` IS NOT NULL
  AND `price_protection_anchor_source` IS NULL;
