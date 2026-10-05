-- Mídia e ícone opcionais, configurados pelo administrador, para opções de variação.
ALTER TABLE `catalog2_variation_options`
  ADD COLUMN `media_url` TEXT NULL,
  ADD COLUMN `icon_key` VARCHAR(60) NULL;
