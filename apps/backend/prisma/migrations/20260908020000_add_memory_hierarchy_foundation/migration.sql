-- CreateTable
CREATE TABLE `memories` (
    `id` VARCHAR(191) NOT NULL,
    `scope_type` VARCHAR(191) NOT NULL,
    `scope_id` VARCHAR(191) NOT NULL,
    `positive_instructions` LONGTEXT NULL,
    `negative_instructions` LONGTEXT NULL,
    `summary` LONGTEXT NULL,
    `is_archived` BOOLEAN NOT NULL DEFAULT false,
    `archived_at` DATETIME(3) NULL,
    `archived_by_user_id` VARCHAR(191) NULL,
    `created_by_user_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_by_user_id` VARCHAR(191) NULL,
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `memories_scope_type_scope_id_idx`(`scope_type`, `scope_id`),
    UNIQUE INDEX `memories_scope_type_scope_id_key`(`scope_type`, `scope_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `memory_files` (
    `id` VARCHAR(191) NOT NULL,
    `memory_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `file_name` VARCHAR(191) NOT NULL,
    `mime_type` VARCHAR(191) NULL,
    `size` INTEGER NOT NULL,
    `uploaded_by_user_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `archived_at` DATETIME(3) NULL,

    INDEX `memory_files_memory_id_idx`(`memory_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `memory_approved_task_records` (
    `id` VARCHAR(191) NOT NULL,
    `memory_id` VARCHAR(191) NOT NULL,
    `project_task_id` VARCHAR(191) NOT NULL,
    `approved_at` DATETIME(3) NOT NULL,
    `approved_by_user_id` VARCHAR(191) NULL,
    `approval_note` TEXT NULL,
    `idempotency_key` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `memory_approved_task_records_idempotency_key_key`(`idempotency_key`),
    INDEX `memory_approved_task_records_memory_id_idx`(`memory_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `memory_history_events` (
    `id` VARCHAR(191) NOT NULL,
    `memory_id` VARCHAR(191) NOT NULL,
    `section` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `actor_user_id` VARCHAR(191) NOT NULL,
    `before_json` LONGTEXT NULL,
    `after_json` LONGTEXT NULL,
    `reason` TEXT NULL,
    `origin` VARCHAR(191) NOT NULL DEFAULT 'manual',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `memory_history_events_memory_id_created_at_idx`(`memory_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `memory_files` ADD CONSTRAINT `memory_files_memory_id_fkey` FOREIGN KEY (`memory_id`) REFERENCES `memories`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `memory_approved_task_records` ADD CONSTRAINT `memory_approved_task_records_memory_id_fkey` FOREIGN KEY (`memory_id`) REFERENCES `memories`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `memory_approved_task_records` ADD CONSTRAINT `memory_approved_task_records_project_task_id_fkey` FOREIGN KEY (`project_task_id`) REFERENCES `project_tasks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `memory_history_events` ADD CONSTRAINT `memory_history_events_memory_id_fkey` FOREIGN KEY (`memory_id`) REFERENCES `memories`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
