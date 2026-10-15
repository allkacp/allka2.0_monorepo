-- Acesso cadastrado dentro de uma etapa pode ficar "disponível para as outras etapas" (aparece na lista delas para marcar).
-- Só acrescenta uma coluna com padrão falso: nenhum acesso existente muda de comportamento.
ALTER TABLE `catalog2_connection_requirements` ADD COLUMN `shared_with_steps` BOOLEAN NOT NULL DEFAULT false;
