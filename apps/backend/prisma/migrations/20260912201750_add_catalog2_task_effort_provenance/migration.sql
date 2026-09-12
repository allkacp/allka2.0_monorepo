-- Reunião 10/09 ("36 produtos funcionalmente completos para teste") —
-- procedência aditiva do esforço em Catalog2Task. Defaults compatíveis com
-- as 102 tarefas já existentes (effort_is_provisional=false,
-- effort_source=null) — nada muda pra elas até o script de preenchimento
-- provisório rodar.
-- AlterTable
ALTER TABLE `catalog2_tasks`
  ADD COLUMN `effort_is_provisional` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `effort_provisional_reason` TEXT NULL,
  ADD COLUMN `effort_source` VARCHAR(191) NULL;
