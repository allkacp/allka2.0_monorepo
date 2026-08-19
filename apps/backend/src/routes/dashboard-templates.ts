// ─── Dashboard Templates (padrão por perfil) — Item 9/10 ─────────────────────
// Template administrativo global, separado da personalização individual do
// usuário (que continua em localStorage, ver
// apps/frontend/lib/dashboard-presets-by-role.ts). Regra de prioridade:
//   1. Personalização pessoal do usuário (se existir) — sempre vence.
//   2. Template default ativo do perfil (se existir) — usado só quando o
//      usuário ainda não tem nada salvo.
//   3. Fallback hardcoded do frontend (dashboard-presets-by-role.ts) — usado
//      só quando nem 1 nem 2 existem, pra nunca quebrar login/dashboard.
// Essa decisão de prioridade é resolvida no FRONTEND (o backend só expõe o
// template); ver features/dashboards/shared/use-dashboard-template.ts.
//
// Rotas:
//   GET    /api/dashboard-templates                 → admin: lista (filtro ?profile=)
//   GET    /api/dashboard-templates/resolve          → qualquer usuário autenticado: template default ativo do PRÓPRIO perfil
//   GET    /api/dashboard-templates/:id              → admin: 1 template + contents
//   POST   /api/dashboard-templates                  → admin: cria
//   PATCH  /api/dashboard-templates/:id               → admin: edita (nome/widgets/is_active)
//   POST   /api/dashboard-templates/:id/duplicate     → admin: duplica (nunca default)
//   POST   /api/dashboard-templates/:id/set-default   → admin: define como default do perfil (transaction, só 1 por perfil)
//   DELETE /api/dashboard-templates/:id               → admin: apaga (bloqueado se for o default ativo)
//   POST   /api/dashboard-templates/:id/contents       → admin: cria banner/aviso
//   PATCH  /api/dashboard-templates/contents/:contentId → admin: edita
//   DELETE /api/dashboard-templates/contents/:contentId → admin: remove
//   POST   /api/dashboard-templates/contents/:contentId/image → admin: upload de imagem (multipart)
//   GET    /api/dashboard-templates/contents/:contentId/image → PÚBLICA (sem auth): serve a imagem inline.
//     Decisão arquitetural: não há storage estático/público configurado no
//     projeto (ver lib/file-storage.ts) e todo download hoje é
//     autenticado — mas banner é conteúdo de marketing interno não
//     sensível, e travar a imagem atrás de Authorization impediria o uso
//     direto em <img src>. Servir publicamente pela storage_key (uuid
//     imprevisível) é o mesmo nível de exposição de um link público comum,
//     e evita criar infra de storage nova (proibido pelo pedido original).

import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import fs from "fs";
import multer from "multer";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { verifyToken } from "../middleware/auth";
import { isAdminUser } from "../lib/project-scope";
import { ensureUploadDir, generateStoredFileName, uploadedFilePath, deleteUploadedFile } from "../lib/file-storage";

const router = Router();

// Perfis válidos — mesmo vocabulário minúsculo de ShareLink.profile.
const VALID_PROFILES = ["admin", "agency", "company", "nomad", "partner", "leader"] as const;
type Profile = (typeof VALID_PROFILES)[number];

function normalizeProfile(value: unknown): Profile | null {
  const v = String(value ?? "").trim().toLowerCase();
  return (VALID_PROFILES as readonly string[]).includes(v) ? (v as Profile) : null;
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: "Não autenticado" });
  if (!isAdminUser(req.user)) {
    return res.status(403).json({ error: "Acesso restrito ao administrador" });
  }
  next();
}

const widgetSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  visible: z.boolean(),
  order: z.number(),
  customTitle: z.string().optional(),
  colSpan: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
}).passthrough();
// .passthrough(): não descarta campos extras que já existam no shape salvo
// (ex.: futuras propriedades de override de período por widget), pra nunca
// perder configuração ao ir e voltar do template.

const createTemplateSchema = z.object({
  name: z.string().min(1).max(191),
  profile: z.string(),
  widgets: z.array(widgetSchema).default([]),
});

