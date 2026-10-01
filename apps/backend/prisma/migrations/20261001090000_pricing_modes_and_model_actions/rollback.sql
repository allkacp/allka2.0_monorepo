-- Rollback manual (não é aplicado pelo prisma migrate): remove só o que esta migração criou.
DROP TABLE IF EXISTS `catalog2_model_actions`;
ALTER TABLE `catalog2_product_versions` DROP COLUMN `pricing_mode`, DROP COLUMN `manual_price`, DROP COLUMN `manual_deadline_days`;
DELETE FROM `_prisma_migrations` WHERE `migration_name` = '20261001090000_pricing_modes_and_model_actions';
