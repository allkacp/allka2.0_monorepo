# Telas e Funcionalidades

Mapa das principais áreas do sistema. Para cada uma: o que faz, onde editar, componentes envolvidos.

> Cada portal tem uma rota base (`/admin`, `/empresa`, `/agencia`, `/parceiro`, `/nomades`) e dentro dela várias páginas. Cada página é uma pasta com `page.tsx`.

---

## Portal Admin (`/admin`)

### Dashboard — `/admin/dashboard`

- **Função**: visão geral da plataforma — KPIs, gráficos, atividade recente
- **Editar em**: `apps/frontend/app/admin/dashboard/page.tsx`
- **Componentes**: `recharts`, cards de métrica, `data-table`

### Configuração do Dashboard — `/admin/dashboard-config`

- Permite ao admin escolher quais widgets aparecem
- `apps/frontend/app/admin/dashboard-config/page.tsx`

### Empresas — `/admin/empresas`

- CRUD de empresas clientes
- Filtros, status, logs, tarefas, projetos por empresa
- **Editar em**: `apps/frontend/app/admin/empresas/page.tsx`
- **Componentes**: `company-create-slide-panel`, `company-edit-slide-panel`, `company-view-slide-panel`, `company-logs-tab`, `company-tasks-tab`, `company-users-tab`, `projects-management-tab`, `terms-management-tab`

### Usuários — `/admin/usuarios` e `/admin/usuarios-internos`

- Gestão de todas as contas (qualquer perfil) e usuários internos da operação
- **Editar em**: `apps/frontend/app/admin/usuarios/page.tsx`, `apps/frontend/app/admin/usuarios-internos/page.tsx`
- **Componentes**: `user-create-slide-panel`, `user-view-slide-panel`, `user-view-header`, `permission-profile-slide-panel`

### Permissões — `/admin/permissoes`

- Perfis de admin e permissões granulares (qual admin pode ver/editar quê)
- **Editar em**: `apps/frontend/app/admin/permissoes/page.tsx`
- **Backend**: `apps/backend/src/routes/permissions.ts`, modelos `AdminProfile` + `AdminPermission`
- **Lógica frontend**: `apps/frontend/lib/user-permissions.ts`

### Produtos — `/admin/produtos`

- CRUD de produtos do catálogo (definição comercial)
- **Editar em**: `apps/frontend/app/admin/produtos/page.tsx`
- **Domínio detalhado**: ver [produtos.md](./produtos.md)

### Catálogo de Produtos — `/admin/catalogo-produtos`

- Visualização semelhante à do cliente — facilita curadoria e teste do drawer de detalhe
- **Componente principal**: `apps/frontend/components/product-catalog-view.tsx`
- **Drawer de detalhe**: `apps/frontend/components/product-detail-sheet.tsx`

### Precificação — `/admin/precificacao`

- Tabela de preços, margens, impostos, comissões
- **Editar em**: `apps/frontend/app/admin/precificacao/page.tsx`
- **Engine**: `apps/frontend/lib/pricing-engine.ts`
- **Contexto**: `apps/frontend/lib/contexts/pricing-context.tsx`
- **Constantes**: `constants/tax-rates.ts`

### Projetos — `/admin/projetos`

- Lista de todos os projetos ativos da plataforma com filtros
- **Editar em**: `apps/frontend/app/admin/projetos/page.tsx`
- **Componentes**: `project-create-slide-panel`, `project-view-slide-panel`, `project-wizard-slide-panel`, `project-management-modal`, `project-type-breakdown`

### Nômades — `/admin/nomades`

- Gestão de freelancers: cadastro, qualificações, histórico
- **Editar em**: `apps/frontend/app/admin/nomades/page.tsx`
- **Backend**: `apps/backend/src/routes/nomades.ts`

### Níveis e Programas — `/admin/niveis`, `/admin/niveis-nomades`, `/admin/programa-partner`

- Configuração de níveis (gamificação) e do programa de parceiros
- `apps/frontend/app/admin/niveis/page.tsx`, `apps/frontend/app/admin/niveis-nomades/page.tsx`, `apps/frontend/app/admin/programa-partner/page.tsx`

### Especialidades — `/admin/especialidades`

- Lista de especialidades (skills) que nômades podem ter
- **Editar em**: `apps/frontend/app/admin/especialidades/page.tsx`
- **Backend**: `apps/backend/src/routes/specialties.ts`
- **Contexto**: `apps/frontend/lib/contexts/specialty-context.tsx`

