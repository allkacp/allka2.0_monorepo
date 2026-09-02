import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { verifyToken } from "../middleware/auth";

// ─── Onboarding: progresso de tour guiado por usuário (sprint de onboarding,
// bloco 1/3) ──────────────────────────────────────────────────────────────
// Escopo SEMPRE por req.user!.id (nunca um user_id vindo do corpo — nem
// sequer aceito nos schemas abaixo, então um payload forjado é ignorado por
// construção, não filtrado por uma checagem a mais). Uma conta nunca
// consulta/altera o progresso de outra: toda query já nasce filtrada por
// `user_id: req.user!.id`, nunca por um id recebido do cliente.
//
// `tour_key`/`version` vêm da URL/corpo como identificadores livres — o
// backend só guarda progresso, nunca valida contra uma lista de tours (essa
// lista vive no registro do frontend, ver lib/tours/registry.ts). Isso é
// deliberado: o backend não precisa ser redeployado pra um tour novo nascer.

const router = Router();
router.use(verifyToken);

const TOUR_STATUSES = ["nao_iniciado", "em_andamento", "concluido", "adiado", "dispensado"] as const;
// "Agora não" — adiamento razoável e documentado: 24h. Nunca vem do corpo da
// requisição (evitaria um cliente forjar um adiamento infinito).
const POSTPONE_HOURS = 24;

const versionSchema = z.object({ version: z.number().int().positive() });
const stepSchema = z.object({ version: z.number().int().positive(), step_key: z.string().trim().min(1) });

function tourKeyParam(req: Request): string | null {
  const key = String(req.params.tourKey ?? "").trim();
  return key.length > 0 ? key : null;
}

// ── GET / — todo o progresso do usuário logado (pra Central de Ajuda) ──────
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await prisma.tourProgress.findMany({ where: { user_id: req.user!.id }, orderBy: { updated_at: "desc" } });
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

// ── GET /:tourKey — progresso de UM tour (querystring ?version=N) ─────────
router.get("/:tourKey", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tourKey = tourKeyParam(req);
    const version = Number(req.query.version);
    if (!tourKey || !Number.isInteger(version) || version <= 0) {
      res.status(400).json({ error: "tourKey e version (inteiro positivo) são obrigatórios" });
      return;
    }
    const progress = await prisma.tourProgress.findUnique({
      where: { user_id_tour_key_version: { user_id: req.user!.id, tour_key: tourKey, version } },
    });
    res.json({ data: progress });
  } catch (err) {
    next(err);
  }
});

async function upsertProgress(userId: string, tourKey: string, version: number, patch: Record<string, unknown>) {
  try {
    return await prisma.tourProgress.upsert({
      where: { user_id_tour_key_version: { user_id: userId, tour_key: tourKey, version } },
      create: { user_id: userId, tour_key: tourKey, version, ...patch },
      update: patch,
    });
  } catch (e: any) {
    if (e?.code === "P2002") {
      // Corrida: outra requisição concorrente já criou a mesma linha entre a
      // leitura implícita do upsert e a gravação — nunca duplica, apenas
      // aplica o mesmo patch de novo sobre a linha real.
      return prisma.tourProgress.update({
        where: { user_id_tour_key_version: { user_id: userId, tour_key: tourKey, version } },
        data: patch,
      });
    }
    throw e;
  }
}

