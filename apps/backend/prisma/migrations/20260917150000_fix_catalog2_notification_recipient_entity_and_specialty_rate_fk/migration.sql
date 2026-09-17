-- Item 17 (continuação da publicação, 2026-09-17) — fecha o gap real entre
-- schema.prisma e as migrations desta entrega, encontrado em produção
-- imediatamente após o deploy (não em nenhum ambiente de teste, porque
-- todo teste local/CI desta sessão usou `prisma db push`, que sincroniza
-- direto com schema.prisma e nunca passa pela pasta migrations/ — só
-- `prisma migrate deploy`, usado de verdade em produção, é estrito sobre
-- isso). Os mesmos 2 statements apareciam como "2 safe" residual em TODO
-- diff oficial rodado desde o Item 16.2 — nunca investigados a fundo até
-- agora.
--
-- 1) `Catalog2NotificationJobRecipient.entity_type`/`entity_id`
--    (schema.prisma, non-nullable) nunca tiveram uma migration própria —
--    a migration que criou a tabela (20260920090000) não incluiu essas 2
--    colunas. Efeito real em produção: todo job de notificação do
--    catalog2 (ativação/inativação/mudança de preço/renovação) falha ao
--    tentar `createMany` nos destinatários (`prisma.catalog2NotificationJob
--    Recipient.createMany`, erro "column entity_id does not exist") —
--    confirmado no log real do backend logo após este deploy.
-- 2) `catalog2_pricing_simulation_specialty_rates_specialty_id_fkey`
--    existe no banco mas o model Prisma correspondente
--    (Catalog2PricingSimulationSpecialtyRate) nunca declarou nenhum
--    `@relation` para `Catalog2Specialty` — só um `specialty_id String
--    @id` solto. A FK sobrou de uma versão anterior do schema (antes do
--    campo virar referência solta) e nunca foi removida. Sem efeito
--    funcional hoje (nada tenta violar essa constraint), mas mantém o
--    banco divergente do que schema.prisma sempre esperou.

-- DropForeignKey
ALTER TABLE `catalog2_pricing_simulation_specialty_rates` DROP FOREIGN KEY `catalog2_pricing_simulation_specialty_rates_specialty_id_fkey`;

-- AlterTable
ALTER TABLE `catalog2_notification_job_recipients` ADD COLUMN `entity_id` VARCHAR(191) NOT NULL,
    ADD COLUMN `entity_type` VARCHAR(191) NOT NULL;
