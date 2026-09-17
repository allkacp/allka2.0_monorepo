-- Item 7.1 (reuniao 2026-09-14, "Fechar a integridade do historico") --
-- marco PERSISTIDO (nunca fixo no codigo, nunca a data da reuniao) do
-- instante em que o registro de historico do catalog2 passou a estar
-- completo neste ambiente. Tabela singleton, populada de forma preguicosa
-- (upsert) na primeira leitura/escrita de historico -- ver
-- getCatalog2HistoryCoverageMarker em lib/catalog2-product-history.ts.

-- CreateTable
CREATE TABLE `catalog2_history_coverage_markers` (
    `id` VARCHAR(191) NOT NULL,
    `full_coverage_since` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
