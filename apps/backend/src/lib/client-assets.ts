// Ativos validados do cliente (contas, permissões, plataformas, domínios, pixels,
// contas de anúncios, CRM, sites, integrações) — reaproveitados entre produtos e
// ciclos, com regra de revalidação por tarefa. NUNCA guarda senha: só o identificador
// seguro e a permissão confirmada; o cliente compartilha acesso pelos convites/papéis
// oficiais de cada ferramenta.
import type { Prisma, PrismaClient } from "@prisma/client";
import { logProjectDecision } from "./catalog2-cycles";

type Db = PrismaClient | Prisma.TransactionClient;

export const ASSET_RULES = ["first_only", "always", "every_x_days", "on_executor_change", "on_client_change", "none_while_valid", "light_check"] as const;
export type AssetRule = (typeof ASSET_RULES)[number];
export const ASSET_RULE_LABEL: Record<AssetRule, string> = {
  first_only: "Validar só na primeira execução",
  always: "Sempre validar",
  every_x_days: "Revalidar a cada X dias",
  on_executor_change: "Revalidar se houver troca de executor",
  on_client_change: "Revalidar se o cliente informar mudança",
  none_while_valid: "Não exigir revalidação enquanto o ativo estiver válido",
  light_check: "Só uma verificação leve enquanto válidos",
};
export const ASSET_STATUSES = ["pendente", "validado", "invalido", "expirado", "revalidar"] as const;

export class AssetError extends Error {
  httpStatus: number;
  constructor(message: string, httpStatus = 422) {
    super(message);
    this.httpStatus = httpStatus;
  }
}

const SECRET_KEY_RE = /(senha|password|passwd|secret|token|api[_-]?key|credencial)/i;
const SECRET_VALUE_RE = /(senha|password|passwd)\s*[:=]/i;
/** Recusa qualquer tentativa de enviar senha/credencial (chave OU texto no formato "senha: ..."). */
export function rejectSecrets(body: unknown): void {
  const walk = (v: unknown): void => {
    if (v && typeof v === "object") {
      for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
        if (SECRET_KEY_RE.test(k)) throw new AssetError("Nunca informe senhas ou credenciais. Peça ao cliente para compartilhar a permissão pela própria ferramenta (convite de usuário, papel de acesso, parceiro/agência).");
        walk(val);
      }
    } else if (typeof v === "string" && SECRET_VALUE_RE.test(v)) {
      throw new AssetError("O texto parece conter uma senha. Nunca registre senhas: registre só o identificador da conta e a permissão confirmada.");
    }
  };
  walk(body);
}

type AssetLike = { status: string; last_validated_at: Date | null; expires_at: Date | null; change_reported_at: Date | null };

/** O ativo conta como válido segundo a regra da tarefa? */
export function isAssetValid(asset: AssetLike, rule: string, opts: { revalidateDays?: number | null; now?: Date } = {}): boolean {
  const now = opts.now ?? new Date();
  if (asset.status !== "validado" || !asset.last_validated_at) return false;
  if (asset.expires_at && asset.expires_at <= now) return false;
  switch (rule) {
    case "always":
      return false;
    case "every_x_days": {
      const days = Math.max(1, opts.revalidateDays ?? 30);
      return now.getTime() - asset.last_validated_at.getTime() <= days * 86_400_000;
    }
    case "on_client_change":
      return !(asset.change_reported_at && asset.change_reported_at > asset.last_validated_at);
    default: // first_only, on_executor_change, none_while_valid, light_check
      return true;
  }
}

const STARTED_TASK_STATUSES = new Set(["LIBERADA_PARA_EXECUCAO", "AGUARDANDO_NOMADE", "EM_EXECUCAO", "EM_AJUSTES"]);

interface Requirement { access_type: string; label: string; is_required: boolean }

/**
 * Chamado na geração da tarefa: liga a tarefa aos ativos do cliente exigidos pelo
 * produto (criando os que faltam como "pendente") e, se TODOS os obrigatórios já
 * estão válidos pela regra da tarefa, dispensa a etapa de acessos (ou deixa só a
 * verificação leve). Devolve o que aconteceu.
 */
