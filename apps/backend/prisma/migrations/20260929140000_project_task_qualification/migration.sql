-- AlterTable
ALTER TABLE `catalog2_task_models` ADD COLUMN `qualification_min_approvals` INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN `qualification_mode` VARCHAR(191) NOT NULL DEFAULT 'any',
    ADD COLUMN `qualifier_user_id` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `catalog2_tasks` ADD COLUMN `qualification_min_approvals` INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN `qualification_mode` VARCHAR(191) NOT NULL DEFAULT 'any',
    ADD COLUMN `qualifier_user_id` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `project_tasks` ADD COLUMN `qualification_round` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `qualified_at` DATETIME(3) NULL,
    ADD COLUMN `qualified_by` VARCHAR(191) NULL,
    ADD COLUMN `requires_qualification` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE `project_task_qualifications` (
    `id` VARCHAR(191) NOT NULL,
    `project_task_id` VARCHAR(191) NOT NULL,
    `round` INTEGER NOT NULL DEFAULT 1,
    `decision` VARCHAR(191) NOT NULL,
    `comment` TEXT NULL,
    `actor_user_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `project_task_qualifications_project_task_id_created_at_idx`(`project_task_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `project_task_qualifications` ADD CONSTRAINT `project_task_qualifications_project_task_id_fkey` FOREIGN KEY (`project_task_id`) REFERENCES `project_tasks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

