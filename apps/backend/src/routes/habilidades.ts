// ─── Habilidades Router ───────────────────────────────────────────────────────
// Admin CRUD for NomadeHabilidade (nomad skill links) and LiderArea (leader area links).
// Also exposes read endpoints for leaders and nomads to see their own assignments.
//
// Routes:
//   GET    /api/habilidades/areas                 → static list of available areas
//   GET    /api/habilidades/nomade/:nomadeId       → nomad skill records
//   POST   /api/habilidades/nomade/:nomadeId       → add skill to nomad
//   PATCH  /api/habilidades/nomade/:nomadeId/:id   → update nomad skill
//   DELETE /api/habilidades/nomade/:nomadeId/:id   → remove nomad skill
//   GET    /api/habilidades/lider/:userId          → leader area records
//   POST   /api/habilidades/lider/:userId          → add area to leader
//   PATCH  /api/habilidades/lider/:userId/:id      → update leader area
//   DELETE /api/habilidades/lider/:userId/:id      → remove leader area
//   GET    /api/habilidades/nomades-por-area       → query: ?area=Performance

import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { verifyToken } from "../middleware/auth";

const router = Router();
router.use(verifyToken as any);

// ─── Middleware: require admin ────────────────────────────────────────────────

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: "Não autenticado" });
  if (user.role !== "admin") {
    return res.status(403).json({ error: "Acesso restrito ao administrador" });
  }
  next();
}

// ─── Canonical areas ──────────────────────────────────────────────────────────

export const AREAS_CANONICAS = [
  { slug: "Performance",  label: "Performance",   categorias: ["Performance e Anúncios Patrocinados", "SEO"] },
  { slug: "Design",       label: "Design",         categorias: ["Identidade Visual", "UI/UX", "Criação"] },
  { slug: "Conteúdo",     label: "Conteúdo",       categorias: ["Gestão de Redes Sociais", "Copywriting", "Blog"] },
  { slug: "Web",          label: "Web",            categorias: ["Desenvolvimento Web", "E-commerce", "Landing Pages"] },
  { slug: "Audiovisual",  label: "Audiovisual",    categorias: ["Vídeo", "Motion", "Podcast"] },
] as const;

// GET /api/habilidades/areas
router.get("/areas", (_req, res) => {
  res.json({ areas: AREAS_CANONICAS });
});

// ─── Nomad Skills ─────────────────────────────────────────────────────────────

// GET /api/habilidades/nomade/:nomadeId
router.get("/nomade/:nomadeId", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const self = (req as any).user;
    const nomadeId = req.params.nomadeId as string;

    // Admin can see anyone; nomad can see own (via linked user_id)
    if (self.role !== "admin") {
      const nomade = await prisma.nomade.findFirst({
        where: { id: nomadeId, user_id: self.id },
        select: { id: true },
      });
      if (!nomade) return res.status(403).json({ error: "Acesso negado" });
    }

    const habilidades = await prisma.nomadeHabilidade.findMany({
      where: { nomade_id: nomadeId },
      orderBy: [{ area: "asc" }, { created_at: "asc" }],
    });

    res.json({ habilidades });
  } catch (err) {
    next(err);
  }
});

// POST /api/habilidades/nomade/:nomadeId
router.post("/nomade/:nomadeId", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const nomadeId = req.params.nomadeId as string;
    const { area, categoria_produto, produto_id, modelo_tarefa_id, nota_media, disponibilidade, ativo } = req.body;

    if (!area) return res.status(400).json({ error: "Campo 'area' é obrigatório" });

    // Verify nomad exists
    const nomade = await prisma.nomade.findUnique({ where: { id: nomadeId }, select: { id: true } });
    if (!nomade) return res.status(404).json({ error: "Nômade não encontrado" });

    const habilidade = await prisma.nomadeHabilidade.create({
      data: {
        nomade_id: nomadeId,
        area,
        categoria_produto: categoria_produto ?? null,
        produto_id: produto_id ?? null,
        modelo_tarefa_id: modelo_tarefa_id ?? null,
        nota_media: nota_media ?? 0,
        disponibilidade: disponibilidade ?? "disponivel",
        ativo: ativo !== undefined ? ativo : true,
      },
    });

    res.status(201).json({ habilidade });
  } catch (err: any) {
    if (err.code === "P2002") {
      return res.status(409).json({ error: "Habilidade já cadastrada para este nômade com os mesmos parâmetros" });
    }
    next(err);
  }
});

