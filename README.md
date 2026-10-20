# Allka 2026 — Plataforma

Plataforma de gestão para empresas, nômades digitais, agências e parceiros.

**Stack**: React 18 + Vite 7 + TypeScript 5 + Tailwind CSS 4 (frontend) · Express 5 + Prisma + **MySQL 8.4** (backend; no computador local roda em Docker, no servidor também) · Docker + GitHub Actions + GHCR + Caddy no VPS.

---

## Estado atual (atualizado em 2026-10-16)

> **Quem retoma o trabalho (pessoa, Claude, ChatGPT/Codex): leia esta seção, depois o [Registro de Continuidade](./documentos/Registro%20de%20Continuidade%20Produtos%20Allka.md) e, para qualquer coisa de produto, o guia [docs/cadastro-produto-passo-a-passo.md](./docs/cadastro-produto-passo-a-passo.md).**

- **Referência = computador local.** O usuário (admin master, não técnico) cadastra e testa tudo no LOCAL; o QA `allka.store` recebe **código** por `git push allka2 HEAD:main` e **dados** por "espelho completo" (workflow `mirror-local-to-qa.yml`) — **sempre e somente com ordem explícita dele**. Último deploy: `deploy-2026-10-15-1`; último espelho do banco local → QA: 15/10 (detalhes em [docs/deploy-log.md](./docs/deploy-log.md)). O que for feito depois (inclusive esta documentação) está na seção "Pendente de deploy" do log.
- **Cadastro de produtos (módulo `catalog2`)** é o foco do trabalho de outubro: editor em 5 passos (Informações → Entrega: tarefas, etapas e prazos → Classificação e opções → Custos e preço → Revisão e publicação). Produto individual tem **uma tarefa principal** e o resto são **etapas**; cada etapa tem executor (humano, IA ou humano ou IA), especialidade/horas, qualificação opcional (líder, pessoa, líder + pessoa ou **nômades qualificadores** em rodízio), checklist de 3 tipos, evidência e acessos do cliente. Variações têm **opção padrão = o que o produto original já inclui** (sem custo nem horas); só o que é extra soma horas (com especialidade própria opcional), prazo e valor. Tudo explicado campo a campo em [docs/cadastro-produto-passo-a-passo.md](./docs/cadastro-produto-passo-a-passo.md).
- **Telas novas de 14–15/10:** "Etapas para qualificar" (mesma tela em `/nomades/qualificacoes`, `/leader/qualificacoes` e `/admin/qualificacoes`; API `/api/qualificacoes`), marcação de **nômade qualificador** no cadastro, custo do qualificador (20%, configurável em Admin → Precificação), carregamentos padronizados (um só tipo de loader).
- **Em aberto (não tratar como erro):** motivo da reprovação do item "prompt da IA por etapa" (aguardando o usuário); regra "variação padrão x extra" e "Duplicar opção" (validar com o Gabriel); fase 2 "Humano ou IA" na contratação; bloqueio de conclusão sem evidência; revisão geral de layout das telas. Lista viva no Registro de Continuidade.
- **Correção de modalidades e primeira execução (16/10 — LOCAL, ainda NÃO publicada no QA nem em produção).** Só existem Avulso e Assinatura mensal; a implantação nasce das etapas "Só na primeira execução" e fica fora da renovação (preço separado em simulador, memória, cotação, cesta, checkout, contrato, projeto, relatórios); continuidade do executor com prazo de aceite, crédito por etapa dispensada e "exigir" pelo administrador; questionário e entregáveis com tela completa; produto individual sem dependência entre tarefas; "somente em pacote" em Pacotes e Dependências; assinatura mensal sem "nova entrega todo mês" bloqueia a publicação (o editor pergunta e leva ao campo). Migração: `20261016120000_first_execution_continuity_deliverables` (só colunas novas, com padrão). O **Produto ID 1** teve só os valores técnicos normalizados (`npx tsx src/scripts/catalog2-normalize-product-1.ts`, simulação por padrão; `--apply` grava; recusa banco não local) e **continua em rascunho**. Auditoria dos campos antigos (somente leitura): `npx tsx src/scripts/catalog2-legacy-fields-audit.ts`. Detalhes e testes: [docs/deploy-log.md](./docs/deploy-log.md) (seção "Pendente de deploy") e o guia do cadastro.
- **Para montar o cadastro de um produto novo com IA** (usuário usa o Codex/ChatGPT): use o prompt pronto de [docs/prompt-codex-cadastro-produto.md](./docs/prompt-codex-cadastro-produto.md).
- **Preferências fixas do usuário:** tabela de **farol** (🟢 pronto e conferido · 🟡 feito, aguardando teste dele · 🔴 não deu certo · ⏸ adiado) reenviada completa a cada item fechado; resumo em linguagem leiga ao fim de cada tarefa; todo campo com ícone "i" detalhado; documento final detalhado só no fim de outubro.

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
 Nginx em container             Node em container             MySQL 8.4 (Docker local / VPS)
