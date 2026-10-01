-- AlterTable
ALTER TABLE `catalog2_addon_effects` ADD COLUMN `charge_end_cycle` INTEGER NULL,
    ADD COLUMN `charge_quantity` INTEGER NULL,
    ADD COLUMN `charge_scope` VARCHAR(191) NOT NULL DEFAULT 'recurring',
    ADD COLUMN `charge_start_cycle` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `source_step_key` VARCHAR(191) NULL,
    ADD COLUMN `source_task_key` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `catalog2_addons` ADD COLUMN `charge_end_cycle` INTEGER NULL,
    ADD COLUMN `charge_quantity` INTEGER NULL,
    ADD COLUMN `charge_scope` VARCHAR(191) NOT NULL DEFAULT 'recurring',
    ADD COLUMN `charge_start_cycle` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `source_step_key` VARCHAR(191) NULL,
    ADD COLUMN `source_task_key` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `catalog2_ai_profiles` ADD COLUMN `fallback_human` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `input_format` TEXT NULL,
    ADD COLUMN `max_runs_per_task` INTEGER NULL,
    ADD COLUMN `max_tokens_per_run` INTEGER NULL,
    ADD COLUMN `on_failure` VARCHAR(191) NOT NULL DEFAULT 'forward_human',
    ADD COLUMN `output_format` TEXT NULL,
    ADD COLUMN `prompt_version` INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN `requires_human_review` BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE `catalog2_conditions` ADD COLUMN `charge_end_cycle` INTEGER NULL,
    ADD COLUMN `charge_quantity` INTEGER NULL,
    ADD COLUMN `charge_scope` VARCHAR(191) NOT NULL DEFAULT 'recurring',
    ADD COLUMN `charge_start_cycle` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `source_step_key` VARCHAR(191) NULL,
    ADD COLUMN `source_task_key` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `catalog2_option_effects` ADD COLUMN `charge_end_cycle` INTEGER NULL,
    ADD COLUMN `charge_quantity` INTEGER NULL,
    ADD COLUMN `charge_scope` VARCHAR(191) NOT NULL DEFAULT 'recurring',
    ADD COLUMN `charge_start_cycle` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `source_step_key` VARCHAR(191) NULL,
    ADD COLUMN `source_task_key` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `catalog2_product_versions` ADD COLUMN `change_policy` TEXT NULL,
    ADD COLUMN `client_info` TEXT NULL,
    ADD COLUMN `client_requirements_json` TEXT NULL,
    ADD COLUMN `commercial_objective` TEXT NULL,
    ADD COLUMN `deliverables_summary_json` TEXT NULL,
    ADD COLUMN `excluded_items_json` TEXT NULL,
    ADD COLUMN `field_visibility_json` TEXT NULL,
    ADD COLUMN `included_items_json` TEXT NULL,
    ADD COLUMN `internal_notes` TEXT NULL,
    ADD COLUMN `results_disclaimer` TEXT NULL,
    ADD COLUMN `scope` TEXT NULL,
    ADD COLUMN `target_audience` TEXT NULL;

-- AlterTable
ALTER TABLE `catalog2_questionnaire_questions` ADD COLUMN `answer_usage` VARCHAR(191) NOT NULL DEFAULT 'both',
    ADD COLUMN `default_value` TEXT NULL,
    ADD COLUMN `help_text` TEXT NULL,
    ADD COLUMN `options_json` TEXT NULL,
    ADD COLUMN `question_type` VARCHAR(191) NOT NULL DEFAULT 'texto_longo',
    ADD COLUMN `validation_json` TEXT NULL,
    ADD COLUMN `visibility` VARCHAR(191) NOT NULL DEFAULT 'client';

-- AlterTable
ALTER TABLE `catalog2_quotes` ADD COLUMN `first_charge_price` DOUBLE NULL,
    ADD COLUMN `implementation_price` DOUBLE NULL,
    ADD COLUMN `pricing_components_json` LONGTEXT NULL,
    ADD COLUMN `recurring_price` DOUBLE NULL;

