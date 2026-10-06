-- D3: navegador seguro — perfis guardados (consentimento + cofre), autorizações por tempo, sessões com expiração e auditoria (2026-10-06).
CREATE TABLE `browser_profiles` (
  `id` VARCHAR(191) NOT NULL,
  `company_id` VARCHAR(191) NULL,
  `agency_id` VARCHAR(191) NULL,
  `connection_id` VARCHAR(191) NULL,
  `label` VARCHAR(191) NOT NULL,
  `start_url` VARCHAR(500) NOT NULL,
  `provider_hint` VARCHAR(191) NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'active',
  `consent_at` DATETIME(3) NOT NULL,
  `consent_by_user_id` VARCHAR(191) NOT NULL,
  `consent_version` VARCHAR(191) NOT NULL DEFAULT 'v1',
  `state_ciphertext` LONGTEXT NULL,
  `state_updated_at` DATETIME(3) NULL,
  `max_session_minutes` INTEGER NOT NULL DEFAULT 60,
  `created_by_user_id` VARCHAR(191) NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  INDEX `browser_profiles_company_id_status_idx`(`company_id`, `status`),
  INDEX `browser_profiles_agency_id_status_idx`(`agency_id`, `status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `browser_access_grants` (
  `id` VARCHAR(191) NOT NULL,
  `profile_id` VARCHAR(191) NOT NULL,
  `user_id` VARCHAR(191) NOT NULL,
  `valid_from` DATETIME(3) NOT NULL,
  `valid_until` DATETIME(3) NOT NULL,
  `project_task_id` VARCHAR(191) NULL,
  `reason` VARCHAR(500) NULL,
  `granted_by_user_id` VARCHAR(191) NOT NULL,
  `revoked_at` DATETIME(3) NULL,
  `revoked_by_user_id` VARCHAR(191) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `browser_access_grants_profile_id_user_id_idx`(`profile_id`, `user_id`),
  INDEX `browser_access_grants_user_id_valid_until_idx`(`user_id`, `valid_until`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `browser_access_grants` ADD CONSTRAINT `browser_access_grants_profile_id_fkey` FOREIGN KEY (`profile_id`) REFERENCES `browser_profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE `browser_sessions` (
  `id` VARCHAR(191) NOT NULL,
  `profile_id` VARCHAR(191) NOT NULL,
  `user_id` VARCHAR(191) NOT NULL,
  `grant_id` VARCHAR(191) NULL,
  `mode` VARCHAR(191) NOT NULL DEFAULT 'use',
  `status` VARCHAR(191) NOT NULL DEFAULT 'active',
  `started_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `expires_at` DATETIME(3) NOT NULL,
  `ended_at` DATETIME(3) NULL,
  `end_reason` VARCHAR(191) NULL,
  `last_activity_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `driver` VARCHAR(191) NOT NULL DEFAULT 'demo',
  `driver_ref` VARCHAR(191) NULL,
  `ticket_hash` VARCHAR(191) NULL,
  INDEX `browser_sessions_profile_id_status_idx`(`profile_id`, `status`),
  INDEX `browser_sessions_user_id_status_idx`(`user_id`, `status`),
  INDEX `browser_sessions_status_expires_at_idx`(`status`, `expires_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `browser_sessions` ADD CONSTRAINT `browser_sessions_profile_id_fkey` FOREIGN KEY (`profile_id`) REFERENCES `browser_profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE `browser_session_events` (
  `id` VARCHAR(191) NOT NULL,
  `profile_id` VARCHAR(191) NOT NULL,
  `session_id` VARCHAR(191) NULL,
  `kind` VARCHAR(191) NOT NULL,
  `actor_user_id` VARCHAR(191) NULL,
  `detail` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `browser_session_events_profile_id_created_at_idx`(`profile_id`, `created_at`),
  INDEX `browser_session_events_session_id_idx`(`session_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