### Allkademy — `/admin/allkademy`

- Trilhas de cursos e habilitações
- **Editar em**: `apps/frontend/app/admin/allkademy/page.tsx`
- **Backend**: `apps/backend/src/routes/allkademy.ts` — modelos `Course`, `CourseModule`, `Lesson`, `CourseEnrollment`

### Financeiro / Comissionamentos — `/admin/financeiro`, `/admin/comissionamentos`

- Faturas, transações, comissões pagas/pendentes
- **Editar em**: `apps/frontend/app/admin/financeiro/page.tsx`, `apps/frontend/app/admin/comissionamentos/page.tsx`
- **Backend**: `apps/backend/src/routes/financial.ts`, `billing.ts`

### Relatórios — `/admin/relatorios`

- Relatórios consolidados (export PDF/Excel)
- **Editar em**: `apps/frontend/app/admin/relatorios/page.tsx`
- **Componentes**: `export-button`, `proposal-pdf-renderer`

### Disponibilidade — `/admin/disponibilidade`

- Disponibilidade de nômades para alocação automática (matchmaking)
- **Editar em**: `apps/frontend/app/admin/disponibilidade/page.tsx`
- **Modelo**: `MatchQueueEntry`

### Campanhas de Indicação — `/admin/campanhas-indicacao`

- Campanhas para captação via parceiros
- **Editar em**: `apps/frontend/app/admin/campanhas-indicacao/page.tsx`
- **Backend**: `apps/backend/src/routes/campaigns.ts`

### Onboarding — `/admin/onboarding`

- Fluxo de boas-vindas para novos clientes/parceiros
- `apps/frontend/app/admin/onboarding/page.tsx`

### Termos — `/admin/terms`

- Versionamento de termos de uso e contratos
- **Editar em**: `apps/frontend/app/admin/terms/page.tsx`
- **Backend**: `apps/backend/src/routes/terms.ts` — modelos `Term`, `TermAcceptance`
- **Componente**: `term-acceptance-gate`

### Notificações — `/admin/notifications`

- Centro de notificações da plataforma
- `apps/frontend/app/admin/notifications/page.tsx`
- **Componente**: `notification-preferences-panel`, `alerts-header-icon`

### Clientes — `/admin/clientes`

- Visão pessoa-física dos clientes (B2C-ish)
- `apps/frontend/app/admin/clientes/page.tsx`
- **Componente**: `client-create-slide-panel`

### Configurações / Sistema / Alertas — `/admin/configuracoes`, `/admin/sistema`, `/admin/alertas`

- Settings globais, status do sistema, alertas operacionais
- `apps/frontend/app/admin/configuracoes/page.tsx`, `apps/frontend/app/admin/sistema/page.tsx`, `apps/frontend/app/admin/alertas/page.tsx`
- **Contexto**: `apps/frontend/contexts/settings-context.tsx`

---

## Portal Nômade (`/nomades`)

| Rota                          | O que faz                                         | Editar em                                 |
| ----------------------------- | ------------------------------------------------- | ----------------------------------------- |
| `/nomades/dashboard`          | Painel com tarefas, ganhos, próximos compromissos | `apps/frontend/app/nomades/dashboard/page.tsx`          |
| `/nomades/tarefasdisponiveis` | Marketplace de tarefas                            | `apps/frontend/app/nomades/tarefasdisponiveis/page.tsx` |
| `/nomades/minhastarefas`      | Tarefas em execução                               | `apps/frontend/app/nomades/minhastarefas/page.tsx`      |
| `/nomades/habilitacoes`       | Testes e qualificações                            | `apps/frontend/app/nomades/habilitacoes/page.tsx`       |
| `/nomades/historico`          | Tarefas passadas                                  | `apps/frontend/app/nomades/historico/page.tsx`          |
| `/nomades/programa`           | Programa de pontos / níveis                       | `apps/frontend/app/nomades/programa/page.tsx`           |
| `/nomades/ganhos`             | Carteira, saques                                  | `apps/frontend/app/nomades/ganhos/page.tsx`             |
| `/nomades/perfil`             | Edição de perfil, especialidades                  | `apps/frontend/app/nomades/perfil/page.tsx`             |

---

## Portal Empresa (`/empresa`)

