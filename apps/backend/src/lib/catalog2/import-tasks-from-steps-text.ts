// Importador de TAREFAS/ETAPAS dos 36 produtos reais do catalog2 (reunião
// 10/09, "tarefas e etapas dos 36 produtos reais"). Fonte: NÃO existe
// planilha estruturada de tarefas — a única informação real, por produto, é
// o texto livre `cardapio_ia_steps_text` ("Etapas Executáveis por IA")
// preservado em `Catalog2ProductImportOrigin.original_texts_json` pela
// importação original (ver import-products.ts, que deliberadamente NÃO
// converteu esse texto em tarefas). Esse texto é uma lista ordenada de
// passos separados por ";" — cada segmento vira UMA Catalog2Task (key
// estável `etapa-N`, nome = texto exato do segmento, sort_order = posição
// na lista). Nunca inventa: especialidade, horas estimadas e dependências
// entre tarefas NÃO existem na fonte — ficam null/ausentes, com uma
// pendência explícita (`task_effort_fields_pending`) registrada pra revisão
// humana, nunca preenchidas com valor padrão silencioso.
//
// Idempotente: cada tarefa é identificada por (version_id, key) — já
// existente nunca é recriada nem sobrescrita (create-only, igual ao padrão
// de geração de ProjectTask em generate-tasks-catalog2.ts). Nunca publica
// produto, nunca mexe em preço/prazo/imagem.
import { PrismaClient } from "@prisma/client";
import { assertLocalDatabase } from "../assert-local-database";

const TEST_LOCAL_PREFIX = "[TESTE LOCAL]";

// Mesma ordem de prioridade usada em import-products.ts e catalog2-admin.ts
// (duplicada de propósito — os três arquivos já seguem esse padrão nesta
// base; nenhum módulo central existia antes desta tarefa) + o novo código.
const PENDENCY_PRIORITY = [
  "content_review_pending",
  "classification_decision_pending",
  "price_pending",
  "deadline_pending",
  "portfolio_pending",
  "task_effort_fields_pending",
  "rose_review_pending",
];
function reviewStateFrom(pendencies: string[]): string {
  for (const p of PENDENCY_PRIORITY) if (pendencies.includes(p)) return p;
  return "ready_for_final_review";
}

export interface TasksImportOptions {
  mode: "dry_run" | "apply";
  actorUserId?: string | null;
}

export interface TaskImportLine {
  product_id: string;
  product_name: string;
  version_id: string | null;
  outcome:
    | "created" // >=1 tarefa nova criada nesta execução
    | "already_present" // tarefas já existiam (idempotente — nada a fazer)
    | "no_source_text" // fonte não tem "Etapas Executáveis por IA" pra este produto
    | "no_draft_version" // produto sem versão em rascunho (não deveria acontecer)
    | "no_origin"; // produto não veio da importação original (não deveria acontecer)
  source_step_count: number;
  tasks_created: number;
  tasks_already_existing: number;
  content_pendency_cleared: boolean;
  effort_pendency_added: boolean;
  pendencies_untouched_reason: string | null; // ex.: "edição humana já registrada"
  truncated_names: string[]; // nomes que passaram de 191 chars (raro) — texto integral preservado em description
}

export interface TasksImportResult {
  mode: "dry_run" | "apply";
  products_total: number;
  products_with_tasks_before: number;
  products_with_tasks_after: number;
  tasks_created_total: number;
  tasks_already_existing_total: number;
  content_pendency_cleared_count: number;
  effort_pendency_added_count: number;
  products_no_source_text: number;
  products_no_draft_version: number;
  lines: TaskImportLine[];
}

