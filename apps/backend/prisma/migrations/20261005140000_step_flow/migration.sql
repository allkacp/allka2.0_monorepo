-- Reunião 2026-10-05 (A8): etapas em paralelo/dependências e regra de executor. Tudo opcional; padrão = comportamento antigo.
ALTER TABLE `catalog2_task_steps` ADD COLUMN `depends_on_json` TEXT NULL, ADD COLUMN `executor_policy` VARCHAR(191) NOT NULL DEFAULT 'auto', ADD COLUMN `executor_same_as_key` VARCHAR(191) NULL;
ALTER TABLE `project_task_stages` ADD COLUMN `depende_de_json` TEXT NULL, ADD COLUMN `herdar_executor_de` VARCHAR(191) NULL;
