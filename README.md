# ALLKA 2026 — Plataforma

> Plataforma de gestão para empresas, nômades digitais, agências e parceiros.
> React 18 + Vite 7 + TypeScript 5 + Tailwind CSS 4 | Backend: Express 5 + Prisma + SQLite/PostgreSQL

---

## Modos de Desenvolvimento

A plataforma opera em **três modos** independentes, separados por arquivos `.env.*` e flags Vite:

| Comando           | Modo        | Backend necessário? | Dados              |
|-------------------|-------------|---------------------|--------------------|
| `npm run dev:mock`| mock        | ❌ Não              | Mock em memória    |
| `npm run dev`     | development | ✅ Sim (porta 3001) | Banco local (SQLite)|
| `npm run build`   | production  | ✅ Sim (cPanel API) | Banco PostgreSQL    |

### Como funciona a troca de modo

Vite carrega o arquivo `.env.<mode>` correspondente:

- `.env.mock` → `VITE_USE_MOCKS=true` — nenhuma chamada real é feita
- `.env.development` → `VITE_USE_MOCKS=false` + `VITE_API_URL=http://localhost:3001/api`
- `.env.production` → `VITE_USE_MOCKS=false` + `VITE_API_URL=https://api-dev.allka.com.vc/api`

O `lib/api-client-factory.ts` verifica `import.meta.env.VITE_USE_MOCKS` e retorna o cliente correto.
**Mocks nunca entram no bundle de produção** — Vite faz tree-shaking automático.

---

## Setup Local — Passo a Passo

### 1. Frontend

```bash
# Instalar dependências
npm install

# Rodar com dados mock (não precisa de backend)
npm run dev:mock

# Rodar com backend local (precisa do passo 2 primeiro)
npm run dev
```

### 2. Backend (opcional — apenas para modo `dev`)

```bash
cd backend
npm install

# Criar banco e rodar migrações
npx prisma db push

# Popular banco com dados de exemplo
npx tsx prisma/seed.ts

# Iniciar servidor (porta 3001)
npm run dev
```

O backend usa o arquivo `backend/.env` (gitignored). Um arquivo `backend/.env.example` serve de template.

---

## Credenciais de Teste

| E-mail                  | Senha      | Perfil         |
|-------------------------|------------|----------------|
| admin@allka.com         | admin123   | Admin          |
| empresa@allka.com       | empresa123 | Empresa        |
| nomade@allka.com        | nomade123  | Nômade         |
| agencia@allka.com       | agencia123 | Agência        |
| parceiro@allka.com      | parceiro123| Parceiro       |

> No modo mock, qualquer e-mail/senha faz login como **admin** (mock sempre retorna o mesmo usuário).

---

## Fluxo Tela a Tela

O desenvolvimento segue um processo de validação progressiva:

```
1. dev:mock  →  valida UI, dados, fluxos localmente
2. dev       →  valida integração real com o backend local
3. build     →  deploy no cPanel com API de produção
```

**Regra**: uma tela só vai para cPanel depois de estar **aprovada nos dois modos locais**.

---

## Estrutura de Pastas

```
/app              — Páginas por tipo de usuário (admin, empresa, nomades, agencia, parceiro)
/components       — Componentes reutilizáveis compartilhados
/contexts         — Contextos React (estado global)
/hooks            — Hooks customizados (chamadas de API, utilitários)
/lib              — Clientes de API, utilitários
/dev-mocks        — Dados e cliente mock (gitignored, apenas dev)
  /data           — Arrays de dados simulados por módulo
  mock-api-client.ts — Cliente mock com mesma interface da API real
/backend          — API Express + Prisma
  /src            — Rotas, controllers, middlewares
  /prisma         — Schema, seed, migrações
```

---

## Stack Técnica

**Frontend**
- React 18 + TypeScript 5
- Vite 7 (build tool)
- Tailwind CSS 4
- React Router v6
- shadcn/ui + Radix UI
- Context API (estado global)
- TipTap (editor rich text)

**Backend**
- Express 5
- Prisma ORM
- SQLite (dev) / PostgreSQL (prod)
- JWT (autenticação)
- Node.js 20+

---

## Deploy (cPanel)

```bash
# 1. Build de produção
npm run build

# 2. Enviar a pasta /dist para o cPanel via FTP ou Git
# 3. Configurar rewrite para SPA (nginx/htaccess)
```

A variável `VITE_API_URL` em `.env.production` aponta para `https://api-dev.allka.com.vc/api`.

---

## Arquivos de Ambiente

| Arquivo                | Finalidade                            | Commitado? |
|------------------------|---------------------------------------|------------|
| `.env.mock`            | Modo mock local                       | ✅ Sim     |
| `.env.development`     | Modo dev com backend local            | ✅ Sim     |
| `.env.production`      | Modo build/cPanel                     | ✅ Sim     |
| `.env.example`         | Template documentado                  | ✅ Sim     |
| `backend/.env`         | Credenciais do backend local          | ❌ Não     |
| `dev-mocks/`           | Toda a pasta de mocks                 | ❌ Não     |

