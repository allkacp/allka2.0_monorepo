-- Partner deixa de ser um account_type/User separado e passa a ser um
-- upgrade da própria Agency (convite do admin, aceito pela Agency). Ver
-- PartnerProfile no schema.prisma para o contexto completo.

-- 1. Remove o vínculo de membro de Partner em User (não existe mais
--    "pertencer" a um Partner como organização própria).
ALTER TABLE `users` DROP FOREIGN KEY IF EXISTS `users_partner_id_fkey`;
ALTER TABLE `users` DROP COLUMN IF EXISTS `partner_id`;

-- 2. Re-ancora partner_profiles de User (user_id/owner) para Agency
--    (agency_id) — dev local, sem dados existentes a preservar.
ALTER TABLE `partner_profiles` DROP FOREIGN KEY IF EXISTS `partner_profiles_user_id_fkey`;
ALTER TABLE `partner_profiles` DROP COLUMN IF EXISTS `user_id`;
ALTER TABLE `partner_profiles` ADD COLUMN `agency_id` VARCHAR(191) NOT NULL;
ALTER TABLE `partner_profiles` ADD COLUMN `invited_at` DATETIME(3) NULL;
ALTER TABLE `partner_profiles` ADD COLUMN `responded_at` DATETIME(3) NULL;
ALTER TABLE `partner_profiles` ALTER COLUMN `status` SET DEFAULT 'invited';

CREATE UNIQUE INDEX `partner_profiles_agency_id_key` ON `partner_profiles`(`agency_id`);
ALTER TABLE `partner_profiles` ADD CONSTRAINT `partner_profiles_agency_id_fkey`
  FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
