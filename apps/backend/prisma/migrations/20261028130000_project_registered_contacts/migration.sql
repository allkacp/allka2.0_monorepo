ALTER TABLE `projects`
  ADD COLUMN `consultant_user_id` VARCHAR(191) NULL,
  ADD COLUMN `client_record_id` VARCHAR(191) NULL,
  ADD COLUMN `registered_contacts_required` BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX `projects_consultant_user_id_idx` ON `projects`(`consultant_user_id`);
CREATE INDEX `projects_client_record_id_idx` ON `projects`(`client_record_id`);
ALTER TABLE `projects` ADD CONSTRAINT `projects_consultant_user_id_fkey` FOREIGN KEY (`consultant_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `projects` ADD CONSTRAINT `projects_client_record_id_fkey` FOREIGN KEY (`client_record_id`) REFERENCES `clients`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
