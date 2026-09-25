# Allka 2026 — Plataforma

Plataforma de gestão para empresas, nômades digitais, agências e parceiros.

**Stack**: React 18 + Vite 7 + TypeScript 5 + Tailwind CSS 4 (frontend) · Express 5 + Prisma + SQLite local/MySQL em produção (backend) · Docker + GitHub Actions + GHCR + Caddy no VPS.

---

## Marco atual: lançamento Allka 2.0

**Meta interna de prontidão: 30 de setembro de 2026.** Até esta data, todo item **VS1** do [Roadmap Allka 2.0 — Lançamento](../Roadmap%20Allka%202.0%20%E2%80%94%20Lan%C3%A7amento.xlsx) deve estar funcional, validado em fluxo real e pronto para produção. Os itens **VS2** não bloqueiam a primeira publicação e devem ser apresentados como **“Em breve”** quando aparecerem no produto.

O plano completo, com a lista literal dos itens, riscos já identificados, ordem de foco e critérios de saída, está em [docs/memoria-lancamento-2026-09.md](./docs/memoria-lancamento-2026-09.md). **Qualquer agente ou pessoa que retome o trabalho deve ler esse documento antes de priorizar novas tarefas ou recomendar deploy.**

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
| **Frontend** | imagem Nginx gerada por `docker/frontend.prod.Dockerfile` | `https://allka.store`           |
| **Backend**  | imagem Node gerada por `docker/backend.prod.Dockerfile`    | `https://api.allka.store`       |
| **Banco**    | `mysql:8.4` com volume Docker                   | rede interna do Compose         |
| **Proxy**    | Caddy com HTTPS automático                      | portas 80/443 do VPS            |

As workflows [deploy-backend.yml](./.github/workflows/deploy-backend.yml) e [deploy-frontend.yml](./.github/workflows/deploy-frontend.yml) publicam imagens no GHCR, enviam o Compose para o VPS por SSH, executam as migrations do Prisma e sobem os serviços. Guia completo em [docs/deploy-hostinger-kvm.md](./docs/deploy-hostinger-kvm.md). (Os endereços antigos `dev.allka.com.vc` / `api-dev.allka.com.vc` e o guia de cPanel foram removidos — não são mais usados.)

## Operação e deploy — LEIA ANTES DE QUALQUER TRABALHO (vale para qualquer pessoa ou IA: Claude, Codex, Copilot…)

> Esta seção é a **fonte única** das regras de operação. `CLAUDE.md`, `AGENTS.md` e `.github/copilot-instructions.md` apenas apontam para cá.

**Endereços:** site https://allka.store · API https://api.allka.store (`/api/health` → `{"status":"ok"}`) · servidor VPS Hostinger (Docker Compose + Caddy).

### Código x dado (a regra que mais gera confusão)
- **Deploy leva só CÓDIGO.** `git push allka2 HEAD:main` dispara `deploy-backend.yml` (se mudou `apps/backend/**`) e/ou `deploy-frontend.yml` (se mudou `apps/frontend/**`). O deploy do backend também aplica as migrations do Prisma no banco do servidor.
- **Dados (usuários, empresas, projetos, produtos) NÃO sobem no deploy.** O banco local e o do servidor são separados: mudar dado local não muda o servidor.
- Dado só sobe por procedimento explícito e guardado (abaixo). Nunca rodar script local apontando para o banco do servidor por conta própria.

### Protocolo de deploy (seguir sempre, nesta ordem)
1. `git status`; typecheck (`npx tsc --noEmit -p .`) e `npm run build` em `apps/backend` e `apps/frontend`.
2. Ver o que vai subir desde o último deploy: `git diff --stat $(git describe --tags --match 'deploy-*' --abbrev=0)..HEAD`.
3. Commitar e `git push allka2 HEAD:main`. Acompanhar com `gh run list --repo allkacp/allka2.0_monorepo` até **Deploy Backend** e **Deploy Frontend** ficarem verdes.
4. Verificar no ar: API health, site 200 e um login.
5. Marcar: `git tag deploy-AAAA-MM-DD-N && git push allka2 deploy-AAAA-MM-DD-N` e registrar em [docs/deploy-log.md](./docs/deploy-log.md).
6. **Relatar ao usuário em linguagem simples:** quais pastas/áreas subiram (backend, frontend, banco/migrations, docs), o que mudou para o usuário em cada uma e o que **não** subiu (dados locais).
7. CI acusando "schema.prisma divergente das migrations" → gerar a migration que falta (nunca `db push`). Timeout de SSH num workflow costuma ser transitório → `gh run rerun <id> --failed`.

### Registro do que foi alterado
Ao terminar qualquer alteração de arquivos, anotar em [docs/deploy-log.md](./docs/deploy-log.md), seção **"Pendente de deploy"** (pasta/área + o que mudou). Quando o usuário pedir deploy, subir só o que está pendente e listar no relatório. Depois do deploy, mover as anotações para a entrada do deploy.

