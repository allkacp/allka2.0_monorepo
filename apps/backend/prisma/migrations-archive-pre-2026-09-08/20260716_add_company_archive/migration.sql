-- CreateTable
CREATE TABLE `company_archives` (
    `id` VARCHAR(191) NOT NULL,
    `sequence_number` INTEGER NOT NULL,
    `original_company_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `snapshot` LONGTEXT NOT NULL,
    `users_snapshot` LONGTEXT NOT NULL,
    `projects_count` INTEGER NOT NULL DEFAULT 0,
    `invoices_count` INTEGER NOT NULL DEFAULT 0,
    `deleted_by_user_id` VARCHAR(191) NULL,
    `deleted_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `company_archives_sequence_number_idx`(`sequence_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `company_freed_sequences` (
    `id` VARCHAR(191) NOT NULL,
    `sequence_number` INTEGER NOT NULL,
    `freed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `company_freed_sequences_sequence_number_key`(`sequence_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `company_archives` ADD CONSTRAINT `company_archives_deleted_by_user_id_fkey` FOREIGN KEY (`deleted_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
