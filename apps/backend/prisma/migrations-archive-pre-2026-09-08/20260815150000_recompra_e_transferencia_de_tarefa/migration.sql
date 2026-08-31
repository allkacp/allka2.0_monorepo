-- Permite comprar o mesmo produto mais de uma vez no mesmo projeto (ex.:
-- duas instâncias do mesmo produto mensal = mais volume). O histórico de
-- compras (aba "Produtos") continua mostrando todos os vínculos, inclusive
-- cancelados — só a restrição de unicidade por (project_id, product_id) é
-- removida; ela impedia recompra mesmo com o vínculo anterior CANCELADO.
-- Ver routes/project-products.ts (POST /) e
-- components/project-view-slide-panel.tsx (ProductLinkModal).
--
-- A FK project_products_project_id_fkey depende hoje do índice composto
-- (project_id, product_id) como suporte (project_id é o prefixo esquerdo) —
-- precisa de um índice simples em project_id antes de derrubar o composto,
-- senão o MySQL recusa o DROP INDEX (erro 1553).
CREATE INDEX `project_products_project_id_idx` ON `project_products`(`project_id`);
ALTER TABLE `project_products` DROP INDEX `project_products_project_id_product_id_key`;

-- Transferência de tarefa não usada entre projetos (POST
-- /api/project-tasks/:id/transfer) — ver routes/project-tasks.ts.
ALTER TABLE `project_products`
  ADD COLUMN `origin` VARCHAR(191) NOT NULL DEFAULT 'VENDA';

ALTER TABLE `project_tasks`
  ADD COLUMN `transferred_from_project_id` VARCHAR(191) NULL,
  ADD COLUMN `transferred_at` DATETIME(3) NULL,
  ADD COLUMN `transferred_by_user_id` VARCHAR(191) NULL;
