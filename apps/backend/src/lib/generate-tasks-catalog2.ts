import type { DbClient } from "./project-scope";
import { getNextTaskCode } from "./task-code";
import { computePricing, type PricingSelection } from "./catalog2-pricing";
import type { GerarTarefasResult } from "./generate-tasks";
import { addMonths } from "./catalog2-checkout";
import { getPaymentGateway } from "./payment-gateway";
import { getNextSequenceValue, formatInvoiceNumber } from "./sequence";

export interface GerarTarefasCatalog2Options {
  // Obrigatórios: geração só acontece a partir de um pagamento confirmado —
  // mesmo contrato de gerarTarefasDoProjeto (generate-tasks.ts).
  paymentId: string;
  paidAt: Date;
  billingCycleKey: string;
  // Só os ProjectProduct de origem catalog2 cobertos por ESTE pagamento —
  // nunca uma consulta fresca a "produtos atuais do projeto".
  projectProductIds: string[];
}

const projectProductInclude = {
  project: { select: { client_id: true } },
  catalog2_product: { select: { delivery_recurrence: true } },
  catalog2_version: {
    include: {
      tasks: {
        orderBy: { sort_order: "asc" as const },
        include: {
          steps: { orderBy: { sort_order: "asc" as const } },
          dependencies: { select: { depends_on_task_id: true } },
          specialty: { select: { name: true } },
          // Item 3.2 (reunião 2026-09-14, "conectar questionários à
          // execução"): questionário vinculado à tarefa da versão
          // CONTRATADA — vira a fotografia (briefing_snapshot) da
          // ProjectTask gerada. Nunca lido de novo depois disso.
          questionnaire: { include: { questions: { orderBy: { sort_order: "asc" as const } } } },
        },
      },
    },
  },
};

type ProjectProductForGeneration = Awaited<ReturnType<typeof loadProjectProducts>>[number];

async function loadProjectProducts(tx: DbClient, projectId: string, projectProductIds: string[]) {
  return tx.projectProduct.findMany({
    where: {
      project_id: projectId,
      id: { in: projectProductIds },
      catalog2_product_id: { not: null },
      catalog2_version_id: { not: null },
    },
    include: projectProductInclude,
  });
}

/**
 * Espelha gerarTarefasDoProjeto (src/lib/generate-tasks.ts) para o novo
 * catálogo: gera ProjectTask/ProjectTaskStage a partir dos Catalog2Task da
 * versão CONTRATADA (ProjectProduct.catalog2_version_id — a mesma que a
 * Catalog2Quote de origem congelou), nunca da versão publicada atual do
 * produto (que pode já ter mudado).
 *
 * Tarefa condicional (Catalog2Task.is_conditional=true) só é materializada
 * se sua key estiver em `active_task_keys` — resultado que o próprio motor
 * de precificação (computePricing) já calcula a partir dos efeitos
 * (add_task/remove_task) da seleção CONGELADA na quote de origem. Isto
 * reaproveita o motor de efeitos existente (catalog2-effects.ts via
 * catalog2-pricing.ts) em vez de duplicar a lógica de condições aqui.
 *
 * Idempotência: generation_key com prefixo "c2:" (c2:paymentId:
 * projectProductId:catalog2TaskId:occurrenceIndex) — nunca colide com o
 * formato legado sem prefixo. Etapas usam ProjectTaskStage.source_key
 * ("c2:" + generationKey + ":step:" + stepId), protegido pela constraint
 * @@unique([project_task_id, source_key]) — create-only, nunca duplica sob
 * retry.
 *
 * Item 6.1 (reunião 2026-09-14, "Completar a execução dos períodos"): a
 * lógica de gerar tarefas de UM ProjectProduct foi extraída pra
 * `materializeTasksForProjectProduct` (abaixo), reaproveitada tanto por
 * esta função (occurrenceIndex sempre 0 — o 1º ciclo/entrega, exatamente
 * como sempre foi) quanto por `releaseCatalog2DeliveryCycle` (occurrenceIndex
 * 1..N-1 — os ciclos SEGUINTES de um contrato com período mensal
 * recorrente, sem pagamento novo). Depois do 1º ciclo, se o produto for
 * `delivery_recurrence:"mensal"` e o contrato tiver mais de 1 mês pago,
 * registra (mas NÃO gera tarefas de) os ciclos seguintes — ver
 * `registerFollowUpDeliveryCycles`.
 *
 * Limitação conhecida (documentada, fora de escopo do Bloco 6): dependência
 * ENTRE tarefas (Catalog2TaskDependency) não bloqueia a tarefa dependente no
 * motor de execução (isso exigiria estender stage-engine.ts amplamente) —
 * só é refletida em sort_order (dependências antes) e como texto
 * informativo em `observations`.
 *
 * Deve ser chamada com o Prisma Transaction Client (tx), de dentro da mesma
 * transação que confirma o pagamento — ver src/lib/confirm-payment.ts.
 */
