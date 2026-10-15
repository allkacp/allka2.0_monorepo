-- A variação já faz parte do produto original? (padrão: sim, o comportamento de sempre). Quando não faz, nenhuma opção é padrão e todas somam.
ALTER TABLE `catalog2_variations` ADD COLUMN `base_included` BOOLEAN NOT NULL DEFAULT true;
