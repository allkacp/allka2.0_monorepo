# Arquitetura

Documento de referência da arquitetura técnica da plataforma Allka 2026.

---

## Visão geral em 1 minuto

A plataforma é uma **SPA React** servida pelo cPanel, consumindo uma **API Express** rodando no mesmo servidor (Node), que persiste dados em **SQLite (dev) / PostgreSQL ou SQLite (produção)** via **Prisma ORM**.

```
┌────────────────────────┐    HTTPS / JSON     ┌──────────────────────┐    Prisma     ┌──────────────┐
│  Frontend (React/Vite) │ ──────────────────► │  Backend (Express 5) │ ────────────► │  Banco       │
│  public_html/ (cPanel) │ ◄────────────────── │  Node.js (PM2)       │               │  dev.db /    │
└────────────────────────┘                     └──────────────────────┘               │  Postgres    │
                                                                                       └──────────────┘
```

Há ainda um **modo mock** (sem backend) usado para prototipar UI. Ver [boas-praticas-dev.md](./boas-praticas-dev.md).

---

## Camadas

### 1. Frontend — React 18 + Vite 7 + TS 5

- **Bundler**: Vite (`apps/frontend/vite.config.ts`)
- **Roteador**: React Router v7 (`App.tsx` → `main.tsx`)
- **Estilização**: Tailwind CSS 4 + shadcn/ui (Radix UI)
- **Estado global**: Context API (sem Redux/Zustand)
- **HTTP**: cliente próprio em `apps/frontend/lib/api-client.ts` + `apps/frontend/lib/api-client-factory.ts`
- **Editor rich text**: TipTap
- **Build output**: `apps/frontend/dist/` (vai para `public_html/` no cPanel)

### 2. Backend — Express 5 + Prisma + Node 20+

- Entry point real: `apps/backend/app.js` (CommonJS, importa as rotas compiladas / `tsx`)
- Entry TS: `apps/backend/src/index.ts` → `apps/backend/src/app.ts`
- Rotas em `apps/backend/src/routes/*.ts` (uma por domínio)
- Middleware JWT em `apps/backend/src/middleware/`
- Validação: `zod`
- Auth: `bcryptjs` + `jsonwebtoken`
- Process manager (produção): PM2 via `ecosystem.config.js`

### 3. Banco — Prisma + SQLite/PostgreSQL

- Schema único: `apps/backend/prisma/schema.prisma`
- DB local: `apps/backend/prisma/dev.db` (SQLite, gitignored)
- DB de produção: definido por `DATABASE_URL` no `apps/backend/.env.production`
- Seeds: `apps/backend/prisma/seed.ts`, `apps/backend/seed-product-PA0001.js`, `apps/backend/seed-admin.js`

Detalhes em [banco.md](./banco.md).

---

## Fluxo de uma requisição típica

```
1. Usuário clica "Salvar" em uma página → componente React
2. Componente chama hook/contexto → ex: useProducts().updateProduct(...)
3. Contexto chama apiClient.updateProduct(id, data) → lib/api-client.ts
4. apiClient envia PUT /api/products/:id com Authorization: Bearer <jwt>
5. Express resolve rota em apps/backend/src/routes/products.ts
6. Middleware verifyToken decodifica o JWT
7. Handler valida com zod, chama prisma.product.update(...)
8. Prisma converte em SQL, executa contra dev.db ou Postgres
9. Resposta JSON volta pelo mesmo caminho
10. Contexto atualiza state → UI re-renderiza
```

---

## Estrutura de pastas (raiz)

| Pasta / arquivo        | Conteúdo                                                                        | Onde editar quando...                 |
| ---------------------- | ------------------------------------------------------------------------------- | ------------------------------------- |
| `apps/frontend/app/`                 | Páginas por portal (admin, empresa, agencia, parceiro, nomades)                 | criar/alterar tela                    |
| `apps/frontend/components/`          | Componentes React reutilizáveis (drawers, tabelas, headers, modais)             | criar componente compartilhado        |
| `apps/frontend/components/ui/`       | Primitivos do shadcn/ui (button, dialog, etc.)                                  | raramente — só se ajustar primitivo   |
| `apps/frontend/contexts/`            | Contextos React (account-type, sidebar, company, partner, etc.)                 | adicionar estado global               |
| `apps/frontend/lib/`                 | Utilitários, cliente API, motor de pricing, contextos de produto                | lógica compartilhada não-visual       |
| `apps/frontend/lib/contexts/`        | Contextos de domínio: `product-context`, `pricing-context`, `specialty-context` | estado de produto/pricing             |
| `apps/frontend/hooks/`               | Hooks customizados (`use-toast`, `use-pricing`)                                 | extrair lógica reutilizável           |
| `apps/frontend/types/`               | Tipos TS globais                                                                | definir interface compartilhada       |
| `constants/`           | Constantes (ex: `tax-rates`)                                                    | adicionar constante de negócio        |
| `apps/frontend/public/`              | Assets estáticos (logos, favicon)                                               | trocar logo, ícone                    |
| `apps/frontend/dev-mocks/`           | Dados mock e cliente mock (gitignored)                                          | rodar UI sem backend                  |
| `apps/backend/`             | API Express + Prisma                                                            | qualquer mudança de API ou schema     |
| `apps/frontend/dist/`                | Build de produção do frontend                                                   | **nunca editar manualmente**          |
| `App.tsx` / `main.tsx` | Bootstrap do React                                                              | adicionar provider raiz / rota global |
| `.env.*`               | Variáveis por modo (mock/dev/prod)                                              | mudar URL de API ou flag              |
| `apps/frontend/vite.config.ts`       | Configuração do bundler                                                         | aliases, plugins                      |
| `tsconfig.json`        | Configuração TS                                                                 | paths, strict mode                    |
| `tailwind.config.*`    | Tema Tailwind (cores, brand vars)                                               | tema/design tokens                    |

