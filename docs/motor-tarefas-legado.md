# O motor de tarefas da plataforma antiga — e como ele se traduz no modelo novo

Documento de referência gerado a partir do dump `Dump20260423.sql` (23/04/2026).
Base factual: **21.735 tarefas, 6.838 etapas, 1.889 projetos, 375 modelos de
tarefa e 437 etapas de modelo** reais.

Extração: `node scripts/extract-legacy-operations.js` →
`../allka antigo/operacao-tarefas-legado.json` (110 MB, fora do versionamento).
Contém schema + dados de 33 tabelas do domínio operacional, com textos
truncados em 300 chars e as tabelas de conteúdo pesado amostradas.

O ponto central: o que faltava pra **Fase 3** (execução automática por etapa)
não estava no `ProductStage` legado do frontend — estava em
`task_template_stage` (configuração) + `task_stage` (execução). São essas duas
tabelas que definem o motor.

---

## 1. Como funcionava — a configuração

### `task_template` (375 modelos) — o molde da tarefa

| Campo | Papel |
|---|---|
| `taskCode`, `taskName`, `taskDescription`, `executionRules` | Identidade e regras de execução |
| `deadlineDays`, `executionDeadlineHours`, `executionHours` | **Três prazos distintos**: dias totais, horas até o nômade entregar, horas de esforço |
| `nomadAmount` | Quanto o nômade recebe pela tarefa |
| `stagesEnabled` | Se a tarefa se decompõe em etapas — **114 de 375 (30%)** |
| `payNomadOnStageConclusion` | Paga por etapa concluída em vez de só no fim — **62 modelos** |
| `nomadTestEnabled` | Exige teste aprovado do nômade pra pegar a tarefa — **179 modelos (48%)** |
| `requiresPreviusAccess` + `accountPermissionsInstructions` | Precisa de acesso a conta do cliente — **58 modelos** |
| `maxDeliveredItems` | Teto de itens entregues |
| `requiresConclusionAttachment` | Exige anexo pra concluir — 23 modelos |

### `task_template_stage` (437 etapas em 131 modelos) — **o coração do motor**

Distribuição real: 51 modelos com 2 etapas, 33 com 4, 27 com 3, e uma cauda até
16 etapas. É por etapa que a decisão automática acontece:

| Campo | O que decide | Uso real |
|---|---|---|
| `number`, `name`, `code` | Ordem e identidade da etapa | — |
| `taskCategoryId` | **Categoria própria da etapa** — é isso que define a especialidade do nômade que será chamado; uma tarefa de Web pode ter etapa de Design | todas |
| `deadlineDays`, `executionDeadlineHours`, `executionHours` | Prazos por etapa, independentes da tarefa | todas |
| `nomadAmount` | **Pagamento por etapa** — soma dá o custo total da tarefa | todas |
| `delegateToLeader` | Etapa vai pro **líder da área**, não pro nômade | **93 (21%)** |
| `internalExecution` | Execução interna Allka, não vai pra marketplace | **50 (11%)** |
| `keepNomadOnNextStage` | **Mantém o mesmo nômade na etapa seguinte** | **132 (30%)** |
| `allowVisualizePassword` | Etapa pode ver as credenciais do cliente no cofre | **288 (66%)** |
| `requiresConclusionAttachment` | Exige anexo pra concluir a etapa | 24 |
| `hideOnProductDeadline` | Etapa não aparece no prazo mostrado ao cliente | 28 |
| `dontCountForProductDeadline` | Etapa não soma no prazo total do produto | 33 |
| `maxDeliveredItems` | Teto de entregas da etapa | todas |

As quatro últimas linhas são a resposta pra "como o motor decidia sozinho":
**categoria da etapa → especialidade do executor**; `delegateToLeader` /
`internalExecution` → **quem executa**; `keepNomadOnNextStage` → **continuidade
de pessoa entre etapas**; os dois flags de prazo → **o que o cliente enxerga**.

---

## 2. Como funcionava — a execução

`task_stage` é o snapshot vivo da etapa: copia a config do template e ganha
estado próprio (`taskStageStatusId`, `taskDelegationStatusId`, `nomadId`,
`leaderId`, `nomadQualificatorId`, prazos, `bonusAmount`, `agencyVisualizedAt`).