-- AlterTable
ALTER TABLE `catalog2_subscriptions` ADD COLUMN `first_charge_json` TEXT NULL,
    ADD COLUMN `implementation_amount` DOUBLE NOT NULL DEFAULT 0,
    ADD COLUMN `implementation_charged_at` DATETIME(3) NULL,
    ADD COLUMN `implementation_reason` TEXT NULL,
    ADD COLUMN `renewal_components_json` LONGTEXT NULL;

-- AlterTable
ALTER TABLE `project_dependency_rules` ADD COLUMN `release_reason` TEXT NULL,
    ADD COLUMN `released_by_user_id` VARCHAR(191) NULL,
    ADD COLUMN `released_manually_at` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `project_products` ADD COLUMN `first_charge_snapshot` DOUBLE NULL,
    ADD COLUMN `implementation_price_snapshot` DOUBLE NULL,
    ADD COLUMN `recurring_price_snapshot` DOUBLE NULL;

-- AlterTable
ALTER TABLE `project_task_deliverables` ADD COLUMN `version` INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE `catalog2_ai_profile_prompt_versions` (
    `id` VARCHAR(191) NOT NULL,
    `profile_id` VARCHAR(191) NOT NULL,
    `version` INTEGER NOT NULL,
    `base_instructions` TEXT NULL,
    `input_format` TEXT NULL,
    `output_format` TEXT NULL,
    `changed_by_user_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `catalog2_ai_profile_prompt_versions_profile_id_version_key`(`profile_id`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `project_task_deliverable_versions` (
    `id` VARCHAR(191) NOT NULL,
    `deliverable_id` VARCHAR(191) NOT NULL,
    `version` INTEGER NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `content_url` VARCHAR(1000) NULL,
    `content_text` TEXT NULL,
    `content_name` VARCHAR(191) NULL,
    `submitted_at` DATETIME(3) NULL,
    `submitted_by` VARCHAR(191) NULL,
    `reviewed_by` VARCHAR(191) NULL,
    `review_comment` TEXT NULL,
    `replaced_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `project_task_deliverable_versions_deliverable_id_version_key`(`deliverable_id`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `catalog2_ai_profile_prompt_versions` ADD CONSTRAINT `catalog2_ai_profile_prompt_versions_profile_id_fkey` FOREIGN KEY (`profile_id`) REFERENCES `catalog2_ai_profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_task_deliverable_versions` ADD CONSTRAINT `project_task_deliverable_versions_deliverable_id_fkey` FOREIGN KEY (`deliverable_id`) REFERENCES `project_task_deliverables`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;


-- Correção de texto corrompido (dupla codificação UTF-8) nas classificações 4F. IDs e chaves preservados.
UPDATE `catalog2_four_f` SET `name` = CONVERT(UNHEX('463120E280942046756E6461C3A7C3A36F') USING utf8mb4) WHERE `key` = 'fundacao' AND HEX(`name`) = '463120C3A2E282ACE2809D2046756E6461C383C2A7C383C2A36F';
UPDATE `catalog2_four_f` SET `name` = CONVERT(UNHEX('463220E2809420466C75786F') USING utf8mb4) WHERE `key` = 'fluxo' AND HEX(`name`) = '463220C3A2E282ACE2809D20466C75786F';
UPDATE `catalog2_four_f` SET `name` = CONVERT(UNHEX('463320E2809420466F72C3A761') USING utf8mb4) WHERE `key` = 'forca' AND HEX(`name`) = '463320C3A2E282ACE2809D20466F72C383C2A761';
UPDATE `catalog2_four_f` SET `name` = CONVERT(UNHEX('463420E2809420466964656C697A61C3A7C3A36F') USING utf8mb4) WHERE `key` = 'fidelizacao' AND HEX(`name`) = '463420C3A2E282ACE2809D20466964656C697A61C383C2A7C383C2A36F';
