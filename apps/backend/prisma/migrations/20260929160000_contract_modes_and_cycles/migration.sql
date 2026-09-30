-- AlterTable
ALTER TABLE `catalog2_product_versions` ADD COLUMN `accepts_one_time` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `accepts_recurring` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `has_initial_implementation` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `implementation_blocks_operation` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `implementation_rule` VARCHAR(191) NOT NULL DEFAULT 'first_only',
    ADD COLUMN `sell_mode` VARCHAR(191) NOT NULL DEFAULT 'standalone';

-- AlterTable
ALTER TABLE `catalog2_task_models` ADD COLUMN `cycle_type` VARCHAR(191) NOT NULL DEFAULT 'recorrente',
    ADD COLUMN `repeat_every_cycles` INTEGER NULL,
    ADD COLUMN `repeat_rule` VARCHAR(191) NOT NULL DEFAULT 'all_cycles';

-- AlterTable
ALTER TABLE `catalog2_tasks` ADD COLUMN `cycle_type` VARCHAR(191) NOT NULL DEFAULT 'recorrente',
    ADD COLUMN `repeat_every_cycles` INTEGER NULL,
    ADD COLUMN `repeat_rule` VARCHAR(191) NOT NULL DEFAULT 'all_cycles';

-- AlterTable
ALTER TABLE `project_products` ADD COLUMN `contract_mode` VARCHAR(191) NULL,
    ADD COLUMN `first_contract` BOOLEAN NULL,
    ADD COLUMN `revalidation_reason` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `project_tasks` ADD COLUMN `cycle_kind` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `project_decision_logs` (
    `id` VARCHAR(191) NOT NULL,
    `project_id` VARCHAR(191) NOT NULL,
    `project_product_id` VARCHAR(191) NULL,
    `project_task_id` VARCHAR(191) NULL,
    `kind` VARCHAR(191) NOT NULL,
    `message` TEXT NOT NULL,
    `detail_json` TEXT NULL,
    `actor_user_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `project_decision_logs_project_id_created_at_idx`(`project_id`, `created_at`),
    INDEX `project_decision_logs_project_task_id_idx`(`project_task_id`),
    INDEX `project_decision_logs_project_product_id_idx`(`project_product_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `project_decision_logs` ADD CONSTRAINT `project_decision_logs_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

