-- Prazo comercial base informado em horas úteis (os dias continuam como reflexo). Nulo = comportamento anterior.
ALTER TABLE `catalog2_product_versions` ADD COLUMN `base_commercial_deadline_hours` INTEGER NULL;
