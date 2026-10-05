-- AlterTable
ALTER TABLE `catalog2_addon_effects` ADD COLUMN `effort_scale_by_quantity` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `catalog2_addons` ADD COLUMN `addon_type` VARCHAR(191) NOT NULL DEFAULT 'checkbox',
    ADD COLUMN `auto_quote_limit` INTEGER NULL,
    ADD COLUMN `qty_max` INTEGER NULL,
    ADD COLUMN `qty_min` INTEGER NULL,
    ADD COLUMN `qty_step` INTEGER NULL,
    ADD COLUMN `unit_base_cost` DOUBLE NULL,
    ADD COLUMN `unit_deadline_days` DOUBLE NULL,
    ADD COLUMN `unit_label` VARCHAR(191) NULL,
    ADD COLUMN `unit_minutes` INTEGER NULL;

-- AlterTable
ALTER TABLE `catalog2_ai_profiles` ADD COLUMN `expected_runs` INTEGER NULL,
    ADD COLUMN `review_limit` INTEGER NULL,
    ADD COLUMN `unit_tokens` INTEGER NOT NULL DEFAULT 1000;

-- AlterTable
ALTER TABLE `catalog2_conditions` ADD COLUMN `effort_scale_by_quantity` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `catalog2_connection_requirements` ADD COLUMN `activation_mode` VARCHAR(191) NOT NULL DEFAULT 'manual';

-- AlterTable
ALTER TABLE `catalog2_dependency_rules` ADD COLUMN `allow_partial_start` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `condition_mode` VARCHAR(191) NOT NULL DEFAULT 'always',
    ADD COLUMN `dependent_step_key` VARCHAR(191) NULL,
    ADD COLUMN `input_label` VARCHAR(191) NULL,
    ADD COLUMN `provides_input` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `stage_gate` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `catalog2_option_effects` ADD COLUMN `effort_scale_by_quantity` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `catalog2_task_ai` ADD COLUMN `est_runs` INTEGER NULL;

-- AlterTable
ALTER TABLE `catalog2_task_models` ADD COLUMN `qualification_cost_mode` VARCHAR(191) NOT NULL DEFAULT 'inherit',
    ADD COLUMN `qualification_fixed_amount` DOUBLE NULL,
    ADD COLUMN `qualification_hourly_rate` DOUBLE NULL,
    ADD COLUMN `qualification_minutes` INTEGER NULL,
    ADD COLUMN `qualification_percent` DOUBLE NULL,
    ADD COLUMN `qualification_specialty_id` VARCHAR(191) NULL,
    ADD COLUMN `qualifier_kind` VARCHAR(191) NOT NULL DEFAULT 'area_leader';

-- AlterTable
ALTER TABLE `catalog2_tasks` ADD COLUMN `qualification_cost_mode` VARCHAR(191) NOT NULL DEFAULT 'inherit',
    ADD COLUMN `qualification_fixed_amount` DOUBLE NULL,
    ADD COLUMN `qualification_hourly_rate` DOUBLE NULL,
    ADD COLUMN `qualification_minutes` INTEGER NULL,
    ADD COLUMN `qualification_percent` DOUBLE NULL,
    ADD COLUMN `qualification_specialty_id` VARCHAR(191) NULL,
    ADD COLUMN `qualifier_kind` VARCHAR(191) NOT NULL DEFAULT 'area_leader';

-- AlterTable
ALTER TABLE `catalog2_variation_options` ADD COLUMN `availability` VARCHAR(191) NOT NULL DEFAULT 'auto',
    ADD COLUMN `availability_note` TEXT NULL;

