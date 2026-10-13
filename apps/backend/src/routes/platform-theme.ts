// Tema visual da plataforma (Personalizar Sidebar): o degradê, as faixas de título, os botões e as fontes valem para
// todos os usuários. Leitura para qualquer usuário autenticado; escrita só do administrador. Sem cadastro, o front usa o padrão.
import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { verifyToken } from "../middleware/auth";
import { isAdminUser } from "../lib/project-scope";

const router = Router();
router.use(verifyToken);

class ThemeError extends Error { constructor(message: string, public httpStatus = 422, public code = "platform_theme") { super(message); } }
function handle(err: unknown, res: Response, next: NextFunction) {
  if (err instanceof ThemeError) { res.status(err.httpStatus).json({ error: err.message, code: err.code }); return; }
  if (err instanceof z.ZodError) { res.status(400).json({ error: "Dados inválidos.", issues: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })) }); return; }
  next(err);
}
const adminOnly = (req: Request) => { if (!isAdminUser(req.user!)) throw new ThemeError("Só a administração altera o tema da plataforma.", 403, "forbidden"); };

// Imagens de fundo e logos chegam como data URL; 8 MB cabe no limite de 10 MB do corpo.
const MAX_JSON_CHARS = 8 * 1024 * 1024;
const preset = z.object({ id: z.string().max(64), name: z.string().trim().min(1).max(80), value: z.string().max(4000), preview: z.string().max(4000) });
const body = z.object({ settings: z.record(z.unknown()), presets: z.array(preset).max(100).optional() });

function parse(json: string | null | undefined): unknown {
  if (!json) return null;
  try { return JSON.parse(json); } catch { return null; }
}

async function view() {
  const row = await prisma.platformTheme.findUnique({ where: { id: "default" } });
  return { settings: parse(row?.settings_json), presets: parse(row?.presets_json) ?? [], updated_at: row?.updated_at ?? null };
}

router.get("/", async (_req, res, next) => { try { res.json(await view()); } catch (e) { handle(e, res, next); } });

router.put("/", async (req, res, next) => {
  try {
    adminOnly(req);
    const d = body.parse(req.body);
    const settings_json = JSON.stringify(d.settings);
    if (settings_json.length > MAX_JSON_CHARS) throw new ThemeError("O tema ficou grande demais. Use uma imagem de fundo menor.", 413, "too_large");
    const data = { settings_json, ...(d.presets ? { presets_json: JSON.stringify(d.presets) } : {}), updated_by_user_id: req.user!.id };
    await prisma.platformTheme.upsert({ where: { id: "default" }, create: { id: "default", ...data }, update: data });
    res.json(await view());
  } catch (e) { handle(e, res, next); }
});

export default router;
