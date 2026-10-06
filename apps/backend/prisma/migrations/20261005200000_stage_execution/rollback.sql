DROP TABLE `project_task_stage_reviews`;
ALTER TABLE `project_task_stages` DROP COLUMN `visivel_ao_cliente`, DROP COLUMN `exige_qualificacao`, DROP COLUMN `libera_proxima_auto`, DROP COLUMN `rodada_ajuste`, DROP COLUMN `entregue_em`, DROP COLUMN `qualificada_em`, DROP COLUMN `aprovada_em`;
ALTER TABLE `project_tasks` DROP COLUMN `stage_execution`;
ALTER TABLE `catalog2_task_steps` DROP COLUMN `internal_step`, DROP COLUMN `requires_qualification`, DROP COLUMN `release_next_auto`;
ALTER TABLE `catalog2_tasks` DROP COLUMN `stage_execution`;
