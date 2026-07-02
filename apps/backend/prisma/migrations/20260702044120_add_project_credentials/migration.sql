-- CreateTable
CREATE TABLE `project_credentials` (
    `id` VARCHAR(191) NOT NULL,
    `project_id` VARCHAR(191) NOT NULL,
    `project_task_id` VARCHAR(191) NULL,
    `project_product_id` VARCHAR(191) NULL,
    `title` VARCHAR(191) NOT NULL,
    `service` VARCHAR(191) NULL,
    `url` VARCHAR(191) NULL,
    `username` VARCHAR(191) NULL,
    `password_demo` VARCHAR(191) NULL,
    `notes` LONGTEXT NULL,
    `category` VARCHAR(191) NOT NULL DEFAULT 'other',
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `is_demo` BOOLEAN NOT NULL DEFAULT true,
    `requires_rotation` BOOLEAN NOT NULL DEFAULT false,
    `rotation_reason` VARCHAR(191) NULL,
    `last_rotated_at` DATETIME(3) NULL,
    `expires_at` DATETIME(3) NULL,
    `shared_until` DATETIME(3) NULL,
    `shared_with_user_id` VARCHAR(191) NULL,
    `shared_with_nomad_id` VARCHAR(191) NULL,
    `created_by` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `project_credentials_project_id_idx`(`project_id`),
    INDEX `project_credentials_project_task_id_idx`(`project_task_id`),
    INDEX `project_credentials_project_product_id_idx`(`project_product_id`),
    INDEX `project_credentials_status_idx`(`status`),
    INDEX `project_credentials_category_idx`(`category`),
    INDEX `project_credentials_shared_with_user_id_idx`(`shared_with_user_id`),
    INDEX `project_credentials_shared_with_nomad_id_idx`(`shared_with_nomad_id`),
    UNIQUE INDEX `project_credentials_project_id_title_key`(`project_id`, `title`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `project_credential_access_logs` (
    `id` VARCHAR(191) NOT NULL,
    `credential_id` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `actor_type` VARCHAR(191) NULL,
    `actor_user_id` VARCHAR(191) NULL,
    `actor_nomad_id` VARCHAR(191) NULL,
    `details` LONGTEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `project_credential_access_logs_credential_id_idx`(`credential_id`),
    INDEX `project_credential_access_logs_action_idx`(`action`),
    INDEX `project_credential_access_logs_created_at_idx`(`created_at`),
    INDEX `project_credential_access_logs_actor_user_id_idx`(`actor_user_id`),
    INDEX `project_credential_access_logs_actor_nomad_id_idx`(`actor_nomad_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `project_credentials` ADD CONSTRAINT `project_credentials_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_credentials` ADD CONSTRAINT `project_credentials_project_task_id_fkey` FOREIGN KEY (`project_task_id`) REFERENCES `project_tasks`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_credentials` ADD CONSTRAINT `project_credentials_project_product_id_fkey` FOREIGN KEY (`project_product_id`) REFERENCES `project_products`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_credential_access_logs` ADD CONSTRAINT `project_credential_access_logs_credential_id_fkey` FOREIGN KEY (`credential_id`) REFERENCES `project_credentials`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
