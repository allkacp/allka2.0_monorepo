-- A distribuição de uma contratação é uma fotografia da execução, não uma
-- regra do catálogo. Cada ProjectTask conserva quantas unidades compõem seu
-- lote e sua posição na divisão escolhida pelo cliente.
ALTER TABLE `project_tasks`
  ADD COLUMN `delivery_quantity` INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN `delivery_group_index` INTEGER NOT NULL DEFAULT 0;
