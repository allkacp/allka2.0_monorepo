-- Tela de "Cards arquivados" do Planejador. Não cria tabela nova — só
-- corrige uma garantia que faltava: `planner_cards.column_id` era
-- obrigatório com ON DELETE CASCADE, então excluir uma coluna que só
-- tinha cards ARQUIVADOS (a exclusão de coluna já bloqueava por cards
-- ativos, mas nunca olhava os arquivados) destruía esses cards junto —
-- contradizendo "arquivar não é apagar". Agora `column_id` é opcional e
-- ON DELETE SET NULL: a coluna pode sumir e o card arquivado sobrevive
-- (a restauração cai pro Backlog/coluna padrão quando column_id é nulo
-- ou não existe mais — ver routes/planner.ts).
ALTER TABLE `planner_cards` DROP FOREIGN KEY `planner_cards_column_id_fkey`;
ALTER TABLE `planner_cards` MODIFY `column_id` VARCHAR(191) NULL;
ALTER TABLE `planner_cards` ADD CONSTRAINT `planner_cards_column_id_fkey` FOREIGN KEY (`column_id`) REFERENCES `planner_columns`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
