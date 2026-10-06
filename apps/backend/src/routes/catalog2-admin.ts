// API do CONSTRUTOR do novo catálogo (sprint de produtos, bloco 3/6).
//
// SOMENTE Admin Master (mesma classificação oficial usada em Legacy; 404 para
// os demais). Toda decisão — inclusive preço e prazo — é revalidada no
// servidor. Versão publicada é imutável por qualquer chamada direta.

import { redactSecrets } from "../lib/redact-secrets";
import { AI_PROVIDERS, ON_FAILURE_ACTIONS, ON_FAILURE_LABEL, findProvider, providerConfigured, providerProblem } from "../lib/catalog2-ai-providers";
import { runCost } from "../lib/catalog2-ai";
import { invokeTaskAIAdapter, currentTaskAIAdapterName } from "../lib/task-ai";
import { QuestionConfigError, normalizeQuestionConfig, parseOptions, parseValidation, QUESTION_TYPES, QUESTION_TYPE_LABEL, QUESTION_VISIBILITIES, ANSWER_USAGES } from "../lib/catalog2-question-types";
import { buildCommercialUpdate, serializeCommercialFields, CommercialFieldError, type CommercialInput } from "../lib/catalog2-commercial-fields";
import { AsyncLocalStorage } from "node:async_hooks";
import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { verifyToken, evaluateAdminMasterAccess, requireAdminMaster } from "../middleware/auth";
import { writeAccessAudit } from "../lib/product-feedback-service";
import { logCommercialChangeEvent } from "../lib/catalog2-commercial-change-log";
import { CATALOG2_PERIODS, isCatalog2Period, isCurrentlyContractablePeriod, listPeriodsForAdmin } from "../lib/catalog2-periods";
import { stepPerformance } from "../lib/step-performance";
import { recordCatalog2ProductHistory, listCatalog2ProductHistory } from "../lib/catalog2-product-history";
import { CONTINUITY_MODES } from "../lib/catalog2-continuity";
import { deliverableInputSchema, copyTaskDeliverables } from "../lib/task-deliverables";
import { taskOpsSchema, stepOpsSchema, normalizeTaskOps, normalizeStepOps } from "../lib/catalog2-ops";
import { DEPENDENCY_TARGET_KINDS, DEPENDENCY_BEHAVIORS, DEPENDENCY_TARGET_LABEL, DEPENDENCY_BEHAVIOR_LABEL } from "../lib/project-dependencies";
import { ASSET_RULES } from "../lib/client-assets";
import { CYCLE_TYPES, REPEAT_RULES, IMPLEMENTATION_RULES, SELL_MODES } from "../lib/catalog2-cycles";
import { ACCESS_TYPES, ACCESS_TYPE_KEYS, replaceVersionAccess } from "../lib/catalog2-access";
import { createModelGuarded, findCandidates } from "../lib/catalog2-model-guard";
import { type SimilarModel, createTaskModel, createStepModel, findOrCreateTaskModel, syncTaskModelSteps, taskModelSignature, stepModelSignature, STEP_PURPOSES, autoKey, addTaskFromModel, addStepFromModel, taskDataFromModel, stepDataFromModel } from "../lib/catalog2-models";
import { maybeCreateCatalog2ActivationJobOnStatusTransition, notifyValidQuoteOwnersOfCommercialChange } from "../lib/catalog2-notifications";
import { summarizeCatalog2ProductHistory } from "../lib/catalog2-product-history-ai";
import { summarizeVersionChanges } from "../lib/catalog2-change-summary";
import {
  CATALOG2_STATUS_MEANING,
  CATALOG2_STATUS_LABEL,
  CATALOG2_EXECUTION_MODES,
  CATALOG2_CLIENT_VISIBLE_STATUSES,
  CATALOG2_CONTRACTABLE_STATUSES,
  type Catalog2Status,
} from "../lib/catalog2-foundation";
import {
  CATALOG2_EFFECT_TYPES,
  CONDITION_OPERATORS,
  CONDITION_TRIGGER_SOURCES,
  describeCondition,
  validateEffect,
} from "../lib/catalog2-effects";
import {
  Catalog2Error,
  archiveProduct,
  previewInactivation,
  scheduleInactivation,
  cancelScheduledInactivation,
  buildEffectCtx,
  createProduct,
  cleanStepFlowRefs,
  assertCanAddBaseTask,
  setProductTaskStructure,
  renameProductInternalName,
  getProductDetail,
  newDraftVersion,
  publishVersion,
  setProductStatus,
  validateConditionShape,
  validateVersionForPublish,
} from "../lib/catalog2-service";
import { serializeAudiences, validateAudiences } from "../lib/catalog2-audience";
import { EMERGENCY_EXTRA_KINDS, validateEmergencyStepInput } from "../lib/catalog2-emergency";
import { EXECUTOR_KINDS, EXECUTOR_POLICIES, isRefPolicy, LEADER_MODES, parseDepends, validateStepExecutor, validateStepFlow } from "../lib/step-flow";
import { computePricing, defaultSelection, CHARGE_SCOPES, PRICING_MODES } from "../lib/catalog2-pricing";
import { type ClientContext, configureProduct, createQuote } from "../lib/catalog2-client";
import { createProjectWithSequentialCode } from "../lib/create-project";
import { attachCatalog2QuoteToProject, assertPackageOnlyRules } from "../lib/catalog2-checkout";
import { recalculateProjectValue } from "../lib/project-value";
import { aiCopyData, AI_MODES, AI_ACTORS, AI_TRIGGERS } from "../lib/catalog2-ai";
import { applyResolution, RESOLUTION_ACTIONS, RESOLUTION_EFFECTS, type ResolutionAction } from "../lib/catalog2-commercial";
import { priceSummary } from "../lib/catalog2-price-summary";
import { OPTION_AVAILABILITY } from "../lib/catalog2-availability";
import { ADDON_TYPES, type AddonType } from "../lib/catalog2-addon-types";
import { validateEffortEffect } from "../lib/catalog2-effort";
import { GATE_POSITIONS, APPROVER_KINDS, GROUP_MODES, GATE_POSITION_LABEL, APPROVER_KIND_LABEL, validateGateInput } from "../lib/approval-gates";
import { SLA_SCOPES, SLA_UNITS, SLA_ANCHORS, SLA_MODALITIES, SLA_SCOPE_LABEL, SLA_UNIT_LABEL, SLA_ANCHOR_LABEL, SLA_PAUSE_REASONS, validateSlaRuleInput } from "../lib/sla";
import {
  ASSET_RULES_CONN, FIELD_TYPES, validateFieldDefs, type FieldDef, CONNECTION_METHODS, CONNECTION_METHOD_LABEL, CONNECTION_STATES, CONNECTION_STATE_LABEL, ConnectionError, DEPENDENCY_KINDS, DEPENDENCY_KIND_LABEL, GRANT_SCOPES, GRANT_SCOPE_LABEL,
  OBLIGATIONS, OBLIGATION_LABEL, PENDING_BEHAVIORS, PENDING_BEHAVIOR_LABEL, VALIDATION_MODES, WHEN_NEEDED, WHEN_NEEDED_LABEL, ensureConnectionTypes, serializeConnectionType,
} from "../lib/connections/catalog";
import { connectionsReadinessItem, createRequirement, deleteRequirement, moduleState, serializeRequirement, setModuleFlag, updateRequirement } from "../lib/connections/requirements";
import { listConnectors } from "../lib/connections/connectors";
import { ensureConnectionAiProfile } from "../lib/connections/pending";
import { confirmPaymentAndGenerateProjectTasks, withIdempotentRetry, PaymentValidationError } from "../lib/confirm-payment";

const router = Router();

// ── Guarda ─────────────────────────────────────────────────────────────
async function guardAdminMaster(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { admin_profile: { select: { is_master: true, is_active: true, permissions: { select: { module: true, action: true } } } } },
    });
    if (!evaluateAdminMasterAccess(req.user.account_type, user?.admin_profile ?? null)) {
      res.status(404).json({ error: "Não encontrado" });
      return;
    }
    next();
  } catch (err) {
    next(err);
  }
}
// Ator da requisição atual (para carimbar "editado por humano"). Preenchido
// pelo middleware abaixo; lido pelos helpers de edição sem precisar passar o
// id por toda a cadeia de funções.
const requestActor = new AsyncLocalStorage<string | null>();

router.use(verifyToken, guardAdminMaster);
// Guarda o ator da requisição para os helpers de edição (carimbo humano).
router.use((req, _res, next) => requestActor.run(req.user?.id ?? null, () => next()));

function handle(err: unknown, res: Response, next: NextFunction) {
  if (err instanceof Catalog2Error) {
    res.status(err.httpStatus).json({ error: err.message, code: err.code, ...((err as { similar?: unknown }).similar ? { similar: (err as { similar?: unknown }).similar } : {}), ...((err as { details?: unknown }).details ? { details: (err as { details?: unknown }).details } : {}) });
    return;
  }
  if (err instanceof ConnectionError) {
    res.status(err.httpStatus).json({ error: err.message, code: err.code, ...(err.details ? { details: err.details } : {}) });
    return;
  }
  if (err instanceof QuestionConfigError) {
    res.status(err.statusCode).json({ error: err.message, code: err.code });
    return;
  }
  if (err instanceof CommercialFieldError) {
    res.status(err.statusCode).json({ error: err.message, code: err.code });
    return;
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    res.status(409).json({ error: "Registro duplicado (chave já usada nesta versão)." });
    return;
  }
  next(err);
}

function safeJsonArray(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}
function safeJson<T = unknown>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function audit(req: Request, action: string, after: Record<string, unknown>) {
  await writeAccessAudit({ actorId: req.user!.id, action: `catalog2.${action}`, after: { module: "catalog2", ...after } }).catch(() => {});
}

// Marca o produto importado como "editado por humano" — depois disso o
// importador do bloco 4 nunca mais sobrescreve o rascunho. Idempotente:
// só carimba a primeira vez (human_edited_at IS NULL).
async function stampHumanEdit(versionId: string) {
  const actorUserId = requestActor.getStore();
  if (!actorUserId) return;
  const v = await prisma.catalog2ProductVersion.findUnique({ where: { id: versionId }, select: { product_id: true } });
  if (!v) return;
  await prisma.catalog2ProductImportOrigin
    .updateMany({
      where: { product_id: v.product_id, human_edited_at: null },
      data: { human_edited_at: new Date(), human_edited_by_user_id: actorUserId },
    })
    .catch(() => {});
}

// Carrega uma versão e garante que é RASCUNHO editável. Todo caminho que passa
// por aqui é uma escrita no rascunho → carimba a edição humana.
async function editableVersionOrThrow(versionId: string) {
  const v = await prisma.catalog2ProductVersion.findUnique({ where: { id: versionId } });
  if (!v) throw new Catalog2Error("Versão não encontrada.", 404);
  if (v.state === "publicada") {
    throw new Catalog2Error("Versão publicada é imutável. Crie uma nova versão.", 409, "version_published_immutable");
  }
  await stampHumanEdit(versionId);
  return v;
}
async function versionOfTask(taskId: string) {
  const t = await prisma.catalog2Task.findUnique({ where: { id: taskId }, select: { version_id: true } });
  if (!t) throw new Catalog2Error("Tarefa não encontrada.", 404);
  return editableVersionOrThrow(t.version_id);
}
async function versionOfVariation(variationId: string) {
  const va = await prisma.catalog2Variation.findUnique({ where: { id: variationId } });
  if (!va) throw new Catalog2Error("Variação não encontrada.", 404);
  const version = await editableVersionOrThrow(va.version_id);
  return { variation: va, version };
}
// Item 7.2 (reunião 2026-09-14, "Completar o histórico do produto") —
// rótulos legíveis dos efeitos ("comerciais" quando mexem em prazo/preço,
// os demais são de conteúdo) — mesmo vocabulário fechado de
// CATALOG2_EFFECT_TYPES, nunca inventa um tipo novo.
const EFFECT_TYPE_LABEL: Record<string, (value: string) => string> = {
  add_deadline_days: (v) => `+${v} dia(s) de prazo`,
  add_fixed_amount: (v) => `+R$ ${v} no preço`,
  add_percent: (v) => `+${v}% no preço`,
  add_task: (v) => `adiciona a tarefa "${v}"`,
  remove_task: (v) => `remove a tarefa "${v}"`,
  add_step: (v) => `adiciona a etapa "${v}"`,
  require_info: (v) => `exige informação: "${v}"`,
  add_deliverable: (v) => `adiciona entregável: "${v}"`,
};
function describeEffectForHistory(effectType: string, effectValue: string): string {
  return EFFECT_TYPE_LABEL[effectType]?.(effectValue) ?? `${effectType}: ${effectValue}`;
}

// ── Classificações (listar + criar; a ata prevê incluir novos pilares) ──
const classCreate = z.object({ key: z.string().min(2).max(60).regex(/^[a-z0-9_]+$/), name: z.string().min(1).max(120), sort_order: z.number().int().optional() });

router.get("/pillars", async (_req, res, next) => {
  try { res.json({ data: await prisma.catalog2Pillar.findMany({ orderBy: { sort_order: "asc" } }) }); } catch (e) { next(e); }
});
router.post("/pillars", async (req, res, next) => {
  try {
    const d = classCreate.parse(req.body);
    res.status(201).json(await prisma.catalog2Pillar.create({ data: { key: d.key, name: d.name, sort_order: d.sort_order ?? 99 } }));
  } catch (e) { handle(e, res, next); }
});
router.get("/four-f", async (_req, res, next) => {
  try { res.json({ data: await prisma.catalog2FourF.findMany({ orderBy: { sort_order: "asc" } }) }); } catch (e) { next(e); }
});
router.get("/categories", async (_req, res, next) => {
  try { res.json({ data: await prisma.catalog2Category.findMany({ orderBy: { sort_order: "asc" } }) }); } catch (e) { next(e); }
});
router.post("/categories", async (req, res, next) => {
  try {
    const d = classCreate.parse(req.body);
    res.status(201).json(await prisma.catalog2Category.create({ data: { key: d.key, name: d.name, sort_order: d.sort_order ?? 99 } }));
  } catch (e) { handle(e, res, next); }
});
router.get("/specialties", async (_req, res, next) => {
  try { res.json({ data: await prisma.catalog2Specialty.findMany({ orderBy: { sort_order: "asc" } }) }); } catch (e) { next(e); }
});
router.post("/specialties", async (req, res, next) => {
  try {
    const d = classCreate.extend({ max_hourly_rate: z.number().nonnegative().nullish(), hourly_rate_note: z.string().max(500).nullish(), execution_kind: z.enum(CATALOG2_EXECUTION_MODES).optional() }).parse(req.body);
    res.status(201).json(await prisma.catalog2Specialty.create({ data: { key: d.key, name: d.name, sort_order: d.sort_order ?? 99, max_hourly_rate: d.max_hourly_rate ?? null, hourly_rate_note: d.hourly_rate_note ?? null, execution_kind: d.execution_kind ?? "humano" } }));
  } catch (e) { handle(e, res, next); }
});
// Excluir especialidade: só quando NADA a usa (tarefas, etapas, modelos globais). Em uso, a exclusão é recusada e explica onde.
router.delete("/specialties/:id", async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const sp = await prisma.catalog2Specialty.findUnique({ where: { id }, select: { id: true, name: true } });
    if (!sp) throw new Catalog2Error("Especialidade não encontrada.", 404);
    const [tasks, steps, taskModels, stepModels, reviewTasks, quals] = await Promise.all([
      prisma.catalog2Task.count({ where: { specialty_id: id } }),
      prisma.catalog2TaskStep.count({ where: { specialty_id: id } }),
      prisma.catalog2TaskModel.count({ where: { specialty_id: id } }),
      prisma.catalog2StepModel.count({ where: { specialty_id: id } }),
      prisma.catalog2Task.count({ where: { review_specialty_id: id } }),
      prisma.catalog2Task.count({ where: { qualification_specialty_id: id } }),
    ]);
    const inUse = [tasks && `${tasks} tarefa(s)`, steps && `${steps} etapa(s)`, reviewTasks && `${reviewTasks} revisão(ões)`, quals && `${quals} qualificação(ões)`].filter(Boolean);
    if (inUse.length) throw new Catalog2Error(`"${sp.name}" está em uso (${inUse.join(", ")}). Troque a especialidade nesses lugares antes de excluir.`, 409, "specialty_in_use");
    // Modelos globais (biblioteca permanente) que citam a especialidade: só saem com confirmação explícita; ficam SEM especialidade (ids e conteúdo preservados).
    const inModels = [taskModels && `${taskModels} modelo(s) global(is) de tarefa`, stepModels && `${stepModels} modelo(s) global(is) de etapa`].filter(Boolean);
    if (inModels.length && req.query.detach_models !== "1") throw new Catalog2Error(`"${sp.name}" aparece em ${inModels.join(" e ")} do catálogo. Se excluir, esses modelos ficam sem especialidade (o resto deles não muda).`, 409, "specialty_in_models");
    await prisma.catalog2Specialty.delete({ where: { id } });
    await audit(req, "specialty_deleted", { id, name: sp.name });
    res.json({ ok: true });
  } catch (e) { handle(e, res, next); }
});
router.put("/specialties/:id", async (req, res, next) => {
  try {
    const d = z.object({ name: z.string().min(1).max(120).optional(), max_hourly_rate: z.number().nonnegative().nullish(), hourly_rate_note: z.string().max(500).nullish(), execution_kind: z.enum(CATALOG2_EXECUTION_MODES).optional() }).parse(req.body);
    const before = await prisma.catalog2Specialty.findUnique({ where: { id: req.params.id as string }, select: { max_hourly_rate: true } });
    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.catalog2Specialty.update({
        where: { id: req.params.id as string },
        data: {
          ...(d.name !== undefined ? { name: d.name } : {}),
          ...(d.max_hourly_rate !== undefined ? { max_hourly_rate: d.max_hourly_rate } : {}),
          ...(d.hourly_rate_note !== undefined ? { hourly_rate_note: d.hourly_rate_note } : {}),
          ...(d.execution_kind !== undefined ? { execution_kind: d.execution_kind } : {}),
        },
      });
      // Item 4.1 (reunião 2026-09-14): valor/hora afeta o custo humano de
      // qualquer tarefa que use esta especialidade — registra a data REAL da
      // mudança pra ancorar a proteção de 30 dias das cotações que dependem
      // dela. Só grava quando o valor realmente mudou (edição de nome/nota
      // sozinha não é uma alteração comercial).
      if (d.max_hourly_rate !== undefined && d.max_hourly_rate !== before?.max_hourly_rate) {
        await logCommercialChangeEvent(tx, {
          scope: "specialty_rate",
          specialty_id: req.params.id as string,
          actor_user_id: req.user!.id,
          note: "valor/hora da especialidade alterado",
        });
        // Item 8.1: avisa só donos de propostas de produtos que USAM esta
        // especialidade (vínculo real, nunca todo mundo) — intenção gravada
        // NA MESMA transação; o envio em si é assíncrono (worker).
        await notifyValidQuoteOwnersOfCommercialChange(tx, { scope: "specialty_rate", specialtyId: req.params.id as string });
      }
      return u;
    });
    res.json(updated);
  } catch (e) { handle(e, res, next); }
});

// ── Questionários (reunião 2026-09-14, Item 3 — "Cadastro integrado do
// produto"; Item 3.1 — "Edição e preservação dos questionários"). Biblioteca
// reutilizável, mesmo padrão de Catalog2Specialty: listar/criar/editar
// aqui, VINCULAR a uma tarefa em PUT /tasks/:id/questionnaire.
//
// Regra final de compartilhamento (Item 3.1): um questionario e VINCULO por
// referencia ENQUANTO so uma tarefa o usa. No instante em que uma segunda
// tarefa passa a referencia-lo -- outro produto que escolheu "selecionar
// existente", OU o clone automatico de uma nova versao (rascunho) a partir
// de uma PUBLICADA, que herda o mesmo questionnaire_id da tarefa original --
// o conteudo vira efetivamente COMPARTILHADO. A partir dai, as rotas
// genericas abaixo (PUT/POST/DELETE neste bloco) RECUSAM editar/excluir
// diretamente (409 `questionnaire_shared_use_task_edit`): o bloqueio de
// versao publicada sozinho nao bastaria, porque estas rotas mexem no
// registro compartilhado direto, sem saber por qual tarefa/versao a edicao
// esta sendo feita. A unica forma segura de editar um questionario
// compartilhado e PUT /tasks/:id/questionnaire/content, que SEMPRE verifica
// o compartilhamento e cria uma COPIA propria (novo Catalog2Questionnaire)
// pra aquela tarefa antes de aplicar a edicao -- nunca altera o registro
// original usado por outra tarefa/produto/versao publicada. A tarefa antiga
// (a que ficou com o original) e qualquer versao publicada continuam
// enxergando o conteudo de sempre, intacto.
const questionnaireSchema = z.object({ name: z.string().min(1).max(200), description: z.string().max(4000).nullish() });
const questionConfigShape = {
  question_type: z.enum(QUESTION_TYPES).optional(),
  help_text: z.string().max(1000).nullish(),
  options: z.array(z.any()).max(100).nullish(),
  default_value: z.string().max(2000).nullish(),
  validation: z.record(z.any()).nullish(),
  visibility: z.enum(QUESTION_VISIBILITIES).optional(),
  answer_usage: z.enum(ANSWER_USAGES).optional(),
};
const questionSchema = z.object({ key: z.string().min(1).max(60), label: z.string().min(1).max(500), is_required: z.boolean().optional(), sort_order: z.number().int().optional(), ...questionConfigShape });
/** Colunas gravadas de uma pergunta (configuração validada por tipo). */
function questionColumns(d: z.infer<typeof questionSchema>, current?: { question_type: string; options_json: string | null; default_value: string | null; validation_json: string | null }) {
  return normalizeQuestionConfig({ question_type: d.question_type, options: d.options, default_value: d.default_value, validation: d.validation, visibility: d.visibility, answer_usage: d.answer_usage, help_text: d.help_text }, current);
}
/** Pergunta para a API: colunas + opções/validação já interpretadas + rótulo do tipo. */
function serializeQuestion<T extends { options_json: string | null; validation_json: string | null; question_type: string }>(q: T) {
  return { ...q, options: parseOptions(q.options_json), validation: parseValidation(q.validation_json), question_type_label: QUESTION_TYPE_LABEL[q.question_type as keyof typeof QUESTION_TYPE_LABEL] ?? q.question_type };
}
router.get("/question-types", (_req, res) => {
  res.json({ data: QUESTION_TYPES.map((t) => ({ key: t, label: QUESTION_TYPE_LABEL[t] })), visibilities: QUESTION_VISIBILITIES, answer_usages: ANSWER_USAGES });
});
const questionnaireContentSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(4000).nullish(),
  questions: z.array(z.object({
    key: z.string().min(1).max(60),
    label: z.string().min(1).max(500),
    is_required: z.boolean().optional(),
    ...questionConfigShape,
  })).max(50),
});

async function countQuestionnaireReferrers(questionnaireId: string) {
  return prisma.catalog2Task.count({ where: { questionnaire_id: questionnaireId } });
}
// Item 3.2 ("fechar a proteção de edição"): contar referências não bastava
// — um questionário com UMA ÚNICA referência ainda precisa de proteção se
// essa referência pertencer a uma versão PUBLICADA (a tarefa gerada em
// execução já congelou seu próprio conteúdo via briefing_snapshot, mas o
// registro compartilhado em si continuava editável direto, o que violaria
// "versão publicada é imutável" por uma porta lateral). Por isso a checagem
// agora carrega o estado da versão de cada tarefa referenciadora, não só a
// contagem.
async function assertQuestionnaireNotSharedForDirectEdit(questionnaireId: string) {
  const referrers = await prisma.catalog2Task.findMany({
    where: { questionnaire_id: questionnaireId },
    select: { id: true, version: { select: { state: true } } },
  });
  if (referrers.length > 1) {
    throw new Catalog2Error(
      "Este questionário é usado por mais de uma tarefa — edite pelo formulário da tarefa (PUT /tasks/:id/questionnaire/content): isso cria uma cópia própria automaticamente, sem afetar as demais.",
      409,
      "questionnaire_shared_use_task_edit",
    );
  }
  if (referrers.length === 1 && referrers[0].version.state === "publicada") {
    throw new Catalog2Error(
      "Este questionário pertence a uma tarefa de uma versão publicada — versão publicada é imutável. Crie uma nova versão e edite pelo rascunho.",
      409,
      "version_published_immutable",
    );
  }
}
// Item 7.1: as rotas GENÉRICAS de pergunta/questionário (PUT
// /questionnaires/:id, POST .../questions, PUT/DELETE /questions/:id) só
// chegam a executar quando `assertQuestionnaireNotSharedForDirectEdit`
// deixa passar — ou seja, no máximo 1 tarefa referencia este questionário.
// Resolve produto/versão por esse vínculo real (nunca inventado); devolve
// `null` quando o questionário ainda não está vinculado a nenhuma tarefa
// (não há produto a que atribuir o evento — nada é gravado nesse caso).
async function productContextForQuestionnaire(questionnaireId: string): Promise<{ productId: string; versionId: string; taskName: string } | null> {
  const task = await prisma.catalog2Task.findFirst({
    where: { questionnaire_id: questionnaireId },
    select: { name: true, version_id: true, version: { select: { product_id: true } } },
  });
  if (!task) return null;
  return { productId: task.version.product_id, versionId: task.version_id, taskName: task.name };
}

router.get("/questionnaires", async (_req, res, next) => {
  try {
    const rows = await prisma.catalog2Questionnaire.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { questions: true, tasks: true } } },
    });
    res.json({
      data: rows.map((q) => ({
        id: q.id, name: q.name, description: q.description,
        question_count: q._count.questions, task_count: q._count.tasks,
        created_at: q.created_at, updated_at: q.updated_at,
      })),
    });
  } catch (e) { next(e); }
});
router.post("/questionnaires", async (req, res, next) => {
  try {
    const d = questionnaireSchema.parse(req.body);
    const created = await prisma.catalog2Questionnaire.create({
      data: { name: d.name, description: d.description ?? null, created_by_user_id: req.user!.id },
    });
    await audit(req, "questionnaire_created", { id: created.id });
    res.status(201).json({ ...created, questions: [] });
  } catch (e) { handle(e, res, next); }
});
router.get("/questionnaires/:id", async (req, res, next) => {
  try {
    const q = await prisma.catalog2Questionnaire.findUnique({
      where: { id: req.params.id as string },
      include: { questions: { orderBy: { sort_order: "asc" } } },
    });
    if (!q) throw new Catalog2Error("Questionário não encontrado.", 404);
    res.json({ ...q, questions: q.questions.map(serializeQuestion) });
  } catch (e) { handle(e, res, next); }
});
router.put("/questionnaires/:id", async (req, res, next) => {
  try {
    await assertQuestionnaireNotSharedForDirectEdit(req.params.id as string);
    const d = questionnaireSchema.partial().parse(req.body);
    const ctx = await productContextForQuestionnaire(req.params.id as string);
    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.catalog2Questionnaire.update({
        where: { id: req.params.id as string },
        data: { ...(d.name !== undefined ? { name: d.name } : {}), ...(d.description !== undefined ? { description: d.description } : {}) },
      });
      if (ctx) {
        await recordCatalog2ProductHistory(tx, {
          productId: ctx.productId, versionId: ctx.versionId, eventType: "questionnaire_content_updated",
          description: `Questionário "${u.name}" editado diretamente (tarefa "${ctx.taskName}").`,
          after: { name: u.name, description: u.description },
          actorUserId: req.user!.id,
        });
      }
      return u;
    });
    res.json(updated);
  } catch (e) { handle(e, res, next); }
});
router.post("/questionnaires/:id/questions", async (req, res, next) => {
  try {
    const qId = req.params.id as string;
    const exists = await prisma.catalog2Questionnaire.findUnique({ where: { id: qId }, select: { id: true, name: true } });
    if (!exists) throw new Catalog2Error("Questionário não encontrado.", 404);
    await assertQuestionnaireNotSharedForDirectEdit(qId);
    const d = questionSchema.parse(req.body);
    const ctx = await productContextForQuestionnaire(qId);
    const created = await prisma.$transaction(async (tx) => {
      const c = await tx.catalog2QuestionnaireQuestion.create({
        data: { questionnaire_id: qId, key: d.key, label: d.label, is_required: d.is_required ?? true, sort_order: d.sort_order ?? 99, ...questionColumns(d) } as never,
      });
      if (ctx) {
        await recordCatalog2ProductHistory(tx, {
          productId: ctx.productId, versionId: ctx.versionId, eventType: "questionnaire_content_updated",
          description: `Pergunta "${c.label}" adicionada ao questionário "${exists.name}" (tarefa "${ctx.taskName}").`,
          after: { key: c.key, label: c.label },
          actorUserId: req.user!.id,
        });
      }
      return c;
    });
    res.status(201).json(serializeQuestion(created));
  } catch (e) { handle(e, res, next); }
});
router.put("/questions/:id", async (req, res, next) => {
  try {
    const existing = await prisma.catalog2QuestionnaireQuestion.findUnique({ where: { id: req.params.id as string } });
    if (!existing) throw new Catalog2Error("Pergunta não encontrada.", 404);
    await assertQuestionnaireNotSharedForDirectEdit(existing.questionnaire_id);
    const d = questionSchema.partial().parse(req.body);
    const ctx = await productContextForQuestionnaire(existing.questionnaire_id);
    const { question_type: _t, help_text: _h, options: _o, default_value: _d, validation: _v, visibility: _vis, answer_usage: _u, ...plain } = d;
    const touchesConfig = [d.question_type, d.help_text, d.options, d.default_value, d.validation, d.visibility, d.answer_usage].some((x) => x !== undefined);
    const cfg = touchesConfig ? questionColumns(d as z.infer<typeof questionSchema>, existing) : {};
    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.catalog2QuestionnaireQuestion.update({ where: { id: req.params.id as string }, data: { ...plain, ...cfg } as never });
      if (ctx) {
        await recordCatalog2ProductHistory(tx, {
          productId: ctx.productId, versionId: ctx.versionId, eventType: "questionnaire_content_updated",
          description: `Pergunta "${existing.label}" atualizada (tarefa "${ctx.taskName}").`,
          before: { key: existing.key, label: existing.label, is_required: existing.is_required },
          after: { key: u.key, label: u.label, is_required: u.is_required },
          actorUserId: req.user!.id,
        });
      }
      return u;
    });
    res.json(serializeQuestion(updated));
  } catch (e) { handle(e, res, next); }
});
router.delete("/questions/:id", async (req, res, next) => {
  try {
    // Item 3.1: excluir uma pergunta ainda referenciada por outra tarefa
    // (via o mesmo questionário) apagaria conteúdo de quem não pediu —
    // bloqueado igual às demais edições diretas.
    const existing = await prisma.catalog2QuestionnaireQuestion.findUnique({ where: { id: req.params.id as string } });
    if (!existing) throw new Catalog2Error("Pergunta não encontrada.", 404);
    await assertQuestionnaireNotSharedForDirectEdit(existing.questionnaire_id);
    const ctx = await productContextForQuestionnaire(existing.questionnaire_id);
    await prisma.$transaction(async (tx) => {
      await tx.catalog2QuestionnaireQuestion.delete({ where: { id: req.params.id as string } });
      if (ctx) {
        await recordCatalog2ProductHistory(tx, {
          productId: ctx.productId, versionId: ctx.versionId, eventType: "questionnaire_content_updated",
          description: `Pergunta "${existing.label}" removida (tarefa "${ctx.taskName}").`,
          before: { key: existing.key, label: existing.label },
          actorUserId: req.user!.id,
        });
      }
    });
    res.json({ ok: true });
  } catch (e) { handle(e, res, next); }
});
router.put("/questionnaires/:id/questions/order", async (req, res, next) => {
  try {
    await assertQuestionnaireNotSharedForDirectEdit(req.params.id as string);
    const ids = z.array(z.string()).parse(req.body?.order ?? []);
    await prisma.$transaction(ids.map((id, i) => prisma.catalog2QuestionnaireQuestion.update({ where: { id }, data: { sort_order: i + 1 } })));
    res.json({ ok: true });
  } catch (e) { handle(e, res, next); }
});
// Edição SEGURA de um questionário a partir de UMA tarefa (Item 3.1):
// recebe o conteúdo completo desejado (título, descrição, perguntas na
// ordem final) e SEMPRE verifica compartilhamento antes de escrever — se
// o questionário vinculado a esta tarefa também é usado por outra tarefa
// (outro produto, OU a versão publicada da qual este rascunho foi
// clonado), cria uma CÓPIA independente, revincula esta tarefa a ela, e
// só então grava o conteúdo editado — o original usado alhures nunca é
// tocado. Se ninguém mais usa (contagem <= 1), edita no próprio registro.
// Um único save transacional cobre criar/editar/excluir/reordenar
// perguntas de uma vez (o formulário da tarefa manda o estado final).
router.put("/tasks/:id/questionnaire/content", async (req, res, next) => {
  try {
    const taskVersion = await versionOfTask(req.params.id as string);
    const task = await prisma.catalog2Task.findUnique({ where: { id: req.params.id as string }, select: { id: true, name: true, questionnaire_id: true } });
    if (!task) throw new Catalog2Error("Tarefa não encontrada.", 404);
    if (!task.questionnaire_id) throw new Catalog2Error("Esta tarefa não tem questionário vinculado.", 404);
    const d = questionnaireContentSchema.parse(req.body);

    const referrers = await countQuestionnaireReferrers(task.questionnaire_id);
    const forked = referrers > 1;

    const result = await prisma.$transaction(async (tx) => {
      let targetId = task.questionnaire_id as string;
      if (forked) {
        const copy = await tx.catalog2Questionnaire.create({
          data: { name: d.name, description: d.description ?? null, created_by_user_id: req.user!.id },
        });
        targetId = copy.id;
        await tx.catalog2Task.update({ where: { id: task.id }, data: { questionnaire_id: targetId } });
      } else {
        await tx.catalog2Questionnaire.update({ where: { id: targetId }, data: { name: d.name, description: d.description ?? null } });
        await tx.catalog2QuestionnaireQuestion.deleteMany({ where: { questionnaire_id: targetId } });
      }
      for (const [i, q] of d.questions.entries()) {
        await tx.catalog2QuestionnaireQuestion.create({
          data: { questionnaire_id: targetId, key: q.key, label: q.label, is_required: q.is_required ?? true, sort_order: i + 1, ...questionColumns(q as z.infer<typeof questionSchema>) } as never,
        });
      }
      const saved = await tx.catalog2Questionnaire.findUniqueOrThrow({
        where: { id: targetId },
        include: { questions: { orderBy: { sort_order: "asc" } } },
      });
      // Item 7.1: gravado NA MESMA transação — se isto falhar, a cópia/
      // edição do questionário acima também é revertida (nunca fica
      // "meio salvo" sem o registro correspondente).
      await recordCatalog2ProductHistory(tx, {
        productId: taskVersion.product_id, versionId: taskVersion.id, eventType: "questionnaire_content_updated",
        description: `Conteúdo do questionário "${saved.name}" atualizado na tarefa "${task.name}"${forked ? " (cópia própria criada — conteúdo compartilhado preservado)" : ""}.`,
        after: { questionnaire_id: saved.id, question_count: saved.questions.length, forked },
        actorUserId: req.user!.id,
      });
      return saved;
    });

    await audit(req, "task_questionnaire_content_saved", { task_id: task.id, questionnaire_id: result.id, forked });
    res.json({ ok: true, forked, questionnaire: { ...result, questions: result.questions.map(serializeQuestion) } });
  } catch (e) { handle(e, res, next); }
});
// Vincula/desvincula um questionário a UMA tarefa (referência — nunca
// copia perguntas). Respeita versão publicada via versionOfTask.
router.put("/tasks/:id/questionnaire", async (req, res, next) => {
  try {
    const version = await versionOfTask(req.params.id as string);
    const before = await prisma.catalog2Task.findUniqueOrThrow({ where: { id: req.params.id as string }, select: { name: true, questionnaire_id: true } });
    const questionnaireId = req.body?.questionnaire_id === null ? null : z.string().min(1).parse(req.body?.questionnaire_id);
    let questionnaireName: string | null = null;
    if (questionnaireId) {
      const exists = await prisma.catalog2Questionnaire.findUnique({ where: { id: questionnaireId }, select: { id: true, name: true } });
      if (!exists) throw new Catalog2Error("Questionário não encontrado.", 404);
      questionnaireName = exists.name;
    }
    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.catalog2Task.update({ where: { id: req.params.id as string }, data: { questionnaire_id: questionnaireId } });
      if (before.questionnaire_id !== u.questionnaire_id) {
        await recordCatalog2ProductHistory(tx, {
          productId: version.product_id, versionId: version.id,
          eventType: questionnaireId ? "questionnaire_linked" : "questionnaire_unlinked",
          description: questionnaireId
            ? `Questionário "${questionnaireName}" vinculado à tarefa "${before.name}".`
            : `Questionário desvinculado da tarefa "${before.name}".`,
          before: { questionnaire_id: before.questionnaire_id },
          after: { questionnaire_id: u.questionnaire_id },
          actorUserId: req.user!.id,
        });
      }
      return u;
    });
    res.json({ ok: true, questionnaire_id: updated.questionnaire_id });
  } catch (e) { handle(e, res, next); }
});