export async function gerarTarefasCatalog2DoProjeto(
  tx: DbClient,
  projectId: string,
  options: GerarTarefasCatalog2Options,
): Promise<GerarTarefasResult> {
  const warnings: string[] = [];
  const produtos_sem_modelo: string[] = [];
  const erros_de_geracao: string[] = [];

  const project = await tx.project.findUnique({
    where: { id: projectId },
    select: { id: true, title: true },
  });
  if (!project) {
    throw new Error(`Projeto não encontrado: ${projectId}`);
  }

  const projectProducts = await loadProjectProducts(tx, projectId, options.projectProductIds);

  if (projectProducts.length === 0) {
    warnings.push(`Projeto "${project.title}" (${projectId}) não possui produtos catalog2 válidos para gerar tarefas.`);
  }

  let generated = 0;
  let skipped = 0;
  let stages_generated = 0;

  for (const pp of projectProducts) {
    const result = await materializeTasksForProjectProduct(tx, projectId, pp, {
      paymentId: options.paymentId,
      paidAt: options.paidAt,
      billingCycleKey: options.billingCycleKey,
      occurrenceIndex: 0,
    });
    if (!result.ok) {
      produtos_sem_modelo.push(pp.product_name_snapshot);
      if (result.reason === "no_tasks") {
        warnings.push(`Produto "${pp.product_name_snapshot}" (catalog2) não possui tarefas ativas nesta contratação.`);
      }
      continue;
    }
    generated += result.generated;
    skipped += result.skipped;
    stages_generated += result.stages_generated;

    // Item 6.1: 1º ciclo acabou de ser gerado acima — se este contrato tem
    // período de MAIS de 1 mês E o produto é entrega recorrente mensal de
    // verdade, registra (só o AGENDAMENTO, nunca as tarefas em si) os
    // ciclos seguintes, ancorados na data deste pagamento.
    await registerFollowUpDeliveryCycles(tx, pp, options.paymentId, options.paidAt);
  }

  const total_tarefas = await tx.projectTask.count({ where: { project_id: projectId } });
  const total_etapas = await tx.projectTaskStage.count({ where: { project_task: { project_id: projectId } } });

  return {
    project_id: projectId,
    generated,
    skipped,
    stages_generated,
    total_tarefas,
    total_etapas,
    produtos_processados: projectProducts.length,
    produtos_sem_modelo,
    erros_de_geracao,
    warnings,
  };
}

type MaterializeResult =
  | { ok: true; generated: number; skipped: number; stages_generated: number }
  | { ok: false; reason: "no_version" | "no_tasks" };

/** Gera (idempotente) as tarefas/etapas de UM ciclo de UM ProjectProduct
 * catalog2 — extraído de gerarTarefasCatalog2DoProjeto (Item 6.1) pra ser
 * reaproveitado tanto no 1º ciclo (pago junto do checkout) quanto nos
 * ciclos seguintes de um contrato de período mensal recorrente. */
