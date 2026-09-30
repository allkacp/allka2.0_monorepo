-- AlterTable
ALTER TABLE `catalog2_task_steps` ADD COLUMN `step_model_id` INTEGER NULL,
    ADD COLUMN `step_model_revision` INTEGER NULL;

-- AlterTable
ALTER TABLE `catalog2_tasks` ADD COLUMN `task_model_id` INTEGER NULL,
    ADD COLUMN `task_model_revision` INTEGER NULL;

-- CreateTable
CREATE TABLE `catalog2_task_models` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `execution_mode` VARCHAR(191) NOT NULL DEFAULT 'humano',
    `specialty_id` VARCHAR(191) NULL,
    `estimated_minutes` INTEGER NULL,
    `questionnaire_id` VARCHAR(191) NULL,
    `is_conditional` BOOLEAN NOT NULL DEFAULT false,
    `requires_client_approval` BOOLEAN NOT NULL DEFAULT false,
    `requires_qualification` BOOLEAN NOT NULL DEFAULT false,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `revision` INTEGER NOT NULL DEFAULT 1,
    `signature` VARCHAR(191) NOT NULL,
    `created_by_user_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `catalog2_task_models_signature_idx`(`signature`),
    INDEX `catalog2_task_models_is_active_idx`(`is_active`),
    INDEX `catalog2_task_models_specialty_id_idx`(`specialty_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `catalog2_step_models` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `completion_criteria` TEXT NULL,
    `purpose` VARCHAR(191) NOT NULL DEFAULT 'execucao',
    `execution_mode` VARCHAR(191) NOT NULL DEFAULT 'humano',
    `specialty_id` VARCHAR(191) NULL,
    `estimated_minutes` INTEGER NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `revision` INTEGER NOT NULL DEFAULT 1,
    `signature` VARCHAR(191) NOT NULL,
    `created_by_user_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `catalog2_step_models_signature_idx`(`signature`),
    INDEX `catalog2_step_models_is_active_idx`(`is_active`),
    INDEX `catalog2_step_models_specialty_id_idx`(`specialty_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `catalog2_task_model_steps` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `task_model_id` INTEGER NOT NULL,
    `step_model_id` INTEGER NOT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,

    INDEX `catalog2_task_model_steps_step_model_id_idx`(`step_model_id`),
    UNIQUE INDEX `catalog2_task_model_steps_task_model_id_step_model_id_key`(`task_model_id`, `step_model_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `catalog2_tasks` ADD CONSTRAINT `catalog2_tasks_task_model_id_fkey` FOREIGN KEY (`task_model_id`) REFERENCES `catalog2_task_models`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `catalog2_task_steps` ADD CONSTRAINT `catalog2_task_steps_step_model_id_fkey` FOREIGN KEY (`step_model_id`) REFERENCES `catalog2_step_models`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `catalog2_task_models` ADD CONSTRAINT `catalog2_task_models_specialty_id_fkey` FOREIGN KEY (`specialty_id`) REFERENCES `catalog2_specialties`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `catalog2_task_models` ADD CONSTRAINT `catalog2_task_models_questionnaire_id_fkey` FOREIGN KEY (`questionnaire_id`) REFERENCES `catalog2_questionnaires`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `catalog2_step_models` ADD CONSTRAINT `catalog2_step_models_specialty_id_fkey` FOREIGN KEY (`specialty_id`) REFERENCES `catalog2_specialties`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `catalog2_task_model_steps` ADD CONSTRAINT `catalog2_task_model_steps_task_model_id_fkey` FOREIGN KEY (`task_model_id`) REFERENCES `catalog2_task_models`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `catalog2_task_model_steps` ADD CONSTRAINT `catalog2_task_model_steps_step_model_id_fkey` FOREIGN KEY (`step_model_id`) REFERENCES `catalog2_step_models`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

