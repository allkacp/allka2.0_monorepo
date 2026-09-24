-- Controles persistidos do encaminhamento de Nômades (reunião 2026-09-18).
ALTER TABLE `project_tasks`
  ADD COLUMN `auto_nomad_dispatch_enabled` BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE `task_offers`
  ADD COLUMN `rotation_round` INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN `is_mandatory` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `assigned_by_user_id` VARCHAR(191) NULL;

CREATE TABLE `task_routing_settings` (
  `id` VARCHAR(191) NOT NULL,
  `offer_timeout_minutes` INTEGER NOT NULL DEFAULT 60,
  `mandatory_decline_alerts` BOOLEAN NOT NULL DEFAULT true,
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `task_routing_area_policies` (
  `area` VARCHAR(191) NOT NULL,
  `auto_nomad_dispatch_enabled` BOOLEAN NOT NULL DEFAULT true,
  `updated_by_user_id` VARCHAR(191) NULL,
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`area`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `task_offers_project_task_id_rotation_round_idx`
  ON `task_offers`(`project_task_id`, `rotation_round`);
