-- CreateTable
CREATE TABLE `catalog2_provisional_previews` (
    `id` VARCHAR(191) NOT NULL,
    `product_id` VARCHAR(191) NOT NULL,
    `is_provisional` BOOLEAN NOT NULL DEFAULT true,
    `needs_review` BOOLEAN NOT NULL DEFAULT true,
    `image_path` VARCHAR(191) NULL,
    `image_source_note` TEXT NULL,
    `price_amount` DOUBLE NULL,
    `deadline_days` INTEGER NULL,
    `modality` VARCHAR(191) NULL,
    `contract_note` TEXT NULL,
    `highlights_json` TEXT NULL,
    `included_items_json` TEXT NULL,
    `options_json` TEXT NULL,
    `portfolio_refs_json` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_by_user_id` VARCHAR(191) NULL,

    UNIQUE INDEX `catalog2_provisional_previews_product_id_key`(`product_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `catalog2_provisional_previews` ADD CONSTRAINT `catalog2_provisional_previews_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `catalog2_products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

