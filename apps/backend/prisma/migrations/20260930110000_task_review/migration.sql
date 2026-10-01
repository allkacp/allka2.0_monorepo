-- Pedido 3 · Fase 2 — Revisão com efeito real (execução → revisão → qualificação → aprovação).
-- 100% ADITIVA: colunas novas com padrão seguro e uma tabela nova. Nenhuma tarefa existente muda de comportamento:
-- `requires_review` nasce falso em tudo (hoje nenhuma tarefa do catálogo usa revisão obrigatória).
-- Reversão (se um dia precisar): DROP TABLE project_task_reviews; e DROP COLUMN das colunas abaixo.

-- AlterTable
ALTER TABLE `catalog2_tasks` ADD COLUMN `reviewer_user_id` VARCHAR(191) NULL,
    ADD COLUMN `review_minutes` INTEGER NULL,
    ADD COLUMN `review_specialty_id` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `catalog2_task_models` ADD COLUMN `requires_review` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `review_minutes` INTEGER NULL,
    ADD COLUMN `review_specialty_id` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `project_tasks` ADD COLUMN `requires_review` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `review_round` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `reviewed_at` DATETIME(3) NULL,
    ADD COLUMN `reviewed_by` VARCHAR(191) NULL,
    ADD COLUMN `reviewer_user_id` VARCHAR(191) NULL,
    ADD COLUMN `review_minutes` INTEGER NULL,
    ADD COLUMN `review_specialty_id` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `project_task_reviews` (
    `id` VARCHAR(191) NOT NULL,
    `project_task_id` VARCHAR(191) NOT NULL,
    `round` INTEGER NOT NULL DEFAULT 1,
    `decision` VARCHAR(191) NOT NULL,
    `comment` TEXT NULL,
    `actor_user_id` VARCHAR(191) NULL,
    `minutes_spent` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `project_task_reviews_project_task_id_round_idx`(`project_task_id`, `round`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `project_task_reviews` ADD CONSTRAINT `project_task_reviews_project_task_id_fkey` FOREIGN KEY (`project_task_id`) REFERENCES `project_tasks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
