-- AlterTable
ALTER TABLE `project_products` ADD COLUMN `origin_launch_version_id` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `project_tasks` ADD COLUMN `launch_ai_snapshot_json` LONGTEXT NULL,
    ADD COLUMN `launch_materialization_id` VARCHAR(191) NULL,
    ADD COLUMN `launch_session_id` VARCHAR(191) NULL,
    ADD COLUMN `launch_version_id` VARCHAR(191) NULL,
    ADD COLUMN `required_specialty_id` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `launch_materializations` (
    `id` VARCHAR(191) NOT NULL,
    `session_id` VARCHAR(191) NOT NULL,
    `version_id` VARCHAR(191) NOT NULL,
    `mode` VARCHAR(191) NOT NULL,
    `requested_by_user_id` VARCHAR(191) NOT NULL,
    `client_action_id` VARCHAR(191) NOT NULL,
    `created_task_ids_json` LONGTEXT NOT NULL,
    `summary_json` LONGTEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `launch_materializations_version_id_key`(`version_id`),
    UNIQUE INDEX `launch_materializations_client_action_id_key`(`client_action_id`),
    INDEX `launch_materializations_session_id_idx`(`session_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `task_dependencies` (
    `id` VARCHAR(191) NOT NULL,
    `project_id` VARCHAR(191) NOT NULL,
    `task_id` VARCHAR(191) NOT NULL,
    `depends_on_task_id` VARCHAR(191) NOT NULL,
    `created_by_user_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `task_dependencies_depends_on_task_id_idx`(`depends_on_task_id`),
    INDEX `task_dependencies_project_id_idx`(`project_id`),
    UNIQUE INDEX `task_dependencies_task_id_depends_on_task_id_key`(`task_id`, `depends_on_task_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `task_release_triggers` (
    `id` VARCHAR(191) NOT NULL,
    `task_id` VARCHAR(191) NOT NULL,
    `trigger_type` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `scheduled_at` DATETIME(3) NULL,
    `scheduled_timezone` VARCHAR(191) NULL,
    `payment_reference_type` VARCHAR(191) NULL,
    `payment_reference_id` VARCHAR(191) NULL,
    `satisfied_by_user_id` VARCHAR(191) NULL,
    `satisfied_at` DATETIME(3) NULL,
    `satisfaction_note` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `task_release_triggers_task_id_idx`(`task_id`),
    INDEX `task_release_triggers_trigger_type_status_scheduled_at_idx`(`trigger_type`, `status`, `scheduled_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `task_dependency_overrides` (
    `id` VARCHAR(191) NOT NULL,
    `task_id` VARCHAR(191) NOT NULL,
    `reason` TEXT NOT NULL,
    `authorized_by_user_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `task_dependency_overrides_task_id_idx`(`task_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `task_release_events` (
    `id` VARCHAR(191) NOT NULL,
    `task_id` VARCHAR(191) NOT NULL,
    `event_type` VARCHAR(191) NOT NULL,
    `actor_user_id` VARCHAR(191) NULL,
    `description` TEXT NOT NULL,
    `metadata_json` LONGTEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `task_release_events_task_id_created_at_idx`(`task_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `project_products_origin_launch_version_id_key` ON `project_products`(`origin_launch_version_id`);

-- AddForeignKey
ALTER TABLE `project_tasks` ADD CONSTRAINT `project_tasks_required_specialty_id_fkey` FOREIGN KEY (`required_specialty_id`) REFERENCES `specialties`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `launch_materializations` ADD CONSTRAINT `launch_materializations_session_id_fkey` FOREIGN KEY (`session_id`) REFERENCES `launch_sessions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `launch_materializations` ADD CONSTRAINT `launch_materializations_version_id_fkey` FOREIGN KEY (`version_id`) REFERENCES `launch_proposal_versions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `task_dependencies` ADD CONSTRAINT `task_dependencies_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `task_dependencies` ADD CONSTRAINT `task_dependencies_task_id_fkey` FOREIGN KEY (`task_id`) REFERENCES `project_tasks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `task_dependencies` ADD CONSTRAINT `task_dependencies_depends_on_task_id_fkey` FOREIGN KEY (`depends_on_task_id`) REFERENCES `project_tasks`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `task_release_triggers` ADD CONSTRAINT `task_release_triggers_task_id_fkey` FOREIGN KEY (`task_id`) REFERENCES `project_tasks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `task_dependency_overrides` ADD CONSTRAINT `task_dependency_overrides_task_id_fkey` FOREIGN KEY (`task_id`) REFERENCES `project_tasks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `task_release_events` ADD CONSTRAINT `task_release_events_task_id_fkey` FOREIGN KEY (`task_id`) REFERENCES `project_tasks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
