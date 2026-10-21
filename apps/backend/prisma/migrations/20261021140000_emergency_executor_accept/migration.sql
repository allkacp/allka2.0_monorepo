-- R21-11: aceite do profissional na entrega rápida pós-compra (aditivo).
ALTER TABLE `project_tasks`
  ADD COLUMN `emergencial_status` VARCHAR(20) NULL,
  ADD COLUMN `emergencial_resposta_ate` DATETIME(3) NULL,
  ADD COLUMN `emergencial_novo_prazo` DATETIME(3) NULL,
  ADD COLUMN `emergencial_valor` DOUBLE NULL;
