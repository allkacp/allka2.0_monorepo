-- IALLKA — assistente de IA que interview o usuário e monta um projeto real
-- com produtos do catálogo (ver routes/iallka.ts). Sessão/mensagem são
-- modelos dedicados (não reaproveitam Conversation/ChatMessage, que
-- assumem um remetente humano).
CREATE TABLE `iallka_sessions` (
  `id` VARCHAR(191) NOT NULL,
  `user_id` VARCHAR(191) NOT NULL,
  `agency_id` VARCHAR(191) NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'gathering',
  `created_project_id` VARCHAR(191) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,

  UNIQUE INDEX `iallka_sessions_created_project_id_key`(`created_project_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `iallka_sessions_user_id_idx` ON `iallka_sessions`(`user_id`);

ALTER TABLE `iallka_sessions`
  ADD CONSTRAINT `iallka_sessions_user_id_fkey`
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `iallka_sessions_created_project_id_fkey`
    FOREIGN KEY (`created_project_id`) REFERENCES `projects`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE `iallka_messages` (
  `id` VARCHAR(191) NOT NULL,
  `session_id` VARCHAR(191) NOT NULL,
  `role` VARCHAR(191) NOT NULL,
  `content` LONGTEXT NOT NULL,
  `structured_payload` LONGTEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `iallka_messages_session_id_idx` ON `iallka_messages`(`session_id`);

ALTER TABLE `iallka_messages`
  ADD CONSTRAINT `iallka_messages_session_id_fkey`
    FOREIGN KEY (`session_id`) REFERENCES `iallka_sessions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Rastreio de proveniência em ProjectProduct: origin ganha o valor
-- "AI_ASSEMBLY" (sem mudar o tipo, é String livre já). Sem FK de propósito
-- (mesmo espírito snapshot-safe de origin_bundle_purchase_id).
ALTER TABLE `project_products`
  ADD COLUMN `origin_ai_session_id` VARCHAR(191) NULL;
