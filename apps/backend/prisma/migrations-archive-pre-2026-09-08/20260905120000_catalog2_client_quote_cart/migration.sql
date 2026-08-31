-- Sprint de produtos, bloco 5/6 — catalogo do cliente: pre-cotacao e cesta.
-- 100%% aditiva: 2 tabelas novas (catalog2_quotes, catalog2_cart_items).
-- Nenhum dos 162 produtos operacionais e tocado; nenhum dos 36 e publicado.

-- CreateTable
CREATE TABLE `catalog2_quotes` (
    `id` VARCHAR(191) NOT NULL,
    `account_kind` VARCHAR(191) NOT NULL,
    `account_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `product_id` VARCHAR(191) NOT NULL,
    `version_id` VARCHAR(191) NOT NULL,
    `selection_json` TEXT NOT NULL,
    `deliverables_json` TEXT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `commercial_deadline_days` INTEGER NULL,
    `commercial_price` DOUBLE NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'BRL',
    `config_checksum` VARCHAR(191) NOT NULL,
    `pricing_snapshot_json` LONGTEXT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'rascunho',
    `valid_until` DATETIME(3) NULL,
    `is_preview` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `catalog2_quotes_account_kind_account_id_status_idx`(`account_kind`, `account_id`, `status`),
    INDEX `catalog2_quotes_user_id_idx`(`user_id`),
    UNIQUE INDEX `catalog2_quotes_account_kind_account_id_config_checksum_stat_key`(`account_kind`, `account_id`, `config_checksum`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `catalog2_cart_items` (
    `id` VARCHAR(191) NOT NULL,
    `account_kind` VARCHAR(191) NOT NULL,
    `account_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `product_id` VARCHAR(191) NOT NULL,
    `version_id` VARCHAR(191) NOT NULL,
    `selection_json` TEXT NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `config_checksum` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `catalog2_cart_items_account_kind_account_id_user_id_idx`(`account_kind`, `account_id`, `user_id`),
    UNIQUE INDEX `catalog2_cart_items_account_kind_account_id_user_id_config_c_key`(`account_kind`, `account_id`, `user_id`, `config_checksum`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `catalog2_quotes` ADD CONSTRAINT `catalog2_quotes_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `catalog2_products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `catalog2_quotes` ADD CONSTRAINT `catalog2_quotes_version_id_fkey` FOREIGN KEY (`version_id`) REFERENCES `catalog2_product_versions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `catalog2_cart_items` ADD CONSTRAINT `catalog2_cart_items_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `catalog2_products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `catalog2_cart_items` ADD CONSTRAINT `catalog2_cart_items_version_id_fkey` FOREIGN KEY (`version_id`) REFERENCES `catalog2_product_versions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
