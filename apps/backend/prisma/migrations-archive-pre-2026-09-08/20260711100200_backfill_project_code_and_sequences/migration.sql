-- Backfill de dados (DML, sem alteração de schema) — dentro da própria
-- cadeia de migrations, não depende de nenhum script externo/manual.
--
-- Preserva a ordem de exibição que o sistema já usava antes de project_code
-- existir (created_at ASC, id ASC como desempate) — ROW_NUMBER() garante
-- ranking determinístico e estável mesmo com timestamps repetidos.
-- Idempotente: só toca linhas com project_code NULL; segura pra rodar de
-- novo (não deveria acontecer em operação normal, já que o Prisma só aplica
-- cada migration uma vez, mas o WHERE protege mesmo assim). Funciona tanto
-- em banco vazio (zero linhas afetadas) quanto em banco com projetos/tarefas
-- legados.
UPDATE `projects` p
JOIN (
  SELECT id, CONCAT('proj_', LPAD(ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC), 5, '0')) AS code
  FROM `projects`
) ranked ON p.id = ranked.id
SET p.project_code = ranked.code
WHERE p.project_code IS NULL;

-- Inicializa a sequência "project" no maior número já atribuído acima (0 se
-- não houver nenhum projeto — funciona em banco vazio). GREATEST() no
-- ON DUPLICATE KEY UPDATE evita regressão caso esta migration seja
-- reexecutada depois que novos projetos já tenham avançado a sequência via
-- API.
INSERT INTO `entity_sequences` (`id`, `key`, `current_value`, `updated_at`)
SELECT CONCAT('seq-project-', UUID()), 'project',
       COALESCE(MAX(CAST(SUBSTRING(project_code, 6) AS UNSIGNED)), 0), NOW(3)
FROM `projects`
ON DUPLICATE KEY UPDATE
  current_value = GREATEST(`entity_sequences`.`current_value`, VALUES(`current_value`)),
  updated_at = NOW(3);

-- Inicializa a sequência "project_task" no maior task_code VÁLIDO já
-- existente — formato exato T + 6 dígitos (ex.: T000042). Códigos em
-- qualquer outro formato (legados, de outro padrão) são ignorados aqui e
-- permanecem intactos na tabela — não fazem parte da sequência nova.
INSERT INTO `entity_sequences` (`id`, `key`, `current_value`, `updated_at`)
SELECT CONCAT('seq-task-', UUID()), 'project_task',
       COALESCE(MAX(CAST(SUBSTRING(task_code, 2) AS UNSIGNED)), 0), NOW(3)
FROM `project_tasks`
WHERE task_code REGEXP '^T[0-9]{6}$'
ON DUPLICATE KEY UPDATE
  current_value = GREATEST(`entity_sequences`.`current_value`, VALUES(`current_value`)),
  updated_at = NOW(3);