---

## Sobre

## Portais da Plataforma

A plataforma conta com **5 tipos de usuário**, cada um com seu portal dedicado. Todos compartilham o mesmo layout (sidebar, header, footer) com o tema configurável pelo admin.

| Portal | Rota base | Descrição |
|--------|-----------|-----------|
| Admin | `/admin/*` | Painel completo — gestão de toda a plataforma |
| Nômade | `/nomades/*` | Freelancers — tarefas, ganhos, habilitações |
| Empresa | `/empresa/*` | Clientes — projetos, tarefas, faturas |
| Agência | `/agencia/*` | Agências parceiras — clientes, projetos, financeiro |
| Parceiro | `/parceiro/*` | Parceiros de indicação — comissões, agências, saques |

### Rota inicial
```
/  →  /admin/dashboard
```

---

## Rotas Ativas

### Admin (34 rotas)

| Rota | Descrição |
|------|-----------|
| `/admin/dashboard` | Painel principal |
| `/admin/dashboard-config` | Configuração do dashboard |
| `/admin/usuarios` | Gestão de usuários |
| `/admin/usuarios-internos` | Usuários internos |
| `/admin/users` | Users (EN) |
| `/admin/empresas` | Gestão de empresas |
| `/admin/nomades` | Gestão de nômades |
| `/admin/projetos` | Gestão de projetos |
| `/admin/produtos` | Gestão de produtos |
| `/admin/precificacao` | Precificação |
| `/admin/niveis` | Níveis agências |
| `/admin/niveis-nomades` | Níveis nômades |
| `/admin/programa-partner` | Programa de parceiros |
| `/admin/especialidades` | Especialidades |
| `/admin/allkademy` | Allkademy |
| `/admin/financeiro` | Financeiro |
| `/admin/relatorios` | Relatórios |
| `/admin/disponibilidade` | Disponibilidade |
| `/admin/comissionamentos` | Comissionamentos |
| `/admin/commissions` | Commissions (EN) |
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
| `/admin/alertas` | Alertas do sistema |

### Nômades (8 rotas)

| Rota | Descrição |
|------|-----------|
| `/nomades/dashboard` | Painel do nômade |
| `/nomades/tarefasdisponiveis` | Tarefas disponíveis |
| `/nomades/minhastarefas` | Minhas tarefas |
| `/nomades/habilitacoes` | Habilitações |
| `/nomades/historico` | Histórico |
| `/nomades/programa` | Programa de pontos |
| `/nomades/ganhos` | Ganhos |
| `/nomades/perfil` | Perfil |

### Empresa (4 rotas)

| Rota | Descrição |
|------|-----------|
| `/empresa/dashboard` | Painel da empresa |
| `/empresa/projetos` | Projetos contratados |
| `/empresa/tarefas` | Tarefas dos projetos |
| `/empresa/faturas` | Faturas e pagamentos |

### Agência (4 rotas)

| Rota | Descrição |
|------|-----------|
| `/agencia/dashboard` | Painel da agência |
| `/agencia/projetos` | Projetos dos clientes |
| `/agencia/tarefas` | Tarefas em andamento |
| `/agencia/financeiro` | Financeiro e MRR |

### Parceiro (5 rotas)

| Rota | Descrição |
|------|-----------|
| `/parceiro/dashboard` | Painel do parceiro |
| `/parceiro/agencias` | Agências lideradas |
| `/parceiro/projetos` | Projetos indicados |
| `/parceiro/comissoes` | Extrato de comissões |
| `/parceiro/saques` | Solicitações de saque |

---

## Arquitetura

```
App.tsx                        → Router raiz + AccountTypeProvider
main.tsx                       → Entry point (BrowserRouter)
index.html                     → HTML base

app/
  admin/                       → 31 páginas do admin (page.tsx por rota)
  nomades/                     → 8 páginas do portal nômade
  empresa/                     → 4 páginas do portal empresa
  agencia/                     → 4 páginas do portal agência
  parceiro/                    → 5 páginas do portal parceiro
  globals.css                  → Estilos globais (Tailwind)

components/
  header.tsx                   → Header contextual por tipo de usuário
  sidebar.tsx                  → Sidebar com temas e nav por portal
  footer.tsx                   → Rodapé
  dev-role-switcher.tsx        → Switcher de portal para preview (dev)
  mobile-*.tsx                 → Componentes de layout mobile
  page-header.tsx              → Header interno de páginas
  data-table.tsx               → Tabela de dados reutilizável
  *-slide-panel.tsx            → Painéis laterais (companies, users, projects)
  *-modal.tsx / *-dialog.tsx   → Diálogos
  admin/                       → Componentes exclusivos do admin
  modals/                      → sidebar-settings-modal
  address/                     → address-map-picker
  ui/                          → 30+ componentes shadcn/ui

contexts/
  account-type-context.tsx     → AccountType + setAccountType (admin/nomades/empresas/agencias/parceiro)
  sidebar-context.tsx          → Temas, userProfile, agencyProfile
  company-context.tsx          → Dados de empresas
  partner-context.tsx          → Perfil, comissões, saques, agências lideradas
  empresa-context.tsx          → Perfil, projetos, tarefas, faturas (empresa)
  agencia-context.tsx          → Perfil, projetos, tarefas, faturas (agência)
  settings-context.tsx         → Configurações globais
  platform-users-context.tsx   → Usuários da plataforma
  chat-context.tsx             → Chat em tempo real

lib/
  contexts/                    → specialty-context, pricing-context, product-context
  api.ts / api-client.ts       → Cliente HTTP base
  pricing-engine.ts            → Motor de precificação
  user-permissions.ts          → Sistema de permissões
  utils.ts                     → Helpers gerais

types/                         → Definições de tipos TypeScript
hooks/                         → use-pricing, use-toast, useAutoGeocode
constants/                     → tax-rates
public/                        → Assets (logos, ícones, imagens)
```

