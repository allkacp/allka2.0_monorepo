-- Execução por etapa (A8b fase 2, 2026-10-05): cada etapa pode ser qualificada e aprovada antes de liberar a próxima.
-- Tudo opcional: padrão "task" = comportamento de sempre.
ALTER TABLE `catalog2_tasks` ADD COLUMN `stage_execution` VARCHAR(191) NOT NULL DEFAULT 'task';
ALTER TABLE `catalog2_task_steps`
  ADD COLUMN `internal_step` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `requires_qualification` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `release_next_auto` BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE `project_tasks` ADD COLUMN `stage_execution` VARCHAR(191) NOT NULL DEFAULT 'task';
ALTER TABLE `project_task_stages`
  ADD COLUMN `visivel_ao_cliente` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `exige_qualificacao` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `libera_proxima_auto` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `rodada_ajuste` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `entregue_em` DATETIME(3) NULL,
  ADD COLUMN `qualificada_em` DATETIME(3) NULL,
  ADD COLUMN `aprovada_em` DATETIME(3) NULL;
CREATE TABLE `project_task_stage_reviews` (
  `id` VARCHAR(191) NOT NULL,
  `stage_id` VARCHAR(191) NOT NULL,
  `kind` VARCHAR(191) NOT NULL,
  `decision` VARCHAR(191) NOT NULL,
  `round` INTEGER NOT NULL DEFAULT 1,
  `comment` TEXT NULL,
  `actor_user_id` VARCHAR(191) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `project_task_stage_reviews_stage_id_created_at_idx`(`stage_id`, `created_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `project_task_stage_reviews` ADD CONSTRAINT `project_task_stage_reviews_stage_id_fkey` FOREIGN KEY (`stage_id`) REFERENCES `project_task_stages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