// ── Módulo de precificação (singleton) ────────────────────────────────
function parseJsonList(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try { const v = JSON.parse(raw); return Array.isArray(v) ? v.map(String) : []; } catch { return []; }
}
function parseJsonMap(raw: string | null | undefined): Record<string, string> {
  if (!raw) return {};
  try { const v = JSON.parse(raw); return v && typeof v === "object" && !Array.isArray(v) ? v : {}; } catch { return {}; }
}
async function pricingSettingsView() {
  const s = (await prisma.catalog2PricingSettings.findUnique({ where: { id: "default" } })) ??
    (await prisma.catalog2PricingSettings.create({ data: { id: "default" } }));
  const custom = await prisma.catalog2PricingComponent.findMany({ orderBy: [{ sort_order: "asc" }, { created_at: "asc" }] });
  return {
    ...s,
    component_order: parseJsonList(s.component_order_json),
    component_base: parseJsonMap(s.component_base_json),
    disabled_components: parseJsonList(s.disabled_components_json),
    custom_components: custom,
  };
}
router.get("/pricing-settings", async (_req, res, next) => {
  try { res.json(await pricingSettingsView()); } catch (e) { next(e); }
});
const COMPONENT_KEYS = ["tax", "commission", "operational", "margin"];
const componentSchema = z.object({
  label: z.string().min(1).max(120),
  percent: z.number().nonnegative().max(1000).nullish(),
  is_active: z.boolean().optional(),
});
async function touchCommercial(req: any, note: string) {
  await prisma.$transaction(async (tx) => {
    await logCommercialChangeEvent(tx, { scope: "global_settings", actor_user_id: req.user!.id, note });
    await notifyValidQuoteOwnersOfCommercialChange(tx, { scope: "global_settings" });
  });
}
router.post("/pricing-components", async (req, res, next) => {
  try {
    const d = componentSchema.parse(req.body);
    const base = d.label.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "componente";
    let key = base; let n = 2;
    while (COMPONENT_KEYS.includes(key) || (await prisma.catalog2PricingComponent.findUnique({ where: { key } }))) key = `${base}-${n++}`;
    const created = await prisma.catalog2PricingComponent.create({ data: { key, label: d.label, percent: d.percent ?? null, is_active: d.is_active ?? true } });
    await touchCommercial(req, `componente de preço "${d.label}" criado`);
    await audit(req, "pricing_component_created", { key });
    res.status(201).json(created);
  } catch (e) { handle(e, res, next); }
});
router.put("/pricing-components/:id", async (req, res, next) => {
  try {
    const d = componentSchema.partial().parse(req.body);
    const u = await prisma.catalog2PricingComponent.update({ where: { id: req.params.id as string }, data: d });
    await touchCommercial(req, `componente de preço "${u.label}" alterado`);
    res.json(u);
  } catch (e) { handle(e, res, next); }
});
router.delete("/pricing-components/:id", async (req, res, next) => {
  try {
    const u = await prisma.catalog2PricingComponent.delete({ where: { id: req.params.id as string } });
    await touchCommercial(req, `componente de preço "${u.label}" removido`);
    res.json({ ok: true });
  } catch (e) { handle(e, res, next); }
});
// Aviso de próxima fatura e tolerância de inadimplência (padrão 5 e 3 dias). Só vale para NOVAS assinaturas: cada assinatura guarda a fotografia do que valia ao nascer.
router.get("/subscription-settings", async (_req, res, next) => {
  try {
    const s = await prisma.catalog2PricingSettings.findUnique({ where: { id: "default" }, select: { subscription_invoice_lead_days: true, subscription_grace_days: true } });
    res.json({ invoice_lead_days: s?.subscription_invoice_lead_days ?? 5, grace_days: s?.subscription_grace_days ?? 3 });
  } catch (e) { handle(e, res, next); }
});
router.put("/subscription-settings", async (req, res, next) => {
  try {
    const d = z.object({ invoice_lead_days: z.number().int().min(1).max(30), grace_days: z.number().int().min(0).max(60) }).parse(req.body);
    await prisma.catalog2PricingSettings.upsert({
      where: { id: "default" }, create: { id: "default", subscription_invoice_lead_days: d.invoice_lead_days, subscription_grace_days: d.grace_days },
      update: { subscription_invoice_lead_days: d.invoice_lead_days, subscription_grace_days: d.grace_days },
    });
    await audit(req, "subscription_settings_updated", d);
    res.json(d);
  } catch (e) { handle(e, res, next); }
});

router.put("/pricing-settings", async (req, res, next) => {
  try {
    const d = z.object({
      tax_percent: z.number().nonnegative().nullish(),
      commission_percent: z.number().nonnegative().nullish(),
      operational_fee_percent: z.number().nonnegative().nullish(),
      profit_margin_percent: z.number().nonnegative().nullish(),
      human_review_percent: z.number().nonnegative().nullish(),
      component_order: z.array(z.string()).max(50).optional(),
      component_base: z.record(z.string(), z.enum(["running", "subtotal", "direct_cost"])).optional(),
      disabled_components: z.array(z.string()).max(50).optional(),
      currency: z.string().length(3).optional(),
      notes: z.string().max(2000).nullish(),
      // Item 16.1 — percentual DEMONSTRATIVO de compensação por inativação,
      // nunca entra em computePricing, nunca gera crédito real (só simulação).
      demo_inactivation_compensation_percent: z.number().min(0).max(100).nullish(),
      demo_inactivation_compensation_note: z.string().max(2000).nullish(),
    }).parse(req.body);
    const data: Record<string, unknown> = { updated_by_user_id: req.user!.id };
    for (const k of ["tax_percent", "commission_percent", "operational_fee_percent", "profit_margin_percent", "human_review_percent", "currency", "notes", "demo_inactivation_compensation_percent", "demo_inactivation_compensation_note"] as const) {
      if (d[k] !== undefined) data[k] = d[k];
    }
    if (d.component_order !== undefined) data.component_order_json = d.component_order.length ? JSON.stringify(d.component_order) : null;
    if (d.component_base !== undefined) data.component_base_json = JSON.stringify(d.component_base);
    if (d.disabled_components !== undefined) data.disabled_components_json = JSON.stringify(d.disabled_components);
    const before = await prisma.catalog2PricingSettings.findUnique({ where: { id: "default" } });
    const s = await prisma.$transaction(async (tx) => {
      const updated = await tx.catalog2PricingSettings.upsert({ where: { id: "default" }, create: { id: "default", ...data }, update: data });
      // Item 4.1 (reunião 2026-09-14): esta config é global — afeta o
      // cálculo de TODOS os produtos. Só grava evento quando um campo que
      // realmente entra na conta (computePricing) mudou de valor — moeda/
      // observações não afetam preço, não contam como alteração comercial.
      const priceAffecting = ["tax_percent", "commission_percent", "operational_fee_percent", "profit_margin_percent", "human_review_percent", "component_order_json", "component_base_json", "disabled_components_json"] as const;
      const changed = priceAffecting.some((k) => (before as Record<string, unknown> | null)?.[k] !== (updated as Record<string, unknown>)[k]);
      if (changed) {
        await logCommercialChangeEvent(tx, { scope: "global_settings", actor_user_id: req.user!.id, note: "configuração comercial global alterada" });
        // Item 8.1: avisa os donos de propostas vigentes ainda protegidas —
        // intenção gravada NA MESMA transação; o envio é assíncrono (worker).
        await notifyValidQuoteOwnersOfCommercialChange(tx, { scope: "global_settings" });
      }
      return updated;
    });
    await audit(req, "pricing_settings_updated", {});
    res.json(await pricingSettingsView());
  } catch (e) { handle(e, res, next); }
});

// Item 16.1 (reunião 2026-09-14, "Desconto por inativação") — simula o
// resultado do percentual DEMONSTRATIVO sobre uma base informada pelo
// próprio Admin Master. NUNCA persiste crédito/estorno, NUNCA toca em
// Catalog2Quote/pagamento — cálculo puro, resposta imediata, sempre
// marcada como simulação. A base definitiva (o que "já foi entregue"
// significa em R$) continua indefinida (Item 5) — o admin informa a base
// manualmente aqui só para ver o percentual em ação.
router.post("/pricing-settings/simulate-inactivation-compensation", async (req, res, next) => {
  try {
    const { base_amount } = z.object({ base_amount: z.number().nonnegative() }).parse(req.body);
    const s = await prisma.catalog2PricingSettings.findUnique({ where: { id: "default" } });
    const percent = s?.demo_inactivation_compensation_percent ?? null;
    if (percent == null) {
      res.status(400).json({ error: "Percentual demonstrativo de compensação ainda não configurado — defina em PUT /pricing-settings antes de simular." });
      return;
    }
    res.json({
      is_simulation: true,
      is_provisional: true,
      base_amount,
      percent,
      simulated_compensation_amount: Math.round(base_amount * (percent / 100) * 100) / 100,
      note: "SIMULAÇÃO — nenhum crédito, estorno ou abatimento real foi gerado. Base definitiva e tratamento do que já foi entregue continuam sem definição (Item 5).",
    });
  } catch (e) { handle(e, res, next); }
});

// ── Overview (tela) ──────────────────────────────────────────────────
// Todos os números vêm de contagem real das tabelas catalog2 — nunca de
// literal. O produto de demonstração ("[TESTE LOCAL] …") é separado da
// comunicação de avanço dos produtos finais importados.
const TEST_LOCAL_PREFIX = "[TESTE LOCAL]";
const testLocalNameFilter = { internal_name: { startsWith: TEST_LOCAL_PREFIX } };
const finalImportedProductFilter = {
  import_origin: { isNot: null },
  NOT: { internal_name: { startsWith: TEST_LOCAL_PREFIX } },
};

router.get("/overview", async (_req, res, next) => {
  try {
    const [
      pillars, fourF, categories, specialties, products, byStatus, draftCount,
      importedCount, testLocalCount, testLocalImportedCount, publishedCount,
      tasksTotal, stepsTotal, tasksInFinalImported, stepsInFinalImported,
      appliedBatchCount, lastApply, origins,
    ] = await Promise.all([
      prisma.catalog2Pillar.count(),
      prisma.catalog2FourF.count(),
      prisma.catalog2Category.count(),
      prisma.catalog2Specialty.count(),
      prisma.catalog2Product.count(),
      prisma.catalog2Product.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.catalog2ProductVersion.count({ where: { state: "rascunho" } }),
      prisma.catalog2Product.count({ where: { import_origin: { isNot: null } } }),
      prisma.catalog2Product.count({ where: testLocalNameFilter }),
      prisma.catalog2Product.count({ where: { import_origin: { isNot: null }, ...testLocalNameFilter } }),
      prisma.catalog2Product.count({ where: { published_version_id: { not: null } } }),
      prisma.catalog2Task.count(),
      prisma.catalog2TaskStep.count(),
      prisma.catalog2Task.count({ where: { version: { product: finalImportedProductFilter } } }),
      prisma.catalog2TaskStep.count({ where: { task: { version: { product: finalImportedProductFilter } } } }),
      prisma.catalog2ImportBatch.count({ where: { mode: "apply" } }),
      prisma.catalog2ImportBatch.findFirst({ where: { mode: "apply" }, orderBy: { started_at: "desc" } }),
      prisma.catalog2ProductImportOrigin.findMany({ select: { pendencies_json: true } }),
    ]);

    const byStatusMap = Object.fromEntries(byStatus.map((s) => [s.status, s._count._all]));
    const productsWithPendencies = (await productIdsWithOpenReadiness()).length;
    // "Produtos finais importados" = importados que NÃO são o produto demo.
    const finalImportedProducts = importedCount - testLocalImportedCount;
    // Número esperado da importação vem do lote real, nunca de "36" fixo.
    const importExpected = lastApply?.expected_products ?? (importedCount || null);

    res.json({
      counts: {
        products,
        pillars,
        four_f: fourF,
        categories,
        specialties,
        draft_versions: draftCount,
        // ── contagens reais para a comunicação de avanço ──
        imported_products: importedCount,
        test_local_products: testLocalCount,
        final_imported_products: finalImportedProducts,
        products_in_preparation: byStatusMap["em_preparacao"] ?? 0,
        products_published: publishedCount,
        tasks: tasksTotal,
        steps: stepsTotal,
        tasks_in_final_imported: tasksInFinalImported,
        steps_in_final_imported: stepsInFinalImported,
        products_with_pendencies: productsWithPendencies,
      },
      import: {
        has_import: appliedBatchCount > 0,
        applied_batch_count: appliedBatchCount,
        last_applied_at: lastApply?.finished_at ?? lastApply?.started_at ?? null,
        expected: importExpected,
        imported_count: importedCount,
        final_imported_count: finalImportedProducts,
        published_count: publishedCount,
        in_preparation_count: byStatusMap["em_preparacao"] ?? 0,
        // Frase derivada — nunca contém número fixo.
        message: appliedBatchCount > 0
          ? `${finalImportedProducts} produto(s) importado(s) para preparação. Aguardando tarefas, prazos, precificação e revisão para publicação.`
          : "Nenhuma importação aplicada ainda.",
      },
      products_by_status: byStatusMap,
      status_meaning: CATALOG2_STATUS_MEANING,
      is_empty: products === 0,
      empty_message: "O novo catálogo está preparado. Nenhum produto importado ainda.",
    });
  } catch (e) { next(e); }
});

// ── Listagem de produtos (busca/filtro/ordenação/paginação) ──────────
const SORTS: Record<string, Prisma.Catalog2ProductOrderByWithRelationInput> = {
  name: { internal_name: "asc" },
  name_desc: { internal_name: "desc" },
  updated: { updated_at: "desc" },
  created: { created_at: "desc" },
  // Ordenação por coluna do Cadastro de Produtos (pedido do usuário
  // 2026-09-25): clicar no cabeçalho alterna crescente/decrescente. Feita no
  // servidor porque a lista é paginada — ordenar só a página visível no
  // navegador daria uma ordem errada. "Tarefas" e "Pendências" não entram:
  // são contagens calculadas, sem coluna no banco para ordenar.
  sequence_number: { sequence_number: "asc" },
  sequence_number_desc: { sequence_number: "desc" },
  category: { category: { name: "asc" } },
  category_desc: { category: { name: "desc" } },
  status: { status: "asc" },
  status_desc: { status: "desc" },
};
router.get("/products", async (req, res, next) => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 120) : "";
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const pillar = typeof req.query.pillar_id === "string" ? req.query.pillar_id : undefined;
    const category = typeof req.query.category_id === "string" ? req.query.category_id : undefined;
    const fourF = typeof req.query.four_f_id === "string" ? req.query.four_f_id : undefined;
    const origin = typeof req.query.origin === "string" ? req.query.origin : undefined;
    const execMode = typeof req.query.execution_mode === "string" ? req.query.execution_mode : undefined;
    // Filtros da importação (bloco 4): origem/revisão da Rose/estado de preparo/tipo de pendência.
    const roseReviewed = req.query.rose_reviewed === "true" ? true : req.query.rose_reviewed === "false" ? false : undefined;
    const reviewState = typeof req.query.review_state === "string" ? req.query.review_state : undefined;
    const pendency = typeof req.query.pendency === "string" ? req.query.pendency : undefined;
    // Aba rápida "Com pendências" (reparo 2026-09 — corrige bug real: a aba
    // não filtrava nada, só reabria "Categorias" por engano). Diferente de
    // `pendency` (uma chave específica): este é "tem QUALQUER pendência".
    const hasPendencies = req.query.has_pendencies === "true";
    const importedOnly = req.query.imported === "true";
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.page_size) || 20));
    const orderBy = SORTS[String(req.query.sort ?? "name")] ?? SORTS.name;

    const where: Prisma.Catalog2ProductWhereInput = {};
    if (status) where.status = status;
    if (pillar) where.pillar_id = pillar;
    if (category) where.category_id = category;
    if (origin) where.origin = origin;
    if (fourF) where.four_f = { some: { four_f_id: fourF } };
    if (execMode) where.versions = { some: { tasks: { some: { execution_mode: execMode } } } };
    if (q) where.OR = [{ internal_name: { contains: q } }, { slug: { contains: q } }];

    const originWhere: Prisma.Catalog2ProductImportOriginWhereInput = {};
    if (roseReviewed !== undefined) originWhere.rose_reviewed = roseReviewed;
    if (reviewState) originWhere.review_state = reviewState;
    if (pendency) originWhere.pendencies_json = { contains: `"${pendency}"` };
    // "Com pendências" = a MESMA conta do checklist do editor (bloqueios + pendentes).
    if (hasPendencies) where.id = { in: await productIdsWithOpenReadiness() };
    if (importedOnly || Object.keys(originWhere).length > 0) where.import_origin = { is: originWhere };

    const listInclude = {
      pillar: { select: { key: true, name: true } },
      category: { select: { key: true, name: true } },
      versions: { select: { id: true, version_number: true, state: true, published_at: true, updated_at: true, summary: true } },
      import_origin: { select: { rose_reviewed: true, review_state: true, pendencies_json: true, area_rose: true, human_edited_at: true, source_index: true } },
      provisional_preview: { select: { image_path: true, price_amount: true, deadline_days: true, modality: true, needs_review: true, included_items_json: true } },
    } satisfies Prisma.Catalog2ProductInclude;

    // Ordenar por PREÇO usa o MESMO valor que a coluna mostra (preço real →
    // simulação → provisório), que é calculado (computeProductReadiness) e
    // não existe como coluna no banco. Como a lista é paginada, calcula-se
    // para todos os produtos do filtro, ordena-se aqui e só então fatia-se a
    // página. O catálogo é pequeno (dezenas de produtos) e /readiness já faz
    // esse mesmo cálculo para todos a cada abertura da tela.
    const sortParam = String(req.query.sort ?? "name");
    let total: number;
    let rows;
    if (sortParam === "price" || sortParam === "price_desc") {
      const all = await prisma.catalog2Product.findMany({ where, include: READINESS_INCLUDE });
      const priced = await Promise.all(all.map(async (prod) => {
        const r = await computeProductReadiness(prod);
        return { id: prod.id, price: (r.price_amount ?? r.pricing_simulation?.price_amount ?? null) as number | null };
      }));
      const dir = sortParam === "price" ? 1 : -1;
      priced.sort((a, b) => (a.price == null && b.price == null ? 0 : a.price == null ? 1 : b.price == null ? -1 : (a.price - b.price) * dir));
      total = priced.length;
      const pageIds = priced.slice((page - 1) * pageSize, page * pageSize).map((x) => x.id);
      const found = await prisma.catalog2Product.findMany({ where: { id: { in: pageIds } }, include: listInclude });
      rows = pageIds.map((id) => found.find((f) => f.id === id)!).filter(Boolean);
    } else {
      [total, rows] = await Promise.all([
        prisma.catalog2Product.count({ where }),
        prisma.catalog2Product.findMany({ where, orderBy: [orderBy, { internal_name: "asc" }, { id: "asc" }], skip: (page - 1) * pageSize, take: pageSize, include: listInclude }),
      ]);
    }
    const NEW_MS = 90 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    res.json({
      data: rows.map((p) => {
        const pub = p.versions.find((v) => v.id === p.published_version_id) ?? null;
        // Descrição: da versão publicada; sem publicação, do rascunho mais
        // recente (ainda não é a descrição "oficial", mas é honesto mostrar
        // o que existe em vez de nada — ver STATUS_LABEL/honestidade no front).
        const draft = p.versions.find((v) => v.state === "rascunho") ?? null;
        const descriptionSource = pub ?? draft;
        const io = p.import_origin;
        return {
          id: p.id,
          sequence_number: p.sequence_number,
          internal_name: p.internal_name,
          slug: p.slug,
          pillar: p.pillar,
          category: p.category,
          origin: p.origin,
          status: p.status,
          status_label: CATALOG2_STATUS_LABEL[p.status as Catalog2Status] ?? p.status,
          summary: descriptionSource?.summary || null,
          published_version_number: pub?.version_number ?? null,
          published_at: pub?.published_at ?? null,
          has_draft: p.versions.some((v) => v.state === "rascunho"),
          is_new: !!pub?.published_at && now - new Date(pub.published_at).getTime() <= NEW_MS,
          updated_at: p.updated_at,
          imported: !!io,
          rose_reviewed: io?.rose_reviewed ?? null,
          review_state: io?.review_state ?? null,
          pendencies: io?.pendencies_json ? safeJsonArray(io.pendencies_json) : [],
          human_edited: !!io?.human_edited_at,
          source_index: io?.source_index ?? null,
          // Merchandising administrável (reunião 10/09) — SEMPRE real (nunca
          // preenchido automaticamente aqui); nulo enquanto nenhum Admin
          // Master tiver decidido um badge para este produto.
          merchandising: {
            is_new: p.merch_is_new,
            is_launch: p.merch_is_launch,
            is_promotion: p.merch_is_promotion,
            is_featured: p.merch_is_featured,
            promotion_text: p.merch_promotion_text,
            promotion_valid_until: p.merch_promotion_valid_until,
            badge_priority: p.merch_badge_priority,
          },
          // Camada de demonstração provisória (reparo 2026-09) — nunca dado
          // comercial real; usada só pra miniatura/preço aparecerem no
          // Cadastro/Catálogo administrativo enquanto o produto não tem
          // conteúdo definitivo. Sempre acompanhada de `is_provisional`.
          provisional_preview: p.provisional_preview
            ? {
                is_provisional: true,
                needs_review: p.provisional_preview.needs_review,
                image_path: p.provisional_preview.image_path,
                price_amount: p.provisional_preview.price_amount,
                deadline_days: p.provisional_preview.deadline_days,
                modality: p.provisional_preview.modality,
                included_items_count: safeJsonArray(p.provisional_preview.included_items_json).length,
              }
            : null,
          // Item 5 (reunião 2026-09-14, "Inativação programada de produtos").
          inactivation_scheduled_at: p.inactivation_scheduled_at,
          inactivation_effective_at: p.inactivation_effective_at,
        };
      }),
      total, page, page_size: pageSize,
    });
  } catch (e) { next(e); }
});

// Link curto do editor: /admin/produtos/<número do produto> -> id interno.
router.get("/products/by-number/:n", async (req, res, next) => {
  try {
    const n = Number(req.params.n);
    if (!Number.isInteger(n)) { res.status(404).json({ error: "Produto não encontrado." }); return; }
    const p = await prisma.catalog2Product.findFirst({ where: { sequence_number: n }, select: { id: true } });
    if (!p) { res.status(404).json({ error: "Produto não encontrado." }); return; }
    res.json({ id: p.id });
  } catch (e) { next(e); }
});

router.get("/products/:id", async (req, res, next) => {
  try { res.json(await getProductDetail(req.params.id as string)); } catch (e) { handle(e, res, next); }
});

// ── Produto: criar / info geral / classificações / status / arquivar ──
const createSchema = z.object({
  internal_name: z.string().min(1).max(200),
  slug: z.string().max(90).nullish(),
  pillar_id: z.string().nullish(),
  category_id: z.string().nullish(),
  origin: z.enum(["existente", "novo", "reativado"]).nullish(),
  task_structure: z.enum(["single", "multiple"]).optional(),
  four_f_ids: z.array(z.string()).max(4).optional(),
});
router.post("/products", async (req, res, next) => {
  try {
    const d = createSchema.parse(req.body);
    const p = await createProduct(d, req.user!.id);
    await audit(req, "product_created", { id: p.id, internal_name: p.internal_name });
    res.status(201).json(await getProductDetail(p.id));
  } catch (e) { handle(e, res, next); }
});

// Nome interno EDITÁVEL (2026-10-02): rota oficial, só administrador, com histórico antes/depois. Não altera título comercial nem slug (sem confirmação).
router.patch("/products/:id/task-structure", async (req, res, next) => {
  try {
    const d = z.object({ task_structure: z.enum(["single", "multiple"]) }).parse(req.body);
    const r = await setProductTaskStructure(req.params.id as string, d.task_structure, req.user!.id);
    if (r.changed) await audit(req, "product_task_structure_updated", { id: req.params.id, task_structure: r.task_structure });
    res.json({ ok: true, ...r });
  } catch (e) { handle(e, res, next); }
});
// Público do produto (C7): lista de marcação — todos, ou qualquer combinação de Company / Agency / Agency Partner, ou só equipe interna.
router.patch("/products/:id/visibility", async (req, res, next) => {
  try {
    const d = z.object({ audiences: z.array(z.string().max(30)).max(10) }).parse(req.body);
    const err = validateAudiences(d.audiences);
    if (err) throw new Catalog2Error(err, 422, "invalid_audience");
    const value = serializeAudiences(d.audiences);
    const before = await prisma.catalog2Product.findUnique({ where: { id: req.params.id as string }, select: { id: true, visibility_mode: true } });
    if (!before) throw new Catalog2Error("Produto não encontrado.", 404);
    const changed = before.visibility_mode !== value;
    if (changed) {
      await prisma.catalog2Product.update({ where: { id: before.id }, data: { visibility_mode: value, visibility_min_partner_level: null } });
      await audit(req, "product_visibility_updated", { id: before.id, from: before.visibility_mode, to: value });
    }
    res.json({ ok: true, changed, visibility_mode: value });
  } catch (e) { handle(e, res, next); }
});
router.patch("/products/:id/internal-name", async (req, res, next) => {
  try {
    const d = z.object({ internal_name: z.string().min(1).max(200), slug: z.string().max(90).nullish(), confirm_slug_change: z.boolean().optional() }).parse(req.body);
    const r = await renameProductInternalName(req.params.id as string, d, req.user!.id);
    if (r.changed) await audit(req, "product_internal_name_updated", { id: req.params.id, internal_name: r.internal_name });
    res.json({ ok: true, ...r });
  } catch (e) { handle(e, res, next); }
});

router.put("/versions/:id", async (req, res, next) => {
  try {
    await editableVersionOrThrow(req.params.id as string);
    const d = z.object({
      title: z.string().min(1).max(200).optional(),
      // Limites (500/4000) são checados por buildCommercialUpdate: conteúdo antigo maior NÃO é cortado nem rejeitado se não mudar.
      summary: z.string().max(30000).nullish(),
      full_description: z.string().max(30000).nullish(),
      deliverables: z.string().max(8000).nullish(),
      client_info: z.string().max(30000).nullish(),
      internal_notes: z.string().max(30000).nullish(),
      target_audience: z.string().max(30000).nullish(),
      commercial_objective: z.string().max(30000).nullish(),
      scope: z.string().max(30000).nullish(),
      results_disclaimer: z.string().max(30000).nullish(),
      change_policy: z.string().max(30000).nullish(),
      included_items: z.array(z.any()).nullish(),
      excluded_items: z.array(z.any()).nullish(),
      client_requirements: z.array(z.any()).nullish(),
      deliverables_summary: z.array(z.any()).nullish(),
      field_visibility: z.record(z.string()).nullish(),
      change_summary: z.string().max(2000).nullish(),
      base_commercial_deadline_days: z.number().int().min(1).max(3650).nullish(),
      base_commercial_deadline_hours: z.number().int().min(1).max(87600).nullish(),
      // Entrega emergencial (B3): oferecer ou não prazo menor por adicional (por etapa).
      emergency_enabled: z.boolean().optional(),
      // Modalidades de contratação (Pedido 2)
      accepts_one_time: z.boolean().optional(),
      accepts_recurring: z.boolean().optional(),
      has_initial_implementation: z.boolean().optional(),
      implementation_rule: z.enum(IMPLEMENTATION_RULES).optional(),
      implementation_blocks_operation: z.boolean().optional(),
      sell_mode: z.enum(SELL_MODES).optional(),
      show_executor_name: z.boolean().optional(),
      // Como o preço é definido: calculado pelas tarefas, fixo informado ou sob consulta.
      pricing_mode: z.enum(PRICING_MODES).optional(),
      manual_price: z.number().positive().max(100000000).nullish(),
      manual_deadline_days: z.number().int().min(1).max(3650).nullish(),
    }).parse(req.body);
    const before = await prisma.catalog2ProductVersion.findUniqueOrThrow({ where: { id: req.params.id as string } });
    const data: Record<string, unknown> = { updated_by_user_id: req.user!.id };
    for (const k of ["title", "summary", "full_description", "change_summary", "base_commercial_deadline_days", "emergency_enabled", "accepts_one_time", "accepts_recurring", "has_initial_implementation", "implementation_rule", "implementation_blocks_operation", "sell_mode", "show_executor_name", "pricing_mode", "manual_price", "manual_deadline_days"] as const) if (d[k] !== undefined) data[k] = d[k];
    // Prazo em horas úteis: guarda as horas e o reflexo em dias úteis (calendário da plataforma). Informar só dias zera as horas.
    if (d.base_commercial_deadline_hours !== undefined) {
      if (d.base_commercial_deadline_hours === null) { data.base_commercial_deadline_hours = null; data.base_commercial_deadline_days = null; }
      else {
        // 24 horas = 1 dia (dia corrido de 24 h). O campo em dias guarda o inteiro (arredondado para cima, mínimo 1) usado pelo restante do sistema.
        data.base_commercial_deadline_hours = d.base_commercial_deadline_hours;
        data.base_commercial_deadline_days = Math.max(1, Math.ceil(d.base_commercial_deadline_hours / 24));
      }
    } else if (d.base_commercial_deadline_days !== undefined) {
      data.base_commercial_deadline_hours = null;
    }
    // Campos comerciais estruturados: persistem de verdade (nada é aceito e descartado em silêncio).
    const commercial = buildCommercialUpdate(d as CommercialInput, before as unknown as Record<string, unknown>);
    Object.assign(data, commercial.data);
    const updated = await prisma.catalog2ProductVersion.update({ where: { id: req.params.id as string }, data });
    // O nome do produto é um só (externo = interno): o título comercial atualiza o nome interno (o endereço/slug não muda).
    if (typeof d.title === "string" && d.title.trim()) {
      await prisma.catalog2Product.updateMany({ where: { id: updated.product_id, NOT: { internal_name: d.title.trim() } }, data: { internal_name: d.title.trim() } });
    }
    // Item 7 (reunião 2026-09-14): descrição legível com o que realmente
    // mudou — reaproveita o MESMO Catalog2VersionEvent já escrito aqui
    // (nunca um segundo mecanismo paralelo pro mesmo evento); só enriquece
    // o texto com um diff antes/depois em vez da nota genérica de sempre.
    const changedLabels: string[] = [];
    if (d.title !== undefined && d.title !== before.title) changedLabels.push(`título alterado de "${before.title}" para "${d.title}"`);
    if (d.summary !== undefined && d.summary !== before.summary) changedLabels.push("resumo atualizado");
    if (d.full_description !== undefined && d.full_description !== before.full_description) changedLabels.push("descrição completa atualizada");
    if (d.base_commercial_deadline_days !== undefined && d.base_commercial_deadline_days !== before.base_commercial_deadline_days) changedLabels.push(`prazo comercial base definido para ${d.base_commercial_deadline_days ?? "sem valor"} dia(s)`);
    if (commercial.changed.length) changedLabels.push(`campos comerciais atualizados (${commercial.changed.join(", ")})`);
    const note = changedLabels.length > 0 ? `Conteúdo editado — ${changedLabels.join("; ")}.` : "Informações gerais editadas.";
    await prisma.catalog2VersionEvent.create({ data: { version_id: updated.id, event_type: "updated", actor_user_id: req.user!.id, note } });
    res.json({ ok: true, saved_fields: Object.keys(data).filter((k) => k !== "updated_by_user_id"), ...serializeCommercialFields(updated as unknown as Record<string, unknown>) });
  } catch (e) { handle(e, res, next); }
});

// Classificação SEGURA: só muda o que veio no corpo. Chave ausente = não mexe; `null` explícito = limpar de propósito.
// (Antes, omitir pillar_id/category_id apagava os dois em silêncio.) PUT e PATCH têm o mesmo comportamento.
const classificationsHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await prisma.catalog2Product.findUnique({ where: { id: req.params.id as string } });
    if (!product) throw new Catalog2Error("Produto não encontrado.", 404);
    const d = z.object({
      pillar_id: z.string().nullish(),
      category_id: z.string().nullish(),
      four_f_ids: z.array(z.string()).max(4).optional(),
    }).parse(req.body);
    const body = (req.body ?? {}) as Record<string, unknown>;
    const pillarGiven = "pillar_id" in body;
    const categoryGiven = "category_id" in body;
    if (pillarGiven && d.pillar_id && !(await prisma.catalog2Pillar.findUnique({ where: { id: d.pillar_id }, select: { id: true } }))) throw new Catalog2Error("O pilar escolhido não existe.", 422, "pillar_not_found");
    if (categoryGiven && d.category_id && !(await prisma.catalog2Category.findUnique({ where: { id: d.category_id }, select: { id: true } }))) throw new Catalog2Error("A categoria escolhida não existe.", 422, "category_not_found");
    if (d.four_f_ids) {
      const found = await prisma.catalog2FourF.count({ where: { id: { in: d.four_f_ids } } });
      if (found !== new Set(d.four_f_ids).size) throw new Catalog2Error("Alguma classificação 4F escolhida não existe.", 422, "four_f_not_found");
    }
    const nextPillar = pillarGiven ? d.pillar_id ?? null : product.pillar_id;
    const nextCategory = categoryGiven ? d.category_id ?? null : product.category_id;
    await prisma.$transaction(async (tx) => {
      if (pillarGiven || categoryGiven) await tx.catalog2Product.update({ where: { id: product.id }, data: { pillar_id: nextPillar, category_id: nextCategory } });
      if (d.four_f_ids) {
        await tx.catalog2ProductFourF.deleteMany({ where: { product_id: product.id } });
        for (const four_f_id of d.four_f_ids) await tx.catalog2ProductFourF.create({ data: { product_id: product.id, four_f_id } });
      }
      // Item 7: dentro da MESMA transação — se a atualização acima falhar
      // (rollback), este registro nunca fica gravado sozinho.
      await recordCatalog2ProductHistory(tx, {
        productId: product.id,
        eventType: "classification_updated",
        description: "Classificação atualizada (pilar/categoria/4F).",
        before: { pillar_id: product.pillar_id, category_id: product.category_id },
        after: { pillar_id: nextPillar, category_id: nextCategory, four_f_ids: d.four_f_ids },
        actorUserId: req.user!.id,
      });
    });
    res.json({ ok: true, pillar_id: nextPillar, category_id: nextCategory, changed: { pillar: pillarGiven, category: categoryGiven, four_f: !!d.four_f_ids } });
  } catch (e) { handle(e, res, next); }
};
router.put("/products/:id/classifications", classificationsHandler);
router.patch("/products/:id/classifications", classificationsHandler);

