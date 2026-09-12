-- AlterTable
ALTER TABLE `catalog2_products` ADD COLUMN `merch_badge_priority` INTEGER NULL,
    ADD COLUMN `merch_is_featured` BOOLEAN NULL,
    ADD COLUMN `merch_is_launch` BOOLEAN NULL,
    ADD COLUMN `merch_is_new` BOOLEAN NULL,
    ADD COLUMN `merch_is_promotion` BOOLEAN NULL,
    ADD COLUMN `merch_promotion_text` TEXT NULL,
    ADD COLUMN `merch_promotion_valid_until` DATETIME(3) NULL;

