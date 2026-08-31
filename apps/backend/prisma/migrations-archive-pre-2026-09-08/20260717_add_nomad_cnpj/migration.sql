-- Nômade agora exige CNPJ válido para prestar serviços à plataforma.
-- Nullable no banco (dados legados anteriores a esta regra); obrigatório
-- na validação de criação em POST /api/users (ver src/routes/users.ts).
ALTER TABLE `nomades` ADD COLUMN `cnpj` VARCHAR(191) NULL;

CREATE UNIQUE INDEX `nomades_cnpj_key` ON `nomades`(`cnpj`);
