-- AlterTable
ALTER TABLE `project_products` ADD COLUMN `package_instance_id` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `catalog2_packages` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_by_user_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `catalog2_package_items` (
    `id` VARCHAR(191) NOT NULL,
    `package_id` VARCHAR(191) NOT NULL,
    `catalog2_product_id` VARCHAR(191) NOT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,

    INDEX `catalog2_package_items_catalog2_product_id_idx`(`catalog2_product_id`),
    UNIQUE INDEX `catalog2_package_items_package_id_catalog2_product_id_key`(`package_id`, `catalog2_product_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `catalog2_dependency_rules` (
    `id` VARCHAR(191) NOT NULL,
    `package_id` VARCHAR(191) NULL,
    `dependent_product_id` VARCHAR(191) NOT NULL,
    `dependent_task_key` VARCHAR(191) NULL,
    `target_kind` VARCHAR(191) NOT NULL,
    `target_product_id` VARCHAR(191) NULL,
    `target_task_key` VARCHAR(191) NULL,
    `target_step_key` VARCHAR(191) NULL,
    `target_asset_type` VARCHAR(191) NULL,
    `behavior` VARCHAR(191) NOT NULL DEFAULT 'block_start',
    `note` TEXT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `catalog2_dependency_rules_package_id_idx`(`package_id`),
    INDEX `catalog2_dependency_rules_dependent_product_id_idx`(`dependent_product_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `project_packages` (
    `id` VARCHAR(191) NOT NULL,
    `project_id` VARCHAR(191) NOT NULL,
    `package_id` VARCHAR(191) NOT NULL,
    `name_snapshot` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `project_packages_project_id_idx`(`project_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `project_dependency_rules` (
    `id` VARCHAR(191) NOT NULL,
    `project_id` VARCHAR(191) NOT NULL,
    `project_package_id` VARCHAR(191) NULL,
    `task_id` VARCHAR(191) NOT NULL,
    `source_rule_id` VARCHAR(191) NULL,
    `target_kind` VARCHAR(191) NOT NULL,
    `target_task_id` VARCHAR(191) NULL,
    `target_stage_key` VARCHAR(191) NULL,
    `target_project_product_id` VARCHAR(191) NULL,
    `target_product_id` VARCHAR(191) NULL,
    `target_asset_type` VARCHAR(191) NULL,
    `target_missing` BOOLEAN NOT NULL DEFAULT false,
    `behavior` VARCHAR(191) NOT NULL DEFAULT 'block_start',
    `reason` TEXT NOT NULL,
    `alerted_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `project_dependency_rules_task_id_idx`(`task_id`),
    INDEX `project_dependency_rules_project_id_idx`(`project_id`),
    INDEX `project_dependency_rules_target_task_id_idx`(`target_task_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `catalog2_package_items` ADD CONSTRAINT `catalog2_package_items_package_id_fkey` FOREIGN KEY (`package_id`) REFERENCES `catalog2_packages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `catalog2_package_items` ADD CONSTRAINT `catalog2_package_items_catalog2_product_id_fkey` FOREIGN KEY (`catalog2_product_id`) REFERENCES `catalog2_products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `catalog2_dependency_rules` ADD CONSTRAINT `catalog2_dependency_rules_package_id_fkey` FOREIGN KEY (`package_id`) REFERENCES `catalog2_packages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `catalog2_dependency_rules` ADD CONSTRAINT `catalog2_dependency_rules_dependent_product_id_fkey` FOREIGN KEY (`dependent_product_id`) REFERENCES `catalog2_products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `catalog2_dependency_rules` ADD CONSTRAINT `catalog2_dependency_rules_target_product_id_fkey` FOREIGN KEY (`target_product_id`) REFERENCES `catalog2_products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_dependency_rules` ADD CONSTRAINT `project_dependency_rules_task_id_fkey` FOREIGN KEY (`task_id`) REFERENCES `project_tasks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