async function materializeTasksForProjectProduct(
  tx: DbClient,
  projectId: string,
  pp: ProjectProductForGeneration,
  opts: { paymentId: string; paidAt: Date; billingCycleKey: string; occurrenceIndex: number },
): Promise<MaterializeResult> {
  const version = pp.catalog2_version;
  if (!version) return { ok: false, reason: "no_version" };

  // Reexecuta o motor de precificação sobre a MESMA seleção congelada na
  // Catalog2Quote de origem, só para obter active_task_keys — nunca para
  // recalcular preço/prazo aqui (isso já foi congelado no checkout). Item
  // 6.1: assim, cada ciclo usa exatamente "a versão e as condições
  // contratadas" (nunca uma versão/condição mais recente do produto).
  let activeTaskKeys: Set<string> | null = null;
  // A divisão vem da cotação congelada, nunca do cadastro atual.
  let deliveryGroups = [1];
  if (pp.origin_catalog2_quote_id) {
    const quote = await tx.catalog2Quote.findUnique({
      where: { id: pp.origin_catalog2_quote_id },
      select: { selection_json: true },
    });
    if (quote) {
      const sel = JSON.parse(quote.selection_json) as PricingSelection;
      const pricing = await computePricing(version.id, sel);
      activeTaskKeys = new Set(pricing.active_task_keys);
      const quantity = Math.max(1, Math.floor(Number(sel.quantity ?? 1)) || 1);
      const requestedGroups = Array.isArray(sel.delivery_groups) ? sel.delivery_groups : [quantity];
      const validGroups = requestedGroups.every((group) => Number.isInteger(group) && group > 0)
        && requestedGroups.reduce((sum, group) => sum + group, 0) === quantity;
      // Cotações antigas e qualquer valor inválido preservam o fluxo antigo:
      // uma tarefa única para a quantidade inteira.
      deliveryGroups = validGroups ? requestedGroups : [quantity];
    }
  }
  // Sem cotação de origem rastreável (não deveria acontecer no fluxo
  // normal — só robustez): assume só as tarefas fixas, nunca as
  // condicionais, para nunca cobrar/entregar algo não confirmado.
  const tasksToGenerate = version.tasks.filter(
    (t) => !t.is_conditional || (activeTaskKeys?.has(t.key) ?? false),
  );

  if (tasksToGenerate.length === 0) return { ok: false, reason: "no_tasks" };

  // Dependências: ordena para que uma tarefa nunca venha antes de quem ela
  // depende (sort_order relativo) — ver limitação conhecida no comentário
  // do arquivo (não bloqueia execução, só ordena).
  const byId = new Map(tasksToGenerate.map((t) => [t.id, t]));
  const orderedTasks = topoSort(tasksToGenerate, byId);

  let generated = 0;
  let skipped = 0;
  let stages_generated = 0;

  for (let idx = 0; idx < orderedTasks.length; idx++) {
    const ct = orderedTasks[idx];
    for (let groupIndex = 0; groupIndex < deliveryGroups.length; groupIndex++) {
    const deliveryQuantity = deliveryGroups[groupIndex];
    const occurrenceIndex = opts.occurrenceIndex;
    // Preserva a chave histórica quando há somente um lote; os grupos
    // separados ganham uma chave própria, sem perder a idempotência.
    const generationKey = `c2:${opts.paymentId}:${pp.id}:${ct.id}:${occurrenceIndex}${deliveryGroups.length > 1 ? `:${groupIndex}` : ""}`;

    const existing = await tx.projectTask.findUnique({
      where: { generation_key: generationKey },
      select: { id: true },
    });
    if (existing) {
      skipped++;
      continue;
    }

    const taskCode = await getNextTaskCode(tx);
    const dependencyNames = ct.dependencies
      .map((d) => byId.get(d.depends_on_task_id)?.name)
      .filter((n): n is string => !!n);

    // Item 3.2: fotografia do questionário no formato já usado pelo
    // fluxo de briefing existente (GET/PUT /project-tasks/:id/briefing,
    // TaskLaunchDrawer) — mesmo shape "rico" que generate-tasks.ts já
    // grava a partir de CatalogTask.briefing_questions (legado), pra
    // reaproveitar a MESMA interface sem criar uma segunda. Diferença
    // real entre os modelos: Catalog2QuestionnaireQuestion não tem um
    // campo "type" (o legado tem text_short/text_long/multiple_choice);
    // aqui sempre usamos "text_long" (texto livre) — o mesmo padrão que
    // normalizeBriefingQuestions() já aplica pra perguntas legadas
    // salvas como string simples. Alterações no questionário do
    // cadastro DEPOIS deste ponto nunca tocam este JSON — é uma cópia.
    const briefingSnapshot =
      ct.questionnaire && ct.questionnaire.questions.length > 0
        ? JSON.stringify(
            ct.questionnaire.questions.map((q) => ({
              question_key: q.key,
              question_text: q.label,
              type: "text_long",
              required: q.is_required,
            })),
          )
        : null;

    const newTask = await tx.projectTask.create({
      data: {
        project_id: projectId,
        project_product_id: pp.id,
        product_id: null,
        catalog2_task_id: ct.id,
        catalog2_product_id: pp.catalog2_product_id,
        catalog2_version_id: pp.catalog2_version_id,
        code_snapshot: ct.key,
        name_snapshot: ct.name,
        category_snapshot: ct.specialty?.name ?? null,
        task_code: taskCode,
        title: ct.name,
        description: ct.description ?? ct.objective ?? null,
        status: "PARA_LANCAMENTO",
        exige_aprovacao_cliente: ct.requires_client_approval,
        sort_order: idx * deliveryGroups.length + groupIndex,
        checklist_snapshot: null,
        steps_snapshot: null,
        briefing_snapshot: briefingSnapshot,
        observations: [
          `Lote de entrega: ${deliveryQuantity} unidade${deliveryQuantity === 1 ? "" : "s"}${deliveryGroups.length > 1 ? ` (${groupIndex + 1}/${deliveryGroups.length})` : ""}.`,
          dependencyNames.length > 0 ? `Depende de: ${dependencyNames.join(", ")}` : null,
        ].filter(Boolean).join(" "),
        lancamento_expires_at: new Date(opts.paidAt.getTime() + 30 * 24 * 60 * 60 * 1000),
        origin_payment_id: opts.paymentId,
        generation_key: generationKey,
        billing_cycle_key: opts.billingCycleKey,
        occurrence_index: occurrenceIndex,
        delivery_quantity: deliveryQuantity,
        delivery_group_index: groupIndex,
      },
    });
    generated++;

    const steps = ct.steps;
    const stagesToCreate =
      steps.length > 0
        ? steps.map((step, sIdx) => ({
            project_task_id: newTask.id,
            source_key: `${generationKey}:step:${step.id}`,
            catalog_step_ref: step.id,
            titulo: step.name,
            descricao: step.description ?? null,
            ordem: sIdx + 1,
            status: sIdx === 0 ? "PENDENTE" : "BLOQUEADA",
            obrigatoria: true,
            depende_da_etapa_anterior: sIdx > 0,
            briefing_necessario: sIdx === 0,
          }))
        : [
            {
              project_task_id: newTask.id,
              source_key: `${generationKey}:step:self`,
              catalog_step_ref: ct.id,
              titulo: ct.name,
              descricao: ct.description ?? null,
              ordem: 1,
              status: "PENDENTE",
              obrigatoria: true,
              depende_da_etapa_anterior: false,
              briefing_necessario: false,
            },
          ];

    if (stagesToCreate.length > 0) {
      await tx.projectTaskStage.createMany({ data: stagesToCreate });
      stages_generated += stagesToCreate.length;
    }
    }
  }

  return { ok: true, generated, skipped, stages_generated };
}

