// API do CONSTRUTOR do novo catálogo (sprint de produtos, bloco 3/6).
//
// SOMENTE Admin Master (mesma classificação oficial usada em Legacy; 404 para
// os demais). Toda decisão — inclusive preço e prazo — é revalidada no
// servidor. Versão publicada é imutável por qualquer chamada direta.

import { AsyncLocalStorage } from "node:async_hooks";
import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { verifyToken, evaluateAdminMasterAccess } from "../middleware/auth";
import { writeAccessAudit } from "../lib/product-feedback-service";
import { logCommercialChangeEvent } from "../lib/catalog2-commercial-change-log";
import { CATALOG2_PERIODS, isCatalog2Period, isCurrentlyContractablePeriod, listPeriodsForAdmin } from "../lib/catalog2-periods";
import { recordCatalog2ProductHistory, listCatalog2ProductHistory } from "../lib/catalog2-product-history";
import { maybeCreateCatalog2ActivationJobOnStatusTransition, notifyValidQuoteOwnersOfCommercialChange } from "../lib/catalog2-notifications";
import { summarizeCatalog2ProductHistory } from "../lib/catalog2-product-history-ai";
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
  getProductDetail,
  newDraftVersion,
  publishVersion,
  setProductStatus,
  validateConditionShape,
  validateVersionForPublish,
} from "../lib/catalog2-service";
import { computePricing, defaultSelection } from "../lib/catalog2-pricing";
import { type ClientContext, configureProduct, createQuote } from "../lib/catalog2-client";
import { createProjectWithSequentialCode } from "../lib/create-project";
import { attachCatalog2QuoteToProject } from "../lib/catalog2-checkout";
import { recalculateProjectValue } from "../lib/project-value";
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
    res.status(err.httpStatus).json({ error: err.message, code: err.code });
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
    const d = classCreate.extend({ max_hourly_rate: z.number().nonnegative().nullish(), hourly_rate_note: z.string().max(500).nullish() }).parse(req.body);
    res.status(201).json(await prisma.catalog2Specialty.create({ data: { key: d.key, name: d.name, sort_order: d.sort_order ?? 99, max_hourly_rate: d.max_hourly_rate ?? null, hourly_rate_note: d.hourly_rate_note ?? null } }));
  } catch (e) { handle(e, res, next); }
});
router.put("/specialties/:id", async (req, res, next) => {
  try {
    const d = z.object({ name: z.string().min(1).max(120).optional(), max_hourly_rate: z.number().nonnegative().nullish(), hourly_rate_note: z.string().max(500).nullish() }).parse(req.body);
    const before = await prisma.catalog2Specialty.findUnique({ where: { id: req.params.id as string }, select: { max_hourly_rate: true } });
    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.catalog2Specialty.update({
        where: { id: req.params.id as string },
        data: {
          ...(d.name !== undefined ? { name: d.name } : {}),
          ...(d.max_hourly_rate !== undefined ? { max_hourly_rate: d.max_hourly_rate } : {}),
          ...(d.hourly_rate_note !== undefined ? { hourly_rate_note: d.hourly_rate_note } : {}),
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
const questionSchema = z.object({ key: z.string().min(1).max(60), label: z.string().min(1).max(500), is_required: z.boolean().optional(), sort_order: z.number().int().optional() });
const questionnaireContentSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(4000).nullish(),
  questions: z.array(z.object({
    key: z.string().min(1).max(60),
    label: z.string().min(1).max(500),
    is_required: z.boolean().optional(),
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
    res.json(q);
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
        data: { questionnaire_id: qId, key: d.key, label: d.label, is_required: d.is_required ?? true, sort_order: d.sort_order ?? 99 },
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
    res.status(201).json(created);
  } catch (e) { handle(e, res, next); }
});
router.put("/questions/:id", async (req, res, next) => {
  try {
    const existing = await prisma.catalog2QuestionnaireQuestion.findUnique({ where: { id: req.params.id as string } });
    if (!existing) throw new Catalog2Error("Pergunta não encontrada.", 404);
    await assertQuestionnaireNotSharedForDirectEdit(existing.questionnaire_id);
    const d = questionSchema.partial().parse(req.body);
    const ctx = await productContextForQuestionnaire(existing.questionnaire_id);
    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.catalog2QuestionnaireQuestion.update({ where: { id: req.params.id as string }, data: d });
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
    res.json(updated);
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
          data: { questionnaire_id: targetId, key: q.key, label: q.label, is_required: q.is_required ?? true, sort_order: i + 1 },
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
    res.json({ ok: true, forked, questionnaire: result });
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
router.get("/pricing-settings", async (_req, res, next) => {
  try {
    const s = (await prisma.catalog2PricingSettings.findUnique({ where: { id: "default" } })) ??
      (await prisma.catalog2PricingSettings.create({ data: { id: "default" } }));
    res.json(s);
  } catch (e) { next(e); }
});
router.put("/pricing-settings", async (req, res, next) => {
  try {
    const d = z.object({
      tax_percent: z.number().nonnegative().nullish(),
      commission_percent: z.number().nonnegative().nullish(),
      operational_fee_percent: z.number().nonnegative().nullish(),
      profit_margin_percent: z.number().nonnegative().nullish(),
      human_review_percent: z.number().nonnegative().nullish(),
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
    const before = await prisma.catalog2PricingSettings.findUnique({ where: { id: "default" } });
    const s = await prisma.$transaction(async (tx) => {
      const updated = await tx.catalog2PricingSettings.upsert({ where: { id: "default" }, create: { id: "default", ...data }, update: data });
      // Item 4.1 (reunião 2026-09-14): esta config é global — afeta o
      // cálculo de TODOS os produtos. Só grava evento quando um campo que
      // realmente entra na conta (computePricing) mudou de valor — moeda/
      // observações não afetam preço, não contam como alteração comercial.
      const priceAffecting = ["tax_percent", "commission_percent", "operational_fee_percent", "profit_margin_percent", "human_review_percent"] as const;
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
    res.json(s);
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
    const productsWithPendencies = origins.filter((o) => safeJsonArray(o.pendencies_json).length > 0).length;
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
    if (hasPendencies) {
      originWhere.AND = [
        { pendencies_json: { not: null } },
        { pendencies_json: { not: "[]" } },
      ];
    }
    if (importedOnly || hasPendencies || Object.keys(originWhere).length > 0) where.import_origin = { is: originWhere };

    const [total, rows] = await Promise.all([
      prisma.catalog2Product.count({ where }),
      prisma.catalog2Product.findMany({
        where, orderBy, skip: (page - 1) * pageSize, take: pageSize,
        include: {
          pillar: { select: { key: true, name: true } },
          category: { select: { key: true, name: true } },
          versions: { select: { id: true, version_number: true, state: true, published_at: true, updated_at: true, summary: true } },
          import_origin: { select: { rose_reviewed: true, review_state: true, pendencies_json: true, area_rose: true, human_edited_at: true, source_index: true } },
          provisional_preview: { select: { image_path: true, price_amount: true, deadline_days: true, modality: true, needs_review: true, included_items_json: true } },
        },
      }),
    ]);
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

router.put("/versions/:id", async (req, res, next) => {
  try {
    await editableVersionOrThrow(req.params.id as string);
    const d = z.object({
      title: z.string().min(1).max(200).optional(),
      summary: z.string().max(4000).nullish(),
      full_description: z.string().max(30000).nullish(),
      deliverables: z.string().max(8000).nullish(),
      client_info: z.string().max(8000).nullish(),
      internal_notes: z.string().max(8000).nullish(),
      change_summary: z.string().max(2000).nullish(),
    }).parse(req.body);
    // deliverables/client_info/internal_notes ficam no full_description
    // estruturado por marcadores? Não — mantemos simples: só os campos do
    // schema. Os extras entram no summary/description conforme a UI.
    const before = await prisma.catalog2ProductVersion.findUniqueOrThrow({ where: { id: req.params.id as string } });
    const data: Record<string, unknown> = { updated_by_user_id: req.user!.id };
    for (const k of ["title", "summary", "full_description", "change_summary"] as const) if (d[k] !== undefined) data[k] = d[k];
    const updated = await prisma.catalog2ProductVersion.update({ where: { id: req.params.id as string }, data });
    // Item 7 (reunião 2026-09-14): descrição legível com o que realmente
    // mudou — reaproveita o MESMO Catalog2VersionEvent já escrito aqui
    // (nunca um segundo mecanismo paralelo pro mesmo evento); só enriquece
    // o texto com um diff antes/depois em vez da nota genérica de sempre.
    const changedLabels: string[] = [];
    if (d.title !== undefined && d.title !== before.title) changedLabels.push(`título alterado de "${before.title}" para "${d.title}"`);
    if (d.summary !== undefined && d.summary !== before.summary) changedLabels.push("resumo atualizado");
    if (d.full_description !== undefined && d.full_description !== before.full_description) changedLabels.push("descrição completa atualizada");
    const note = changedLabels.length > 0 ? `Conteúdo editado — ${changedLabels.join("; ")}.` : "Informações gerais editadas.";
    await prisma.catalog2VersionEvent.create({ data: { version_id: updated.id, event_type: "updated", actor_user_id: req.user!.id, note } });
    res.json({ ok: true });
  } catch (e) { handle(e, res, next); }
});

router.put("/products/:id/classifications", async (req, res, next) => {
  try {
    const product = await prisma.catalog2Product.findUnique({ where: { id: req.params.id as string } });
    if (!product) throw new Catalog2Error("Produto não encontrado.", 404);
    const d = z.object({
      pillar_id: z.string().nullish(),
      category_id: z.string().nullish(),
      four_f_ids: z.array(z.string()).max(4).optional(),
    }).parse(req.body);
    await prisma.$transaction(async (tx) => {
      await tx.catalog2Product.update({
        where: { id: product.id },
        data: { pillar_id: d.pillar_id ?? null, category_id: d.category_id ?? null },
      });
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
        after: { pillar_id: d.pillar_id ?? null, category_id: d.category_id ?? null, four_f_ids: d.four_f_ids },
        actorUserId: req.user!.id,
      });
    });
    res.json({ ok: true });
  } catch (e) { handle(e, res, next); }
});

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
router.get("/versions/:id/validate", async (req, res, next) => {
  try { res.json(await validateVersionForPublish(req.params.id as string)); } catch (e) { handle(e, res, next); }
});
router.post("/versions/:id/publish", async (req, res, next) => {
  try {
    const d = z.object({ client_action_id: z.string().max(80).optional(), change_summary: z.string().max(2000).optional(), force: z.boolean().optional() }).parse(req.body ?? {});
    const published = await publishVersion(req.params.id as string, req.user!.id, {
      clientActionId: d.client_action_id,
      changeSummary: d.change_summary,
      force: d.force,
    });
    await audit(req, "version_published", { version_id: published.id, product_id: published.product_id, version_number: published.version_number });
    res.json({ ok: true, version_id: published.id, published_at: published.published_at, version_number: published.version_number });
  } catch (e) { handle(e, res, next); }
});

// ── Variações e opções ──────────────────────────────────────────────
const variationSchema = z.object({ key: z.string().min(1).max(60), name: z.string().min(1).max(120), is_required: z.boolean().optional(), selection_type: z.enum(["single"]).optional(), sort_order: z.number().int().optional(), notes: z.string().max(2000).nullish() });
router.post("/versions/:id/variations", async (req, res, next) => {
  try {
    const version = await editableVersionOrThrow(req.params.id as string);
    const d = variationSchema.parse(req.body);
    const created = await prisma.$transaction(async (tx) => {
      const c = await tx.catalog2Variation.create({ data: { version_id: req.params.id as string, key: d.key, name: d.name, is_required: d.is_required ?? true, sort_order: d.sort_order ?? 99, notes: d.notes ?? null } });
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
      if (d.notes !== undefined && d.notes !== before.notes) changed.push("observações atualizadas");
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
const optionSchema = z.object({ key: z.string().min(1).max(60), label: z.string().min(1).max(160), sort_order: z.number().int().optional(), is_default: z.boolean().optional() });
router.post("/variations/:id/options", async (req, res, next) => {
  try {
    const { variation, version } = await versionOfVariation(req.params.id as string);
    const d = optionSchema.parse(req.body);
    const created = await prisma.$transaction(async (tx) => {
      const c = await tx.catalog2VariationOption.create({ data: { variation_id: req.params.id as string, ...d, sort_order: d.sort_order ?? 99 } });
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
    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.catalog2VariationOption.update({ where: { id: req.params.id as string }, data: d });
      const changed: string[] = [];
      if (d.label !== undefined && d.label !== o.label) changed.push(`rótulo de "${o.label}" para "${d.label}"`);
      if (d.sort_order !== undefined && d.sort_order !== o.sort_order) changed.push(`ordem de ${o.sort_order} para ${d.sort_order}`);
      if (d.is_default !== undefined && d.is_default !== o.is_default) changed.push(d.is_default ? "passou a ser padrão" : "deixou de ser padrão");
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
const effectSchema = z.object({ effect_type: z.enum(CATALOG2_EFFECT_TYPES), effect_value: z.string().min(1).max(500), sort_order: z.number().int().optional() });
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
    const ctx = await buildEffectCtx(version.id);
    const err = validateEffect(d.effect_type, d.effect_value, ctx);
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
const addonSchema = z.object({
  key: z.string().min(1).max(60), name: z.string().min(1).max(160), description: z.string().max(4000).nullish(),
  sort_order: z.number().int().optional(), is_default_selected: z.boolean().optional(), is_active: z.boolean().optional(),
  base_cost: z.number().nonnegative().nullish(), target_task_id: z.string().nullish(), target_step_id: z.string().nullish(),
});
router.post("/versions/:id/addons", async (req, res, next) => {
  try {
    const version = await editableVersionOrThrow(req.params.id as string);
    const d = addonSchema.parse(req.body);
    const created = await prisma.$transaction(async (tx) => {
      const c = await tx.catalog2Addon.create({ data: { version_id: req.params.id as string, key: d.key, name: d.name, description: d.description ?? null, sort_order: d.sort_order ?? 99, is_default_selected: d.is_default_selected ?? false, is_active: d.is_active ?? true, base_cost: d.base_cost ?? null, target_task_id: d.target_task_id ?? null, target_step_id: d.target_step_id ?? null } });
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
    const err = validateEffect(d.effect_type, d.effect_value, await buildEffectCtx(addon.version_id));
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
  key: z.string().min(1).max(60), name: z.string().min(1).max(200), description: z.string().max(8000).nullish(), objective: z.string().max(4000).nullish(),
  sort_order: z.number().int().optional(), specialty_id: z.string().nullish(),
  execution_mode: z.enum(CATALOG2_EXECUTION_MODES).optional(),
  estimated_minutes: z.number().int().nonnegative().nullish(),
  requires_review: z.boolean().optional(), requires_client_approval: z.boolean().optional(), is_conditional: z.boolean().optional(),
});
router.post("/versions/:id/tasks", async (req, res, next) => {
  try {
    const version = await editableVersionOrThrow(req.params.id as string);
    const d = taskSchema.parse(req.body);
    const created = await prisma.$transaction(async (tx) => {
      const c = await tx.catalog2Task.create({ data: { version_id: req.params.id as string, key: d.key, name: d.name, description: d.description ?? null, objective: d.objective ?? null, sort_order: d.sort_order ?? 99, specialty_id: d.specialty_id ?? null, execution_mode: d.execution_mode ?? "humano", estimated_minutes: d.estimated_minutes ?? null, requires_review: d.requires_review ?? false, requires_client_approval: d.requires_client_approval ?? false, is_conditional: d.is_conditional ?? false } });
      await recordCatalog2ProductHistory(tx, {
        productId: version.product_id, versionId: version.id, eventType: "task_added",
        description: `Tarefa "${c.name}" adicionada.`, after: { key: c.key, name: c.name },
        actorUserId: req.user!.id,
      });
      return c;
    });
    res.status(201).json(created);
  } catch (e) { handle(e, res, next); }
});
router.put("/tasks/:id", async (req, res, next) => {
  try {
    const version = await versionOfTask(req.params.id as string);
    const before = await prisma.catalog2Task.findUniqueOrThrow({ where: { id: req.params.id as string } });
    const d = taskSchema.partial().parse(req.body);
    const data: typeof d & { effort_is_provisional?: boolean; effort_source?: string; effort_provisional_reason?: string | null } = { ...d };
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
      const u = await tx.catalog2Task.update({ where: { id: req.params.id as string }, data });
      const changed: string[] = [];
      if (d.name !== undefined && d.name !== before.name) changed.push(`nome de "${before.name}" para "${d.name}"`);
      if (d.specialty_id !== undefined && d.specialty_id !== before.specialty_id) changed.push("especialidade");
      if (d.estimated_minutes !== undefined && d.estimated_minutes !== before.estimated_minutes) changed.push(`tempo estimado de ${before.estimated_minutes ?? "?"} para ${d.estimated_minutes ?? "?"} min`);
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
router.post("/tasks/:id/duplicate", async (req, res, next) => {
  try {
    await versionOfTask(req.params.id as string);
    const src = await prisma.catalog2Task.findUniqueOrThrow({ where: { id: req.params.id as string }, include: { steps: true, ai: true } });
    const dup = await prisma.$transaction(async (tx) => {
      const t = await tx.catalog2Task.create({
        data: {
          version_id: src.version_id, key: `${src.key}-copia-${Date.now().toString(36)}`, name: `${src.name} (cópia)`,
          description: src.description, objective: src.objective, sort_order: src.sort_order + 1,
          specialty_id: src.specialty_id, execution_mode: src.execution_mode, estimated_minutes: src.estimated_minutes,
          requires_review: src.requires_review, requires_client_approval: src.requires_client_approval, is_conditional: src.is_conditional,
        },
      });
      for (const s of src.steps) await tx.catalog2TaskStep.create({ data: { task_id: t.id, key: s.key, name: s.name, description: s.description, sort_order: s.sort_order, estimated_minutes: s.estimated_minutes, is_conditional: s.is_conditional } });
      if (src.ai) await tx.catalog2TaskAI.create({ data: { task_id: t.id, provider: src.ai.provider, model: src.ai.model, est_input_tokens: src.ai.est_input_tokens, est_output_tokens: src.ai.est_output_tokens, unit_cost_input_per_1k: src.ai.unit_cost_input_per_1k, unit_cost_output_per_1k: src.ai.unit_cost_output_per_1k, currency: src.ai.currency, est_review_rounds: src.ai.est_review_rounds, cost_note: src.ai.cost_note, human_review_required: src.ai.human_review_required } });
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
    const sourceTaskId = z.string().min(1).parse(req.body?.source_task_id);
    const src = await prisma.catalog2Task.findUnique({ where: { id: sourceTaskId }, include: { steps: true, ai: true } });
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
        await tx.catalog2TaskStep.create({ data: { task_id: t.id, key: s.key, name: s.name, description: s.description, sort_order: s.sort_order, estimated_minutes: s.estimated_minutes, is_conditional: s.is_conditional } });
      }
      if (src.ai) {
        await tx.catalog2TaskAI.create({ data: { task_id: t.id, provider: src.ai.provider, model: src.ai.model, est_input_tokens: src.ai.est_input_tokens, est_output_tokens: src.ai.est_output_tokens, unit_cost_input_per_1k: src.ai.unit_cost_input_per_1k, unit_cost_output_per_1k: src.ai.unit_cost_output_per_1k, currency: src.ai.currency, est_review_rounds: src.ai.est_review_rounds, cost_note: src.ai.cost_note, human_review_required: src.ai.human_review_required } });
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

const stepSchema = z.object({ key: z.string().min(1).max(60), name: z.string().min(1).max(200), description: z.string().max(8000).nullish(), sort_order: z.number().int().optional(), estimated_minutes: z.number().int().nonnegative().nullish(), is_conditional: z.boolean().optional() });
// Item 7.1: "etapas" — o Item 7 nunca instrumentou etapas (só tarefas) —
// fechado aqui (add/update/remove; reordenar segue o mesmo padrão de baixo
// valor informativo já adotado pra tarefas/perguntas, não instrumentado).
router.post("/tasks/:id/steps", async (req, res, next) => {
  try {
    const version = await versionOfTask(req.params.id as string);
    const task = await prisma.catalog2Task.findUniqueOrThrow({ where: { id: req.params.id as string }, select: { name: true } });
    const d = stepSchema.parse(req.body);
    const created = await prisma.$transaction(async (tx) => {
      const c = await tx.catalog2TaskStep.create({ data: { task_id: req.params.id as string, key: d.key, name: d.name, description: d.description ?? null, sort_order: d.sort_order ?? 99, estimated_minutes: d.estimated_minutes ?? null, is_conditional: d.is_conditional ?? false } });
      await recordCatalog2ProductHistory(tx, {
        productId: version.product_id, versionId: version.id, eventType: "step_added",
        description: `Etapa "${c.name}" adicionada à tarefa "${task.name}".`, after: { key: c.key, name: c.name },
        actorUserId: req.user!.id,
      });
      return c;
    });
    res.status(201).json(created);
  } catch (e) { handle(e, res, next); }
});
async function versionOfStep(stepId: string) {
  const s = await prisma.catalog2TaskStep.findUnique({ where: { id: stepId }, include: { task: { select: { name: true, version_id: true } } } });
  if (!s) throw new Catalog2Error("Etapa não encontrada.", 404);
  const version = await editableVersionOrThrow(s.task.version_id);
  return { step: s, taskName: s.task.name, version };
}
router.put("/steps/:id", async (req, res, next) => {
  try {
    const { step: before, taskName, version } = await versionOfStep(req.params.id as string);
    const d = stepSchema.partial().parse(req.body);
    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.catalog2TaskStep.update({ where: { id: req.params.id as string }, data: d });
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
router.delete("/steps/:id", async (req, res, next) => {
  try {
    const { step: before, taskName, version } = await versionOfStep(req.params.id as string);
    await prisma.$transaction(async (tx) => {
      await tx.catalog2TaskStep.delete({ where: { id: req.params.id as string } });
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

// Dependência entre tarefas — recusa tarefa de outra versão.
router.post("/tasks/:id/dependencies", async (req, res, next) => {
  try {
    const v = await versionOfTask(req.params.id as string);
    const dependsOn = z.string().parse(req.body?.depends_on_task_id);
    const dep = await prisma.catalog2Task.findUnique({ where: { id: dependsOn }, select: { version_id: true, id: true } });
    if (!dep || dep.version_id !== v.id) throw new Catalog2Error("A dependência precisa ser uma tarefa da MESMA versão.", 422, "cross_version_ref");
    if (dep.id === req.params.id) throw new Catalog2Error("Uma tarefa não pode depender de si mesma.", 422);
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
      cost_note: z.string().max(2000).nullish(), human_review_required: z.boolean().optional(),
    }).parse(req.body);
    const ai = await prisma.catalog2TaskAI.upsert({
      where: { task_id: req.params.id as string },
      create: { task_id: req.params.id as string, ...d },
      update: d,
    });
    res.json(ai);
  } catch (e) { handle(e, res, next); }
});

// ── Condições TIPADAS ──────────────────────────────────────────────
const conditionSchema = z.object({
  key: z.string().min(1).max(60), name: z.string().min(1).max(160), description: z.string().max(4000).nullish(),
  is_active: z.boolean().optional(), sort_order: z.number().int().optional(),
  trigger_source: z.enum(CONDITION_TRIGGER_SOURCES), trigger_ref: z.string().max(120).nullish(),
  operator: z.enum(CONDITION_OPERATORS), comparison_value: z.string().max(200).nullish(),
  effect_type: z.enum(CATALOG2_EFFECT_TYPES), effect_value: z.string().min(1).max(500),
});
router.post("/versions/:id/conditions", async (req, res, next) => {
  try {
    await editableVersionOrThrow(req.params.id as string);
    const d = conditionSchema.parse(req.body);
    const err = validateConditionShape(d, await buildEffectCtx(req.params.id as string));
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
    const err = validateConditionShape(merged, await buildEffectCtx(v.id));
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

// ── Simulador e Pré-visualização (mesmo cálculo do backend) ─────────
const selectionSchema = z.object({
  variation_option_keys: z.array(z.string()).optional(),
  addon_keys: z.array(z.string()).optional(),
  quantity: z.number().int().positive().max(100000).optional(),
  answers: z.record(z.string()).optional(),
});
router.post("/versions/:id/simulate", async (req, res, next) => {
  try {
    const sel = selectionSchema.parse(req.body ?? {});
    const pricing = await computePricing(req.params.id as string, sel);
    // A simulação provisória usa o mesmo conjunto de escolhas, mas permanece
    // separada do preço comercial e nunca torna o produto contratável.
    const pricing_simulation = await computePricing(req.params.id as string, sel, { simulateProvisional: true });
    res.json({ selection: sel, pricing, pricing_simulation });
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
      tasks: { select: { specialty_id: true, estimated_minutes: true, effort_is_provisional: true, _count: { select: { steps: true } } } },
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

async function computeProductReadiness(p: ReadinessProduct) {
  const draft = p.versions.find((v) => v.state === "rascunho") ?? p.versions[0] ?? null;
  const published = p.versions.find((v) => v.id === p.published_version_id) ?? null;
  const targetVersion = published ?? draft;
  const pend = safeJsonArray(p.import_origin?.pendencies_json);
  const has = (k: string) => pend.includes(k);
  const taskCount = targetVersion?._count.tasks ?? 0;
  const stepCount = (targetVersion?.tasks ?? []).reduce((a, t) => a + t._count.steps, 0);
  // Calculado AO VIVO a partir das tarefas reais — nunca lido de um
  // registro histórico de pendência (bug corrigido reunião 10/09: um
  // produto com human_edited_at ficava fora da contagem mesmo com tarefas
  // sem especialidade/horas). Reflete o estado atual e some sozinho assim
  // que todas as tarefas da versão forem completadas.
  const tasksForEffort = targetVersion?.tasks ?? [];
  const hasMissingTaskEffort = tasksForEffort.some((t) => !t.specialty_id || t.estimated_minutes == null);
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
  let pricingSimulation: Awaited<ReturnType<typeof computePricing>> | null = null;
  if (targetVersion) {
    try {
      pricing = await computePricing(targetVersion.id, await defaultSelection(targetVersion.id));
    } catch {
      pricing = null;
    }
    try {
      pricingSimulation = await computePricing(targetVersion.id, await defaultSelection(targetVersion.id), { simulateProvisional: true });
    } catch {
      pricingSimulation = null;
    }
  }
  const hasActiveTasks = (pricing?.active_task_keys.length ?? taskCount) > 0;

  const items: Record<string, { level: ReadinessLevel; note: string }> = {
    conteudo: has("content_review_pending")
      ? { level: "bloqueador", note: "Revisão de conteúdo pendente (texto preservado da importação)." }
      : { level: "pronto", note: "Conteúdo revisável." },
    classificacao: !p.pillar_id || !p.category_id
      ? { level: "bloqueador", note: "Falta pilar ou categoria." }
      : has("classification_decision_pending")
        ? { level: "bloqueador", note: "Divergência categoria × área aguardando decisão." }
        : { level: "pronto", note: `${p.pillar?.name ?? "—"} / ${p.category?.name ?? "—"} / ${p.four_f.length} 4F` },
    variacoes: (targetVersion?._count.variations ?? 0) > 0
      ? { level: "pronto", note: `${targetVersion?._count.variations} variação(ões).` }
      : { level: "opcional", note: "Sem variações (permitido)." },
    adicionais: (targetVersion?._count.addons ?? 0) > 0
      ? { level: "pronto", note: `${targetVersion?._count.addons} adicional(is).` }
      : { level: "opcional", note: "Sem adicionais (permitido)." },
    tarefas: taskCount > 0
      ? { level: "pronto", note: `${taskCount} tarefa(s).` }
      : { level: "pendente", note: "Nenhuma tarefa — não vira operação sem tarefas (bloco 6)." },
    etapas: stepCount > 0
      ? { level: "pronto", note: `${stepCount} etapa(s).` }
      : { level: "opcional", note: taskCount > 0 ? "Sem etapas nas tarefas (permitido)." : "Etapas dependem de tarefas cadastradas." },
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
    preco: hasActiveTasks
      ? pricing?.commercial_ready
        ? { level: "pronto", note: `Preço comercial ${pricing.currency} ${pricing.lines.commercial_final_price.amount}.` }
        : { level: "bloqueador", note: `Preço comercial "A definir": ${pricing?.pending_info.join("; ") || "configuração comercial incompleta"}.` }
      : { level: "bloqueador", note: "Sem tarefas cadastradas — base de custo indefinida; a precificação não pode ser calculada." },
    prazo: pricing && !pricing.deadline.commercial_deadline_pending
      ? { level: "pronto", note: `Prazo comercial ${pricing.deadline.commercial_deadline_days} dia(s).` }
      : { level: "bloqueador", note: "Prazo comercial base não definido." },
    portfolio: has("portfolio_pending")
      ? { level: "pendente", note: "Sem material de portfólio (não bloqueia venda, mas empobrece a página)." }
      : { level: "pronto", note: "Portfólio ok / não aplicável." },
    revisao_rose: p.import_origin
      ? p.import_origin.rose_reviewed
        ? { level: "pronto", note: "Revisado pela Rose." }
        : { level: "pendente", note: "Sem revisão da Rose." }
      : { level: "opcional", note: "Produto não veio da importação." },
    publicacao: published
      ? { level: "pronto", note: `v${published.version_number} publicada.` }
      : { level: "bloqueador", note: "Nunca publicado — invisível para o cliente (bloco 5 não publica)." },
  };

  const blockers = Object.entries(items).filter(([, v]) => v.level === "bloqueador").map(([k]) => k);
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
      pend.length === 0 &&
      (p.status !== "disponivel" || !!pricing?.commercial_ready),
    client_contractable:
      CATALOG2_CONTRACTABLE_STATUSES.includes(p.status as Catalog2Status) &&
      !!published &&
      pend.length === 0 &&
      !!pricing?.commercial_ready,
    task_count: taskCount,
    step_count: stepCount,
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
    pricing_simulation: pricingSimulation?.simulation_provenance.commercial_config === "provisional"
      ? {
          is_provisional: true,
          price_amount: pricingSimulation.simulation.total,
          deadline_days: pricingSimulation.deadline.commercial_deadline_days,
          commercial_ready: false,
          authorizes_publish: false,
          authorizes_quote: false,
          authorizes_contract: false,
        }
      : null,
    items,
    blockers,
    pendings,
    ready_for_client: blockers.length === 0,
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
    res.json(await computeProductReadiness(p));
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
    const pricing_simulation = await computePricing(targetVersion.id, sel, { simulateProvisional: true });
    res.json({ version_id: targetVersion.id, version_state: targetVersion.state, pricing, pricing_simulation });
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

export default router;
