-- Tipos de acesso criados pelo administrador (2026-10-06): campos que o cliente preenche (definição por tipo) e valores não secretos por conexão;
-- tombstone para que um tipo excluído pelo Admin Master não volte com a semente padrão.
ALTER TABLE `connection_types` ADD COLUMN `fields_json` TEXT NULL;
ALTER TABLE `client_connections` ADD COLUMN `field_values_json` TEXT NULL;
CREATE TABLE `connection_type_tombstones` (
  `key` VARCHAR(191) NOT NULL,
  `deleted_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `deleted_by_user_id` VARCHAR(191) NULL,
  PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
