-- AlterTable
ALTER TABLE `catalog2_cart_items` ADD COLUMN `period` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `catalog2_quotes` ADD COLUMN `contract_period` VARCHAR(191) NULL,
    ADD COLUMN `contract_period_discount_percent` DOUBLE NULL,
    ADD COLUMN `contract_period_months` INTEGER NULL,
    ADD COLUMN `contract_period_reference_monthly_price` DOUBLE NULL;

-- AlterTable
ALTER TABLE `project_products` ADD COLUMN `catalog2_period` VARCHAR(191) NULL,
    ADD COLUMN `catalog2_period_discount_percent` DOUBLE NULL,
    ADD COLUMN `catalog2_period_ends_at` DATETIME(3) NULL,
    ADD COLUMN `catalog2_period_months` INTEGER NULL,
    ADD COLUMN `catalog2_period_reference_monthly_price` DOUBLE NULL;

-- CreateTable
CREATE TABLE `catalog2_product_periods` (
    `id` VARCHAR(191) NOT NULL,
    `product_id` VARCHAR(191) NOT NULL,
    `period` VARCHAR(191) NOT NULL,
    `months` INTEGER NOT NULL,
    `discount_percent` DOUBLE NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `updated_by_user_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `catalog2_product_periods_product_id_period_key`(`product_id`, `period`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `catalog2_product_periods` ADD CONSTRAINT `catalog2_product_periods_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `catalog2_products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