// PATCH /api/habilidades/nomade/:nomadeId/:id
router.patch("/nomade/:nomadeId/:id", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const nomadeId = req.params.nomadeId as string;
    const id = req.params.id as string;
    const { area, categoria_produto, produto_id, modelo_tarefa_id, nota_media, disponibilidade, ativo } = req.body;

    const existing = await prisma.nomadeHabilidade.findFirst({
      where: { id, nomade_id: nomadeId },
    });
    if (!existing) return res.status(404).json({ error: "Habilidade não encontrada" });

    const updated = await prisma.nomadeHabilidade.update({
      where: { id },
      data: {
        ...(area !== undefined && { area }),
        ...(categoria_produto !== undefined && { categoria_produto }),
        ...(produto_id !== undefined && { produto_id }),
        ...(modelo_tarefa_id !== undefined && { modelo_tarefa_id }),
        ...(nota_media !== undefined && { nota_media }),
        ...(disponibilidade !== undefined && { disponibilidade }),
        ...(ativo !== undefined && { ativo }),
      },
    });

    res.json({ habilidade: updated });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/habilidades/nomade/:nomadeId/:id
router.delete("/nomade/:nomadeId/:id", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const nomadeId = req.params.nomadeId as string;
    const id = req.params.id as string;
    const existing = await prisma.nomadeHabilidade.findFirst({ where: { id, nomade_id: nomadeId } });
    if (!existing) return res.status(404).json({ error: "Habilidade não encontrada" });
    await prisma.nomadeHabilidade.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ─── Leader Areas ─────────────────────────────────────────────────────────────

// GET /api/habilidades/lider/:userId
router.get("/lider/:userId", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const self = (req as any).user;
    const userId = req.params.userId as string;

    if (self.role !== "admin" && self.id !== userId) {
      return res.status(403).json({ error: "Acesso negado" });
    }

    const areas = await prisma.liderArea.findMany({
      where: { user_id: userId },
      orderBy: { area_nome: "asc" },
    });

    res.json({ areas });
  } catch (err) {
    next(err);
  }
});

// POST /api/habilidades/lider/:userId
router.post("/lider/:userId", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.params.userId as string;
    const { area_nome, categorias_permitidas, produtos_permitidos, ativo } = req.body;

    if (!area_nome) return res.status(400).json({ error: "Campo 'area_nome' é obrigatório" });

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true } });
    if (!user) return res.status(404).json({ error: "Usuário não encontrado" });

    const area = await prisma.liderArea.create({
      data: {
        user_id: userId,
        area_nome,
        categorias_permitidas: categorias_permitidas
          ? (Array.isArray(categorias_permitidas) ? JSON.stringify(categorias_permitidas) : categorias_permitidas)
          : null,
        produtos_permitidos: produtos_permitidos
          ? (Array.isArray(produtos_permitidos) ? JSON.stringify(produtos_permitidos) : produtos_permitidos)
          : null,
        ativo: ativo !== undefined ? ativo : true,
      },
    });

    res.status(201).json({ area });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/habilidades/lider/:userId/:id
router.patch("/lider/:userId/:id", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.params.userId as string;
    const id = req.params.id as string;
    const { area_nome, categorias_permitidas, produtos_permitidos, ativo } = req.body;

    const existing = await prisma.liderArea.findFirst({ where: { id, user_id: userId } });
    if (!existing) return res.status(404).json({ error: "Área não encontrada" });

    const updated = await prisma.liderArea.update({
      where: { id },
      data: {
        ...(area_nome !== undefined && { area_nome }),
        ...(categorias_permitidas !== undefined && {
          categorias_permitidas: Array.isArray(categorias_permitidas)
            ? JSON.stringify(categorias_permitidas)
            : categorias_permitidas,
        }),
        ...(produtos_permitidos !== undefined && {
          produtos_permitidos: Array.isArray(produtos_permitidos)
            ? JSON.stringify(produtos_permitidos)
            : produtos_permitidos,
        }),
        ...(ativo !== undefined && { ativo }),
      },
    });

    res.json({ area: updated });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/habilidades/lider/:userId/:id
router.delete("/lider/:userId/:id", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.params.userId as string;
    const id = req.params.id as string;
    const existing = await prisma.liderArea.findFirst({ where: { id, user_id: userId } });
    if (!existing) return res.status(404).json({ error: "Área não encontrada" });
    await prisma.liderArea.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ─── Query: nomads by area ────────────────────────────────────────────────────

// GET /api/habilidades/nomades-por-area?area=Performance&categoria=...&ativo=true
router.get("/nomades-por-area", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { area, categoria, disponibilidade } = req.query as Record<string, string>;

    const orFilters: object[] = [];
    if (area) orFilters.push({ area: { contains: area } });
    if (categoria) orFilters.push({ categoria_produto: { contains: categoria } });

    const habilidades = await prisma.nomadeHabilidade.findMany({
      where: {
        ativo: true,
        disponibilidade: disponibilidade ?? "disponivel",
        ...(orFilters.length > 0 ? { OR: orFilters } : {}),
        nomade: { status: "ativo" },
      },
      include: {
        nomade: {
          select: {
            id: true,
            name: true,
            email: true,
            status: true,
            performance_avg_rating: true,
            tasks_completed_total: true,
            level: true,
          },
        },
      },
      orderBy: { nota_media: "desc" },
    });

    // Deduplicate by nomade
    const nomadeMap = new Map<string, object>();
    for (const h of habilidades) {
      if (!nomadeMap.has(h.nomade_id)) {
        nomadeMap.set(h.nomade_id, {
          nomade: h.nomade,
          habilidades: [] as object[],
        });
      }
      (nomadeMap.get(h.nomade_id) as any).habilidades.push({
        id: h.id,
        area: h.area,
        categoria_produto: h.categoria_produto,
        nota_media: h.nota_media,
        disponibilidade: h.disponibilidade,
      });
    }

    res.json({ nomades: Array.from(nomadeMap.values()) });
  } catch (err) {
    next(err);
  }
});

export default router;
