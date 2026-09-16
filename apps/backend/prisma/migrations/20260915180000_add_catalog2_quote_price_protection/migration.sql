-- DropIndex
DROP INDEX `catalog2_quotes_account_kind_account_id_config_checksum_stat_key` ON `catalog2_quotes`;

-- AlterTable
ALTER TABLE `catalog2_quotes` ADD COLUMN `price_protection_started_at` DATETIME(3) NULL,
    ADD COLUMN `renewed_from_quote_id` VARCHAR(30) NULL,
    MODIFY `config_checksum` VARCHAR(64) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `catalog2_quotes_renewed_from_quote_id_key` ON `catalog2_quotes`(`renewed_from_quote_id`);

-- CreateIndex
CREATE UNIQUE INDEX `catalog2_quotes_account_kind_account_id_config_checksum_stat_key` ON `catalog2_quotes`(`account_kind`, `account_id`, `config_checksum`, `status`, `renewed_from_quote_id`);

-- AddForeignKey
ALTER TABLE `catalog2_quotes` ADD CONSTRAINT `catalog2_quotes_renewed_from_quote_id_fkey` FOREIGN KEY (`renewed_from_quote_id`) REFERENCES `catalog2_quotes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