export async function applyAssetGate(
  db: Db,
  p: {
    projectId: string; projectProductId: string; taskId: string; catalog2ProductId: string | null; catalog2TaskId: string;
    assetRule: string; revalidateDays: number | null; requirements: Requirement[];
  },
): Promise<{ linked: number; skipped: boolean; light: boolean; pending: string[] } | null> {
  if (p.requirements.length === 0) return null;
  const stage = (await db.projectTaskStage.findMany({ where: { project_task_id: p.taskId }, orderBy: [{ ordem: "asc" }] })).find((s) => {
    try { return !!(s.config_snapshot && JSON.parse(s.config_snapshot).is_access_validation); } catch { return false; }
  });
  if (!stage) return null;
  const project = await db.project.findUnique({ where: { id: p.projectId }, select: { company_id: true, client_id: true } });
  const companyId = project?.company_id ?? project?.client_id ?? null;
  if (!companyId) return null;

  const assets: { asset: Awaited<ReturnType<Db["clientAsset"]["upsert"]>>; required: boolean }[] = [];
  for (const r of p.requirements) {
    const asset = await db.clientAsset.upsert({
      where: { company_id_asset_type_label: { company_id: companyId, asset_type: r.access_type, label: r.label } },
      create: { company_id: companyId, asset_type: r.access_type, label: r.label },
      update: {},
    });
    await db.clientAssetLink.upsert({
      where: { asset_id_project_task_id: { asset_id: asset.id, project_task_id: p.taskId } },
      create: { asset_id: asset.id, project_id: p.projectId, project_product_id: p.projectProductId, project_task_id: p.taskId, catalog2_product_id: p.catalog2ProductId, catalog2_task_id: p.catalog2TaskId, is_required: r.is_required },
      update: {},
    });
    assets.push({ asset, required: r.is_required });
  }

  const pending = assets.filter((a) => a.required && !isAssetValid(a.asset, p.assetRule, { revalidateDays: p.revalidateDays })).map((a) => a.asset.label);
  const allValid = pending.length === 0;
  let skipped = false;
  let light = false;
  if (allValid) {
    let cfg: Record<string, unknown> = {};
    try { cfg = stage.config_snapshot ? JSON.parse(stage.config_snapshot) : {}; } catch { cfg = {}; }
    if (p.assetRule === "light_check") {
      light = true;
      await db.projectTaskStage.update({ where: { id: stage.id }, data: { config_snapshot: JSON.stringify({ ...cfg, light_check: true }), horas_execucao: 0.25 } });
      await logProjectDecision(db, { projectId: p.projectId, projectProductId: p.projectProductId, projectTaskId: p.taskId, kind: "asset_validated", message: "Acessos já validados: só uma verificação leve é necessária nesta tarefa." });
    } else {
      skipped = true;
      await db.projectTaskStage.update({
        where: { id: stage.id },
        data: { status: "CONCLUIDA", concluida_em: new Date(), concluida_por: "system", config_snapshot: JSON.stringify({ ...cfg, dispensed_by: "assets" }) },
      });
      await logProjectDecision(db, {
        projectId: p.projectId, projectProductId: p.projectProductId, projectTaskId: p.taskId, kind: "task_dispensed",
        message: `Etapa de validação dos acessos dispensada: ${assets.map((a) => a.asset.label).join(", ")} já estão válidos.`,
        detail: { assets: assets.map((a) => a.asset.id), rule: p.assetRule },
      });
    }
  } else {
    await logProjectDecision(db, {
      projectId: p.projectId, projectProductId: p.projectProductId, projectTaskId: p.taskId, kind: "asset_pending",
      message: `Aguardando validação dos acessos: ${pending.join(", ")}.`, detail: { pending, rule: p.assetRule },
    });
  }
  return { linked: assets.length, skipped, light, pending };
}

/**
 * Depois que um ativo é validado: as tarefas que estavam esperando os acessos e ainda
 * não começaram a etapa de acessos têm a etapa concluída automaticamente — quando TODOS
 * os ativos obrigatórios delas passaram a valer. Devolve quantas tarefas andaram.
 */
