CREATE TABLE `catalog2_pricing_simulation_specialty_rates` (
  `specialty_id` VARCHAR(191) NOT NULL,
  `hourly_rate` DOUBLE NOT NULL,
  `is_provisional` BOOLEAN NOT NULL DEFAULT true,
  `source` VARCHAR(191) NOT NULL DEFAULT 'provisional_simulation_v1',
  `notes` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`specialty_id`),
  CONSTRAINT `catalog2_pricing_simulation_specialty_rates_specialty_id_fkey`
    FOREIGN KEY (`specialty_id`) REFERENCES `catalog2_specialties` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
