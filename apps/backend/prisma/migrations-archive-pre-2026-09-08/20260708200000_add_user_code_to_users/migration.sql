-- Adiciona user_code (código público/exibido, ex.: "00001") ao User.
-- Puramente aditivo: coluna nullable, sem tocar em nenhuma linha existente.
-- Nunca usar user_code em FK/lookup técnico — só exibição na UI.
ALTER TABLE `users`
  ADD COLUMN `user_code` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `users_user_code_key` ON `users`(`user_code`);
