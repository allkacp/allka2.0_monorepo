# Baseline consolidado da árvore de migrations operacional (2026-09-08)

## O bloqueador real (comprovado, não suposto)

`prisma/migrations/0_baseline/migration.sql` (histórico) continha só um
comentário — nenhum `CREATE TABLE`. Isso nunca foi um problema até agora
porque `0_baseline` sempre foi introduzido em bancos que **já tinham** o
schema inicial criado por fora do Prisma Migrate, via `prisma migrate
resolve --applied 0_baseline` — nunca via `migrate deploy` de verdade.

Prova empírica (feita nesta sessão, banco descartável, nunca em produção):
`prisma migrate deploy` contra um banco MySQL genuinamente vazio aplicava
`0_baseline` como no-op e falhava na 3ª migration por falta da tabela
`companies` — ou seja, **o schema fundacional inteiro (dezenas de tabelas)
nunca existiu em nenhuma migration executável**. Isso bloqueava:
subir o banco operacional do zero num ambiente novo (VPS/QA/laptop de outro
desenvolvedor) sem primeiro copiar um dump de um banco já existente.

## Decisão: baseline novo, árvore antiga arquivada (não apagada)

Ambiente online atual é QA/teste, sem dado real de produção a preservar
historicamente passo a passo — isso torna segura a estratégia recomendada
pela própria documentação do Prisma para este cenário ("re-baselining"):

1. **As 85 migrations históricas foram movidas** (não apagadas — `git mv`,
   histórico do git preservado) para
   `apps/backend/prisma/migrations-archive-pre-2026-09-08/`. Essa pasta
   **não é lida pelo Prisma** (só olha `prisma/migrations/`); fica no repo
   só como registro de auditoria de como o schema evoluiu até aqui.
2. **Uma única migration nova**,
   `apps/backend/prisma/migrations/20260908000000_baseline_consolidated/migration.sql`,
   contém o schema COMPLETO e atual — gerada com:
   ```
   npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script
   ```
   Validada aplicando de fato num banco MySQL vazio e comparando com
   `prisma migrate diff --from-url <banco> --to-schema-datamodel
   prisma/schema.prisma` (resultado: `-- This is an empty migration.`, ou
   seja, é bit-a-bit o mesmo schema).