// ── POST /:tourKey/start — inicia ou retoma ────────────────────────────────
router.post("/:tourKey/start", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tourKey = tourKeyParam(req);
    const parsed = versionSchema.safeParse(req.body);
    if (!tourKey || !parsed.success) {
      res.status(400).json({ error: "Dados inválidos", details: parsed.success ? undefined : parsed.error.flatten().fieldErrors });
      return;
    }
    const userId = req.user!.id;
    const existing = await prisma.tourProgress.findUnique({
      where: { user_id_tour_key_version: { user_id: userId, tour_key: tourKey, version: parsed.data.version } },
    });
    // Já em andamento ou concluído: "iniciar" de novo é sempre um no-op
    // idempotente — nunca reseta o passo salvo nem duplica.
    if (existing && (existing.status === "em_andamento" || existing.status === "concluido")) {
      res.json({ data: existing });
      return;
    }
    const data = await upsertProgress(userId, tourKey, parsed.data.version, {
      status: "em_andamento",
      started_at: existing?.started_at ?? new Date(),
    });
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /:tourKey/step — salva o passo atual ─────────────────────────────
router.patch("/:tourKey/step", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tourKey = tourKeyParam(req);
    const parsed = stepSchema.safeParse(req.body);
    if (!tourKey || !parsed.success) {
      res.status(400).json({ error: "Dados inválidos", details: parsed.success ? undefined : parsed.error.flatten().fieldErrors });
      return;
    }
    const userId = req.user!.id;
    const existing = await prisma.tourProgress.findUnique({
      where: { user_id_tour_key_version: { user_id: userId, tour_key: tourKey, version: parsed.data.version } },
    });
    // Um tour já concluído/dispensado não regride pra "em andamento" só por
    // um passo perdido chegando atrasado — só atualiza o marcador de passo.
    const status = existing && (existing.status === "concluido" || existing.status === "dispensado") ? existing.status : "em_andamento";
    const data = await upsertProgress(userId, tourKey, parsed.data.version, {
      status,
      last_step_key: parsed.data.step_key,
      started_at: existing?.started_at ?? new Date(),
    });
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

// ── POST /:tourKey/complete ─────────────────────────────────────────────────
router.post("/:tourKey/complete", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tourKey = tourKeyParam(req);
    const parsed = versionSchema.safeParse(req.body);
    if (!tourKey || !parsed.success) {
      res.status(400).json({ error: "Dados inválidos", details: parsed.success ? undefined : parsed.error.flatten().fieldErrors });
      return;
    }
    const userId = req.user!.id;
    const existing = await prisma.tourProgress.findUnique({
      where: { user_id_tour_key_version: { user_id: userId, tour_key: tourKey, version: parsed.data.version } },
    });
    // Retry/duplo-clique: já concluído — devolve a linha como está, nunca
    // sobrescreve completed_at com um timestamp mais novo.
    if (existing?.status === "concluido") {
      res.json({ data: existing });
      return;
    }
    const data = await upsertProgress(userId, tourKey, parsed.data.version, {
      status: "concluido",
      completed_at: new Date(),
      started_at: existing?.started_at ?? new Date(),
    });
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

// ── POST /:tourKey/postpone — "Agora não" (nunca marca como concluído) ────
router.post("/:tourKey/postpone", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tourKey = tourKeyParam(req);
    const parsed = versionSchema.safeParse(req.body);
    if (!tourKey || !parsed.success) {
      res.status(400).json({ error: "Dados inválidos", details: parsed.success ? undefined : parsed.error.flatten().fieldErrors });
      return;
    }
    const now = new Date();
    const data = await upsertProgress(req.user!.id, tourKey, parsed.data.version, {
      status: "adiado",
      postponed_at: now,
      postponed_until: new Date(now.getTime() + POSTPONE_HOURS * 60 * 60 * 1000),
    });
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

// ── POST /:tourKey/dismiss — "Não quero ver este tutorial" ─────────────────
router.post("/:tourKey/dismiss", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tourKey = tourKeyParam(req);
    const parsed = versionSchema.safeParse(req.body);
    if (!tourKey || !parsed.success) {
      res.status(400).json({ error: "Dados inválidos", details: parsed.success ? undefined : parsed.error.flatten().fieldErrors });
      return;
    }
    const data = await upsertProgress(req.user!.id, tourKey, parsed.data.version, {
      status: "dispensado",
      dismissed_at: new Date(),
    });
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

// ── POST /:tourKey/restart — reabertura manual pela Central de Ajuda ──────
// Nunca apaga o histórico anterior: completed_at/dismissed_at/postponed_at
// de um ciclo anterior só são sobrescritos quando um NOVO ciclo de fato
// concluir/dispensar de novo — reiniciar por si só não mexe neles.
router.post("/:tourKey/restart", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tourKey = tourKeyParam(req);
    const parsed = versionSchema.safeParse(req.body);
    if (!tourKey || !parsed.success) {
      res.status(400).json({ error: "Dados inválidos", details: parsed.success ? undefined : parsed.error.flatten().fieldErrors });
      return;
    }
    const data = await upsertProgress(req.user!.id, tourKey, parsed.data.version, {
      status: "em_andamento",
      last_step_key: null,
      started_at: new Date(),
    });
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

export { TOUR_STATUSES };
export default router;