---

## Funcionalidades Implementadas

### Sistema de Portais
- Todos os portais compartilham o **mesmo header, sidebar e footer** do admin
- O `AccountType` controla qual navegação aparece na sidebar
- Troca de tipo de usuário via `setAccountType()` — atualiza header + nav instantaneamente
- **Dev Role Switcher** — botão flutuante (canto inferior esquerdo) para trocar portal em preview

### Header Contextual
O header exibe informações específicas do portal ativo:
- **Nome real** do usuário (da context do portal)
- **Tipo e cor** por portal (rose=admin, amber=nômade, violet=empresa, indigo=agência, blue=parceiro)
- **Stat pill** — métrica rápida (pontos, projetos ativos, MRR, total ganho)
- **Wallet pill** — saldo/valor monetário clicável
- **Dropdown** com links de navegação, configurações e sair

### Sidebar com Temas
- Temas salvos por usuário no `localStorage`
- Suporte a gradientes customizados, imagens de fundo, overlay
- Largura redimensionável via drag
- Reordenação de itens via drag-and-drop
- Collapse/expand com animação

### Programa de Parceiros (5 níveis)
- Bronze → Prata → Ouro → Platina → Diamante
- Badge de nível no header quando logado como parceiro
- Extrato de comissões, saques PIX, agências lideradas

### Gestão Admin Completa
- CRUD de empresas, usuários, projetos, produtos
- Precificação dinâmica com motor de cálculo
- Programa de níveis para agências e nômades
- Gestão de permissões por perfil
- Relatórios, financeiro, comissionamentos
- Sistema de alertas, onboarding, disponibilidade

---

## Dev Tools

### Dev Role Switcher
Botão flutuante no **canto inferior esquerdo** para trocar de portal durante desenvolvimento:

| Ícone | Portal | Accounttype |
|-------|--------|-------------|
| 🛡️ | Administrador | admin |
| 🧭 | Nômade | nomades |
| 🏢 | Empresa | empresas |
| 💼 | Agência | agencias |
| 🤝 | Parceiro | parceiro |

---

## Comandos

```bash
npm run dev        # Dev server (porta 8080)
npm run build      # Build de produção
npm run preview    # Preview do build
npm run lint       # Linter
```

---

## Stack

| Tecnologia | Versão | Uso |
|------------|--------|-----|
| React | 19 | UI |
| Vite | 7 | Build tool |
| TypeScript | 5.9 | Linguagem |
| Tailwind CSS | 4 | Estilização |
| React Router | 6 | Roteamento |
| shadcn/ui | latest | Componentes base |
| Lucide React | latest | Ícones |
| Radix UI | latest | Primitivos acessíveis |

### Tailwind v4 — diferenças importantes
```
bg-linear-to-br   (não bg-gradient-to-br)
z-9999            (não z-[9999])
max-w-27.5        (não max-w-[110px])
shrink-0          (não flex-shrink-0)
```

---

## LGPD & Privacidade (Lei 13.709/2018)

### Cookie Consent Banner
- Componente: `components/cookie-consent-banner.tsx`
- Chave localStorage: `allka_cookie_consent`
- 4 categorias: Necessários (obrigatório), Analíticos, Funcionais, Marketing
- Aparece na primeira visita

### Term Acceptance Gate
- Componente: `components/term-acceptance-gate.tsx`
- Bloqueia a UI até aceite de todos os termos obrigatórios
- Chave localStorage: `allka_terms_demo_accepted_v1`

---

## ARQUIVOS_NAO_USADOS_NO_MOMENTO

Pasta com módulos ainda não ativados. Nenhum arquivo foi deletado — apenas movido para manter o dev server rápido.

Para reintegrar um módulo:
1. Mover os arquivos de volta para `app/` ou `components/`
2. Adicionar lazy import e `<Route>` no `App.tsx`
3. Adicionar navegação em `components/sidebar.tsx` no `navigationConfig`
4. Testar e commitar
