-- Rollback manual (não é aplicado pelo prisma migrate). Ordem de reversão: esta (3ª) → 2ª → 1ª migração do módulo de Conexões.
-- Conexões pertencentes a AGÊNCIAS (company_id nulo) só existem por causa desta migração: saem junto.
DELETE FROM `client_connection_validations` WHERE `connection_id` IN (SELECT `id` FROM `client_connections` WHERE `company_id` IS NULL);
DELETE FROM `client_connection_grants` WHERE `connection_id` IN (SELECT `id` FROM `client_connections` WHERE `company_id` IS NULL);
DELETE FROM `connection_secrets` WHERE `connection_id` IN (SELECT `id` FROM `client_connections` WHERE `company_id` IS NULL);
UPDATE `project_connection_requirements` SET `connection_id` = NULL WHERE `connection_id` IN (SELECT `id` FROM `client_connections` WHERE `company_id` IS NULL);
DELETE FROM `client_connections` WHERE `company_id` IS NULL;
ALTER TABLE `client_connections` DROP FOREIGN KEY `client_connections_agency_id_fkey`;
DROP INDEX `client_connections_agency_id_status_idx` ON `client_connections`;
ALTER TABLE `client_connections` DROP COLUMN `agency_id`, MODIFY `company_id` VARCHAR(191) NOT NULL;
DELETE FROM `_prisma_migrations` WHERE `migration_name` = '20261001160000_connections_agency_owner';