### Quatro máquinas de estado paralelas

Cada tarefa (e cada etapa) carregava **quatro** estados simultâneos:

1. **Status** (16 valores): `RASCUNHO → LANÇAMENTO → ENVIADA PARA EXECUÇÃO → EM EXECUÇÃO → APROVAÇÃO PENDENTE (AGÊNCIA / CLIENTE) → APROVADA → CONCLUÍDA`, mais `DEVOLVIDA`, `REPROVADA`, `EXPIRADA`, `CANCELADA`, `PAUSADA`, `APROVAÇÃO AUTOMÁTICA`, `ALTERAÇÃO SOLICITADA`.
2. **Delegação** (8 valores): `EM ANÁLISE PELO GESTOR → ACEITA PELO GESTOR → AGUARDANDO DELEGAÇÃO → EM ANÁLISE PELO NÔMADE → DELEGADA PARA O NÔMADE`, com as saídas `RECUSADA PELO GESTOR`, `DEVOLVIDA PELO NÔMADE` e `DELEGADA PARA O LÍDER`.
3. **Qualificação** (6 valores): `ENTREGA PENDENTE → QUALIFICAÇÃO PENDENTE → QUALIFICADA`, com as reprovações `NÃO SEGUIU ORIENTAÇÕES`, `ENTREGA SEM QUALIDADE`, `MELHORIAS FINAIS`. Feita por um **nômade qualificador** (`nomadQualificatorId`), com prazo próprio (`nomadQualificationDeadline`, `qualificationRevisionDeadline`).
4. **Reprovação** (3 motivos): "Não seguiu o briefing", "Erros na execução", "Ajustes finos" — 1.750 reprovações registradas.

Tudo auditado: 46.118 mudanças de status de tarefa e 44.617 de etapa, cada uma
com `userId`, `previousStatusId`, `currentStatusId` e `changeDetails` em texto.

### Três prazos por tarefa E por etapa

`startDeadline` (limite pra lançar), `executionDeadline` (limite do nômade),
`approvalDeadline` (limite da agência/cliente aprovar), mais `deadline` geral e
`agencyDaysLeftToApprove`. Havia log dedicado de prorrogação: 8.573 alterações
de prazo em tarefas e **19.138 em etapas**.

### Um ciclo real (tarefa 738, "Campanha Google ADS – Start")

```
25/08 RASCUNHO → 27/08 ENVIADA PARA EXECUÇÃO → 30/08 EM EXECUÇÃO
08/09 APROVADA → 11/09 EM EXECUÇÃO → 11/09 APROVADA   (etapa "Semana 1")
15/09 EM EXECUÇÃO → 18/09 APROVADA                     (etapa "Semana 2")
21/09 EM EXECUÇÃO → 27/09 APROVADA                     (etapa "Semana 3")
29/09 CONCLUÍDA                                        (Relatório Final)
```

4 etapas, todas com `keepNomadOnNextStage = 1` → **o mesmo nômade (id 32)
percorreu as quatro**, cada uma com seu próprio `executionDeadline` e
`approvalDeadline` escalonados semana a semana. É o padrão de produto recorrente.

### O que os números revelam da operação

- **15.770 das 21.735 tarefas (73%) morreram EXPIRADAS** — nunca foram lançadas dentro do prazo. Apenas 4.432 chegaram a CONCLUÍDA. O gargalo real do negócio era o cliente lançar a tarefa, não a execução.
- **18.482 tarefas pararam em "AGUARDANDO DELEGAÇÃO"** — coerente com o número acima.
- Só **2.418 tarefas (11%)** usaram etapas, e 2.416 delas de fato geraram etapas — o motor de etapas era minoria, mas é onde estava a complexidade.
- **1.906 das 6.838 etapas (28%)** mantiveram o nômade na etapa seguinte.
- 239 tarefas foram delegadas ao líder, 44 passaram por qualificador.

---

## 3. Tradução para o modelo novo

### O que já existe e cobre

