-- AlterTable
ALTER TABLE `catalog2_task_models` ADD COLUMN `asset_revalidate_days` INTEGER NULL,
    ADD COLUMN `asset_rule` VARCHAR(191) NOT NULL DEFAULT 'first_only';

-- AlterTable
ALTER TABLE `catalog2_tasks` ADD COLUMN `asset_revalidate_days` INTEGER NULL,
    ADD COLUMN `asset_rule` VARCHAR(191) NOT NULL DEFAULT 'first_only';

-- CreateTable
CREATE TABLE `client_assets` (
    `id` VARCHAR(191) NOT NULL,
    `company_id` VARCHAR(191) NOT NULL,
    `asset_type` VARCHAR(191) NOT NULL,
    `platform` VARCHAR(191) NULL,
    `label` VARCHAR(191) NOT NULL,
    `identifier` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pendente',
    `last_validated_at` DATETIME(3) NULL,
    `validated_by_user_id` VARCHAR(191) NULL,
    `scope_confirmed` VARCHAR(191) NULL,
    `expires_at` DATETIME(3) NULL,
    `expiration_condition` VARCHAR(191) NULL,
    `change_reported_at` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `client_assets_company_id_status_idx`(`company_id`, `status`),
    UNIQUE INDEX `client_assets_company_id_asset_type_label_key`(`company_id`, `asset_type`, `label`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `client_asset_links` (
    `id` VARCHAR(191) NOT NULL,
    `asset_id` VARCHAR(191) NOT NULL,
    `project_id` VARCHAR(191) NULL,
    `project_product_id` VARCHAR(191) NULL,
    `project_task_id` VARCHAR(191) NULL,
    `catalog2_product_id` VARCHAR(191) NULL,
    `catalog2_task_id` VARCHAR(191) NULL,
    `is_required` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `client_asset_links_project_task_id_idx`(`project_task_id`),
    INDEX `client_asset_links_project_product_id_idx`(`project_product_id`),
    UNIQUE INDEX `client_asset_links_asset_id_project_task_id_key`(`asset_id`, `project_task_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `client_assets` ADD CONSTRAINT `client_assets_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client_asset_links` ADD CONSTRAINT `client_asset_links_asset_id_fkey` FOREIGN KEY (`asset_id`) REFERENCES `client_assets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

