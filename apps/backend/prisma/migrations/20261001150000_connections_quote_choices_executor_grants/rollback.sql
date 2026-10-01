-- Rollback manual (não é aplicado pelo prisma migrate)
DROP TABLE IF EXISTS `connection_quote_choices`;
ALTER TABLE `client_connection_grants` DROP COLUMN `executor_user_id`, DROP COLUMN `revoke_reason`;
ALTER TABLE `project_connection_requirements` DROP COLUMN `light_check_pending`, DROP COLUMN `condition_active`;
DELETE FROM `_prisma_migrations` WHERE `migration_name` = '20261001150000_connections_quote_choices_executor_grants';
