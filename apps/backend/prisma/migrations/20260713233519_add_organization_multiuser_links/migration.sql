-- ============================================================
-- add_organization_multiuser_links
--
-- Adiciona os campos de vínculo "membro" (User -> Agency/Company/Partner)
-- necessários para suportar múltiplos usuários por organização. As colunas
-- físicas atuais de "proprietário" (agencies.user_id, partner_profiles.user_id)
-- permanecem intocadas — schema.prisma usa @map("user_id") pra renomear
-- apenas o campo no Prisma Client, sem gerar SQL pra essas duas colunas
-- (confirmado: nenhuma statement abaixo referencia agencies ou
-- partner_profiles como tabela alterada).
--
-- Nenhuma coluna existente é removida, renomeada fisicamente ou tornada
-- obrigatória nesta migration. Backfill é determinístico e não inventa
-- nenhuma associação: usuários/organizações sem vínculo hoje continuam
-- sem vínculo. Contagens de referência no banco local em 2026-07-13:
-- User=37, Agency=5, Company=33, PartnerProfile=4.
-- ============================================================

-- ── 1. Novas colunas (nullable) ──────────────────────────────────────────

-- AlterTable
ALTER TABLE `companies` ADD COLUMN `owner_user_id` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `users` ADD COLUMN `agency_id` VARCHAR(191) NULL,
    ADD COLUMN `partner_id` VARCHAR(191) NULL;

-- ── 2. Backfill determinístico (só vínculos que já existem hoje) ────────

-- 2a. Agency: users.agency_id <- agencies.user_id
-- Afeta somente usuários que já são o "user_id" de uma Agency (5 no banco
-- local). O usuário órfão de Agency (account_type=agencias sem Agency
-- vinculada) não casa com nenhuma linha deste JOIN e permanece agency_id
-- = NULL.
UPDATE `users` u
INNER JOIN `agencies` a ON a.`user_id` = u.`id`
SET u.`agency_id` = a.`id`;

-- 2b. Partner: users.partner_id <- partner_profiles.user_id
-- Afeta somente usuários que já são o "user_id" de um PartnerProfile
-- (4 no banco local). O usuário órfão de Partner permanece partner_id =
-- NULL.
UPDATE `users` u
INNER JOIN `partner_profiles` p ON p.`user_id` = u.`id`
SET u.`partner_id` = p.`id`;

-- 2c. Company: companies.owner_user_id <- o único usuário de users.company_id,
-- SOMENTE quando existe exatamente 1 usuário pra essa company
-- (HAVING COUNT(*) = 1). Garante que nenhum proprietário é escolhido
-- arbitrariamente caso, no futuro, uma company já tenha mais de 1 usuário
-- no momento em que esta migration for aplicada — nesse caso a company
-- simplesmente não recebe owner_user_id (permanece NULL), sem inventar
-- dado. No banco local em 2026-07-13: 4 companies recebem owner_user_id;
-- as outras 29 (sem nenhum usuário vinculado) permanecem NULL; o usuário
-- órfão de Company (sem company_id) permanece sem vínculo.
UPDATE `companies` c
INNER JOIN (
    SELECT `company_id`, MIN(`id`) AS `single_user_id`
    FROM `users`
    WHERE `company_id` IS NOT NULL
    GROUP BY `company_id`
    HAVING COUNT(*) = 1
) AS single_owner ON single_owner.`company_id` = c.`id`
SET c.`owner_user_id` = single_owner.`single_user_id`;

-- ── 3. Índice único ───────────────────────────────────────────────────────
-- NULL não conflita com NULL em índice único no MySQL — seguro mesmo com
-- as 29 companies que permanecem sem owner_user_id.

-- CreateIndex
CREATE UNIQUE INDEX `companies_owner_user_id_key` ON `companies`(`owner_user_id`);

-- ── 4. Foreign keys ───────────────────────────────────────────────────────
-- Todas as linhas referenciadas já existem (foram preenchidas no backfill
-- acima), então a criação das FKs não pode falhar por violação.

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_agency_id_fkey` FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_partner_id_fkey` FOREIGN KEY (`partner_id`) REFERENCES `partner_profiles`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `companies` ADD CONSTRAINT `companies_owner_user_id_fkey` FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- ── 5. Nenhuma coluna nova é tornada NOT NULL nesta migration. ──────────
