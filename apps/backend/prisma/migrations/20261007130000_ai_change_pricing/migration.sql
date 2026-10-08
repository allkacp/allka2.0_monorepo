CREATE TABLE `ai_change_pricing_settings` (
  `id` VARCHAR(191) NOT NULL,
  `usd_brl_rate` DOUBLE NOT NULL DEFAULT 5.5,
  `margin_percent` DOUBLE NOT NULL DEFAULT 100,
  `free_changes` INTEGER NOT NULL DEFAULT 1,
  `min_price_brl` DOUBLE NOT NULL DEFAULT 0,
  `basis` VARCHAR(20) NOT NULL DEFAULT 'average',
  `features` VARCHAR(1000) NULL,
  `updated_by_user_id` VARCHAR(191) NULL,
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
