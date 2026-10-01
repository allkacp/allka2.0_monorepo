-- Rollback manual (não é aplicado pelo prisma migrate): remove só o que esta migração criou (módulo Conexões).
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `connection_reminders`;
DROP TABLE IF EXISTS `connection_events`;
DROP TABLE IF EXISTS `project_task_external_blocks`;
DROP TABLE IF EXISTS `project_connection_requirements`;
DROP TABLE IF EXISTS `client_connection_validations`;
DROP TABLE IF EXISTS `client_connection_grants`;
DROP TABLE IF EXISTS `connection_secrets`;
DROP TABLE IF EXISTS `client_connections`;
DROP TABLE IF EXISTS `catalog2_connection_dependencies`;
DROP TABLE IF EXISTS `catalog2_connection_requirements`;
DROP TABLE IF EXISTS `connection_types`;
SET FOREIGN_KEY_CHECKS = 1;
ALTER TABLE `catalog2_ai_profiles` DROP COLUMN `is_system`, DROP COLUMN `knowledge_json`, DROP COLUMN `purpose`;
ALTER TABLE `catalog2_product_versions` DROP COLUMN `requires_connections`;
ALTER TABLE `project_dependency_rules` DROP COLUMN `connection_dep_kind`, DROP COLUMN `dependent_stage_key`, DROP COLUMN `target_connection_req_id`;
ALTER TABLE `project_tasks` DROP COLUMN `external_pause_started_at`, DROP COLUMN `external_pause_total_minutes`, DROP COLUMN `original_due_date`, DROP COLUMN `status_before_external_pause`;
DELETE FROM `_prisma_migrations` WHERE `migration_name` = '20261001140000_connections_module';
