-- Imagem ou ícone opcional por adicional, definido pelo administrador.
ALTER TABLE `catalog2_addons`
  ADD COLUMN `media_url` TEXT NULL,
  ADD COLUMN `icon_key` VARCHAR(60) NULL;
