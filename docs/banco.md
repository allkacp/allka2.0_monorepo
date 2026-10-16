# Banco de Dados

Tudo sobre o banco da plataforma: schema, migrations, seeds, ambientes.

---

> ⚠️ **Atualização 2026-10-16:** o banco atual é **MySQL 8.4** (local em Docker: `mysql://allka:allka_dev@mysql:3306/allka`, porta 3306; servidor: MySQL no Docker Compose do VPS). As menções a **SQLite** (`dev.db`/`prod.db`) e PostgreSQL mais abaixo são **históricas** — confira sempre `schema.prisma` (`provider = "mysql"`) e `docker-compose.yml`. Migrations são **sempre aditivas** (nunca `db push`) e o deploy do backend as aplica no servidor.

## Tecnologia

- **ORM**: [Prisma](https://www.prisma.io/) 5.22
- **Local e servidor**: **MySQL 8.4** (definido por `DATABASE_URL`; ver README → "Ambiente local oficial")
- **Schema**: arquivo único `apps/backend/prisma/schema.prisma` (fonte da verdade)
- **Migrations**: pasta `apps/backend/prisma/migrations/`
- **Testes de banco:** bancos descartáveis (`allka_test`), via `apps/backend/scripts/run-db-tests.ts` — nunca o banco real.

### Tabelas do catálogo atual (`catalog2_*`)
Produto, versões, tarefas, etapas, variações, opções, efeitos das opções, adicionais, condições, conexões/acessos, modelos globais ("Tarefa #ID"/"Etapa #ID": `catalog2_task_models`, `catalog2_step_models`), cotações, pedidos de alteração. Descrição funcional em [cadastro-produto-passo-a-passo.md](./cadastro-produto-passo-a-passo.md).

### Migrations recentes (todas aditivas)
| Migration | O que faz |
| --- | --- |
| `20261011120000_platform_theme` | Tema da plataforma salvo no servidor |
| `20261012150000_chat_whatsapp` | Chat estilo WhatsApp (mídia, apagar mensagem, configurações do admin) |
| `20261014120000_ai_free_changes_per_step` | Cota de alterações por IA grátis por etapa |
| `20261014130000_access_shared_with_steps` | Acessos compartilhados entre etapas |
| `20261014140000_step_hybrid_ai_option` | Etapa "Humano ou IA" (opção IA com especialidade/tempo) |
| `20261014150000_step_qualifier_kind` | Tipo de qualificador da etapa (líder, pessoa, líder + pessoa, nômades qualificadores) |
| `20261014160000_variation_option_description_examples` | Descrição/exemplos/links/arquivo-modelo nas opções de variação |
| `20261015120000_nomad_qualifier_pool` | `Nomade.is_qualifier` + `ProjectTaskStage.qualificador_pool` (grupo/rodízio de qualificadores) |
| `20261015130000_variation_base_included` | `Catalog2Variation.base_included` (variação já incluída no produto original) |
| `20261015140000_option_effect_specialty` | `Catalog2OptionEffect.specialty_id` (horas extras com especialidade própria) |
| `20261015150000_qualifier_cost_default_20` | Custo do qualificador padrão = 20% |

---

## Onde fica o quê

```
backend/
  prisma/
    schema.prisma        ← Modelo de dados (fonte da verdade)
    migrations/          ← Histórico versionado de mudanças
      <timestamp>_<nome>/
        migration.sql
    dev.db               ← Banco local SQLite (gitignored)
    prod.db              ← Banco de produção SQLite (gitignored, fica no servidor)
    seed.ts              ← Seed principal (usuários, agências, produtos base)
    seed-levels.ts       ← Níveis de nômade/parceiro
    seed-company-users.ts
    diag.ts              ← Script de diagnóstico
  seed-admin.js          ← Cria usuário admin (cp@lamego.com.vc)
  seed-product-PA0001.js ← Reseed do produto Gestão de Tráfego
```

---

## Modelos principais (schema.prisma)

A plataforma tem **33 modelos**. Os mais importantes:

| Modelo                                   | Descrição                                                                                          |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `User`                                   | Conta de login (qualquer perfil); `account_type` define se é admin/empresa/nomade/agencia/parceiro |
| `Company`                                | Empresa cliente da plataforma                                                                      |
| `Agency`                                 | Agência parceira                                                                                   |
| `Nomade`                                 | Freelancer (nômade digital)                                                                        |
| `Project`                                | Projeto contratado por uma empresa                                                                 |
| `Product`                                | Produto do catálogo (ex: PA0001 Gestão de Tráfego)                                                 |
| `ProductVariation`                       | Variações de um produto (ex: Até 2 / Até 4 campanhas)                                              |
| `ProductAddon`                           | Adicionais opcionais                                                                               |
| `TaskTemplate`                           | Modelo de tarefa associada a produto                                                               |
| `TaskExecution`                          | Execução real de uma tarefa por um nômade                                                          |
| `Specialty`                              | Especialidade habilitada para nômades                                                              |
| `Qualification`                          | Habilitação/qualificação obtida pelo nômade                                                        |
| `Invoice`                                | Fatura emitida para empresa                                                                        |
| `WalletTransaction`                      | Movimentação financeira (carteira)                                                                 |
| `WithdrawalRequest`                      | Solicitação de saque                                                                               |
| `PartnerCommission`                      | Comissão de parceiro                                                                               |
| `Term` / `TermAcceptance`                | Termos de uso e aceites                                                                            |
| `Conversation` / `ChatMessage`           | Chat                                                                                               |
| `Course` / `Lesson` / `CourseEnrollment` | Allkademy                                                                                          |
| `AdminProfile` / `AdminPermission`       | Perfis e permissões granulares de admin                                                            |

> A lista completa está sempre em [`apps/backend/prisma/schema.prisma`](../apps/backend/prisma/schema.prisma).

---

## Configuração local

### Primeira vez

```powershell
cd apps/backend
npm install

# Gera Prisma Client
npx prisma generate

# Cria o banco local com o schema atual
npx prisma migrate dev

# Popular dados de exemplo
npx tsx prisma/seed.ts

# Criar admin de testes
node seed-admin.js
```

### Variável de ambiente local (`apps/backend/.env`)

```
DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET="dev-secret-change-me"
PORT=3001
```

### Reset completo (apaga tudo)

```powershell
cd apps/backend
npx prisma migrate reset --force
# → roda migrations + seed automaticamente
```

---

## Migrations — fluxo correto

### Criar uma migration nova (ambiente local)

Sempre que mudar o `schema.prisma`:

```powershell
cd apps/backend
npx prisma migrate dev --name <descricao_curta_em_snake_case>
```

Exemplos:

- `--name add_company_segment_field`
- `--name create_invoice_status_enum`
- `--name remove_legacy_user_phone`

Isso:

1. Calcula o diff entre o estado atual do banco e o `schema.prisma`
2. Gera um arquivo `migrations/<timestamp>_<nome>/migration.sql`
3. Aplica no `dev.db`
4. Regenera o Prisma Client

### Aplicar migrations em produção

**NUNCA** rodar `migrate dev` em produção. Use:

```bash
ssh user@servidor
cd ~/backend
npx prisma migrate deploy
```

`migrate deploy`:

- Aplica apenas migrations ainda não aplicadas
- Não tenta gerar SQL novo
- Não dropa nada

Após o deploy, **restart do app Node** para carregar o Prisma Client atualizado.

### Conferir o estado das migrations

```powershell
npx prisma migrate status
```

---

## Seeds

### Seed principal

`apps/backend/prisma/seed.ts` — popula um conjunto consistente de dados (usuários de cada perfil, agências de exemplo, produtos básicos).

Rodar:

```powershell
cd apps/backend
npx tsx prisma/seed.ts
# OU
npx prisma db seed
```

### Seeds pontuais

| Arquivo                                | Cria/atualiza                                                              |
| -------------------------------------- | -------------------------------------------------------------------------- |
| `apps/backend/seed-admin.js`                | Usuário `cp@lamego.com.vc` / `123@321` (admin)                             |
| `apps/backend/seed-product-PA0001.js`       | Produto Gestão de Tráfego com tarefas, etapas, variações, briefing, testes |
| `apps/backend/prisma/seed-levels.ts`        | Níveis de nômade e parceiro                                                |
| `apps/backend/prisma/seed-company-users.ts` | Usuários vinculados a empresas                                             |

### Quando rodar seeds em produção

| Caso                                   | Rodar?                                                                   |
| -------------------------------------- | ------------------------------------------------------------------------ |
| Primeira instalação                    | Sim, todos                                                               |
| Atualização de produto (ex: PA0001)    | Sim, **só** o seed daquele produto                                       |
| Adicionar admin novo                   | Sim, `seed-admin.js` (ou criar manual via API)                           |
| Mudança de schema com dados existentes | Não — escrever migration de **dados** (`UPDATE/INSERT`) na migration.sql |

> Seeds re-executam: cada seed deve ser **idempotente** (usar `upsert`, ou apagar/recriar o registro alvo). O `seed-product-PA0001.js` já segue esse padrão (deleta relações antes de recriar).

---

## Diferença entre banco local e produção

| Aspecto          | Local                    | Produção                              |
| ---------------- | ------------------------ | ------------------------------------- |
| Arquivo          | `dev.db`                 | `prod.db` (ou Postgres)               |
| Path             | `apps/backend/prisma/dev.db`  | `~/apps/backend/prisma/prod.db`            |
| Como criar       | `migrate dev`            | `migrate deploy`                      |
| Reset permitido? | Sim                      | **NUNCA**                             |
| Backup           | trivial (copiar arquivo) | obrigatório antes de migration grande |
| `DATABASE_URL`   | `file:./prisma/dev.db`   | `.env.production` no servidor         |

---

## Como saber se uma mudança impacta banco

Pergunta-chave: **alterei `apps/backend/prisma/schema.prisma`?**

- **Sim** → impacta banco. Precisa migration.
- **Não, mas mudei seed** → impacta dados, não estrutura. Subir o seed e rodar manual.
- **Não, mas mudei rota/handler** → não impacta banco.
- **Mudei só `metadata` de um produto** → não muda estrutura (é JSON dentro do campo `metadata`), mas precisa re-seedar para refletir.

---

## Cuidados importantes

1. **Backup antes de qualquer migration em produção**

   ```bash
   cp ~/apps/backend/prisma/prod.db ~/backups/prod-$(date +%Y%m%d-%H%M).db
   ```

   Postgres: `pg_dump`.

2. **Não editar `migration.sql` depois de aplicada**. Crie uma nova migration corretiva.

3. **Não mexer manualmente no `dev.db` ou `prod.db`** com SQLite Browser / cliente externo durante o desenvolvimento — pode dessincronizar do schema.

4. **Renomear coluna no Prisma** drop + add → perde dados. Para preservar:
   - Crie migration manual com `ALTER TABLE ... RENAME COLUMN`.
   - Ajuste o schema sem aplicar mais nada.

5. **Migration que falha no servidor** → não tente rodar `migrate dev`. Reverter para o backup, corrigir a migration localmente, subir de novo.

6. **Prisma Client desatualizado** após deploy → **restart do app Node** é obrigatório.

7. **Diff entre produção e schema** pode ser visto com `prisma migrate status`.

---

## Inspecionar dados

### Localmente

```powershell
cd apps/backend
npx prisma studio
# → abre http://localhost:5555 com UI visual
```

### Produção (somente leitura, com cuidado)

```bash
ssh user@servidor
cd ~/backend
npx prisma studio
# Túnel SSH para acessar a porta 5555 do servidor — apenas para inspeção pontual
```

Ou via SQL direto (para SQLite):

```bash
sqlite3 ~/apps/backend/prisma/prod.db
.tables
SELECT name FROM Product LIMIT 5;
```

