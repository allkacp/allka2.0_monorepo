-- Snapshot Histórico Oficial — preparação (sprint de produtos).
--
-- Torna EXPLÍCITO o tipo do lote (preview | official) em vez de inferir do
-- texto do nome ("[TESTE LOCAL] ..."), e adiciona a marca de imutabilidade
-- (`sealed_at`) usada pelo importador para tratar um snapshot oficial como
-- registro histórico que nunca é sobrescrito.
--
-- Lotes já existentes continuam `preview` pelo DEFAULT — NENHUMA
-- reclassificação do lote de prévia atual.

-- AlterTable
ALTER TABLE `legacy_import_batches`
    ADD COLUMN `kind` VARCHAR(191) NOT NULL DEFAULT 'preview',
    ADD COLUMN `sealed_at` DATETIME(3) NULL;

-- CreateIndex
CREATE INDEX `legacy_import_batches_kind_idx` ON `legacy_import_batches`(`kind`);
