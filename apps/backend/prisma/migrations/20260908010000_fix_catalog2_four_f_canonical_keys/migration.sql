-- Corrige as 4 chaves estruturais de catalog2_four_f, que entraram erradas
-- na migration de baseline (20260908000000_baseline_consolidated).
--
-- A migration de baseline reproduziu o DML de uma migration histórica
-- superada (a árvore antiga tinha mais de uma versão da nomenclatura das
-- "4 fases" ao longo do desenvolvimento) em vez da fonte canônica atual
-- (apps/backend/src/lib/catalog2-classifications-seed.ts, CATALOG2_FOUR_F),
-- que é o que todo o código da aplicação (validação de publicação de
-- versão, seed:qa-demo, testes) realmente consulta pela `key`.
--
-- UPDATE, nunca DELETE+INSERT: preserva os IDs existentes e qualquer FK em
-- catalog2_product_four_f que já aponte para essas linhas — nenhuma linha é
-- removida ou recriada, só `key`/`name`/`sort_order` são corrigidos.
UPDATE `catalog2_four_f` SET `key` = 'fundacao',    `name` = 'F1 — Fundação',    `sort_order` = 1 WHERE `key` = 'fazer';
UPDATE `catalog2_four_f` SET `key` = 'fluxo',       `name` = 'F2 — Fluxo',       `sort_order` = 2 WHERE `key` = 'falar';
UPDATE `catalog2_four_f` SET `key` = 'forca',       `name` = 'F3 — Força',       `sort_order` = 3 WHERE `key` = 'financiar';
UPDATE `catalog2_four_f` SET `key` = 'fidelizacao', `name` = 'F4 — Fidelização', `sort_order` = 4 WHERE `key` = 'facilitar';
