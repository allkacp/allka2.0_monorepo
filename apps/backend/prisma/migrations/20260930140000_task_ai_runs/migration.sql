-- AlterTable
ALTER TABLE `catalog2_task_ai` ADD COLUMN `ai_mode` VARCHAR(191) NOT NULL DEFAULT 'rascunho',
    ADD COLUMN `instructions` TEXT NULL,
    ADD COLUMN `profile_id` VARCHAR(191) NULL,
    ADD COLUMN `prompt_version` INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE `project_task_deliverables` ADD COLUMN `ai_run_id` VARCHAR(191) NULL,
    ADD COLUMN `source` VARCHAR(191) NOT NULL DEFAULT 'humano';

-- CreateTable
CREATE TABLE `catalog2_ai_profiles` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `provider` VARCHAR(191) NOT NULL DEFAULT 'gemini',
    `model` VARCHAR(191) NOT NULL DEFAULT 'gemini-2.5-flash',
    `unit_cost_input_per_1k` DOUBLE NULL,
    `unit_cost_output_per_1k` DOUBLE NULL,
    `fixed_cost_per_run` DOUBLE NOT NULL DEFAULT 0,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'BRL',
    `allowed_actors` VARCHAR(191) NOT NULL DEFAULT 'leader,executor',
    `base_instructions` TEXT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `project_task_ai_runs` (
    `id` VARCHAR(191) NOT NULL,
    `project_task_id` VARCHAR(191) NOT NULL,
    `project_task_stage_id` VARCHAR(191) NULL,
    `mode` VARCHAR(191) NOT NULL,
    `profile_id` VARCHAR(191) NULL,
    `profile_name` VARCHAR(191) NULL,
    `provider` VARCHAR(191) NULL,
    `model` VARCHAR(191) NULL,
    `prompt_version` INTEGER NOT NULL DEFAULT 1,
    `adapter` VARCHAR(191) NOT NULL DEFAULT 'gemini',
    `instructions` TEXT NULL,
    `context_text` LONGTEXT NULL,
    `inputs_json` LONGTEXT NULL,
    `output_text` LONGTEXT NULL,
    `prompt_tokens` INTEGER NOT NULL DEFAULT 0,
    `completion_tokens` INTEGER NOT NULL DEFAULT 0,
    `cost` DOUBLE NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'BRL',
    `status` VARCHAR(191) NOT NULL DEFAULT 'gerada',
    `error_message` TEXT NULL,
    `missing_info` TEXT NULL,
    `deliverable_id` VARCHAR(191) NULL,
    `triggered_by_user_id` VARCHAR(191) NULL,
    `decided_by_user_id` VARCHAR(191) NULL,
    `decided_at` DATETIME(3) NULL,
    `decision_note` TEXT NULL,
    `duration_ms` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `project_task_ai_runs_project_task_id_created_at_idx`(`project_task_id`, `created_at`),
    INDEX `project_task_ai_runs_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `catalog2_task_ai` ADD CONSTRAINT `catalog2_task_ai_profile_id_fkey` FOREIGN KEY (`profile_id`) REFERENCES `catalog2_ai_profiles`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_task_ai_runs` ADD CONSTRAINT `project_task_ai_runs_project_task_id_fkey` FOREIGN KEY (`project_task_id`) REFERENCES `project_tasks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

