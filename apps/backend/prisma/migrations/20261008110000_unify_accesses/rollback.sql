-- Desfaz 20261008110000: recria a lista antiga (vazia). As exigências copiadas para o módulo novo NÃO são removidas.
CREATE TABLE `catalog2_version_accesses` (
  `id` VARCHAR(191) NOT NULL,
  `version_id` VARCHAR(191) NOT NULL,
  `access_type` VARCHAR(191) NOT NULL,
  `label` VARCHAR(191) NOT NULL,
  `is_required` BOOLEAN NOT NULL DEFAULT true,
  `notes` TEXT NULL,
  `sort_order` INTEGER NOT NULL DEFAULT 0,
  INDEX `catalog2_version_accesses_version_id_sort_order_idx`(`version_id`, `sort_order`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `catalog2_version_accesses` ADD CONSTRAINT `catalog2_version_accesses_version_id_fkey` FOREIGN KEY (`version_id`) REFERENCES `catalog2_product_versions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
