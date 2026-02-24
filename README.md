# ALLKA 2026 — Plataforma

## Sobre

Plataforma ALLKA em desenvolvimento modular com React 19, Vite 7, TypeScript 5.9 e Tailwind CSS 4.

## Status: Desenvolvimento por Módulos

O projeto está sendo desenvolvido **módulo por módulo**. Apenas o módulo ativo é mantido no código-fonte principal. Os demais ficam arquivados em `ARQUIVOS_NAO_USADOS_NO_MOMENTO/` até serem reintegrados.

---

## Módulo Atual: Admin

**Rota inicial:** `/admin/dashboard`

### Rotas Ativas (32 páginas)

| Rota | Descrição |
|------|-----------|
| `/admin/dashboard` | Painel principal |
| `/admin/dashboard-config` | Configuração do dashboard |
| `/admin/usuarios` | Gestão de usuários |
| `/admin/usuarios-internos` | Usuários internos |
| `/admin/users` | Users (EN) |
| `/admin/empresas` | Gestão de empresas |
| `/admin/nomades` | Gestão de nômades |
| `/admin/agencias` | Gestão de agências |
| `/admin/projetos` | Gestão de projetos |
| `/admin/produtos` | Gestão de produtos |
| `/admin/precificacao` | Precificação |
| `/admin/niveis` | Níveis |
| `/admin/niveis-nomades` | Níveis dos nômades |
| `/admin/levels` | Levels (EN) |
| `/admin/especialidades` | Especialidades |
| `/admin/allkademy` | Allkademy |
| `/admin/financeiro` | Financeiro |
| `/admin/relatorios` | Relatórios |
| `/admin/disponibilidade` | Disponibilidade |
| `/admin/comissionamentos` | Comissionamentos |
| `/admin/commissions` | Commissions (EN) |
| `/admin/promocoes` | Promoções |
| `/admin/campanhas-indicacao` | Campanhas de indicação |
| `/admin/onboarding` | Onboarding |
| `/admin/permissoes` | Permissões |
| `/admin/permissions` | Permissions (EN) |
| `/admin/terms` | Termos |
| `/admin/notifications` | Notificações |
| `/admin/clientes` | Clientes |
| `/admin/configuracoes` | Configurações |
| `/admin/configuracion` | Configuração (ES) |
| `/admin/sistema` | Sistema |

### Estrutura de Arquivos Ativos

```
App.tsx                      → Rotas e layout (admin-only)
main.tsx                     → Entry point (BrowserRouter)
index.html                   → HTML base

app/
  globals.css                → Estilos globais (Tailwind)
  admin/                     → 32 páginas admin (page.tsx + loading.tsx)

components/
  header.tsx                 → Cabeçalho
  sidebar.tsx                → Sidebar de navegação
  footer.tsx                 → Rodapé
  mobile-layout-wrapper.tsx  → Layout mobile
  mobile-bottom-nav.tsx      → Nav inferior mobile
  mobile-menu-sheet.tsx      → Menu lateral mobile
  mobile-horizontal-nav.tsx  → Nav horizontal mobile
  app-menu-drawer.tsx        → Drawer de menu
  horizontal-menu-bar.tsx    → Barra horizontal
  theme-provider.tsx         → Provider de tema
  page-header.tsx            → Header de página compartilhado
  confirmation-dialog.tsx    → Diálogo de confirmação
  pagination-controls.tsx    → Paginação
  items-per-page-select.tsx  → Seletor de itens por página
  advanced-date-filter.tsx   → Filtro avançado de datas
  data-table.tsx             → Tabela de dados
  notification-preferences-panel.tsx
  permission-profile-slide-panel.tsx
  user-create-slide-panel.tsx
  user-view-slide-panel.tsx
  user-view-header.tsx
  company-create-slide-panel.tsx
  company-edit-slide-panel.tsx
  company-view-slide-panel.tsx
  company-status-selector.tsx
  company-social-links-manager.tsx
  company-users-tab.tsx
  company-tasks-tab.tsx
  company-logs-tab.tsx
  terms-management-tab.tsx
  projects-management-tab.tsx
  project-create-slide-panel.tsx
  project-wizard-slide-panel.tsx
  project-type-breakdown.tsx
  project-management-modal.tsx
  checkout-flow.tsx
  product-selection-modal.tsx

  admin/                     → 12 modais/widgets do admin
  modals/                    → sidebar-settings-modal
  address/                   → address-map-picker
  ui/                        → 30 componentes shadcn/ui

contexts/                    → Contexts (settings, company, account-type, sidebar)
lib/contexts/                → Specialty, pricing, product contexts
hooks/                       → use-pricing, use-toast, useAutoGeocode
types/                       → Type definitions
constants/                   → tax-rates
scripts/                     → SQL schemas do banco de dados
public/                      → Assets (logos, ícones)
```

---

## ARQUIVOS_NAO_USADOS_NO_MOMENTO

Pasta que contém todos os arquivos de **módulos ainda não ativos**. Foram movidos para cá durante a reorganização por módulos para manter o projeto limpo e o dev server rápido.

### O que tem lá

- **Módulos de app/** — agencias, agency, allkademy, company, nomades, partner, projects, tasks, team, financial, pricing, premium-projects, catalog, clients, availability, match-queue, qualifications, reports, task-templates, in-house, landing, account
- **Componentes** — Componentes especializados de cada módulo (dashboards, modais, slidepanels, etc.)
- **Documentação** — docs/ com guias de implementação
- **Outros** — Scripts utilitários, estilos extras

### Por que foram movidos

1. **Performance** — Menos arquivos = Vite mais rápido, TypeScript mais leve, VS Code mais responsivo
2. **Foco** — Desenvolver um módulo por vez sem interferência
3. **Segurança** — Nenhum arquivo foi deletado, apenas movido

### Como reintegrar um módulo

Quando for hora de ativar um novo módulo (ex: `company`):

1. **Mover arquivos de volta:**
   ```powershell
   # Mover o módulo de app
   Move-Item "ARQUIVOS_NAO_USADOS_NO_MOMENTO\app\company" "app\company" -Force

   # Mover componentes necessários
   Move-Item "ARQUIVOS_NAO_USADOS_NO_MOMENTO\components\company-dashboard.tsx" "components\" -Force
   ```

2. **Adicionar rotas no `App.tsx`:**
   ```tsx
   const CompanyDashboard = React.lazy(() => import("@/app/company/dashboard/page"))
   // Adicionar <Route> dentro do AppLayout
   ```

3. **Verificar imports:** Rodar o dev server e corrigir qualquer import quebrado

4. **Testar e commitar**

---

## Comandos

```bash
npm run dev        # Dev server (porta 8080)
npm run build      # Build de produção
npm run preview    # Preview do build
```

## Stack

- **React 19** + TypeScript 5.9
- **Vite 7.3** (bundler/dev server)
- **Tailwind CSS 4.2** + shadcn/ui
- **React Router DOM 7** (client-side routing)
- **Recharts** (gráficos)
- **Radix UI** (componentes acessíveis)
