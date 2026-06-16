-- CreateTable
CREATE TABLE IF NOT EXISTS `report_configs` (
    `id` VARCHAR(191) NOT NULL,
    `report_key` VARCHAR(191) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `allowed_account_types` LONGTEXT NULL,
    `allowed_roles` LONGTEXT NULL,
    `allowed_user_ids` LONGTEXT NULL,
    `blocked_user_ids` LONGTEXT NULL,
    `data_scope` VARCHAR(191) NOT NULL DEFAULT 'GLOBAL',
    `can_export` BOOLEAN NOT NULL DEFAULT true,
    `can_change_filters` BOOLEAN NOT NULL DEFAULT true,
    `only_related_data` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `report_configs_report_key_key`(`report_key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `usage_events` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `account_type` VARCHAR(191) NOT NULL,
    `route` VARCHAR(500) NOT NULL,
    `event_type` VARCHAR(191) NOT NULL,
    `session_id` VARCHAR(191) NULL,
    `metadata` LONGTEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `usage_events_user_id_idx`(`user_id`),
    INDEX `usage_events_account_type_idx`(`account_type`),
    INDEX `usage_events_event_type_idx`(`event_type`),
    INDEX `usage_events_created_at_idx`(`created_at`),
    INDEX `usage_events_session_id_idx`(`session_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