| Legado | Modelo novo | Situação |
|---|---|---|
| `task_template` | `CatalogTask` | ✅ Cobre nome, código, categoria, descrição, objetivo, prazo, horas, complexidade, `requires_access/briefing/files` |
| `task_template_stage` | `CatalogTask.steps` (JSON) | ⚠️ Só `{name, description}` — **falta toda a configuração de execução** |
| `task` | `ProjectTask` | ✅ Equivalente, com snapshots e `task_code` |
| `task_stage` | `ProjectTaskStage` | ⚠️ Só `titulo/descricao/ordem/status/obrigatoria/depende_da_etapa_anterior/briefing_necessario` — **sem executor, prazo, pagamento** |
| `task_status` (16) | `ProjectTask.status` (10) | ⚠️ Falta separar aprovação de agência × cliente; falta `PAUSADA`/`APROVAÇÃO AUTOMÁTICA` |
| `task_stage_status` (12) | `ProjectTaskStage.status` (4) | ⚠️ `PENDENTE/EM_ANDAMENTO/CONCLUIDA/BLOQUEADA` não expressa aprovação nem reprovação |
| `task_delegation_status` (8) | `ProjectTask.nomade_responsavel_id` + `lider_responsavel_id` | ⚠️ Os ids existem, a **máquina de estados de delegação não** |
| `task_qualification_status` (6) | — | ❌ Não existe qualificação no modelo novo |
| `task_status_history` | `TaskAssignmentHistory` | ⚠️ Só histórico de atribuição, não de status |
| `task_answered_question` | `TaskBriefingAnswer` | ✅ Equivalente |
| `task_delivered_itens` | `TaskAttachment` | ⚠️ Parcial — não há conceito de "item entregue" avaliável |
| `task_rating` / `task_stage_rating` | — | ❌ Não existe avaliação |
| `startDeadline` | `lancamento_expires_at` | ✅ Mesmo conceito (e o dado mostra que é o campo mais decisivo da operação) |

### Proposta concreta para a Fase 3

**a) Configuração — estender os steps da `CatalogTask`.** Hoje cada step é
`{name, description}`. O legado prova que o mínimo viável por etapa é:

```ts
interface CatalogTaskStep {
  name: string;
  description?: string;
  order: number;
  // ── execução (novo, espelhando task_template_stage) ──
  categoryId?: string;        // taskCategoryId → especialidade do executor
  executorType: "nomad" | "leader" | "internal";  // delegateToLeader + internalExecution
  keepSameNomad: boolean;     // keepNomadOnNextStage
  deadlineDays?: number;
  executionDeadlineHours?: number;
  executionHours?: number;
  nomadAmount?: number;       // pagamento da etapa
  maxDeliveredItems?: number;
  requiresConclusionAttachment: boolean;
  allowViewCredentials: boolean;      // allowVisualizePassword
  hideOnProductDeadline: boolean;
  countsForProductDeadline: boolean;  // inverso de dontCountForProductDeadline
}
```

Isso é aditivo: os 26 steps atuais continuam válidos, com defaults
(`executorType: "nomad"`, `keepSameNomad: false`, flags `false`).

**b) Execução — estender `ProjectTaskStage`** com o snapshot da config e o
estado próprio, que é o que permite a etapa "andar sozinha":

```prisma
config_snapshot   String?   // JSON do CatalogTaskStep no momento da geração
nomade_id         String?
lider_id          String?
executor_type     String    @default("nomad")
execution_deadline DateTime?
approval_deadline  DateTime?
delegation_status String?   // AGUARDANDO_DELEGACAO | DELEGADA_NOMADE | DELEGADA_LIDER | DEVOLVIDA
nomad_amount      Float?
```

**c) Regra de continuidade** (`keepSameNomad`): ao concluir a etapa N, se a
etapa N+1 tem `keepSameNomad`, ela nasce já com `nomade_id` da anterior e pula a
fila de delegação. Foi o comportamento de 28% das etapas reais.

**d) Prazos escalonados**: cada etapa calcula seu `execution_deadline` a partir
da conclusão da anterior + `executionDeadlineHours`, e o prazo do produto soma
só as etapas com `countsForProductDeadline`.

### O que ficou deliberadamente de fora

Qualificação por nômade qualificador, avaliação (rating), itens entregues
avaliáveis individualmente e a máquina de aprovação em dois níveis
(agência → cliente) são subsistemas inteiros do legado que **não existem** no
modelo novo. Não estão na proposta acima porque cada um é uma decisão de
produto, não de implementação — mas o dado está extraído e disponível se
forem retomados.
