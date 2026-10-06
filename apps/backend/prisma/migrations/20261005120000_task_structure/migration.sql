-- Reunião 2026-10-05: produto individual = uma tarefa principal; combos = várias. Padrão "multiple" mantém todos os produtos como estão.
ALTER TABLE `catalog2_products` ADD COLUMN `task_structure` VARCHAR(191) NOT NULL DEFAULT 'multiple';
