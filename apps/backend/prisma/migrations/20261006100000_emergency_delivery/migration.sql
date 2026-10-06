-- Entrega emergencial (B3): opcional por produto; reduções e adicionais por etapa. Padrão: desligado.
ALTER TABLE `catalog2_product_versions` ADD COLUMN `emergency_enabled` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `catalog2_task_steps` ADD COLUMN `emergency_reduction_minutes` INTEGER NULL, ADD COLUMN `emergency_extra_kind` VARCHAR(191) NULL, ADD COLUMN `emergency_extra_value` DOUBLE NULL;