```

Detalhes em [docs/arquitetura.md](./docs/arquitetura.md).

---

## Rodar localmente

### Frontend apenas (sem backend, com mocks)

```powershell
npm install
npm run dev:mock
```

### Ambiente local oficial (Docker — é o que o usuário usa)

```powershell
docker compose up -d        # sobe mysql, backend, frontend e browser-runner
docker compose ps           # todos devem estar "Up"
```

- Frontend: `http://localhost:8082` (o `docker-compose.override.yml` mapeia 8082→8080) · API: `http://localhost:3001` (`/api/health`) · MySQL: `127.0.0.1:3306` (banco `allka`).
- O Docker Desktop precisa estar aberto. Se ele "caiu": no Windows existe o script `iniciar-docker.ps1` na pasta acima do repositório (fora do Git) que corrige a inicialização e sobe os containers.
- Os containers montam o código por volume (recarga automática): não precisa rebuild a cada edição.
- A chave de cifra de segredos do ambiente de desenvolvimento (`META_TOKEN_ENCRYPTION_KEY`) é fixa no `docker-compose.yml`; em produção é outra e fica fora do repositório.
- Testes de banco (descartáveis, nunca o real): `TEST_DATABASE_URL`/`TEST_DATABASE_ADMIN_URL=mysql://root:allka_root_dev@127.0.0.1:3306/allka_test` e `npx tsx scripts/run-db-tests.ts <arquivo>` em `apps/backend` (uma suíte por vez).

### Frontend + backend sem Docker

```powershell
npm install
npm run dev
```

O comando raiz sobe o backend em `http://localhost:3001` e o frontend em `http://localhost:8080` (precisa de um MySQL acessível em `DATABASE_URL`).
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
- **DECISÃO DO USUÁRIO (2026-09-25, revisada): a fonte da verdade dos PRODUTOS é o computador LOCAL.** O usuário edita/cadastra os produtos localmente e, **só quando disser "sobe os produtos"**, o assistente envia a versão atual do local para o servidor (`allka.store`). Não existe (e o usuário decidiu NÃO criar) fluxo de "puxar do servidor para o local". Portanto **não cadastrar/editar produtos direto no servidor**: o próximo envio pode sobrescrever/recusar por conflito.
  - Procedimento do envio (sempre nesta ordem, sem pular a simulação): (1) `npm run catalog2:export-prepared -- --out=../../scratch/catalog2-package-AAAAMMDD` no local; (2) zipar a pasta como `catalog2-package-production-final/`, criptografar em AES-256-GCM no formato do workflow (cabeçalho `ALLKA-CATALOG2-2` + iv 12 + tag 16 + ciphertext), publicar como asset de um release temporário e gravar a chave no secret `CATALOG2_TRANSFER_BUNDLE_KEY`; (3) disparar o workflow **"Importar catálogo preparado em produção (manual)"** em `dry_run` (hoje ele está preso ao pacote de 2026-09-17: parametrizar release/asset/sha256/nº de imagens antes de usar); (4) mostrar o resultado ao usuário; (5) só com o "pode aplicar" dele, rodar `apply` com o hash do manifesto da simulação, o backup e a frase "TRANSFERIR PARA PRODUCAO"; (6) apagar release, secret e pastas temporárias e registrar em `docs/deploy-log.md`. Em produção o importador recusa a transferência inteira se houver conflito (nunca sobrescreve em silêncio); reconciliação é por identidade (slug), e produto novo nasce "em preparação".
