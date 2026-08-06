-- Rastreio da plataforma antiga nos modelos de tarefa.
--
-- Mesmo racional do 20260802120000_add_legacy_tracking: `legacy_id` guarda o id
-- do `task_template` de origem, o que permite (a) consultar a origem e (b)
-- tornar a importação idempotente (upsert por legacy_id em vez de por `code`,
-- que pode ser reaproveitado/editado depois).

ALTER TABLE `catalog_tasks` ADD COLUMN `legacy_id` INT NULL;
CREATE UNIQUE INDEX `catalog_tasks_legacy_id_key` ON `catalog_tasks`(`legacy_id`);
