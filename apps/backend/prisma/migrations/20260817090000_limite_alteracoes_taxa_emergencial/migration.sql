-- Limite de alterações grátis por tarefa + taxa emergencial. A regra do
-- produto (quantas alterações grátis, valor da extra, % de redução de
-- prazo) fica em Product.metadata e é congelada aqui no momento da compra,
-- mesmo padrão de preco_final_cliente_snapshot/comissao_snapshot. Ver
-- routes/project-tasks.ts (PATCH /:id/reprovar, POST /:id/solicitar-
-- emergencial) e routes/billing.ts (PUT /invoices/:id).
ALTER TABLE `project_products`
  ADD COLUMN `alteracoes_incluidas_snapshot` INT NOT NULL DEFAULT 3,
  ADD COLUMN `valor_alteracao_extra_snapshot` DOUBLE NOT NULL DEFAULT 0,
  ADD COLUMN `taxa_emergencial_reducao_percentual_snapshot` INT NOT NULL DEFAULT 50;

-- Controle do bloqueio (alteração extra) + auditoria da emergencial.
ALTER TABLE `project_tasks`
  ADD COLUMN `alteracoes_extras_pagas` INT NOT NULL DEFAULT 0,
  ADD COLUMN `pending_fee_invoice_id` VARCHAR(191) NULL,
  ADD COLUMN `emergencial_solicitada_em` DATETIME(3) NULL,
  ADD COLUMN `emergencial_solicitada_por` VARCHAR(191) NULL,
  ADD COLUMN `emergencial_reducao_percentual` INT NULL,
  ADD COLUMN `emergencial_invoice_id` VARCHAR(191) NULL;

ALTER TABLE `project_tasks`
  ADD CONSTRAINT `project_tasks_pending_fee_invoice_id_fkey`
    FOREIGN KEY (`pending_fee_invoice_id`) REFERENCES `invoices`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `project_tasks_emergencial_invoice_id_fkey`
    FOREIGN KEY (`emergencial_invoice_id`) REFERENCES `invoices`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX `project_tasks_pending_fee_invoice_id_idx` ON `project_tasks`(`pending_fee_invoice_id`);
CREATE INDEX `project_tasks_emergencial_invoice_id_idx` ON `project_tasks`(`emergencial_invoice_id`);
