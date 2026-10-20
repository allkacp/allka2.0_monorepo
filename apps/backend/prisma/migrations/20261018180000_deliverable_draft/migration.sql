-- Entregável salvo como rascunho (aditivo; nada é apagado nem reescrito).
ALTER TABLE `catalog2_task_deliverables`
  ADD COLUMN `draft_incomplete` BOOLEAN NOT NULL DEFAULT false;
