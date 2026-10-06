-- Calendário de trabalho da plataforma (B2): dias úteis, expediente e feriados. Padrão = o que sempre valeu (seg-sex, 09:00-17:00, sem feriados).
CREATE TABLE `platform_work_calendar` (
  `id` VARCHAR(191) NOT NULL,
  `work_days` VARCHAR(191) NOT NULL DEFAULT '1,2,3,4,5',
  `start_time` VARCHAR(191) NOT NULL DEFAULT '09:00',
  `end_time` VARCHAR(191) NOT NULL DEFAULT '17:00',
  `updated_by_user_id` VARCHAR(191) NULL,
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE `platform_holidays` (
  `id` VARCHAR(191) NOT NULL,
  `date` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `platform_holidays_date_key`(`date`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