const updateTemplateSchema = z.object({
  name: z.string().min(1).max(191).optional(),
  widgets: z.array(widgetSchema).optional(),
  is_active: z.boolean().optional(),
});

const contentTypeSchema = z.enum(["banner", "notice"]);

const createContentSchema = z.object({
  type: contentTypeSchema,
  title: z.string().min(1).max(191),
  body: z.string().max(5000).optional().nullable(),
  link_url: z.string().url().max(2048).optional().nullable(),
  link_label: z.string().max(120).optional().nullable(),
  active: z.boolean().optional(),
  starts_at: z.string().datetime().optional().nullable(),
  ends_at: z.string().datetime().optional().nullable(),
  sort_order: z.number().optional(),
  locked: z.boolean().optional(),
});

const updateContentSchema = createContentSchema.partial();

router.use(verifyToken as any);

// ── GET /resolve — template default ativo do PRÓPRIO perfil do usuário ────
// Não é admin-only: qualquer usuário autenticado pode ler o template do seu
// próprio perfil (é o que os 6 dashboards consultam ao carregar). Perfil é
// derivado no frontend (mesma lógica de App.tsx) e enviado via ?profile=.
router.get("/resolve", async (req, res, next) => {
  try {
    const profile = normalizeProfile(req.query.profile);
    if (!profile) {
      res.status(400).json({ error: "profile inválido" });
      return;
    }
    const now = new Date();
    const template = await prisma.dashboardTemplate.findFirst({
      where: { profile, is_default: true, is_active: true },
      include: {
        contents: {
          where: {
            active: true,
            AND: [
              { OR: [{ starts_at: null }, { starts_at: { lte: now } }] },
              { OR: [{ ends_at: null }, { ends_at: { gte: now } }] },
            ],
          },
          orderBy: { sort_order: "asc" },
        },
      },
    });
    res.json({ template });
  } catch (err) {
    next(err);
  }
});

// ── GET / — lista (admin) ──────────────────────────────────────────────────
router.get("/", requireAdmin, async (req, res, next) => {
  try {
    const profile = req.query.profile ? normalizeProfile(req.query.profile) : undefined;
    if (req.query.profile && !profile) {
      res.status(400).json({ error: "profile inválido" });
      return;
    }
    const templates = await prisma.dashboardTemplate.findMany({
      where: profile ? { profile } : undefined,
      include: { _count: { select: { contents: true } }, creator: { select: { id: true, name: true, email: true } } },
      orderBy: [{ profile: "asc" }, { created_at: "desc" }],
    });
    res.json({ templates });
  } catch (err) {
    next(err);
  }
});

// ── GET /:id — 1 template + contents (admin) ───────────────────────────────
router.get("/:id", requireAdmin, async (req, res, next) => {
  try {
    const template = await prisma.dashboardTemplate.findUnique({
      where: { id: req.params.id as string },
      include: { contents: { orderBy: { sort_order: "asc" } }, creator: { select: { id: true, name: true, email: true } } },
    });
    if (!template) {
      res.status(404).json({ error: "Template não encontrado" });
      return;
    }
    res.json({ template });
  } catch (err) {
    next(err);
  }
});

