-- AlterTable
ALTER TABLE `product_feedback_work_item_links` ADD COLUMN `payload_hash` VARCHAR(191) NOT NULL,
    MODIFY `protocol` VARCHAR(191) NULL;
