-- Quem qualifica a etapa: líder da área, pessoa específica, líder e depois a pessoa, ou nômades qualificadores.
-- Só acrescenta uma coluna com padrão "leader" (o comportamento de sempre): nenhuma etapa existente muda.
ALTER TABLE `catalog2_task_steps` ADD COLUMN `qualifier_kind` VARCHAR(20) NOT NULL DEFAULT 'leader';