export async function reevaluateAssetGates(db: Db, companyId: string, actorUserId: string | null): Promise<number> {
  const links = await db.clientAssetLink.findMany({
    where: { asset: { company_id: companyId }, project_task_id: { not: null } },
    include: { asset: true },
  });
  const taskIds = [...new Set(links.map((l) => l.project_task_id!))];
  let moved = 0;
  for (const taskId of taskIds) {
    const task = await db.projectTask.findUnique({
      where: { id: taskId },
      select: { id: true, project_id: true, project_product_id: true, status: true, catalog2_task: { select: { asset_rule: true, asset_revalidate_days: true } } },
    });
    if (!task || ["CONCLUIDA", "CANCELADA", "APROVADA"].includes(task.status)) continue;
    const stages = await db.projectTaskStage.findMany({ where: { project_task_id: taskId }, orderBy: [{ ordem: "asc" }] });
    const access = stages.find((s) => { try { return !!(s.config_snapshot && JSON.parse(s.config_snapshot).is_access_validation); } catch { return false; } });
    if (!access || !["PENDENTE", "BLOQUEADA", "AGUARDANDO_EXECUTOR"].includes(access.status)) continue;
    const mine = links.filter((l) => l.project_task_id === taskId && l.is_required);
    const rule = task.catalog2_task?.asset_rule ?? "first_only";
    if (!mine.every((l) => isAssetValid(l.asset, rule, { revalidateDays: task.catalog2_task?.asset_revalidate_days }))) continue;
    if (STARTED_TASK_STATUSES.has(task.status)) {
      const { concluirEtapa } = await import("./stage-engine");
      await concluirEtapa(db, access.id, { userId: actorUserId ?? undefined });
    } else {
      // Tarefa ainda não foi lançada/liberada: só dispensa a etapa; o motor abre a próxima ao liberar.
      let cfg: Record<string, unknown> = {};
      try { cfg = JSON.parse(access.config_snapshot ?? "{}"); } catch { cfg = {}; }
      await db.projectTaskStage.update({ where: { id: access.id }, data: { status: "CONCLUIDA", concluida_em: new Date(), concluida_por: actorUserId ?? "system", config_snapshot: JSON.stringify({ ...cfg, dispensed_by: "assets" }) } });
    }
    // A dispensa fica REGISTRADA com o motivo (quais acessos e qual regra); a etapa continua no histórico, como concluída automaticamente.
    await logProjectDecision(db, {
      projectId: task.project_id, projectProductId: task.project_product_id, projectTaskId: taskId, kind: "task_dispensed",
      message: `Etapa de validação dos acessos dispensada: ${mine.map((l) => l.asset.label).join(", ")} estão válidos (regra "${rule}"). A etapa foi concluída automaticamente e as seguintes foram liberadas.`,
      detail: { assets: mine.map((l) => l.asset.id), rule, stage_id: access.id }, actorUserId,
    });
    moved++;
  }
  return moved;
}

export async function validateAsset(
  db: Db,
  assetId: string,
  opts: { actorUserId: string; scopeConfirmed?: string | null; identifier?: string | null; expiresAt?: Date | null; expirationCondition?: string | null; platform?: string | null },
) {
  const asset = await db.clientAsset.findUnique({ where: { id: assetId } });
  if (!asset) throw new AssetError("Ativo não encontrado.", 404);
  const updated = await db.clientAsset.update({
    where: { id: assetId },
    data: {
      status: "validado", last_validated_at: new Date(), validated_by_user_id: opts.actorUserId, change_reported_at: null,
      ...(opts.scopeConfirmed !== undefined ? { scope_confirmed: opts.scopeConfirmed } : {}),
      ...(opts.identifier !== undefined ? { identifier: opts.identifier } : {}),
      ...(opts.platform !== undefined ? { platform: opts.platform } : {}),
      ...(opts.expiresAt !== undefined ? { expires_at: opts.expiresAt } : {}),
      ...(opts.expirationCondition !== undefined ? { expiration_condition: opts.expirationCondition } : {}),
    },
  });
  const moved = await reevaluateAssetGates(db, asset.company_id, opts.actorUserId);
  return { asset: updated, tasksReleased: moved };
}

/** Ativo deixou de valer (inválido/expirado): registra e marca os contratos que dependem dele para revalidação. */
export async function invalidateAsset(db: Db, assetId: string, opts: { actorUserId: string; reason: string; expired?: boolean }) {
  const asset = await db.clientAsset.findUnique({ where: { id: assetId }, include: { links: true } });
  if (!asset) throw new AssetError("Ativo não encontrado.", 404);
  const updated = await db.clientAsset.update({ where: { id: assetId }, data: { status: opts.expired ? "expirado" : "invalido", notes: opts.reason } });
  const contracts = [...new Set(asset.links.map((l) => l.project_product_id).filter((x): x is string => !!x))];
  for (const ppId of contracts) {
    await db.projectProduct.update({ where: { id: ppId }, data: { revalidation_reason: `${opts.expired ? "acesso expirado" : "acesso inválido"}: ${asset.label}` } });
  }
  const projects = [...new Set(asset.links.map((l) => l.project_id).filter((x): x is string => !!x))];
  for (const projectId of projects) {
    await logProjectDecision(db, {
      projectId, kind: "asset_invalidated", message: `${asset.label} ${opts.expired ? "expirou" : "ficou inválido"}: ${opts.reason}. Revalidação necessária.`,
      actorUserId: opts.actorUserId, detail: { asset_id: assetId },
    });
  }
  return updated;
}