### Subpastas de `apps/frontend/app/` (uma pasta por rota)

```
app/admin/        → 31 páginas admin (cada uma é uma pasta com page.tsx)
app/nomades/      → 8 páginas
app/empresa/      → 4 páginas
app/agencia/      → 4 páginas
app/parceiro/     → 5 páginas
```

Padrão: cada rota é uma pasta cujo arquivo `page.tsx` exporta o componente da tela. Ex: `apps/frontend/app/admin/produtos/page.tsx`.

### Subpastas de `apps/backend/`

```
backend/
  app.js                  → entry CJS (usado em produção via PM2)
  ecosystem.config.js     → config PM2
  prisma/
    schema.prisma         → modelo de dados (fonte da verdade)
    migrations/           → histórico de mudanças do banco
    seed.ts               → seed principal
    dev.db                → SQLite local (gitignored)
  src/
    index.ts              → entry TS (dev)
    app.ts                → setup Express + middlewares
    config.ts             → leitura de env
    routes/               → uma rota por domínio (products, users, projects...)
    middleware/           → JWT, error handler
    lib/                  → utilitários (prisma client, helpers)
    types/                → tipos TS do backend
  seed-*.js               → seeds pontuais (admin, produto PA0001)
```

---

## Pontos de extensão típicos

| Eu quero...                    | Edito em...                                                                                                                                                                                                   |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Adicionar página nova no admin | `apps/frontend/app/admin/<nova-rota>/page.tsx` + adicionar rota em `App.tsx` + item no menu da sidebar                                                                                                                      |
| Adicionar campo num produto    | `apps/backend/prisma/schema.prisma` (model Product) → `prisma migrate` → `apps/backend/src/routes/products.ts` (zod + handler) → `apps/frontend/lib/contexts/product-context.tsx` (interface) → `apps/frontend/lib/product-adapter.ts` (mapeamento) |
| Mudar tema/cores               | `apps/frontend/app/globals.css` + `apps/frontend/contexts/sidebar-context.tsx` (CSS vars `--app-brand-*`)                                                                                                                                 |
| Adicionar endpoint novo        | criar arquivo em `apps/backend/src/routes/<dominio>.ts` + registrar em `apps/backend/src/app.ts`                                                                                                                        |
| Trocar logo                    | `apps/frontend/public/`                                                                                                                                                                                                     |
| Mudar texto de e-mail/seed     | `apps/backend/seed-*.js` ou `apps/backend/prisma/seed.ts`                                                                                                                                                               |
| Criar novo drawer lateral      | `apps/frontend/components/<nome>-slide-panel.tsx` seguindo padrão de [ui-e-padroes.md](./ui-e-padroes.md)                                                                                                                   |

---

## Comunicação frontend ↔ backend

### URLs base por ambiente

| Modo          | `VITE_API_URL`                     |
| ------------- | ---------------------------------- |
| `mock`        | (não usa)                          |
| `development` | `http://localhost:3001/api`        |
| `production`  | `https://api-dev.allka.com.vc/api` |

### Autenticação

- Login: `POST /api/auth/login` retorna `{ token, user }`
- Token JWT é armazenado no `localStorage`
- Toda chamada autenticada envia `Authorization: Bearer <token>`
- Middleware `verifyToken` valida e injeta `req.user`

### Padrão de respostas

```jsonc
// Listas paginadas
{ "data": [...], "total": 123, "page": 1, "limit": 50 }

// Item único
{ "id": "...", "name": "...", ... }

// Erro
{ "error": "Mensagem em PT-BR" }
```

---

## Convenções importantes

- **TypeScript strict**: tipos sempre que possível.
- **Português em UI** / inglês em código (variáveis, funções).
- **Sem cache server-side**: backend é stateless, escalonável horizontalmente.
- **Sem SSR**: é SPA pura — `index.html` único, rotas no client.
- **Mock vs real**: nunca importar de `apps/frontend/dev-mocks/` em código que vai pra produção (ver `apps/frontend/lib/api-client-factory.ts`).

