-- Base de Conhecimento IA por categoria (admin > Configurações > "Base de
-- Conhecimento IA") e documentos de contexto por projeto (aba "Documentos"
-- do projeto) — ver lib/ai-knowledge-base.ts e routes/projects.ts. Ambos
-- guardam o binário em disco local (apps/backend/uploads/), só o metadado
-- fica aqui. A categoria "briefing" recebe automaticamente, no primeiro boot
-- depois desta migration, os arquivos que já existiam em instrucoesAI/.

CREATE TABLE `ai_knowledge_categories` (
  `id`          VARCHAR(191) NOT NULL,
  `key`         VARCHAR(191) NOT NULL,
  `name`        VARCHAR(191) NOT NULL,
  `description` TEXT NULL,
  `created_at`  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`  DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `ai_knowledge_categories_key_key` (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ai_knowledge_documents` (
  `id`          VARCHAR(191) NOT NULL,
  `category_id` VARCHAR(191) NOT NULL,
  `name`        VARCHAR(191) NOT NULL,
  `file_name`   VARCHAR(191) NOT NULL,
  `mime_type`   VARCHAR(191) NULL,
  `size`        INT NULL,
  `uploaded_by` VARCHAR(191) NULL,
  `created_at`  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `ai_knowledge_documents_category_id_idx` (`category_id`),
  CONSTRAINT `ai_knowledge_documents_category_id_fkey`
    FOREIGN KEY (`category_id`) REFERENCES `ai_knowledge_categories`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `project_attachments` (
  `id`          VARCHAR(191) NOT NULL,
  `project_id`  VARCHAR(191) NOT NULL,
  `name`        VARCHAR(191) NOT NULL,
  `file_name`   VARCHAR(191) NOT NULL,
  `mime_type`   VARCHAR(191) NULL,
  `size`        INT NULL,
  `uploaded_by` VARCHAR(191) NULL,
  `created_at`  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `project_attachments_project_id_idx` (`project_id`),
  CONSTRAINT `project_attachments_project_id_fkey`
    FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