/** Regra "revalidar se houver troca de executor": se a etapa de acessos foi dispensada por ativos válidos, ela volta. */
export async function reopenAccessValidationOnExecutorChange(db: Db, taskId: string): Promise<boolean> {
  const task = await db.projectTask.findUnique({ where: { id: taskId }, select: { id: true, project_id: true, project_product_id: true, catalog2_task: { select: { asset_rule: true } } } });
  if (!task || task.catalog2_task?.asset_rule !== "on_executor_change") return false;
  const stages = await db.projectTaskStage.findMany({ where: { project_task_id: taskId }, orderBy: [{ ordem: "asc" }] });
  const dispensed = stages.find((s) => { try { return s.status === "CONCLUIDA" && JSON.parse(s.config_snapshot ?? "{}").dispensed_by === "assets"; } catch { return false; } });
  if (!dispensed) return false;
  if (stages.some((s) => s.id !== dispensed.id && ["EM_ANDAMENTO", "AGUARDANDO_EXECUTOR"].includes(s.status) && s.ordem > dispensed.ordem)) return false; // trabalho já começou
  let cfg: Record<string, unknown> = {};
  try { cfg = JSON.parse(dispensed.config_snapshot ?? "{}"); } catch { cfg = {}; }
  delete cfg.dispensed_by;
  await db.projectTaskStage.update({ where: { id: dispensed.id }, data: { status: "PENDENTE", concluida_em: null, concluida_por: null, config_snapshot: JSON.stringify(cfg) } });
  await logProjectDecision(db, { projectId: task.project_id, projectProductId: task.project_product_id, projectTaskId: taskId, kind: "asset_revalidation", message: "Troca de executor: os acessos precisam ser revalidados por quem assumir." });
  return true;
}

/**
 * O cliente avisa que o acesso/ativo mudou (novo identificador, permissão removida, troca de conta…).
 * O ativo volta para "revalidar", os contratos que dependem dele pedem revalidação, cada projeto ganha um
 * registro no histórico e o líder responsável é avisado. Nunca aceita senha.
 */
export async function reportAssetChange(db: Db, assetId: string, opts: { actorUserId: string; note?: string | null; identifier?: string | null }) {
  const asset = await db.clientAsset.findUnique({ where: { id: assetId }, include: { links: true } });
  if (!asset) throw new AssetError("Ativo não encontrado.", 404);
  const newIdentifier = opts.identifier?.trim() || null;
  const updated = await db.clientAsset.update({
    where: { id: assetId },
    data: {
      change_reported_at: new Date(), status: asset.status === "validado" ? "revalidar" : asset.status,
      ...(opts.note ? { notes: opts.note } : {}), ...(newIdentifier ? { identifier: newIdentifier } : {}),
    },
  });
  const what = newIdentifier && newIdentifier !== asset.identifier ? `novo identificador informado` : "mudança informada";
  for (const ppId of [...new Set(asset.links.map((l) => l.project_product_id).filter((x): x is string => !!x))]) {
    await db.projectProduct.update({ where: { id: ppId }, data: { revalidation_reason: `acesso alterado pelo cliente: ${asset.label}` } });
  }
  const projects = [...new Set(asset.links.map((l) => l.project_id).filter((x): x is string => !!x))];
  for (const projectId of projects) {
    await logProjectDecision(db, { projectId, kind: "asset_change_reported", message: `${asset.label}: ${what}${opts.note ? ` (${opts.note})` : ""}. Revalidação necessária.`, actorUserId: opts.actorUserId, detail: { asset_id: assetId } });
  }
  // avisa o líder de cada tarefa ainda aberta que usa este ativo
  const taskIds = asset.links.map((l) => l.project_task_id).filter((x): x is string => !!x);
  if (taskIds.length > 0) {
    const open = await db.projectTask.findMany({ where: { id: { in: taskIds }, status: { notIn: ["CONCLUIDA", "APROVADA", "CANCELADA", "DISPENSADA_POR_REGRA"] } }, select: { id: true, title: true, lider_responsavel_id: true } });
    for (const t of open) {
      try {
        await db.systemAlert.create({
          data: {
            type: "ativo_alterado", title: `Acesso alterado pelo cliente: ${asset.label}`, message: `O cliente informou que "${asset.label}" mudou e a tarefa "${t.title}" usa esse acesso. Revalide antes de continuar.`,
            severity: "warning", category: "alerta", entity_type: "project_task", entity_id: t.id, user_id: t.lider_responsavel_id ?? null, action_url: "/lider/tarefas",
          },
        });
      } catch { /* aviso é acessório */ }
    }
  }
  return updated;
}
