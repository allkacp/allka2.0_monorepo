-- Pagamento do nômade na execução por etapa (A8b-4): at_end (padrão: créditos só no fim da tarefa) | per_stage (cada etapa aprovada paga o nômade dela).
ALTER TABLE `catalog2_tasks` ADD COLUMN `stage_payout_mode` VARCHAR(191) NOT NULL DEFAULT 'at_end';
ALTER TABLE `project_tasks` ADD COLUMN `stage_payout_mode` VARCHAR(191) NOT NULL DEFAULT 'at_end';
