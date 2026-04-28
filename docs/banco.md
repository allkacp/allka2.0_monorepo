# Banco de Dados

Tudo sobre o banco da plataforma: schema, migrations, seeds, ambientes.

---

## Tecnologia

- **ORM**: [Prisma](https://www.prisma.io/) 5.22
- **Local**: SQLite (arquivo `backend/prisma/dev.db`)
- **Produção**: SQLite (`prod.db`) **ou** PostgreSQL — definido por `DATABASE_URL`
- **Schema**: arquivo único `backend/prisma/schema.prisma` (fonte da verdade)
- **Migrations**: pasta `backend/prisma/migrations/`

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

> A lista completa está sempre em [`backend/prisma/schema.prisma`](../backend/prisma/schema.prisma).

---

## Configuração local

### Primeira vez

```powershell
cd backend
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

### Variável de ambiente local (`backend/.env`)

```
DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET="dev-secret-change-me"
PORT=3001
```

### Reset completo (apaga tudo)

```powershell
cd backend
npx prisma migrate reset --force
# → roda migrations + seed automaticamente
```

---

## Migrations — fluxo correto

### Criar uma migration nova (ambiente local)

Sempre que mudar o `schema.prisma`:

```powershell
cd backend
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

`backend/prisma/seed.ts` — popula um conjunto consistente de dados (usuários de cada perfil, agências de exemplo, produtos básicos).

Rodar:

```powershell
cd backend
npx tsx prisma/seed.ts
# OU
npx prisma db seed
```

### Seeds pontuais

| Arquivo                                | Cria/atualiza                                                              |
| -------------------------------------- | -------------------------------------------------------------------------- |
| `backend/seed-admin.js`                | Usuário `cp@lamego.com.vc` / `123@321` (admin)                             |
| `backend/seed-product-PA0001.js`       | Produto Gestão de Tráfego com tarefas, etapas, variações, briefing, testes |
| `backend/prisma/seed-levels.ts`        | Níveis de nômade e parceiro                                                |
| `backend/prisma/seed-company-users.ts` | Usuários vinculados a empresas                                             |

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
| Path             | `backend/prisma/dev.db`  | `~/backend/prisma/prod.db`            |
| Como criar       | `migrate dev`            | `migrate deploy`                      |
| Reset permitido? | Sim                      | **NUNCA**                             |
| Backup           | trivial (copiar arquivo) | obrigatório antes de migration grande |
| `DATABASE_URL`   | `file:./prisma/dev.db`   | `.env.production` no servidor         |

---

## Como saber se uma mudança impacta banco

Pergunta-chave: **alterei `backend/prisma/schema.prisma`?**

- **Sim** → impacta banco. Precisa migration.
- **Não, mas mudei seed** → impacta dados, não estrutura. Subir o seed e rodar manual.
- **Não, mas mudei rota/handler** → não impacta banco.
- **Mudei só `metadata` de um produto** → não muda estrutura (é JSON dentro do campo `metadata`), mas precisa re-seedar para refletir.

---

## Cuidados importantes

1. **Backup antes de qualquer migration em produção**

   ```bash
   cp ~/backend/prisma/prod.db ~/backups/prod-$(date +%Y%m%d-%H%M).db
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
cd backend
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
sqlite3 ~/backend/prisma/prod.db
.tables
SELECT name FROM Product LIMIT 5;
```

