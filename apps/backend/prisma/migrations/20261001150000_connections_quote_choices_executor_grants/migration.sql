-- AlterTable
ALTER TABLE `client_connection_grants` ADD COLUMN `executor_user_id` VARCHAR(191) NULL,
    ADD COLUMN `revoke_reason` TEXT NULL;

-- AlterTable
ALTER TABLE `project_connection_requirements` ADD COLUMN `condition_active` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `light_check_pending` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE `connection_quote_choices` (
    `id` VARCHAR(191) NOT NULL,
    `quote_id` VARCHAR(191) NOT NULL,
    `requirement_id` VARCHAR(191) NOT NULL,
    `handling` VARCHAR(191) NOT NULL DEFAULT 'later',
    `connection_id` VARCHAR(191) NULL,
    `grant_scope` VARCHAR(191) NULL,
    `responsible_user_id` VARCHAR(191) NULL,
    `responsible_name` VARCHAR(191) NULL,
    `invited_email` VARCHAR(191) NULL,
    `draft_json` TEXT NULL,
    `created_by_user_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `connection_quote_choices_quote_id_requirement_id_key`(`quote_id`, `requirement_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

