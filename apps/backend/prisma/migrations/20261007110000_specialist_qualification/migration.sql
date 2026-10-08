ALTER TABLE `catalog2_task_steps` ADD COLUMN `requires_specialist_qualification` BOOLEAN NOT NULL DEFAULT false, ADD COLUMN `specialist_user_id` VARCHAR(191) NULL;
ALTER TABLE `project_task_stages` ADD COLUMN `exige_qualificacao_especialista` BOOLEAN NOT NULL DEFAULT false, ADD COLUMN `especialista_id` VARCHAR(191) NULL, ADD COLUMN `qualificada_especialista_em` DATETIME(3) NULL;
