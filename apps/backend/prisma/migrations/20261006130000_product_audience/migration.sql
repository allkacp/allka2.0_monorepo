-- Visibilidade do produto por público (C7): all | company | agency | internal (+ nível mínimo de parceiro para agências). Padrão: todos.
ALTER TABLE `catalog2_products` ADD COLUMN `visibility_mode` VARCHAR(191) NOT NULL DEFAULT 'all', ADD COLUMN `visibility_min_partner_level` VARCHAR(191) NULL;
