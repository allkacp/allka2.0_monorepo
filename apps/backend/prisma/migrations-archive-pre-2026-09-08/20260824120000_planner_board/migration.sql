-- Planejador persistente (Admin → Projetos → Planejador). Duas tabelas
-- novas, não altera nenhuma coluna existente. Entidade própria, não uma
-- view de `projects` — `project_id` é só um vínculo leve e opcional
-- ("este card se refere a este projeto"), sem herdar status/lifecycle de
-- Project. Quadro pessoal (owner_user_id): cada usuário só vê o próprio.
-- Arquivamento lógico (archived_at) em vez de exclusão física.
CREATE TABLE `planner_columns` (
  `id` VARCHAR(191) NOT NULL,
  `owner_user_id` VARCHAR(191) NOT NULL,
  `label` VARCHAR(191) NOT NULL,
  `color` VARCHAR(191) NOT NULL DEFAULT 'bg-slate-500',
  `position` INTEGER NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `planner_columns_owner_user_id_idx` ON `planner_columns`(`owner_user_id`);

ALTER TABLE `planner_columns` ADD CONSTRAINT `planner_columns_owner_user_id_fkey` FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE `planner_cards` (
  `id` VARCHAR(191) NOT NULL,
  `owner_user_id` VARCHAR(191) NOT NULL,
  `column_id` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `description` TEXT NULL,
  `priority` VARCHAR(191) NOT NULL DEFAULT 'medium',
  `due_date` DATETIME(3) NULL,
  `project_id` VARCHAR(191) NULL,
  `position` INTEGER NOT NULL DEFAULT 0,
  `archived_at` DATETIME(3) NULL,
  `updated_by_user_id` VARCHAR(191) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `planner_cards_owner_user_id_idx` ON `planner_cards`(`owner_user_id`);
CREATE INDEX `planner_cards_column_id_idx` ON `planner_cards`(`column_id`);
CREATE INDEX `planner_cards_project_id_idx` ON `planner_cards`(`project_id`);

ALTER TABLE `planner_cards` ADD CONSTRAINT `planner_cards_owner_user_id_fkey` FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `planner_cards` ADD CONSTRAINT `planner_cards_column_id_fkey` FOREIGN KEY (`column_id`) REFERENCES `planner_columns`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `planner_cards` ADD CONSTRAINT `planner_cards_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
