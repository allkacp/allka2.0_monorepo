-- Etapa "Humano ou IA": guarda a segunda opção (IA) com especialidade e tempo próprios.
-- Só acrescenta colunas nulas: nenhuma etapa existente muda.
ALTER TABLE `catalog2_task_steps`
  ADD COLUMN `ai_specialty_id` VARCHAR(191) NULL,
  ADD COLUMN `ai_estimated_minutes` INTEGER NULL;
