-- CreateTable: solicitações de saque do Partner. Tabela separada de
-- `withdrawal_requests` (exclusiva de Nômade, payload nomade_id) — o saque de
-- Partner referencia partner_profiles, não nomades.
CREATE TABLE IF NOT EXISTS `partner_withdrawals` (
    `id` VARCHAR(191) NOT NULL,
    `partner_profile_id` VARCHAR(191) NOT NULL,
    `amount` DOUBLE NOT NULL,
    `pix_key` VARCHAR(191) NOT NULL,
    `pix_key_type` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `requested_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `processed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `partner_withdrawals_partner_profile_id_idx`(`partner_profile_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `partner_withdrawals` ADD CONSTRAINT `partner_withdrawals_partner_profile_id_fkey` FOREIGN KEY (`partner_profile_id`) REFERENCES `partner_profiles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
