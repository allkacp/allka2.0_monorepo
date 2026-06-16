# Relatórios & Indicadores — Catálogo Técnico

Fonte canônica: [`apps/frontend/features/reports/constants/report-indicators.catalog.ts`](../../apps/frontend/features/reports/constants/report-indicators.catalog.ts)  
Tipos: [`apps/frontend/features/reports/types/indicator.types.ts`](../../apps/frontend/features/reports/types/indicator.types.ts)

---

## Resumo de Disponibilidade

| Grupo | Disponível | Parcial | Ausente |
|---|---|---|---|
| Indicadores KPI (Admin + perfis) | ~22 | ~30 | 4 |
| Relatórios Tabulares (Admin) | 2 | 3 | 1 |

> Contagens aproximadas incluindo variações de agency/partner/nomad/leader.

---

## Indicadores Admin — 33 KPIs

| # | Indicador | Disponibilidade | Modelos Prisma |
|---|---|---|---|
| 1 | Faturamento | **available** | Invoice |
| 2 | Carteira | **available** | Wallet, WalletLedger |
| 3 | MRR | **partial** | Invoice, Project |
| 4 | Avulsos | **partial** | Invoice, Project |
| 5 | Checkout do Cliente | **partial** | Project, Invoice, Company |
| 6 | Plano de Crédito | **available** | SquadConfig, SquadCycle |
| 7 | Novos MRR | **partial** | Project, Invoice |
| 8 | Novos Avulsos | **partial** | Project, Invoice |
| 9 | Churn de Projetos | **partial** | Project |
| 10 | Churn de Agências | **partial** | SquadConfig, Agency |
| 11 | Ticket Médio | **partial** | Invoice, Project, Agency |
| 12 | LTV | **partial** | Invoice, Project, Agency |
| 13 | CMV | **partial** | WalletTransaction, PartnerCommission, Invoice |
| 14 | Margem Bruta | **partial** | derivado de CMV + Faturamento |
| 15 | Projetos Ativos | **available** | Project |
| 16 | Projetos em Rascunho | **available** | Project |
| 17 | Projetos em Negociação | **available** | Project |
| 18 | Projetos Perdidos | **partial** | Project |
| 19 | Nômades | **available** | Nomade, NomadeLevel |
| 20 | Pontuação dos Nômades | **available** | Nomade |
| 21 | Tarefas Contratadas | **available** | ProjectTask |
| 22 | Tarefas Concluídas | **available** | ProjectTask |
| 23 | Tarefas Atrasadas | **partial** | ProjectTask |
| 24 | Pontuação de Tarefas | **available** | TaskExecution |
| 25 | Remuneração Nômade | **available** | WalletTransaction, Nomade |
| 26 | Remuneração Média | **available** | WalletTransaction, Nomade |
| 27 | Clientes Ativos | **available** | Agency, Project |
| 28 | Clientes — Outros Status | **available** | Agency |
| 29 | Atividade | **partial** | User, Agency |
| 30 | Inatividade | **available** | User, Agency |
| 31 | Tempo Médio de Uso | **missing** | — sem modelo de sessão |
| 32 | Leads | **missing** | — sem modelo Lead |
| 33 | Convertidos | **missing** | — sem modelo Lead |

---

## Relatórios Tabulares — 6 relatórios

| Relatório | Disponibilidade | Principais Modelos |
|---|---|---|
| Extrato Geral | **available** | WalletLedger, Wallet |
| Projetos | **partial** | Project, Invoice, PartnerProfile |
| Agências | **partial** | Agency, User, Project, Invoice |
| Leads | **missing** | — sem modelo Lead |
| Nômades | **partial** | Nomade, ProjectTask, WalletTransaction |
| Usabilidade | **missing** | — sem analytics de sessão |

---

## Gaps Críticos

### 1. `Project.agency` é string (não FK)

**Problema:** O campo `Project.agency` armazena o nome/identificador da agência como texto, não como FK para `Agency.id`.

**Impacto:**
- Todos os indicadores que cruzam projeto ↔ agência (MRR por agência, Ticket Médio, LTV, Checkout do Cliente) dependem de uma comparação textual frágil: `Project.agency = Agency.name`.
- Se o nome da agência mudar, os históricos ficam desvinculados.

