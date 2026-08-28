-- Bloco 4/5 (ata 2026-08) — "Presença online, oferta e rodízio de tarefas".
-- Aditiva: uma coluna nova opcional em `project_tasks` + duas tabelas novas.
-- Nenhum registro existente muda de comportamento.

ALTER TABLE `project_tasks`
  ADD COLUMN `rotation_episode_key` VARCHAR(191) NULL;

-- Presença mínima e segura (heartbeat autenticado).
CREATE TABLE `user_presence` (
  `user_id`      VARCHAR(191) NOT NULL,
  `last_seen_at` DATETIME(3)  NOT NULL,
  `updated_at`   DATETIME(3)  NOT NULL,
  PRIMARY KEY (`user_id`),
  INDEX `user_presence_last_seen_at_idx` (`last_seen_at`),
  CONSTRAINT `user_presence_user_id_fkey`
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Oferta individual de tarefa a um Nômade (nunca uma lista disputada).
CREATE TABLE `task_offers` (
  `id`                   VARCHAR(191) NOT NULL,
  `project_task_id`      VARCHAR(191) NOT NULL,
  `nomade_id`            VARCHAR(191) NOT NULL,
  `nomade_user_id`       VARCHAR(191) NULL,
  `episode_key`          VARCHAR(191) NOT NULL,
  `rotation_order`       INT          NOT NULL,
  `status`               VARCHAR(191) NOT NULL DEFAULT 'pendente',
  `offered_at`           DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `expires_at`           DATETIME(3)  NOT NULL,
  `responded_at`         DATETIME(3)  NULL,
  `responded_by_user_id` VARCHAR(191) NULL,
  `decline_reason`       TEXT         NULL,
  `close_reason`         VARCHAR(191) NULL,
  `created_at`           DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `task_offers_project_task_id_status_idx` (`project_task_id`, `status`),
  INDEX `task_offers_nomade_id_status_idx` (`nomade_id`, `status`),
  INDEX `task_offers_status_expires_at_idx` (`status`, `expires_at`),
  INDEX `task_offers_episode_key_idx` (`episode_key`),
  CONSTRAINT `task_offers_project_task_id_fkey`
    FOREIGN KEY (`project_task_id`) REFERENCES `project_tasks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