- **Ação combinada para o fim do cadastro dos produtos (pedido do usuário, 2026-09-25):** quando o usuário disser **"terminei todos os produtos"**, antes/junto do envio final ao servidor, **apagar o produto de teste "[TESTE LOCAL] Serviço Demo do Catálogo"** (nome comercial "Peça de Comunicação para Redes Sociais", nº 37 no local) e qualquer outro `[TESTE LOCAL]`, no local **e** no servidor, deixando só os produtos reais. Cuidado: cotações, itens de pedido e projetos criados com ele (`catalog2_quotes`, `project_products`, `catalog2_change_orders` têm FK RESTRICT para o produto) precisam ser removidos antes, junto com os pagamentos/faturas desses testes; fazer backup, simulação (contagens) e confirmação explícita antes de apagar. Conferir no servidor o que existe de teste (lá há 38 produtos contra 37 no local).
- **Catálogo global de modelos ("Tarefa #ID" / "Etapa #ID", 2026-09-29):** cada tarefa/etapa de produto aponta para um modelo global com número permanente (tabelas `catalog2_task_models`/`catalog2_step_models`). Os números do LOCAL são a referência: o pacote de produtos leva os modelos com o mesmo ID e o importador cria/vincula no servidor com o mesmo número (se o ID já existir lá com outro nome, não sobrescreve e avisa). **Por isso, no primeiro deploy que traz esse catálogo, o servidor NÃO numera sozinho em produção** (`shouldBackfillModelsOnBoot`): rode "sobe os produtos" primeiro; depois disso a numeração automática passa a completar o que faltar. Em produção o modelo padrão "Validação e organização dos acessos" também chega pelo pacote (fora de produção é criado no boot). Exceção: `CATALOG2_MODELS_BACKFILL=true` força a numeração automática no boot. Modelos nunca são apagados, só inativados. Testes: `npm run test:catalog2-task-models` e `project-task-qualification.integration.test.ts` (bancos descartáveis, nunca o real).
- **Produtos recorrentes, continuidade, ativos e pacotes (Pedido 2, 2026-09-29):** valem para qualquer produto. **Atualizado em 16/10:** as modalidades por versão são só **Avulso** (um ciclo, sem renovação) e **Assinatura mensal**; a **implantação** vem das etapas marcadas `first_execution_only` ("Só na primeira execução": primeira cobrança + 1º ciclo do produto no projeto, nunca na renovação — `lib/catalog2-pricing.ts`, `lib/catalog2-cycles.ts`); "só em pacote" é `block_standalone_sale` do **pacote** (Pacotes e Dependências), não campo do produto; os campos `has_initial_implementation`, `implementation_rule`, `implementation_blocks_operation`, `sell_mode`, `sale_modes_enforced` e, por tarefa, `cycle_type`/`repeat_rule` são **legado** (sem tela, sem efeito em produto individual, não bloqueiam publicação). Por tarefa continuam `executor_continuity` (não permitida/permitida/recomendada/obrigatória) e `asset_rule` (revalidação dos acessos), agora com `continuity_accept_hours`, `continuity_if_unavailable`, `continuity_after_deadline` e `reuse_connections_same_project` (cartão "Continuidade do executor" no Passo 2). A geração de tarefas por ciclo está em `lib/catalog2-cycles.ts` (+ `generate-tasks-catalog2.ts`); continuidade em `lib/catalog2-continuity.ts`; ativos do cliente em `lib/client-assets.ts` (**NUNCA guarda senha** — `rejectSecrets`); pacotes/dependências em `lib/project-dependencies.ts`; estado do fluxo em `lib/task-flow-state.ts`; decisões em `project_decision_logs`. Worker `dependency-scheduler` (a cada 5 min) libera/avança tarefas e avisa o líder de dependência atrasada (`DEPENDENCY_SCHEDULER_INTERVAL_MS`, `DEPENDENCY_DELAY_ALERT_HOURS`). A cobrança recorrente por ciclo já existia (`releaseCatalog2DeliveryCycle`) e foi reaproveitada. Testes: `npm run test:catalog2-recurrence` (roda uma suíte por vez — as suítes de banco NÃO podem rodar em paralelo no mesmo banco descartável).
- **Zerar/limpar dados do servidor:** operação destrutiva e irreversível. Exige backup do banco do servidor, ensaio numa cópia, mostrar as contagens ao usuário e confirmação explícita naquele momento.

