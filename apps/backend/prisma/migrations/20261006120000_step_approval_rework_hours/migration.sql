-- Prazos por etapa (B4/B5): aprovação do cliente e refação, em horas úteis. Nulo = comportamento anterior.
ALTER TABLE `catalog2_task_steps` ADD COLUMN `approval_hours` INTEGER NULL, ADD COLUMN `rework_hours` INTEGER NULL;
ALTER TABLE `project_task_stages` ADD COLUMN `aprovacao_horas` INTEGER NULL, ADD COLUMN `refacao_horas` INTEGER NULL;