/**
 * Item 6.1: registra (idempotente, `skipDuplicates`) os ciclos SEGUINTES
 * (occurrence_index 1..meses-1) de um contrato de período pago — nunca gera
 * tarefas aqui, só AGENDA a data prevista de cada um. Só se aplica quando o
 * produto é `delivery_recurrence:"mensal"` — sem essa definição explícita,
 * mesmo um período de vários meses não registra ciclo nenhum (não é
 * inferido pela presença de `catalog2_period_months`).
 */
async function registerFollowUpDeliveryCycles(
  tx: DbClient,
  pp: ProjectProductForGeneration,
  paymentId: string,
  paidAt: Date,
) {
  const months = pp.catalog2_period_months;
  if (!months || months <= 1) return;
  if (pp.catalog2_product?.delivery_recurrence !== "mensal") return;

  const rows = [];
  for (let occurrenceIndex = 1; occurrenceIndex < months; occurrenceIndex++) {
    rows.push({
      project_product_id: pp.id,
      occurrence_index: occurrenceIndex,
      scheduled_at: addMonths(paidAt, occurrenceIndex),
      status: "pending",
      origin_payment_id: paymentId,
    });
  }
  if (rows.length > 0) {
    await tx.catalog2ProjectDeliveryCycle.createMany({ data: rows, skipDuplicates: true });
  }
}

