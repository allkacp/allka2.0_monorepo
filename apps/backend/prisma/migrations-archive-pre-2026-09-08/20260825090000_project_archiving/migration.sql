-- Arquivamento de projetos reais (ata 2026-08: "Arquivar Projetos") — soft
-- state reversível, nunca exclusão física. `status` não é reaproveitado pra
-- isso (já tem "cancelled"/"completed" com significado próprio distinto).
-- Migration compatível com dados existentes: todas as três colunas são
-- opcionais/nulas por padrão, então nenhum projeto existente é afetado.
ALTER TABLE `projects`
  ADD COLUMN `archived_at` DATETIME(3) NULL,
  ADD COLUMN `archive_reason` TEXT NULL,
  ADD COLUMN `archived_by_user_id` VARCHAR(191) NULL;

CREATE INDEX `projects_archived_by_user_id_idx` ON `projects`(`archived_by_user_id`);
CREATE INDEX `projects_archived_at_idx` ON `projects`(`archived_at`);

ALTER TABLE `projects`
  ADD CONSTRAINT `projects_archived_by_user_id_fkey`
  FOREIGN KEY (`archived_by_user_id`) REFERENCES `users`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
