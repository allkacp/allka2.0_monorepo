-- Desfaz 20261007140000 (só use se nenhuma cotação negociada / cobrança de alteração por IA tiver sido gravada).
DROP TABLE `ai_change_charges`;
ALTER TABLE `catalog2_products` DROP COLUMN `ai_free_changes`;
DROP INDEX `catalog2_quotes_commercial_request_id_key` ON `catalog2_quotes`;
ALTER TABLE `catalog2_quotes` DROP COLUMN `commercial_request_id`;
