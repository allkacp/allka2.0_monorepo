-- AlterTable
ALTER TABLE `catalog2_product_versions` ADD COLUMN `pricing_mode` VARCHAR(191) NOT NULL DEFAULT 'calculated',
    ADD COLUMN `manual_price` DOUBLE NULL,
    ADD COLUMN `manual_deadline_days` INTEGER NULL;

-- CreateTable
CREATE TABLE `catalog2_model_actions` (
    `id` VARCHAR(191) NOT NULL,
    `client_action_id` VARCHAR(191) NOT NULL,
    `kind` VARCHAR(191) NOT NULL,
    `model_id` INTEGER NOT NULL,
    `name_normalized` VARCHAR(191) NOT NULL,
    `duplicate_resolution` VARCHAR(191) NULL,
    `justification` TEXT NULL,
    `similar_ids_json` TEXT NULL,
    `authorized_by_user_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `catalog2_model_actions_client_action_id_key`(`client_action_id`),
    INDEX `catalog2_model_actions_kind_name_normalized_idx`(`kind`, `name_normalized`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
