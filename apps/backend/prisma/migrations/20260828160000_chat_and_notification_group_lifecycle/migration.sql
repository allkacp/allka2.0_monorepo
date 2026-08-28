-- Bloco 3/5 (ata 2026-08) — "Grupos e Chat interno".
--
-- 1) As três tabelas de chat (`conversations`, `chat_participants`,
--    `chat_messages`) existiam SÓ no schema.prisma — NENHUMA migration as
--    criava (auditoria: código de chat pronto, tabelas nunca migradas). Esta
--    migration formaliza a criação delas, já com as colunas do ciclo de vida.
-- 2) `notification_groups` ganha o ciclo de aprovação (Líder solicita →
--    Admin Master aprova/rejeita → sala de chat criada na aprovação).
--
-- Aditiva: os grupos existentes recebem `status = 'active'` no backfill e
-- continuam funcionando exatamente como antes.

-- ─── Chat ────────────────────────────────────────────────────────────────────
CREATE TABLE `conversations` (
  `id`            VARCHAR(191) NOT NULL,
  `title`         VARCHAR(191) NULL,
  `type`          VARCHAR(191) NOT NULL DEFAULT 'direct',
  `status`        VARCHAR(191) NOT NULL DEFAULT 'active',
  `archived_at`   DATETIME(3)  NULL,
  `created_by_id` VARCHAR(191) NULL,
  `created_at`    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`    DATETIME(3)  NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `conversations_type_status_idx` (`type`, `status`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `chat_participants` (
  `id`              VARCHAR(191) NOT NULL,
  `conversation_id` VARCHAR(191) NOT NULL,
  `user_id`         VARCHAR(191) NOT NULL,
  `role`            VARCHAR(191) NOT NULL DEFAULT 'member',
  `joined_at`       DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `last_read_at`    DATETIME(3)  NULL,
  `left_at`         DATETIME(3)  NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `chat_participants_conversation_id_user_id_key` (`conversation_id`, `user_id`),
  INDEX `chat_participants_user_id_idx` (`user_id`),
  CONSTRAINT `chat_participants_conversation_id_fkey`
    FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chat_participants_user_id_fkey`
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `chat_messages` (
  `id`                VARCHAR(191) NOT NULL,
  `conversation_id`   VARCHAR(191) NOT NULL,
  `sender_id`         VARCHAR(191) NOT NULL,
  `content`           LONGTEXT     NOT NULL,
  `is_read`           BOOLEAN      NOT NULL DEFAULT false,
  `client_message_id` VARCHAR(191) NULL,
  `created_at`        DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `chat_messages_client_message_id_key` (`client_message_id`),
  INDEX `chat_messages_conversation_id_created_at_idx` (`conversation_id`, `created_at`),
  CONSTRAINT `chat_messages_conversation_id_fkey`
    FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chat_messages_sender_id_fkey`
    FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ─── Grupos de Notificação: ciclo de aprovação ──────────────────────────────
ALTER TABLE `notification_groups`
  ADD COLUMN `purpose`          TEXT         NULL,
  ADD COLUMN `status`           VARCHAR(191) NOT NULL DEFAULT 'active',
  ADD COLUMN `requested_by_id`  VARCHAR(191) NULL,
  ADD COLUMN `approved_by_id`   VARCHAR(191) NULL,
  ADD COLUMN `approved_at`      DATETIME(3)  NULL,
  ADD COLUMN `rejected_by_id`   VARCHAR(191) NULL,
  ADD COLUMN `rejected_at`      DATETIME(3)  NULL,
  ADD COLUMN `rejection_reason` TEXT         NULL,
  ADD COLUMN `archived_by_id`   VARCHAR(191) NULL,
  ADD COLUMN `archived_at`      DATETIME(3)  NULL,
  ADD COLUMN `conversation_id`  VARCHAR(191) NULL;

-- Grupos existentes seguem ativos.
UPDATE `notification_groups` SET `status` = 'active' WHERE `status` IS NULL OR `status` = '';

CREATE UNIQUE INDEX `notification_groups_conversation_id_key` ON `notification_groups`(`conversation_id`);
CREATE INDEX `notification_groups_status_idx` ON `notification_groups`(`status`);
ALTER TABLE `notification_groups`
  ADD CONSTRAINT `notification_groups_conversation_id_fkey`
    FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
