-- Fechamento tecnico do sprint de produtos — lote de virada comercial.
-- 100%% aditiva: 1 tabela nova (catalog2_cutover_batches), so' registro de
-- auditoria de execucoes REAIS do cutover (--apply). Nenhum dos 162
-- produtos operacionais e' tocado por esta migration; nenhum dos 36 e'
-- publicado.

CREATE TABLE `catalog2_cutover_batches` (
    `id` VARCHAR(191) NOT NULL,
    `actor` VARCHAR(191) NOT NULL,
    `applied_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `operational_products_deactivated` INTEGER NOT NULL,
    `catalog2_products_published` INTEGER NOT NULL,
    `affected_products_checksum` VARCHAR(191) NOT NULL,
    `affected_product_ids_json` LONGTEXT NOT NULL,
    `reversed_at` DATETIME(3) NULL,
    `reversed_by` VARCHAR(191) NULL,
    `reversal_note` TEXT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
