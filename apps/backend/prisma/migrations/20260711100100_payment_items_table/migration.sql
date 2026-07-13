-- CreateTable
CREATE TABLE `payment_items` (
    `id` VARCHAR(191) NOT NULL,
    `payment_id` VARCHAR(191) NOT NULL,
    `project_product_id` VARCHAR(191) NOT NULL,
    `product_id` VARCHAR(191) NULL,
    `product_name_snapshot` VARCHAR(191) NOT NULL,
    `unit_price_snapshot` DOUBLE NOT NULL,
    `quantity_snapshot` INTEGER NOT NULL DEFAULT 1,
    `total_snapshot` DOUBLE NOT NULL,
    `recurrence_snapshot` VARCHAR(191) NULL,
    `billing_cycle_key` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `payment_items_payment_id_idx`(`payment_id`),
    INDEX `payment_items_project_product_id_idx`(`project_product_id`),
    UNIQUE INDEX `payment_items_payment_id_project_product_id_key`(`payment_id`, `project_product_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `payment_items` ADD CONSTRAINT `payment_items_payment_id_fkey` FOREIGN KEY (`payment_id`) REFERENCES `payments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment_items` ADD CONSTRAINT `payment_items_project_product_id_fkey` FOREIGN KEY (`project_product_id`) REFERENCES `project_products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment_items` ADD CONSTRAINT `payment_items_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
