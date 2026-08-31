-- Linhas estruturais do catalog2 que a migration.sql do baseline consolidado
-- também insere (ver docs/migrations-baseline-2026-09.md) — reproduzidas
-- aqui porque `prisma migrate diff` só compara schema (DDL), nunca dado.
-- INSERT IGNORE: idempotente, nunca duplica nem sobrescreve se já existir.
INSERT IGNORE INTO `catalog2_four_f` (`id`, `key`, `name`, `sort_order`, `created_at`, `updated_at`)
VALUES
  ('c2ff_fazer', 'fazer', 'Fazer', 1, NOW(3), NOW(3)),
  ('c2ff_falar', 'falar', 'Falar', 2, NOW(3), NOW(3)),
  ('c2ff_financiar', 'financiar', 'Financiar', 3, NOW(3), NOW(3)),
  ('c2ff_facilitar', 'facilitar', 'Facilitar', 4, NOW(3), NOW(3));

INSERT IGNORE INTO `catalog2_pricing_settings` (`id`, `currency`, `updated_at`, `created_at`)
VALUES ('default', 'BRL', NOW(3), NOW(3));