router.patch("/products/:id/status", async (req, res, next) => {
  try {
    const before = await prisma.catalog2Product.findUnique({ where: { id: req.params.id as string }, select: { status: true } });
    // Item 7.1: alteração + evento confirmados juntos — se a gravação do
    // histórico falhar, a mudança de status também é revertida.
    const updated = await prisma.$transaction(async (tx) => {
      const u = await setProductStatus(req.params.id as string, String(req.body?.status ?? ""), tx);
      if (before && before.status !== u.status) {
        await recordCatalog2ProductHistory(tx, {
          productId: u.id,
          eventType: "status_changed",
          description: `Status alterado de "${CATALOG2_STATUS_LABEL[before.status as Catalog2Status] ?? before.status}" para "${CATALOG2_STATUS_LABEL[u.status as Catalog2Status] ?? u.status}".`,
          before: { status: before.status },
          after: { status: u.status },
          actorUserId: req.user!.id,
        });
        // Item 8 (reunião 2026-09-14, "Notificações dos produtos"): a outra
        // transição real pra "disponivel" (além da 1ª publicação, ver
        // publishVersion) — registra a INTENÇÃO de anunciar na MESMA
        // transação; o envio em si acontece de forma assíncrona/resumível
        // (catalog2-notifications.ts), nunca aqui.
        await maybeCreateCatalog2ActivationJobOnStatusTransition(tx, {
          productId: u.id, beforeStatus: before.status, afterStatus: u.status, publishedVersionId: u.published_version_id,
        });
      }
      return u;
    });
    await audit(req, "product_status", { id: updated.id, status: updated.status });
    res.json({ ok: true, status: updated.status });
  } catch (e) { handle(e, res, next); }
});
router.post("/products/:id/archive", async (req, res, next) => {
  try {
    const updated = await prisma.$transaction(async (tx) => {
      const u = await archiveProduct(req.params.id as string, req.user!.id, tx);
      await recordCatalog2ProductHistory(tx, {
        productId: u.id,
        eventType: "archived",
        description: "Produto arquivado — sai do catálogo, histórico preservado.",
        actorUserId: req.user!.id,
      });
      return u;
    });
    await audit(req, "product_archived", { id: updated.id });
    res.json({ ok: true, status: updated.status });
  } catch (e) { handle(e, res, next); }
});

// ── Inativação programada (Item 5, reunião 2026-09-14) ──────────────────
// Prévia (somente leitura) do que a ação de inativar afetaria — usada pela
// tela de confirmação no Cadastro de Produtos ANTES do admin confirmar.
router.get("/products/:id/inactivation/preview", async (req, res, next) => {
  try {
    res.json(await previewInactivation(req.params.id as string));
  } catch (e) { handle(e, res, next); }
});
router.post("/products/:id/inactivation/schedule", async (req, res, next) => {
  try {
    const note = typeof req.body?.note === "string" ? req.body.note.slice(0, 2000) : undefined;
    // Item 7.1: o `update` do produto (dentro de scheduleInactivation) e o
    // evento de histórico são confirmados juntos — nota: a notificação
    // (SystemAlert) continua sendo um efeito colateral fora desta
    // transação, ver comentário em scheduleInactivation.
    const result = await prisma.$transaction(async (tx) => {
      const r = await scheduleInactivation(req.params.id as string, req.user!.id, note, tx);
      // Item 7: reexecutar a confirmação (idempotente, ver Item 5) NUNCA
      // gera um segundo evento — só a confirmação real (1ª vez) registra.
      if (!r.already_scheduled) {
        await recordCatalog2ProductHistory(tx, {
          productId: r.product.id,
          eventType: "inactivation_scheduled",
          description: `Inativação programada para ${r.product.inactivation_effective_at?.toISOString().slice(0, 10)}.`,
          after: { scheduled_at: r.product.inactivation_scheduled_at, effective_at: r.product.inactivation_effective_at, note },
          actorUserId: req.user!.id,
        });
      }
      return r;
    });
    await audit(req, "product_inactivation_scheduled", { id: result.product.id, already_scheduled: result.already_scheduled });
    res.status(result.already_scheduled ? 200 : 201).json(result);
  } catch (e) { handle(e, res, next); }
});
router.post("/products/:id/inactivation/cancel", async (req, res, next) => {
  try {
    const updated = await prisma.$transaction(async (tx) => {
      const u = await cancelScheduledInactivation(req.params.id as string, tx);
      await recordCatalog2ProductHistory(tx, {
        productId: u.id,
        eventType: "inactivation_cancelled",
        description: "Inativação programada cancelada — produto volta a ficar contratável normalmente.",
        actorUserId: req.user!.id,
      });
      return u;
    });
    await audit(req, "product_inactivation_cancelled", { id: updated.id });
    res.json({ ok: true, product: updated });
  } catch (e) { handle(e, res, next); }
});

// ── Histórico de alterações do produto (Item 7, reunião 2026-09-14) ─────
// Leitura paginada e filtrável — mescla Catalog2ProductHistoryEvent com os
// dois mecanismos já existentes (Catalog2VersionEvent/CommercialChangeEvent),
// ver lib/catalog2-product-history.ts. Nunca há rota de edição/exclusão
// aqui — proteção contra alteração via rota normal é a AUSÊNCIA da rota.
router.get("/products/:id/history", async (req, res, next) => {
  try {
    const product = await prisma.catalog2Product.findUnique({ where: { id: req.params.id as string }, select: { id: true } });
    if (!product) throw new Catalog2Error("Produto não encontrado.", 404);
    const q = z.object({
      page: z.coerce.number().int().min(1).optional(),
      page_size: z.coerce.number().int().min(1).max(100).optional(),
      category: z.string().optional(),
      date_from: z.coerce.date().optional(),
      date_to: z.coerce.date().optional(),
    }).parse(req.query);
    const result = await listCatalog2ProductHistory(product.id, {
      page: q.page,
      pageSize: q.page_size,
      category: q.category,
      dateFrom: q.date_from,
      dateTo: q.date_to,
    });
    res.json(result);
  } catch (e) { handle(e, res, next); }
});
// Resumo por IA de um trecho recente do histórico já registrado (nunca
// gera o registro em si, só resume — se a IA falhar/estiver indisponível o
// histórico continua 100% utilizável via a rota acima).
router.post("/products/:id/history/summary", async (req, res, next) => {
  try {
    const product = await prisma.catalog2Product.findUnique({ where: { id: req.params.id as string }, select: { id: true, internal_name: true } });
    if (!product) throw new Catalog2Error("Produto não encontrado.", 404);
    const recent = await listCatalog2ProductHistory(product.id, { page: 1, pageSize: 50 });
    const result = await summarizeCatalog2ProductHistory(product.internal_name, recent.data);
    res.json(result);
  } catch (e) { handle(e, res, next); }
});

// ── Modalidades de contratação por período (Item 6, reunião 2026-09-14) ──
// Sempre devolve os 4 períodos possíveis (mensal/trimestral/semestral/
// anual), com `configured:false` pros que não têm desconto definido —
// "período sem configuração aparece como não configurado" é o próprio
// formato desta resposta, não um filtro escondido.
router.get("/products/:id/periods", async (req, res, next) => {
  try {
    const product = await prisma.catalog2Product.findUnique({ where: { id: req.params.id as string }, select: { id: true, delivery_recurrence: true } });
    if (!product) throw new Catalog2Error("Produto não encontrado.", 404);
    res.json({ delivery_recurrence: product.delivery_recurrence, data: await listPeriodsForAdmin(product.id) });
  } catch (e) { handle(e, res, next); }
});
// Item 6.1 (reunião 2026-09-14, "Completar a execução dos períodos"): define
// explicitamente se a entrega deste produto é recorrente mês a mês de
// verdade — pré-requisito pra QUALQUER período ficar disponível pra
// contratação (nunca inferido pela presença de um desconto configurado).
router.put("/products/:id/delivery-recurrence", async (req, res, next) => {
  try {
    const d = z.object({ delivery_recurrence: z.enum(["mensal"]).nullable() }).parse(req.body);
    const product = await prisma.catalog2Product.findUnique({ where: { id: req.params.id as string }, select: { id: true, delivery_recurrence: true } });
    if (!product) throw new Catalog2Error("Produto não encontrado.", 404);
    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.catalog2Product.update({ where: { id: product.id }, data: { delivery_recurrence: d.delivery_recurrence } });
      if (product.delivery_recurrence !== u.delivery_recurrence) {
        await recordCatalog2ProductHistory(tx, {
          productId: product.id,
          eventType: "delivery_recurrence_set",
          description: u.delivery_recurrence === "mensal"
            ? "Entrega mensal recorrente ativada — períodos passam a poder ser configurados."
            : "Entrega mensal recorrente desativada — nenhum período fica disponível até ser marcada de novo.",
          before: { delivery_recurrence: product.delivery_recurrence },
          after: { delivery_recurrence: u.delivery_recurrence },
          actorUserId: req.user!.id,
        });
      }
      return u;
    });
    await audit(req, "product_delivery_recurrence_set", { id: product.id, delivery_recurrence: d.delivery_recurrence });
    res.json({ ok: true, delivery_recurrence: updated.delivery_recurrence });
  } catch (e) { handle(e, res, next); }
});
router.put("/products/:id/periods/:period", async (req, res, next) => {
  try {
    const period = req.params.period as string;
    if (!isCatalog2Period(period)) {
      throw new Catalog2Error(`Período inválido: ${period}. Use um de ${CATALOG2_PERIODS.join(", ")}.`, 400, "invalid_period");
    }
    const d = z.object({
      discount_percent: z.number().min(0).max(90),
      is_active: z.boolean().optional(),
    }).parse(req.body);
    const product = await prisma.catalog2Product.findUnique({ where: { id: req.params.id as string }, select: { id: true } });
    if (!product) throw new Catalog2Error("Produto não encontrado.", 404);
    const months = { mensal: 1, trimestral: 3, semestral: 6, anual: 12 }[period];
    // Reunião 18/09/2026: guardamos a configuração dos períodos futuros,
    // mas impedimos que sejam ativados antes da decisão de lançamento.
    // A regra fica no backend para uma chamada direta nunca contornar a UI.
    const effectiveIsActive = isCurrentlyContractablePeriod(period) ? (d.is_active ?? true) : false;
    const before = await prisma.catalog2ProductPeriod.findUnique({ where: { product_id_period: { product_id: product.id, period } } });
    // Item 7.1: upsert + evento de histórico confirmados juntos. O
    // logCommercialChangeEvent (Item 4.1, âncora de proteção de preço —
    // consumidor diferente, nunca lido pelo admin) continua fora desta
    // transação, preservado como já era: mecanismo mais antigo, nunca
    // reescrito por esta revisão.
    const label = before ? `alterado de ${before.discount_percent}% para ${d.discount_percent}%` : `definido em ${d.discount_percent}%`;
    const row = await prisma.$transaction(async (tx) => {
      const r = await tx.catalog2ProductPeriod.upsert({
        where: { product_id_period: { product_id: product.id, period } },
        create: { product_id: product.id, period, months, discount_percent: d.discount_percent, is_active: effectiveIsActive, updated_by_user_id: req.user!.id },
        update: { discount_percent: d.discount_percent, is_active: effectiveIsActive, updated_by_user_id: req.user!.id },
      });
      // Item 7: registro DEDICADO ao histórico legível (antes/depois +
      // categoria filtrável "períodos") — coexiste de propósito com o
      // logCommercialChangeEvent, que serve um consumidor diferente.
      await recordCatalog2ProductHistory(tx, {
        productId: product.id,
        eventType: "period_configured",
        description: `Desconto do período "${period}" ${label}.`,
        before: before ? { discount_percent: before.discount_percent, is_active: before.is_active } : null,
        after: { discount_percent: d.discount_percent, is_active: effectiveIsActive },
        actorUserId: req.user!.id,
      });
      return r;
    });
    await logCommercialChangeEvent(prisma, {
      scope: "product_version", product_id: product.id, actor_user_id: req.user!.id,
      note: `configuração do período "${period}" alterada (desconto ${d.discount_percent}%)`,
    });
    await audit(req, "product_period_configured", { id: product.id, period, discount_percent: d.discount_percent });
    res.json(row);
  } catch (e) { handle(e, res, next); }
});
router.delete("/products/:id/periods/:period", async (req, res, next) => {
  try {
    const period = req.params.period as string;
    if (!isCatalog2Period(period)) throw new Catalog2Error(`Período inválido: ${period}.`, 400, "invalid_period");
    const existing = await prisma.catalog2ProductPeriod.findUnique({ where: { product_id_period: { product_id: req.params.id as string, period } } });
    await prisma.$transaction(async (tx) => {
      await tx.catalog2ProductPeriod.deleteMany({ where: { product_id: req.params.id as string, period } });
      if (existing) {
        await recordCatalog2ProductHistory(tx, {
          productId: req.params.id as string,
          eventType: "period_removed",
          description: `Configuração do período "${period}" removida (era ${existing.discount_percent}% de desconto).`,
          before: { discount_percent: existing.discount_percent, is_active: existing.is_active },
          actorUserId: req.user!.id,
        });
      }
    });
    await audit(req, "product_period_removed", { id: req.params.id, period });
    res.json({ ok: true });
  } catch (e) { handle(e, res, next); }
});

// ── Versões ─────────────────────────────────────────────────────────
router.post("/products/:id/versions", async (req, res, next) => {
  try {
    const v = await newDraftVersion(req.params.id as string, req.user!.id);
    res.status(201).json({ ok: true, version_id: v.id, version_number: v.version_number, state: v.state });
  } catch (e) { handle(e, res, next); }
});
// Descarta um RASCUNHO (ex.: o rascunho criado automaticamente ao abrir o editor
// e que ninguém alterou). Nunca apaga versão publicada nem a vigente.
router.delete("/versions/:id", async (req, res, next) => {
  try {
    const v = await prisma.catalog2ProductVersion.findUnique({ where: { id: req.params.id as string }, include: { product: { select: { published_version_id: true } } } });
    if (!v) throw new Catalog2Error("Versão não encontrada.", 404);
    if (v.state !== "rascunho" || v.product.published_version_id === v.id) throw new Catalog2Error("Só é possível descartar um rascunho.", 409, "not_a_draft");
    await prisma.catalog2ProductVersion.delete({ where: { id: v.id } });
    await audit(req, "version_draft_discarded", { version_id: v.id, product_id: v.product_id, version_number: v.version_number });
    res.json({ ok: true });
  } catch (e) { handle(e, res, next); }
});

// Volta a publicar uma versão ANTERIOR (ela passa a ser a vigente de novo).
router.post("/versions/:id/make-current", async (req, res, next) => {
  try {
    const v = await prisma.catalog2ProductVersion.findUnique({ where: { id: req.params.id as string }, include: { product: true } });
    if (!v) throw new Catalog2Error("Versão não encontrada.", 404);
    if (v.state !== "publicada") throw new Catalog2Error("Só uma versão já publicada pode voltar a ser a vigente. Para rascunhos, use Publicar.", 409, "not_published_before");
    if (v.product.published_version_id === v.id) throw new Catalog2Error("Esta já é a versão vigente.", 409, "already_current");
    await prisma.$transaction(async (tx) => {
      await tx.catalog2Product.update({ where: { id: v.product_id }, data: { published_version_id: v.id } });
      await tx.catalog2VersionEvent.create({ data: { version_id: v.id, event_type: "restored", actor_user_id: req.user!.id, note: "Versão anterior publicada novamente (voltou a ser a vigente)." } });
      await logCommercialChangeEvent(tx, { scope: "product_version", product_id: v.product_id, version_id: v.id, actor_user_id: req.user!.id, note: "versão anterior voltou a ser a vigente" });
      await notifyValidQuoteOwnersOfCommercialChange(tx, { scope: "product_version", productId: v.product_id });
    });
    await audit(req, "version_made_current", { version_id: v.id, product_id: v.product_id, version_number: v.version_number });
    res.json({ ok: true, version_id: v.id, version_number: v.version_number });
  } catch (e) { handle(e, res, next); }
});

// Resumo automático (IA + diferença calculada) do que mudou nesta versão.
router.post("/versions/:id/change-summary", async (req, res, next) => {
  try { res.json(await summarizeVersionChanges(req.params.id as string)); } catch (e) { handle(e, res, next); }
});

router.get("/versions/:id/validate", async (req, res, next) => {
  try { res.json(await validateVersionForPublish(req.params.id as string)); } catch (e) { handle(e, res, next); }
});
router.post("/versions/:id/publish", async (req, res, next) => {
  try {
    const d = z.object({ client_action_id: z.string().max(80).optional(), change_summary: z.string().max(2000).optional(), force: z.boolean().optional(), activate: z.boolean().optional(), confirm_activation: z.boolean().optional() }).parse(req.body ?? {});
    if (d.activate && !d.confirm_activation) throw new Catalog2Error("Para publicar e ativar é preciso confirmar a ativação de forma explícita (confirm_activation).", 422, "activation_not_confirmed");
    const published = await publishVersion(req.params.id as string, req.user!.id, {
      clientActionId: d.client_action_id,
      changeSummary: d.change_summary,
      force: d.force,
      activate: d.activate === true,
    });
    await audit(req, "version_published", { version_id: published.id, product_id: published.product_id, version_number: published.version_number, activated: d.activate === true });
    const after = await prisma.catalog2Product.findUnique({ where: { id: published.product_id }, select: { status: true } });
    res.json({ ok: true, product_status: after?.status, activated: d.activate === true && after?.status === "disponivel", version_id: published.id, published_at: published.published_at, version_number: published.version_number });
  } catch (e) { handle(e, res, next); }
});

// ── Variações e opções ──────────────────────────────────────────────
const variationSchema = z.object({ key: z.string().min(1).max(60), name: z.string().min(1).max(120), is_required: z.boolean().optional(), selection_type: z.enum(["single", "multiple", "quantity"]).optional(), is_active: z.boolean().optional(), sort_order: z.number().int().optional(), notes: z.string().max(2000).nullish() });
router.post("/versions/:id/variations", async (req, res, next) => {
  try {
    const version = await editableVersionOrThrow(req.params.id as string);
    const d = variationSchema.parse(req.body);
    const created = await prisma.$transaction(async (tx) => {
      const c = await tx.catalog2Variation.create({ data: { version_id: req.params.id as string, key: d.key, name: d.name, is_required: d.is_required ?? true, selection_type: d.selection_type ?? "single", is_active: d.is_active ?? true, sort_order: d.sort_order ?? 99, notes: d.notes ?? null } });
      await recordCatalog2ProductHistory(tx, {
        productId: version.product_id, versionId: version.id, eventType: "variation_added",
        description: `Variação "${c.name}" adicionada.`, after: { key: c.key, name: c.name },
        actorUserId: req.user!.id,
      });
      return c;
    });
    res.status(201).json(created);
  } catch (e) { handle(e, res, next); }
});
// Item 7.2: "variação atualizada" cobre nome/obrigatoriedade/ORDEM
// (sort_order) — a reunião pediu "criação, edição, exclusão e ordenação";
// como não existe uma rota de reordenação em lote pra variações (ao
// contrário de tarefas/etapas), a ordem muda pelo mesmo PUT que edita os
// demais campos — o diff abaixo cobre isso especificamente.
router.put("/variations/:id", async (req, res, next) => {
  try {
    const { variation: before, version } = await versionOfVariation(req.params.id as string);
    const d = variationSchema.partial().parse(req.body);
    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.catalog2Variation.update({ where: { id: req.params.id as string }, data: d });
      const changed: string[] = [];
      if (d.name !== undefined && d.name !== before.name) changed.push(`nome de "${before.name}" para "${d.name}"`);
      if (d.is_required !== undefined && d.is_required !== before.is_required) changed.push(d.is_required ? "passou a ser obrigatória" : "deixou de ser obrigatória");
      if (d.sort_order !== undefined && d.sort_order !== before.sort_order) changed.push(`ordem de ${before.sort_order} para ${d.sort_order}`);
      if (d.notes !== undefined && d.notes !== before.notes) changed.push("texto de ajuda atualizado");
      if (d.selection_type !== undefined && d.selection_type !== before.selection_type) changed.push(`tipo de escolha de "${before.selection_type}" para "${d.selection_type}"`);
      if (d.is_active !== undefined && d.is_active !== before.is_active) changed.push(d.is_active ? "ativada" : "desativada");
      if (changed.length > 0) {
        await recordCatalog2ProductHistory(tx, {
          productId: version.product_id, versionId: version.id, eventType: "variation_updated",
          description: `Variação "${u.name}" atualizada — ${changed.join("; ")}.`,
          before: { name: before.name, is_required: before.is_required, sort_order: before.sort_order, notes: before.notes },
          after: { name: u.name, is_required: u.is_required, sort_order: u.sort_order, notes: u.notes },
          actorUserId: req.user!.id,
        });
      }
      return u;
    });
    res.json(updated);
  } catch (e) { handle(e, res, next); }
});
router.delete("/variations/:id", async (req, res, next) => {
  try {
    const { variation: before, version } = await versionOfVariation(req.params.id as string);
    await prisma.$transaction(async (tx) => {
      await tx.catalog2Variation.delete({ where: { id: req.params.id as string } });
      await recordCatalog2ProductHistory(tx, {
        productId: version.product_id, versionId: version.id, eventType: "variation_removed",
        description: `Variação "${before.name}" removida.`, before: { key: before.key, name: before.name },
        actorUserId: req.user!.id,
      });
    });
    res.json({ ok: true });
  } catch (e) { handle(e, res, next); }
});
const optionSchema = z.object({ key: z.string().min(1).max(60), label: z.string().min(1).max(160), sort_order: z.number().int().optional(), is_default: z.boolean().optional(), is_active: z.boolean().optional(), availability: z.enum(OPTION_AVAILABILITY).optional(), availability_note: z.string().max(1000).nullish(), media_url: z.string().max(1_500_000).nullish(), icon_key: z.string().max(60).nullish() });
router.post("/variations/:id/options", async (req, res, next) => {
  try {
    const { variation, version } = await versionOfVariation(req.params.id as string);
    const d = optionSchema.parse(req.body);
    if (await prisma.catalog2VariationOption.findFirst({ where: { key: d.key, variation: { version_id: version.id } }, select: { id: true } })) {
      throw new Catalog2Error(`Já existe uma opção com a chave "${d.key}" nesta versão. Use uma chave diferente para não confundir as escolhas do cliente.`, 422, "duplicate_option_key");
    }
    const created = await prisma.$transaction(async (tx) => {
      const c = await tx.catalog2VariationOption.create({ data: { variation_id: req.params.id as string, ...d, sort_order: d.sort_order ?? 99 } });
      // Variação de uma opção só pode ter UMA opção padrão.
      if (d.is_default && variation.selection_type !== "multiple") await tx.catalog2VariationOption.updateMany({ where: { variation_id: req.params.id as string, id: { not: c.id } }, data: { is_default: false } });
      await recordCatalog2ProductHistory(tx, {
        productId: version.product_id, versionId: version.id, eventType: "option_added",
        description: `Opção "${c.label}" adicionada à variação "${variation.name}".`,
        after: { key: c.key, label: c.label },
        actorUserId: req.user!.id,
      });
      return c;
    });
    res.status(201).json(created);
  } catch (e) { handle(e, res, next); }
});
router.put("/options/:id", async (req, res, next) => {
  try {
    const o = await prisma.catalog2VariationOption.findUnique({ where: { id: req.params.id as string } });
    if (!o) throw new Catalog2Error("Opção não encontrada.", 404);
    const { variation, version } = await versionOfVariation(o.variation_id);
    const d = optionSchema.partial().parse(req.body);
    if (d.key !== undefined && d.key !== o.key && (await prisma.catalog2VariationOption.findFirst({ where: { key: d.key, id: { not: o.id }, variation: { version_id: version.id } }, select: { id: true } }))) {
      throw new Catalog2Error(`Já existe uma opção com a chave "${d.key}" nesta versão.`, 422, "duplicate_option_key");
    }
    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.catalog2VariationOption.update({ where: { id: req.params.id as string }, data: d });
      if (d.is_default && variation.selection_type !== "multiple") await tx.catalog2VariationOption.updateMany({ where: { variation_id: o.variation_id, id: { not: o.id } }, data: { is_default: false } });
      const changed: string[] = [];
      if (d.label !== undefined && d.label !== o.label) changed.push(`rótulo de "${o.label}" para "${d.label}"`);
      if (d.sort_order !== undefined && d.sort_order !== o.sort_order) changed.push(`ordem de ${o.sort_order} para ${d.sort_order}`);
      if (d.is_default !== undefined && d.is_default !== o.is_default) changed.push(d.is_default ? "passou a ser padrão" : "deixou de ser padrão");
      if (d.is_active !== undefined && d.is_active !== o.is_active) changed.push(d.is_active ? "ativada" : "desativada");
      if (d.availability !== undefined && d.availability !== o.availability) changed.push(`disponibilidade de "${o.availability}" para "${d.availability}"`);
      if (changed.length > 0) {
        await recordCatalog2ProductHistory(tx, {
          productId: version.product_id, versionId: version.id, eventType: "option_updated",
          description: `Opção "${u.label}" (variação "${variation.name}") atualizada — ${changed.join("; ")}.`,
          before: { label: o.label, sort_order: o.sort_order, is_default: o.is_default },
          after: { label: u.label, sort_order: u.sort_order, is_default: u.is_default },
          actorUserId: req.user!.id,
        });
      }
      return u;
    });
    res.json(updated);
  } catch (e) { handle(e, res, next); }
});
router.delete("/options/:id", async (req, res, next) => {
  try {
    const o = await prisma.catalog2VariationOption.findUnique({ where: { id: req.params.id as string } });
    if (!o) throw new Catalog2Error("Opção não encontrada.", 404);
    const { variation, version } = await versionOfVariation(o.variation_id);
    await prisma.$transaction(async (tx) => {
      await tx.catalog2VariationOption.delete({ where: { id: req.params.id as string } });
      await recordCatalog2ProductHistory(tx, {
        productId: version.product_id, versionId: version.id, eventType: "option_removed",
        description: `Opção "${o.label}" removida da variação "${variation.name}".`,
        before: { key: o.key, label: o.label },
        actorUserId: req.user!.id,
      });
    });
    res.json({ ok: true });
  } catch (e) { handle(e, res, next); }
});

// ── Efeitos (opção / adicional) — vocabulário fechado ────────────────
// Escopo de cobrança (adicionais, efeitos de variação e condições): quando e quantas vezes o valor é cobrado.
const chargeShape = {
  charge_scope: z.enum(CHARGE_SCOPES).optional(),
  charge_start_cycle: z.number().int().min(0).max(1200).optional(),
  charge_end_cycle: z.number().int().min(0).max(1200).nullish(),
  charge_quantity: z.number().int().min(1).max(100000).nullish(),
  source_task_key: z.string().max(60).nullish(),
  source_step_key: z.string().max(60).nullish(),
  /** Esforço/efeito multiplicado pela quantidade (adicional por unidade, variação por quantidade ou quantidade do pedido). */
  effort_scale_by_quantity: z.boolean().optional(),
};
async function assertChargeMeta(versionId: string, d: { charge_scope?: string; charge_start_cycle?: number; charge_end_cycle?: number | null; source_task_key?: string | null }) {
  if (d.charge_end_cycle != null && d.charge_end_cycle < (d.charge_start_cycle ?? 0)) throw new Catalog2Error("O fim da cobrança não pode ser antes do início.", 422, "invalid_charge_window");
  if (d.source_task_key) {
    const t = await prisma.catalog2Task.findFirst({ where: { version_id: versionId, key: d.source_task_key }, select: { id: true } });
    if (!t) throw new Catalog2Error(`A tarefa "${d.source_task_key}" referenciada na cobrança não existe nesta versão.`, 422, "invalid_charge_task");
  }
}
const effectSchema = z.object({ effect_type: z.enum(CATALOG2_EFFECT_TYPES), effect_value: z.string().min(1).max(500), sort_order: z.number().int().optional(), ...chargeShape });
async function versionOfOption(optionId: string) {
  const o = await prisma.catalog2VariationOption.findUnique({ where: { id: optionId }, include: { variation: { select: { name: true, version_id: true } } } });
  if (!o) throw new Catalog2Error("Opção não encontrada.", 404);
  const version = await editableVersionOrThrow(o.variation.version_id);
  return { option: o, variationName: o.variation.name, version };
}
// Item 7.2: efeitos são os "efeitos COMERCIAIS" de uma opção quando o tipo
// mexe em prazo/preço (add_deadline_days/add_fixed_amount/add_percent) —
// os demais tipos (tarefa/etapa/texto) também são registrados, com a MESMA
// descrição legível já usada no configurador (describeEffectForHistory),
// nunca uma segunda taxonomia.
router.post("/options/:id/effects", async (req, res, next) => {
  try {
    const { option, variationName, version } = await versionOfOption(req.params.id as string);
    const d = effectSchema.parse(req.body);
    await assertChargeMeta(version.id, d);
    const ctx = await buildEffectCtx(version.id);
    const err = validateEffect(d.effect_type, d.effect_value, ctx) ?? validateEffortEffect(d.effect_type, d.effect_value, d, ctx);
    if (err) throw new Catalog2Error(err, 422, "invalid_effect");
    const created = await prisma.$transaction(async (tx) => {
      const c = await tx.catalog2OptionEffect.create({ data: { variation_option_id: req.params.id as string, ...d, sort_order: d.sort_order ?? 99 } });
      await recordCatalog2ProductHistory(tx, {
        productId: version.product_id, versionId: version.id, eventType: "option_effect_added",
        description: `Efeito adicionado à opção "${option.label}" (variação "${variationName}") — ${describeEffectForHistory(c.effect_type, c.effect_value)}.`,
        after: { effect_type: c.effect_type, effect_value: c.effect_value },
        actorUserId: req.user!.id,
      });
      return c;
    });
    res.status(201).json(created);
  } catch (e) { handle(e, res, next); }
});
router.delete("/option-effects/:id", async (req, res, next) => {
  try {
    const e = await prisma.catalog2OptionEffect.findUnique({ where: { id: req.params.id as string } });
    if (!e) throw new Catalog2Error("Efeito não encontrado.", 404);
    const { option, variationName, version } = await versionOfOption(e.variation_option_id);
    await prisma.$transaction(async (tx) => {
      await tx.catalog2OptionEffect.delete({ where: { id: req.params.id as string } });
      await recordCatalog2ProductHistory(tx, {
        productId: version.product_id, versionId: version.id, eventType: "option_effect_removed",
        description: `Efeito removido da opção "${option.label}" (variação "${variationName}") — ${describeEffectForHistory(e.effect_type, e.effect_value)}.`,
        before: { effect_type: e.effect_type, effect_value: e.effect_value },
        actorUserId: req.user!.id,
      });
    });
    res.json({ ok: true });
  } catch (err) { handle(err, res, next); }
});

// ── Adicionais ─────────────────────────────────────────────────────
// O vínculo do adicional com tarefa/etapa só vale se ela pertencer à MESMA versão (e a etapa, à tarefa escolhida).
async function assertAddonTargets(versionId: string, taskId: string | null | undefined, stepId: string | null | undefined) {
  if (taskId) {
    const t = await prisma.catalog2Task.findFirst({ where: { id: taskId, version_id: versionId }, select: { id: true } });
    if (!t) throw new Catalog2Error("A tarefa escolhida para o adicional não pertence a esta versão.", 422, "invalid_addon_target");
  }
  if (stepId) {
    const s = await prisma.catalog2TaskStep.findFirst({ where: { id: stepId, task: { version_id: versionId } }, select: { task_id: true } });
    if (!s) throw new Catalog2Error("A etapa escolhida para o adicional não pertence a esta versão.", 422, "invalid_addon_target");
    if (taskId && s.task_id !== taskId) throw new Catalog2Error("A etapa escolhida não pertence à tarefa escolhida.", 422, "invalid_addon_target");
  }
}
const addonSchema = z.object({
  key: z.string().min(1).max(60), name: z.string().min(1).max(160), description: z.string().max(4000).nullish(),
  sort_order: z.number().int().optional(), is_default_selected: z.boolean().optional(), is_active: z.boolean().optional(),
  base_cost: z.number().nonnegative().nullish(), target_task_id: z.string().nullish(), target_step_id: z.string().nullish(),
  media_url: z.string().max(1_500_000).nullish(), icon_key: z.string().max(60).nullish(),
  // Tipos universais de adicional (padrão "checkbox" = comportamento histórico).
  addon_type: z.enum(ADDON_TYPES).optional(),
  qty_min: z.number().int().min(0).max(100000).nullish(), qty_max: z.number().int().min(1).max(100000).nullish(), qty_step: z.number().int().min(1).max(100000).nullish(),
  unit_label: z.string().max(60).nullish(), unit_base_cost: z.number().nonnegative().nullish(), unit_minutes: z.number().int().min(0).max(1000000).nullish(),
  unit_deadline_days: z.number().nonnegative().max(3650).nullish(), auto_quote_limit: z.number().int().min(1).max(100000).nullish(),
  ...chargeShape,
});
/** Coerência do adicional tipado (limites, unidade, alvo do esforço). Lança erro claro em português. */
function assertAddonConfig(a: { addon_type?: string | null; qty_min?: number | null; qty_max?: number | null; qty_step?: number | null; unit_minutes?: number | null; source_task_key?: string | null }) {
  const type = (a.addon_type ?? "checkbox") as AddonType;
  if (type === "quantity") {
    const min = a.qty_min ?? 1;
    if (min < 1) throw new Catalog2Error("A quantidade mínima de um adicional por quantidade é 1 ou mais.", 422, "invalid_addon_config");
    if (a.qty_max != null && a.qty_max < min) throw new Catalog2Error("A quantidade máxima não pode ser menor que a mínima.", 422, "invalid_addon_config");
  }
  if ((a.unit_minutes ?? 0) > 0 && !a.source_task_key) throw new Catalog2Error("Minutos por unidade exigem a tarefa (ou etapa) que recebe o esforço.", 422, "invalid_addon_config");
}
router.post("/versions/:id/addons", async (req, res, next) => {
  try {
    const version = await editableVersionOrThrow(req.params.id as string);
    const d = addonSchema.parse(req.body);
    await assertAddonTargets(version.id, d.target_task_id, d.target_step_id);
    await assertChargeMeta(version.id, d);
    assertAddonConfig(d);
    const created = await prisma.$transaction(async (tx) => {
      const c = await tx.catalog2Addon.create({ data: { addon_type: d.addon_type ?? "checkbox", qty_min: d.qty_min ?? null, qty_max: d.qty_max ?? null, qty_step: d.qty_step ?? null, unit_label: d.unit_label ?? null, unit_base_cost: d.unit_base_cost ?? null, unit_minutes: d.unit_minutes ?? null, unit_deadline_days: d.unit_deadline_days ?? null, auto_quote_limit: d.auto_quote_limit ?? null, version_id: req.params.id as string, key: d.key, name: d.name, description: d.description ?? null, sort_order: d.sort_order ?? 99, is_default_selected: d.is_default_selected ?? false, is_active: d.is_active ?? true, base_cost: d.base_cost ?? null, target_task_id: d.target_task_id ?? null, target_step_id: d.target_step_id ?? null, ...(d.charge_scope ? { charge_scope: d.charge_scope } : {}), charge_start_cycle: d.charge_start_cycle ?? 0, charge_end_cycle: d.charge_end_cycle ?? null, charge_quantity: d.charge_quantity ?? null, source_task_key: d.source_task_key ?? null, source_step_key: d.source_step_key ?? null } });
      await recordCatalog2ProductHistory(tx, {
        productId: version.product_id, versionId: version.id, eventType: "addon_added",
        description: `Adicional "${c.name}" adicionado.`, after: { key: c.key, name: c.name },
        actorUserId: req.user!.id,
      });
      return c;
    });
    res.status(201).json(created);
  } catch (e) { handle(e, res, next); }
});
async function versionOfAddon(addonId: string) {
  const a = await prisma.catalog2Addon.findUnique({ where: { id: addonId }, include: { version: { select: { id: true, product_id: true } } } });
  if (!a) throw new Catalog2Error("Adicional não encontrado.", 404);
  await editableVersionOrThrow(a.version_id);
  return a;
}
// Item 7.1: "adicionais" — o Item 7 só cobria a criação (`addon_added`);
// atualização e remoção fechadas aqui.
router.put("/addons/:id", async (req, res, next) => {
  try {
    const before = await versionOfAddon(req.params.id as string);
    const d = addonSchema.partial().parse(req.body);
    await assertChargeMeta(before.version_id, { ...before, ...d });
    assertAddonConfig({ ...before, ...d });
    if ("target_task_id" in d || "target_step_id" in d) {
      await assertAddonTargets(before.version_id, "target_task_id" in d ? d.target_task_id : before.target_task_id, "target_step_id" in d ? d.target_step_id : before.target_step_id);
    }
    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.catalog2Addon.update({ where: { id: req.params.id as string }, data: d });
      const changed: string[] = [];
      if (d.name !== undefined && d.name !== before.name) changed.push(`nome de "${before.name}" para "${d.name}"`);
      if (d.base_cost !== undefined && d.base_cost !== before.base_cost) changed.push(`custo base de ${before.base_cost ?? "?"} para ${d.base_cost ?? "?"}`);
      if (d.is_active !== undefined && d.is_active !== before.is_active) changed.push(d.is_active ? "ativado" : "desativado");
      if (changed.length > 0) {
        await recordCatalog2ProductHistory(tx, {
          productId: before.version.product_id, versionId: before.version.id, eventType: "addon_updated",
          description: `Adicional "${u.name}" atualizado — ${changed.join("; ")}.`,
          before: { name: before.name, base_cost: before.base_cost, is_active: before.is_active },
          after: { name: u.name, base_cost: u.base_cost, is_active: u.is_active },
          actorUserId: req.user!.id,
        });
      }
      return u;
    });
    res.json(updated);
  } catch (e) { handle(e, res, next); }
});
router.delete("/addons/:id", async (req, res, next) => {
  try {
    const before = await versionOfAddon(req.params.id as string);
    await prisma.$transaction(async (tx) => {
      await tx.catalog2Addon.delete({ where: { id: req.params.id as string } });
      await recordCatalog2ProductHistory(tx, {
        productId: before.version.product_id, versionId: before.version.id, eventType: "addon_removed",
        description: `Adicional "${before.name}" removido.`, before: { key: before.key, name: before.name },
        actorUserId: req.user!.id,
      });
    });
    res.json({ ok: true });
  } catch (e) { handle(e, res, next); }
});
// Item 7.2: efeitos de adicional fecham a última lacuna declarada no Item
// 7.1 — mesmo padrão/rótulos dos efeitos de opção (describeEffectForHistory).
router.post("/addons/:id/effects", async (req, res, next) => {
  try {
    const addon = await versionOfAddon(req.params.id as string);
    const d = effectSchema.parse(req.body);
    await assertChargeMeta(addon.version_id, d);
    const effectCtx = await buildEffectCtx(addon.version_id);
    const err = validateEffect(d.effect_type, d.effect_value, effectCtx) ?? validateEffortEffect(d.effect_type, d.effect_value, d, effectCtx);
    if (err) throw new Catalog2Error(err, 422, "invalid_effect");
    const created = await prisma.$transaction(async (tx) => {
      const c = await tx.catalog2AddonEffect.create({ data: { addon_id: req.params.id as string, ...d, sort_order: d.sort_order ?? 99 } });
      await recordCatalog2ProductHistory(tx, {
        productId: addon.version.product_id, versionId: addon.version.id, eventType: "addon_effect_added",
        description: `Efeito adicionado ao adicional "${addon.name}" — ${describeEffectForHistory(c.effect_type, c.effect_value)}.`,
        after: { effect_type: c.effect_type, effect_value: c.effect_value },
        actorUserId: req.user!.id,
      });
      return c;
    });
    res.status(201).json(created);
  } catch (e) { handle(e, res, next); }
});
router.delete("/addon-effects/:id", async (req, res, next) => {
  try {
    const e = await prisma.catalog2AddonEffect.findUnique({ where: { id: req.params.id as string } });
    if (!e) throw new Catalog2Error("Efeito não encontrado.", 404);
    const addon = await versionOfAddon(e.addon_id);
    await prisma.$transaction(async (tx) => {
      await tx.catalog2AddonEffect.delete({ where: { id: req.params.id as string } });
      await recordCatalog2ProductHistory(tx, {
        productId: addon.version.product_id, versionId: addon.version.id, eventType: "addon_effect_removed",
        description: `Efeito removido do adicional "${addon.name}" — ${describeEffectForHistory(e.effect_type, e.effect_value)}.`,
        before: { effect_type: e.effect_type, effect_value: e.effect_value },
        actorUserId: req.user!.id,
      });
    });
    res.json({ ok: true });
  } catch (err) { handle(err, res, next); }
});

