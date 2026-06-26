# Allka 2026 — Plataforma

Plataforma de gestão para empresas, nômades digitais, agências e parceiros.

**Stack**: React 18 + Vite 7 + TypeScript 5 + Tailwind CSS 4 (frontend) · Express 5 + Prisma + SQLite local/MySQL em produção (backend) · Docker + GitHub Actions + GHCR + Caddy no VPS.

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
Frontend (React/Vite SPA)   →  Backend (Express/Prisma)  →  Banco
 Nginx em container             Node em container             SQLite local / MySQL no VPS
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
npm install
npm run dev
```

O comando raiz sobe o backend em `http://localhost:3001` e o frontend em `http://localhost:8080`.
Para comandos específicos de banco, use `npm run <script> -w apps/backend` ou entre em `apps/backend`.

### Credenciais de teste (após seed)

- **Admin**: `cp@lamego.com.vc` / `123@321`
- Outros perfis: ver `apps/backend/prisma/seed.ts`

Detalhes em [docs/arquitetura.md](./docs/arquitetura.md) e [docs/banco.md](./docs/banco.md).

---

## Deploy resumido

> ⚠️ **IMPORTANTE — para onde subir (push) para fazer deploy**
>
> O deploy é feito **sempre** a partir do repositório **monorepo**:
>
> ```
> https://github.com/allkacp/allka2.0_monorepo
> ```
>
> Para publicar, faça push para o remote **`allka2`** (e não para `origin`):
>
> ```powershell
> git push allka2 HEAD:main
> ```
>
> O remote `origin` (`allka_2.0_frontend`) e o `ui` (`allka-user-interface`) **NÃO** disparam deploy — subir para eles não muda nada em produção. Confira com `git remote -v`.

O deploy principal de desenvolvimento roda no Hostinger KVM com containers separados:

| Serviço      | Imagem/infra                                    | Domínio                         |
| ------------ | ----------------------------------------------- | ------------------------------- |
| **Frontend** | imagem Nginx gerada por `docker/frontend.prod.Dockerfile` | `https://dev.allka.com.vc`      |
| **Backend**  | imagem Node gerada por `docker/backend.prod.Dockerfile`    | `https://api-dev.allka.com.vc`  |
| **Banco**    | `mysql:8.4` com volume Docker                   | rede interna do Compose         |
| **Proxy**    | Caddy com HTTPS automático                      | portas 80/443 do VPS            |

A workflow [deploy.yml](./.github/workflows/deploy.yml) publica imagens no GHCR, envia o Compose para o VPS por SSH, executa migrations MySQL e sobe os serviços. Guia completo em [docs/deploy-hostinger-kvm.md](./docs/deploy-hostinger-kvm.md). O guia antigo de cPanel continua em [docs/deploy.md](./docs/deploy.md) como referência histórica.

---

## Documentação detalhada

A documentação técnica completa está em [`/docs`](./docs):

| Documento                                                       | Conteúdo                                                                           |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| [arquitetura.md](./docs/arquitetura.md)                         | Camadas, estrutura de pastas, fluxo frontend↔backend↔banco, onde editar cada parte |
| [deploy-hostinger-kvm.md](./docs/deploy-hostinger-kvm.md)         | Deploy containerizado no Hostinger KVM via GitHub Actions, GHCR, MySQL e Caddy      |
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
2. **Drawer lateral é o padrão** para criar/editar (nunca modal centralizado). Referência: `apps/frontend/components/company-create-slide-panel.tsx`.
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
├── apps/
│   ├── frontend/     ← SPA React/Vite, assets, mocks e configs do frontend
│   │   ├── app/      ← páginas por portal (admin, empresa, agencia, parceiro, nomades)
│   │   ├── components/
│   │   ├── contexts/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── public/
│   │   └── vite.config.ts
│   └── backend/      ← API Express + Prisma
│       ├── src/      ← rotas, middlewares, config
│       ├── prisma/   ← schema, migrations, seed, dev.db
│       ├── app.js    ← entry usado em produção
│       └── seed-*.js ← seeds pontuais
├── docker/           ← Dockerfiles de desenvolvimento e produção
├── infra/            ← Caddy/Nginx e configs de produção
├── scripts/          ← automações e utilitários
├── services/         ← serviços auxiliares futuros
├── installer/        ← bootstrap do VPS e instaladores futuros
├── logs/             ← logs locais ignorados pelo Git
├── docs/             ← documentação técnica detalhada
├── package.json      ← orquestração npm workspaces
└── docker-compose.yml
```

---

## Licença

Privado — Allka by Lamego.
