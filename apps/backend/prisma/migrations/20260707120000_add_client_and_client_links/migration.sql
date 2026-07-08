-- CreateTable: Client — entidade própria, separada de Company. Representa o
-- cliente final (pessoa física ou jurídica) atendido/indicado por Agency,
-- Company ou Partner. Tabela nova, sem dado legado a migrar.
CREATE TABLE IF NOT EXISTS `clients` (
    `id` VARCHAR(191) NOT NULL,
    `sequence_number` INT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL DEFAULT 'pj',
    `document` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `website` VARCHAR(191) NULL,
    `segment` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `address` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `state` VARCHAR(191) NULL,
    `zip_code` VARCHAR(191) NULL,
    `notes` LONGTEXT NULL,
    `description` LONGTEXT NULL,
    `created_by_user_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `clients_sequence_number_key`(`sequence_number`),
    UNIQUE INDEX `clients_document_key`(`document`),
    INDEX `clients_name_idx`(`name`),
    INDEX `clients_email_idx`(`email`),
    INDEX `clients_status_idx`(`status`),
    INDEX `clients_created_by_user_id_idx`(`created_by_user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: ClientLink — vínculo entre um Client e quem o atende
-- (Agency, Company ou Partner). Tabela separada em vez de FKs diretas no
-- Client porque o mesmo Client pode precisar de mais de um vínculo
-- simultâneo. IMPORTANTE: nem o Prisma nem o MySQL garantem aqui que
-- exatamente um dentre agency_id/company_id/partner_id esteja preenchido
-- por linha — essa regra ("exactly one") precisa ser validada no backend
-- (próximo bloco), não existe CHECK constraint declarada nesta migration.
CREATE TABLE IF NOT EXISTS `client_links` (
    `id` VARCHAR(191) NOT NULL,
    `client_id` VARCHAR(191) NOT NULL,
    `agency_id` VARCHAR(191) NULL,
    `company_id` VARCHAR(191) NULL,
    `partner_id` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `client_links_client_id_idx`(`client_id`),
    INDEX `client_links_agency_id_idx`(`agency_id`),
    INDEX `client_links_company_id_idx`(`company_id`),
    INDEX `client_links_partner_id_idx`(`partner_id`),
    UNIQUE INDEX `client_links_client_id_agency_id_key`(`client_id`, `agency_id`),
    UNIQUE INDEX `client_links_client_id_company_id_key`(`client_id`, `company_id`),
    UNIQUE INDEX `client_links_client_id_partner_id_key`(`client_id`, `partner_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `clients` ADD CONSTRAINT `clients_created_by_user_id_fkey` FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client_links` ADD CONSTRAINT `client_links_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client_links` ADD CONSTRAINT `client_links_agency_id_fkey` FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client_links` ADD CONSTRAINT `client_links_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client_links` ADD CONSTRAINT `client_links_partner_id_fkey` FOREIGN KEY (`partner_id`) REFERENCES `partner_profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
