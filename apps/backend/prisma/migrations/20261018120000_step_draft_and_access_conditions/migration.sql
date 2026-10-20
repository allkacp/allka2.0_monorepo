-- Rascunho da etapa e do acesso (aditivo; nada é apagado nem reescrito).
ALTER TABLE `catalog2_task_steps`
  ADD COLUMN `draft_incomplete` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `draft_saved_at` DATETIME(3) NULL;

ALTER TABLE `catalog2_connection_requirements`
  ADD COLUMN `draft_incomplete` BOOLEAN NOT NULL DEFAULT false;