/**
 * Item 6.1: processa UM ciclo de entrega vencido — chamado pelo worker
 * agendado (ver catalog2-delivery-cycle-scheduler.ts). Idempotente: relê o
 * ciclo dentro da transação e só age se ainda estiver "pending"; gera as
 * tarefas pela MESMA função usada no 1º ciclo (mesma versão/condições
 * contratadas, mesmo formato de generation_key — só o occurrenceIndex
 * muda). Nunca depende do status atual do produto/inativação: o período já
 * foi pago integralmente, então um ciclo pago sempre é liberado, mesmo que
 * o produto tenha sido inativado ou alterado depois da compra.
 */
export async function releaseCatalog2DeliveryCycle(tx: DbClient, cycleId: string): Promise<"released" | "skipped" | "not_due"> {
  const cycle = await tx.catalog2ProjectDeliveryCycle.findUnique({ where: { id: cycleId } });
  if (!cycle || cycle.status !== "pending") return "skipped";
  if (cycle.scheduled_at > new Date()) return "not_due";

  const pp = await tx.projectProduct.findUnique({
    where: { id: cycle.project_product_id },
    include: projectProductInclude,
  });
  if (!pp) {
    await tx.catalog2ProjectDeliveryCycle.update({ where: { id: cycle.id }, data: { status: "skipped" } });
    return "skipped";
  }
  // Contrato foi cancelado (fora do escopo desta etapa reverter execução em
  // andamento — ver catalog2-checkout.ts) — nunca gera entrega nova para um
  // vínculo já cancelado. Inativação do PRODUTO (Item 5), ao contrário,
  // nunca bloqueia isto — o período já foi pago integralmente.
  if (pp.status === "CANCELADO") {
    await tx.catalog2ProjectDeliveryCycle.update({ where: { id: cycle.id }, data: { status: "skipped" } });
    return "skipped";
  }

  const billingCycleKey = cycle.scheduled_at.toISOString().slice(0, 7); // "YYYY-MM"

  // ── Cobrança recorrente — antes disto, um contrato "mensal" era cobrado
  // UMA vez só e as tarefas dos meses seguintes eram liberadas de graça,
  // sempre reaproveitando cycle.origin_payment_id (achado da auditoria de
  // lançamento; violava "nenhuma tarefa sem condição financeira correta").
  // Agora cada ciclo cobra de novo, no mesmo gateway/adapter do checkout
  // inicial. Falha na cobrança nunca gera tarefa — o ciclo fica "skipped"
  // (nunca "not_due"/"pending" de novo: decidir se tenta de novo é decisão
  // humana, não automática, então fica visível pro admin revisar).
  const gateway = getPaymentGateway();
  const cycleAmount = pp.preco_final_cliente_snapshot ?? 0;
  const charge = await gateway.charge({
    amount: cycleAmount,
    referenceId: `${cycle.id}:${billingCycleKey}`,
    description: `Cobrança recorrente ${billingCycleKey} — ${pp.product_name_snapshot ?? pp.id}`,
  });

  const recurringPayment = await tx.payment.create({
    data: {
      project_id: pp.project_id,
      amount: cycleAmount,
      payment_method: "RECORRENCIA_AUTOMATICA",
      status: charge.approved ? "PAGO" : "FALHOU",
      gateway: charge.gateway,
      fake_transaction_id: charge.transactionId,
      paid_at: charge.approved ? cycle.scheduled_at : null,
      idempotency_key: `recurring:${cycle.id}:${billingCycleKey}`,
      billing_cycle_key: billingCycleKey,
      notes: charge.approved
        ? `Cobrança recorrente automática do ciclo ${cycle.id}`
        : `Cobrança recorrente recusada: ${charge.declineReason ?? "motivo não informado"}`,
    },
  });

  if (!charge.approved) {
    await tx.catalog2ProjectDeliveryCycle.update({ where: { id: cycle.id }, data: { status: "skipped" } });
    return "skipped";
  }

  await tx.paymentItem.create({
    data: {
      payment_id: recurringPayment.id,
      project_product_id: pp.id,
      product_id: null,
      product_name_snapshot: pp.product_name_snapshot ?? "",
      unit_price_snapshot: cycleAmount,
      quantity_snapshot: 1,
      total_snapshot: cycleAmount,
      recurrence_snapshot: pp.recurrence_snapshot,
      billing_cycle_key: billingCycleKey,
    },
  });

  await tx.invoice.create({
    data: {
      payment_id: recurringPayment.id,
      project_id: pp.project_id,
      company_id: pp.project.client_id,
      amount: cycleAmount,
      status: "paid",
      paid_at: cycle.scheduled_at,
      invoice_number: formatInvoiceNumber(await getNextSequenceValue(tx, "invoice_number")),
      description: `Fatura recorrente automática — ciclo ${billingCycleKey}`,
    },
  });

  const result = await materializeTasksForProjectProduct(tx, pp.project_id, pp, {
    paymentId: recurringPayment.id,
    paidAt: cycle.scheduled_at,
    billingCycleKey,
    occurrenceIndex: cycle.occurrence_index,
  });

  await tx.catalog2ProjectDeliveryCycle.update({
    where: { id: cycle.id },
    data: { status: result.ok ? "released" : "skipped", released_at: new Date() },
  });
  return result.ok ? "released" : "skipped";
}

