-- Suporte ao motor de alertas automáticos (ata 2026-08, 2º lote): a
-- varredura periódica filtra por status + due_date a cada ciclo.
CREATE INDEX `project_tasks_status_due_date_idx` ON `project_tasks`(`status`, `due_date`);
