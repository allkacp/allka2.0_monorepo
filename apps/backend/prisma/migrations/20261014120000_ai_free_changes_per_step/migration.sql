-- Alterações por IA grátis passam a ser definidas POR ETAPA (cota própria de cada etapa).
-- Só acrescenta colunas nulas: nenhum dado existente muda. A coluna antiga do produto
-- (catalog2_products.ai_free_changes) é mantida, apenas deixa de ser usada na cobrança.
ALTER TABLE `catalog2_task_steps` ADD COLUMN `ai_free_changes` INTEGER NULL;
ALTER TABLE `ai_change_charges` ADD COLUMN `step_key` VARCHAR(191) NULL;
CREATE INDEX `ai_change_charges_project_product_id_step_key_idx` ON `ai_change_charges`(`project_product_id`, `step_key`);
