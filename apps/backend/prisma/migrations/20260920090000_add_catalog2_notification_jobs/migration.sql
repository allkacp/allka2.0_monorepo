-- Item 8.1 (reuniao 2026-09-14, "Fechar as notificacoes dos produtos") --
-- substitui o marcador de ativacao (2 colunas em catalog2_products, so pra
-- esse evento) por uma fila DURAVEL generica, reaproveitada por todos os
-- eventos (ativacao, inativacao, mudanca de preco, renovacao). Ver
-- comentario dos models em schema.prisma / lib/catalog2-notifications.ts.

-- DropIndex
DROP INDEX `catalog2_products_activation_notify_pending_at_idx` ON `catalog2_products`;

-- AlterTable
ALTER TABLE `catalog2_products` DROP COLUMN `activation_notified_at`,
    DROP COLUMN `activation_notify_pending_at`,
    ADD COLUMN `last_known_commercially_ready` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE `catalog2_notification_jobs` (
    `id` VARCHAR(191) NOT NULL,
    `event_type` VARCHAR(191) NOT NULL,
    `entity_type` VARCHAR(191) NOT NULL,
    `entity_id` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completed_at` DATETIME(3) NULL,

    INDEX `catalog2_notification_jobs_status_event_type_idx`(`status`, `event_type`),
    INDEX `catalog2_notification_jobs_entity_type_entity_id_idx`(`entity_type`, `entity_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `catalog2_notification_job_recipients` (
    `id` VARCHAR(191) NOT NULL,
    `job_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `message` TEXT NOT NULL,
    `severity` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `action_url` VARCHAR(191) NULL,
    `sent_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `catalog2_notification_job_recipients_job_id_sent_at_idx`(`job_id`, `sent_at`),
    UNIQUE INDEX `catalog2_notification_job_recipients_job_id_user_id_key`(`job_id`, `user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `catalog2_notification_job_recipients` ADD CONSTRAINT `catalog2_notification_job_recipients_job_id_fkey` FOREIGN KEY (`job_id`) REFERENCES `catalog2_notification_jobs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
