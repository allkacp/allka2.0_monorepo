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

- **Bundler**: Vite (`vite.config.ts`)
- **Roteador**: React Router v7 (`App.tsx` → `main.tsx`)
- **Estilização**: Tailwind CSS 4 + shadcn/ui (Radix UI)
- **Estado global**: Context API (sem Redux/Zustand)
- **HTTP**: cliente próprio em `lib/api-client.ts` + `lib/api-client-factory.ts`
- **Editor rich text**: TipTap
- **Build output**: `dist/` (vai para `public_html/` no cPanel)

### 2. Backend — Express 5 + Prisma + Node 20+

- Entry point real: `backend/app.js` (CommonJS, importa as rotas compiladas / `tsx`)
- Entry TS: `backend/src/index.ts` → `backend/src/app.ts`
- Rotas em `backend/src/routes/*.ts` (uma por domínio)
- Middleware JWT em `backend/src/middleware/`
- Validação: `zod`
- Auth: `bcryptjs` + `jsonwebtoken`
- Process manager (produção): PM2 via `ecosystem.config.js`

### 3. Banco — Prisma + SQLite/PostgreSQL

- Schema único: `backend/prisma/schema.prisma`
- DB local: `backend/prisma/dev.db` (SQLite, gitignored)
- DB de produção: definido por `DATABASE_URL` no `backend/.env.production`
- Seeds: `backend/prisma/seed.ts`, `backend/seed-product-PA0001.js`, `backend/seed-admin.js`

Detalhes em [banco.md](./banco.md).

---

## Fluxo de uma requisição típica

```
1. Usuário clica "Salvar" em uma página → componente React
2. Componente chama hook/contexto → ex: useProducts().updateProduct(...)
3. Contexto chama apiClient.updateProduct(id, data) → lib/api-client.ts
4. apiClient envia PUT /api/products/:id com Authorization: Bearer <jwt>
5. Express resolve rota em backend/src/routes/products.ts
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
| `app/`                 | Páginas por portal (admin, empresa, agencia, parceiro, nomades)                 | criar/alterar tela                    |
| `components/`          | Componentes React reutilizáveis (drawers, tabelas, headers, modais)             | criar componente compartilhado        |
| `components/ui/`       | Primitivos do shadcn/ui (button, dialog, etc.)                                  | raramente — só se ajustar primitivo   |
| `contexts/`            | Contextos React (account-type, sidebar, company, partner, etc.)                 | adicionar estado global               |
| `lib/`                 | Utilitários, cliente API, motor de pricing, contextos de produto                | lógica compartilhada não-visual       |
| `lib/contexts/`        | Contextos de domínio: `product-context`, `pricing-context`, `specialty-context` | estado de produto/pricing             |
| `hooks/`               | Hooks customizados (`use-toast`, `use-pricing`)                                 | extrair lógica reutilizável           |
| `types/`               | Tipos TS globais                                                                | definir interface compartilhada       |
| `constants/`           | Constantes (ex: `tax-rates`)                                                    | adicionar constante de negócio        |
| `public/`              | Assets estáticos (logos, favicon)                                               | trocar logo, ícone                    |
| `dev-mocks/`           | Dados mock e cliente mock (gitignored)                                          | rodar UI sem backend                  |
| `backend/`             | API Express + Prisma                                                            | qualquer mudança de API ou schema     |
| `dist/`                | Build de produção do frontend                                                   | **nunca editar manualmente**          |
| `App.tsx` / `main.tsx` | Bootstrap do React                                                              | adicionar provider raiz / rota global |
| `.env.*`               | Variáveis por modo (mock/dev/prod)                                              | mudar URL de API ou flag              |
| `vite.config.ts`       | Configuração do bundler                                                         | aliases, plugins                      |
| `tsconfig.json`        | Configuração TS                                                                 | paths, strict mode                    |
| `tailwind.config.*`    | Tema Tailwind (cores, brand vars)                                               | tema/design tokens                    |

### Subpastas de `app/` (uma pasta por rota)

```
app/admin/        → 31 páginas admin (cada uma é uma pasta com page.tsx)
app/nomades/      → 8 páginas
app/empresa/      → 4 páginas
app/agencia/      → 4 páginas
app/parceiro/     → 5 páginas
```

Padrão: cada rota é uma pasta cujo arquivo `page.tsx` exporta o componente da tela. Ex: `app/admin/produtos/page.tsx`.

### Subpastas de `backend/`

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
| Adicionar página nova no admin | `app/admin/<nova-rota>/page.tsx` + adicionar rota em `App.tsx` + item no menu da sidebar                                                                                                                      |
| Adicionar campo num produto    | `backend/prisma/schema.prisma` (model Product) → `prisma migrate` → `backend/src/routes/products.ts` (zod + handler) → `lib/contexts/product-context.tsx` (interface) → `lib/product-adapter.ts` (mapeamento) |
| Mudar tema/cores               | `app/globals.css` + `contexts/sidebar-context.tsx` (CSS vars `--app-brand-*`)                                                                                                                                 |
| Adicionar endpoint novo        | criar arquivo em `backend/src/routes/<dominio>.ts` + registrar em `backend/src/app.ts`                                                                                                                        |
| Trocar logo                    | `public/`                                                                                                                                                                                                     |
| Mudar texto de e-mail/seed     | `backend/seed-*.js` ou `backend/prisma/seed.ts`                                                                                                                                                               |
| Criar novo drawer lateral      | `components/<nome>-slide-panel.tsx` seguindo padrão de [ui-e-padroes.md](./ui-e-padroes.md)                                                                                                                   |

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
- **Mock vs real**: nunca importar de `dev-mocks/` em código que vai pra produção (ver `lib/api-client-factory.ts`).

