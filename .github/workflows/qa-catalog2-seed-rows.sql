-- Linhas estruturais do catalog2 que a migration.sql do baseline consolidado
-- também insere (ver docs/migrations-baseline-2026-09.md) — reproduzidas
-- aqui porque `prisma migrate diff` só compara schema (DDL), nunca dado.
-- INSERT IGNORE: idempotente, nunca duplica nem sobrescreve se já existir.
--
-- Valores e IDs precisam bater EXATAMENTE com o INSERT real de
-- apps/backend/prisma/migrations/20260908000000_baseline_consolidated/migration.sql
-- (fonte canônica: apps/backend/src/lib/catalog2-classifications-seed.ts,
-- CATALOG2_FOUR_F) — uma versão anterior deste arquivo tinha chaves erradas
-- ("fazer/falar/financiar/facilitar", nunca usadas em nenhum lugar do
-- código real), corrigidas por
-- apps/backend/prisma/migrations/20260908010000_fix_catalog2_four_f_canonical_keys/.
INSERT IGNORE INTO `catalog2_four_f` (`id`, `key`, `name`, `sort_order`, `created_at`, `updated_at`)
VALUES
  ('c2f-fundacao', 'fundacao', 'F1 — Fundação', 1, NOW(3), NOW(3)),
  ('c2f-fluxo', 'fluxo', 'F2 — Fluxo', 2, NOW(3), NOW(3)),
  ('c2f-forca', 'forca', 'F3 — Força', 3, NOW(3), NOW(3)),
  ('c2f-fidelizacao', 'fidelizacao', 'F4 — Fidelização', 4, NOW(3), NOW(3));

INSERT IGNORE INTO `catalog2_pricing_settings` (`id`, `currency`, `updated_at`, `created_at`)
VALUES ('default', 'BRL', NOW(3), NOW(3));