/** Ordena tarefas por dependência (topológico simples) — em caso de ciclo
 * (não deveria existir, validado no admin do catalog2), preserva a ordem
 * original em vez de travar. */
function topoSort<T extends { id: string; sort_order: number; dependencies: { depends_on_task_id: string }[] }>(
  tasks: T[],
  byId: Map<string, T>,
): T[] {
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const out: T[] = [];

  function visit(t: T) {
    if (visited.has(t.id) || visiting.has(t.id)) return;
    visiting.add(t.id);
    for (const dep of t.dependencies) {
      const depTask = byId.get(dep.depends_on_task_id);
      if (depTask) visit(depTask);
    }
    visiting.delete(t.id);
    visited.add(t.id);
    out.push(t);
  }

  for (const t of [...tasks].sort((a, b) => a.sort_order - b.sort_order)) visit(t);
  return out;
}

/** Soma dois resultados de geração de tarefas (legado + catalog2) num só,
 * para o chamador (confirm-payment.ts) reportar um único resultado. */
export function mergeGerarTarefasResults(
  a: GerarTarefasResult | null,
  b: GerarTarefasResult,
): GerarTarefasResult {
  if (!a) return b;
  return {
    project_id: a.project_id,
    generated: a.generated + b.generated,
    skipped: a.skipped + b.skipped,
    stages_generated: a.stages_generated + b.stages_generated,
    total_tarefas: b.total_tarefas, // já reflete o total acumulado do projeto
    total_etapas: b.total_etapas,
    produtos_processados: a.produtos_processados + b.produtos_processados,
    produtos_sem_modelo: [...a.produtos_sem_modelo, ...b.produtos_sem_modelo],
    erros_de_geracao: [...a.erros_de_geracao, ...b.erros_de_geracao],
    warnings: [...a.warnings, ...b.warnings],
  };
}
