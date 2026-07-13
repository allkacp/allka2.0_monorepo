-- Amplia products.short_description de VARCHAR(191) (padrão implícito do
-- Prisma sem @db.VarChar explícito) para VARCHAR(500). Conteúdo real
-- (PA0003 "Configuração de Google Negócios") tem 251 caracteres — texto
-- legítimo, não dado inválido. Nenhuma perda de dado: ALTER MODIFY apenas
-- amplia o limite, não trunca nada já armazenado.
ALTER TABLE `products` MODIFY `short_description` VARCHAR(500) NULL;
