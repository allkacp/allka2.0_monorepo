-- AlterTable
ALTER TABLE `catalog2_ai_profiles` ADD COLUMN `is_system` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `knowledge_json` TEXT NULL,
    ADD COLUMN `purpose` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `catalog2_product_versions` ADD COLUMN `requires_connections` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `project_dependency_rules` ADD COLUMN `connection_dep_kind` VARCHAR(191) NULL,
    ADD COLUMN `dependent_stage_key` VARCHAR(191) NULL,
    ADD COLUMN `target_connection_req_id` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `project_tasks` ADD COLUMN `external_pause_started_at` DATETIME(3) NULL,
    ADD COLUMN `external_pause_total_minutes` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `original_due_date` DATETIME(3) NULL,
    ADD COLUMN `status_before_external_pause` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `connection_types` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `key` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `icon` VARCHAR(191) NULL,
    `provider` VARCHAR(191) NULL,
    `integration_key` VARCHAR(191) NULL,
    `allowed_methods_json` TEXT NOT NULL,
    `permission_levels_json` TEXT NOT NULL,
    `supports_auto_validation` BOOLEAN NOT NULL DEFAULT false,
    `default_instructions` TEXT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `connection_types_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `catalog2_connection_requirements` (
    `id` VARCHAR(191) NOT NULL,
    `version_id` VARCHAR(191) NOT NULL,
    `connection_type_id` INTEGER NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NULL,
    `when_needed` VARCHAR(191) NOT NULL DEFAULT 'before_task',
    `when_task_key` VARCHAR(191) NULL,
    `when_step_key` VARCHAR(191) NULL,
    `condition_text` TEXT NULL,
    `obligation` VARCHAR(191) NOT NULL DEFAULT 'required',
    `method` VARCHAR(191) NOT NULL DEFAULT 'oauth',
    `permission_level` VARCHAR(191) NOT NULL DEFAULT 'read_write',
    `pending_behavior` VARCHAR(191) NOT NULL DEFAULT 'block_dependents',
    `reason` TEXT NULL,
    `instructions` TEXT NULL,
    `default_grant_scope` VARCHAR(191) NOT NULL DEFAULT 'project',
    `validation_mode` VARCHAR(191) NOT NULL DEFAULT 'manual',
    `asset_rule` VARCHAR(191) NOT NULL DEFAULT 'first_only',
    `revalidate_days` INTEGER NULL,
    `light_check` BOOLEAN NOT NULL DEFAULT false,
    `reminder_interval_hours` INTEGER NULL,
    `reminder_limit` INTEGER NULL,
    `escalate_after_reminders` INTEGER NULL,
    `visible_to_client` BOOLEAN NOT NULL DEFAULT true,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `catalog2_connection_requirements_version_id_sort_order_idx`(`version_id`, `sort_order`),
    UNIQUE INDEX `catalog2_connection_requirements_version_id_key_key`(`version_id`, `key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `catalog2_connection_dependencies` (
    `id` VARCHAR(191) NOT NULL,
    `requirement_id` VARCHAR(191) NOT NULL,
    `task_key` VARCHAR(191) NOT NULL,
    `step_key` VARCHAR(191) NULL,
    `kind` VARCHAR(191) NOT NULL DEFAULT 'start',
    `dep_key` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `catalog2_connection_dependencies_requirement_id_dep_key_key`(`requirement_id`, `dep_key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `client_connections` (
    `id` VARCHAR(191) NOT NULL,
    `company_id` VARCHAR(191) NOT NULL,
    `connection_type_id` INTEGER NOT NULL,
    `provider` VARCHAR(191) NULL,
    `method` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `account_label` VARCHAR(191) NULL,
    `external_id` VARCHAR(191) NULL,
    `scopes_json` TEXT NULL,
    `permission_level` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'awaiting_submission',
    `owner_user_id` VARCHAR(191) NULL,
    `provided_by_user_id` VARCHAR(191) NULL,
    `connected_by_user_id` VARCHAR(191) NULL,
    `validated_by_user_id` VARCHAR(191) NULL,
    `validated_by_integration` VARCHAR(191) NULL,
    `last_validated_at` DATETIME(3) NULL,
    `next_revalidation_at` DATETIME(3) NULL,
    `expires_at` DATETIME(3) NULL,
    `revoked_at` DATETIME(3) NULL,
    `revoked_by_user_id` VARCHAR(191) NULL,
    `revoke_reason` TEXT NULL,
    `secret_ref` VARCHAR(191) NULL,
    `last_problem` TEXT NULL,
    `correction_needed` TEXT NULL,
    `evidence` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `client_connections_company_id_status_idx`(`company_id`, `status`),
    INDEX `client_connections_company_id_connection_type_id_idx`(`company_id`, `connection_type_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `connection_secrets` (
    `id` VARCHAR(191) NOT NULL,
    `connection_id` VARCHAR(191) NOT NULL,
    `ciphertext` TEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `rotated_at` DATETIME(3) NULL,
    `revoked_at` DATETIME(3) NULL,

    UNIQUE INDEX `connection_secrets_connection_id_key`(`connection_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `client_connection_grants` (
    `id` VARCHAR(191) NOT NULL,
    `connection_id` VARCHAR(191) NOT NULL,
    `project_id` VARCHAR(191) NOT NULL,
    `scope` VARCHAR(191) NOT NULL,
    `project_task_id` VARCHAR(191) NULL,
    `granted_by_user_id` VARCHAR(191) NULL,
    `revoked_at` DATETIME(3) NULL,
    `revoked_by_user_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `client_connection_grants_connection_id_project_id_idx`(`connection_id`, `project_id`),
    INDEX `client_connection_grants_project_id_project_task_id_idx`(`project_id`, `project_task_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `client_connection_validations` (
    `id` VARCHAR(191) NOT NULL,
    `connection_id` VARCHAR(191) NOT NULL,
    `mode` VARCHAR(191) NOT NULL,
    `result` VARCHAR(191) NOT NULL,
    `actor_user_id` VARCHAR(191) NULL,
    `actor_integration` VARCHAR(191) NULL,
    `evidence` TEXT NULL,
    `problem` TEXT NULL,
    `correction_needed` TEXT NULL,
    `next_revalidation_at` DATETIME(3) NULL,
    `affected_tasks_json` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `client_connection_validations_connection_id_created_at_idx`(`connection_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `project_connection_requirements` (
    `id` VARCHAR(191) NOT NULL,
    `project_id` VARCHAR(191) NOT NULL,
    `project_product_id` VARCHAR(191) NOT NULL,
    `requirement_id` VARCHAR(191) NOT NULL,
    `connection_type_id` INTEGER NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `connection_id` VARCHAR(191) NULL,
    `handling` VARCHAR(191) NOT NULL DEFAULT 'later',
    `status` VARCHAR(191) NOT NULL DEFAULT 'awaiting_submission',
    `responsible_user_id` VARCHAR(191) NULL,
    `responsible_name` VARCHAR(191) NULL,
    `invited_email` VARCHAR(191) NULL,
    `draft_json` TEXT NULL,
    `dispensed_reason` TEXT NULL,
    `last_request_at` DATETIME(3) NULL,
    `last_reminder_at` DATETIME(3) NULL,
    `reminder_count` INTEGER NOT NULL DEFAULT 0,
    `escalated_at` DATETIME(3) NULL,
    `resolved_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `project_connection_requirements_project_id_status_idx`(`project_id`, `status`),
    UNIQUE INDEX `project_connection_requirements_project_product_id_requireme_key`(`project_product_id`, `requirement_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `project_task_external_blocks` (
    `id` VARCHAR(191) NOT NULL,
    `project_id` VARCHAR(191) NOT NULL,
    `project_task_id` VARCHAR(191) NOT NULL,
    `stage_key` VARCHAR(191) NULL,
    `project_connection_req_id` VARCHAR(191) NULL,
    `connection_id` VARCHAR(191) NULL,
    `reason` TEXT NOT NULL,
    `responsible_party` VARCHAR(191) NOT NULL DEFAULT 'client',
    `responsible_user_id` VARCHAR(191) NULL,
    `detected_by` VARCHAR(191) NULL,
    `started_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `resolved_at` DATETIME(3) NULL,
    `resolved_by` VARCHAR(191) NULL,
    `reminders_sent` INTEGER NOT NULL DEFAULT 0,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `blocked_minutes` INTEGER NULL,
    `deadline_impact_minutes` INTEGER NULL,
    `affects_critical_path` BOOLEAN NOT NULL DEFAULT true,
    `previous_status` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `project_task_external_blocks_project_task_id_resolved_at_idx`(`project_task_id`, `resolved_at`),
    INDEX `project_task_external_blocks_project_id_resolved_at_idx`(`project_id`, `resolved_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `connection_events` (
    `id` VARCHAR(191) NOT NULL,
    `connection_id` VARCHAR(191) NULL,
    `project_connection_req_id` VARCHAR(191) NULL,
    `company_id` VARCHAR(191) NULL,
    `project_id` VARCHAR(191) NULL,
    `project_task_id` VARCHAR(191) NULL,
    `kind` VARCHAR(191) NOT NULL,
    `actor_user_id` VARCHAR(191) NULL,
    `actor_role` VARCHAR(191) NULL,
    `message` TEXT NOT NULL,
    `detail_json` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `connection_events_connection_id_created_at_idx`(`connection_id`, `created_at`),
    INDEX `connection_events_project_id_created_at_idx`(`project_id`, `created_at`),
    INDEX `connection_events_project_connection_req_id_idx`(`project_connection_req_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `connection_reminders` (
    `id` VARCHAR(191) NOT NULL,
    `project_connection_req_id` VARCHAR(191) NOT NULL,
    `channel` VARCHAR(191) NOT NULL DEFAULT 'alert',
    `recipient_user_id` VARCHAR(191) NULL,
    `escalated` BOOLEAN NOT NULL DEFAULT false,
    `message` TEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `connection_reminders_project_connection_req_id_created_at_idx`(`project_connection_req_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `catalog2_connection_requirements` ADD CONSTRAINT `catalog2_connection_requirements_version_id_fkey` FOREIGN KEY (`version_id`) REFERENCES `catalog2_product_versions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `catalog2_connection_requirements` ADD CONSTRAINT `catalog2_connection_requirements_connection_type_id_fkey` FOREIGN KEY (`connection_type_id`) REFERENCES `connection_types`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `catalog2_connection_dependencies` ADD CONSTRAINT `catalog2_connection_dependencies_requirement_id_fkey` FOREIGN KEY (`requirement_id`) REFERENCES `catalog2_connection_requirements`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client_connections` ADD CONSTRAINT `client_connections_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client_connections` ADD CONSTRAINT `client_connections_connection_type_id_fkey` FOREIGN KEY (`connection_type_id`) REFERENCES `connection_types`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client_connection_grants` ADD CONSTRAINT `client_connection_grants_connection_id_fkey` FOREIGN KEY (`connection_id`) REFERENCES `client_connections`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client_connection_validations` ADD CONSTRAINT `client_connection_validations_connection_id_fkey` FOREIGN KEY (`connection_id`) REFERENCES `client_connections`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

