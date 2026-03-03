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

---

## LGPD & Privacidade (Lei 13.709/2018)

A plataforma implementa adequação completa à LGPD com os seguintes componentes:

### Cookie Consent Banner
- Componente: `components/cookie-consent-banner.tsx`
- Chave no `localStorage`: `allka_cookie_consent`
- 4 categorias: Necessários (bloqueado), Analíticos, Funcionais, Marketing
- Ações: Aceitar todos / Rejeitar não essenciais / Personalizar
- Aparece na primeira visita; desaparece após qualquer escolha

### Tipos LGPD (`types/user.ts`)
```ts
interface UserLGPD {
  consent_given: boolean
  consent_date: string
  consent_version: string
  legal_basis: "consent" | "contract" | "legitimate_interest" | "legal_obligation"
  data_retention_until: string
  communication_opt_in: boolean
  data_export_requested: boolean
  deletion_requested: boolean
  data_processing_purposes: string[]
  consent_history: { date: string; version: string; action: string }[]
}

interface CompanyLGPD {
  dpo_name: string
  dpo_email: string
  dpo_phone?: string
  privacy_policy_accepted: boolean
  policy_accepted_at: string
  policy_version: string
  data_processing_purposes: string[]
  security_incidents: { date: string; description: string; resolved: boolean }[]
}
```

### Aba LGPD — Usuário (`user-view-slide-panel.tsx`)
5ª aba "LGPD & Privacidade" no painel de detalhes do usuário:
- Status de consentimento com badge visual
- Base legal do tratamento (editável)
- Toggle de opt-in de comunicações
- Finalidades de tratamento
- Histórico de consentimento (timeline)
- Exportar dados (portabilidade — Art. 18, V) → gera JSON para download
- Solicitar exclusão de dados (Art. 18, VI)

### Fluxo de Cadastro — Consentimento (`user-create-slide-panel.tsx`)
Etapa 1 inclui:
- Select de base legal do tratamento (4 opções LGPD)
- Checkbox obrigatório: aceite da Política de Privacidade e Termos de Uso
- Validação: não avança para etapa 2 sem o aceite

### Aba LGPD — Empresa (`company-view-slide-panel.tsx`)
10ª aba "LGPD" no painel de detalhes da empresa:
- Configuração do DPO (nome, e-mail, telefone)
- Aceite de Política de Privacidade com versão e data
- Seleção de finalidades de tratamento de dados
- Registro e listagem de incidentes de segurança

### Badges visuais
- **`/admin/usuarios`**: coluna de tipo exibe "Sem consentimento LGPD" (laranja) e "Exclusão solicitada" (vermelho) para usuários com dados LGPD problemáticos
- **`/admin/empresas`**: coluna empresa exibe "Sem DPO" (laranja) e "Política pendente" (âmbar) para empresas sem configuração LGPD

### Mock Data
Usuários 2, 3, 7: `consent_given: false` → badge laranja  
Usuários 5, 9: `deletion_requested: true` → badge vermelho  
Usuários 1, 4, 6, 8, 10: consentimento completo com histórico  
Empresas 1, 3, 8, 10: DPO + política configurados  
Empresas 2, 4, 5, 6, 7, 9: sem configuração LGPD (badges aparecem na listagem)



## Stack

- **React 19** + TypeScript 5.9
- **Vite 7.3** (bundler/dev server)
- **Tailwind CSS 4.2** + shadcn/ui
- **React Router DOM 7** (client-side routing)
- **Recharts** (gráficos)
- **Radix UI** (componentes acessíveis)
