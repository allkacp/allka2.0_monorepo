ALTER TABLE `task_routing_settings` DROP COLUMN `stage_preferred_accept_minutes`;
ALTER TABLE `project_task_stages` DROP COLUMN `preferencia_nomade`, DROP COLUMN `preferencia_ref`, DROP COLUMN `aceite_horas`, DROP COLUMN `nomade_preferido_id`, DROP COLUMN `reservada_ate`, DROP COLUMN `nomade_excluido_id`;
ALTER TABLE `catalog2_task_steps` DROP COLUMN `executor_accept_hours`;
