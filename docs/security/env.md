# Variáveis de Ambiente e Segurança de Secrets

## Regra fundamental

**Nunca commitar arquivos `.env` com valores reais no repositório.**

Secrets commitados comprometem o ambiente mesmo depois de removidos do histórico,
porque ficam na memória de forks, caches e logs de CI. Se um secret vazou para o Git,
ele deve ser **rotacionado imediatamente** — remover do repo não é suficiente.

---

## Arquivos que não devem ir para o Git

O `.gitignore` já está configurado para excluir:

```
.env
.env.*          (ex: .env.development, .env.local, .env.production)
*.db
*.sqlite
dist/
node_modules/
logs/
*.tmp
```

Os únicos arquivos de ambiente que **podem** ser commitados são os `.example`:

```
apps/backend/.env.example
apps/backend/.env.production.example
apps/frontend/.env.example
apps/frontend/.env.production.example
```

Esses arquivos contêm apenas placeholders, nunca valores reais.

---

## Como configurar o ambiente local

```bash
# Backend
cp apps/backend/.env.example apps/backend/.env
# Edite apps/backend/.env com os valores reais do seu ambiente local

# Frontend (desenvolvimento)
cp apps/frontend/.env.example apps/frontend/.env.development
# Edite apps/frontend/.env.development se necessário
```

---

## Variáveis obrigatórias

### Backend (`apps/backend/.env`)

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DATABASE_URL` | Sim | URL de conexão MySQL |
| `JWT_SECRET` | Sim | Mínimo 32 caracteres, aleatório |
| `PORT` | Não | Padrão: `3001` |
| `NODE_ENV` | Não | `development` ou `production` |
| `SEED_TEST_USER_PASSWORD` | Seeds de teste | Senha dos usuários `.allka.test` |

### Frontend (`apps/frontend/.env.development`)

| Variável | Obrigatória | Descrição |
|---|---|---|
| `VITE_API_URL` | Sim | URL base da API (sem barra final) |
| `VITE_USE_MOCKS` | Não | `true` para modo offline sem backend |
| `VITE_ENABLE_TEST_LOGIN` | Não | `true` para exibir seletor de login de teste |

---

## Onde ficam os secrets em produção

- **GitHub Actions**: configurar em `Settings → Secrets and variables → Actions`
- **VPS/Hostinger**: arquivo `.env` no servidor, fora do repo, com permissão `600`
- **Docker Compose**: variáveis injetadas via arquivo `.env` no servidor ou secrets do Docker

Nunca passar secrets como argumentos de linha de comando (ficam visíveis em `ps aux`).

---

## Geração de JWT_SECRET seguro

```bash
# Linux / Mac
openssl rand -base64 48

# Node.js
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

---

## Secrets que precisam de rotação

Se qualquer um dos itens abaixo já foi commitado (mesmo que removido depois),
ele deve ser rotacionado imediatamente:

- [ ] `JWT_SECRET` do backend — invalida todos os tokens ativos (logout de todos os usuários)
- [ ] `DATABASE_URL` com senha real — alterar senha no banco e atualizar em todos os ambientes
- [ ] Qualquer senha de usuário real presente em seeds

**Rotacionar `JWT_SECRET`:**
1. Gerar novo valor com `openssl rand -base64 48`
2. Atualizar no servidor de produção
3. Atualizar no GitHub Secrets
4. Reiniciar o backend — todos os usuários precisarão fazer login novamente (comportamento esperado)

---

## Seeds de teste em produção

Todos os seeds de teste têm trava explícita:

```ts
if (process.env.NODE_ENV === "production") {
  throw new Error("Este seed não pode rodar em produção.");
}
```

Nunca executar `npm run db:seed:test-users` em ambiente de produção.
O seed principal (`prisma/seed.ts`) também tem essa trava.