-- AlterTable
ALTER TABLE `project_dependency_rules` ADD COLUMN `input_label` VARCHAR(191) NULL,
    ADD COLUMN `provides_input` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `stage_gate` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `catalog2_pricing_rule_versions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `hash` VARCHAR(64) NOT NULL,
    `snapshot_json` LONGTEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `catalog2_pricing_rule_versions_hash_key`(`hash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `catalog2_commercial_requests` (
    `id` VARCHAR(191) NOT NULL,
    `product_id` VARCHAR(191) NOT NULL,
    `version_id` VARCHAR(191) NOT NULL,
    `account_kind` VARCHAR(191) NULL,
    `account_id` VARCHAR(191) NULL,
    `requested_by_user_id` VARCHAR(191) NOT NULL,
    `kind` VARCHAR(191) NOT NULL DEFAULT 'custom_quote',
    `selection_json` LONGTEXT NOT NULL,
    `reasons_json` LONGTEXT NOT NULL,
    `pricing_snapshot_json` LONGTEXT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'aberta',
    `client_note` TEXT NULL,
    `response_note` TEXT NULL,
    `handled_by_user_id` VARCHAR(191) NULL,
    `handled_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `catalog2_commercial_requests_product_id_status_idx`(`product_id`, `status`),
    INDEX `catalog2_commercial_requests_requested_by_user_id_idx`(`requested_by_user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `catalog2_addon_choices` (
    `id` VARCHAR(191) NOT NULL,
    `addon_id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `is_default` BOOLEAN NOT NULL DEFAULT false,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `base_cost` DOUBLE NULL,
    `minutes` INTEGER NULL,
    `deadline_days` DOUBLE NULL,
    `qty_from` INTEGER NULL,
    `qty_to` INTEGER NULL,
    `requires_quote` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `catalog2_addon_choices_addon_id_key_key`(`addon_id`, `key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `catalog2_connection_triggers` (
    `id` VARCHAR(191) NOT NULL,
    `requirement_id` VARCHAR(191) NOT NULL,
    `kind` VARCHAR(191) NOT NULL,
    `ref_key` VARCHAR(191) NULL,
    `ref_value` VARCHAR(191) NULL,
    `operator` VARCHAR(191) NOT NULL DEFAULT 'selected',
    `sort_order` INTEGER NOT NULL DEFAULT 0,

    INDEX `catalog2_connection_triggers_requirement_id_idx`(`requirement_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `catalog2_approval_gates` (
    `id` VARCHAR(191) NOT NULL,
    `version_id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `anchor_task_key` VARCHAR(191) NOT NULL,
    `anchor_step_key` VARCHAR(191) NULL,
    `position` VARCHAR(191) NOT NULL DEFAULT 'before_step',
    `approver_kind` VARCHAR(191) NOT NULL DEFAULT 'client',
    `group_key` VARCHAR(191) NULL,
    `sequence_no` INTEGER NOT NULL DEFAULT 0,
    `group_mode` VARCHAR(191) NOT NULL DEFAULT 'sequence',
    `rejection_return_step_key` VARCHAR(191) NULL,
    `requires_comment` BOOLEAN NOT NULL DEFAULT false,
    `is_required` BOOLEAN NOT NULL DEFAULT true,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `catalog2_approval_gates_version_id_key_key`(`version_id`, `key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `project_approval_gates` (
    `id` VARCHAR(191) NOT NULL,
    `project_id` VARCHAR(191) NOT NULL,
    `project_task_id` VARCHAR(191) NOT NULL,
    `source_gate_id` VARCHAR(191) NULL,
    `gate_key` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `position` VARCHAR(191) NOT NULL,
    `approver_kind` VARCHAR(191) NOT NULL,
    `group_key` VARCHAR(191) NULL,
    `sequence_no` INTEGER NOT NULL DEFAULT 0,
    `group_mode` VARCHAR(191) NOT NULL DEFAULT 'sequence',
    `anchor_stage_key` VARCHAR(191) NULL,
    `return_stage_key` VARCHAR(191) NULL,
    `requires_comment` BOOLEAN NOT NULL DEFAULT false,
    `is_required` BOOLEAN NOT NULL DEFAULT true,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pendente',
    `round` INTEGER NOT NULL DEFAULT 0,
    `decided_by` VARCHAR(191) NULL,
    `decided_at` DATETIME(3) NULL,
    `comment` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `project_approval_gates_project_id_status_idx`(`project_id`, `status`),
    UNIQUE INDEX `project_approval_gates_project_task_id_gate_key_key`(`project_task_id`, `gate_key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `project_approval_gate_events` (
    `id` VARCHAR(191) NOT NULL,
    `gate_id` VARCHAR(191) NOT NULL,
    `round` INTEGER NOT NULL DEFAULT 0,
    `decision` VARCHAR(191) NOT NULL,
    `actor_user_id` VARCHAR(191) NULL,
    `comment` TEXT NULL,
    `returned_to_stage_key` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `project_approval_gate_events_gate_id_idx`(`gate_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `catalog2_sla_rules` (
    `id` VARCHAR(191) NOT NULL,
    `version_id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `scope_kind` VARCHAR(191) NOT NULL,
    `target_key` VARCHAR(191) NULL,
    `modality` VARCHAR(191) NOT NULL DEFAULT 'any',
    `amount` DOUBLE NOT NULL,
    `unit` VARCHAR(191) NOT NULL DEFAULT 'business_days',
    `anchor` VARCHAR(191) NOT NULL DEFAULT 'prerequisites_valid',
    `description` TEXT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `catalog2_sla_rules_version_id_key_key`(`version_id`, `key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `project_sla_clocks` (
    `id` VARCHAR(191) NOT NULL,
    `project_id` VARCHAR(191) NOT NULL,
    `project_task_id` VARCHAR(191) NULL,
    `project_product_id` VARCHAR(191) NULL,
    `rule_id` VARCHAR(191) NULL,
    `rule_key` VARCHAR(191) NOT NULL,
    `scope_kind` VARCHAR(191) NOT NULL,
    `target_key` VARCHAR(191) NULL,
    `amount` DOUBLE NOT NULL,
    `unit` VARCHAR(191) NOT NULL,
    `anchor` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'aguardando',
    `anchor_at` DATETIME(3) NULL,
    `started_at` DATETIME(3) NULL,
    `due_at` DATETIME(3) NULL,
    `original_due_at` DATETIME(3) NULL,
    `paused_minutes` INTEGER NOT NULL DEFAULT 0,
    `completed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `project_sla_clocks_project_task_id_status_idx`(`project_task_id`, `status`),
    INDEX `project_sla_clocks_project_id_idx`(`project_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `project_sla_pauses` (
    `id` VARCHAR(191) NOT NULL,
    `clock_id` VARCHAR(191) NOT NULL,
    `reason_key` VARCHAR(191) NOT NULL,
    `reason_text` TEXT NULL,
    `responsible_party` VARCHAR(191) NOT NULL DEFAULT 'client',
    `responsible_user_id` VARCHAR(191) NULL,
    `started_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `resolved_at` DATETIME(3) NULL,
    `resolved_by` VARCHAR(191) NULL,
    `minutes` INTEGER NULL,

    INDEX `project_sla_pauses_clock_id_resolved_at_idx`(`clock_id`, `resolved_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `project_task_inputs` (
    `id` VARCHAR(191) NOT NULL,
    `project_task_id` VARCHAR(191) NOT NULL,
    `source_rule_id` VARCHAR(191) NULL,
    `source_project_task_id` VARCHAR(191) NULL,
    `source_product_id` VARCHAR(191) NULL,
    `source_deliverable_key` VARCHAR(191) NULL,
    `label` VARCHAR(191) NULL,
    `attachment_id` VARCHAR(191) NULL,
    `link_url` VARCHAR(191) NULL,
    `version_number` INTEGER NULL,
    `approval_status` VARCHAR(191) NULL,
    `approved_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `project_task_inputs_project_task_id_idx`(`project_task_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `catalog2_addon_choices` ADD CONSTRAINT `catalog2_addon_choices_addon_id_fkey` FOREIGN KEY (`addon_id`) REFERENCES `catalog2_addons`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `catalog2_connection_triggers` ADD CONSTRAINT `catalog2_connection_triggers_requirement_id_fkey` FOREIGN KEY (`requirement_id`) REFERENCES `catalog2_connection_requirements`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `catalog2_approval_gates` ADD CONSTRAINT `catalog2_approval_gates_version_id_fkey` FOREIGN KEY (`version_id`) REFERENCES `catalog2_product_versions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_approval_gates` ADD CONSTRAINT `project_approval_gates_project_task_id_fkey` FOREIGN KEY (`project_task_id`) REFERENCES `project_tasks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_approval_gate_events` ADD CONSTRAINT `project_approval_gate_events_gate_id_fkey` FOREIGN KEY (`gate_id`) REFERENCES `project_approval_gates`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `catalog2_sla_rules` ADD CONSTRAINT `catalog2_sla_rules_version_id_fkey` FOREIGN KEY (`version_id`) REFERENCES `catalog2_product_versions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_sla_clocks` ADD CONSTRAINT `project_sla_clocks_project_task_id_fkey` FOREIGN KEY (`project_task_id`) REFERENCES `project_tasks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_sla_pauses` ADD CONSTRAINT `project_sla_pauses_clock_id_fkey` FOREIGN KEY (`clock_id`) REFERENCES `project_sla_clocks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_task_inputs` ADD CONSTRAINT `project_task_inputs_project_task_id_fkey` FOREIGN KEY (`project_task_id`) REFERENCES `project_tasks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
