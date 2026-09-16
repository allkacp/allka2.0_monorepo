-- AlterTable
ALTER TABLE `catalog2_products` ADD COLUMN `inactivation_cancelled_at` DATETIME(3) NULL,
    ADD COLUMN `inactivation_effective_at` DATETIME(3) NULL,
    ADD COLUMN `inactivation_note` TEXT NULL,
    ADD COLUMN `inactivation_processed_at` DATETIME(3) NULL,
    ADD COLUMN `inactivation_scheduled_at` DATETIME(3) NULL,
    ADD COLUMN `inactivation_scheduled_by_user_id` VARCHAR(191) NULL;
