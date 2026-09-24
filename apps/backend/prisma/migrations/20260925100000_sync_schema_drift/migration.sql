-- DropIndex
DROP INDEX `task_offers_project_task_id_rotation_round_idx` ON `task_offers`;

-- AlterTable
ALTER TABLE `task_routing_settings` MODIFY `id` VARCHAR(191) NOT NULL DEFAULT 'singleton';

-- RenameIndex
ALTER TABLE `catalog2_products` RENAME INDEX `sequence_number` TO `catalog2_products_sequence_number_key`;
