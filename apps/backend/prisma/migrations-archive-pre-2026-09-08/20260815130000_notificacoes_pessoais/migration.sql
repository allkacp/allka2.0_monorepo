-- Arquivamento de SystemAlert (soft, nunca delete) + preferência pessoal de
-- notificação por evento x canal (unifica as antigas telas mockadas
-- "Preferências"/"Regras" numa tabela só) + grupos pessoais de pessoas do
-- próprio time do usuário. Ver routes/system-alerts.ts,
-- routes/notification-preferences.ts, routes/notification-groups.ts.

-- AlterTable
ALTER TABLE `system_alerts`
  ADD COLUMN `is_archived` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `archived_at` DATETIME(3) NULL;

CREATE INDEX `system_alerts_user_id_is_archived_idx`
  ON `system_alerts`(`user_id`, `is_archived`);

-- CreateTable
CREATE TABLE `notification_preferences` (
  `id`         VARCHAR(191) NOT NULL,
  `user_id`    VARCHAR(191) NOT NULL,
  `event_type` VARCHAR(191) NOT NULL,
  `channel`    VARCHAR(191) NOT NULL,
  `enabled`    BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `notification_preferences_user_id_event_type_channel_key` (`user_id`, `event_type`, `channel`),
  INDEX `notification_preferences_user_id_idx` (`user_id`),
  CONSTRAINT `notification_preferences_user_id_fkey`
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notification_groups` (
  `id`            VARCHAR(191) NOT NULL,
  `owner_user_id` VARCHAR(191) NOT NULL,
  `name`          VARCHAR(191) NOT NULL,
  `description`   VARCHAR(191) NULL,
  `created_at`    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`    DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `notification_groups_owner_user_id_idx` (`owner_user_id`),
  CONSTRAINT `notification_groups_owner_user_id_fkey`
    FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notification_group_members` (
  `id`         VARCHAR(191) NOT NULL,
  `group_id`   VARCHAR(191) NOT NULL,
  `user_id`    VARCHAR(191) NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `notification_group_members_group_id_user_id_key` (`group_id`, `user_id`),
  INDEX `notification_group_members_user_id_idx` (`user_id`),
  CONSTRAINT `notification_group_members_group_id_fkey`
    FOREIGN KEY (`group_id`) REFERENCES `notification_groups`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `notification_group_members_user_id_fkey`
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
