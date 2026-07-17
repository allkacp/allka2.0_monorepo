-- AlterTable
ALTER TABLE `agencies` ADD COLUMN `address` VARCHAR(191) NULL,
    ADD COLUMN `city` VARCHAR(191) NULL,
    ADD COLUMN `neighborhood` VARCHAR(191) NULL,
    ADD COLUMN `number` VARCHAR(191) NULL,
    ADD COLUMN `pix_key` VARCHAR(191) NULL,
    ADD COLUMN `pix_key_type` VARCHAR(191) NULL,
    ADD COLUMN `state` VARCHAR(191) NULL,
    ADD COLUMN `zip_code` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `companies` ADD COLUMN `city` VARCHAR(191) NULL,
    ADD COLUMN `neighborhood` VARCHAR(191) NULL,
    ADD COLUMN `number` VARCHAR(191) NULL,
    ADD COLUMN `pix_key` VARCHAR(191) NULL,
    ADD COLUMN `pix_key_type` VARCHAR(191) NULL,
    ADD COLUMN `state` VARCHAR(191) NULL,
    ADD COLUMN `zip_code` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `nomades` ADD COLUMN `address` VARCHAR(191) NULL,
    ADD COLUMN `city` VARCHAR(191) NULL,
    ADD COLUMN `neighborhood` VARCHAR(191) NULL,
    ADD COLUMN `number` VARCHAR(191) NULL,
    ADD COLUMN `pix_key` VARCHAR(191) NULL,
    ADD COLUMN `pix_key_type` VARCHAR(191) NULL,
    ADD COLUMN `state` VARCHAR(191) NULL,
    ADD COLUMN `zip_code` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `partner_profiles` ADD COLUMN `address` VARCHAR(191) NULL,
    ADD COLUMN `city` VARCHAR(191) NULL,
    ADD COLUMN `neighborhood` VARCHAR(191) NULL,
    ADD COLUMN `number` VARCHAR(191) NULL,
    ADD COLUMN `state` VARCHAR(191) NULL,
    ADD COLUMN `zip_code` VARCHAR(191) NULL;