// ── Portões de aprovação do fluxo (2026-10-02) ───────────────────────────────────────────
router.get("/approval-gate-options", (_req, res) => {
  res.json({
    positions: GATE_POSITIONS.map((k) => ({ key: k, label: GATE_POSITION_LABEL[k] })),
    approvers: APPROVER_KINDS.map((k) => ({ key: k, label: APPROVER_KIND_LABEL[k] })),
    group_modes: GROUP_MODES.map((k) => ({ key: k, label: k === "sequence" ? "Em sequência (um depois do outro)" : "Em paralelo (todos ao mesmo tempo)" })),
  });
});
const gateSchema = z.object({
  key: z.string().min(1).max(60).regex(/^[a-z0-9_\-]+$/, "Use letras minúsculas, números, _ ou -").optional(), name: z.string().min(1).max(160), description: z.string().max(4000).nullish(),
  anchor_task_key: z.string().min(1).max(60), anchor_step_key: z.string().max(60).nullish(),
  position: z.enum(GATE_POSITIONS).optional(), approver_kind: z.enum(APPROVER_KINDS).optional(),
  group_key: z.string().max(60).nullish(), sequence_no: z.number().int().min(0).max(1000).optional(), group_mode: z.enum(GROUP_MODES).optional(),
  rejection_return_step_key: z.string().max(60).nullish(), requires_comment: z.boolean().optional(), is_required: z.boolean().optional(), is_active: z.boolean().optional(), sort_order: z.number().int().optional(),
});
router.post("/versions/:id/approval-gates", async (req, res, next) => {
  try {
    const version = await editableVersionOrThrow(req.params.id as string);
    const d = gateSchema.parse(req.body);
    const err = await validateGateInput(prisma, version.id, d);
    if (err) throw new Catalog2Error(err, 422, "invalid_gate");
    const key = d.key ?? `portao_${Date.now().toString(36)}`;
    if (await prisma.catalog2ApprovalGate.findUnique({ where: { version_id_key: { version_id: version.id, key } }, select: { id: true } })) throw new Catalog2Error(`Já existe um portão com a chave "${key}" nesta versão.`, 422, "duplicate_gate_key");
    const count = await prisma.catalog2ApprovalGate.count({ where: { version_id: version.id } });
    const created = await prisma.$transaction(async (tx) => {
      const c = await tx.catalog2ApprovalGate.create({ data: { version_id: version.id, key, name: d.name, description: d.description ?? null, anchor_task_key: d.anchor_task_key, anchor_step_key: d.anchor_step_key ?? null, position: d.position ?? "before_step", approver_kind: d.approver_kind ?? "client", group_key: d.group_key ?? null, sequence_no: d.sequence_no ?? 0, group_mode: d.group_mode ?? "sequence", rejection_return_step_key: d.rejection_return_step_key ?? null, requires_comment: d.requires_comment ?? false, is_required: d.is_required ?? true, is_active: d.is_active ?? true, sort_order: d.sort_order ?? count + 1 } });
      await recordCatalog2ProductHistory(tx, { productId: version.product_id, versionId: version.id, eventType: "approval_gate_added", description: `Portão de aprovação "${c.name}" adicionado.`, after: { key: c.key, position: c.position, approver_kind: c.approver_kind }, actorUserId: req.user!.id });
      return c;
    });
    res.status(201).json(created);
  } catch (e) { handle(e, res, next); }
});
router.put("/approval-gates/:id", async (req, res, next) => {
  try {
    const cur = await prisma.catalog2ApprovalGate.findUnique({ where: { id: req.params.id as string } });
    if (!cur) throw new Catalog2Error("Portão não encontrado.", 404);
    const version = await editableVersionOrThrow(cur.version_id);
    const d = gateSchema.partial().parse(req.body);
    const merged = { ...cur, ...d, description: d.description !== undefined ? d.description : cur.description };
    const err = await validateGateInput(prisma, version.id, merged);
    if (err) throw new Catalog2Error(err, 422, "invalid_gate");
    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.catalog2ApprovalGate.update({ where: { id: cur.id }, data: d });
      await recordCatalog2ProductHistory(tx, { productId: version.product_id, versionId: version.id, eventType: "approval_gate_updated", description: `Portão de aprovação "${u.name}" atualizado.`, actorUserId: req.user!.id });
      return u;
    });
    res.json(updated);
  } catch (e) { handle(e, res, next); }
});
router.delete("/approval-gates/:id", async (req, res, next) => {
  try {
    const cur = await prisma.catalog2ApprovalGate.findUnique({ where: { id: req.params.id as string } });
    if (!cur) throw new Catalog2Error("Portão não encontrado.", 404);
    const version = await editableVersionOrThrow(cur.version_id);
    await prisma.$transaction(async (tx) => {
      await tx.catalog2ApprovalGate.delete({ where: { id: cur.id } });
      await recordCatalog2ProductHistory(tx, { productId: version.product_id, versionId: version.id, eventType: "approval_gate_removed", description: `Portão de aprovação "${cur.name}" removido.`, before: { key: cur.key }, actorUserId: req.user!.id });
    });
    res.json({ ok: true });
  } catch (e) { handle(e, res, next); }
});

// ── Prazos e SLA estruturados (2026-10-02) ───────────────────────────────────────────────
router.get("/sla-options", (_req, res) => {
  res.json({
    scopes: SLA_SCOPES.map((k) => ({ key: k, label: SLA_SCOPE_LABEL[k] })),
    units: SLA_UNITS.map((k) => ({ key: k, label: SLA_UNIT_LABEL[k] })),
    anchors: SLA_ANCHORS.map((k) => ({ key: k, label: SLA_ANCHOR_LABEL[k] })),
    modalities: SLA_MODALITIES.map((k) => ({ key: k, label: k === "any" ? "Qualquer modalidade" : k === "avulso" ? "Avulso" : "Mensal recorrente" })),
    pause_reasons: Object.entries(SLA_PAUSE_REASONS).map(([key, label]) => ({ key, label })),
  });
});
const slaSchema = z.object({
  key: z.string().min(1).max(60).regex(/^[a-z0-9_\-]+$/, "Use letras minúsculas, números, _ ou -").optional(), name: z.string().min(1).max(160),
  scope_kind: z.enum(SLA_SCOPES), target_key: z.string().max(120).nullish(), modality: z.enum(SLA_MODALITIES).optional(),
  amount: z.number().positive().max(100000), unit: z.enum(SLA_UNITS).optional(), anchor: z.enum(SLA_ANCHORS).optional(),
  description: z.string().max(4000).nullish(), is_active: z.boolean().optional(), sort_order: z.number().int().optional(),
});
router.post("/versions/:id/sla-rules", async (req, res, next) => {
  try {
    const version = await editableVersionOrThrow(req.params.id as string);
    const d = slaSchema.parse(req.body);
    const err = await validateSlaRuleInput(prisma, version.id, d);
    if (err) throw new Catalog2Error(err, 422, "invalid_sla_rule");
    const key = d.key ?? `prazo_${Date.now().toString(36)}`;
    if (await prisma.catalog2SlaRule.findUnique({ where: { version_id_key: { version_id: version.id, key } }, select: { id: true } })) throw new Catalog2Error(`Já existe uma regra de prazo com a chave "${key}" nesta versão.`, 422, "duplicate_sla_key");
    const count = await prisma.catalog2SlaRule.count({ where: { version_id: version.id } });
    const created = await prisma.$transaction(async (tx) => {
      const c = await tx.catalog2SlaRule.create({ data: { version_id: version.id, key, name: d.name, scope_kind: d.scope_kind, target_key: d.target_key ?? null, modality: d.modality ?? "any", amount: d.amount, unit: d.unit ?? "business_days", anchor: d.anchor ?? "prerequisites_valid", description: d.description ?? null, is_active: d.is_active ?? true, sort_order: d.sort_order ?? count + 1 } });
      await recordCatalog2ProductHistory(tx, { productId: version.product_id, versionId: version.id, eventType: "sla_rule_added", description: `Prazo "${c.name}" adicionado (${c.amount} ${SLA_UNIT_LABEL[c.unit as keyof typeof SLA_UNIT_LABEL] ?? c.unit}).`, after: { key: c.key, scope_kind: c.scope_kind, amount: c.amount, unit: c.unit }, actorUserId: req.user!.id });
      return c;
    });
    res.status(201).json(created);
  } catch (e) { handle(e, res, next); }
});
router.put("/sla-rules/:id", async (req, res, next) => {
  try {
    const cur = await prisma.catalog2SlaRule.findUnique({ where: { id: req.params.id as string } });
    if (!cur) throw new Catalog2Error("Regra de prazo não encontrada.", 404);
    const version = await editableVersionOrThrow(cur.version_id);
    const d = slaSchema.partial().parse(req.body);
    const merged = { ...cur, ...d, description: d.description !== undefined ? d.description : cur.description };
    const err = await validateSlaRuleInput(prisma, version.id, merged);
    if (err) throw new Catalog2Error(err, 422, "invalid_sla_rule");
    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.catalog2SlaRule.update({ where: { id: cur.id }, data: d });
      await recordCatalog2ProductHistory(tx, { productId: version.product_id, versionId: version.id, eventType: "sla_rule_updated", description: `Prazo "${u.name}" atualizado.`, actorUserId: req.user!.id });
      return u;
    });
    res.json(updated);
  } catch (e) { handle(e, res, next); }
});
router.delete("/sla-rules/:id", async (req, res, next) => {
  try {
    const cur = await prisma.catalog2SlaRule.findUnique({ where: { id: req.params.id as string } });
    if (!cur) throw new Catalog2Error("Regra de prazo não encontrada.", 404);
    const version = await editableVersionOrThrow(cur.version_id);
    await prisma.$transaction(async (tx) => {
      await tx.catalog2SlaRule.delete({ where: { id: cur.id } });
      await recordCatalog2ProductHistory(tx, { productId: version.product_id, versionId: version.id, eventType: "sla_rule_removed", description: `Prazo "${cur.name}" removido.`, before: { key: cur.key }, actorUserId: req.user!.id });
    });
    res.json({ ok: true });
  } catch (e) { handle(e, res, next); }
});

// ── Escolhas de adicionais (seleção única/múltipla e faixas de quantidade) ──────────────
const addonChoiceSchema = z.object({
  key: z.string().min(1).max(60), label: z.string().min(1).max(160), sort_order: z.number().int().optional(),
  is_default: z.boolean().optional(), is_active: z.boolean().optional(),
  base_cost: z.number().nonnegative().nullish(), minutes: z.number().int().min(0).max(1000000).nullish(), deadline_days: z.number().nonnegative().max(3650).nullish(),
  qty_from: z.number().int().min(1).max(100000).nullish(), qty_to: z.number().int().min(1).max(100000).nullish(), requires_quote: z.boolean().optional(),
});
function assertChoice(addonType: string, d: { qty_from?: number | null; qty_to?: number | null }) {
  if (d.qty_from != null && d.qty_to != null && d.qty_to < d.qty_from) throw new Catalog2Error("O fim da faixa não pode ser menor que o início.", 422, "invalid_addon_choice");
  if (addonType === "range" && d.qty_from == null && d.qty_to == null) throw new Catalog2Error("Uma faixa de quantidade precisa de início e/ou fim.", 422, "invalid_addon_choice");
}
router.post("/addons/:id/choices", async (req, res, next) => {
  try {
    const addon = await versionOfAddon(req.params.id as string);
    const d = addonChoiceSchema.parse(req.body);
    assertChoice(addon.addon_type, d);
    if (await prisma.catalog2AddonChoice.findFirst({ where: { addon_id: addon.id, key: d.key }, select: { id: true } })) throw new Catalog2Error(`Já existe uma escolha com a chave "${d.key}" neste adicional.`, 422, "duplicate_choice_key");
    const created = await prisma.$transaction(async (tx) => {
      const c = await tx.catalog2AddonChoice.create({ data: { addon_id: addon.id, key: d.key, label: d.label, sort_order: d.sort_order ?? 99, is_default: d.is_default ?? false, is_active: d.is_active ?? true, base_cost: d.base_cost ?? null, minutes: d.minutes ?? null, deadline_days: d.deadline_days ?? null, qty_from: d.qty_from ?? null, qty_to: d.qty_to ?? null, requires_quote: d.requires_quote ?? false } });
      await recordCatalog2ProductHistory(tx, { productId: addon.version.product_id, versionId: addon.version.id, eventType: "addon_choice_added", description: `Escolha "${c.label}" adicionada ao adicional "${addon.name}".`, after: { key: c.key, label: c.label }, actorUserId: req.user!.id });
      return c;
    });
    res.status(201).json(created);
  } catch (e) { handle(e, res, next); }
});
router.put("/addon-choices/:id", async (req, res, next) => {
  try {
    const cur = await prisma.catalog2AddonChoice.findUnique({ where: { id: req.params.id as string } });
    if (!cur) throw new Catalog2Error("Escolha não encontrada.", 404);
    const addon = await versionOfAddon(cur.addon_id);
    const d = addonChoiceSchema.partial().parse(req.body);
    assertChoice(addon.addon_type, { ...cur, ...d });
    if (d.key !== undefined && d.key !== cur.key && (await prisma.catalog2AddonChoice.findFirst({ where: { addon_id: addon.id, key: d.key, id: { not: cur.id } }, select: { id: true } }))) throw new Catalog2Error(`Já existe uma escolha com a chave "${d.key}" neste adicional.`, 422, "duplicate_choice_key");
    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.catalog2AddonChoice.update({ where: { id: cur.id }, data: d });
      await recordCatalog2ProductHistory(tx, { productId: addon.version.product_id, versionId: addon.version.id, eventType: "addon_choice_updated", description: `Escolha "${u.label}" do adicional "${addon.name}" atualizada.`, actorUserId: req.user!.id });
      return u;
    });
    res.json(updated);
  } catch (e) { handle(e, res, next); }
});
router.delete("/addon-choices/:id", async (req, res, next) => {
  try {
    const cur = await prisma.catalog2AddonChoice.findUnique({ where: { id: req.params.id as string } });
    if (!cur) throw new Catalog2Error("Escolha não encontrada.", 404);
    const addon = await versionOfAddon(cur.addon_id);
    await prisma.$transaction(async (tx) => {
      await tx.catalog2AddonChoice.delete({ where: { id: cur.id } });
      await recordCatalog2ProductHistory(tx, { productId: addon.version.product_id, versionId: addon.version.id, eventType: "addon_choice_removed", description: `Escolha "${cur.label}" removida do adicional "${addon.name}".`, before: { key: cur.key, label: cur.label }, actorUserId: req.user!.id });
    });
    res.json({ ok: true });
  } catch (e) { handle(e, res, next); }
});

// ── Tarefas e etapas ───────────────────────────────────────────────
// Busca de tarefas de QUALQUER produto/versão — biblioteca de "tarefas
// reutilizáveis" (reunião 2026-09-14, Item 3). Catalog2Task pertence
// exclusivamente a UMA versão (sem tabela de biblioteca própria); "usar uma
// existente" aqui sempre COPIA a tarefa encontrada pra versão de destino
// (ver /versions/:id/tasks/import abaixo) — nunca vincula por referência,
// porque não há como uma linha em catalog2_tasks pertencer a duas versões
// ao mesmo tempo. Isso é intencional e diferente do questionário (que É
// vínculo/referência) — documentado aqui e na UI para não confundir.
router.get("/tasks/search", async (req, res, next) => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 120) : "";
    if (q.length < 2) { res.json({ data: [] }); return; }
    const excludeVersionId = typeof req.query.exclude_version_id === "string" ? req.query.exclude_version_id : undefined;
    const where: Prisma.Catalog2TaskWhereInput = { OR: [{ name: { contains: q } }, { key: { contains: q } }] };
    if (excludeVersionId) where.version_id = { not: excludeVersionId };
    const rows = await prisma.catalog2Task.findMany({
      where,
      take: 25,
      orderBy: { updated_at: "desc" },
      include: {
        specialty: { select: { name: true } },
        questionnaire: { select: { id: true, name: true } },
        version: { select: { version_number: true, state: true, product: { select: { internal_name: true } } } },
        _count: { select: { steps: true } },
      },
    });
    res.json({
      data: rows.map((t) => ({
        id: t.id, key: t.key, name: t.name, execution_mode: t.execution_mode,
        estimated_minutes: t.estimated_minutes, specialty_name: t.specialty?.name ?? null,
        step_count: t._count.steps,
        questionnaire: t.questionnaire ? { id: t.questionnaire.id, name: t.questionnaire.name } : null,
        product_name: t.version.product.internal_name,
        version_label: `v${t.version.version_number} (${t.version.state})`,
      })),
    });
  } catch (e) { next(e); }
});
const taskSchema = z.object({
  key: z.string().min(1).max(60).optional(), name: z.string().min(1).max(200), description: z.string().max(8000).nullish(), objective: z.string().max(4000).nullish(),
  sort_order: z.number().int().optional(), specialty_id: z.string().nullish(),
  execution_mode: z.enum(CATALOG2_EXECUTION_MODES).optional(),
  stage_execution: z.enum(["task", "stage"]).optional(),
  stage_payout_mode: z.enum(["at_end", "per_stage"]).optional(),
  estimated_minutes: z.number().int().nonnegative().nullish(),
  requires_review: z.boolean().optional(), requires_client_approval: z.boolean().optional(), is_conditional: z.boolean().optional(),
  requires_qualification: z.boolean().optional(),
  // Qualificador designado (nulo = líder da área) — modelagem preparada pra mais de um qualificador.
  qualifier_user_id: z.string().nullish(),
  // Ciclo: implementação inicial, recorrente, revalidação, avulso ou sob demanda.
  cycle_type: z.enum(CYCLE_TYPES).optional(),
  repeat_rule: z.enum(REPEAT_RULES).optional(),
  repeat_every_cycles: z.number().int().min(1).max(60).nullish(),
  executor_continuity: z.enum(CONTINUITY_MODES).optional(),
  asset_rule: z.enum(ASSET_RULES).optional(),
  asset_revalidate_days: z.number().int().min(1).max(730).nullish(),
  // Campos operacionais (objetivo, instruções, entradas, saída, critério de aceite, riscos + visibilidade).
  ops: taskOpsSchema,
  // Revisão: quem revisa (nulo = líder responsável), tempo previsto e especialidade usada no custo da revisão.
  reviewer_user_id: z.string().nullish(),
  review_minutes: z.number().int().min(0).max(10000).nullish(),
  review_specialty_id: z.string().nullish(),
  // Qualificação configurável (2026-10-02). Padrão "inherit" = percentual global de sempre.
  qualification_cost_mode: z.enum(["inherit", "percent", "hourly_time", "fixed", "time_and_percent"]).optional(),
  qualification_specialty_id: z.string().nullish(),
  qualification_hourly_rate: z.number().nonnegative().max(100000).nullish(),
  qualification_minutes: z.number().int().min(0).max(100000).nullish(),
  qualification_percent: z.number().min(0).max(1000).nullish(),
  qualification_fixed_amount: z.number().nonnegative().max(100000000).nullish(),
  qualifier_kind: z.enum(["area_leader", "designated_leader", "nomad"]).optional(),
});
const taskOpsValue = (v: unknown) => { const n = normalizeTaskOps(v); return n ? (n as Prisma.InputJsonValue) : Prisma.DbNull; };
/** Campos de proteção contra duplicidade que qualquer criação de modelo global aceita. */
function guardInput(req: Request, key?: string | null) {
  const b = (req.body ?? {}) as Record<string, unknown>;
  const resolution = b.duplicate_resolution === "use_existing" || b.duplicate_resolution === "create_anyway" ? (b.duplicate_resolution as "use_existing" | "create_anyway") : null;
  if (b.duplicate_resolution != null && !resolution) throw new Catalog2Error("duplicate_resolution inválido: use use_existing ou create_anyway.", 422, "duplicate_resolution_invalid");
  return {
    clientActionId: typeof b.client_action_id === "string" && b.client_action_id.length <= 80 ? b.client_action_id : null,
    resolution,
    existingModelId: typeof b.duplicate_model_id === "number" ? b.duplicate_model_id : null,
    justification: typeof b.duplicate_justification === "string" ? b.duplicate_justification : null,
    key: key ?? null,
    userId: req.user!.id,
  };
}

/** Atualizar o MODELO GLOBAL altera todos os produtos que o usam (nas próximas versões): exige confirmação clara. */
async function assertModelUpdateConfirmed(kind: "task" | "step", modelId: number, confirmed: boolean) {
  if (confirmed) return;
  const used = kind === "task"
    ? await prisma.catalog2Task.findMany({ where: { task_model_id: modelId }, select: { version: { select: { product_id: true } } } })
    : await prisma.catalog2TaskStep.findMany({ where: { step_model_id: modelId }, select: { task: { select: { version: { select: { product_id: true } } } } } });
  const products = new Set(used.map((u) => ("version" in u ? u.version.product_id : (u as { task: { version: { product_id: string } } }).task.version.product_id)));
  throw new Catalog2Error(
    `Você está alterando o modelo global ${kind === "task" ? "Tarefa" : "Etapa"} #${modelId}, usado em ${products.size} produto(s). Isso vale para todos eles nas próximas versões. Para alterar só este produto, use "somente neste produto"; para confirmar a alteração global, envie confirm_model_update.`,
    422, "model_update_not_confirmed",
  );
}
const stepOpsValue = (v: unknown) => { const n = normalizeStepOps(v); return n ? (n as Prisma.InputJsonValue) : Prisma.DbNull; };
// Campos do modelo global de tarefa que uma edição "no modelo" pode levar junto.
const TASK_MODEL_FIELDS = ["name", "description", "execution_mode", "specialty_id", "estimated_minutes", "is_conditional", "requires_client_approval", "requires_qualification", "cycle_type", "repeat_rule", "repeat_every_cycles", "executor_continuity", "asset_rule", "asset_revalidate_days", "ops", "requires_review", "review_minutes", "review_specialty_id", "qualification_cost_mode", "qualification_specialty_id", "qualification_hourly_rate", "qualification_minutes", "qualification_percent", "qualification_fixed_amount", "qualifier_kind"] as const;
router.post("/versions/:id/tasks", async (req, res, next) => {
  try {
    const version = await editableVersionOrThrow(req.params.id as string);
    const d = taskSchema.parse(req.body);
    await assertCanAddBaseTask(prisma, version.id, { conditional: !!d.is_conditional });
    const gin = guardInput(req, d.key ?? null);
    let replayedTask: unknown = null;
    const created = await prisma.$transaction(async (tx) => {
      const g = await createModelGuarded(tx, "task", { name: d.name, description: d.description, execution_mode: d.execution_mode, specialty_id: d.specialty_id, estimated_minutes: d.estimated_minutes, is_conditional: d.is_conditional, requires_client_approval: d.requires_client_approval, requires_qualification: d.requires_qualification, cycle_type: d.cycle_type, repeat_rule: d.repeat_rule, repeat_every_cycles: d.repeat_every_cycles, executor_continuity: d.executor_continuity, asset_rule: d.asset_rule, asset_revalidate_days: d.asset_revalidate_days, ops: d.ops, requires_review: d.requires_review, review_minutes: d.review_minutes, review_specialty_id: d.review_specialty_id, qualification_cost_mode: d.qualification_cost_mode, qualification_specialty_id: d.qualification_specialty_id, qualification_hourly_rate: d.qualification_hourly_rate, qualification_minutes: d.qualification_minutes, qualification_percent: d.qualification_percent, qualification_fixed_amount: d.qualification_fixed_amount, qualifier_kind: d.qualifier_kind }, gin);
      if (g.replayed) {
        const prev = await tx.catalog2Task.findFirst({ where: { version_id: req.params.id as string, task_model_id: g.model.id }, orderBy: { created_at: "desc" } });
        if (prev) { replayedTask = prev; return prev; }
      }
      const model = g.model as Awaited<ReturnType<typeof createTaskModel>>;
      if (!g.created) {
        // modelo existente escolhido: a tarefa nasce a partir do próprio modelo global
        await syncTaskModelSteps(tx, model.id);
        const max = await tx.catalog2Task.aggregate({ where: { version_id: req.params.id as string }, _max: { sort_order: true } });
        const t = await addTaskFromModel(tx, version.id, model, (max._max.sort_order ?? 0) + 1);
        await recordCatalog2ProductHistory(tx, { productId: version.product_id, versionId: version.id, eventType: "task_added", description: `Tarefa "${t.name}" adicionada a partir do modelo global Tarefa #${model.id}.`, after: { key: t.key, name: t.name, task_model_id: model.id }, actorUserId: req.user!.id });
        return t;
      }
      const takenKeys = new Set((await tx.catalog2Task.findMany({ where: { version_id: req.params.id as string }, select: { key: true } })).map((t) => t.key));
      const c = await tx.catalog2Task.create({ data: { task_model_id: model.id, task_model_revision: model.revision, requires_qualification: d.requires_qualification ?? false, cycle_type: d.cycle_type ?? "recorrente", repeat_rule: d.repeat_rule ?? "all_cycles", repeat_every_cycles: d.repeat_every_cycles ?? null, executor_continuity: d.executor_continuity ?? "not_allowed", asset_rule: d.asset_rule ?? "first_only", asset_revalidate_days: d.asset_revalidate_days ?? null, qualifier_user_id: d.qualifier_user_id ?? null, qualification_cost_mode: d.qualification_cost_mode ?? "inherit", qualification_specialty_id: d.qualification_specialty_id ?? null, qualification_hourly_rate: d.qualification_hourly_rate ?? null, qualification_minutes: d.qualification_minutes ?? null, qualification_percent: d.qualification_percent ?? null, qualification_fixed_amount: d.qualification_fixed_amount ?? null, qualifier_kind: d.qualifier_kind ?? "area_leader", reviewer_user_id: d.reviewer_user_id ?? null, review_minutes: d.review_minutes ?? null, review_specialty_id: d.review_specialty_id ?? null, ops: taskOpsValue(d.ops), version_id: req.params.id as string, key: d.key ?? autoKey("tarefa", model.id, takenKeys), name: d.name, description: d.description ?? null, objective: d.objective ?? null, sort_order: d.sort_order ?? 99, specialty_id: d.specialty_id ?? null, execution_mode: d.execution_mode ?? "humano", estimated_minutes: d.estimated_minutes ?? null, requires_review: d.requires_review ?? false, requires_client_approval: d.requires_client_approval ?? false, is_conditional: d.is_conditional ?? false } });
      await recordCatalog2ProductHistory(tx, {
        productId: version.product_id, versionId: version.id, eventType: "task_added",
        description: `Tarefa "${c.name}" adicionada.`, after: { key: c.key, name: c.name },
        actorUserId: req.user!.id,
      });
      return c;
    });
    res.status(replayedTask ? 200 : 201).json(created);
  } catch (e) { handle(e, res, next); }
});
router.put("/tasks/:id", async (req, res, next) => {
  try {
    const version = await versionOfTask(req.params.id as string);
    const before = await prisma.catalog2Task.findUniqueOrThrow({ where: { id: req.params.id as string } });
    const d = taskSchema.partial().parse(req.body);
    // "Alterar somente neste produto" (padrão) x "Atualizar modelo global".
    const scope: "product" | "model" = req.body?.scope === "model" ? "model" : "product";
    if (scope === "model" && before.task_model_id != null) await assertModelUpdateConfirmed("task", before.task_model_id, req.body?.confirm_model_update === true);
    const data: Omit<typeof d, "ops"> & { ops?: Prisma.InputJsonValue | typeof Prisma.DbNull; task_model_revision?: number; effort_is_provisional?: boolean; effort_source?: string; effort_provisional_reason?: string | null } = { ...d, ops: undefined };
    if ("ops" in d) data.ops = taskOpsValue(d.ops);
    // Reunião 10/09 ("36 produtos funcionalmente completos para teste"):
    // um humano editando especialidade/tempo aqui pelo admin SEMPRE
    // "gradua" a tarefa pra dado real revisado — nunca deixa um valor
    // editado manualmente marcado como provisório, e nunca o script de
    // preenchimento provisório sobrescreve de volta (ver regra 14).
    if ("specialty_id" in d || "estimated_minutes" in d) {
      data.effort_is_provisional = false;
      data.effort_source = "human_reviewed";
      data.effort_provisional_reason = null;
    }
    const updated = await prisma.$transaction(async (tx) => {
      if (scope === "model" && before.task_model_id != null) {
        const cur = await tx.catalog2TaskModel.findUniqueOrThrow({ where: { id: before.task_model_id } });
        const patch: Record<string, unknown> = {};
        for (const k of TASK_MODEL_FIELDS) if (k in d) patch[k] = (d as Record<string, unknown>)[k];
        if ("ops" in d) patch.ops = taskOpsValue(d.ops);
        const merged = { ...cur, ...patch } as typeof cur;
        const nm = await tx.catalog2TaskModel.update({ where: { id: cur.id }, data: { ...patch, signature: taskModelSignature(merged), revision: { increment: 1 } } });
        data.task_model_revision = nm.revision;
      }
      const u = await tx.catalog2Task.update({ where: { id: req.params.id as string }, data });
      const changed: string[] = [];
      if (scope === "model" && before.task_model_id != null) changed.push(`modelo global Tarefa #${before.task_model_id} atualizado`);
      if (d.name !== undefined && d.name !== before.name) changed.push(`nome de "${before.name}" para "${d.name}"`);
      if (d.specialty_id !== undefined && d.specialty_id !== before.specialty_id) changed.push("especialidade");
      if (d.estimated_minutes !== undefined && d.estimated_minutes !== before.estimated_minutes) changed.push(`tempo estimado de ${before.estimated_minutes ?? "?"} para ${d.estimated_minutes ?? "?"} min`);
      if (d.specialty_id !== undefined && d.specialty_id !== before.specialty_id) changed.push("especialidade alterada");
      if (changed.length > 0) {
        await recordCatalog2ProductHistory(tx, {
          productId: version.product_id, versionId: version.id, eventType: "task_updated",
          description: `Tarefa "${u.name}" atualizada — ${changed.join("; ")}.`,
          before: { name: before.name, specialty_id: before.specialty_id, estimated_minutes: before.estimated_minutes },
          after: { name: u.name, specialty_id: u.specialty_id, estimated_minutes: u.estimated_minutes },
          actorUserId: req.user!.id,
        });
      }
      return u;
    });
    res.json(updated);
  } catch (e) { handle(e, res, next); }
});
router.delete("/tasks/:id", async (req, res, next) => {
  try {
    const version = await versionOfTask(req.params.id as string);
    const before = await prisma.catalog2Task.findUniqueOrThrow({ where: { id: req.params.id as string } });
    await prisma.$transaction(async (tx) => {
      await tx.catalog2Task.delete({ where: { id: req.params.id as string } });
      await recordCatalog2ProductHistory(tx, {
        productId: version.product_id, versionId: version.id, eventType: "task_removed",
        description: `Tarefa "${before.name}" removida.`, before: { key: before.key, name: before.name },
        actorUserId: req.user!.id,
      });
    });
    res.json({ ok: true });
  } catch (e) { handle(e, res, next); }
});
// ── Entregáveis e anexos estruturados da tarefa (Pedido 3, fase 3) ───────────
async function versionOfDeliverable(id: string) {
  const d = await prisma.catalog2TaskDeliverable.findUnique({ where: { id }, include: { task: { select: { id: true, name: true, version_id: true } } } });
  if (!d) throw new Catalog2Error("Entregável não encontrado.", 404);
  const version = await editableVersionOrThrow(d.task.version_id);
  return { d, version };
}
async function assertStepOfTask(stepId: string | null | undefined, taskId: string) {
  if (!stepId) return;
  const s = await prisma.catalog2TaskStep.findFirst({ where: { id: stepId, task_id: taskId }, select: { id: true } });
  if (!s) throw new Catalog2Error("A etapa escolhida não pertence a esta tarefa.", 422, "invalid_deliverable_step");
}
router.post("/tasks/:id/deliverables", async (req, res, next) => {
  try {
    const version = await versionOfTask(req.params.id as string);
    const task = await prisma.catalog2Task.findUniqueOrThrow({ where: { id: req.params.id as string }, select: { id: true, name: true } });
    const d = deliverableInputSchema.parse(req.body);
    await assertStepOfTask(d.step_id, task.id);
    const taken = new Set((await prisma.catalog2TaskDeliverable.findMany({ where: { task_id: task.id }, select: { key: true } })).map((x) => x.key));
    let key = d.key;
    if (key && taken.has(key)) throw new Catalog2Error(`Já existe um entregável com a chave "${key}" nesta tarefa.`, 422, "duplicate_deliverable_key");
    if (!key) { let n = taken.size + 1; while (taken.has(`entregavel-${n}`)) n++; key = `entregavel-${n}`; }
    const created = await prisma.$transaction(async (tx) => {
      const c = await tx.catalog2TaskDeliverable.create({
        data: { task_id: task.id, step_id: d.step_id ?? null, key: key!, name: d.name, description: d.description ?? null, type: d.type, responsible: d.responsible, is_required: d.is_required, requires_approval: d.requires_approval, visibility: d.visibility, sort_order: d.sort_order ?? taken.size + 1 },
      });
      await recordCatalog2ProductHistory(tx, { productId: version.product_id, versionId: version.id, eventType: "deliverable_added", description: `Entregável "${c.name}" adicionado à tarefa "${task.name}".`, after: { key: c.key, name: c.name, type: c.type, responsible: c.responsible }, actorUserId: req.user!.id });
      return c;
    });
    res.status(201).json(created);
  } catch (e) { handle(e, res, next); }
});
router.put("/deliverables/:id", async (req, res, next) => {
  try {
    const { d: before, version } = await versionOfDeliverable(req.params.id as string);
    const d = deliverableInputSchema.partial().parse(req.body);
    if ("step_id" in d) await assertStepOfTask(d.step_id, before.task_id);
    if (d.key !== undefined && d.key !== before.key && (await prisma.catalog2TaskDeliverable.findFirst({ where: { task_id: before.task_id, key: d.key, id: { not: before.id } }, select: { id: true } }))) {
      throw new Catalog2Error(`Já existe um entregável com a chave "${d.key}" nesta tarefa.`, 422, "duplicate_deliverable_key");
    }
    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.catalog2TaskDeliverable.update({ where: { id: before.id }, data: d });
      await recordCatalog2ProductHistory(tx, { productId: version.product_id, versionId: version.id, eventType: "deliverable_updated", description: `Entregável "${u.name}" da tarefa "${before.task.name}" atualizado.`, before: { name: before.name, type: before.type, responsible: before.responsible }, after: { name: u.name, type: u.type, responsible: u.responsible }, actorUserId: req.user!.id });
      return u;
    });
    res.json(updated);
  } catch (e) { handle(e, res, next); }
});
router.delete("/deliverables/:id", async (req, res, next) => {
  try {
    const { d: before, version } = await versionOfDeliverable(req.params.id as string);
    await prisma.$transaction(async (tx) => {
      await tx.catalog2TaskDeliverable.delete({ where: { id: before.id } });
      await recordCatalog2ProductHistory(tx, { productId: version.product_id, versionId: version.id, eventType: "deliverable_removed", description: `Entregável "${before.name}" removido da tarefa "${before.task.name}".`, before: { key: before.key, name: before.name }, actorUserId: req.user!.id });
    });
    res.json({ ok: true });
  } catch (e) { handle(e, res, next); }
});

