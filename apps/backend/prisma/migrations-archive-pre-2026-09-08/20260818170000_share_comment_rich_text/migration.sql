-- Editor rico do comentário de share: "content" continua guardando o
-- texto/HTML; content_format distingue comentário antigo (plain, sem
-- mudança de comportamento) de novo (html, sanitizado no backend). Não
-- reescreve nenhuma linha existente — default cobre as antigas.
ALTER TABLE `share_comments`
  ADD COLUMN `content_format` VARCHAR(191) NOT NULL DEFAULT 'plain';
