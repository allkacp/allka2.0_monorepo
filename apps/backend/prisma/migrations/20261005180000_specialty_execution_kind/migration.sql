-- Tipo da especialidade (humano / IA / humano ou IA). Todas as existentes continuam humanas.
ALTER TABLE `catalog2_specialties` ADD COLUMN `execution_kind` VARCHAR(191) NOT NULL DEFAULT 'humano';