router.post("/tasks/:id/duplicate", async (req, res, next) => {
  try {
    const dupVersion = await versionOfTask(req.params.id as string);
    const src = await prisma.catalog2Task.findUniqueOrThrow({ where: { id: req.params.id as string }, include: { steps: true, ai: true, deliverables: true } });
    await assertCanAddBaseTask(prisma, src.version_id, { conditional: src.is_conditional });
    void dupVersion;
    const dup = await prisma.$transaction(async (tx) => {
      const dupModel = await findOrCreateTaskModel(tx, { name: `${src.name} (cópia)`, description: src.description, execution_mode: src.execution_mode, specialty_id: src.specialty_id, estimated_minutes: src.estimated_minutes, questionnaire_id: src.questionnaire_id, is_conditional: src.is_conditional, requires_client_approval: src.requires_client_approval });
      const t = await tx.catalog2Task.create({
        data: {
          task_model_id: dupModel.id, task_model_revision: dupModel.revision, requires_qualification: src.requires_qualification, stage_execution: src.stage_execution, stage_payout_mode: src.stage_payout_mode, cycle_type: src.cycle_type, repeat_rule: src.repeat_rule, repeat_every_cycles: src.repeat_every_cycles, executor_continuity: src.executor_continuity, asset_rule: src.asset_rule, asset_revalidate_days: src.asset_revalidate_days,
          qualifier_user_id: src.qualifier_user_id, qualification_mode: src.qualification_mode, qualification_min_approvals: src.qualification_min_approvals, qualification_cost_mode: src.qualification_cost_mode, qualification_specialty_id: src.qualification_specialty_id, qualification_hourly_rate: src.qualification_hourly_rate, qualification_minutes: src.qualification_minutes, qualification_percent: src.qualification_percent, qualification_fixed_amount: src.qualification_fixed_amount, qualifier_kind: src.qualifier_kind,
          reviewer_user_id: src.reviewer_user_id, review_minutes: src.review_minutes, review_specialty_id: src.review_specialty_id,
          ops: (src.ops ?? undefined) as Prisma.InputJsonValue | undefined,
          version_id: src.version_id, key: `${src.key}-copia-${Date.now().toString(36)}`, name: `${src.name} (cópia)`,
          description: src.description, objective: src.objective, sort_order: src.sort_order + 1,
          specialty_id: src.specialty_id, execution_mode: src.execution_mode, estimated_minutes: src.estimated_minutes,
          requires_review: src.requires_review, requires_client_approval: src.requires_client_approval, is_conditional: src.is_conditional,
        },
      });
      for (const s of src.steps) await tx.catalog2TaskStep.create({ data: { step_model_id: s.step_model_id, step_model_revision: s.step_model_revision, purpose: s.purpose, execution_mode: s.execution_mode, completion_criteria: s.completion_criteria, task_id: t.id, ops: (s.ops ?? undefined) as Prisma.InputJsonValue | undefined, first_execution_only: s.first_execution_only, skip_when_same_executor: s.skip_when_same_executor, depends_on_json: s.depends_on_json, executor_policy: s.executor_policy, executor_same_as_key: s.executor_same_as_key, executor_kind: s.executor_kind, leader_mode: s.leader_mode, leader_user_id: s.leader_user_id, internal_step: s.internal_step, requires_qualification: s.requires_qualification, release_next_auto: s.release_next_auto, emergency_reduction_minutes: s.emergency_reduction_minutes, emergency_extra_kind: s.emergency_extra_kind, emergency_extra_value: s.emergency_extra_value, approval_hours: s.approval_hours, rework_hours: s.rework_hours, executor_accept_hours: s.executor_accept_hours, key: s.key, name: s.name, description: s.description, sort_order: s.sort_order, estimated_minutes: s.estimated_minutes, is_conditional: s.is_conditional, specialty_id: s.specialty_id } });
      await copyTaskDeliverables(tx, src, t.id);
      if (src.ai) await tx.catalog2TaskAI.create({ data: { task_id: t.id, ...aiCopyData(src.ai) } });
      return t;
    });
    res.status(201).json({ ok: true, task_id: dup.id });
  } catch (e) { handle(e, res, next); }
});

// "Selecionar existente" (biblioteca de tarefas reutilizáveis, ver /tasks/
// search acima) — COPIA a tarefa de origem (com etapas e config de IA) pra
// versão de destino. Nunca altera a tarefa/produto de origem — igual
// /tasks/:id/duplicate, só que a versão de destino é OUTRA (potencialmente
// de outro produto). Vínculo de questionário é preservado por REFERÊNCIA
// (mesmo questionnaire_id — é biblioteca compartilhada, não se copia).
router.post("/versions/:id/tasks/import", async (req, res, next) => {
  try {
    const destVersionId = req.params.id as string;
    const destVersion = await editableVersionOrThrow(destVersionId);
    await assertCanAddBaseTask(prisma, destVersionId);
    const sourceTaskId = z.string().min(1).parse(req.body?.source_task_id);
    const src = await prisma.catalog2Task.findUnique({ where: { id: sourceTaskId }, include: { steps: true, ai: true, deliverables: true } });
    if (!src) throw new Catalog2Error("Tarefa de origem não encontrada.", 404);

    let key = src.key;
    let n = 2;
    // eslint-disable-next-line no-await-in-loop
    while (await prisma.catalog2Task.findFirst({ where: { version_id: destVersionId, key }, select: { id: true } })) {
      key = `${src.key}-${n}`;
      n++;
    }

    const imported = await prisma.$transaction(async (tx) => {
      const t = await tx.catalog2Task.create({
        data: {
          task_model_id: src.task_model_id, task_model_revision: src.task_model_revision, requires_qualification: src.requires_qualification, stage_execution: src.stage_execution, stage_payout_mode: src.stage_payout_mode, cycle_type: src.cycle_type, repeat_rule: src.repeat_rule, repeat_every_cycles: src.repeat_every_cycles, executor_continuity: src.executor_continuity, asset_rule: src.asset_rule, asset_revalidate_days: src.asset_revalidate_days,
          qualifier_user_id: src.qualifier_user_id, qualification_mode: src.qualification_mode, qualification_min_approvals: src.qualification_min_approvals, qualification_cost_mode: src.qualification_cost_mode, qualification_specialty_id: src.qualification_specialty_id, qualification_hourly_rate: src.qualification_hourly_rate, qualification_minutes: src.qualification_minutes, qualification_percent: src.qualification_percent, qualification_fixed_amount: src.qualification_fixed_amount, qualifier_kind: src.qualifier_kind,
          reviewer_user_id: src.reviewer_user_id, review_minutes: src.review_minutes, review_specialty_id: src.review_specialty_id,
          ops: (src.ops ?? undefined) as Prisma.InputJsonValue | undefined,
          version_id: destVersionId, key, name: src.name,
          description: src.description, objective: src.objective, sort_order: 99,
          specialty_id: src.specialty_id, execution_mode: src.execution_mode, estimated_minutes: src.estimated_minutes,
          requires_review: src.requires_review, requires_client_approval: src.requires_client_approval, is_conditional: src.is_conditional,
          questionnaire_id: src.questionnaire_id,
          // Copia o estado de procedência do esforço COMO ESTAVA na origem —
          // nunca inventa "revisado" nem reseta pra provisório sozinho (regra
          // do Item 3: nunca preencher dado automaticamente nem remover a
          // marcação de provisório sem revisão real).
          effort_is_provisional: src.effort_is_provisional, effort_provisional_reason: src.effort_provisional_reason, effort_source: src.effort_source,
        },
      });
      for (const s of src.steps) {
        await tx.catalog2TaskStep.create({ data: { step_model_id: s.step_model_id, step_model_revision: s.step_model_revision, purpose: s.purpose, execution_mode: s.execution_mode, completion_criteria: s.completion_criteria, task_id: t.id, ops: (s.ops ?? undefined) as Prisma.InputJsonValue | undefined, first_execution_only: s.first_execution_only, skip_when_same_executor: s.skip_when_same_executor, depends_on_json: s.depends_on_json, executor_policy: s.executor_policy, executor_same_as_key: s.executor_same_as_key, executor_kind: s.executor_kind, leader_mode: s.leader_mode, leader_user_id: s.leader_user_id, internal_step: s.internal_step, requires_qualification: s.requires_qualification, release_next_auto: s.release_next_auto, emergency_reduction_minutes: s.emergency_reduction_minutes, emergency_extra_kind: s.emergency_extra_kind, emergency_extra_value: s.emergency_extra_value, approval_hours: s.approval_hours, rework_hours: s.rework_hours, executor_accept_hours: s.executor_accept_hours, key: s.key, name: s.name, description: s.description, sort_order: s.sort_order, estimated_minutes: s.estimated_minutes, is_conditional: s.is_conditional, specialty_id: s.specialty_id } });
      }
      await copyTaskDeliverables(tx, src, t.id);
      if (src.ai) {
        await tx.catalog2TaskAI.create({ data: { task_id: t.id, ...aiCopyData(src.ai) } });
      }
      await recordCatalog2ProductHistory(tx, {
        productId: destVersion.product_id, versionId: destVersion.id, eventType: "task_added",
        description: `Tarefa "${t.name}" importada da biblioteca (cópia).`,
        after: { key: t.key, name: t.name, source_task_id: sourceTaskId },
        actorUserId: req.user!.id, actorKind: "user",
      });
      return t;
    });
    await audit(req, "task_imported", { task_id: imported.id, source_task_id: sourceTaskId, dest_version_id: destVersionId });
    res.status(201).json({ ok: true, task_id: imported.id });
  } catch (e) { handle(e, res, next); }
});

// Reordenar tarefas (lista de ids na ordem desejada) — persiste no banco.
router.put("/versions/:id/tasks/order", async (req, res, next) => {
  try {
    await editableVersionOrThrow(req.params.id as string);
    const ids = z.array(z.string()).parse(req.body?.order ?? []);
    await prisma.$transaction(ids.map((id, i) => prisma.catalog2Task.update({ where: { id }, data: { sort_order: i + 1 } })));
    res.json({ ok: true });
  } catch (e) { handle(e, res, next); }
});

const stepSchema = z.object({ key: z.string().min(1).max(60).optional(), name: z.string().min(1).max(200), description: z.string().max(8000).nullish(), sort_order: z.number().int().optional(), estimated_minutes: z.number().int().nonnegative().nullish(), is_conditional: z.boolean().optional(), specialty_id: z.string().nullish(), purpose: z.enum(STEP_PURPOSES).nullish(), execution_mode: z.enum(CATALOG2_EXECUTION_MODES).nullish(), completion_criteria: z.string().max(4000).nullish(), ops: stepOpsSchema, first_execution_only: z.boolean().optional(), skip_when_same_executor: z.boolean().optional(), executor_kind: z.enum(EXECUTOR_KINDS).optional(), leader_mode: z.enum(LEADER_MODES).optional(), leader_user_id: z.string().max(191).nullish(), internal_step: z.boolean().optional(), requires_qualification: z.boolean().optional(), release_next_auto: z.boolean().optional(), emergency_reduction_minutes: z.number().int().min(0).max(100000).nullish(), emergency_extra_kind: z.enum(EMERGENCY_EXTRA_KINDS).nullish(), emergency_extra_value: z.number().min(0).max(100000000).nullish(), executor_accept_hours: z.number().int().min(1).max(720).nullish(), approval_hours: z.number().int().min(1).max(100000).nullish(), rework_hours: z.number().int().min(1).max(100000).nullish() });
const STEP_MODEL_FIELDS = ["name", "description", "estimated_minutes", "specialty_id", "purpose", "execution_mode", "completion_criteria", "first_execution_only", "skip_when_same_executor", "ops"] as const;
// Item 7.1: "etapas" — o Item 7 nunca instrumentou etapas (só tarefas) —
// fechado aqui (add/update/remove; reordenar segue o mesmo padrão de baixo
// valor informativo já adotado pra tarefas/perguntas, não instrumentado).
router.post("/tasks/:id/steps", async (req, res, next) => {
  try {
    const version = await versionOfTask(req.params.id as string);
    const task = await prisma.catalog2Task.findUniqueOrThrow({ where: { id: req.params.id as string }, select: { name: true } });
    const d = stepSchema.parse(req.body);
    const gin = guardInput(req, d.key ?? null);
    let replayedStep: unknown = null;
    const created = await prisma.$transaction(async (tx) => {
      const g = await createModelGuarded(tx, "step", { name: d.name, description: d.description, specialty_id: d.specialty_id, estimated_minutes: d.estimated_minutes, purpose: d.purpose, execution_mode: d.execution_mode, completion_criteria: d.completion_criteria, ops: d.ops }, gin);
      if (g.replayed) {
        const prev = await tx.catalog2TaskStep.findFirst({ where: { task_id: req.params.id as string, step_model_id: g.model.id }, orderBy: { created_at: "desc" } });
        if (prev) { replayedStep = prev; return prev; }
      }
      const stepModel = g.model as Awaited<ReturnType<typeof createStepModel>>;
      if (!g.created) {
        const max = await tx.catalog2TaskStep.aggregate({ where: { task_id: req.params.id as string }, _max: { sort_order: true } });
        const st = await addStepFromModel(tx, req.params.id as string, stepModel, (max._max.sort_order ?? 0) + 1);
        await recordCatalog2ProductHistory(tx, { productId: version.product_id, versionId: version.id, eventType: "step_added", description: `Etapa "${st.name}" (modelo global Etapa #${stepModel.id}) adicionada à tarefa "${task.name}".`, after: { key: st.key, name: st.name, step_model_id: stepModel.id }, actorUserId: req.user!.id });
        return st;
      }
      const takenStepKeys = new Set((await tx.catalog2TaskStep.findMany({ where: { task_id: req.params.id as string }, select: { key: true } })).map((s) => s.key));
      const c = await tx.catalog2TaskStep.create({ data: { step_model_id: stepModel.id, step_model_revision: stepModel.revision, task_id: req.params.id as string, key: d.key ?? autoKey("etapa", stepModel.id, takenStepKeys), name: d.name, description: d.description ?? null, sort_order: d.sort_order ?? 99, estimated_minutes: d.estimated_minutes ?? null, is_conditional: d.is_conditional ?? false, specialty_id: d.specialty_id ?? null, ops: stepOpsValue(d.ops) } });
      await recordCatalog2ProductHistory(tx, {
        productId: version.product_id, versionId: version.id, eventType: "step_added",
        description: `Etapa "${c.name}" adicionada à tarefa "${task.name}".`, after: { key: c.key, name: c.name },
        actorUserId: req.user!.id,
      });
      return c;
    });
    res.status(replayedStep ? 200 : 201).json(created);
  } catch (e) { handle(e, res, next); }
});
// ─── Pacotes de produtos e regras de dependência ───────────────────────────────
// Pacote = 2+ produtos contratados juntos, cada um continua item independente. A regra diz
// quem espera o quê (produto/tarefa/etapa/entregável/aprovação/ativo) e COMO espera.
// Quem pode ser designado como QUALIFICADOR de uma tarefa: líderes e administradores ativos.
router.get("/qualifiers", async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      where: { is_active: true, OR: [{ role: "lider" }, { account_type: "lider" }, { role: "admin" }, { account_type: "admin" }] },
      select: { id: true, name: true, email: true, role: true, account_type: true },
      orderBy: { name: "asc" },
      take: 300,
    });
    res.json({ data: users.map((u) => ({ id: u.id, name: u.name, email: u.email, kind: u.role === "admin" || u.account_type === "admin" ? "admin" : "lider" })) });
  } catch (e) { next(e); }
});
router.get("/dependency-options", (_req, res) => {
  res.json({ target_kinds: DEPENDENCY_TARGET_KINDS.map((k) => ({ key: k, label: DEPENDENCY_TARGET_LABEL[k] })), behaviors: DEPENDENCY_BEHAVIORS.map((k) => ({ key: k, label: DEPENDENCY_BEHAVIOR_LABEL[k] })) });
});

const dependencyRuleSchema = z.object({
  dependent_product_id: z.string().min(1),
  dependent_task_key: z.string().max(60).nullish(),
  target_kind: z.enum(DEPENDENCY_TARGET_KINDS),
  target_product_id: z.string().nullish(),
  target_task_key: z.string().max(60).nullish(),
  target_step_key: z.string().max(60).nullish(),
  target_asset_type: z.enum(ACCESS_TYPE_KEYS).nullish(),
  // Entregável estruturado específico da tarefa alvo (sem ele, basta qualquer anexo da tarefa).
  target_deliverable_key: z.string().max(60).nullish(),
  // Em quais ciclos a regra vale: todos, só implantação, só recorrência ou só revalidação.
  applies_to: z.enum(["all", "implementacao", "recorrencia", "revalidacao"]).default("all"),
  behavior: z.enum(DEPENDENCY_BEHAVIORS).default("block_start"),
  note: z.string().max(1000).nullish(),
  // Vínculo universal entre produtos (2026-10-02). Padrões = comportamento anterior.
  /** always (padrão) | when_bought_together: a regra só existe quando o produto-alvo faz parte do mesmo pedido/projeto (não obriga a compra do outro). */
  condition_mode: z.enum(["always", "when_bought_together"]).default("always"),
  /** Só ESTA etapa do produto dependente espera o alvo; o resto da tarefa continua. */
  dependent_step_key: z.string().max(60).nullish(),
  /** start (padrão): a etapa não começa · conclude: a etapa não conclui. */
  stage_gate: z.enum(["start", "conclude"]).nullish(),
  /** Pode começar a preparar; só a entrega/execução final espera. */
  allow_partial_start: z.boolean().default(false),
  /** O entregável aprovado do alvo vira ENTRADA da tarefa dependente (link/anexo, versão, aprovação). */
  provides_input: z.boolean().default(false),
  input_label: z.string().max(160).nullish(),
});
type DependencyRuleInput = z.infer<typeof dependencyRuleSchema>;

async function assertRuleValid(d: DependencyRuleInput, allowedProductIds: string[] | null) {
  const products = new Set<string>([d.dependent_product_id, ...(d.target_product_id ? [d.target_product_id] : [])]);
  const found = await prisma.catalog2Product.findMany({ where: { id: { in: [...products] } }, select: { id: true } });
  if (found.length !== products.size) throw new Catalog2Error("Produto não encontrado.", 404);
  if (allowedProductIds) {
    for (const id of products) if (!allowedProductIds.includes(id)) throw new Catalog2Error("Os produtos da regra precisam fazer parte do pacote.", 422);
  }
  if (d.target_kind !== "info_asset" && !d.target_product_id) throw new Catalog2Error("Escolha o produto que a tarefa espera.", 422);
  if (d.target_kind === "info_asset" && !d.target_asset_type) throw new Catalog2Error("Escolha o tipo de acesso/ativo exigido.", 422);
  if (["task", "step", "deliverable", "internal_approval", "client_approval"].includes(d.target_kind) && !d.target_task_key) throw new Catalog2Error("Informe a tarefa alvo.", 422);
  if (d.target_kind === "step" && !d.target_step_key) throw new Catalog2Error("Informe a etapa alvo.", 422);
  if (d.target_product_id && d.target_product_id === d.dependent_product_id && !d.target_task_key) throw new Catalog2Error("Um produto não pode depender dele mesmo.", 422);
  if (d.target_product_id && d.target_product_id === d.dependent_product_id && d.dependent_task_key && d.dependent_task_key === d.target_task_key) throw new Catalog2Error("Uma tarefa não pode esperar por ela mesma.", 422, "self_dependency");
  if (d.target_deliverable_key && d.target_kind !== "deliverable") throw new Catalog2Error("O entregável específico só vale quando a regra espera um entregável.", 422);
  if (d.condition_mode === "when_bought_together") {
    if (!d.target_product_id) throw new Catalog2Error("Informe o produto vinculado (pelo ID real) que precisa ser comprado junto.", 422, "linked_product_required");
    if (d.target_product_id === d.dependent_product_id) throw new Catalog2Error("Um produto não é \"comprado junto\" dele mesmo.", 422, "invalid_link");
  }
  if (d.dependent_step_key) {
    if (!d.dependent_task_key) throw new Catalog2Error("Informe a tarefa da etapa que vai esperar.", 422, "dependent_task_required");
    const dv = await prisma.catalog2ProductVersion.findFirst({ where: { product_id: d.dependent_product_id }, orderBy: { version_number: "desc" }, select: { id: true } });
    const dt = dv ? await prisma.catalog2Task.findFirst({ where: { version_id: dv.id, key: d.dependent_task_key }, include: { steps: { select: { key: true } } } }) : null;
    if (!dt) throw new Catalog2Error(`A tarefa "${d.dependent_task_key}" não existe no produto dependente.`, 422, "dependent_task_not_found");
    if (!dt.steps.some((s) => s.key === d.dependent_step_key)) throw new Catalog2Error(`A etapa "${d.dependent_step_key}" não existe na tarefa "${d.dependent_task_key}".`, 422, "dependent_step_not_found");
  }
  if (d.provides_input && !["product_deliverables", "deliverable"].includes(d.target_kind)) throw new Catalog2Error("Só um entregável (ou os entregáveis de um produto) pode virar entrada da tarefa.", 422, "invalid_input_link");
  // Tarefa/etapa alvo precisa existir na versão mais recente do produto alvo.
  if (d.target_task_key && d.target_product_id) {
    const v = await prisma.catalog2ProductVersion.findFirst({ where: { product_id: d.target_product_id }, orderBy: { version_number: "desc" }, select: { id: true } });
    const t = v ? await prisma.catalog2Task.findFirst({ where: { version_id: v.id, key: d.target_task_key }, select: { id: true } }) : null;
    if (!t) throw new Catalog2Error(`A tarefa "${d.target_task_key}" não existe no produto alvo.`, 422);
    if (d.target_step_key && !(await prisma.catalog2TaskStep.findFirst({ where: { task_id: t.id, key: d.target_step_key }, select: { id: true } }))) {
      throw new Catalog2Error(`A etapa "${d.target_step_key}" não existe na tarefa alvo.`, 422);
    }
    if (d.target_deliverable_key && !(await prisma.catalog2TaskDeliverable.findFirst({ where: { task_id: t.id, key: d.target_deliverable_key }, select: { id: true } }))) {
      throw new Catalog2Error(`O entregável "${d.target_deliverable_key}" não existe na tarefa alvo.`, 422);
    }
  }
}

/** Dois produtos que se bloqueiam mutuamente no início nunca começariam. */
async function assertNoStartCycle(d: DependencyRuleInput, packageId: string | null) {
  if (d.behavior !== "block_start" || d.target_kind !== "product" || !d.target_product_id || d.target_product_id === d.dependent_product_id) return;
  const reverse = await prisma.catalog2DependencyRule.findFirst({
    where: { is_active: true, behavior: "block_start", target_kind: "product", package_id: packageId, dependent_product_id: d.target_product_id, target_product_id: d.dependent_product_id },
    select: { id: true },
  });
  if (reverse) throw new Catalog2Error("Ciclo de dependência: o outro produto já espera este para começar.", 422, "dependency_cycle");
}

const ruleInclude = { dependent_product: { select: { id: true, internal_name: true } }, target_product: { select: { id: true, internal_name: true } } } as const;

router.get("/packages", async (_req, res, next) => {
  try {
    const rows = await prisma.catalog2Package.findMany({
      orderBy: { created_at: "desc" },
      include: { items: { orderBy: { sort_order: "asc" }, include: { product: { select: { id: true, internal_name: true, sequence_number: true } } } }, rules: { orderBy: { created_at: "asc" }, include: ruleInclude } },
    });
    res.json({ data: rows });
  } catch (e) { handle(e, res, next); }
});

const packageBody = z.object({
  name: z.string().trim().min(2).max(191), description: z.string().max(4000).nullish(), product_ids: z.array(z.string()).min(2).max(20),
  // exigir TODOS os itens, itens ESPECÍFICOS (required_product_ids) ou PELO MENOS UM outro item do pacote
  requirement_mode: z.enum(["all", "specific", "any"]).optional(),
  required_product_ids: z.array(z.string()).max(20).optional(),
});
function checkPackageMode(mode: string | undefined, ids: string[], required: string[] | undefined) {
  if (mode === "specific") {
    if (!required || required.length === 0) throw new Catalog2Error("Escolha quais itens do pacote são obrigatórios.", 422, "package_required_items");
    if (!required.every((r) => ids.includes(r))) throw new Catalog2Error("Os itens obrigatórios precisam fazer parte do pacote.", 422, "package_required_items");
  }
}
router.post("/packages", async (req, res, next) => {
  try {
    const d = packageBody.parse(req.body);
    const ids = [...new Set(d.product_ids)];
    if (ids.length < 2) throw new Catalog2Error("Um pacote precisa de pelo menos 2 produtos diferentes.", 422);
    const existing = await prisma.catalog2Product.count({ where: { id: { in: ids } } });
    if (existing !== ids.length) throw new Catalog2Error("Produto não encontrado.", 404);
    checkPackageMode(d.requirement_mode, ids, d.required_product_ids);
    const pkg = await prisma.catalog2Package.create({
      data: {
        name: d.name, description: d.description ?? null, created_by_user_id: req.user!.id, requirement_mode: d.requirement_mode ?? "all",
        items: { create: ids.map((id, i) => ({ catalog2_product_id: id, sort_order: i, is_required: d.requirement_mode === "specific" && (d.required_product_ids ?? []).includes(id) })) },
      },
    });
    await audit(req, "package_created", { package_id: pkg.id, name: pkg.name });
    res.status(201).json({ id: pkg.id });
  } catch (e) { handle(e, res, next); }
});
router.put("/packages/:id", async (req, res, next) => {
  try {
    const d = packageBody.partial().extend({ is_active: z.boolean().optional() }).parse(req.body);
    const id = req.params.id as string;
    const pkg = await prisma.catalog2Package.findUnique({ where: { id }, include: { items: true } });
    if (!pkg) throw new Catalog2Error("Pacote não encontrado.", 404);
    await prisma.$transaction(async (tx) => {
      await tx.catalog2Package.update({ where: { id }, data: { ...(d.requirement_mode !== undefined ? { requirement_mode: d.requirement_mode } : {}), ...(d.name !== undefined ? { name: d.name } : {}), ...(d.description !== undefined ? { description: d.description } : {}), ...(d.is_active !== undefined ? { is_active: d.is_active } : {}) } });
      if (d.product_ids) {
        const ids = [...new Set(d.product_ids)];
        if (ids.length < 2) throw new Catalog2Error("Um pacote precisa de pelo menos 2 produtos diferentes.", 422);
        await tx.catalog2PackageItem.deleteMany({ where: { package_id: id, catalog2_product_id: { notIn: ids } } });
        for (const [i, pid] of ids.entries()) {
          await tx.catalog2PackageItem.upsert({ where: { package_id_catalog2_product_id: { package_id: id, catalog2_product_id: pid } }, create: { package_id: id, catalog2_product_id: pid, sort_order: i }, update: { sort_order: i } });
        }
      }
    });
    if (d.requirement_mode !== undefined || d.required_product_ids !== undefined) {
      const cur = await prisma.catalog2Package.findUniqueOrThrow({ where: { id }, include: { items: true } });
      const itemIds = cur.items.map((i) => i.catalog2_product_id);
      const required = d.required_product_ids ?? cur.items.filter((i) => i.is_required).map((i) => i.catalog2_product_id);
      checkPackageMode(cur.requirement_mode, itemIds, required);
      await prisma.$transaction(cur.items.map((i) => prisma.catalog2PackageItem.update({ where: { id: i.id }, data: { is_required: cur.requirement_mode === "specific" && required.includes(i.catalog2_product_id) } })));
    }
    await audit(req, "package_updated", { package_id: id });
    res.json({ ok: true });
  } catch (e) { handle(e, res, next); }
});
router.post("/packages/:id/rules", async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const pkg = await prisma.catalog2Package.findUnique({ where: { id }, include: { items: true } });
    if (!pkg) throw new Catalog2Error("Pacote não encontrado.", 404);
    const d = dependencyRuleSchema.parse(req.body);
    await assertRuleValid(d, pkg.items.map((i) => i.catalog2_product_id));
    await assertNoStartCycle(d, id);
    const r = await prisma.catalog2DependencyRule.create({
      data: {
        package_id: id, dependent_product_id: d.dependent_product_id, dependent_task_key: d.dependent_task_key ?? null, target_kind: d.target_kind,
        target_product_id: d.target_product_id ?? null, target_task_key: d.target_task_key ?? null, target_step_key: d.target_step_key ?? null,
        target_asset_type: d.target_asset_type ?? null, target_deliverable_key: d.target_deliverable_key ?? null, applies_to: d.applies_to, behavior: d.behavior, note: d.note ?? null, condition_mode: d.condition_mode, dependent_step_key: d.dependent_step_key ?? null, stage_gate: d.stage_gate ?? null, allow_partial_start: d.allow_partial_start, provides_input: d.provides_input, input_label: d.input_label ?? null,
      },
    });
    await audit(req, "dependency_rule_created", { rule_id: r.id, package_id: id });
    res.status(201).json({ id: r.id });
  } catch (e) { handle(e, res, next); }
});

// Pré-requisito de PRODUTO (sem pacote): exige outro produto/tarefa/aprovação já concluído pelo mesmo cliente.
router.get("/products/:id/prerequisites", async (req, res, next) => {
  try {
    const rows = await prisma.catalog2DependencyRule.findMany({ where: { package_id: null, dependent_product_id: req.params.id as string }, orderBy: { created_at: "asc" }, include: ruleInclude });
    res.json({ data: rows });
  } catch (e) { handle(e, res, next); }
});
router.post("/products/:id/prerequisites", async (req, res, next) => {
  try {
    const d = dependencyRuleSchema.parse({ ...req.body, dependent_product_id: req.params.id });
    await assertRuleValid(d, null);
    await assertNoStartCycle(d, null);
    const r = await prisma.catalog2DependencyRule.create({
      data: {
        package_id: null, dependent_product_id: d.dependent_product_id, dependent_task_key: d.dependent_task_key ?? null, target_kind: d.target_kind,
        target_product_id: d.target_product_id ?? null, target_task_key: d.target_task_key ?? null, target_step_key: d.target_step_key ?? null,
        target_asset_type: d.target_asset_type ?? null, target_deliverable_key: d.target_deliverable_key ?? null, applies_to: d.applies_to, behavior: d.behavior, note: d.note ?? null, condition_mode: d.condition_mode, dependent_step_key: d.dependent_step_key ?? null, stage_gate: d.stage_gate ?? null, allow_partial_start: d.allow_partial_start, provides_input: d.provides_input, input_label: d.input_label ?? null,
      },
    });
    await audit(req, "dependency_rule_created", { rule_id: r.id, product_id: d.dependent_product_id });
    res.status(201).json({ id: r.id });
  } catch (e) { handle(e, res, next); }
});
// Regras não são apagadas: desativar preserva o histórico do que já foi materializado.
router.patch("/dependency-rules/:id/active", async (req, res, next) => {
  try {
    const is_active = z.object({ is_active: z.boolean() }).parse(req.body).is_active;
    await prisma.catalog2DependencyRule.update({ where: { id: req.params.id as string }, data: { is_active } });
    await audit(req, is_active ? "dependency_rule_activated" : "dependency_rule_deactivated", { rule_id: req.params.id as string });
    res.json({ ok: true, is_active });
  } catch (e) { handle(e, res, next); }
});

// ── Acessos externos exigidos pelo produto (Google Ads, Meta, Pixel…) ──────────
// Só descreve QUAIS acessos são necessários — nunca senha/credencial.
router.get("/access-types", (_req, res) => { res.json({ data: ACCESS_TYPES }); });
router.put("/versions/:id/access-requirements", async (req, res, next) => {
  try {
    const version = await editableVersionOrThrow(req.params.id as string);
    const d = z.object({
      items: z.array(z.object({
        access_type: z.enum(ACCESS_TYPE_KEYS),
        label: z.string().max(191).nullish(),
        is_required: z.boolean().optional(),
        notes: z.string().max(2000).nullish(),
      })).max(40),
    }).parse(req.body);
    for (const it of d.items) {
      if (it.access_type === "other" && !it.label?.trim()) throw new Catalog2Error("Informe o nome do acesso em \"Outros\".", 422);
    }
    await prisma.$transaction(async (tx) => {
      await replaceVersionAccess(tx, version.id, d.items);
      await recordCatalog2ProductHistory(tx, {
        productId: version.product_id, versionId: version.id, eventType: "access_requirements_updated",
        description: `Acessos necessários do produto atualizados (${d.items.length}).`, actorUserId: req.user!.id,
      });
    });
    res.json({ ok: true });
  } catch (e) { handle(e, res, next); }
});
// Adiciona à tarefa a etapa padrão "Validação e organização dos acessos".
router.post("/tasks/:id/steps/access-validation", async (req, res, next) => {
  try {
    const version = await versionOfTask(req.params.id as string);
    const model = await prisma.catalog2StepModel.findFirst({ where: { is_access_validation: true }, orderBy: { id: "asc" } });
    if (!model) throw new Catalog2Error("O modelo padrão \"Validação e organização dos acessos\" ainda não existe neste ambiente. Ele chega junto com \"subir produtos\".", 404, "standard_step_missing");
    if (!model.is_active) throw new Catalog2Error("O modelo padrão de acessos está inativo.", 422, "model_inactive");
    const already = await prisma.catalog2TaskStep.count({ where: { task_id: req.params.id as string, step_model_id: model.id } });
    if (already > 0) throw new Catalog2Error("Esta tarefa já tem a etapa de validação de acessos.", 409);
    // Vai para o INÍCIO da tarefa: as etapas seguintes só abrem depois dela.
    const created = await prisma.$transaction(async (tx) => {
      await tx.catalog2TaskStep.updateMany({ where: { task_id: req.params.id as string }, data: { sort_order: { increment: 1 } } });
      const s = await addStepFromModel(tx, req.params.id as string, model, 0);
      await recordCatalog2ProductHistory(tx, {
        productId: version.product_id, versionId: version.id, eventType: "step_added",
        description: `Etapa padrão "${s.name}" (Etapa #${model.id}) adicionada no início da tarefa.`, after: { key: s.key, step_model_id: model.id },
        actorUserId: req.user!.id,
      });
      return s;
    });
    res.status(201).json(created);
  } catch (e) { handle(e, res, next); }
});

