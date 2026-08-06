-- Primeiro acesso: usuário define a própria senha.
--
-- Nasce da importação da plataforma antiga: 809 usuários vieram com o hash
-- bcrypt do sistema antigo (a senha antiga deles ainda valia) e 238 nômades
-- nunca tiveram login. Em vez de manter senha herdada ou inventar senha
-- provisória, todo usuário importado passa a definir a própria senha no
-- primeiro acesso.
--
-- `must_set_password` bloqueia o login enquanto a senha não for definida.
-- `password_setup_token` é o token do link de primeiro acesso — o projeto não
-- tem envio de e-mail, então o link é gerado e entregue pela operação. Guardado
-- como HASH (sha256), nunca em texto puro: quem tem acesso ao banco não
-- consegue se passar por outro usuário.

ALTER TABLE `users`
  ADD COLUMN `must_set_password`        BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN `password_setup_token`     VARCHAR(64) NULL,
  ADD COLUMN `password_setup_expires_at` DATETIME(3) NULL;

CREATE UNIQUE INDEX `users_password_setup_token_key` ON `users`(`password_setup_token`);
CREATE INDEX `users_must_set_password_idx` ON `users`(`must_set_password`);
