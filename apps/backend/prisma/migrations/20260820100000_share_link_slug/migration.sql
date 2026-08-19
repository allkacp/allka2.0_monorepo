-- URL amigável opcional pro link compartilhado (ver routes/share.ts,
-- findShareLinkByIdentifier). NULL por padrão: nenhum link já existente é
-- afetado, continua funcionando só pelo token. Único globalmente (não por
-- tenant) — mais simples, sem ambiguidade, e o slug nunca decide
-- autorização, só localiza o registro.
ALTER TABLE `share_links`
  ADD COLUMN `slug` VARCHAR(191) NULL;

CREATE UNIQUE INDEX `share_links_slug_key` ON `share_links`(`slug`);