// "Selecionar modelo existente": cria a tarefa na versão VINCULADA ao modelo global
// (Tarefa #ID), já com as etapas padrão do modelo.
router.post("/versions/:id/tasks/from-model", async (req, res, next) => {
  try {
    const version = await editableVersionOrThrow(req.params.id as string);
    await assertCanAddBaseTask(prisma, version.id);
    const modelId = z.object({ model_id: z.number().int().min(1) }).parse(req.body).model_id;
    const model = await prisma.catalog2TaskModel.findUnique({ where: { id: modelId } });
    if (!model) throw new Catalog2Error("Modelo de tarefa não encontrado.", 404);
    if (!model.is_active) throw new Catalog2Error("Este modelo está inativo e não pode ser usado em novos produtos.", 422, "model_inactive");
    await syncTaskModelSteps(prisma, modelId);
    const max = await prisma.catalog2Task.aggregate({ where: { version_id: version.id }, _max: { sort_order: true } });
    const created = await prisma.$transaction(async (tx) => {
      const t = await addTaskFromModel(tx, version.id, model, (max._max.sort_order ?? 0) + 1);
      await recordCatalog2ProductHistory(tx, {
        productId: version.product_id, versionId: version.id, eventType: "task_added",
        description: `Tarefa "${t.name}" adicionada a partir do modelo global Tarefa #${model.id}.`, after: { key: t.key, name: t.name, task_model_id: model.id },
        actorUserId: req.user!.id,
      });
      return t;
    });
    res.status(201).json(created);
  } catch (e) { handle(e, res, next); }
});
router.post("/tasks/:id/steps/from-model", async (req, res, next) => {
  try {
    const version = await versionOfTask(req.params.id as string);
    const task = await prisma.catalog2Task.findUniqueOrThrow({ where: { id: req.params.id as string }, select: { name: true } });
    const modelId = z.object({ step_model_id: z.number().int().min(1) }).parse(req.body).step_model_id;
    const model = await prisma.catalog2StepModel.findUnique({ where: { id: modelId } });
    if (!model) throw new Catalog2Error("Modelo de etapa não encontrado.", 404);
    if (!model.is_active) throw new Catalog2Error("Esta etapa está inativa e não pode ser usada em novos produtos.", 422, "model_inactive");
    const max = await prisma.catalog2TaskStep.aggregate({ where: { task_id: req.params.id as string }, _max: { sort_order: true } });
    const created = await prisma.$transaction(async (tx) => {
      const s = await addStepFromModel(tx, req.params.id as string, model, (max._max.sort_order ?? 0) + 1);
      await recordCatalog2ProductHistory(tx, {
        productId: version.product_id, versionId: version.id, eventType: "step_added",
        description: `Etapa "${s.name}" (modelo global Etapa #${model.id}) adicionada à tarefa "${task.name}".`, after: { key: s.key, name: s.name, step_model_id: model.id },
        actorUserId: req.user!.id,
      });
      return s;
    });
    res.status(201).json(created);
  } catch (e) { handle(e, res, next); }
});
// "Atualizar para a revisão atual do modelo": traz os valores vigentes do modelo global.
router.post("/tasks/:id/sync-model", async (req, res, next) => {
  try {
    const version = await versionOfTask(req.params.id as string);
    const t = await prisma.catalog2Task.findUniqueOrThrow({ where: { id: req.params.id as string } });
    if (t.task_model_id == null) throw new Catalog2Error("Esta tarefa não está vinculada a um modelo global.", 422);
    const m = await prisma.catalog2TaskModel.findUniqueOrThrow({ where: { id: t.task_model_id } });
    const { task_model_id: _i, ...data } = taskDataFromModel(m);
    await prisma.$transaction(async (tx) => {
      await tx.catalog2Task.update({ where: { id: t.id }, data });
      await recordCatalog2ProductHistory(tx, {
        productId: version.product_id, versionId: version.id, eventType: "task_updated",
        description: `Tarefa "${m.name}" atualizada para a revisão ${m.revision} do modelo global Tarefa #${m.id}.`, actorUserId: req.user!.id,
      });
    });
    res.json({ ok: true, revision: m.revision });
  } catch (e) { handle(e, res, next); }
});
router.post("/steps/:id/sync-model", async (req, res, next) => {
  try {
    const { step, version } = await versionOfStep(req.params.id as string);
    if (step.step_model_id == null) throw new Catalog2Error("Esta etapa não está vinculada a um modelo global.", 422);
    const m = await prisma.catalog2StepModel.findUniqueOrThrow({ where: { id: step.step_model_id } });
    const { step_model_id: _i, ...data } = stepDataFromModel(m);
    await prisma.$transaction(async (tx) => {
      await tx.catalog2TaskStep.update({ where: { id: step.id }, data });
      await recordCatalog2ProductHistory(tx, {
        productId: version.product_id, versionId: version.id, eventType: "step_updated",
        description: `Etapa "${m.name}" atualizada para a revisão ${m.revision} do modelo global Etapa #${m.id}.`, actorUserId: req.user!.id,
      });
    });
    res.json({ ok: true, revision: m.revision });
  } catch (e) { handle(e, res, next); }
});
async function versionOfStep(stepId: string) {
  const s = await prisma.catalog2TaskStep.findUnique({ where: { id: stepId }, include: { task: { select: { name: true, version_id: true } } } });
  if (!s) throw new Catalog2Error("Etapa não encontrada.", 404);
  const version = await editableVersionOrThrow(s.task.version_id);
  return { step: s, taskName: s.task.name, version };
}
// Histórico real da etapa: o que já foi executado em projetos (tempo real x estimado, atrasos, refações, custo, IA), por tipo de execução.
router.get("/steps/:id/performance", async (req, res, next) => {
  try {
    const out = await stepPerformance(prisma, req.params.id as string);
    if (!out) throw new Catalog2Error("Etapa não encontrada.", 404);
    res.json(out);
  } catch (e) { handle(e, res, next); }
});
router.put("/steps/:id", async (req, res, next) => {
  try {
    const { step: before, taskName, version } = await versionOfStep(req.params.id as string);
    const d = stepSchema.partial().parse(req.body);
    const scope: "product" | "model" = req.body?.scope === "model" ? "model" : "product";
    if (scope === "model" && before.step_model_id != null) await assertModelUpdateConfirmed("step", before.step_model_id, req.body?.confirm_model_update === true);
    if ("emergency_reduction_minutes" in d || "emergency_extra_kind" in d || "emergency_extra_value" in d) {
      const merged = {
        reduction_minutes: "emergency_reduction_minutes" in d ? d.emergency_reduction_minutes : before.emergency_reduction_minutes,
        extra_kind: "emergency_extra_kind" in d ? d.emergency_extra_kind : before.emergency_extra_kind,
        extra_value: "emergency_extra_value" in d ? d.emergency_extra_value : before.emergency_extra_value,
        estimated_minutes: "estimated_minutes" in d ? d.estimated_minutes : before.estimated_minutes,
      };
      const err = validateEmergencyStepInput(merged);
      if (err) throw new Catalog2Error(err, 422, "invalid_emergency_step");
    }
    if ("executor_kind" in d || "leader_mode" in d || "leader_user_id" in d) {
      const merged = { name: before.name, executor_kind: d.executor_kind ?? before.executor_kind, leader_mode: d.leader_mode ?? before.leader_mode, leader_user_id: "leader_user_id" in d ? d.leader_user_id : before.leader_user_id };
      const err = validateStepExecutor(merged);
      if (err) throw new Catalog2Error(err, 422, "invalid_step_executor");
      if (merged.executor_kind === "leader" && merged.leader_mode === "specific") {
        const u = await prisma.user.findUnique({ where: { id: merged.leader_user_id as string }, select: { is_active: true, role: true } });
        if (!u || !u.is_active || !["lider", "admin"].includes(u.role)) throw new Catalog2Error("O líder escolhido não existe, está inativo ou não é líder.", 422, "invalid_step_leader");
      }
      d.executor_kind = merged.executor_kind as typeof d.executor_kind;
      if (merged.executor_kind !== "leader") { d.leader_mode = "auto"; d.leader_user_id = null; } else if (merged.leader_mode !== "specific") d.leader_user_id = null;
    }
    const updated = await prisma.$transaction(async (tx) => {
      const stepData: Record<string, unknown> = { ...d };
      if ("ops" in d) stepData.ops = stepOpsValue(d.ops);
      if (scope === "model" && before.step_model_id != null) {
        const cur = await tx.catalog2StepModel.findUniqueOrThrow({ where: { id: before.step_model_id } });
        const patch: Record<string, unknown> = {};
        for (const k of STEP_MODEL_FIELDS) if (k in d) patch[k] = (d as Record<string, unknown>)[k];
        if ("ops" in d) patch.ops = stepOpsValue(d.ops);
        const merged = { ...cur, ...patch } as typeof cur;
        const nm = await tx.catalog2StepModel.update({ where: { id: cur.id }, data: { ...patch, signature: stepModelSignature(merged), revision: { increment: 1 } } });
        // no modelo global: os ajustes específicos deste produto deixam de existir (herda de novo)
        stepData.step_model_revision = nm.revision;
        stepData.purpose = null; stepData.execution_mode = null; stepData.completion_criteria = null;
      }
      const u = await tx.catalog2TaskStep.update({ where: { id: req.params.id as string }, data: stepData });
      // Um humano salvando/confirmando a etapa também confirma o esforço da tarefa (sai de "provisório").
      if (d.name !== undefined || d.estimated_minutes !== undefined || d.specialty_id !== undefined) {
        await tx.catalog2Task.updateMany({
          where: { id: before.task_id, effort_is_provisional: true },
          data: { effort_is_provisional: false, effort_source: "human_reviewed", effort_provisional_reason: null },
        });
      }
      const changed: string[] = [];
      if (d.name !== undefined && d.name !== before.name) changed.push(`nome de "${before.name}" para "${d.name}"`);
      if (d.estimated_minutes !== undefined && d.estimated_minutes !== before.estimated_minutes) changed.push(`tempo estimado de ${before.estimated_minutes ?? "?"} para ${d.estimated_minutes ?? "?"} min`);
      if (changed.length > 0) {
        await recordCatalog2ProductHistory(tx, {
          productId: version.product_id, versionId: version.id, eventType: "step_updated",
          description: `Etapa "${u.name}" da tarefa "${taskName}" atualizada — ${changed.join("; ")}.`,
          before: { name: before.name, estimated_minutes: before.estimated_minutes },
          after: { name: u.name, estimated_minutes: u.estimated_minutes },
          actorUserId: req.user!.id,
        });
      }
      return u;
    });
    res.json(updated);
  } catch (e) { handle(e, res, next); }
});
// Fluxo das etapas (A8): sequência, paralelo, dependências e regra de executor — salvo de uma vez e validado como um todo.
const flowSchema = z.object({
  steps: z.array(z.object({
    step_id: z.string().min(1),
    depends_on: z.array(z.string().max(60)).max(200).nullable().optional(),
    executor_policy: z.enum(EXECUTOR_POLICIES).optional(),
    executor_same_as_key: z.string().max(60).nullish(),
  })).min(1).max(300),
});
router.put("/tasks/:id/steps/flow", async (req, res, next) => {
  try {
    const version = await versionOfTask(req.params.id as string);
    const d = flowSchema.parse(req.body);
    const task = await prisma.catalog2Task.findUniqueOrThrow({ where: { id: req.params.id as string }, include: { steps: { orderBy: { sort_order: "asc" } } } });
    const byId = new Map(task.steps.map((s) => [s.id, s]));
    for (const x of d.steps) if (!byId.has(x.step_id)) throw new Catalog2Error("Uma das etapas informadas não pertence a esta tarefa.", 422, "invalid_flow_step");
    const patchById = new Map(d.steps.map((x) => [x.step_id, x]));
    const merged = task.steps.map((s) => {
      const p = patchById.get(s.id);
      const dep = p && p.depends_on !== undefined ? p.depends_on : parseDepends(s.depends_on_json);
      const pol = p?.executor_policy ?? s.executor_policy ?? "auto";
      return { key: s.key, name: s.name, sort_order: s.sort_order, depends_on: dep, executor_policy: pol, executor_same_as_key: isRefPolicy(pol) ? (p && p.executor_same_as_key !== undefined ? p.executor_same_as_key : s.executor_same_as_key) ?? null : null };
    });
    const errs = validateStepFlow(merged);
    if (errs.length) throw new Catalog2Error(errs.join(" "), 422, "invalid_step_flow");
    await prisma.$transaction(async (tx) => {
      for (const m of merged) {
        const s = task.steps.find((x) => x.key === m.key)!;
        await tx.catalog2TaskStep.update({ where: { id: s.id }, data: { depends_on_json: m.depends_on == null ? null : JSON.stringify(m.depends_on), executor_policy: m.executor_policy, executor_same_as_key: m.executor_same_as_key } });
      }
      await recordCatalog2ProductHistory(tx, { productId: version.product_id, versionId: version.id, eventType: "step_flow_updated", description: `Fluxo das etapas da tarefa "${task.name}" atualizado (${merged.filter((m) => m.depends_on !== null).length} etapa(s) com dependência configurada).`, actorUserId: req.user!.id });
    });
    res.json({ ok: true, flow: merged.map((m) => ({ key: m.key, depends_on: m.depends_on, executor_policy: m.executor_policy, executor_same_as_key: m.executor_same_as_key })) });
  } catch (e) { handle(e, res, next); }
});
router.delete("/steps/:id", async (req, res, next) => {
  try {
    const { step: before, taskName, version } = await versionOfStep(req.params.id as string);
    await prisma.$transaction(async (tx) => {
      await tx.catalog2TaskStep.delete({ where: { id: req.params.id as string } });
      await cleanStepFlowRefs(tx, before.task_id, before.key);
      await recordCatalog2ProductHistory(tx, {
        productId: version.product_id, versionId: version.id, eventType: "step_removed",
        description: `Etapa "${before.name}" removida da tarefa "${taskName}".`, before: { key: before.key, name: before.name },
        actorUserId: req.user!.id,
      });
    });
    res.json({ ok: true });
  } catch (e) { handle(e, res, next); }
});
router.put("/tasks/:id/steps/order", async (req, res, next) => {
  try {
    await versionOfTask(req.params.id as string);
    const ids = z.array(z.string()).parse(req.body?.order ?? []);
    await prisma.$transaction(ids.map((id, i) => prisma.catalog2TaskStep.update({ where: { id }, data: { sort_order: i + 1 } })));
    res.json({ ok: true });
  } catch (e) { handle(e, res, next); }
});

// ─── Catálogo global de modelos de tarefa ("Tarefa #ID") e de etapa ("Etapa #ID") ───
// IDs sequenciais e permanentes; modelo NUNCA é apagado (só inativado). Editar o
// modelo global sobe `revision` e NÃO altera tarefas/etapas já cadastradas nos
// produtos (cada versão guarda os valores vigentes).
const modelListQuery = z.object({
  q: z.string().trim().max(120).optional(),
  status: z.enum(["active", "inactive", "all"]).default("active"),
  specialty_id: z.string().optional(),
  execution_mode: z.enum(CATALOG2_EXECUTION_MODES).optional(),
  purpose: z.enum(STEP_PURPOSES).optional(),
  cycle_type: z.enum(CYCLE_TYPES).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
  offset: z.coerce.number().int().min(0).default(0),
});
function modelIdParam(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) throw new Catalog2Error("ID inválido.", 400);
  return n;
}
// Busca por "#12", "12" (ID exato) ou por parte do nome.
function modelSearchWhere(q: string | undefined) {
  if (!q) return {};
  const idMatch = /^#?\s*(\d{1,9})$/.exec(q);
  return idMatch ? { OR: [{ id: Number(idMatch[1]) }, { name: { contains: q } }] } : { name: { contains: q } };
}

router.get("/task-models/similar", async (req, res, next) => {
  try {
    const q = z.object({ name: z.string().min(1).max(200), key: z.string().max(60).optional(), specialty_id: z.string().optional(), execution_mode: z.string().optional(), cycle_type: z.string().optional() }).parse(req.query);
    res.json({ data: await findCandidates(prisma, "task", q) });
  } catch (e) { handle(e, res, next); }
});
router.get("/step-models/similar", async (req, res, next) => {
  try {
    const q = z.object({ name: z.string().min(1).max(200), key: z.string().max(60).optional(), specialty_id: z.string().optional(), execution_mode: z.string().optional() }).parse(req.query);
    res.json({ data: await findCandidates(prisma, "step", q) });
  } catch (e) { handle(e, res, next); }
});
router.get("/task-models", async (req, res, next) => {
  try {
    const f = modelListQuery.parse(req.query);
    const where: Prisma.Catalog2TaskModelWhereInput = {
      ...modelSearchWhere(f.q),
      ...(f.status === "all" ? {} : { is_active: f.status === "active" }),
      ...(f.specialty_id ? { specialty_id: f.specialty_id } : {}),
      ...(f.execution_mode ? { execution_mode: f.execution_mode } : {}),
      ...(f.cycle_type ? { cycle_type: f.cycle_type } : {}),
    };
    const [total, rows] = await Promise.all([
      prisma.catalog2TaskModel.count({ where }),
      prisma.catalog2TaskModel.findMany({
        where, orderBy: { id: "asc" }, take: f.limit, skip: f.offset,
        include: { specialty: { select: { id: true, name: true } }, questionnaire: { select: { id: true, name: true } }, _count: { select: { steps: true, tasks: true } } },
      }),
    ]);
    const usage = await prisma.catalog2Task.findMany({ where: { task_model_id: { in: rows.map((r) => r.id) } }, select: { task_model_id: true, version: { select: { product_id: true } } } });
    const productsByModel = new Map<number, Set<string>>();
    for (const u of usage) { const s = productsByModel.get(u.task_model_id as number) ?? new Set<string>(); s.add(u.version.product_id); productsByModel.set(u.task_model_id as number, s); }
    res.json({ total, data: rows.map(({ signature: _s, _count, ...m }) => ({ ...m, label: `Modelo de tarefa #${m.id}`, step_count: _count.steps, usage_count: _count.tasks, product_count: productsByModel.get(m.id)?.size ?? 0 })) });
  } catch (e) { handle(e, res, next); }
});

router.get("/task-models/:id", async (req, res, next) => {
  try {
    const id = modelIdParam(req.params.id);
    await syncTaskModelSteps(prisma, id);
    const m = await prisma.catalog2TaskModel.findUnique({
      where: { id },
      include: {
        specialty: { select: { id: true, name: true } },
        questionnaire: { select: { id: true, name: true } },
        steps: { orderBy: { sort_order: "asc" }, include: { step_model: { include: { specialty: { select: { id: true, name: true } } } } } },
      },
    });
    if (!m) throw new Catalog2Error("Modelo de tarefa não encontrado.", 404);
    const used = await prisma.catalog2Task.findMany({
      where: { task_model_id: id }, take: 200,
      select: { version: { select: { version_number: true, state: true, product: { select: { id: true, internal_name: true, sequence_number: true } } } } },
    });
    const products = new Map<string, { product_id: string; product_name: string; product_number: number | null; versions: string[] }>();
    for (const u of used) {
      const p = u.version.product;
      const e = products.get(p.id) ?? { product_id: p.id, product_name: p.internal_name, product_number: p.sequence_number ?? null, versions: [] };
      e.versions.push(`v${u.version.version_number}`);
      products.set(p.id, e);
    }
    const { signature: _s, ...model } = m;
    res.json({ ...model, used_by: [...products.values()] });
  } catch (e) { handle(e, res, next); }
});

const taskModelBody = z.object({
  name: z.string().trim().min(1).max(191),
  description: z.string().max(8000).nullish(),
  execution_mode: z.enum(CATALOG2_EXECUTION_MODES).optional(),
  specialty_id: z.string().nullish(),
  estimated_minutes: z.number().int().nonnegative().nullish(),
  questionnaire_id: z.string().nullish(),
  is_conditional: z.boolean().optional(),
  requires_client_approval: z.boolean().optional(),
  requires_qualification: z.boolean().optional(),
  cycle_type: z.enum(CYCLE_TYPES).optional(),
  repeat_rule: z.enum(REPEAT_RULES).optional(),
  repeat_every_cycles: z.number().int().min(1).max(60).nullish(),
  executor_continuity: z.enum(CONTINUITY_MODES).optional(),
  asset_rule: z.enum(ASSET_RULES).optional(),
  asset_revalidate_days: z.number().int().min(1).max(730).nullish(),
  ops: taskOpsSchema,
  requires_review: z.boolean().optional(),
  review_minutes: z.number().int().min(0).max(10000).nullish(),
  review_specialty_id: z.string().nullish(),
});
router.post("/task-models", async (req, res, next) => {
  try {
    const d = taskModelBody.parse(req.body);
    const g = await prisma.$transaction((tx) => createModelGuarded(tx, "task", d, guardInput(req)));
    await audit(req, "task_model_created", { task_model_id: g.model.id, name: g.model.name, created: g.created, replayed: g.replayed, duplicate_resolution: g.resolution });
    res.status(g.created ? 201 : 200).json({ id: g.model.id, created: g.created, replayed: g.replayed, duplicate_resolution: g.resolution });
  } catch (e) { handle(e, res, next); }
});
router.put("/task-models/:id", async (req, res, next) => {
  try {
    const id = modelIdParam(req.params.id);
    const before = await prisma.catalog2TaskModel.findUnique({ where: { id } });
    if (!before) throw new Catalog2Error("Modelo de tarefa não encontrado.", 404);
    const { ops: rawOps, ...d } = taskModelBody.partial().parse(req.body);
    const merged = { ...before, ...d };
    const updated = await prisma.catalog2TaskModel.update({
      where: { id },
      data: { ...d, ...(rawOps !== undefined ? { ops: taskOpsValue(rawOps) } : {}), signature: taskModelSignature(merged), revision: { increment: 1 } },
    });
    await audit(req, "task_model_updated", { task_model_id: id, revision: updated.revision });
    res.json({ id, revision: updated.revision });
  } catch (e) { handle(e, res, next); }
});
router.patch("/task-models/:id/active", async (req, res, next) => {
  try {
    const id = modelIdParam(req.params.id);
    const is_active = z.object({ is_active: z.boolean() }).parse(req.body).is_active;
    await prisma.catalog2TaskModel.update({ where: { id }, data: { is_active } });
    await audit(req, is_active ? "task_model_activated" : "task_model_inactivated", { task_model_id: id });
    res.json({ id, is_active });
  } catch (e) { handle(e, res, next); }
});

router.get("/step-models", async (req, res, next) => {
  try {
    const f = modelListQuery.parse(req.query);
    const where: Prisma.Catalog2StepModelWhereInput = {
      ...modelSearchWhere(f.q),
      ...(f.status === "all" ? {} : { is_active: f.status === "active" }),
      ...(f.specialty_id ? { specialty_id: f.specialty_id } : {}),
      ...(f.execution_mode ? { execution_mode: f.execution_mode } : {}),
      ...(f.purpose ? { purpose: f.purpose } : {}),
    };
    const [total, rows] = await Promise.all([
      prisma.catalog2StepModel.count({ where }),
      prisma.catalog2StepModel.findMany({
        where, orderBy: { id: "asc" }, take: f.limit, skip: f.offset,
        include: { specialty: { select: { id: true, name: true } }, _count: { select: { steps: true, task_models: true } } },
      }),
    ]);
    res.json({ total, data: rows.map(({ signature: _s, _count, ...m }) => ({ ...m, usage_count: _count.steps, task_model_count: _count.task_models })) });
  } catch (e) { handle(e, res, next); }
});
router.get("/step-models/:id", async (req, res, next) => {
  try {
    const id = modelIdParam(req.params.id);
    const m = await prisma.catalog2StepModel.findUnique({
      where: { id },
      include: { specialty: { select: { id: true, name: true } }, task_models: { include: { task_model: { select: { id: true, name: true } } } } },
    });
    if (!m) throw new Catalog2Error("Modelo de etapa não encontrado.", 404);
    const { signature: _s, ...model } = m;
    res.json(model);
  } catch (e) { handle(e, res, next); }
});
const stepModelBody = z.object({
  name: z.string().trim().min(1).max(191),
  description: z.string().max(8000).nullish(),
  completion_criteria: z.string().max(4000).nullish(),
  purpose: z.enum(STEP_PURPOSES).optional(),
  execution_mode: z.enum(CATALOG2_EXECUTION_MODES).optional(),
  specialty_id: z.string().nullish(),
  estimated_minutes: z.number().int().nonnegative().nullish(),
  ops: stepOpsSchema,
});
router.post("/step-models", async (req, res, next) => {
  try {
    const d = stepModelBody.parse(req.body);
    const g = await prisma.$transaction((tx) => createModelGuarded(tx, "step", d, guardInput(req)));
    await audit(req, "step_model_created", { step_model_id: g.model.id, name: g.model.name, created: g.created, replayed: g.replayed, duplicate_resolution: g.resolution });
    res.status(g.created ? 201 : 200).json({ id: g.model.id, created: g.created, replayed: g.replayed, duplicate_resolution: g.resolution });
  } catch (e) { handle(e, res, next); }
});
router.put("/step-models/:id", async (req, res, next) => {
  try {
    const id = modelIdParam(req.params.id);
    const before = await prisma.catalog2StepModel.findUnique({ where: { id } });
    if (!before) throw new Catalog2Error("Modelo de etapa não encontrado.", 404);
    const { ops: rawOps, ...d } = stepModelBody.partial().parse(req.body);
    const updated = await prisma.catalog2StepModel.update({
      where: { id },
      data: { ...d, ...(rawOps !== undefined ? { ops: stepOpsValue(rawOps) } : {}), signature: stepModelSignature({ ...before, ...d }), revision: { increment: 1 } },
    });
    await audit(req, "step_model_updated", { step_model_id: id, revision: updated.revision });
    res.json({ id, revision: updated.revision });
  } catch (e) { handle(e, res, next); }
});
router.patch("/step-models/:id/active", async (req, res, next) => {
  try {
    const id = modelIdParam(req.params.id);
    const is_active = z.object({ is_active: z.boolean() }).parse(req.body).is_active;
    await prisma.catalog2StepModel.update({ where: { id }, data: { is_active } });
    await audit(req, is_active ? "step_model_activated" : "step_model_inactivated", { step_model_id: id });
    res.json({ id, is_active });
  } catch (e) { handle(e, res, next); }
});

// Dependência entre tarefas — recusa tarefa de outra versão.
/** A tarefa `from` depende (direta ou indiretamente) de `target`? */
async function taskDependencyReaches(from: string, target: string): Promise<boolean> {
  const seen = new Set<string>();
  const stack = [from];
  while (stack.length) {
    const cur = stack.pop()!;
    if (cur === target) return true;
    if (seen.has(cur)) continue;
    seen.add(cur);
    const next = await prisma.catalog2TaskDependency.findMany({ where: { task_id: cur }, select: { depends_on_task_id: true } });
    for (const n of next) stack.push(n.depends_on_task_id);
  }
  return false;
}
router.post("/tasks/:id/dependencies", async (req, res, next) => {
  try {
    const v = await versionOfTask(req.params.id as string);
    const dependsOn = z.string().parse(req.body?.depends_on_task_id);
    const dep = await prisma.catalog2Task.findUnique({ where: { id: dependsOn }, select: { version_id: true, id: true } });
    if (!dep || dep.version_id !== v.id) throw new Catalog2Error("A dependência precisa ser uma tarefa da MESMA versão.", 422, "cross_version_ref");
    if (dep.id === req.params.id) throw new Catalog2Error("Uma tarefa não pode depender de si mesma.", 422, "self_dependency");
    if (await taskDependencyReaches(dep.id, req.params.id as string)) throw new Catalog2Error("Ciclo de dependência: essa tarefa já depende (direta ou indiretamente) desta — as duas nunca começariam.", 422, "dependency_cycle");
    await prisma.catalog2TaskDependency.create({ data: { task_id: req.params.id as string, depends_on_task_id: dependsOn } });
    res.status(201).json({ ok: true });
  } catch (e) { handle(e, res, next); }
});
router.delete("/tasks/:id/dependencies/:depId", async (req, res, next) => {
  try {
    await versionOfTask(req.params.id as string);
    await prisma.catalog2TaskDependency.deleteMany({ where: { task_id: req.params.id as string, depends_on_task_id: req.params.depId as string } });
    res.json({ ok: true });
  } catch (e) { handle(e, res, next); }
});

// AI config da tarefa
router.put("/tasks/:id/ai", async (req, res, next) => {
  try {
    await versionOfTask(req.params.id as string);
    const d = z.object({
      provider: z.string().max(120).nullish(), model: z.string().max(120).nullish(),
      est_input_tokens: z.number().int().nonnegative().nullish(), est_output_tokens: z.number().int().nonnegative().nullish(),
      unit_cost_input_per_1k: z.number().nonnegative().nullish(), unit_cost_output_per_1k: z.number().nonnegative().nullish(),
      currency: z.string().length(3).optional(), est_review_rounds: z.number().int().nonnegative().nullish(),
      cost_note: z.string().max(2000).nullish(), human_review_required: z.boolean().optional(), est_runs: z.number().int().min(0).max(10_000_000).nullish(),
      profile_id: z.string().min(1).nullish(), ai_mode: z.enum(AI_MODES).optional(), ai_trigger: z.enum(AI_TRIGGERS).optional(), instructions: z.string().max(20000).nullish(),
    }).parse(req.body);
    if (d.profile_id) {
      const prof = await prisma.catalog2AIProfile.findUnique({ where: { id: d.profile_id } });
      if (!prof || !prof.is_active) throw new Catalog2Error("Escolha um perfil de IA ativo e autorizado.", 422, "invalid_ai_profile");
    }
    const current = await prisma.catalog2TaskAI.findUnique({ where: { task_id: req.params.id as string } });
    // Versão do prompt: sobe sozinha quando as instruções mudam, para cada execução registrar exatamente qual texto usou.
    const promptVersion = d.instructions !== undefined && (d.instructions ?? null) !== (current?.instructions ?? null) ? (current?.prompt_version ?? 0) + 1 : undefined;
    const ai = await prisma.catalog2TaskAI.upsert({
      where: { task_id: req.params.id as string },
      create: { task_id: req.params.id as string, ...d, ...(promptVersion ? { prompt_version: promptVersion } : {}) },
      update: { ...d, ...(promptVersion ? { prompt_version: promptVersion } : {}) },
    });
    res.json(ai);
  } catch (e) { handle(e, res, next); }
});

// ── Perfis de IA autorizados (Pedido 3, fase 5) ─────────────────────
const aiProfileSchema = z.object({
  name: z.string().min(1).max(160), description: z.string().max(4000).nullish(),
  provider: z.string().min(1).max(60).optional(), model: z.string().min(1).max(120).optional(),
  unit_cost_input_per_1k: z.number().nonnegative().nullish(), unit_cost_output_per_1k: z.number().nonnegative().nullish(),
  fixed_cost_per_run: z.number().nonnegative().optional(), currency: z.string().length(3).optional(),
  allowed_actors: z.array(z.enum(AI_ACTORS)).optional(), base_instructions: z.string().max(20000).nullish(), is_active: z.boolean().optional(),
  input_format: z.string().max(4000).nullish(), output_format: z.string().max(4000).nullish(),
  max_tokens_per_run: z.number().int().min(1).max(2_000_000).nullish(), max_runs_per_task: z.number().int().min(1).max(1000).nullish(),
  // Custo de IA (2026-10-02): unidade de tokens do preço informado, execuções previstas e limite de revisões.
  unit_tokens: z.number().int().min(1).max(100_000_000).optional(), expected_runs: z.number().int().min(0).max(10_000_000).nullish(), review_limit: z.number().int().min(0).max(100).nullish(),
  on_failure: z.enum(ON_FAILURE_ACTIONS).optional(), fallback_human: z.boolean().optional(), requires_human_review: z.boolean().optional(),
});
const aiProfileData = (d: z.infer<typeof aiProfileSchema>) => ({ ...d, allowed_actors: d.allowed_actors ? d.allowed_actors.join(",") : undefined });
function assertAIProfileProvider(provider: string | null | undefined, model: string | null | undefined) {
  const p = findProvider(provider);
  if (!p) throw new Catalog2Error(`O provedor "${provider}" não é conhecido pela plataforma.`, 422, "ai_provider_unknown");
  if (model && !p.models.includes(model)) throw new Catalog2Error(`O modelo "${model}" não está disponível no provedor ${p.label}.`, 422, "ai_model_unavailable");
}
const AI_PROFILE_STATUS_LABEL: Record<string, string> = {
  inactive_no_credentials: "Inativo — provedor sem credenciais",
  inactive: "Inativo",
  provider_not_configured: "Provedor não configurado",
  cost_not_defined: "Custo de IA ainda não definido",
  configured: "Configurado",
};
function aiProfileView<T extends { id: string; provider: string; model: string; is_active?: boolean; unit_cost_input_per_1k?: number | null; unit_cost_output_per_1k?: number | null; fixed_cost_per_run?: number | null }>(p: T) {
  const configured = providerConfigured(p.provider);
  const costDefined = (p.unit_cost_input_per_1k != null && p.unit_cost_output_per_1k != null) || (p.fixed_cost_per_run ?? 0) > 0;
  // Estado explícito: nunca confundir "IA desativada", "sem credencial", "custo indefinido" e "configurada".
  const status = p.is_active === false ? (configured ? "inactive" : "inactive_no_credentials") : !configured ? "provider_not_configured" : !costDefined ? "cost_not_defined" : "configured";
  return { ...p, provider_configured: configured, cost_defined: costDefined, status, status_label: AI_PROFILE_STATUS_LABEL[status] };
}
router.get("/ai-providers", (_req, res) => {
  res.json({ data: AI_PROVIDERS.map((p) => ({ key: p.key, label: p.label, models: p.models, configured: providerConfigured(p.key) })), on_failure: ON_FAILURE_ACTIONS.map((k) => ({ key: k, label: ON_FAILURE_LABEL[k] })) });
});
router.get("/ai-profiles", async (_req, res, next) => {
  try {
    const rows = await prisma.catalog2AIProfile.findMany({ orderBy: [{ is_active: "desc" }, { name: "asc" }], include: { _count: { select: { tasks: true } } } });
    res.json({ data: rows.map(({ _count, ...p }) => ({ ...aiProfileView(p), task_count: _count.tasks })) });
  } catch (e) { handle(e, res, next); }
});
router.get("/ai-profiles/:id", async (req, res, next) => {
  try {
    const p = await prisma.catalog2AIProfile.findUnique({ where: { id: req.params.id as string }, include: { prompt_versions: { orderBy: { version: "desc" } }, _count: { select: { tasks: true } } } });
    if (!p) throw new Catalog2Error("Perfil de IA não encontrado.", 404);
    const { _count, ...rest } = p;
    const runs = await prisma.projectTaskAIRun.aggregate({ where: { profile_id: p.id }, _count: true, _sum: { cost: true } });
    res.json({ ...aiProfileView(rest), task_count: _count.tasks, run_count: runs._count, total_cost: runs._sum.cost ?? 0 });
  } catch (e) { handle(e, res, next); }
});
/** Histórico de execuções do perfil (todas as tarefas). */
router.get("/ai-profiles/:id/runs", async (req, res, next) => {
  try {
    const rows = await prisma.projectTaskAIRun.findMany({
      where: { profile_id: req.params.id as string }, orderBy: { created_at: "desc" }, take: Math.min(Number(req.query.limit) || 50, 200),
      select: { id: true, project_task_id: true, mode: true, status: true, prompt_version: true, model: true, prompt_tokens: true, completion_tokens: true, cost: true, currency: true, duration_ms: true, error_message: true, created_at: true },
    });
    res.json({ data: rows });
  } catch (e) { handle(e, res, next); }
});
router.post("/ai-profiles", async (req, res, next) => {
  try {
    const d = aiProfileSchema.parse(req.body);
    assertAIProfileProvider(d.provider ?? "gemini", d.model ?? "gemini-2.5-flash");
    const created = await prisma.$transaction(async (tx) => {
      const c = await tx.catalog2AIProfile.create({ data: aiProfileData(d) });
      await tx.catalog2AIProfilePromptVersion.create({ data: { profile_id: c.id, version: 1, base_instructions: c.base_instructions, input_format: c.input_format, output_format: c.output_format, changed_by_user_id: req.user!.id } });
      return c;
    });
    await audit(req, "ai_profile_created", { id: created.id });
    res.status(201).json(aiProfileView(created));
  } catch (e) { handle(e, res, next); }
});
router.put("/ai-profiles/:id", async (req, res, next) => {
  try {
    const d = aiProfileSchema.partial().parse(req.body);
    const cur = await prisma.catalog2AIProfile.findUnique({ where: { id: req.params.id as string } });
    if (!cur) throw new Catalog2Error("Perfil de IA não encontrado.", 404);
    assertAIProfileProvider(d.provider ?? cur.provider, d.model ?? cur.model);
    // Instrução-base ou formatos mudaram → nova versão do prompt (a anterior fica no histórico).
    const promptChanged = (d.base_instructions !== undefined && (d.base_instructions ?? null) !== cur.base_instructions)
      || (d.input_format !== undefined && (d.input_format ?? null) !== cur.input_format)
      || (d.output_format !== undefined && (d.output_format ?? null) !== cur.output_format);
    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.catalog2AIProfile.update({ where: { id: cur.id }, data: { ...aiProfileData(d as z.infer<typeof aiProfileSchema>), ...(promptChanged ? { prompt_version: cur.prompt_version + 1 } : {}) } });
      if (promptChanged) await tx.catalog2AIProfilePromptVersion.create({ data: { profile_id: u.id, version: u.prompt_version, base_instructions: u.base_instructions, input_format: u.input_format, output_format: u.output_format, changed_by_user_id: req.user!.id } });
      return u;
    });
    await audit(req, "ai_profile_updated", { id: updated.id, prompt_version: updated.prompt_version });
    res.json(aiProfileView(updated));
  } catch (e) { handle(e, res, next); }
});
/** Teste de conexão com o provedor (não grava nada em nenhuma tarefa). */
router.post("/ai-profiles/:id/test-connection", async (req, res, next) => {
  try {
    const p = await prisma.catalog2AIProfile.findUnique({ where: { id: req.params.id as string } });
    if (!p) throw new Catalog2Error("Perfil de IA não encontrado.", 404);
    const problem = providerProblem(p.provider, p.model);
    if (problem) { res.json({ ok: false, stage: "configuracao", message: problem }); return; }
    const t0 = Date.now();
    try {
      const out = await invokeTaskAIAdapter({ systemInstruction: "Teste de conexão. Responda apenas com a palavra OK.", prompt: "Responda OK.", model: p.model });
      // Nada do prompt ou da resposta é gravado: devolvemos só o resultado do teste.
      res.json({ ok: true, stage: "conexao", message: "Conexão funcionando.", latency_ms: Date.now() - t0, adapter: currentTaskAIAdapterName(), response_received: out.text.length > 0 });
    } catch (e) {
      res.json({ ok: false, stage: "conexao", message: redactSecrets((e as Error)?.message ?? e).slice(0, 300), latency_ms: Date.now() - t0 });
    }
  } catch (e) { handle(e, res, next); }
});
/** Execução de TESTE descartável: usa as instruções do perfil com um texto de exemplo; nada é gravado em tarefa, entrega ou histórico de execução. */
router.post("/ai-profiles/:id/test-run", async (req, res, next) => {
  try {
    const d = z.object({ sample_input: z.string().min(1).max(8000), extra_instructions: z.string().max(8000).nullish(), confirm_cost: z.boolean().optional() }).parse(req.body);
    const p = await prisma.catalog2AIProfile.findUnique({ where: { id: req.params.id as string } });
    if (!p) throw new Catalog2Error("Perfil de IA não encontrado.", 404);
    const problem = providerProblem(p.provider, p.model);
    if (problem) throw new Catalog2Error(problem, 422, "ai_provider_not_ready");
    // Pode gerar custo real no provedor: só roda com confirmação explícita (a tela mostra a estimativa antes).
    if (!d.confirm_cost) {
      const estIn = Math.ceil((d.sample_input.length + (p.base_instructions?.length ?? 0)) / 4);
      const err = new Catalog2Error("Este teste chama o provedor de IA e pode gerar custo. Confirme para executar (confirm_cost).", 422, "cost_confirmation_required") as Catalog2Error & { details?: unknown };
      err.details = { estimated_input_tokens: estIn, estimated_cost_note: runCost(p, estIn, p.max_tokens_per_run ?? 1000), currency: p.currency };
      throw err;
    }
    const instructions = [p.base_instructions?.trim(), d.extra_instructions?.trim(), p.output_format ? `Formato de saída: ${p.output_format}` : ""].filter(Boolean).join("\n\n");
    const t0 = Date.now();
    try {
      const out = await invokeTaskAIAdapter({ systemInstruction: instructions, prompt: `${p.input_format ? `Formato de entrada: ${p.input_format}\n\n` : ""}ENTRADAS:\n${d.sample_input}`, model: p.model });
      res.json({ ok: true, persisted: false, output_text: out.text, missing_information: out.missing_information, prompt_tokens: out.promptTokens, completion_tokens: out.completionTokens, cost: runCost(p, out.promptTokens, out.completionTokens), currency: p.currency, duration_ms: Date.now() - t0, prompt_version: p.prompt_version });
    } catch (e) {
      res.json({ ok: false, persisted: false, message: redactSecrets((e as Error)?.message ?? e).slice(0, 300), duration_ms: Date.now() - t0 });
    }
  } catch (e) { handle(e, res, next); }
});

