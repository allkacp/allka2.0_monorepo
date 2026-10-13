-- Chat estilo WhatsApp Web: anexos (imagem, arquivo, áudio), resposta, edição e exclusão lógica de mensagens,
-- e a tabela de configurações do chat (só o Admin Master grava). Só acrescenta colunas com padrão e uma tabela
-- nova: nenhuma mensagem existente muda (todas viram type = 'text').
ALTER TABLE `chat_messages`
  ADD COLUMN `type` VARCHAR(191) NOT NULL DEFAULT 'text',
  ADD COLUMN `attachment_name` VARCHAR(191) NULL,
  ADD COLUMN `attachment_file` VARCHAR(191) NULL,
  ADD COLUMN `attachment_mime` VARCHAR(191) NULL,
  ADD COLUMN `attachment_size` INTEGER NULL,
  ADD COLUMN `audio_duration_sec` INTEGER NULL,
  ADD COLUMN `reply_to_id` VARCHAR(191) NULL,
  ADD COLUMN `edited_at` DATETIME(3) NULL,
  ADD COLUMN `deleted_at` DATETIME(3) NULL;

CREATE TABLE `platform_chat_settings` (
  `id` VARCHAR(191) NOT NULL DEFAULT 'default',
  `settings_json` LONGTEXT NOT NULL,
  `updated_by_user_id` VARCHAR(191) NULL,
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
