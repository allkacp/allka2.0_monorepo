-- Exclusão segura de colunas do Planejador (ata 2026-08-24): a proteção
-- da coluna principal (Backlog) não pode depender só do texto do `label`
-- (editável pelo usuário) — precisa de um identificador estável. Adiciona
-- `is_default` e faz o melhor esforço possível pra marcar a coluna
-- principal já existente de cada usuário (a que se chama "Backlog" hoje),
-- já que não havia nenhum outro sinal salvo antes desta migration.
ALTER TABLE `planner_columns` ADD COLUMN `is_default` BOOLEAN NOT NULL DEFAULT false;

UPDATE `planner_columns` pc
JOIN (
  SELECT owner_user_id, MIN(position) AS min_pos
  FROM planner_columns
  WHERE label = 'Backlog'
  GROUP BY owner_user_id
) t ON pc.owner_user_id = t.owner_user_id AND pc.position = t.min_pos AND pc.label = 'Backlog'
SET pc.is_default = true;
