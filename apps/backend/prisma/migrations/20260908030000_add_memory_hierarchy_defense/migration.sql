-- CreateTable
CREATE TABLE `ai_context_snapshots` (
    `id` VARCHAR(191) NOT NULL,
    `project_id` VARCHAR(191) NOT NULL,
    `requested_by_user_id` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL DEFAULT 'preview',
    `provider` VARCHAR(191) NULL,
    `model` VARCHAR(191) NULL,
    `checksum` VARCHAR(191) NOT NULL,
    `compiled_text` LONGTEXT NOT NULL,
    `structured_json` LONGTEXT NOT NULL,
    `missing_layers` TEXT NULL,
    `approved_task_refs` TEXT NULL,
    `response_text` LONGTEXT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'compiled',
    `create_client_action_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ai_context_snapshots_create_client_action_id_key`(`create_client_action_id`),
    INDEX `ai_context_snapshots_project_id_created_at_idx`(`project_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `hallucination_reports` (
    `id` VARCHAR(191) NOT NULL,
    `project_id` VARCHAR(191) NOT NULL,
    `reported_by_user_id` VARCHAR(191) NOT NULL,
    `snapshot_id` VARCHAR(191) NULL,
    `project_task_id` VARCHAR(191) NULL,
    `description` LONGTEXT NOT NULL,
    `questioned_response` LONGTEXT NULL,
    `category` VARCHAR(191) NOT NULL,
    `impact` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'novo',
    `assigned_admin_user_id` VARCHAR(191) NULL,
    `assigned_at` DATETIME(3) NULL,
    `suspected_origin_layer` VARCHAR(191) NULL,
    `suspected_origin_memory_id` VARCHAR(191) NULL,
    `diagnosis_note` LONGTEXT NULL,
    `resolution_note` LONGTEXT NULL,
    `resolved_by_user_id` VARCHAR(191) NULL,
    `resolved_at` DATETIME(3) NULL,
    `resolution_client_action_id` VARCHAR(191) NULL,
    `create_client_action_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `hallucination_reports_resolution_client_action_id_key`(`resolution_client_action_id`),
    UNIQUE INDEX `hallucination_reports_create_client_action_id_key`(`create_client_action_id`),
    INDEX `hallucination_reports_project_id_status_idx`(`project_id`, `status`),
    INDEX `hallucination_reports_status_created_at_idx`(`status`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `hallucination_report_files` (
    `id` VARCHAR(191) NOT NULL,
    `report_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `file_name` VARCHAR(191) NOT NULL,
    `mime_type` VARCHAR(191) NULL,
    `size` INTEGER NOT NULL,
    `uploaded_by_user_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `archived_at` DATETIME(3) NULL,

    INDEX `hallucination_report_files_report_id_idx`(`report_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `hallucination_report_events` (
    `id` VARCHAR(191) NOT NULL,
    `report_id` VARCHAR(191) NOT NULL,
    `event_type` VARCHAR(191) NOT NULL,
    `actor_user_id` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `metadata_json` LONGTEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `hallucination_report_events_report_id_created_at_idx`(`report_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ai_context_snapshots` ADD CONSTRAINT `ai_context_snapshots_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hallucination_reports` ADD CONSTRAINT `hallucination_reports_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hallucination_reports` ADD CONSTRAINT `hallucination_reports_snapshot_id_fkey` FOREIGN KEY (`snapshot_id`) REFERENCES `ai_context_snapshots`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hallucination_reports` ADD CONSTRAINT `hallucination_reports_project_task_id_fkey` FOREIGN KEY (`project_task_id`) REFERENCES `project_tasks`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hallucination_report_files` ADD CONSTRAINT `hallucination_report_files_report_id_fkey` FOREIGN KEY (`report_id`) REFERENCES `hallucination_reports`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hallucination_report_events` ADD CONSTRAINT `hallucination_report_events_report_id_fkey` FOREIGN KEY (`report_id`) REFERENCES `hallucination_reports`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
