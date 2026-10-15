-- Horas extras de uma opção podem ter especialidade própria (ex.: variação nova que o produto original não tem). Só acrescenta coluna nula.
ALTER TABLE `catalog2_option_effects` ADD COLUMN `specialty_id` VARCHAR(40) NULL;