| Rota                 | O que faz            | Editar em                        |
| -------------------- | -------------------- | -------------------------------- |
| `/empresa/dashboard` | Painel da empresa    | `apps/frontend/app/empresa/dashboard/page.tsx` |
| `/empresa/projetos`  | Projetos contratados | `apps/frontend/app/empresa/projetos/page.tsx`  |
| `/empresa/tarefas`   | Tarefas em andamento | `apps/frontend/app/empresa/tarefas/page.tsx`   |
| `/empresa/faturas`   | Faturas e pagamentos | `apps/frontend/app/empresa/faturas/page.tsx`   |

**Contexto**: `apps/frontend/contexts/empresa-context.tsx`

---

## Portal Agência (`/agencia`)

| Rota                  | O que faz                        | Editar em                         |
| --------------------- | -------------------------------- | --------------------------------- |
| `/agencia/dashboard`  | Painel                           | `apps/frontend/app/agencia/dashboard/page.tsx`  |
| `/agencia/projetos`   | Projetos dos clientes da agência | `apps/frontend/app/agencia/projetos/page.tsx`   |
| `/agencia/tarefas`    | Tarefas em andamento             | `apps/frontend/app/agencia/tarefas/page.tsx`    |
| `/agencia/financeiro` | MRR, faturamento                 | `apps/frontend/app/agencia/financeiro/page.tsx` |

**Contexto**: `apps/frontend/contexts/agencia-context.tsx`

---

## Portal Parceiro (`/parceiro`)

| Rota                  | O que faz             | Editar em                         |
| --------------------- | --------------------- | --------------------------------- |
| `/parceiro/dashboard` | Painel                | `apps/frontend/app/parceiro/dashboard/page.tsx` |
| `/parceiro/agencias`  | Agências lideradas    | `apps/frontend/app/parceiro/agencias/page.tsx`  |
| `/parceiro/projetos`  | Projetos indicados    | `apps/frontend/app/parceiro/projetos/page.tsx`  |
| `/parceiro/comissoes` | Extrato de comissões  | `apps/frontend/app/parceiro/comissoes/page.tsx` |
| `/parceiro/saques`    | Solicitações de saque | `apps/frontend/app/parceiro/saques/page.tsx`    |

**Contexto**: `apps/frontend/contexts/partner-context.tsx`

---

## Componentes globais (presentes em todos os portais)

| Componente          | Função                          | Arquivo                                |
| ------------------- | ------------------------------- | -------------------------------------- |
| Header              | Cabeçalho contextual por portal | `apps/frontend/components/header.tsx`                |
| Sidebar             | Menu lateral com tema dinâmico  | `apps/frontend/components/sidebar.tsx`               |
| Footer              | Rodapé                          | `apps/frontend/components/footer.tsx`                |
| Mobile Bottom Nav   | Navegação inferior em mobile    | `apps/frontend/components/mobile-bottom-nav.tsx`     |
| Page Header         | Cabeçalho de página interna     | `apps/frontend/components/page-header.tsx`           |
| Data Table          | Tabela paginada genérica        | `apps/frontend/components/data-table.tsx`            |
| Pagination Controls | Paginação                       | `apps/frontend/components/pagination-controls.tsx`   |
| Items Per Page      | Selector de quantos por página  | `apps/frontend/components/items-per-page-select.tsx` |
| Confirmation Dialog | Modal de confirmação            | `apps/frontend/components/confirmation-dialog.tsx`   |
| Cookie Banner       | LGPD                            | `apps/frontend/components/cookie-consent-banner.tsx` |
| Chat Widget         | Chat flutuante                  | `apps/frontend/components/chat-widget.tsx`           |
| Dev Role Switcher   | Trocar portal em preview (dev)  | `apps/frontend/components/dev-role-switcher.tsx`     |

---

## Cuidados ao mexer em telas

- **Não duplicar lógica**. Se outra tela já tem componente equivalente (slide-panel, tabela, modal), reusar.
- **Manter o tema**. Cores, gradientes, paddings devem usar variáveis CSS (ver [ui-e-padroes.md](./ui-e-padroes.md)).
- **Sempre testar nos modos `mock` E `dev`** antes de subir.
- **Telas que usam contexto** precisam estar dentro do provider correto (ver `App.tsx`).
- **Mobile-first**: todas as telas devem ser usáveis em telas pequenas (`mobile-layout-wrapper.tsx`).
