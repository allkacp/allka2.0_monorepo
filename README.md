# Allka 2026 — Plataforma

Plataforma de gestão para empresas, nômades digitais, agências e parceiros.

**Stack**: React 18 + Vite 7 + TypeScript 5 + Tailwind CSS 4 (frontend) · Express 5 + Prisma + SQLite/PostgreSQL (backend) · Deploy em cPanel.

---

## O que é

A plataforma **unifica cinco portais** em um único sistema — cada perfil de usuário tem sua área com navegação própria, mas compartilha o mesmo layout e identidade visual.

| Portal       | Rota base   | Para quem                                   |
| ------------ | ----------- | ------------------------------------------- |
| **Admin**    | `/admin`    | Operação interna da Allka                   |
| **Empresa**  | `/empresa`  | Clientes que contratam produtos             |
| **Agência**  | `/agencia`  | Agências parceiras com carteira de clientes |
| **Parceiro** | `/parceiro` | Indicadores que recebem comissão            |
| **Nômade**   | `/nomades`  | Freelancers que executam tarefas            |

O **admin** cria e gerencia produtos, empresas, projetos, nômades e configurações. Empresas contratam produtos e acompanham projetos. Nômades pegam tarefas habilitadas. Agências gerenciam sua carteira. Parceiros indicam agências e recebem comissão.

---

## Arquitetura resumida

```
Frontend (React/Vite SPA)   →  Backend (Express/Prisma)  →  Banco (SQLite/Postgres)
 dist/ em public_html/          Node app no cPanel           prisma/*.db ou Postgres
```

Detalhes em [docs/arquitetura.md](./docs/arquitetura.md).

---

## Rodar localmente

### Frontend apenas (sem backend, com mocks)

```powershell
npm install
npm run dev:mock
```

### Frontend + backend integrados

```powershell
# terminal 1 — backend
cd backend
npm install
npx prisma migrate dev
npx tsx prisma/seed.ts
node app.js       # sobe a API em http://localhost:3001

# terminal 2 — frontend
npm install
npm run dev
```

### Credenciais de teste (após seed)

- **Admin**: `cp@lamego.com.vc` / `123@321`
- Outros perfis: ver `backend/prisma/seed.ts`

Detalhes em [docs/arquitetura.md](./docs/arquitetura.md) e [docs/banco.md](./docs/banco.md).

---

## Deploy resumido

Três artefatos independentes:

| Artefato                       | Sobe quando mudei...                                                                           | Para onde                     |
| ------------------------------ | ---------------------------------------------------------------------------------------------- | ----------------------------- |
| **Frontend** (`dist/`)         | qualquer coisa em `app/`, `components/`, `contexts/`, `lib/`, `hooks/`, CSS, `.env.production` | `public_html/` no cPanel      |
| **Backend** (`app.js`, `src/`) | qualquer coisa em `backend/src/`, `backend/app.js`, dependências                               | app Node no cPanel (restart)  |
| **Banco** (migrations)         | `backend/prisma/schema.prisma`                                                                 | SSH + `prisma migrate deploy` |

Guia completo, passo a passo e erros comuns em [docs/deploy.md](./docs/deploy.md).

---

## Documentação detalhada

A documentação técnica completa está em [`/docs`](./docs):

| Documento                                                       | Conteúdo                                                                           |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| [arquitetura.md](./docs/arquitetura.md)                         | Camadas, estrutura de pastas, fluxo frontend↔backend↔banco, onde editar cada parte |
| [deploy.md](./docs/deploy.md)                                   | Deploy no cPanel — frontend, backend, banco, variáveis, erros comuns, checklists   |
| [banco.md](./docs/banco.md)                                     | Prisma, schema, migrations, seeds, diferença local vs produção, cuidados           |
| [produtos.md](./docs/produtos.md)                               | Produto pai, variações, tarefas, etapas, testes, briefing, catálogo, onde editar   |
| [telas-e-funcionalidades.md](./docs/telas-e-funcionalidades.md) | Mapa das páginas de cada portal + onde editar cada uma                             |
| [ui-e-padroes.md](./docs/ui-e-padroes.md)                       | Padrões visuais, drawers laterais, tema, componentes reutilizáveis                 |
| [regras-de-negocio.md](./docs/regras-de-negocio.md)             | Regras importantes (perfis, produtos, financeiro, permissões, segurança)           |
| [boas-praticas-dev.md](./docs/boas-praticas-dev.md)             | Como mexer sem quebrar, identificar impacto, documentar mudanças                   |
| [checklist-manutencao.md](./docs/checklist-manutencao.md)       | Checklists práticas: criar feature, revisar, preparar deploy, validar pós-deploy   |

---

## Observações importantes para novos devs

1. **Três modos de execução**: `dev:mock` (sem backend), `dev` (com backend local), `build` (produção). Flag via `.env.<modo>`.
2. **Drawer lateral é o padrão** para criar/editar (nunca modal centralizado). Referência: `components/company-create-slide-panel.tsx`.
3. **Tema** vem de variáveis CSS do `SidebarContext` (`--app-brand-*`) — nunca hardcodear cor.
4. **Produtos** têm base compartilhada (no pai) e diferenciais por variação — ver [docs/produtos.md](./docs/produtos.md).
5. **Sempre testar em `mock` e `dev`** antes de subir.
6. **Backup do banco** antes de qualquer migration em produção.
7. **`.env` nunca vai pro git**. Use os `.env.example` como template.
8. **Desativar em vez de deletar** (preserva histórico).
9. **Sem SSR** — é SPA pura. Rotas cliente dependem do `.htaccess` no cPanel.
10. Português na UI, inglês no código.

---

## Estrutura do repositório (alto nível)

```
allka-2026/
├── app/              ← páginas por portal (admin, empresa, agencia, parceiro, nomades)
├── components/       ← componentes React reutilizáveis (+ ui/ com primitivos shadcn)
├── contexts/         ← contextos React globais (account-type, sidebar, company, ...)
├── lib/              ← clientes de API, engine de pricing, contextos de domínio
├── hooks/            ← hooks customizados
├── types/            ← tipos TS compartilhados
├── constants/        ← constantes de negócio (tax rates, ...)
├── public/           ← assets estáticos
├── dev-mocks/        ← dados e cliente mock (gitignored)
├── backend/          ← API Express + Prisma
│   ├── src/          ← rotas, middlewares, config
│   ├── prisma/       ← schema, migrations, seed, dev.db
│   ├── app.js        ← entry usado em produção
│   └── seed-*.js     ← seeds pontuais (admin, PA0186)
├── docs/             ← documentação técnica detalhada
├── App.tsx           ← router raiz + providers
├── main.tsx          ← bootstrap React
└── vite.config.ts    ← configuração do bundler
```

---

## Licença

Privado — Allka by Lamego.
