-- AlterTable
ALTER TABLE `payments` ADD COLUMN `billing_cycle_key` VARCHAR(191) NULL,
    ADD COLUMN `idempotency_key` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `project_tasks` ADD COLUMN `billing_cycle_key` VARCHAR(191) NULL,
    ADD COLUMN `generation_key` VARCHAR(191) NULL,
    ADD COLUMN `occurrence_index` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `origin_payment_id` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `projects` ADD COLUMN `created_by_user_id` VARCHAR(191) NULL,
    ADD COLUMN `project_code` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `entity_sequences` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `current_value` INTEGER NOT NULL DEFAULT 0,
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `entity_sequences_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `payments_idempotency_key_key` ON `payments`(`idempotency_key`);

-- CreateIndex
CREATE UNIQUE INDEX `project_tasks_generation_key_key` ON `project_tasks`(`generation_key`);

-- CreateIndex
CREATE INDEX `project_tasks_origin_payment_id_idx` ON `project_tasks`(`origin_payment_id`);

-- CreateIndex
CREATE UNIQUE INDEX `projects_project_code_key` ON `projects`(`project_code`);

-- CreateIndex
CREATE INDEX `projects_created_by_user_id_idx` ON `projects`(`created_by_user_id`);

-- AddForeignKey
ALTER TABLE `projects` ADD CONSTRAINT `projects_created_by_user_id_fkey` FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_tasks` ADD CONSTRAINT `project_tasks_origin_payment_id_fkey` FOREIGN KEY (`origin_payment_id`) REFERENCES `payments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
