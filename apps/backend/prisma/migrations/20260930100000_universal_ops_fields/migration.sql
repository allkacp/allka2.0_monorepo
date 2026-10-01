-- Pedido 3 · Fase 1 — campos operacionais de tarefa/etapa, variações/opções ativas e fotografia operacional.
-- 100% ADITIVA: só colunas novas (NULL ou com padrão seguro) e uma tabela nova. Nada é alterado nem apagado.
-- Reversão (se um dia precisar): DROP TABLE project_task_ops; e DROP COLUMN das colunas abaixo.

-- AlterTable
ALTER TABLE `catalog2_tasks` ADD COLUMN `ops` JSON NULL;

-- AlterTable
ALTER TABLE `catalog2_task_models` ADD COLUMN `ops` JSON NULL;

-- AlterTable
ALTER TABLE `catalog2_task_steps` ADD COLUMN `ops` JSON NULL;

-- AlterTable
ALTER TABLE `catalog2_step_models` ADD COLUMN `ops` JSON NULL;

-- AlterTable
ALTER TABLE `catalog2_variations` ADD COLUMN `is_active` BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE `catalog2_variation_options` ADD COLUMN `is_active` BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE `project_task_ops` (
    `id` VARCHAR(191) NOT NULL,
    `project_task_id` VARCHAR(191) NOT NULL,
    `task_ops` JSON NULL,
    `stage_ops` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `project_task_ops_project_task_id_key`(`project_task_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `project_task_ops` ADD CONSTRAINT `project_task_ops_project_task_id_fkey` FOREIGN KEY (`project_task_id`) REFERENCES `project_tasks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