// ── Condições TIPADAS ──────────────────────────────────────────────
const conditionSchema = z.object({
  key: z.string().min(1).max(60), name: z.string().min(1).max(160), description: z.string().max(4000).nullish(),
  is_active: z.boolean().optional(), sort_order: z.number().int().optional(),
  trigger_source: z.enum(CONDITION_TRIGGER_SOURCES), trigger_ref: z.string().max(120).nullish(),
  operator: z.enum(CONDITION_OPERATORS), comparison_value: z.string().max(200).nullish(),
  effect_type: z.enum(CATALOG2_EFFECT_TYPES), effect_value: z.string().min(1).max(500),
  ...chargeShape,
});
router.post("/versions/:id/conditions", async (req, res, next) => {
  try {
    await editableVersionOrThrow(req.params.id as string);
    const d = conditionSchema.parse(req.body);
    await assertChargeMeta(req.params.id as string, d);
    const condCtx = await buildEffectCtx(req.params.id as string);
    const err = validateConditionShape(d, condCtx) ?? validateEffortEffect(d.effect_type, d.effect_value, d, condCtx);
    if (err) throw new Catalog2Error(err, 422, "invalid_condition");
    const explanation = describeCondition(d);
    res.status(201).json(await prisma.catalog2Condition.create({ data: { version_id: req.params.id as string, ...d, description: d.description ?? null, trigger_ref: d.trigger_ref ?? null, comparison_value: d.comparison_value ?? null, is_active: d.is_active ?? true, sort_order: d.sort_order ?? 99, explanation } }));
  } catch (e) { handle(e, res, next); }
});
async function versionOfCondition(id: string) {
  const c = await prisma.catalog2Condition.findUnique({ where: { id }, select: { version_id: true } });
  if (!c) throw new Catalog2Error("Condição não encontrada.", 404);
  return editableVersionOrThrow(c.version_id);
}
router.put("/conditions/:id", async (req, res, next) => {
  try {
    const v = await versionOfCondition(req.params.id as string);
    const cur = await prisma.catalog2Condition.findUniqueOrThrow({ where: { id: req.params.id as string } });
    const d = conditionSchema.partial().parse(req.body);
    const merged = { ...cur, ...d };
    await assertChargeMeta(v.id, merged);
    const condCtx = await buildEffectCtx(v.id);
    const err = validateConditionShape(merged, condCtx) ?? validateEffortEffect(merged.effect_type, merged.effect_value, merged, condCtx);
    if (err) throw new Catalog2Error(err, 422, "invalid_condition");
    const updated = await prisma.catalog2Condition.update({ where: { id: req.params.id as string }, data: { ...d, explanation: describeCondition(merged) } });
    res.json(updated);
  } catch (e) { handle(e, res, next); }
});
router.delete("/conditions/:id", async (req, res, next) => {
  try {
    await versionOfCondition(req.params.id as string);
    await prisma.catalog2Condition.delete({ where: { id: req.params.id as string } });
    res.json({ ok: true });
  } catch (e) { handle(e, res, next); }
});

// ── Solicitações comerciais (orçamento personalizado / análise / contratação assistida) ──
router.get("/commercial-requests", async (req, res, next) => {
  try {
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const product_id = typeof req.query.product_id === "string" ? req.query.product_id : undefined;
    const requested_by_user_id = typeof req.query.requested_by_user_id === "string" ? req.query.requested_by_user_id : undefined;
    const assigned_to_user_id = typeof req.query.assigned_to_user_id === "string" ? req.query.assigned_to_user_id : undefined;
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const rows = await prisma.catalog2CommercialRequest.findMany({
      where: {
        ...(status ? { status } : {}), ...(product_id ? { product_id } : {}),
        ...(requested_by_user_id ? { requested_by_user_id } : {}), ...(assigned_to_user_id ? { assigned_to_user_id } : {}),
        ...(search ? { OR: [{ client_note: { contains: search } }, { response_note: { contains: search } }, { internal_note: { contains: search } }] } : {}),
      }, orderBy: { created_at: "desc" }, take: 200,
    });
    const products = await prisma.catalog2Product.findMany({ where: { id: { in: [...new Set(rows.map((r) => r.product_id))] } }, select: { id: true, sequence_number: true, internal_name: true } });
    const byId = new Map(products.map((p) => [p.id, p]));
    res.json({ data: rows.map((r) => ({ ...r, selection: safeJson(r.selection_json, null), reasons: safeJson(r.reasons_json, []), pricing: safeJson(r.pricing_snapshot_json, null), history: safeJson(r.history_json, []), product: byId.get(r.product_id) ?? null })) });
  } catch (e) { handle(e, res, next); }
});
router.patch("/commercial-requests/:id", async (req, res, next) => {
  try {
    const d = z.object({
      status: z.enum(["novo", "em_analise", "aguardando_cliente", "proposta_preparada", "proposta_enviada", "aprovado", "recusado", "cancelado", "expirado", "aberta", "respondida", "convertida"]).optional(),
      response_note: z.string().max(4000).nullish(), internal_note: z.string().max(4000).nullish(),
      assigned_to_user_id: z.string().max(191).nullish(), proposed_price: z.number().min(0).max(1e12).nullish(),
      proposed_deadline_days: z.number().min(0).max(100000).nullish(), proposal_valid_until: z.string().datetime().nullish(),
      client_response_note: z.string().max(4000).nullish(), converted_project_id: z.string().max(191).nullish(),
    }).parse(req.body);
    const cur = await prisma.catalog2CommercialRequest.findUnique({ where: { id: req.params.id as string } });
    if (!cur) throw new Catalog2Error("Solicitação não encontrada.", 404);
    const beforeHistory = safeJson<Array<Record<string, unknown>>>(cur.history_json, []);
    const entry = { at: new Date().toISOString(), by_user_id: req.user!.id, status_before: cur.status, status_after: d.status ?? cur.status, changes: Object.keys(d) };
    const row = await prisma.catalog2CommercialRequest.update({ where: { id: cur.id }, data: {
      ...(d.status ? { status: d.status } : {}), ...(d.response_note !== undefined ? { response_note: d.response_note } : {}),
      ...(d.internal_note !== undefined ? { internal_note: d.internal_note } : {}), ...(d.assigned_to_user_id !== undefined ? { assigned_to_user_id: d.assigned_to_user_id } : {}),
      ...(d.proposed_price !== undefined ? { proposed_price: d.proposed_price } : {}), ...(d.proposed_deadline_days !== undefined ? { proposed_deadline_days: d.proposed_deadline_days } : {}),
      ...(d.proposal_valid_until !== undefined ? { proposal_valid_until: d.proposal_valid_until ? new Date(d.proposal_valid_until) : null } : {}),
      ...(d.client_response_note !== undefined ? { client_response_note: d.client_response_note } : {}), ...(d.converted_project_id !== undefined ? { converted_project_id: d.converted_project_id } : {}),
      history_json: JSON.stringify([...beforeHistory, entry]), handled_by_user_id: req.user!.id, handled_at: new Date(),
    } });
    await audit(req, "commercial_request_updated", { id: cur.id, status: d.status ?? cur.status, fields: Object.keys(d) });
    res.json(row);
  } catch (e) { handle(e, res, next); }
});

// ── Simulador e Pré-visualização (mesmo cálculo do backend) ─────────
const selectionSchema = z.object({
  variation_option_keys: z.array(z.string()).optional(),
  variation_quantities: z.record(z.string(), z.number().int().min(0).max(100000)).optional(),
  addon_keys: z.array(z.string()).optional(),
  // Adicionais tipados: quantidade inteira, valor informado ou escolhas (seleção única/múltipla/faixa).
  addon_selections: z.record(z.string(), z.object({ quantity: z.number().int().min(0).max(100000).optional(), value: z.number().max(1e12).optional(), choice_keys: z.array(z.string().max(60)).max(50).optional() })).optional(),
  quantity: z.number().int().positive().max(100000).optional(),
  answers: z.record(z.string()).optional(),
  emergency: z.boolean().optional(),
});
router.post("/versions/:id/simulate", async (req, res, next) => {
  try {
    const sel = selectionSchema.parse(req.body ?? {});
    const pricing = await computePricing(req.params.id as string, sel);
    // A simulação provisória usa o mesmo conjunto de escolhas, mas permanece
    // separada do preço comercial e nunca torna o produto contratável.
    // FONTE ÚNICA: o mesmo cálculo (regra real versionada). "pricing_simulation" é mantido só por compatibilidade e é o MESMO resultado.
    res.json({ selection: sel, pricing, pricing_simulation: pricing, price_summary: priceSummary(pricing), selection_issues: pricing.selection_issues, quote_requirements: pricing.quote_requirements });
  } catch (e) { handle(e, res, next); }
});

// Ação EXPLÍCITA do administrador para resolver "configuração comercial inconsistente". Só em versão em edição.
router.get("/commercial-resolution-options", (_req, res) => {
  res.json({ data: RESOLUTION_ACTIONS.map((a) => ({ action: a, ...RESOLUTION_EFFECTS[a] })) });
});
router.post("/versions/:id/commercial-resolution", async (req, res, next) => {
  try {
    const d = z.object({ action: z.enum(RESOLUTION_ACTIONS) }).parse(req.body);
    const version = await editableVersionOrThrow(req.params.id as string);
    const result = await prisma.$transaction(async (tx) => {
      const r = await applyResolution(tx, version.id, version.product_id, d.action as ResolutionAction);
      await recordCatalog2ProductHistory(tx, {
        productId: version.product_id, versionId: version.id, eventType: "commercial_resolution",
        description: `Configuração comercial: "${RESOLUTION_EFFECTS[d.action as ResolutionAction].label}" (decisão do administrador).`,
        before: r.before, after: r.after, actorUserId: req.user!.id, actorKind: "user",
      });
      return r;
    });
    await audit(req, "commercial_resolution", { version_id: version.id, action: d.action });
    res.json({ ok: true, action: d.action, ...result });
  } catch (e) { handle(e, res, next); }
});
router.get("/versions/:id/preview", async (req, res, next) => {
  try {
    const version = await prisma.catalog2ProductVersion.findUnique({
      where: { id: req.params.id as string },
      include: {
        product: { include: { pillar: true, category: true, four_f: { include: { four_f: true } } } },
        variations: { orderBy: { sort_order: "asc" }, include: { options: { orderBy: { sort_order: "asc" } } } },
        addons: { orderBy: { sort_order: "asc" } },
        tasks: { orderBy: { sort_order: "asc" }, select: { name: true, execution_mode: true } },
      },
    });
    if (!version) throw new Catalog2Error("Versão não encontrada.", 404);
    const sel = await defaultSelection(req.params.id as string);
    const pricing = await computePricing(req.params.id as string, sel);
    res.json({
      name: version.product.internal_name,
      title: version.title,
      description: version.full_description ?? version.summary,
      pillar: version.product.pillar?.name ?? null,
      category: version.product.category?.name ?? null,
      four_f: version.product.four_f.map((l) => l.four_f.name),
      variations: version.variations.map((va) => ({ name: va.name, options: va.options.map((o) => o.label) })),
      addons: version.addons.map((a) => ({ name: a.name, description: a.description })),
      tasks: version.tasks.map((t) => ({ name: t.name, mode: t.execution_mode })),
      estimated_deadline_days: pricing.estimated_deadline_days,
      commercial_deadline_pending: pricing.deadline.commercial_deadline_pending,
      effort_days: pricing.deadline.effort_days,
      price: pricing.lines.commercial_final_price.amount,
      price_pending: pricing.pricing_pending,
      // Sem tarefa ativa não há base de custo — a UI não mostra "R$ 0,00" como
      // preço válido (derivado do mesmo cálculo, sem alterá-lo).
      active_task_count: pricing.active_task_keys.length,
      has_cost_base: pricing.active_task_keys.length > 0,
      pending_info: pricing.pending_info,
      currency: pricing.currency,
      default_selection: sel,
    });
  } catch (e) { handle(e, res, next); }
});

// ═══════════════════════════════════════════════════════════════════════
// IMPORTAÇÃO DOS 36 PRODUTOS (sprint de produtos, bloco 4/6) — leitura,
// painel de resumo, relatório de qualidade e resolução de pendências.
// Tudo Admin Master (o router já garante). Nada aqui publica produto.
// ═══════════════════════════════════════════════════════════════════════

// Ordem de prioridade para recalcular o "estado de preparo" ao resolver
// pendências — igual à do importador (import-products.ts).
const PENDENCY_PRIORITY = [
  "content_review_pending",
  "classification_decision_pending",
  "price_pending",
  "deadline_pending",
  "portfolio_pending",
  "rose_review_pending",
];
function reviewStateFromPendencies(pendencies: string[]): string {
  for (const p of PENDENCY_PRIORITY) if (pendencies.includes(p)) return p;
  return "ready_for_final_review";
}

// Painel de resumo da última importação aplicada + panorama por estado.
router.get("/import/summary", async (_req, res, next) => {
  try {
    const lastApply = await prisma.catalog2ImportBatch.findFirst({
      where: { mode: "apply" },
      orderBy: { started_at: "desc" },
    });
    const [totalImported, byState, origins] = await Promise.all([
      prisma.catalog2ProductImportOrigin.count(),
      prisma.catalog2ProductImportOrigin.groupBy({ by: ["review_state"], _count: { _all: true } }),
      prisma.catalog2ProductImportOrigin.findMany({
        select: { pendencies_json: true, rose_reviewed: true, divergences_json: true, human_edited_at: true, historical_price_min: true },
      }),
    ]);
    const pendencyCounts: Record<string, number> = {};
    let decisionsPending = 0;
    for (const o of origins) {
      for (const p of safeJsonArray(o.pendencies_json)) pendencyCounts[p] = (pendencyCounts[p] ?? 0) + 1;
      const divs = safeJson<Array<{ decision_pending?: boolean }>>(o.divergences_json, []);
      if (divs.some((d) => d.decision_pending)) decisionsPending++;
    }
    res.json({
      has_import: !!lastApply,
      last_batch: lastApply
        ? {
            id: lastApply.id,
            mode: lastApply.mode,
            rule_version: lastApply.rule_version,
            status: lastApply.status,
            started_at: lastApply.started_at,
            finished_at: lastApply.finished_at,
            expected_products: lastApply.expected_products,
            created: lastApply.created_count,
            updated: lastApply.updated_count,
            unchanged: lastApply.unchanged_count,
            divergences: lastApply.divergence_count,
            source_main: { name: lastApply.source_main_name, checksum: lastApply.source_main_checksum },
            source_rose: { name: lastApply.source_rose_name, checksum: lastApply.source_rose_checksum },
            source_ata_checksum: lastApply.source_ata_checksum,
          }
        : null,
      total_imported: totalImported,
      // Esperado vem do lote real (Catalog2ImportBatch.expected_products) —
      // nunca "36" fixo.
      expected: lastApply?.expected_products ?? totalImported,
      count_matches_expected: totalImported === (lastApply?.expected_products ?? totalImported),
      rose_reviewed: origins.filter((o) => o.rose_reviewed).length,
      not_rose_reviewed: origins.filter((o) => !o.rose_reviewed).length,
      human_edited: origins.filter((o) => o.human_edited_at).length,
      with_historical_price: origins.filter((o) => o.historical_price_min != null).length,
      by_review_state: Object.fromEntries(byState.map((s) => [s.review_state, s._count._all])),
      by_pendency: pendencyCounts,
      decisions_pending: decisionsPending,
      // Escopo: SÓ os produtos vindos da importação. Nenhum deles pode estar publicado.
      published_count: await prisma.catalog2ProductVersion.count({
        where: { state: "publicada", product: { import_origin: { isNot: null } } },
      }),
    });
  } catch (e) { next(e); }
});

// Relatório de qualidade legível da última importação (report_json do lote).
router.get("/import/quality", async (_req, res, next) => {
  try {
    const last = await prisma.catalog2ImportBatch.findFirst({
      where: { mode: "apply" },
      orderBy: { started_at: "desc" },
      include: { records: { orderBy: { source_index: "asc" } } },
    });
    if (!last) {
      res.json({ has_import: false, message: "Nenhuma importação aplicada ainda. Rode: npm run catalog2:import-products -- --apply" });
      return;
    }
    const report = safeJson<Record<string, unknown>>(last.report_json, {});
    res.json({
      has_import: true,
      batch_id: last.id,
      status: last.status,
      generated_at: last.finished_at,
      report,
      records: last.records.map((r) => ({
        source_index: r.source_index,
        source_name: r.source_name,
        slug: r.slug,
        outcome: r.outcome,
        rose_reviewed: r.rose_reviewed,
        divergences: safeJson(r.divergences_json, []),
        warnings: safeJsonArray(r.warnings_json),
        errors: safeJsonArray(r.errors_json),
      })),
    });
  } catch (e) { next(e); }
});

router.get("/import/batches", async (_req, res, next) => {
  try {
    const batches = await prisma.catalog2ImportBatch.findMany({
      orderBy: { started_at: "desc" },
      take: 50,
      select: {
        id: true, mode: true, status: true, rule_version: true, started_at: true, finished_at: true,
        created_count: true, updated_count: true, unchanged_count: true, divergence_count: true,
        source_main_checksum: true, source_rose_checksum: true,
      },
    });
    res.json({ data: batches });
  } catch (e) { next(e); }
});

// "Origem e revisão" de um produto importado — planilha principal, revisão da
// Rose, campos alterados pela Rose, divergências, referência histórica de
// preço, observações, textos originais preservados, pendências e histórico
// de resoluções. 404 se o produto não veio da importação.
router.get("/products/:id/origin", async (req, res, next) => {
  try {
    const origin = await prisma.catalog2ProductImportOrigin.findUnique({
      where: { product_id: req.params.id as string },
      include: { resolutions: { orderBy: { resolved_at: "desc" } } },
    });
    if (!origin) throw new Catalog2Error("Este produto não foi criado pela importação dos 36.", 404, "not_imported");
    res.json({
      source: { key: origin.source_key, index: origin.source_index, name: origin.source_name },
      rose_reviewed: origin.rose_reviewed,
      area_rose: origin.area_rose,
      review_state: origin.review_state,
      pendencies: safeJsonArray(origin.pendencies_json),
      main_fields: safeJson(origin.main_fields_json, {}),
      rose_fields: safeJson(origin.rose_fields_json, {}),
      rose_changed_fields: Object.keys(safeJson<Record<string, unknown>>(origin.rose_fields_json, {})),
      divergences: safeJson(origin.divergences_json, []),
      original_texts: safeJson(origin.original_texts_json, {}),
      observations: origin.observations,
      historical_price: {
        min: origin.historical_price_min,
        max: origin.historical_price_max,
        note: origin.historical_price_note ?? "Referência histórica da planilha — NÃO é o preço final.",
      },
      human_edited_at: origin.human_edited_at,
      human_edited_by_user_id: origin.human_edited_by_user_id,
      last_import_checksum: origin.last_import_checksum,
      last_import_batch_id: origin.last_import_batch_id,
      resolutions: origin.resolutions.map((r) => ({
        id: r.id,
        pendency_key: r.pendency_key,
        decision: r.decision,
        original_divergence: safeJson(r.original_divergence_json, null),
        resolved_by_user_id: r.resolved_by_user_id,
        resolved_at: r.resolved_at,
      })),
    });
  } catch (e) { handle(e, res, next); }
});

// Resolver UMA pendência: altera só o rascunho/estado de preparo, registra
// quem/quando/decisão e PRESERVA a divergência original no histórico.
router.post("/products/:id/resolve-pendency", async (req, res, next) => {
  try {
    const d = z.object({
      pendency_key: z.string().min(1).max(60),
      decision: z.string().min(1).max(4000),
    }).parse(req.body);
    const origin = await prisma.catalog2ProductImportOrigin.findUnique({ where: { product_id: req.params.id as string } });
    if (!origin) throw new Catalog2Error("Este produto não foi criado pela importação dos 36.", 404, "not_imported");

    const pendencies = safeJsonArray(origin.pendencies_json);
    if (!pendencies.includes(d.pendency_key)) {
      throw new Catalog2Error("Essa pendência não está aberta para este produto.", 422, "pendency_not_open");
    }
    const remaining = pendencies.filter((p) => p !== d.pendency_key);
    // Snapshot da divergência associada (preservada intacta no histórico).
    const divergences = safeJson<Array<{ type: string; detail: string; decision_pending?: boolean }>>(origin.divergences_json, []);
    const relatedDivergence =
      d.pendency_key === "classification_decision_pending"
        ? divergences.find((x) => x.type === "area_vs_category" || x.type === "ebook_classification") ?? null
        : null;

    await prisma.$transaction(async (tx) => {
      await tx.catalog2ReviewResolution.create({
        data: {
          origin_id: origin.id,
          pendency_key: d.pendency_key,
          decision: d.decision,
          original_divergence_json: relatedDivergence ? JSON.stringify(relatedDivergence) : JSON.stringify(divergences),
          resolved_by_user_id: req.user!.id,
        },
      });
      await tx.catalog2ProductImportOrigin.update({
        where: { id: origin.id },
        data: {
          pendencies_json: JSON.stringify(remaining),
          review_state: reviewStateFromPendencies(remaining),
          // decisão humana registrada → o importador não mexe mais no rascunho.
          human_edited_at: origin.human_edited_at ?? new Date(),
          human_edited_by_user_id: origin.human_edited_by_user_id ?? req.user!.id,
        },
      });
    });
    await audit(req, "import_pendency_resolved", { product_id: req.params.id, pendency_key: d.pendency_key });
    res.json({
      ok: true,
      pendency_key: d.pendency_key,
      remaining_pendencies: remaining,
      review_state: reviewStateFromPendencies(remaining),
    });
  } catch (e) { handle(e, res, next); }
});

// ═══════════════════════════════════════════════════════════════════════
// PRONTIDÃO PARA O CATÁLOGO DO CLIENTE (sprint de produtos, bloco 5/6).
// Por produto: conteúdo, classificação, variações, adicionais, tarefas,
// etapas, preço, prazo, portfólio, revisão da Rose e publicação — cada
// item = pronto | pendente | bloqueador | opcional. Os 36 seguem rascunho.
// ═══════════════════════════════════════════════════════════════════════
type ReadinessLevel = "pronto" | "pendente" | "bloqueador" | "opcional";

// Include compartilhado — o painel de prontidão (lista + por produto) usa
// exatamente a mesma consulta e as mesmas regras.
const READINESS_INCLUDE = {
  pillar: { select: { name: true } },
  category: { select: { name: true } },
  four_f: { select: { four_f_id: true } },
  import_origin: { select: { source_index: true, rose_reviewed: true, pendencies_json: true, review_state: true } },
  versions: {
    orderBy: { version_number: "desc" as const },
    include: {
      _count: { select: { variations: true, addons: true, tasks: true } },
      // Etapas não são relação direta da versão — contamos pelas tarefas.
      // specialty_id/estimated_minutes: usados pra CALCULAR ao vivo se
      // alguma tarefa está sem esforço definido (reunião 10/09, correção
      // "task_effort_fields_pending") — nunca lido de um registro
      // histórico de pendência.
      tasks: { select: { name: true, specialty_id: true, estimated_minutes: true, effort_is_provisional: true, _count: { select: { steps: true } }, steps: { select: { name: true, specialty_id: true, estimated_minutes: true } } } },
    },
  },
} satisfies Prisma.Catalog2ProductInclude;

type ReadinessProduct = Prisma.Catalog2ProductGetPayload<{ include: typeof READINESS_INCLUDE }>;

// Regra ÚNICA de prontidão por produto (nenhuma duplicação no frontend nem
// entre rotas). Só leitura — nada aqui grava ou publica.
async function loadProvisionalPreview(productId: string) {
  const row = await prisma.catalog2ProvisionalPreview.findUnique({ where: { product_id: productId } });
  if (!row) return null;
  return {
    is_provisional: true as const,
    needs_review: row.needs_review,
    image_path: row.image_path,
    image_source_note: row.image_source_note,
    price_amount: row.price_amount,
    deadline_days: row.deadline_days,
    modality: row.modality,
    contract_note: row.contract_note,
    highlights: safeJsonArray(row.highlights_json),
    included_items: safeJsonArray(row.included_items_json) as unknown as { title: string; description?: string }[],
    options: safeJsonArray(row.options_json) as unknown as { name: string; price: number; deadline_days: number; modality: string; features: string[] }[],
    portfolio_refs: safeJsonArray(row.portfolio_refs_json),
  };
}

// Ids dos produtos que têm ao menos um bloqueio/pendência no checklist (mesma regra do editor).
async function productIdsWithOpenReadiness(): Promise<string[]> {
  const all = await prisma.catalog2Product.findMany({ include: READINESS_INCLUDE });
  const out: string[] = [];
  for (const prod of all) {
    const r = await computeProductReadiness(prod);
    if (r.blockers.length + r.pendings.length > 0) out.push(prod.id);
  }
  return out;
}

