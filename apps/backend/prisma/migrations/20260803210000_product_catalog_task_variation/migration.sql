-- Modelo de tarefa por variação de produto.
--
-- Nasce da consolidação do catálogo antigo: "Análise de UX até 5/10/20/50
-- páginas" eram 4 produtos, viraram 1 produto com 4 variações — mas cada um
-- tinha o SEU modelo de tarefa, e os 4 acabaram vinculados ao mesmo produto.
-- Resultado: contratar UMA variação gerava as 4 tarefas.
--
-- `variation_id` amarra o vínculo à variação que o originou. NULL mantém o
-- comportamento antigo — "vale para qualquer variação" —, que é o certo para
-- pacote de verdade (vários modelos que sempre nascem juntos).
--
-- ON DELETE SET NULL: apagar uma variação não pode derrubar o vínculo do
-- modelo com o produto; ele só deixa de ser específico.

ALTER TABLE `product_catalog_tasks` ADD COLUMN `variation_id` VARCHAR(191) NULL;

CREATE INDEX `product_catalog_tasks_variation_id_idx` ON `product_catalog_tasks`(`variation_id`);

ALTER TABLE `product_catalog_tasks`
  ADD CONSTRAINT `product_catalog_tasks_variation_id_fkey`
  FOREIGN KEY (`variation_id`) REFERENCES `product_variations`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
