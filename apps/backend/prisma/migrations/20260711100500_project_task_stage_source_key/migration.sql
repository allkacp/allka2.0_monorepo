-- Chave estável de origem para etapas geradas por especificação
-- (generateTasksFromSpec) — permite reexecução create-only sem apagar
-- etapas já existentes. NULL para etapas do gerador genérico por catálogo
-- (MySQL trata múltiplos NULL como não-colidentes nesta constraint).
ALTER TABLE `project_task_stages` ADD COLUMN `source_key` VARCHAR(191) NULL;

ALTER TABLE `project_task_stages` ADD UNIQUE INDEX `project_task_stages_project_task_id_source_key_key` (`project_task_id`, `source_key`);