function splitStepsText(raw: string): string[] {
  return raw
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function safeJsonObject(raw: string | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    const v = JSON.parse(raw);
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
}
function safeJsonArray(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export async function runTasksImport(opts: TasksImportOptions): Promise<TasksImportResult> {
  if (opts.mode === "apply") assertLocalDatabase(process.env.DATABASE_URL);
  const db = new PrismaClient();

  try {
    const products = await db.catalog2Product.findMany({
      where: { NOT: { internal_name: { startsWith: TEST_LOCAL_PREFIX } } },
      orderBy: { internal_name: "asc" },
      include: {
        import_origin: true,
        versions: { orderBy: { version_number: "desc" }, include: { _count: { select: { tasks: true } } } },
      },
    });

    const lines: TaskImportLine[] = [];
    let tasksCreatedTotal = 0;
    let tasksExistingTotal = 0;
    let contentPendencyClearedCount = 0;
    let effortPendencyAddedCount = 0;
    let noSourceText = 0;
    let noDraftVersion = 0;
    let productsWithTasksBefore = 0;

    for (const p of products) {
      const draftVersion = p.versions.find((v) => v.state === "rascunho") ?? null;
      if (p.versions.some((v) => v._count.tasks > 0)) {
        productsWithTasksBefore++;
      }

      if (!p.import_origin) {
        lines.push({
          product_id: p.id,
          product_name: p.internal_name,
          version_id: draftVersion?.id ?? null,
          outcome: "no_origin",
          source_step_count: 0,
          tasks_created: 0,
          tasks_already_existing: 0,
          content_pendency_cleared: false,
          effort_pendency_added: false,
          pendencies_untouched_reason: "produto sem registro de importação original",
          truncated_names: [],
        });
        continue;
      }

      if (!draftVersion) {
        noDraftVersion++;
        lines.push({
          product_id: p.id,
          product_name: p.internal_name,
          version_id: null,
          outcome: "no_draft_version",
          source_step_count: 0,
          tasks_created: 0,
          tasks_already_existing: 0,
          content_pendency_cleared: false,
          effort_pendency_added: false,
          pendencies_untouched_reason: "sem versão em rascunho para receber as tarefas",
          truncated_names: [],
        });
        continue;
      }

      const originTexts = safeJsonObject(p.import_origin.original_texts_json);
      const stepsRaw = typeof originTexts.cardapio_ia_steps_text === "string" ? originTexts.cardapio_ia_steps_text : null;
      const segments = stepsRaw ? splitStepsText(stepsRaw) : [];

      if (segments.length === 0) {
        noSourceText++;
        lines.push({
          product_id: p.id,
          product_name: p.internal_name,
          version_id: draftVersion.id,
          outcome: "no_source_text",
          source_step_count: 0,
          tasks_created: 0,
          tasks_already_existing: 0,
          content_pendency_cleared: false,
          effort_pendency_added: false,
          pendencies_untouched_reason: "fonte original não descreve etapas para este produto",
          truncated_names: [],
        });
        continue;
      }

      const existingTasks = await db.catalog2Task.findMany({
        where: { version_id: draftVersion.id },
        select: { key: true },
      });
      const existingKeys = new Set(existingTasks.map((t) => t.key));

      let tasksCreated = 0;
      let tasksExisting = 0;
      const truncatedNames: string[] = [];

      for (let idx = 0; idx < segments.length; idx++) {
        const key = `etapa-${idx + 1}`;
        if (existingKeys.has(key)) {
          tasksExisting++;
          continue;
        }
        const rawName = segments[idx];
        const name = rawName.length > 191 ? `${rawName.slice(0, 188)}...` : rawName;
        if (rawName.length > 191) truncatedNames.push(rawName);

        if (opts.mode === "apply") {
          await db.catalog2Task.create({
            data: {
              version_id: draftVersion.id,
              key,
              name,
              // Texto integral preservado aqui sempre que o nome precisou
              // ser truncado — nunca perde conteúdo real da fonte.
              description: rawName.length > 191 ? rawName : null,
              sort_order: idx,
              specialty_id: null, // fonte não define especialidade — não inventar
              estimated_minutes: null, // fonte não define horas — não inventar
              is_conditional: false,
              requires_review: false,
              requires_client_approval: false,
            },
          });
        }
        tasksCreated++;
      }

      tasksCreatedTotal += tasksCreated;
      tasksExistingTotal += tasksExisting;

      // ── Pendências: só mexe se ainda não houve edição humana registrada
      // pra este produto (nunca sobrescreve decisão de revisão manual).
      let contentCleared = false;
      let effortAdded = false;
      let untouchedReason: string | null = null;

      if (tasksCreated > 0 || tasksExisting > 0) {
        if (p.import_origin.human_edited_at) {
          untouchedReason = "edição humana já registrada — pendências preservadas";
        } else {
          const pend = safeJsonArray(p.import_origin.pendencies_json);
          const hasVariationsRaw = "variations_raw" in originTexts;
          const hasAddonsRaw = "addons_raw" in originTexts;
          let next = [...pend];

          // content_review_pending foi marcado (entre outros motivos) porque
          // as "Etapas Executáveis por IA" não tinham virado tarefas — agora
          // viraram. Só remove se NENHUM outro motivo (variações/adicionais
          // em texto livre não estruturável) ainda estiver aberto pra este
          // produto — nunca esconde uma divergência real de outro campo.
          if (next.includes("content_review_pending") && !hasVariationsRaw && !hasAddonsRaw) {
            next = next.filter((x) => x !== "content_review_pending");
            contentCleared = true;
          }
          // Tarefas existem agora, mas especialidade/horas/dependências
          // continuam indefinidas na fonte — pendência própria, honesta.
          if (!next.includes("task_effort_fields_pending")) {
            next.push("task_effort_fields_pending");
            effortAdded = true;
          }

          if (opts.mode === "apply" && (contentCleared || effortAdded)) {
            await db.catalog2ProductImportOrigin.update({
              where: { id: p.import_origin.id },
              data: { pendencies_json: JSON.stringify(next), review_state: reviewStateFrom(next) },
            });
          }
        }
      }

      if (contentCleared) contentPendencyClearedCount++;
      if (effortAdded) effortPendencyAddedCount++;

      lines.push({
        product_id: p.id,
        product_name: p.internal_name,
        version_id: draftVersion.id,
        outcome: tasksCreated > 0 ? "created" : "already_present",
        source_step_count: segments.length,
        tasks_created: tasksCreated,
        tasks_already_existing: tasksExisting,
        content_pendency_cleared: contentCleared,
        effort_pendency_added: effortAdded,
        pendencies_untouched_reason: untouchedReason,
        truncated_names: truncatedNames,
      });
    }

    // Reflete o estado real (apply) ou simulado (dry-run) após esta execução —
    // conta por linha (tasks_created + tasks_already_existing > 0), nunca por
    // delta, pra funcionar igual nos dois modos.
    const productsWithTasksAfter = lines.filter((l) => l.tasks_created + l.tasks_already_existing > 0).length;

    return {
      mode: opts.mode,
      products_total: products.length,
      products_with_tasks_before: productsWithTasksBefore,
      products_with_tasks_after: productsWithTasksAfter,
      tasks_created_total: tasksCreatedTotal,
      tasks_already_existing_total: tasksExistingTotal,
      content_pendency_cleared_count: contentPendencyClearedCount,
      effort_pendency_added_count: effortPendencyAddedCount,
      products_no_source_text: noSourceText,
      products_no_draft_version: noDraftVersion,
      lines,
    };
  } finally {
    await db.$disconnect();
  }
}
