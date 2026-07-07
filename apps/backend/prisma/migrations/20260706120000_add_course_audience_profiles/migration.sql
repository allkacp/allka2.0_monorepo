-- AddColumn: público-alvo do curso (Allkademy), lista separada por vírgula
-- dentre "all" | "company" | "agency" | "nomades" | "leader" | "partner".
-- Default "all" preserva o comportamento atual (curso visível a todos os
-- perfis) para os cursos já existentes — nenhum curso publicado fica
-- acidentalmente escondido de ninguém por causa desta migration.
ALTER TABLE `courses` ADD COLUMN `audience_profiles` VARCHAR(191) NOT NULL DEFAULT 'all';
