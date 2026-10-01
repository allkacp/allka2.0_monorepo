-- AlterTable
ALTER TABLE `catalog2_product_versions` ADD COLUMN `sale_modes_enforced` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE `catalog2_subscriptions` (
    `id` VARCHAR(191) NOT NULL,
    `project_product_id` VARCHAR(191) NOT NULL,
    `project_id` VARCHAR(191) NOT NULL,
    `company_id` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ativa',
    `period_months` INTEGER NOT NULL DEFAULT 1,
    `monthly_amount` DOUBLE NOT NULL,
    `started_at` DATETIME(3) NOT NULL,
    `current_cycle_index` INTEGER NOT NULL DEFAULT 0,
    `current_period_start` DATETIME(3) NOT NULL,
    `current_period_end` DATETIME(3) NOT NULL,
    `next_invoice_at` DATETIME(3) NULL,
    `paused_at` DATETIME(3) NULL,
    `paused_remaining_ms` BIGINT NULL,
    `cancel_requested_at` DATETIME(3) NULL,
    `ended_at` DATETIME(3) NULL,
    `status_reason` TEXT NULL,
    `pending_payment_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `catalog2_subscriptions_project_product_id_key`(`project_product_id`),
    INDEX `catalog2_subscriptions_status_next_invoice_at_idx`(`status`, `next_invoice_at`),
    INDEX `catalog2_subscriptions_company_id_idx`(`company_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `catalog2_subscription_events` (
    `id` VARCHAR(191) NOT NULL,
    `subscription_id` VARCHAR(191) NOT NULL,
    `from_status` VARCHAR(191) NULL,
    `to_status` VARCHAR(191) NOT NULL,
    `reason` TEXT NULL,
    `actor_user_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `catalog2_subscription_events_subscription_id_created_at_idx`(`subscription_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `catalog2_subscriptions` ADD CONSTRAINT `catalog2_subscriptions_project_product_id_fkey` FOREIGN KEY (`project_product_id`) REFERENCES `project_products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `catalog2_subscription_events` ADD CONSTRAINT `catalog2_subscription_events_subscription_id_fkey` FOREIGN KEY (`subscription_id`) REFERENCES `catalog2_subscriptions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

