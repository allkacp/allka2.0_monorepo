-- Executor por etapa (A8b-3): preferir o mesmo nômade (reserva por prazo de aceite) ou nunca o mesmo. Tudo opcional; sem preenchimento nada muda.
ALTER TABLE `catalog2_task_steps` ADD COLUMN `executor_accept_hours` INTEGER NULL;
ALTER TABLE `project_task_stages` ADD COLUMN `preferencia_nomade` VARCHAR(191) NULL, ADD COLUMN `preferencia_ref` VARCHAR(191) NULL, ADD COLUMN `aceite_horas` INTEGER NULL, ADD COLUMN `nomade_preferido_id` VARCHAR(191) NULL, ADD COLUMN `reservada_ate` DATETIME(3) NULL, ADD COLUMN `nomade_excluido_id` VARCHAR(191) NULL;
ALTER TABLE `task_routing_settings` ADD COLUMN `stage_preferred_accept_minutes` INTEGER NOT NULL DEFAULT 120;