// ── POST / — cria (admin) ──────────────────────────────────────────────────
router.post("/", requireAdmin, async (req, res, next) => {
  try {
    const parsed = createTemplateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Dados inválidos", details: parsed.error.flatten() });
      return;
    }
    const profile = normalizeProfile(parsed.data.profile);
    if (!profile) {
      res.status(400).json({ error: "profile inválido" });
      return;
    }
    const template = await prisma.dashboardTemplate.create({
      data: {
        name: parsed.data.name,
        profile,
        widgets: parsed.data.widgets as any,
        created_by: req.user!.id,
      },
    });
    res.status(201).json({ template });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /:id — edita (admin) ─────────────────────────────────────────────
router.patch("/:id", requireAdmin, async (req, res, next) => {
  try {
    const parsed = updateTemplateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Dados inválidos", details: parsed.error.flatten() });
      return;
    }
    const existing = await prisma.dashboardTemplate.findUnique({ where: { id: req.params.id as string } });
    if (!existing) {
      res.status(404).json({ error: "Template não encontrado" });
      return;
    }
    const template = await prisma.dashboardTemplate.update({
      where: { id: existing.id },
      data: {
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(parsed.data.widgets !== undefined ? { widgets: parsed.data.widgets as any } : {}),
        ...(parsed.data.is_active !== undefined ? { is_active: parsed.data.is_active } : {}),
      },
    });
    res.json({ template });
  } catch (err) {
    next(err);
  }
});

// ── POST /:id/duplicate — duplica (admin) ──────────────────────────────────
router.post("/:id/duplicate", requireAdmin, async (req, res, next) => {
  try {
    const source = await prisma.dashboardTemplate.findUnique({
      where: { id: req.params.id as string },
      include: { contents: true },
    });
    if (!source) {
      res.status(404).json({ error: "Template não encontrado" });
      return;
    }
    const duplicate = await prisma.dashboardTemplate.create({
      data: {
        name: `${source.name} (cópia)`,
        profile: source.profile,
        widgets: source.widgets as any,
        is_default: false,
        is_active: true,
        created_by: req.user!.id,
        contents: {
          create: source.contents.map((c) => ({
            type: c.type,
            title: c.title,
            body: c.body,
            image_storage_key: c.image_storage_key,
            image_mime_type: c.image_mime_type,
            link_url: c.link_url,
            link_label: c.link_label,
            active: c.active,
            starts_at: c.starts_at,
            ends_at: c.ends_at,
            sort_order: c.sort_order,
            locked: c.locked,
          })),
        },
      },
      include: { contents: true },
    });
    res.status(201).json({ template: duplicate });
  } catch (err) {
    next(err);
  }
});

// ── POST /:id/set-default — só 1 default ativo por perfil (transaction) ───
router.post("/:id/set-default", requireAdmin, async (req, res, next) => {
  try {
    const target = await prisma.dashboardTemplate.findUnique({ where: { id: req.params.id as string } });
    if (!target) {
      res.status(404).json({ error: "Template não encontrado" });
      return;
    }
    const [, updated] = await prisma.$transaction([
      prisma.dashboardTemplate.updateMany({
        where: { profile: target.profile, is_default: true, id: { not: target.id } },
        data: { is_default: false },
      }),
      prisma.dashboardTemplate.update({
        where: { id: target.id },
        data: { is_default: true, is_active: true },
      }),
    ]);
    res.json({ template: updated });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /:id — apaga (admin), bloqueado se for o default ativo ─────────
router.delete("/:id", requireAdmin, async (req, res, next) => {
  try {
    const target = await prisma.dashboardTemplate.findUnique({ where: { id: req.params.id as string } });
    if (!target) {
      res.status(404).json({ error: "Template não encontrado" });
      return;
    }
    if (target.is_default) {
      res.status(409).json({ error: "Não é possível apagar o template default. Defina outro como padrão primeiro." });
      return;
    }
    await prisma.dashboardTemplate.delete({ where: { id: target.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// ── Contents (banners/avisos) ──────────────────────────────────────────────

router.post("/:id/contents", requireAdmin, async (req, res, next) => {
  try {
    const template = await prisma.dashboardTemplate.findUnique({ where: { id: req.params.id as string } });
    if (!template) {
      res.status(404).json({ error: "Template não encontrado" });
      return;
    }
    const parsed = createContentSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Dados inválidos", details: parsed.error.flatten() });
      return;
    }
    const d = parsed.data;
    const content = await prisma.dashboardTemplateContent.create({
      data: {
        template_id: template.id,
        type: d.type,
        title: d.title,
        body: d.body ?? null,
        link_url: d.link_url ?? null,
        link_label: d.link_label ?? null,
        active: d.active ?? true,
        starts_at: d.starts_at ? new Date(d.starts_at) : null,
        ends_at: d.ends_at ? new Date(d.ends_at) : null,
        sort_order: d.sort_order ?? 0,
        locked: d.locked ?? false,
      },
    });
    res.status(201).json({ content });
  } catch (err) {
    next(err);
  }
});

router.patch("/contents/:contentId", requireAdmin, async (req, res, next) => {
  try {
    const existing = await prisma.dashboardTemplateContent.findUnique({ where: { id: req.params.contentId as string } });
    if (!existing) {
      res.status(404).json({ error: "Conteúdo não encontrado" });
      return;
    }
    const parsed = updateContentSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Dados inválidos", details: parsed.error.flatten() });
      return;
    }
    const d = parsed.data;
    const content = await prisma.dashboardTemplateContent.update({
      where: { id: existing.id },
      data: {
        ...(d.type !== undefined ? { type: d.type } : {}),
        ...(d.title !== undefined ? { title: d.title } : {}),
        ...(d.body !== undefined ? { body: d.body } : {}),
        ...(d.link_url !== undefined ? { link_url: d.link_url } : {}),
        ...(d.link_label !== undefined ? { link_label: d.link_label } : {}),
        ...(d.active !== undefined ? { active: d.active } : {}),
        ...(d.starts_at !== undefined ? { starts_at: d.starts_at ? new Date(d.starts_at) : null } : {}),
        ...(d.ends_at !== undefined ? { ends_at: d.ends_at ? new Date(d.ends_at) : null } : {}),
        ...(d.sort_order !== undefined ? { sort_order: d.sort_order } : {}),
        ...(d.locked !== undefined ? { locked: d.locked } : {}),
      },
    });
    res.json({ content });
  } catch (err) {
    next(err);
  }
});

router.delete("/contents/:contentId", requireAdmin, async (req, res, next) => {
  try {
    const existing = await prisma.dashboardTemplateContent.findUnique({ where: { id: req.params.contentId as string } });
    if (!existing) {
      res.status(404).json({ error: "Conteúdo não encontrado" });
      return;
    }
    if (existing.image_storage_key) {
      deleteUploadedFile(`dashboard-template-contents/${existing.id}`, existing.image_storage_key);
    }
    await prisma.dashboardTemplateContent.delete({ where: { id: existing.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// ── Imagem do banner ───────────────────────────────────────────────────────

const contentImageUpload = multer({
  storage: multer.diskStorage({
    destination: (req, _file, cb) => {
      cb(null, ensureUploadDir(`dashboard-template-contents/${req.params.contentId}`));
    },
    filename: (_req, file, cb) => cb(null, generateStoredFileName(file.originalname)),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("Arquivo precisa ser uma imagem"));
      return;
    }
    cb(null, true);
  },
});

router.post("/contents/:contentId/image", requireAdmin, contentImageUpload.single("file"), async (req, res, next) => {
  try {
    const existing = await prisma.dashboardTemplateContent.findUnique({ where: { id: req.params.contentId as string } });
    if (!existing) {
      res.status(404).json({ error: "Conteúdo não encontrado" });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: "Nenhum arquivo enviado" });
      return;
    }
    if (existing.image_storage_key) {
      deleteUploadedFile(`dashboard-template-contents/${existing.id}`, existing.image_storage_key);
    }
    const content = await prisma.dashboardTemplateContent.update({
      where: { id: existing.id },
      data: { image_storage_key: req.file.filename, image_mime_type: req.file.mimetype },
    });
    res.status(201).json({ content });
  } catch (err) {
    next(err);
  }
});

// Pública (sem verifyToken) — precisa ficar registrada num router separado
// já que router.use(verifyToken) acima cobre tudo neste arquivo. Ver
// registro duplo em app.ts (dashboardTemplatesPublicRouter).
export const dashboardTemplatesPublicRouter = Router();
dashboardTemplatesPublicRouter.get("/contents/:contentId/image", async (req, res, next) => {
  try {
    const content = await prisma.dashboardTemplateContent.findUnique({ where: { id: req.params.contentId as string } });
    if (!content || !content.image_storage_key) {
      res.status(404).json({ error: "Imagem não encontrada" });
      return;
    }
    const filePath = uploadedFilePath(`dashboard-template-contents/${content.id}`, content.image_storage_key);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: "Imagem não encontrada em disco" });
      return;
    }
    res.setHeader("Content-Type", content.image_mime_type || "application/octet-stream");
    res.setHeader("Cache-Control", "public, max-age=86400");
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    next(err);
  }
});

export default router;
