-- AlterTable: add referred_by_partner_id to companies
ALTER TABLE `companies` ADD COLUMN `referred_by_partner_id` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `companies` ADD CONSTRAINT `companies_referred_by_partner_id_fkey` FOREIGN KEY (`referred_by_partner_id`) REFERENCES `partner_profiles`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
