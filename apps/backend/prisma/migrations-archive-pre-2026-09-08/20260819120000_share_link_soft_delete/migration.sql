-- Gerenciamento de links compartilhados: exclusão vira soft-delete
-- (deleted_at), nunca DELETE destrutivo — preserva o histórico do link e
-- dos comentários/anexos ligados a ele (base pro item futuro de audit
-- log). NULL por padrão cobre todas as linhas já existentes: nenhum link
-- criado antes desta coluna existir é afetado.
ALTER TABLE `share_links`
  ADD COLUMN `deleted_at` DATETIME(3) NULL;