### Dados: produtos e limpeza do banco do servidor
- **Produtos do catalog2 (preencher local → subir):** `npm run catalog2:export-prepared` (local, gera pacote fora do Git) → workflow manual **"Importar catálogo preparado em produção"** com `dry_run` primeiro e só depois `apply` (exige hash do manifesto, backup validado e a frase "TRANSFERIR PARA PRODUCAO"). Detalhes nos cabeçalhos de `apps/backend/src/scripts/catalog2-export-prepared-state.ts` e `catalog2-transfer-prepared-state.ts`. Só rodar `apply` com pedido explícito do usuário.
- **DECISÃO DO USUÁRIO (2026-09-25): a fonte da verdade dos PRODUTOS é o servidor (`allka.store`).** O usuário cadastra/edita produtos direto online; esses dados persistem lá (deploys nunca mexem em dados). Não subir produtos do local para o servidor por conta própria — isso poderia sobrescrever/conflitar com o que foi cadastrado online. Quando o usuário avisar ("puxa os produtos do servidor"), **puxar do servidor para o local** (servidor → pacote criptografado → `catalog2:import-prepared` local). Esse fluxo de "puxar" ainda precisa ser construído: o `catalog2:export-prepared` hoje recusa bancos não locais (`assertLocalDatabase`) e precisa de um workflow que rode no VPS. Até lá, não editar os mesmos produtos nos dois lados ao mesmo tempo.
- **Zerar/limpar dados do servidor:** operação destrutiva e irreversível. Exige backup do banco do servidor, ensaio numa cópia, mostrar as contagens ao usuário e confirmação explícita naquele momento.

### Contas de teste e preferências do usuário
- 16 usuários (12 reais do time + 4 fake: `company@`, `company2@`, `agency@`, `partner@allka.com.vc`), senha `123456` (decisão do usuário, vale também no servidor). Empresas/agências fake têm prefixo `[TESTE]`.
- O usuário não é técnico: ao fechar cada tarefa, dar resumo curto em linguagem leiga (o que foi feito / deu certo / não deu certo / o que preciso dele).
- Erros mostrados ao usuário sempre com o motivo exato, em português. Uma tela/componente compartilhado para todos os portais (muda só permissão/dado). Ações irreversíveis: confirmar antes.

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
| [padrao-tabela-empresas.md](./docs/padrao-tabela-empresas.md)   | Especificação completa do padrão de tabela (referência `admin/empresas`) — usar sempre que replicar o padrão em outra tela |
| [regras-de-negocio.md](./docs/regras-de-negocio.md)             | Regras importantes (perfis, produtos, financeiro, permissões, segurança)           |
| [boas-praticas-dev.md](./docs/boas-praticas-dev.md)             | Como mexer sem quebrar, identificar impacto, documentar mudanças                   |
| [checklist-manutencao.md](./docs/checklist-manutencao.md)       | Checklists práticas: criar feature, revisar, preparar deploy, validar pós-deploy   |
| [memoria-lancamento-2026-09.md](./docs/memoria-lancamento-2026-09.md) | Fonte de verdade do lançamento: escopo VS1, data-alvo, riscos e ordem de execução |

---

## Observações importantes para novos devs

1. **Três modos de execução**: `dev:mock` (sem backend), `dev` (com backend local), `build` (produção). Flag via `.env.<modo>`.
2. **Drawer lateral é o padrão** para criar/editar/filtrar (nunca modal centralizado com backdrop). Usar o componente compartilhado `apps/frontend/components/slide-panel.tsx` (`<SlidePanel>`) — ver [docs/ui-e-padroes.md](./docs/ui-e-padroes.md).
3. **Tabelas de listagem** seguem o padrão criado em `admin/empresas` (cards de estatística, badges "neon", coluna de ações fixa, paginação espelhada topo/rodapé). Ao replicar em outra tela, seguir **[docs/padrao-tabela-empresas.md](./docs/padrao-tabela-empresas.md)** à risca — não é para simplificar.
4. **Tema** vem de variáveis CSS do `SidebarContext` (`--app-brand-*`) — nunca hardcodear cor.
5. **Produtos** têm base compartilhada (no pai) e diferenciais por variação — ver [docs/produtos.md](./docs/produtos.md).
6. **Sempre testar em `mock` e `dev`** antes de subir.
7. **Backup do banco** antes de qualquer migration em produção.
8. **`.env` nunca vai pro git**. Use os `.env.example` como template.
9. **Desativar em vez de deletar** (preserva histórico).
10. **Sem SSR** — é SPA pura. Rotas cliente dependem do `.htaccess` no cPanel.
11. Português na UI, inglês no código.
12. **Prioridade até 30/09/2026:** não tratar VS2 como bloqueador. Fechar e homologar o VS1 conforme [a memória de lançamento](./docs/memoria-lancamento-2026-09.md), com atenção imediata aos bloqueadores destacados nela.

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
