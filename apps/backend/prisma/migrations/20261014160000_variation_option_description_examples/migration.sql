-- Opção de variação: descrição curta para o cliente, links de exemplos de entregável e arquivo-modelo do entregável.
-- Só acrescenta colunas nulas: nenhuma opção existente muda.
ALTER TABLE `catalog2_variation_options`
  ADD COLUMN `short_description` VARCHAR(500) NULL,
  ADD COLUMN `example_links_json` TEXT NULL,
  ADD COLUMN `example_file_json` TEXT NULL;