### Contas de teste e preferências do usuário
- 16 usuários (12 reais do time + 4 fake: `company@`, `company2@`, `agency@`, `partner@allka.com.vc`), senha `123456` (decisão do usuário, vale também no servidor). Empresas/agências fake têm prefixo `[TESTE]`.
- O usuário não é técnico: ao fechar cada tarefa, dar resumo curto em linguagem leiga (o que foi feito / deu certo / não deu certo / o que preciso dele).
- Erros mostrados ao usuário sempre com o motivo exato, em português. Uma tela/componente compartilhado para todos os portais (muda só permissão/dado). Ações irreversíveis: confirmar antes.

---

## Documentação detalhada

A documentação técnica completa está em [`/docs`](./docs):

**Comece por aqui (produtos):**

| Documento                                                                          | Conteúdo                                                                                                   |
| ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| [cadastro-produto-passo-a-passo.md](./docs/cadastro-produto-passo-a-passo.md)      | **O cadastro de produto item por item** (5 passos, todos os campos, glossário, o que bloqueia publicar, ficha modelo) |
| [prompt-codex-cadastro-produto.md](./docs/prompt-codex-cadastro-produto.md)        | Prompt pronto para o Codex/ChatGPT ler a plataforma e montar a ficha de um produto novo                    |
| [Registro de Continuidade](./documentos/Registro%20de%20Continuidade%20Produtos%20Allka.md) | Decisões do usuário, situação (farol) de cada item, o que falta (gerado de `documentos/registro-continuidade.json`) |
| [deploy-log.md](./docs/deploy-log.md)                                              | O que subiu em cada deploy/espelho e o que está **pendente de deploy**                                     |
| [relatorio-pedido3-cadastro-universal.md](./docs/relatorio-pedido3-cadastro-universal.md) · [relatorio-estrutura-universal-v2.md](./docs/relatorio-estrutura-universal-v2.md) · [relatorio-36-produtos-catalogo2.md](./docs/relatorio-36-produtos-catalogo2.md) | Relatórios técnicos do cadastro universal e dos 36 produtos |

**Documentação técnica geral:**

| Documento                                                       | Conteúdo                                                                           |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| [arquitetura.md](./docs/arquitetura.md)                         | Camadas, estrutura de pastas, fluxo frontend↔backend↔banco, onde editar cada parte |
| [deploy-hostinger-kvm.md](./docs/deploy-hostinger-kvm.md)         | Deploy containerizado no Hostinger KVM via GitHub Actions, GHCR, MySQL e Caddy      |
| [banco.md](./docs/banco.md)                                     | Prisma, schema, migrations, seeds, diferença local vs produção, cuidados           |
| [produtos.md](./docs/produtos.md)                               | **Legado** (modelo antigo de produto pai/variações). O cadastro atual está em `cadastro-produto-passo-a-passo.md` |
| [telas-e-funcionalidades.md](./docs/telas-e-funcionalidades.md) | Mapa das páginas de cada portal + onde editar cada uma                             |
| [ui-e-padroes.md](./docs/ui-e-padroes.md)                       | Padrões visuais, drawers laterais, tema, componentes reutilizáveis                 |
| [padroes-globais.md](./docs/padroes-globais.md)                  | **Padrões globais com nome** (ex.: **Painel Moldura**): o que são, onde estão e como pedir |
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
5. **Produtos** (módulo `catalog2`): um produto individual tem uma tarefa principal, dividida em etapas; as variações só somam o que é **extra** ao produto original (a opção padrão não tem custo nem horas) — ver [docs/cadastro-produto-passo-a-passo.md](./docs/cadastro-produto-passo-a-passo.md). O modelo antigo está em [docs/produtos.md](./docs/produtos.md) (legado).
6. **Sempre testar em `mock` e `dev`** antes de subir.
7. **Backup do banco** antes de qualquer migration em produção.
8. **`.env` nunca vai pro git**. Use os `.env.example` como template.
9. **Desativar em vez de deletar** (preserva histórico).
10. **Sem SSR** — é SPA pura, servida pelo Nginx do container (fallback de rota para `index.html`).
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
├── docs/             ← documentação técnica detalhada (comece por cadastro-produto-passo-a-passo.md)
├── documentos/       ← Registro de Continuidade (.json fonte, .md e .docx gerados) para Claude/ChatGPT/Codex
├── entregas/         ← fichas e entregas geradas (ex.: entregas/produtos/<produto>/ficha-cadastro.md)
├── backups/          ← backups locais de dados (ignorado pelo Git de propósito)
├── package.json      ← orquestração npm workspaces
└── docker-compose.yml
```

---

## Licença

Privado — Allka by Lamego.
