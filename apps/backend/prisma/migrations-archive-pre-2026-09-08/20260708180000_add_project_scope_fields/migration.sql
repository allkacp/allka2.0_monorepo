-- Novo escopo estruturado de Project (Agency/Company/Partner), adicional ao
-- legado (agency string / client_id / company_type). Puramente aditivo:
-- 3 colunas nullable + FKs, sem tocar em nenhuma linha existente. Os
-- projetos já cadastrados continuam funcionando só pelo escopo antigo.
ALTER TABLE `projects`
  ADD COLUMN `agency_id` VARCHAR(191) NULL,
  ADD COLUMN `company_id` VARCHAR(191) NULL,
  ADD COLUMN `partner_id` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `projects_agency_id_idx` ON `projects`(`agency_id`);
CREATE INDEX `projects_company_id_idx` ON `projects`(`company_id`);
CREATE INDEX `projects_partner_id_idx` ON `projects`(`partner_id`);

-- AddForeignKey
ALTER TABLE `projects` ADD CONSTRAINT `projects_agency_id_fkey` FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `projects` ADD CONSTRAINT `projects_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `projects` ADD CONSTRAINT `projects_partner_id_fkey` FOREIGN KEY (`partner_id`) REFERENCES `partner_profiles`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
