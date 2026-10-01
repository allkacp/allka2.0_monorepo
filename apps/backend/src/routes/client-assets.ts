import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { verifyToken } from "../middleware/auth";
import { isAdminUser } from "../lib/project-scope";
import { ACCESS_TYPE_KEYS } from "../lib/catalog2-access";
import { kickDependencies } from "../lib/project-dependencies";
import { AssetError, invalidateAsset, isAssetValid, rejectSecrets, reportAssetChange, validateAsset } from "../lib/client-assets";

// Ativos validados do cliente. NUNCA aceita senha/credencial.
//   GET  /api/client-assets?company_id=       lista (admin/líder: qualquer cliente; cliente: só a própria empresa)
//   POST /api/client-assets                   cria/atualiza o registro (identificador seguro, plataforma, notas)
//   POST /api/client-assets/:id/validate      Allka valida (admin/líder) — escopo/permissão confirmada
//   POST /api/client-assets/:id/invalidate    marca inválido/expirado → contratos dependentes pedem revalidação
//   POST /api/client-assets/:id/report-change o cliente avisa que algo mudou → volta para revalidar

const router = Router();
router.use(verifyToken);

const isStaff = (u?: { role?: string; account_type?: string }) => isAdminUser(u) || u?.role === "lider" || u?.account_type === "lider";

async function companyOf(userId: string): Promise<string | null> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { company_id: true } });
  return u?.company_id ?? null;
}
async function canSeeCompany(req: Request, companyId: string): Promise<boolean> {
  if (isStaff(req.user)) return true;
  return (await companyOf(req.user!.id)) === companyId;
}

function handle(err: unknown, res: Response, next: NextFunction) {
  if (err instanceof AssetError) { res.status(err.httpStatus).json({ error: err.message }); return; }
  next(err);
}

router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const companyId = typeof req.query.company_id === "string" ? req.query.company_id : isStaff(req.user) ? null : await companyOf(req.user!.id);
    if (!companyId) { res.status(400).json({ error: "Informe company_id." }); return; }
    if (!(await canSeeCompany(req, companyId))) { res.status(404).json({ error: "Cliente não encontrado." }); return; }
    const rows = await prisma.clientAsset.findMany({
      where: { company_id: companyId }, orderBy: [{ asset_type: "asc" }, { label: "asc" }],
      include: { links: { select: { project_id: true, project_task_id: true, catalog2_product_id: true, is_required: true } } },
    });
    res.json({
      data: rows.map((a) => ({
        ...a,
        valid_now: isAssetValid(a, "none_while_valid"),
        dependent_tasks: a.links.filter((l) => l.project_task_id).length,
        dependent_products: new Set(a.links.map((l) => l.catalog2_product_id).filter(Boolean)).size,
      })),
    });
  } catch (err) { handle(err, res, next); }
});

const upsertSchema = z.object({
  company_id: z.string().min(1),
  asset_type: z.enum(ACCESS_TYPE_KEYS),
  label: z.string().trim().min(1).max(191),
  platform: z.string().trim().max(191).nullish(),
  identifier: z.string().trim().max(191).nullish(),
  notes: z.string().max(2000).nullish(),
});
router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    rejectSecrets(req.body);
    const d = upsertSchema.parse(req.body);
    if (!(await canSeeCompany(req, d.company_id))) { res.status(404).json({ error: "Cliente não encontrado." }); return; }
    const asset = await prisma.clientAsset.upsert({
      where: { company_id_asset_type_label: { company_id: d.company_id, asset_type: d.asset_type, label: d.label } },
      create: { company_id: d.company_id, asset_type: d.asset_type, label: d.label, platform: d.platform ?? null, identifier: d.identifier ?? null, notes: d.notes ?? null },
      // Cliente informando/atualizando o identificador NÃO valida: quem valida é a Allka.
      update: { ...(d.platform !== undefined ? { platform: d.platform } : {}), ...(d.identifier !== undefined ? { identifier: d.identifier } : {}), ...(d.notes !== undefined ? { notes: d.notes } : {}) },
    });
    res.status(201).json(asset);
  } catch (err) { handle(err, res, next); }
});

async function loadForStaff(req: Request, res: Response) {
  if (!isStaff(req.user)) { res.status(403).json({ error: "Somente a Allka (líder/administrador) valida ativos." }); return null; }
  const a = await prisma.clientAsset.findUnique({ where: { id: req.params.id as string } });
  if (!a) { res.status(404).json({ error: "Ativo não encontrado." }); return null; }
  return a;
}

const validateSchema = z.object({
  scope_confirmed: z.string().trim().min(1).max(191),
  identifier: z.string().trim().max(191).nullish(),
  platform: z.string().trim().max(191).nullish(),
  expires_at: z.string().datetime({ offset: true }).nullish(),
  expiration_condition: z.string().max(191).nullish(),
});
router.post("/:id/validate", async (req: Request, res: Response, next: NextFunction) => {
  try {
    rejectSecrets(req.body);
    if (!(await loadForStaff(req, res))) return;
    const d = validateSchema.parse(req.body);
    const r = await prisma.$transaction((tx) =>
      validateAsset(tx, req.params.id as string, {
        actorUserId: req.user!.id, scopeConfirmed: d.scope_confirmed, identifier: d.identifier, platform: d.platform,
        expiresAt: d.expires_at === undefined ? undefined : d.expires_at ? new Date(d.expires_at) : null, expirationCondition: d.expiration_condition,
      }),
    );
    // ativo validado pode liberar tarefas que esperavam "informação/ativo" (pacotes/dependências)
    const linkedProjects = await prisma.clientAssetLink.findMany({ where: { asset: { company_id: r.asset.company_id }, project_id: { not: null } }, select: { project_id: true }, distinct: ["project_id"] });
    linkedProjects.forEach((l) => kickDependencies(l.project_id));
    res.json({ asset: r.asset, tasks_released: r.tasksReleased });
  } catch (err) { handle(err, res, next); }
});

router.post("/:id/invalidate", async (req: Request, res: Response, next: NextFunction) => {
  try {
    rejectSecrets(req.body);
    if (!(await loadForStaff(req, res))) return;
    const d = z.object({ reason: z.string().trim().min(3).max(500), expired: z.boolean().optional() }).parse(req.body);
    res.json(await prisma.$transaction((tx) => invalidateAsset(tx, req.params.id as string, { actorUserId: req.user!.id, reason: d.reason, expired: d.expired })));
  } catch (err) { handle(err, res, next); }
});

router.post("/:id/report-change", async (req: Request, res: Response, next: NextFunction) => {
  try {
    rejectSecrets(req.body);
    const a = await prisma.clientAsset.findUnique({ where: { id: req.params.id as string } });
    if (!a || !(await canSeeCompany(req, a.company_id))) { res.status(404).json({ error: "Ativo não encontrado." }); return; }
    const d = z.object({ note: z.string().max(500).nullish(), identifier: z.string().trim().max(191).nullish() }).parse(req.body ?? {});
    res.json(await reportAssetChange(prisma, a.id, { actorUserId: req.user!.id, note: d.note, identifier: d.identifier }));
  } catch (err) { handle(err, res, next); }
});

export default router;
