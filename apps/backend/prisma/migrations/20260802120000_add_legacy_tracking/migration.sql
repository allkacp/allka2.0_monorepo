-- Rastreio da plataforma antiga (Dump20260423.sql).
--
-- `legacy_id` guarda o id numérico do registro equivalente no sistema antigo,
-- pra (a) consultar a origem de qualquer registro importado e (b) tornar os
-- scripts de importação idempotentes (upsert por legacy_id). Nullable: só
-- registros importados têm valor. UNIQUE porque a origem é 1:1 — no MySQL,
-- índice único permite múltiplos NULL, então os registros nativos não colidem.
--
-- `projects.legacy_client_id` existe porque Project não tem FK para Client no
-- modelo novo; é o único jeito de preservar qual cliente antigo era o dono.
--
-- `project_tasks.legacy_model` marca a tarefa que continua no formato antigo
-- (não foi possível adaptá-la ao produto/CatalogTask novo).

ALTER TABLE `users`            ADD COLUMN `legacy_id` INT NULL;
ALTER TABLE `companies`        ADD COLUMN `legacy_id` INT NULL;
ALTER TABLE `clients`          ADD COLUMN `legacy_id` INT NULL;
ALTER TABLE `agencies`         ADD COLUMN `legacy_id` INT NULL;
ALTER TABLE `nomades`          ADD COLUMN `legacy_id` INT NULL;
ALTER TABLE `products`         ADD COLUMN `legacy_id` INT NULL;
ALTER TABLE `project_products` ADD COLUMN `legacy_id` INT NULL;

ALTER TABLE `projects`
  ADD COLUMN `legacy_id` INT NULL,
  ADD COLUMN `legacy_client_id` INT NULL;

ALTER TABLE `project_tasks`
  ADD COLUMN `legacy_id` INT NULL,
  ADD COLUMN `legacy_model` BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX `users_legacy_id_key`            ON `users`(`legacy_id`);
CREATE UNIQUE INDEX `companies_legacy_id_key`        ON `companies`(`legacy_id`);
CREATE UNIQUE INDEX `clients_legacy_id_key`          ON `clients`(`legacy_id`);
CREATE UNIQUE INDEX `agencies_legacy_id_key`         ON `agencies`(`legacy_id`);
CREATE UNIQUE INDEX `nomades_legacy_id_key`          ON `nomades`(`legacy_id`);
CREATE UNIQUE INDEX `products_legacy_id_key`         ON `products`(`legacy_id`);
CREATE UNIQUE INDEX `project_products_legacy_id_key` ON `project_products`(`legacy_id`);
CREATE UNIQUE INDEX `projects_legacy_id_key`         ON `projects`(`legacy_id`);
CREATE UNIQUE INDEX `project_tasks_legacy_id_key`    ON `project_tasks`(`legacy_id`);
