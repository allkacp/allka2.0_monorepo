-- Especialidade por etapa + componentes de preço personalizados (ligar/desligar)
ALTER TABLE `catalog2_task_steps` ADD COLUMN `specialty_id` VARCHAR(191) NULL;
CREATE INDEX `catalog2_task_steps_specialty_id_idx` ON `catalog2_task_steps`(`specialty_id`);
ALTER TABLE `catalog2_task_steps` ADD CONSTRAINT `catalog2_task_steps_specialty_id_fkey` FOREIGN KEY (`specialty_id`) REFERENCES `catalog2_specialties`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `catalog2_pricing_settings` ADD COLUMN `disabled_components_json` TEXT NULL;

CREATE TABLE `catalog2_pricing_components` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `percent` DOUBLE NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `catalog2_pricing_components_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
