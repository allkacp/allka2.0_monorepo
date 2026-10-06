-- Execução por etapa, fase 1 (2026-10-05): quem recebe a etapa (nômade, líder ou equipe interna) e líder específico. Padrão = nômade, como sempre.
ALTER TABLE `catalog2_task_steps` ADD COLUMN `executor_kind` VARCHAR(191) NOT NULL DEFAULT 'nomad', ADD COLUMN `leader_mode` VARCHAR(191) NOT NULL DEFAULT 'auto', ADD COLUMN `leader_user_id` VARCHAR(191) NULL;
