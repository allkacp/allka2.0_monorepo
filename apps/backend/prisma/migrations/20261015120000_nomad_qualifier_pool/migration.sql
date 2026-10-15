-- Grupo de nômades qualificadores: o cadastro do nômade ganha a chave "pode qualificar tarefas" (padrão desligada)
-- e a etapa do projeto ganha a marca de que a qualificação vai para esse grupo (rodízio). Só acrescenta colunas com padrão falso.
ALTER TABLE `nomades` ADD COLUMN `is_qualifier` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `project_task_stages` ADD COLUMN `qualificador_pool` BOOLEAN NOT NULL DEFAULT false;
