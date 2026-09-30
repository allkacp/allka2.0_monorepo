-- AlterTable
ALTER TABLE `catalog2_task_steps` ADD COLUMN `completion_criteria` TEXT NULL,
    ADD COLUMN `execution_mode` VARCHAR(191) NULL,
    ADD COLUMN `purpose` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `catalog2_tasks` ADD COLUMN `requires_qualification` BOOLEAN NOT NULL DEFAULT false;

