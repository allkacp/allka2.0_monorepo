-- Reparo "Ver alerta" (ata 2026-08): campo opcional pra montar o destino do
-- botão "Ver" quando entity_id sozinho não é suficiente (etapa -> id da
-- tarefa que a contém, já que não existe rota exclusiva de etapa).
ALTER TABLE `system_alerts` ADD COLUMN `entity_parent_id` VARCHAR(191) NULL;