**Solução recomendada:** Adicionar `Project.agency_id String?` (FK para `Agency.id`) e preencher via migration.

---

### 2. Modelo `Lead` inexistente

**Impacto:** Indicadores 32, 33 (Leads, Convertidos) e o relatório tabular de Leads são completamente inviáveis.

**Campos sugeridos para o modelo:**
```prisma
model Lead {
  id           String    @id @default(cuid())
  name         String
  email        String?
  phone        String?
  agency_id    String?
  agency       Agency?   @relation(fields: [agency_id], references: [id])
  status       String    @default("novo")  // novo | em_atendimento | proposta_enviada | negociacao | convertido | perdido
  source       String?
  value        Decimal?
  project_id   String?
  project      Project?  @relation(fields: [project_id], references: [id])
  created_at   DateTime  @default(now())
  converted_at DateTime?
  lost_at      DateTime?
  @@map("leads")
}
```

---

### 3. Analytics de Sessão ausente

**Impacto:** Indicadores de Atividade detalhada (MAU, DAU, Tempo Médio de Uso, Usabilidade por tela) são inviáveis.

Atualmente só existe `User.last_login` — suficiente para "inatividade > 90 dias" mas insuficiente para contagem de sessões.

**Opções:**
- Tabela `UserSession { id, user_id, started_at, ended_at }` (própria, offline-first)
- PostHog self-hosted ou Mixpanel (analytics externo)

---

### 4. Audit trail de status de projetos ausente

**Impacto:** Indicadores de churn (data real de cancelamento, diferença entre "perdido em negociação" vs. "cancelado após contratação") dependem de histórico de mudança de status.

**Workaround atual:** `Project.updated_at` como aproximação.

**Solução:** Tabela `ProjectStatusHistory { project_id, old_status, new_status, changed_at, changed_by }`.

---

### 5. Score histórico do Nômade ausente

**Impacto:** Comparação de pontuação de nômade entre períodos é inviável. Só o score atual (`Nomade.score`) é armazenado.

**Solução:** Tabela `NomadeScoreSnapshot { nomade_id, score, recorded_at }` preenchida por job semanal/mensal.

---

## Indicadores por Perfil

| Perfil | Indicadores próprios | Fonte |
|---|---|---|
| Agency | 10 (mesmos do Admin, escopo próprio) | `AGENCY_INDICATORS` |
| Partner | 10 próprios + 4 sobre agências lideradas | `PARTNER_INDICATORS` |
| Nomad | 8 | `NOMAD_INDICATORS` |
| Leader | 10 | `LEADER_INDICATORS` |

Todos os indicadores de Agency são reexportados para Partner com `allowedScopes: ["OWN_PARTNER_SCOPE"]`.

---

## Como usar o catálogo no código

```typescript
import {
  ADMIN_INDICATORS,
  AGENCY_INDICATORS,
  ALL_KPI_INDICATORS,
  ALL_TABULAR_REPORTS,
  INDICATOR_BY_ID,
  DATA_AVAILABILITY_SUMMARY,
} from "@/features/reports/constants/report-indicators.catalog";

// Verificar quais indicadores de um perfil já têm dados
const disponiveis = ALL_KPI_INDICATORS
  .filter(i => i.profiles.includes("agency") && i.dataAvailability === "available");

// Buscar por ID
const kpi = INDICATOR_BY_ID["faturamento"];

// Resumo de disponibilidade para página de status interno
console.log(DATA_AVAILABILITY_SUMMARY);
```

---

## Ordem de Implementação Sugerida

1. **Fase 1 — Dados já disponíveis:** Faturamento, Carteira, Projetos (todos os status), Nômades, Tarefas, Pontuação de Tarefas, Remuneração, Clientes, Inatividade, Extrato Geral.
2. **Fase 2 — Derivações e ajustes:** MRR, Avulsos, CMV, Margem Bruta, Ticket Médio (após resolver `Project.agency_id`), Atividade (com `User.last_login`).
3. **Fase 3 — Novas estruturas de dados:** Leads (novo modelo), Churn preciso (audit trail), Analytics de sessão.
