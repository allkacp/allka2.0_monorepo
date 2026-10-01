-- Pedido 3 · Fase 3 — entregáveis/anexos estruturados + dependência por entregável e por tipo de ciclo.
-- 100% ADITIVA: duas tabelas novas e colunas com padrão seguro em regras de dependência
-- (applies_to = 'all' mantém exatamente o comportamento atual). Nenhuma regra existente muda.
-- Reversão (se um dia precisar): DROP TABLE project_task_deliverables, catalog2_task_deliverables; DROP COLUMN das colunas abaixo.

-- AlterTable
ALTER TABLE `catalog2_dependency_rules` ADD COLUMN `target_deliverable_key` VARCHAR(191) NULL,
    ADD COLUMN `applies_to` VARCHAR(191) NOT NULL DEFAULT 'all';

-- AlterTable
ALTER TABLE `project_dependency_rules` ADD COLUMN `target_deliverable_key` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `catalog2_task_deliverables` (
    `id` VARCHAR(191) NOT NULL,
    `task_id` VARCHAR(191) NOT NULL,
    `step_id` VARCHAR(191) NULL,
    `key` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `type` VARCHAR(191) NOT NULL DEFAULT 'arquivo',
    `responsible` VARCHAR(191) NOT NULL DEFAULT 'executor',
    `is_required` BOOLEAN NOT NULL DEFAULT true,
    `requires_approval` BOOLEAN NOT NULL DEFAULT true,
    `visibility` VARCHAR(191) NOT NULL DEFAULT 'client',
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `catalog2_task_deliverables_step_id_idx`(`step_id`),
    UNIQUE INDEX `catalog2_task_deliverables_task_id_key_key`(`task_id`, `key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `project_task_deliverables` (
    `id` VARCHAR(191) NOT NULL,
    `project_task_id` VARCHAR(191) NOT NULL,
    `project_task_stage_id` VARCHAR(191) NULL,
    `catalog2_deliverable_id` VARCHAR(191) NULL,
    `key` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `type` VARCHAR(191) NOT NULL DEFAULT 'arquivo',
    `responsible` VARCHAR(191) NOT NULL DEFAULT 'executor',
    `is_required` BOOLEAN NOT NULL DEFAULT true,
    `requires_approval` BOOLEAN NOT NULL DEFAULT true,
    `visibility` VARCHAR(191) NOT NULL DEFAULT 'client',
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pendente',
    `content_url` VARCHAR(1000) NULL,
    `content_text` TEXT NULL,
    `content_name` VARCHAR(191) NULL,
    `submitted_at` DATETIME(3) NULL,
    `submitted_by` VARCHAR(191) NULL,
    `reviewed_at` DATETIME(3) NULL,
    `reviewed_by` VARCHAR(191) NULL,
    `review_comment` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `project_task_deliverables_project_task_id_status_idx`(`project_task_id`, `status`),
    UNIQUE INDEX `project_task_deliverables_project_task_id_key_key`(`project_task_id`, `key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `catalog2_task_deliverables` ADD CONSTRAINT `catalog2_task_deliverables_task_id_fkey` FOREIGN KEY (`task_id`) REFERENCES `catalog2_tasks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `catalog2_task_deliverables` ADD CONSTRAINT `catalog2_task_deliverables_step_id_fkey` FOREIGN KEY (`step_id`) REFERENCES `catalog2_task_steps`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_task_deliverables` ADD CONSTRAINT `project_task_deliverables_project_task_id_fkey` FOREIGN KEY (`project_task_id`) REFERENCES `project_tasks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_task_deliverables` ADD CONSTRAINT `project_task_deliverables_project_task_stage_id_fkey` FOREIGN KEY (`project_task_stage_id`) REFERENCES `project_task_stages`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
