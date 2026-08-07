-- Situação da conta do usuário.
--
-- Até aqui o usuário só tinha `is_active` (booleano). O painel de usuário
-- oferecia quatro situações — Ativo, Inativo, Pausado, Suspenso — mas gravava
-- num campo `status` que não existia: o schema de update nem o conhecia, o
-- zod descartava, e a escolha do admin voltava ao recarregar a página.
--
-- Agora a situação é uma coluna de verdade. `is_active` continua existindo e
-- é mantido em sincronia (ativo => true, qualquer outra => false), porque
-- índices, filtros e consultas de toda a plataforma dependem dele.
--
-- O que cada situação significa no login (ver routes/auth.ts):
--   ativo    → entra normalmente
--   inativo  → conta desligada; não entra
--   pausado  → suspensão temporária, reversível pelo admin; não entra
--   suspenso → bloqueio por violação/pendência; não entra
--
-- "Pausado" aqui é a pausa DECIDIDA pelo admin. Não confundir com a pausa
-- automática por inatividade (>=90 dias sem login), que continua sendo
-- calculada a partir de `last_login`/`reactivation_review_required`.

ALTER TABLE `users`
  ADD COLUMN `status` VARCHAR(191) NOT NULL DEFAULT 'ativo';

-- Backfill a partir do que já existia: quem estava inativo vira "inativo".
UPDATE `users` SET `status` = 'inativo' WHERE `is_active` = 0;

CREATE INDEX `users_status_idx` ON `users`(`status`);
