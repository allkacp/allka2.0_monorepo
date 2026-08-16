import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { verifyToken } from "../middleware/auth";
import { projectVisibleToUser } from "../lib/project-scope";
import { syncConnectionMetrics } from "../lib/meta-ads-sync";

// Rotas genéricas, independentes de provedor — a lógica específica de OAuth
// da Meta mora em routes/meta-integration.ts, de propósito, pra Google/
// TikTok entrarem depois sem mexer aqui.
const router = Router();
router.use(verifyToken);

async function loadVisibleProject(req: Request, projectId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return null;
  const visible = await projectVisibleToUser(prisma, req.user!, project);
  return visible ? project : null;
}

const CONNECTION_PUBLIC_SELECT = {
  id: true,
  project_id: true,
  provider: true,
  status: true,
  external_account_id: true,
  external_account_name: true,
  scopes: true,
  token_expires_at: true,
  last_synced_at: true,
  last_error: true,
  connected_by_user_id: true,
  created_at: true,
  updated_at: true,
  // access_token_encrypted deliberadamente de fora — nunca sai da API.
};

// ── GET /?project_id=X ──────────────────────────────────────────────────────
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projectId = String(req.query.project_id || "");
    if (!projectId) {
      res.status(400).json({ error: "project_id é obrigatório." });
      return;
    }
    const project = await loadVisibleProject(req, projectId);
    if (!project) {
      res.status(404).json({ error: "Projeto não encontrado." });
      return;
    }
    const data = await prisma.projectConnection.findMany({
      where: { project_id: projectId },
      select: CONNECTION_PUBLIC_SELECT,
      orderBy: { created_at: "asc" },
    });
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

async function loadOwnedConnection(req: Request, connectionId: string) {
  const connection = await prisma.projectConnection.findUnique({ where: { id: connectionId } });
  if (!connection) return null;
  const project = await loadVisibleProject(req, connection.project_id);
  return project ? connection : null;
}

// ── GET /:id/metrics?days=30 ────────────────────────────────────────────────
const metricsQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
});

router.get("/:id/metrics", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const connection = await loadOwnedConnection(req, req.params.id as string);
    if (!connection) {
      res.status(404).json({ error: "Conexão não encontrada." });
      return;
    }
    const query = metricsQuerySchema.safeParse(req.query);
    if (!query.success) {
      res.status(400).json({ error: "Parâmetros inválidos" });
      return;
    }
    const since = new Date();
    since.setDate(since.getDate() - query.data.days);
    const data = await prisma.projectConnectionMetricDaily.findMany({
      where: { connection_id: connection.id, date: { gte: since } },
      orderBy: { date: "asc" },
    });
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /:id ──────────────────────────────────────────────────────────────
// Desconecta — nunca apaga a linha nem o histórico de métricas. É
// literalmente o objetivo do recurso (provar resultado ao longo do tempo)
// sobreviver a uma desconexão/reconexão.
router.delete("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const connection = await loadOwnedConnection(req, req.params.id as string);
    if (!connection) {
      res.status(404).json({ error: "Conexão não encontrada." });
      return;
    }
    await prisma.projectConnection.update({
      where: { id: connection.id },
      data: { status: "disconnected", access_token_encrypted: "" },
    });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// ── POST /:id/sync ───────────────────────────────────────────────────────────
router.post("/:id/sync", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const connection = await loadOwnedConnection(req, req.params.id as string);
    if (!connection) {
      res.status(404).json({ error: "Conexão não encontrada." });
      return;
    }
    if (connection.provider !== "meta_ads") {
      res.status(400).json({ error: "Sincronização ainda só implementada para Meta Ads." });
      return;
    }
    if (connection.status === "disconnected") {
      res.status(400).json({ error: "Conexão desconectada — reconecte antes de sincronizar." });
      return;
    }
    const result = await syncConnectionMetrics(connection.id, { daysBack: 30 });
    res.json(result);
  } catch (err) {
    if (err instanceof Error) {
      res.status(502).json({ error: "Não foi possível sincronizar agora. Tente novamente." });
      return;
    }
    next(err);
  }
});

export default router;
