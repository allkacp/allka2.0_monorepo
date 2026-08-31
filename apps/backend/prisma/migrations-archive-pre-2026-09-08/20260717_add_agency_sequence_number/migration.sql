-- Adiciona numeração emp_N (sequence_number) também para Agency, seguindo
-- o mesmo padrão já usado em Company. Nullable/unique — não é atribuída
-- automaticamente, apenas setada manualmente caso a caso.
ALTER TABLE `agencies` ADD COLUMN `sequence_number` INT NULL;
CREATE UNIQUE INDEX `agencies_sequence_number_key` ON `agencies`(`sequence_number`);
