-- Link direto/compartilhável do produto do catalog2 usa um ID numérico
-- curto (/catalogo-produtos/:sequence_number) em vez do slug completo —
-- achado do usuário 2026-09-23. AUTO_INCREMENT numera as linhas já
-- existentes automaticamente, na ordem da PK, ao ser adicionado a uma
-- tabela existente.
ALTER TABLE `catalog2_products`
  ADD COLUMN `sequence_number` INT NOT NULL AUTO_INCREMENT UNIQUE;
