-- Notificações: modelos de mensagem e regras de público.
--
-- A tela /admin/notifications existia inteira em memória: mensagens, regras e
-- histórico eram arrays no componente. Nada era gravado, e os modais foram
-- escritos contra um formato que nem o `types/terms.ts` do frontend descrevia.
--
-- O que entra aqui é só o que a plataforma consegue cumprir hoje. A tela
-- oferecia cinco canais (email, whatsapp, popup, banner, push) e **nenhum
-- deles existe** — o backend não tem serviço de email, SMS ou push. O canal
-- que funciona é o aviso dentro da plataforma, que já roda em `system_alerts`
-- (é por ele que o motor de etapas avisa aprovadores). Então o envio de uma
-- notificação cria `system_alerts` para o público-alvo, e o histórico é a
-- própria lista desses alertas — sem tabela de histórico redundante e sem
-- registrar entregas que não aconteceram.

CREATE TABLE `notification_messages` (
  `id`         VARCHAR(191) NOT NULL,
  `name`       VARCHAR(191) NOT NULL,
  `title`      VARCHAR(191) NOT NULL,
  `content`    LONGTEXT     NOT NULL,
  `is_active`  BOOLEAN      NOT NULL DEFAULT true,
  `created_by` VARCHAR(191) NULL,
  `created_at` DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3)  NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `notification_messages_is_active_idx` (`is_active`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `notification_rules` (
  `id`         VARCHAR(191) NOT NULL,
  `message_id` VARCHAR(191) NOT NULL,
  `name`       VARCHAR(191) NOT NULL,
  `is_active`  BOOLEAN      NOT NULL DEFAULT true,
  -- Público-alvo. Listas JSON de account_type e de role; vazias = todo mundo.
  `target_account_types` JSON NULL,
  `target_roles`         JSON NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `notification_rules_message_id_idx` (`message_id`),
  CONSTRAINT `notification_rules_message_id_fkey`
    FOREIGN KEY (`message_id`) REFERENCES `notification_messages`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- O alerta passa a saber de qual mensagem nasceu. É isto que permite montar o
-- histórico de envios sem inventar uma tabela paralela.
ALTER TABLE `system_alerts`
  ADD COLUMN `notification_message_id` VARCHAR(191) NULL;

CREATE INDEX `system_alerts_notification_message_id_idx`
  ON `system_alerts`(`notification_message_id`);

ALTER TABLE `system_alerts`
  ADD CONSTRAINT `system_alerts_notification_message_id_fkey`
  FOREIGN KEY (`notification_message_id`) REFERENCES `notification_messages`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
