DROP TABLE `connection_type_tombstones`;
ALTER TABLE `client_connections` DROP COLUMN `field_values_json`;
ALTER TABLE `connection_types` DROP COLUMN `fields_json`;
