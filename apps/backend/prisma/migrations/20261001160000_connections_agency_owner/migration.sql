-- AlterTable
ALTER TABLE `client_connections` ADD COLUMN `agency_id` VARCHAR(191) NULL,
    MODIFY `company_id` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `client_connections_agency_id_status_idx` ON `client_connections`(`agency_id`, `status`);

-- AddForeignKey
ALTER TABLE `client_connections` ADD CONSTRAINT `client_connections_agency_id_fkey` FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

