-- AlterTable
ALTER TABLE `catalog2_step_models` ADD COLUMN `first_execution_only` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `skip_when_same_executor` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `catalog2_task_models` ADD COLUMN `executor_continuity` VARCHAR(191) NOT NULL DEFAULT 'not_allowed';

-- AlterTable
ALTER TABLE `catalog2_task_steps` ADD COLUMN `first_execution_only` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `skip_when_same_executor` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `catalog2_tasks` ADD COLUMN `executor_continuity` VARCHAR(191) NOT NULL DEFAULT 'not_allowed';

-- AlterTable
ALTER TABLE `project_tasks` ADD COLUMN `continuity_decided_at` DATETIME(3) NULL,
    ADD COLUMN `continuity_decided_by` VARCHAR(191) NULL,
    ADD COLUMN `continuity_prev_nomade_id` VARCHAR(191) NULL,
    ADD COLUMN `continuity_prev_task_id` VARCHAR(191) NULL,
    ADD COLUMN `continuity_status` VARCHAR(191) NULL,
    ADD COLUMN `executor_continuity` VARCHAR(191) NULL;

