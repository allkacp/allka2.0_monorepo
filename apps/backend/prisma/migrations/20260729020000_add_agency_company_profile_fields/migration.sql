-- Adiciona campos de perfil (segment, description, logo, website,
-- observations) em `agencies` e `companies` — já existem no schema.prisma
-- desde 2026-07-20 (form de edição já coletava esses dados), mas nenhuma
-- migration os criou até agora. Divergência entre schema.prisma e o
-- histórico de migrations (schema drift), provavelmente introduzida por um
-- `prisma db push` em algum ambiente de dev que nunca virou migration
-- commitada. Detectado ao restaurar o dump de produção: GET /api/clients
-- falhava com "column does not exist" — produção nunca teve essas colunas.
--
-- Todas nullable, ADD COLUMN puro — não apaga nem altera nada existente,
-- seguro pra rodar em produção com dados já presentes.

ALTER TABLE `agencies`
  ADD COLUMN `segment` VARCHAR(191) NULL,
  ADD COLUMN `description` LONGTEXT NULL,
  ADD COLUMN `logo` LONGTEXT NULL,
  ADD COLUMN `website` VARCHAR(191) NULL,
  ADD COLUMN `observations` LONGTEXT NULL;

ALTER TABLE `companies`
  ADD COLUMN `segment` VARCHAR(191) NULL,
  ADD COLUMN `description` LONGTEXT NULL,
  ADD COLUMN `logo` LONGTEXT NULL,
  ADD COLUMN `website` VARCHAR(191) NULL,
  ADD COLUMN `observations` LONGTEXT NULL;