3. **Duas linhas de dado estrutural** (não capturadas por `migrate diff`,
   que só compara schema/DDL — nunca dado) foram adicionadas manualmente ao
   fim do baseline, reproduzindo exatamente o que a migration histórica
   `20260903120000_catalog2_builder_pricing` fazia: as 4 fases fixas do
   catalog2 (`catalog2_four_f`, "nunca há uma 5ª fase — é a própria
   metodologia") e a linha singleton `catalog2_pricing_settings` (`id:
   "default"`). Auditoria completa: `grep -rl "INSERT INTO"
   prisma/migrations-archive-pre-2026-09-08/*/migration.sql` — só essas 2
   migrations tinham DML; a outra (`20260711100200_backfill_project_code_and_sequences`)
   era backfill de PROJETOS PRÉ-EXISTENTES sem `project_code`, comprovadamente
   um no-op em banco vazio (0 linhas afetadas) — não reproduzida de propósito.
4. `migration_lock.toml` continua em `prisma/migrations/` (obrigatório pelo
   Prisma) — uma cópia também foi deixada no arquivo histórico por
   completude.

Nada foi "escondido com `migrate resolve` sem comprovação": todo
`migrate resolve --applied` usado nesta migração de estratégia (tanto para
esta baseline quanto para os 9 drifts de migrations resolvidos antes dela,
ver `product-sprint-2026-legacy-consultation` na memória do projeto) foi
precedido por um `migrate diff --from-url <banco> --to-schema-datamodel
prisma/schema.prisma` mostrando **zero diferença** antes de marcar como
aplicado.

## Procedimento — banco NOVO (VPS novo, QA do zero, laptop de outro dev)

```bash
cd apps/backend
npx prisma migrate deploy
```

Isso basta. `migrate deploy` encontra só 1 migration na árvore ativa
(`20260908000000_baseline_consolidated`), aplica o schema inteiro numa
transação e sai. Nenhum conhecimento escondido, nenhum comando manual extra.
Comprovado nesta sessão: `migrate status` reporta "up to date" logo em
seguida, e rodar `migrate deploy` de novo reporta "No pending migrations to
apply" (idempotente).

Depois disso, os seeds de bootstrap (não fazem parte de migration de
propósito — são dados de DESENVOLVIMENTO/QA, não estruturais):
```bash
npm run db:seed                          # usuários/empresas/projetos de exemplo (dev)
npx tsx seed-all-products.ts             # produtos operacionais reais
npm run catalog2:seed-classifications    # pilares/categorias/especialidades do catalog2
```

## Procedimento — banco JÁ EXISTENTE (ex.: este banco local de dev)

Um banco que já rodou a árvore histórica de 85 migrations tem o schema
correto, só falta reconhecer a nova migration única:

```bash
cd apps/backend
# 1. Comprova que o schema do banco já bate EXATAMENTE com schema.prisma —
#    nunca resolver sem essa comprovação:
npx prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --script
# Esperado: "-- This is an empty migration." — se vier QUALQUER outra coisa, PARE e investigue antes de continuar.

# 2. Só então marca a baseline nova como aplicada (não a re-executa):
npx prisma migrate resolve --applied 20260908000000_baseline_consolidated

# 3. Confirma:
npx prisma migrate status   # "Database schema is up to date!"
npx prisma migrate deploy   # "No pending migrations to apply."
```

As 85 linhas históricas continuam em `_prisma_migrations` (nunca apagadas —
log de auditoria intacto); a nova linha da baseline convive com elas sem
conflito. Executado e comprovado no banco local (`allka`) desta sessão.

## Backup e restauração (procedimento, para quando houver banco QA de verdade)

Antes de rodar `migrate deploy`/`migrate resolve` em qualquer banco que já
tenha dado real de QA:
```bash
mysqldump -h <host> -u <user> -p --single-transaction --routines --triggers <db> > backup_<db>_$(date +%Y%m%d%H%M%S).sql
```
Restauração (se algo der errado):
```bash
mysql -h <host> -u <user> -p <db> < backup_<db>_<timestamp>.sql
```
Nenhum backup real foi feito nesta sessão porque nenhum banco com dado real
foi tocado — só o banco de desenvolvimento local (sem dado de cliente) e
bancos descartáveis criados e apagados na própria sessão.

## `db push` continua existindo — só para banco descartável de teste

`apps/backend/scripts/run-db-tests.ts` (usado por `npm run test:*`) continua
usando `prisma db push` para os bancos `allka_test_<timestamp>_<hash>`
criados e destruídos a cada execução de teste — nunca em QA/produção. É mais
rápido para um banco que vive segundos e não precisa de histórico de
migration nenhum. O comentário do arquivo foi atualizado (não citava mais a
razão real, citava o bug do BOM que não é a causa raiz).

## As 5 fontes comparadas (conforme pedido)

| Origem | Resultado |
|---|---|
| Banco totalmente vazio | ✅ `migrate deploy` cria as 140 tabelas + dados estruturais numa tacada, comprovado em banco descartável |
| Banco local atual (`allka`) | ✅ transicionado nesta sessão via `migrate resolve --applied`, comprovado com diff vazio antes e depois |
| Futuro banco QA | Mesmo procedimento de "banco novo" acima — nenhum passo extra |
| Banco Legacy (`allka_legacy`) | ✅ já tinha árvore própria e independente, sempre subiu limpo do zero (bloco 1/6) — reconfirmado nesta sessão, comentário desatualizado no schema corrigido |
| Banco catalog2 | Absorvido na ÚNICA baseline nova — não existe mais como migration separada para testar; suas tabelas fazem parte do mesmo `CREATE TABLE` em lote |

## O que NÃO foi feito (documentado, não escondido)

- Nenhuma migration foi apagada — só movida e documentada aqui.
- Nenhum comando rodou contra QA ou produção — todo teste de `--apply`/banco
  vazio usou bancos descartáveis criados e destruídos nesta sessão
  (`allka_ci_baseline_test`).
- `db push` não foi promovido para uso em produção — continua exclusivo de
  banco de teste descartável, exatamente como já era.
