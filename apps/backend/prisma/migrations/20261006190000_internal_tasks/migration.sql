-- D2: tarefas internas da conta (agência ou empresa) — quadro da equipe, com prazo, responsável e ligação com projeto/passo PLAC (2026-10-06).
CREATE TABLE `internal_tasks` (
  `id` VARCHAR(191) NOT NULL,
  `agency_id` VARCHAR(191) NULL,
  `company_id` VARCHAR(191) NULL,
  `title` VARCHAR(191) NOT NULL,
  `description` TEXT NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'todo',
  `priority` VARCHAR(191) NOT NULL DEFAULT 'medium',
  `due_date` DATETIME(3) NULL,
  `project_id` VARCHAR(191) NULL,
  `assignee_user_id` VARCHAR(191) NULL,
  `created_by_user_id` VARCHAR(191) NOT NULL,
  `completed_at` DATETIME(3) NULL,
  `position` INTEGER NOT NULL DEFAULT 0,
  `checklist_json` TEXT NULL,
  `source_kind` VARCHAR(191) NULL,
  `source_id` VARCHAR(191) NULL,
  `overdue_alerted_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  UNIQUE INDEX `internal_tasks_source_kind_source_id_key`(`source_kind`, `source_id`),
  INDEX `internal_tasks_agency_id_status_idx`(`agency_id`, `status`),
  INDEX `internal_tasks_company_id_status_idx`(`company_id`, `status`),
  INDEX `internal_tasks_assignee_user_id_idx`(`assignee_user_id`),
  INDEX `internal_tasks_status_due_date_idx`(`status`, `due_date`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `internal_task_comments` (
  `id` VARCHAR(191) NOT NULL,
  `task_id` VARCHAR(191) NOT NULL,
  `author_user_id` VARCHAR(191) NOT NULL,
  `body` TEXT NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `internal_task_comments_task_id_created_at_idx`(`task_id`, `created_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `internal_task_comments` ADD CONSTRAINT `internal_task_comments_task_id_fkey` FOREIGN KEY (`task_id`) REFERENCES `internal_tasks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE `internal_task_settings` (
  `id` VARCHAR(191) NOT NULL,
  `audience` VARCHAR(191) NOT NULL DEFAULT 'agency,partner',
  `auto_from_plac` BOOLEAN NOT NULL DEFAULT false,
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
