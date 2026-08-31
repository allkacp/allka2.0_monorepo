-- Sprint de produtos, bloco 6/6 — checkout, pedido, financeiro, projeto,
-- tarefas e aditivos do novo catalogo. 100%% aditiva:
--   * project_products.product_id e project_tasks.product_id passam a ser
--     opcionais (uma linha nascida do catalog2 nao tem produto do catalogo
--     antigo) — nenhum dado existente e alterado, so a constraint;
--   * colunas novas em project_products, project_tasks e projects para
--     rastrear a origem catalog2;
--   * tabela nova catalog2_change_orders (aditivo pos-venda).
-- Nenhum dos 162 produtos operacionais e tocado; nenhum dos 36 e publicado;
-- Legacy nao e tocado.

-- ── project_products: product_id opcional + colunas catalog2 ──────────────
ALTER TABLE `project_products` DROP FOREIGN KEY `project_products_product_id_fkey`;
ALTER TABLE `project_products` MODIFY COLUMN `product_id` VARCHAR(191) NULL;
ALTER TABLE `project_products`
  ADD COLUMN `catalog2_product_id` VARCHAR(191) NULL,
  ADD COLUMN `catalog2_version_id` VARCHAR(191) NULL,
  ADD COLUMN `origin_catalog2_quote_id` VARCHAR(191) NULL,
  ADD COLUMN `origin_catalog2_change_order_id` VARCHAR(191) NULL;

CREATE UNIQUE INDEX `project_products_origin_catalog2_quote_id_key` ON `project_products`(`origin_catalog2_quote_id`);
CREATE UNIQUE INDEX `project_products_origin_catalog2_change_order_id_key` ON `project_products`(`origin_catalog2_change_order_id`);
CREATE INDEX `project_products_catalog2_product_id_idx` ON `project_products`(`catalog2_product_id`);

ALTER TABLE `project_products` ADD CONSTRAINT `project_products_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `project_products` ADD CONSTRAINT `project_products_catalog2_product_id_fkey` FOREIGN KEY (`catalog2_product_id`) REFERENCES `catalog2_products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `project_products` ADD CONSTRAINT `project_products_catalog2_version_id_fkey` FOREIGN KEY (`catalog2_version_id`) REFERENCES `catalog2_product_versions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- ── project_tasks: product_id opcional + colunas catalog2 ─────────────────
ALTER TABLE `project_tasks` DROP FOREIGN KEY `project_tasks_product_id_fkey`;
ALTER TABLE `project_tasks` MODIFY COLUMN `product_id` VARCHAR(191) NULL;
ALTER TABLE `project_tasks`
  ADD COLUMN `catalog2_task_id` VARCHAR(191) NULL,
  ADD COLUMN `catalog2_product_id` VARCHAR(191) NULL,
  ADD COLUMN `catalog2_version_id` VARCHAR(191) NULL;

CREATE INDEX `project_tasks_catalog2_task_id_idx` ON `project_tasks`(`catalog2_task_id`);

ALTER TABLE `project_tasks` ADD CONSTRAINT `project_tasks_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `project_tasks` ADD CONSTRAINT `project_tasks_catalog2_task_id_fkey` FOREIGN KEY (`catalog2_task_id`) REFERENCES `catalog2_tasks`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- ── projects: idempotencia do checkout ─────────────────────────────────────
ALTER TABLE `projects` ADD COLUMN `catalog2_checkout_client_action_id` VARCHAR(191) NULL;
CREATE UNIQUE INDEX `projects_catalog2_checkout_client_action_id_key` ON `projects`(`catalog2_checkout_client_action_id`);

-- ── catalog2_change_orders: aditivo pos-venda ──────────────────────────────
CREATE TABLE `catalog2_change_orders` (
    `id` VARCHAR(191) NOT NULL,
    `project_id` VARCHAR(191) NOT NULL,
    `original_project_product_id` VARCHAR(191) NULL,
    `quote_id` VARCHAR(191) NOT NULL,
    `requested_by_user_id` VARCHAR(191) NOT NULL,
    `request_note` TEXT NULL,
    `change_summary` TEXT NOT NULL,
    `price_impact_snapshot` DOUBLE NULL,
    `deadline_impact_days_snapshot` INTEGER NULL,
    `currency_snapshot` VARCHAR(191) NOT NULL DEFAULT 'BRL',
    `status` VARCHAR(191) NOT NULL DEFAULT 'solicitado',
    `decided_by_user_id` VARCHAR(191) NULL,
    `decided_at` DATETIME(3) NULL,
    `decision_note` TEXT NULL,
    `approval_client_action_id` VARCHAR(191) NULL,
    `materialized_project_product_id` VARCHAR(191) NULL,
    `materialized_payment_id` VARCHAR(191) NULL,
    `requested_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `catalog2_change_orders_quote_id_key`(`quote_id`),
    UNIQUE INDEX `catalog2_change_orders_approval_client_action_id_key`(`approval_client_action_id`),
    UNIQUE INDEX `catalog2_change_orders_materialized_project_product_id_key`(`materialized_project_product_id`),
    INDEX `catalog2_change_orders_project_id_status_idx`(`project_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `catalog2_change_orders` ADD CONSTRAINT `catalog2_change_orders_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `catalog2_change_orders` ADD CONSTRAINT `catalog2_change_orders_original_project_product_id_fkey` FOREIGN KEY (`original_project_product_id`) REFERENCES `project_products`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `catalog2_change_orders` ADD CONSTRAINT `catalog2_change_orders_quote_id_fkey` FOREIGN KEY (`quote_id`) REFERENCES `catalog2_quotes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