async function computeProductReadiness(p: ReadinessProduct, forVersionId?: string) {
  const draft = p.versions.find((v) => v.state === "rascunho") ?? p.versions[0] ?? null;
  const published = p.versions.find((v) => v.id === p.published_version_id) ?? null;
  // No editor, a prontidão é da versão que está sendo EDITADA (rascunho); nas listas, da publicada.
  const targetVersion = (forVersionId ? p.versions.find((v) => v.id === forVersionId) : null) ?? published ?? draft;
  const pend = safeJsonArray(p.import_origin?.pendencies_json);
  const has = (k: string) => pend.includes(k);
  const taskCount = targetVersion?._count.tasks ?? 0;
  const stepCount = (targetVersion?.tasks ?? []).reduce((a, t) => a + t._count.steps, 0);
  // Base (sempre existe) x condicional (só entra quando o cenário liga): nunca misturar na apresentação.
  const taskGroups = targetVersion ? await prisma.catalog2Task.groupBy({ by: ["is_conditional"], where: { version_id: targetVersion.id }, _count: { _all: true } }) : [];
  const stepGroups = targetVersion ? await prisma.catalog2TaskStep.groupBy({ by: ["is_conditional"], where: { task: { version_id: targetVersion.id } }, _count: { _all: true } }) : [];
  const countOf = (g: Array<{ is_conditional: boolean; _count: { _all: number } }>, cond: boolean) => g.find((x) => x.is_conditional === cond)?._count._all ?? 0;
  /** "6 tarefas-base + 2 condicionais (8 possíveis; só as ativadas pelo cenário entram na execução)" — nunca tudo misturado como se executasse sempre. */
  const countNote = (what: string, base: number, cond: number, total: number) => (cond > 0 ? `${base} ${what}(s)-base + ${cond} condicional(is) — ${total} possíveis; só as ativadas pelo cenário entram na execução e no preço.` : `${total} ${what}(s).`);
  // Calculado AO VIVO a partir das tarefas reais — nunca lido de um
  // registro histórico de pendência (bug corrigido reunião 10/09: um
  // produto com human_edited_at ficava fora da contagem mesmo com tarefas
  // sem especialidade/horas). Reflete o estado atual e some sozinho assim
  // que todas as tarefas da versão forem completadas.
  const tasksForEffort = targetVersion?.tasks ?? [];
  // Esforço definido no nível da tarefa (especialidade + minutos) OU nas etapas
  // (cada etapa com minutos usa a própria especialidade ou a da tarefa).
  const hasMissingTaskEffort = tasksForEffort.some((t: any) => {
    const allSteps = t.steps ?? [];
    // Com etapas: cada etapa precisa de horas E especialidade (própria ou da tarefa).
    if (allSteps.length > 0) return allSteps.some((s: any) => !((s.estimated_minutes ?? 0) > 0) || !(s.specialty_id ?? t.specialty_id));
    return !t.specialty_id || t.estimated_minutes == null;
  });
  const hasProvisionalTaskEffort = tasksForEffort.some((t) => t.effort_is_provisional);
  const hasIncompleteTaskEffort = hasMissingTaskEffort || hasProvisionalTaskEffort;
  // Regra 9 (reunião 10/09): a prontidão distingue os três estados —
  // "missing" (specialty_id/estimated_minutes ausentes), "provisional"
  // (preenchidos, mas marcados como dado de teste) e "real_reviewed"
  // (preenchidos e nenhum marcado como provisório).
  const effortDataState: "missing" | "provisional" | "real_reviewed" =
    tasksForEffort.length === 0 || hasMissingTaskEffort
      ? "missing"
      : hasProvisionalTaskEffort
        ? "provisional"
        : "real_reviewed";

  let pricing: Awaited<ReturnType<typeof computePricing>> | null = null;
  if (targetVersion) {
    try {
      pricing = await computePricing(targetVersion.id, await defaultSelection(targetVersion.id));
    } catch {
      pricing = null;
    }
  }
  const hasActiveTasks = (pricing?.active_task_keys.length ?? taskCount) > 0;

  const items: Record<string, { level: ReadinessLevel; note: string }> = {
    // Produtos novos: o conteúdo é avaliado pelos campos reais (não mais por
    // marcações da importação antiga).
    conteudo: (() => {
      const missing = [
        !String(targetVersion?.title ?? "").trim() && "título comercial",
        !String(targetVersion?.summary ?? "").trim() && "descrição curta",
        !String(targetVersion?.full_description ?? "").trim() && "descrição completa",
      ].filter(Boolean) as string[];
      return missing.length
        ? { level: "bloqueador" as ReadinessLevel, note: `Falta preencher: ${missing.join(", ")}.` }
        : { level: "pronto" as ReadinessLevel, note: "Título e descrições preenchidos." };
    })(),
    classificacao: !p.pillar_id || !p.category_id
      ? { level: "bloqueador", note: "Falta pilar ou categoria." }
      : p.four_f.length === 0
        ? { level: "bloqueador", note: "Falta ao menos uma classificação 4F." }
        : { level: "pronto", note: `${p.pillar?.name ?? "—"} / ${p.category?.name ?? "—"} / ${p.four_f.length} 4F` },
    variacoes: (targetVersion?._count.variations ?? 0) > 0
      ? { level: "pronto", note: `${targetVersion?._count.variations} variação(ões).` }
      : { level: "opcional", note: "Sem variações (permitido)." },
    adicionais: (targetVersion?._count.addons ?? 0) > 0
      ? { level: "pronto", note: `${targetVersion?._count.addons} adicional(is).` }
      : { level: "opcional", note: "Sem adicionais (permitido)." },
    tarefas: taskCount > 0
      ? { level: "pronto", note: countNote("tarefa", countOf(taskGroups, false), countOf(taskGroups, true), taskCount) }
      : { level: "pendente", note: "Nenhuma tarefa — não vira operação sem tarefas (bloco 6)." },
    // Toda tarefa precisa de ao menos uma etapa (a etapa carrega especialidade, horas e o pagamento).
    etapas: (() => {
      const noSteps = (targetVersion?.tasks ?? []).filter((t: any) => t._count.steps === 0).map((t: any) => t.name);
      if (taskCount === 0) return { level: "opcional" as ReadinessLevel, note: "Etapas dependem de tarefas cadastradas." };
      if (noSteps.length > 0) return { level: "bloqueador" as ReadinessLevel, note: `${noSteps.length} tarefa(s) sem etapa: ${noSteps.join(", ")}.` };
      return { level: "pronto" as ReadinessLevel, note: countNote("etapa", countOf(stepGroups, false), countOf(stepGroups, true), stepCount) };
    })(),
    // Reunião 10/09 ("tarefas e etapas dos 36 produtos reais"): as tarefas
    // vieram do texto "Etapas Executáveis por IA" da fonte original — real,
    // mas sem especialidade/horas/dependências (a fonte não define isso).
    // Condição objetiva (dados atuais das tarefas), nunca dependente de
    // human_edited_at — resolve sozinha assim que as tarefas forem
    // completadas.
    esforco_tarefas: taskCount === 0
      ? { level: "opcional", note: "Sem tarefas ainda — nada a estimar." }
      : effortDataState === "missing"
        ? { level: "pendente", note: "Especialidade/horas estimadas de alguma tarefa não definidas — revisão manual pendente." }
        : effortDataState === "provisional"
          ? { level: "pendente", note: "Especialidade/horas PROVISÓRIAS (dado de teste) — revise e confirme os dados reais antes de aprovar comercialmente." }
          : { level: "pronto", note: "Especialidade/horas de todas as tarefas revisadas (dado real)." },
    // Sem tarefa ativa NÃO há base de custo — o preço nunca é "R$ 0,00 válido".
    preco: pricing?.pricing_mode === "on_request"
      ? { level: "pronto", note: "Sob consulta: sem preço público e sem compra automática (não gera cotação)." }
      : hasActiveTasks
      ? pricing?.commercial_ready
        ? { level: "pronto", note: `Preço comercial ${pricing.currency} ${pricing.lines.commercial_final_price.amount}.` }
        : { level: "bloqueador", note: `Preço comercial "A definir": ${pricing?.pending_info.join("; ") || (pricing?.deadline.commercial_deadline_pending ? "prazo comercial base não definido" : "configuração comercial incompleta")}.` }
      : { level: "bloqueador", note: "Sem tarefas cadastradas — base de custo indefinida; a precificação não pode ser calculada." },
    prazo: pricing?.pricing_mode === "on_request"
      ? { level: "pronto", note: "Sob consulta: o prazo é combinado caso a caso." }
      : pricing && !pricing.deadline.commercial_deadline_pending
      ? { level: "pronto", note: `Prazo comercial ${pricing.deadline.commercial_deadline_days} dia(s).` }
      : { level: "bloqueador", note: "Prazo comercial base não definido." },
    // Produtos novos (sem vínculo com a plataforma antiga): não existe mais
    // portfólio obrigatório, revisão da Rose nem pendências de importação.
    publicacao: published
      ? { level: "pronto", note: `v${published.version_number} publicada.` }
      : { level: "bloqueador", note: "Nunca publicado — invisível para o cliente (bloco 5 não publica)." },
  };

  // Tudo o que impediria a publicação (custo/preço/prazo indefinidos, modalidade sem preço, IA sem perfil, ciclo de dependência,
  // modelo inativo, referência quebrada…) aparece no checklist, na versão em edição.
  if (targetVersion && (forVersionId || targetVersion.state === "rascunho")) {
    try {
      const val = await validateVersionForPublish(targetVersion.id);
      items.validacao = val.ok
        ? { level: "pronto", note: "Nenhuma pendência para publicar." }
        : { level: "bloqueador", note: `${val.issues.length} pendência(s) para publicar: ${val.issues.slice(0, 4).join(" | ")}${val.issues.length > 4 ? " …" : ""}` };
    } catch { /* o checklist segue sem esse item */ }
  }

  // Conexões e acessos necessários: só entra no checklist quando o módulo está ativado na versão.
  if (targetVersion) {
    const conn = await connectionsReadinessItem(prisma, targetVersion.id).catch(() => null);
    if (conn) items.conexoes = { level: conn.status === "pronto" ? "pronto" : "pendente", note: conn.detail };
  }

  // "Publicação" não é pendência de preparo: é uma AÇÃO (botão Publicar no editor).
  const blockers = Object.entries(items).filter(([k, v]) => k !== "publicacao" && v.level === "bloqueador").map(([k]) => k);
  const pendings = Object.entries(items).filter(([, v]) => v.level === "pendente").map(([k]) => k);
  return {
    id: p.id,
    slug: p.slug,
    // ID numérico curto do link direto (/admin/catalogo-produtos/:n) — achado
    // do usuário 2026-09-23: "quando eu clico em produto, ele mostra o ID...
    // pra qualquer um" — mesmo esquema já usado por company/agency/líder,
    // agora também no admin (substitui o antigo código p<n> do slug).
    sequence_number: p.sequence_number,
    // Nome COMERCIAL (o mesmo que company/agency/líder veem) — achado do
    // usuário 2026-09-23: "o admin tem que ver o mesmo nome... senão como é
    // que eu vou identificar por nome". `internal_name` (nome interno,
    // geralmente com prefixo "[TESTE LOCAL]"/rascunho) fica como campo
    // separado — mostrado como extra pro admin, nunca no lugar do
    // comercial. Mesma regra do cliente: version.title || internal_name.
    name: targetVersion?.title || p.internal_name,
    internal_name: p.internal_name,
    is_test_local: p.internal_name.startsWith(TEST_LOCAL_PREFIX),
    imported: !!p.import_origin,
    source_index: p.import_origin?.source_index ?? null,
    review_state: p.import_origin?.review_state ?? null,
    status: p.status,
    status_label: CATALOG2_STATUS_LABEL[p.status as Catalog2Status] ?? p.status,
    published: !!published,
    // Item 2 (reunião 2026-09-14): status, publicação e prontidão comercial
    // são eixos independentes — um não apaga o outro. client_visible espelha
    // a mesma regra usada de verdade no catálogo do cliente
    // (checkClientVisibility, catalog2-client.ts): status "Ativo" continua
    // exigindo prontidão comercial pra aparecer; os demais status visíveis
    // (pré-lançamento/pausado/esgotado) aparecem mesmo sem preço/prazo
    // prontos, porque a contratação já está bloqueada pelo status.
    client_visible:
      CATALOG2_CLIENT_VISIBLE_STATUSES.includes(p.status as Catalog2Status) &&
      !!published &&
      (p.status !== "disponivel" || !!pricing?.commercial_ready),
    client_contractable:
      CATALOG2_CONTRACTABLE_STATUSES.includes(p.status as Catalog2Status) &&
      !!published &&
      !!pricing?.commercial_ready,
    task_count: taskCount,
    step_count: stepCount,
    task_count_base: countOf(taskGroups, false),
    task_count_conditional: countOf(taskGroups, true),
    step_count_base: countOf(stepGroups, false),
    step_count_conditional: countOf(stepGroups, true),
    has_active_tasks: hasActiveTasks,
    // Regra 9/10 (reunião 10/09, "36 produtos funcionalmente completos
    // para teste"): distingue ausente × provisório × real revisado, e
    // rotula honestamente um produto com dado provisório — nunca "pronto",
    // nunca escondido, sempre "funcional para teste, pendente de revisão".
    effort_data_state: effortDataState,
    functional_for_test: effortDataState === "provisional",
    functional_for_test_label: effortDataState === "provisional" ? "Funcional para teste, pendente de revisão" : null,
    // Valores numéricos honestos (nunca "R$ 0,00" quando não pronto) — pra
    // ordenar por preço/prazo sem re-parsear a nota de texto no frontend.
    price_amount: pricing?.commercial_ready ? pricing.lines.commercial_final_price.amount : null,
    deadline_days: pricing?.commercial_ready ? pricing.deadline.commercial_deadline_days : null,
    // Resultado administrativo da mesma fórmula, com entradas provisórias
    // segregadas. Nunca substitui price_amount/deadline_days reais e nunca
    // autoriza publicação, cotação ou contratação.
    // FONTE ÚNICA: mesma regra real. Enquanto houver pendência, o valor é só ILUSTRATIVO (nunca de outra configuração).
    pricing_simulation: pricing && !pricing.commercial_ready && pricing.simulation.total != null
      ? {
          is_provisional: false,
          is_illustrative: true,
          rule_version: pricing.rule?.version ?? null,
          price_amount: pricing.price_status === "final" || pricing.price_status === "pending" ? pricing.simulation.total : null,
          deadline_days: pricing.deadline.commercial_deadline_days,
          commercial_ready: false,
          authorizes_publish: false,
          authorizes_quote: false,
          authorizes_contract: false,
        }
      : null,
    items,
    blockers,
    pendings,
    ready_for_client: blockers.length === 0 && !!published,
    // Merchandising administrável (reunião 10/09) — mesma regra do
    // /products: sempre real, nunca preenchido automaticamente.
    merchandising: {
      is_new: p.merch_is_new,
      is_launch: p.merch_is_launch,
      is_promotion: p.merch_is_promotion,
      is_featured: p.merch_is_featured,
      promotion_text: p.merch_promotion_text,
      promotion_valid_until: p.merch_promotion_valid_until,
      badge_priority: p.merch_badge_priority,
    },
    // Camada de demonstração provisória (reparo 2026-09) — nunca substitui os
    // campos reais acima; sempre um objeto SEPARADO e marcado, pra nunca ser
    // confundido com dado comercial aprovado.
    provisional: await loadProvisionalPreview(p.id),
  };
}

router.get("/readiness", async (_req, res, next) => {
  try {
    const products = await prisma.catalog2Product.findMany({ orderBy: { internal_name: "asc" }, include: READINESS_INCLUDE });
    const rows = [];
    for (const p of products) rows.push(await computeProductReadiness(p));
    const final = rows.filter((r) => !r.is_test_local && r.imported);
    res.json({
      // "Esperado" continua vindo do lote real, nunca de "36" fixo.
      expected: (await prisma.catalog2ImportBatch.findFirst({ where: { mode: "apply" }, orderBy: { started_at: "desc" } }))?.expected_products ?? final.length,
      total: rows.length,
      final_imported_total: final.length,
      ready_for_client: rows.filter((r) => r.ready_for_client).length,
      client_visible_now: rows.filter((r) => r.client_visible).length,
      with_blockers: rows.filter((r) => r.blockers.length > 0).length,
      note: "Nenhum produto é publicado neste painel — ele só mostra o que falta.",
      products: rows,
    });
  } catch (e) { next(e); }
});

// Prontidão de UM produto — mesma regra do painel geral, sem recalcular os 37.
router.get("/products/:id/readiness", async (req, res, next) => {
  try {
    const p = await prisma.catalog2Product.findUnique({ where: { id: req.params.id as string }, include: READINESS_INCLUDE });
    if (!p) throw new Catalog2Error("Produto não encontrado.", 404);
    res.json(await computeProductReadiness(p, typeof req.query.version_id === "string" ? req.query.version_id : undefined));
  } catch (e) { handle(e, res, next); }
});

// Memória de cálculo do preço (reunião 10/09, "memória de cálculo da
// precificação — Admin Master"): devolve o PricingResult de computePricing
// NA ÍNTEGRA — tarefas/especialidade/horas/valor-hora, variações,
// adicionais, subtotais, ordem de incidência comercial e preço final.
// Nunca recalculado/reformulado aqui nem no frontend; mesma seleção
// "vitrine" (defaultSelection) usada pela prontidão — não é cotação de
// cliente. Rota já protegida por guardAdminMaster (todo o router).
router.get("/products/:id/pricing-memory", async (req, res, next) => {
  try {
    const p = await prisma.catalog2Product.findUnique({
      where: { id: req.params.id as string },
      select: {
        id: true,
        published_version_id: true,
        versions: { orderBy: { version_number: "desc" }, select: { id: true, state: true, version_number: true } },
      },
    });
    if (!p) throw new Catalog2Error("Produto não encontrado.", 404);
    const draft = p.versions.find((v) => v.state === "rascunho") ?? p.versions[0] ?? null;
    const published = p.versions.find((v) => v.id === p.published_version_id) ?? null;
    const targetVersion = published ?? draft;
    if (!targetVersion) {
      res.json({ version_id: null, version_state: null, pricing: null });
      return;
    }
    const sel = await defaultSelection(targetVersion.id);
    const pricing = await computePricing(targetVersion.id, sel);
    // Reunião 10/09 ("precificação dos 36 produtos funcional para teste"):
    // mesmo motor (computePricing), mesma seleção — só liga o modo
    // simulação (estrutura de configuração PROVISÓRIA e SEPARADA, prazo
    // provisório por produto). NUNCA autoriza nada (commercial_ready
    // sempre false no resultado); só para o Admin Master ver a memória
    // completa fechando matematicamente antes dos dados reais existirem.
    res.json({ version_id: targetVersion.id, version_state: targetVersion.state, pricing, pricing_simulation: pricing });
  } catch (e) { handle(e, res, next); }
});

// ═══════════════════════════════════════════════════════════════════════
// DETALHE COMPLETO DO PRODUTO — reparo 2026-09 ("restaurar o detalhe
// completo do produto, preços e imagens"). Único ponto de leitura para a
// tela de detalhe/contratação do catalog2 no admin: reúne o conteúdo REAL
// (getProductDetail — variações, adicionais, tarefas, etapas) com a
// prontidão (computeProductReadiness) e a camada de demonstração
// provisória (Catalog2ProvisionalPreview), SEMPRE em blocos separados e
// marcados — nunca mistura os dois num único campo "preço"/"imagem".
// ═══════════════════════════════════════════════════════════════════════
router.get("/products/:id/detail-preview", async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const product = await getProductDetail(id);
    const p = await prisma.catalog2Product.findUnique({ where: { id }, include: READINESS_INCLUDE });
    if (!p) throw new Catalog2Error("Produto não encontrado.", 404);
    const readiness = await computeProductReadiness(p);
    res.json({ product, readiness });
  } catch (e) { handle(e, res, next); }
});

// ═══════════════════════════════════════════════════════════════════════
// CHECKOUT ADMIN — Admin Master contrata EM NOME de uma empresa/agência
// (achado do usuário 2026-09-23: "como administrador eu posso conseguir
// contratar... vincular a uma agência, dar de brinde, descontar da
// carteira, gerar link de pagamento — sempre com motivo"). Reaproveita o
// MESMO motor de configuração/cotação/checkout do cliente (configureProduct/
// createQuote/attachCatalog2QuoteToProject), construindo um ClientContext de
// IMPERSONATION para a conta-alvo — nunca uma segunda implementação de
// preço/regra de contratação. Admin nunca contrata "para si mesmo" — sempre
// precisa de um alvo (empresa ou agência) e de um motivo.
// ═══════════════════════════════════════════════════════════════════════

router.get("/checkout-targets", async (req, res, next) => {
  try {
    const q = String(req.query.q ?? "").trim();
    const companyWhere = q ? { OR: [{ name: { contains: q } }, { email: { contains: q } }] } : {};
    const agencyWhere = q ? { name: { contains: q } } : {};
    const [companies, agencies] = await Promise.all([
      prisma.company.findMany({ where: companyWhere, select: { id: true, name: true, email: true, owner_user_id: true }, take: 10, orderBy: { name: "asc" } }),
      prisma.agency.findMany({ where: agencyWhere, select: { id: true, name: true, owner_user_id: true }, take: 10, orderBy: { name: "asc" } }),
    ]);
    const wallets = companies.length + agencies.length > 0
      ? await prisma.wallet.findMany({
          where: {
            OR: [
              ...companies.map((c) => ({ owner_type: "company", owner_id: c.id })),
              ...agencies.map((a) => ({ owner_type: "agency", owner_id: a.id })),
            ],
          },
          select: { owner_type: true, owner_id: true, balance: true },
        })
      : [];
    const balanceOf = (kind: string, id: string) => wallets.find((w) => w.owner_type === kind && w.owner_id === id)?.balance ?? 0;
    res.json({
      data: [
        ...companies.map((c) => ({ kind: "company" as const, id: c.id, name: c.name, email: c.email, wallet_balance: balanceOf("company", c.id) })),
        ...agencies.map((a) => ({ kind: "agency" as const, id: a.id, name: a.name, email: null, wallet_balance: balanceOf("agency", a.id) })),
      ],
    });
  } catch (e) { handle(e, res, next); }
});

router.get("/checkout-targets/:kind/:id/projects", async (req, res, next) => {
  try {
    const kind = req.params.kind as string;
    const id = req.params.id as string;
    if (kind !== "company" && kind !== "agency") throw new Catalog2Error("Tipo de conta inválido.", 400);
    const where = kind === "company" ? { company_id: id } : { agency_id: id };
    const projects = await prisma.project.findMany({
      where: { ...where, status: { notIn: ["cancelled"] } },
      select: { id: true, title: true, project_code: true, status: true, created_at: true },
      orderBy: { created_at: "desc" },
      take: 30,
    });
    res.json({ data: projects });
  } catch (e) { handle(e, res, next); }
});

const adminCheckoutSchema = z.object({
  product: z.string().min(1),
  selection: z.record(z.any()).default({}),
  period: z.string().nullable().optional(),
  target: z.object({ kind: z.enum(["company", "agency"]), id: z.string().min(1) }),
  project_id: z.string().min(1).nullable().optional(),
  settlement: z.enum(["ALLKOINS", "BRINDE", "LINK_PAGAMENTO"]),
  motivo: z.string().trim().min(5, "Descreva o motivo da contratação (mínimo 5 caracteres)."),
});

router.post("/checkout", async (req, res, next) => {
  try {
    const body = adminCheckoutSchema.parse(req.body ?? {});
    const admin = req.user!;

    const targetOwner = body.target.kind === "company"
      ? await prisma.company.findUnique({ where: { id: body.target.id }, select: { id: true, name: true, owner_user_id: true } })
      : await prisma.agency.findUnique({ where: { id: body.target.id }, select: { id: true, name: true, owner_user_id: true } });
    if (!targetOwner) throw new Catalog2Error("Empresa/agência de destino não encontrada.", 404);

    const ctx: ClientContext = {
      user_id: admin.id,
      kind: body.target.kind,
      account_kind: body.target.kind,
      account_id: body.target.id,
      can_view: true,
      can_configure: true,
      can_contract: true,
      can_preview_drafts: false,
      always_sees_all_products: false,
    };

    const configured = await configureProduct(ctx, body.product, body.selection, { preview: false, period: body.period ?? undefined });
    if (!configured.can_generate_quote) {
      throw new Catalog2Error(`Não é possível gerar cotação: ${configured.quote_blockers.join("; ")}`, 409, "not_quotable");
    }
    const quote: any = await createQuote(ctx, body.product, body.selection, body.period ?? undefined);
    await assertPackageOnlyRules([quote.id]);

    const project = await prisma.$transaction(async (tx) => {
      let proj;
      if (body.project_id) {
        proj = await tx.project.findUnique({ where: { id: body.project_id } });
        if (!proj) throw new Catalog2Error("Projeto de destino não encontrado.", 404);
        const belongsToTarget = body.target.kind === "company" ? proj.company_id === body.target.id : proj.agency_id === body.target.id;
        if (!belongsToTarget) throw new Catalog2Error("Este projeto não pertence à conta selecionada.", 409);
      } else {
        proj = await createProjectWithSequentialCode(tx, {
          title: `Pedido Catálogo 2.0 (admin) — ${targetOwner.name}`,
          status: "draft",
          lifecycle: "avulso",
          agency_id: body.target.kind === "agency" ? body.target.id : null,
          company_id: body.target.kind === "company" ? body.target.id : null,
          created_by_user_id: admin.id,
        });
      }
      await attachCatalog2QuoteToProject(tx, {
        projectId: proj.id,
        quoteId: quote.id,
        origin: "CATALOG2",
        pagadorSnapshot: body.target.kind === "agency" ? "AGENCIA" : "CLIENTE",
      });
      await recalculateProjectValue(tx, proj.id);
      return tx.project.findUniqueOrThrow({ where: { id: proj.id } });
    });

    await writeAccessAudit({
      actorId: admin.id,
      action: "catalog2.admin_checkout",
      after: { project_id: project.id, target: body.target, settlement: body.settlement, motivo: body.motivo, quote_id: quote.id },
    });

    if (body.settlement === "LINK_PAGAMENTO") {
      if (targetOwner.owner_user_id) {
        await prisma.systemAlert.create({
          data: {
            type: "catalog2.admin_checkout_link",
            title: "Contratação aguardando pagamento",
            message: `O administrador criou o pedido "${project.title}" (${project.project_code}) para ${targetOwner.name}. Motivo: ${body.motivo}. Acesse o projeto para finalizar o pagamento.`,
            severity: "info",
            category: "alerta",
            entity_type: "project",
            entity_id: project.id,
            user_id: targetOwner.owner_user_id,
            action_url: `/${body.target.kind === "agency" ? "agencia" : "company"}/projetos?produto=${project.id}`,
          },
        });
      }
      res.status(201).json({
        project,
        target: { kind: body.target.kind, id: targetOwner.id, name: targetOwner.name },
        settlement: body.settlement,
        message: "Pedido criado e pendente de pagamento. O responsável foi notificado.",
      });
      return;
    }

    let paymentResult;
    try {
      paymentResult = await withIdempotentRetry(() =>
        prisma.$transaction((tx) =>
          confirmPaymentAndGenerateProjectTasks(tx, {
            projectId: project.id,
            requesterUser: admin,
            paymentMethod: body.settlement,
            notes: body.motivo,
            walletDebit: body.settlement === "ALLKOINS" ? { ownerType: body.target.kind, ownerId: body.target.id } : undefined,
          }),
        ),
      );
    } catch (err) {
      if (err instanceof PaymentValidationError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }
      throw err;
    }

    if (paymentResult.declined) {
      res.status(402).json({ success: false, declined: true, message: paymentResult.declineReason ?? "Não foi possível concluir a contratação.", project });
      return;
    }

    if (targetOwner.owner_user_id) {
      await prisma.systemAlert.create({
        data: {
          type: "catalog2.admin_checkout_settled",
          title: body.settlement === "BRINDE" ? "Contratação cortesia (brinde)" : "Contratação paga com sua carteira allkoin",
          message: `O administrador contratou "${project.title}" (${project.project_code}) em nome de ${targetOwner.name}${body.settlement === "BRINDE" ? ", como cortesia (sem cobrança)" : ", debitado da carteira allkoin"}. Motivo: ${body.motivo}.`,
          severity: "info",
          category: "notificacao",
          entity_type: "project",
          entity_id: project.id,
          user_id: targetOwner.owner_user_id,
          action_url: `/${body.target.kind === "agency" ? "agencia" : "company"}/projetos?produto=${project.id}`,
        },
      });
    }

    const invoice = await prisma.invoice.findUnique({ where: { payment_id: paymentResult.payment.id } });

    res.status(201).json({
      success: true,
      project: paymentResult.project,
      payment: paymentResult.payment,
      invoice,
      target: { kind: body.target.kind, id: targetOwner.id, name: targetOwner.name },
      settlement: body.settlement,
      message: "Contratação concluída.",
    });
  } catch (e) { handle(e, res, next); }
});

// ── Conexões e acessos necessários (módulo universal e opcional) ───────────────
// Catálogo GLOBAL de tipos + exigências por versão. Nunca guarda senha: só descreve o que é exigido.
const connDependentSchema = z.object({ task_key: z.string().min(1), step_key: z.string().nullish(), kind: z.enum(DEPENDENCY_KINDS).default("start") });
const connRequirementSchema = z.object({
  connection_type_id: z.number().int().optional(), connection_type_key: z.string().optional(),
  key: z.string().max(60).optional(), label: z.string().max(191).nullish(),
  when_needed: z.enum(WHEN_NEEDED).optional(), when_task_key: z.string().nullish(), when_step_key: z.string().nullish(), condition_text: z.string().max(2000).nullish(),
  obligation: z.enum(OBLIGATIONS).optional(), method: z.enum(CONNECTION_METHODS).optional(), permission_level: z.string().max(60).optional(),
  pending_behavior: z.enum(PENDING_BEHAVIORS).optional(),
  reason: z.string().max(2000).nullish(), instructions: z.string().max(4000).nullish(), default_grant_scope: z.enum(GRANT_SCOPES).optional(), validation_mode: z.enum(VALIDATION_MODES).optional(),
  asset_rule: z.enum(ASSET_RULES_CONN).optional(), revalidate_days: z.number().int().min(1).max(3650).nullish(), light_check: z.boolean().optional(),
  reminder_interval_hours: z.number().int().min(1).max(8760).nullish(), reminder_limit: z.number().int().min(1).max(50).nullish(), escalate_after_reminders: z.number().int().min(1).max(50).nullish(),
  visible_to_client: z.boolean().optional(), dependents: z.array(connDependentSchema).max(60).optional(),
  // Ativação por gatilhos (2026-10-02).
  activation_mode: z.enum(["manual", "any_trigger", "all_triggers"]).optional(),
  triggers: z.array(z.object({ kind: z.string().min(1).max(40), ref_key: z.string().max(120).nullish(), ref_value: z.string().max(200).nullish(), operator: z.string().max(20).nullish() })).max(40).optional(),
});
router.get("/connection-vocabulary", (_req, res) => {
  res.json({
    methods: CONNECTION_METHODS.map((k) => ({ key: k, label: CONNECTION_METHOD_LABEL[k] })), states: CONNECTION_STATES.map((k) => ({ key: k, label: CONNECTION_STATE_LABEL[k] })),
    when_needed: WHEN_NEEDED.map((k) => ({ key: k, label: WHEN_NEEDED_LABEL[k] })), obligations: OBLIGATIONS.map((k) => ({ key: k, label: OBLIGATION_LABEL[k] })),
    pending_behaviors: PENDING_BEHAVIORS.map((k) => ({ key: k, label: PENDING_BEHAVIOR_LABEL[k] })), grant_scopes: GRANT_SCOPES.map((k) => ({ key: k, label: GRANT_SCOPE_LABEL[k] })),
    dependency_kinds: DEPENDENCY_KINDS.map((k) => ({ key: k, label: DEPENDENCY_KIND_LABEL[k] })), validation_modes: VALIDATION_MODES, asset_rules: ASSET_RULES_CONN,
  });
});
router.get("/connectors", (_req, res) => { res.json({ data: listConnectors() }); });
router.get("/connection-types", async (req, res, next) => {
  try {
    await ensureConnectionTypes(prisma);
    const rows = await prisma.connectionType.findMany({ where: req.query.all === "1" ? {} : { is_active: true }, orderBy: [{ sort_order: "asc" }, { id: "asc" }] });
    res.json({ data: rows.map(serializeConnectionType) });
  } catch (e) { handle(e, res, next); }
});
const connTypeSchema = z.object({
  key: z.string().regex(/^[a-z0-9_]{2,60}$/), name: z.string().trim().min(2).max(120), description: z.string().max(2000).nullish(), icon: z.string().max(60).nullish(),
  provider: z.string().max(60).nullish(), integration_key: z.string().max(60).nullish(),
  allowed_methods: z.array(z.enum(CONNECTION_METHODS)).min(1), permission_levels: z.array(z.object({ key: z.string().min(1).max(60), label: z.string().min(1).max(120) })).min(1),
  supports_auto_validation: z.boolean().optional(), default_instructions: z.string().max(4000).nullish(), is_active: z.boolean().optional(), sort_order: z.number().int().optional(),
  // Campos que o cliente preenche para este tipo (ex.: ID da loja, usuário, chave de API).
  fields: z.array(z.object({ key: z.string().max(40), label: z.string().max(120), type: z.enum(FIELD_TYPES), required: z.boolean().optional().default(false), help: z.string().max(500).nullish() })).max(20).optional(),
});
router.post("/connection-types", async (req, res, next) => {
  try {
    const d = connTypeSchema.parse(req.body);
    const fieldErr = validateFieldDefs((d.fields ?? []) as FieldDef[]);
    if (fieldErr) throw new ConnectionError(fieldErr, 422, "connection_fields_invalid");
    if (await prisma.connectionType.findUnique({ where: { key: d.key } })) throw new ConnectionError("Já existe um tipo com esta chave.", 409, "connection_type_exists");
    const max = await prisma.connectionType.aggregate({ _max: { sort_order: true } });
    const row = await prisma.connectionType.create({
      data: {
        key: d.key, name: d.name, description: d.description ?? null, icon: d.icon ?? null, provider: d.provider ?? null, integration_key: d.integration_key ?? null,
        allowed_methods_json: JSON.stringify(d.allowed_methods), permission_levels_json: JSON.stringify(d.permission_levels), supports_auto_validation: !!d.supports_auto_validation,
        default_instructions: d.default_instructions ?? null, is_active: d.is_active !== false, sort_order: d.sort_order ?? (max._max.sort_order ?? 0) + 1,
        fields_json: d.fields?.length ? JSON.stringify(d.fields.map((f) => ({ key: f.key, label: f.label.trim(), type: f.type, required: !!f.required, help: f.help ?? null }))) : null,
      },
    });
    // Tipo recriado com a mesma chave depois de excluído: limpa o marcador de exclusão.
    await prisma.connectionTypeTombstone.deleteMany({ where: { key: row.key } });
    await audit(req, "connection_type_created", { id: row.id, key: row.key });
    res.status(201).json(serializeConnectionType(row));
  } catch (e) { handle(e, res, next); }
});
router.put("/connection-types/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const d = connTypeSchema.partial().omit({ key: true }).parse(req.body);
    const cur = await prisma.connectionType.findUnique({ where: { id } });
    if (!cur) throw new ConnectionError("Tipo não encontrado.", 404, "connection_type_not_found");
    if (d.fields) { const fe = validateFieldDefs(d.fields as FieldDef[]); if (fe) throw new ConnectionError(fe, 422, "connection_fields_invalid"); }
    const row = await prisma.connectionType.update({
      where: { id },
      data: {
        ...(d.name ? { name: d.name } : {}), ...(d.description !== undefined ? { description: d.description } : {}), ...(d.icon !== undefined ? { icon: d.icon } : {}), ...(d.provider !== undefined ? { provider: d.provider } : {}),
        ...(d.integration_key !== undefined ? { integration_key: d.integration_key } : {}), ...(d.allowed_methods ? { allowed_methods_json: JSON.stringify(d.allowed_methods) } : {}),
        ...(d.permission_levels ? { permission_levels_json: JSON.stringify(d.permission_levels) } : {}), ...(d.supports_auto_validation !== undefined ? { supports_auto_validation: d.supports_auto_validation } : {}),
        ...(d.default_instructions !== undefined ? { default_instructions: d.default_instructions } : {}), ...(d.is_active !== undefined ? { is_active: d.is_active } : {}), ...(d.sort_order !== undefined ? { sort_order: d.sort_order } : {}),
        ...(d.fields ? { fields_json: d.fields.length ? JSON.stringify(d.fields.map((f) => ({ key: f.key, label: f.label.trim(), type: f.type, required: !!f.required, help: f.help ?? null }))) : null } : {}),
      },
    });
    await audit(req, "connection_type_updated", { id });
    res.json(serializeConnectionType(row));
  } catch (e) { handle(e, res, next); }
});
// Exclusão: só Admin Master e só se nenhum produto/projeto/conexão de cliente usa o tipo (senão, desative). Não volta com a semente padrão.
router.delete("/connection-types/:id", requireAdminMaster, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const cur = await prisma.connectionType.findUnique({ where: { id } });
    if (!cur) throw new ConnectionError("Tipo não encontrado.", 404, "connection_type_not_found");
    const [reqs, projectReqs, conns] = await Promise.all([
      prisma.catalog2ConnectionRequirement.count({ where: { connection_type_id: id } }),
      prisma.projectConnectionRequirement.count({ where: { connection_type_id: id } }),
      prisma.clientConnection.count({ where: { connection_type_id: id } }),
    ]);
    if (reqs + projectReqs + conns > 0) throw new ConnectionError(`Este tipo está em uso (${reqs} exigência(s) de produto, ${projectReqs} de projeto e ${conns} conexão(ões) de clientes). Remova esses usos ou apenas desative o tipo.`, 409, "connection_type_in_use", { requirements: reqs, project_requirements: projectReqs, connections: conns });
    await prisma.$transaction([
      prisma.connectionType.delete({ where: { id } }),
      prisma.connectionTypeTombstone.upsert({ where: { key: cur.key }, create: { key: cur.key, deleted_by_user_id: req.user!.id }, update: { deleted_at: new Date(), deleted_by_user_id: req.user!.id } }),
    ]);
    await audit(req, "connection_type_deleted", { id, key: cur.key });
    res.json({ ok: true });
  } catch (e) { handle(e, res, next); }
});
router.get("/versions/:id/connections", async (req, res, next) => {
  try { res.json(await moduleState(prisma, req.params.id as string)); } catch (e) { handle(e, res, next); }
});
router.put("/versions/:id/connections-module", async (req, res, next) => {
  try {
    const version = await editableVersionOrThrow(req.params.id as string);
    const on = z.object({ requires_connections: z.boolean() }).parse(req.body).requires_connections;
    await prisma.$transaction(async (tx) => {
      await setModuleFlag(tx, version.id, on);
      await recordCatalog2ProductHistory(tx, {
        productId: version.product_id, versionId: version.id, eventType: "connections_module_toggled",
        description: on ? "Módulo \"Conexões e acessos necessários\" ativado (exige conexões externas)." : "Módulo \"Conexões e acessos necessários\" desativado (não exige conexões externas).", actorUserId: req.user!.id,
      });
    });
    res.json(await moduleState(prisma, version.id));
  } catch (e) { handle(e, res, next); }
});
async function recordConnHistory(tx: Prisma.TransactionClient, version: { id: string; product_id: string }, req: Request, eventType: string, description: string) {
  await recordCatalog2ProductHistory(tx, { productId: version.product_id, versionId: version.id, eventType, description, actorUserId: req.user!.id });
}
router.post("/versions/:id/connection-requirements", async (req, res, next) => {
  try {
    const version = await editableVersionOrThrow(req.params.id as string);
    const d = connRequirementSchema.parse(req.body);
    const row = await prisma.$transaction(async (tx) => {
      const r = await createRequirement(tx, version.id, d);
      await recordConnHistory(tx, version, req, "connection_requirement_added", `Exigência de conexão "${r.label || r.connection_type.name}" adicionada.`);
      return r;
    });
    res.status(201).json(serializeRequirement(row));
  } catch (e) { handle(e, res, next); }
});
// Idempotente: repetir o mesmo PUT (mesma key) atualiza em vez de duplicar — contrato do preenchimento automatizado.
router.put("/versions/:id/connection-requirements/by-key/:key", async (req, res, next) => {
  try {
    const version = await editableVersionOrThrow(req.params.id as string);
    const d = connRequirementSchema.parse(req.body);
    const key = req.params.key as string;
    const existing = await prisma.catalog2ConnectionRequirement.findUnique({ where: { version_id_key: { version_id: version.id, key } } });
    const row = await prisma.$transaction(async (tx) => {
      const r = existing ? await updateRequirement(tx, existing.id, d) : await createRequirement(tx, version.id, { ...d, key });
      await recordConnHistory(tx, version, req, existing ? "connection_requirement_updated" : "connection_requirement_added", `Exigência de conexão "${r.label || r.connection_type.name}" ${existing ? "atualizada" : "adicionada"}.`);
      return r;
    });
    res.status(existing ? 200 : 201).json({ ...serializeRequirement(row), created: !existing });
  } catch (e) { handle(e, res, next); }
});
router.put("/connection-requirements/:id", async (req, res, next) => {
  try {
    const cur = await prisma.catalog2ConnectionRequirement.findUnique({ where: { id: req.params.id as string } });
    if (!cur) throw new ConnectionError("Exigência não encontrada.", 404, "requirement_not_found");
    const version = await editableVersionOrThrow(cur.version_id);
    const d = connRequirementSchema.parse(req.body);
    const row = await prisma.$transaction(async (tx) => {
      const r = await updateRequirement(tx, cur.id, d);
      await recordConnHistory(tx, version, req, "connection_requirement_updated", `Exigência de conexão "${r.label || r.connection_type.name}" atualizada.`);
      return r;
    });
    res.json(serializeRequirement(row));
  } catch (e) { handle(e, res, next); }
});
router.delete("/connection-requirements/:id", async (req, res, next) => {
  try {
    const cur = await prisma.catalog2ConnectionRequirement.findUnique({ where: { id: req.params.id as string } });
    if (!cur) throw new ConnectionError("Exigência não encontrada.", 404, "requirement_not_found");
    const version = await editableVersionOrThrow(cur.version_id);
    await prisma.$transaction(async (tx) => {
      await deleteRequirement(tx, cur.id);
      await recordConnHistory(tx, version, req, "connection_requirement_removed", `Exigência de conexão "${cur.label || cur.key}" removida.`);
    });
    res.json({ ok: true });
  } catch (e) { handle(e, res, next); }
});
// Perfil de IA padrão do orientador de conexões (QA, sem autonomia decisória). Idempotente; NÃO vincula a nenhum produto.
router.post("/connection-ai-profile/ensure", async (req, res, next) => {
  try {
    const p = await ensureConnectionAiProfile(prisma);
    await audit(req, "connection_ai_profile_ensured", { id: p.id });
    res.json({ id: p.id, name: p.name, purpose: p.purpose, is_system: p.is_system });
  } catch (e) { handle(e, res, next); }
});

export default router;
