-- Reunião 10/09 ("organização da base de conhecimento administrativa da
-- IAllka"): versionamento aditivo de AIKnowledgeDocument — is_active/version
-- (default compatível com as linhas existentes), replaces_document_id
-- (autorrelação 1:1 para "substituir preservando histórico") e updated_at.
-- AlterTable
ALTER TABLE `ai_knowledge_documents`
  ADD COLUMN `is_active` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `version` INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN `replaces_document_id` VARCHAR(191) NULL,
  ADD COLUMN `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX `ai_knowledge_documents_replaces_document_id_key` ON `ai_knowledge_documents`(`replaces_document_id`);

-- CreateIndex
CREATE INDEX `ai_knowledge_documents_is_active_idx` ON `ai_knowledge_documents`(`is_active`);

-- AddForeignKey
ALTER TABLE `ai_knowledge_documents` ADD CONSTRAINT `ai_knowledge_documents_replaces_document_id_fkey` FOREIGN KEY (`replaces_document_id`) REFERENCES `ai_knowledge_documents`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
