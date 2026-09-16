-- AlterTable
ALTER TABLE `catalog2_products` ADD COLUMN `delivery_recurrence` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `catalog2_project_delivery_cycles` (
    `id` VARCHAR(191) NOT NULL,
    `project_product_id` VARCHAR(191) NOT NULL,
    `occurrence_index` INTEGER NOT NULL,
    `scheduled_at` DATETIME(3) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `released_at` DATETIME(3) NULL,
    `origin_payment_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `catalog2_project_delivery_cycles_status_scheduled_at_idx`(`status`, `scheduled_at`),
    UNIQUE INDEX `catalog2_project_delivery_cycles_project_product_id_occurren_key`(`project_product_id`, `occurrence_index`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `catalog2_project_delivery_cycles` ADD CONSTRAINT `catalog2_project_delivery_cycles_project_product_id_fkey` FOREIGN KEY (`project_product_id`) REFERENCES `project_products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
