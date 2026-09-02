-- AlterTable
ALTER TABLE `hallucination_reports` ADD COLUMN `launch_execution_id` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `launch_sessions` (
    `id` VARCHAR(191) NOT NULL,
    `project_id` VARCHAR(191) NOT NULL,
    `created_by_user_id` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'coletando_informacoes',
    `current_version_id` VARCHAR(191) NULL,
    `approved_version_id` VARCHAR(191) NULL,
    `pending_questions_json` LONGTEXT NULL,
    `plan_duration_months` INTEGER NULL,
    `plan_duration_days_custom` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `launch_sessions_project_id_idx`(`project_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `launch_session_participants` (
    `id` VARCHAR(191) NOT NULL,
    `session_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `added_by_user_id` VARCHAR(191) NOT NULL,
    `added_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `launch_session_participants_session_id_user_id_key`(`session_id`, `user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `launch_messages` (
    `id` VARCHAR(191) NOT NULL,
    `session_id` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NOT NULL,
    `actor_user_id` VARCHAR(191) NULL,
    `content` LONGTEXT NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ok',
    `execution_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `launch_messages_session_id_created_at_idx`(`session_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `launch_message_files` (
    `id` VARCHAR(191) NOT NULL,
    `message_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `file_name` VARCHAR(191) NOT NULL,
    `mime_type` VARCHAR(191) NULL,
    `size` INTEGER NOT NULL,
    `uploaded_by_user_id` VARCHAR(191) NOT NULL,
    `extracted_text` LONGTEXT NULL,
    `extracted_text_truncated` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `archived_at` DATETIME(3) NULL,

    INDEX `launch_message_files_message_id_idx`(`message_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `launch_proposal_versions` (
    `id` VARCHAR(191) NOT NULL,
    `session_id` VARCHAR(191) NOT NULL,
    `version_number` INTEGER NOT NULL,
    `source` VARCHAR(191) NOT NULL,
    `based_on_version_id` VARCHAR(191) NULL,
    `structured_json` LONGTEXT NOT NULL,
    `created_by_user_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `execution_id` VARCHAR(191) NULL,

    UNIQUE INDEX `launch_proposal_versions_session_id_version_number_key`(`session_id`, `version_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `launch_generation_executions` (
    `id` VARCHAR(191) NOT NULL,
    `session_id` VARCHAR(191) NOT NULL,
    `requested_by_user_id` VARCHAR(191) NOT NULL,
    `snapshot_id` VARCHAR(191) NULL,
    `based_on_version_id` VARCHAR(191) NULL,
    `provider` VARCHAR(191) NULL,
    `model` VARCHAR(191) NULL,
    `checksum` VARCHAR(191) NULL,
    `prompt_sent` LONGTEXT NULL,
    `response_json` LONGTEXT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `error_message` TEXT NULL,
    `client_action_id` VARCHAR(191) NOT NULL,
    `started_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `finished_at` DATETIME(3) NULL,

    UNIQUE INDEX `launch_generation_executions_client_action_id_key`(`client_action_id`),
    INDEX `launch_generation_executions_session_id_started_at_idx`(`session_id`, `started_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `hallucination_reports` ADD CONSTRAINT `hallucination_reports_launch_execution_id_fkey` FOREIGN KEY (`launch_execution_id`) REFERENCES `launch_generation_executions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `launch_sessions` ADD CONSTRAINT `launch_sessions_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `launch_session_participants` ADD CONSTRAINT `launch_session_participants_session_id_fkey` FOREIGN KEY (`session_id`) REFERENCES `launch_sessions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `launch_messages` ADD CONSTRAINT `launch_messages_session_id_fkey` FOREIGN KEY (`session_id`) REFERENCES `launch_sessions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `launch_message_files` ADD CONSTRAINT `launch_message_files_message_id_fkey` FOREIGN KEY (`message_id`) REFERENCES `launch_messages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `launch_proposal_versions` ADD CONSTRAINT `launch_proposal_versions_session_id_fkey` FOREIGN KEY (`session_id`) REFERENCES `launch_sessions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `launch_generation_executions` ADD CONSTRAINT `launch_generation_executions_session_id_fkey` FOREIGN KEY (`session_id`) REFERENCES `launch_sessions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `launch_generation_executions` ADD CONSTRAINT `launch_generation_executions_snapshot_id_fkey` FOREIGN KEY (`snapshot_id`) REFERENCES `ai_context_snapshots`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
