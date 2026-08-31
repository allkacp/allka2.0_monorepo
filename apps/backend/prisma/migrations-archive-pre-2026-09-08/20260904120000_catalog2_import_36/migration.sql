-- Sprint de produtos, bloco 4/6 — importacao auditavel dos 36 produtos.
-- 100% aditiva no sentido do PRODUTO: nenhuma tabela do catalogo operacional
-- (products/...) e tocada; os 162 produtos e o Legacy ficam intactos. Nenhum
-- dos 36 e publicado. Novas colunas (prazo comercial base; ordem/base do
-- calculo) + 4 tabelas de auditoria de importacao.

-- AlterTable
ALTER TABLE `catalog2_pricing_settings` ADD COLUMN `component_base_json` TEXT NULL,
    ADD COLUMN `component_order_json` TEXT NULL;

-- AlterTable
ALTER TABLE `catalog2_product_versions` ADD COLUMN `base_commercial_deadline_days` INTEGER NULL;

-- CreateTable
CREATE TABLE `catalog2_import_batches` (
    `id` VARCHAR(191) NOT NULL,
    `mode` VARCHAR(191) NOT NULL,
    `rule_version` VARCHAR(191) NOT NULL,
    `source_main_name` VARCHAR(191) NOT NULL,
    `source_main_checksum` VARCHAR(191) NOT NULL,
    `source_rose_name` VARCHAR(191) NOT NULL,
    `source_rose_checksum` VARCHAR(191) NOT NULL,
    `source_ata_checksum` VARCHAR(191) NULL,
    `row_count_main` INTEGER NOT NULL DEFAULT 0,
    `row_count_rose` INTEGER NOT NULL DEFAULT 0,
    `expected_products` INTEGER NOT NULL DEFAULT 36,
    `created_count` INTEGER NOT NULL DEFAULT 0,
    `updated_count` INTEGER NOT NULL DEFAULT 0,
    `unchanged_count` INTEGER NOT NULL DEFAULT 0,
    `divergence_count` INTEGER NOT NULL DEFAULT 0,
    `status` VARCHAR(191) NOT NULL DEFAULT 'dry_run',
    `report_json` LONGTEXT NULL,
    `notes` TEXT NULL,
    `actor_user_id` VARCHAR(191) NULL,
    `started_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `finished_at` DATETIME(3) NULL,

    INDEX `catalog2_import_batches_mode_started_at_idx`(`mode`, `started_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `catalog2_import_records` (
    `id` VARCHAR(191) NOT NULL,
    `batch_id` VARCHAR(191) NOT NULL,
    `source_key` VARCHAR(191) NOT NULL,
    `source_index` INTEGER NOT NULL,
    `source_name` VARCHAR(191) NOT NULL,
    `product_id` VARCHAR(191) NULL,
    `version_id` VARCHAR(191) NULL,
    `slug` VARCHAR(191) NULL,
    `outcome` VARCHAR(191) NOT NULL,
    `checksum` VARCHAR(191) NOT NULL,
    `fields_from_main_json` LONGTEXT NULL,
    `fields_from_rose_json` LONGTEXT NULL,
    `original_texts_json` LONGTEXT NULL,
    `divergences_json` TEXT NULL,
    `warnings_json` TEXT NULL,
    `errors_json` TEXT NULL,
    `rose_reviewed` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `catalog2_import_records_source_key_idx`(`source_key`),
    UNIQUE INDEX `catalog2_import_records_batch_id_source_key_key`(`batch_id`, `source_key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `catalog2_product_import_origins` (
    `id` VARCHAR(191) NOT NULL,
    `product_id` VARCHAR(191) NOT NULL,
    `source_key` VARCHAR(191) NOT NULL,
    `source_index` INTEGER NOT NULL,
    `source_name` VARCHAR(191) NOT NULL,
    `rose_reviewed` BOOLEAN NOT NULL DEFAULT false,
    `area_rose` VARCHAR(191) NULL,
    `review_state` VARCHAR(191) NOT NULL DEFAULT 'importado',
    `pendencies_json` TEXT NULL,
    `last_import_checksum` VARCHAR(191) NOT NULL,
    `last_import_batch_id` VARCHAR(191) NULL,
    `human_edited_at` DATETIME(3) NULL,
    `human_edited_by_user_id` VARCHAR(191) NULL,
    `main_fields_json` LONGTEXT NULL,
    `rose_fields_json` LONGTEXT NULL,
    `original_texts_json` LONGTEXT NULL,
    `divergences_json` TEXT NULL,
    `observations` TEXT NULL,
    `historical_price_min` DOUBLE NULL,
    `historical_price_max` DOUBLE NULL,
    `historical_price_note` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `catalog2_product_import_origins_product_id_key`(`product_id`),
    UNIQUE INDEX `catalog2_product_import_origins_source_key_key`(`source_key`),
    INDEX `catalog2_product_import_origins_review_state_idx`(`review_state`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `catalog2_review_resolutions` (
    `id` VARCHAR(191) NOT NULL,
    `origin_id` VARCHAR(191) NOT NULL,
    `pendency_key` VARCHAR(191) NOT NULL,
    `decision` TEXT NOT NULL,
    `original_divergence_json` TEXT NULL,
    `resolved_by_user_id` VARCHAR(191) NULL,
    `resolved_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `catalog2_review_resolutions_origin_id_idx`(`origin_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `catalog2_import_records` ADD CONSTRAINT `catalog2_import_records_batch_id_fkey` FOREIGN KEY (`batch_id`) REFERENCES `catalog2_import_batches`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `catalog2_product_import_origins` ADD CONSTRAINT `catalog2_product_import_origins_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `catalog2_products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `catalog2_review_resolutions` ADD CONSTRAINT `catalog2_review_resolutions_origin_id_fkey` FOREIGN KEY (`origin_id`) REFERENCES `catalog2_product_import_origins`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
