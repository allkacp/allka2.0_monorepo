-- Etapa em ciclos: um registro por ciclo (período, entrega, aprovação do cliente). Aditivo.
CREATE TABLE `project_task_stage_cycles` (
  `id` VARCHAR(191) NOT NULL,
  `stage_id` VARCHAR(191) NOT NULL,
  `cycle_index` INTEGER NOT NULL,
  `from_day` INTEGER NOT NULL,
  `to_day` INTEGER NOT NULL,
  `approval_window_days` INTEGER NOT NULL,
  `hours` DOUBLE NULL,
  `rule` TEXT NULL,
  `starts_at` DATETIME(3) NOT NULL,
  `ends_at` DATETIME(3) NOT NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'agendado',
  `delivered_at` DATETIME(3) NULL,
  `delivered_by` VARCHAR(191) NULL,
  `delivery_note` TEXT NULL,
  `approval_due_at` DATETIME(3) NULL,
  `decided_at` DATETIME(3) NULL,
  `decided_by` VARCHAR(191) NULL,
  `client_comment` TEXT NULL,
  `guidance_from_previous` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  UNIQUE INDEX `project_task_stage_cycles_stage_id_cycle_index_key`(`stage_id`, `cycle_index`),
  INDEX `project_task_stage_cycles_status_starts_at_idx`(`status`, `starts_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `project_task_stage_cycles` ADD CONSTRAINT `project_task_stage_cycles_stage_id_fkey` FOREIGN KEY (`stage_id`) REFERENCES `project_task_stages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
