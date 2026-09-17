-- AlterTable
ALTER TABLE `catalog2_tasks` ADD COLUMN `questionnaire_id` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `catalog2_questionnaires` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `created_by_user_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `catalog2_questionnaires_name_idx`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `catalog2_questionnaire_questions` (
    `id` VARCHAR(191) NOT NULL,
    `questionnaire_id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `is_required` BOOLEAN NOT NULL DEFAULT true,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `catalog2_questionnaire_questions_questionnaire_id_sort_order_idx`(`questionnaire_id`, `sort_order`),
    UNIQUE INDEX `catalog2_questionnaire_questions_questionnaire_id_key_key`(`questionnaire_id`, `key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `catalog2_tasks_questionnaire_id_idx` ON `catalog2_tasks`(`questionnaire_id`);

-- AddForeignKey
ALTER TABLE `catalog2_questionnaire_questions` ADD CONSTRAINT `catalog2_questionnaire_questions_questionnaire_id_fkey` FOREIGN KEY (`questionnaire_id`) REFERENCES `catalog2_questionnaires`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `catalog2_tasks` ADD CONSTRAINT `catalog2_tasks_questionnaire_id_fkey` FOREIGN KEY (`questionnaire_id`) REFERENCES `catalog2_questionnaires`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
