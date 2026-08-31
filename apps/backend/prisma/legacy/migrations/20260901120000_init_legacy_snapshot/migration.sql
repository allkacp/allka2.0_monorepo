-- CreateTable
CREATE TABLE `legacy_import_batches` (
    `id` VARCHAR(191) NOT NULL,
    `source_name` VARCHAR(191) NOT NULL,
    `source_environment` VARCHAR(191) NOT NULL,
    `snapshot_at` DATETIME(3) NOT NULL,
    `imported_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `importer_version` VARCHAR(191) NOT NULL,
    `expected_count` INTEGER NOT NULL DEFAULT 0,
    `imported_count` INTEGER NOT NULL DEFAULT 0,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `checksum` VARCHAR(191) NULL,
    `reconciliation_json` LONGTEXT NULL,
    `notes` LONGTEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `legacy_import_batches_source_environment_idx`(`source_environment`),
    INDEX `legacy_import_batches_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `legacy_record_snapshots` (
    `id` VARCHAR(191) NOT NULL,
    `batch_id` VARCHAR(191) NOT NULL,
    `entity_type` VARCHAR(191) NOT NULL,
    `source_table` VARCHAR(191) NOT NULL,
    `original_id` VARCHAR(191) NOT NULL,
    `original_code` VARCHAR(191) NULL,
    `title` VARCHAR(191) NULL,
    `subtitle` TEXT NULL,
    `original_status` VARCHAR(191) NULL,
    `dates_json` TEXT NULL,
    `content_json` LONGTEXT NOT NULL,
    `checksum` VARCHAR(191) NOT NULL,
    `sanitized` BOOLEAN NOT NULL DEFAULT false,
    `sanitized_fields_json` TEXT NULL,
    `search_category` VARCHAR(191) NULL,
    `search_active` BOOLEAN NULL,
    `imported_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `legacy_record_snapshots_entity_type_idx`(`entity_type`),
    INDEX `legacy_record_snapshots_original_status_idx`(`original_status`),
    INDEX `legacy_record_snapshots_search_category_idx`(`search_category`),
    INDEX `legacy_record_snapshots_search_active_idx`(`search_active`),
    INDEX `legacy_record_snapshots_original_code_idx`(`original_code`),
    UNIQUE INDEX `legacy_record_snapshots_batch_id_entity_type_original_id_key`(`batch_id`, `entity_type`, `original_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `legacy_relation_snapshots` (
    `id` VARCHAR(191) NOT NULL,
    `batch_id` VARCHAR(191) NOT NULL,
    `from_record_id` VARCHAR(191) NOT NULL,
    `to_record_id` VARCHAR(191) NULL,
    `relation_type` VARCHAR(191) NOT NULL,
    `to_original_id` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `legacy_relation_snapshots_from_record_id_idx`(`from_record_id`),
    INDEX `legacy_relation_snapshots_to_record_id_idx`(`to_record_id`),
    INDEX `legacy_relation_snapshots_relation_type_idx`(`relation_type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `legacy_record_snapshots` ADD CONSTRAINT `legacy_record_snapshots_batch_id_fkey` FOREIGN KEY (`batch_id`) REFERENCES `legacy_import_batches`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `legacy_relation_snapshots` ADD CONSTRAINT `legacy_relation_snapshots_batch_id_fkey` FOREIGN KEY (`batch_id`) REFERENCES `legacy_import_batches`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `legacy_relation_snapshots` ADD CONSTRAINT `legacy_relation_snapshots_from_record_id_fkey` FOREIGN KEY (`from_record_id`) REFERENCES `legacy_record_snapshots`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `legacy_relation_snapshots` ADD CONSTRAINT `legacy_relation_snapshots_to_record_id_fkey` FOREIGN KEY (`to_record_id`) REFERENCES `legacy_record_snapshots`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
