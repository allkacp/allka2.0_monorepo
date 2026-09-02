import { Router } from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { verifyToken } from "../middleware/auth";
import { prisma } from "../lib/prisma";
import { ensureUploadDir, generateStoredFileName, uploadedFilePath } from "../lib/file-storage";
import { extractFileText } from "../lib/ai-knowledge-base";
import { canViewLaunchSession, canManageLaunchSession } from "../lib/launch-permissions";
import {
  createLaunchSession,
  findLaunchSession,
  listLaunchSessionsForProject,
  addLaunchParticipant,
  postUserMessage,
  addLaunchMessageFile,
  archiveLaunchMessageFile,
  generateProposal,
  cancelGeneration,
  listLaunchVersions,
  getLaunchVersion,
  submitHumanEditedVersion,
  approveLaunchSessionAsDraft,
  cancelLaunchSession,
  LaunchConcurrencyError,
  LaunchSessionClosedError,
  LaunchGenerationInProgressError,
} from "../lib/launch-session-service";
import { launchPlanSchema, LaunchProposalValidationError, listUsersEligibleForProjectResponsible, type LaunchPlan } from "../lib/launch-proposal-schema";
import { materializeLaunchVersion, previewMaterializationSummary, MaterializationError } from "../lib/launch-materialization-service";

const router = Router();

// ─── IA de Lançamento (bloco 3/4) ───────────────────────────────────────────
// Conversa persistente dentro de um projeto que propõe um plano tático de
// tarefas. NUNCA materializa tarefa/etapa operacional real — "aprovar como
// rascunho" é só "plano revisado, pronto pra materialização" (bloco 4).

function handleServiceError(err: unknown, res: any, next: any): boolean {
  if (err instanceof LaunchConcurrencyError) {
    res.status(err.httpStatus).json({ error: err.message, code: err.code });
    return true;
  }
  if (err instanceof LaunchSessionClosedError) {
    res.status(err.httpStatus).json({ error: err.message, code: err.code });
    return true;
  }
  if (err instanceof LaunchGenerationInProgressError) {
    res.status(err.httpStatus).json({ error: err.message, code: err.code });
    return true;
  }
  if (err instanceof LaunchProposalValidationError) {
    res.status(err.httpStatus).json({ error: err.message, code: err.code, issues: err.issues });
    return true;
  }
  if (err instanceof MaterializationError) {
    res.status(err.httpStatus).json({ error: err.message, code: err.code });
    return true;
  }
  next(err);
  return true;
}

async function assertProjectView(req: any, res: any, projectId: string): Promise<boolean> {
  const access = await canViewLaunchSession(prisma, req.user!, projectId);
  if (!access.exists || !access.allowed) {
    res.status(404).json({ error: "Projeto não encontrado" });
    return false;
  }
  return true;
}

async function assertProjectManage(req: any, res: any, projectId: string): Promise<boolean> {
  const view = await canViewLaunchSession(prisma, req.user!, projectId);
  if (!view.exists || !view.allowed) {
    res.status(404).json({ error: "Projeto não encontrado" });
    return false;
  }
  const canManage = await canManageLaunchSession(prisma, req.user!, projectId);
  if (!canManage) {
    res.status(403).json({ error: "Você não tem autorização para gerenciar o lançamento deste projeto." });
    return false;
  }
  return true;
}

/** Resolve a sessão + garante que quem chama tem visibilidade do PROJETO
 * dela (nunca 403 nesse passo — 404 pra não revelar existência). */
async function loadSessionWithView(req: any, res: any) {
  const session = await prisma.launchSession.findUnique({ where: { id: req.params.id as string }, select: { id: true, project_id: true } });
  if (!session) {
    res.status(404).json({ error: "Sessão não encontrada" });
    return null;
  }
  const ok = await assertProjectView(req, res, session.project_id);
  if (!ok) return null;
  return session;
}

async function loadSessionWithManage(req: any, res: any) {
  const session = await prisma.launchSession.findUnique({ where: { id: req.params.id as string }, select: { id: true, project_id: true } });
  if (!session) {
    res.status(404).json({ error: "Sessão não encontrada" });
    return null;
  }
  const ok = await assertProjectManage(req, res, session.project_id);
  if (!ok) return null;
  return session;
}

// POST /api/launch-sessions — body: { project_id }
router.post("/", verifyToken, async (req, res, next) => {
  try {
    const projectId = String(req.body?.project_id ?? "");
    if (!projectId) {
      res.status(400).json({ error: "project_id é obrigatório" });
      return;
    }
    const ok = await assertProjectManage(req, res, projectId);
    if (!ok) return;
    const session = await createLaunchSession({ projectId, createdByUserId: req.user!.id });
    res.status(201).json({ session });
  } catch (err) {
    next(err);
  }
});

// GET /api/launch-sessions?project_id=
router.get("/", verifyToken, async (req, res, next) => {
  try {
    const projectId = String(req.query.project_id ?? "");
    if (!projectId) {
      res.status(400).json({ error: "project_id é obrigatório" });
      return;
    }
    const ok = await assertProjectView(req, res, projectId);
    if (!ok) return;
    const sessions = await listLaunchSessionsForProject(projectId);
    res.json({ sessions });
  } catch (err) {
    next(err);
  }
});

// GET /api/launch-sessions/:id
router.get("/:id", verifyToken, async (req, res, next) => {
  try {
    const loaded = await loadSessionWithView(req, res);
    if (!loaded) return;
    const session = await findLaunchSession(req.params.id as string);
    const canManage = await canManageLaunchSession(prisma, req.user!, loaded.project_id);
    res.json({ session, can_manage: canManage });
  } catch (err) {
    next(err);
  }
});

// POST /api/launch-sessions/:id/participants — body: { user_id }
router.post("/:id/participants", verifyToken, async (req, res, next) => {
  try {
    const ok = await loadSessionWithManage(req, res);
    if (!ok) return;
    const userId = String(req.body?.user_id ?? "");
    if (!userId) {
      res.status(400).json({ error: "user_id é obrigatório" });
      return;
    }
    const participant = await addLaunchParticipant({ sessionId: req.params.id as string, userId, addedByUserId: req.user!.id });
    res.status(201).json({ participant });
  } catch (err) {
    next(err);
  }
});

// POST /api/launch-sessions/:id/messages — body: { content }
router.post("/:id/messages", verifyToken, async (req, res, next) => {
  try {
    const ok = await loadSessionWithManage(req, res);
    if (!ok) return;
    const content = String(req.body?.content ?? "").trim();
    if (!content) {
      res.status(400).json({ error: "content é obrigatório" });
      return;
    }
    const message = await postUserMessage({ sessionId: req.params.id as string, actorUserId: req.user!.id, content });
    res.status(201).json({ message });
  } catch (err) {
    handleServiceError(err, res, next);
  }
});

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);
const TEXT_EXTRACTABLE_EXT = new Set([".pdf", ".docx", ".txt", ".md"]);

const messageFilesUpload = multer({
  storage: multer.diskStorage({
    destination: (req, _file, cb) => cb(null, ensureUploadDir(`launch-sessions/${req.params.id}/${req.params.messageId}`)),
    filename: (_req, file, cb) => cb(null, generateStoredFileName(file.originalname)),
  }),
  limits: { fileSize: 30 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(new Error("Tipo de arquivo não permitido."));
      return;
    }
    cb(null, true);
  },
});

// POST /api/launch-sessions/:id/messages/:messageId/files
router.post(
  "/:id/messages/:messageId/files",
  verifyToken,
  async (req, res, next) => {
    try {
      const ok = await loadSessionWithManage(req, res);
      if (!ok) return;
      next();
    } catch (err) {
      next(err);
    }
  },
  (req, res, next) => {
    messageFilesUpload.single("file")(req, res, (err) => {
      if (err) {
        res.status(400).json({ error: err.message || "Não foi possível enviar o arquivo." });
        return;
      }
      next();
    });
  },
  async (req, res, next) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "Nenhum arquivo enviado" });
        return;
      }
      const ext = path.extname(req.file.originalname).toLowerCase();
      let extractedText: string | null = null;
      if (TEXT_EXTRACTABLE_EXT.has(ext)) {
        try {
          extractedText = await extractFileText(req.file.path);
        } catch {
          extractedText = null;
          // Arquivo corrompido/ilegível: fica disponível pra download, só
          // não entra como texto no prompt da IA.
        }
      }
      const file = await addLaunchMessageFile({
        messageId: req.params.messageId as string,
        actorUserId: req.user!.id,
        name: req.file.originalname,
        fileName: req.file.filename,
        mimeType: req.file.mimetype ?? null,
        size: req.file.size,
        extractedText,
      });
      res.status(201).json({ file });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/launch-sessions/:id/messages/:messageId/files/:fileId/download
router.get("/:id/messages/:messageId/files/:fileId/download", verifyToken, async (req, res, next) => {
  try {
    const ok = await loadSessionWithView(req, res);
    if (!ok) return;
    const file = await prisma.launchMessageFile.findUnique({ where: { id: req.params.fileId as string } });
    if (!file || file.message_id !== req.params.messageId) {
      res.status(404).json({ error: "Arquivo não encontrado" });
      return;
    }
    const filePath = uploadedFilePath(`launch-sessions/${req.params.id}/${req.params.messageId}`, file.file_name);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: "Arquivo não encontrado em disco" });
      return;
    }
    res.download(filePath, file.name);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/launch-sessions/:id/messages/:messageId/files/:fileId
router.delete("/:id/messages/:messageId/files/:fileId", verifyToken, async (req, res, next) => {
  try {
    const ok = await loadSessionWithManage(req, res);
    if (!ok) return;
    await archiveLaunchMessageFile(req.params.fileId as string);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/launch-sessions/:id/generate — body: { client_action_id }
router.post("/:id/generate", verifyToken, async (req, res, next) => {
  try {
    const ok = await loadSessionWithManage(req, res);
    if (!ok) return;
    const clientActionId = String(req.body?.client_action_id ?? "");
    if (!clientActionId) {
      res.status(400).json({ error: "client_action_id é obrigatório" });
      return;
    }
    const { execution, duplicate } = await generateProposal({ sessionId: req.params.id as string, requestedByUserId: req.user!.id, clientActionId });
    res.status(duplicate ? 200 : 202).json({ execution, duplicate });
  } catch (err) {
    handleServiceError(err, res, next);
  }
});

// GET /api/launch-sessions/:id/executions/:executionId
router.get("/:id/executions/:executionId", verifyToken, async (req, res, next) => {
  try {
    const ok = await loadSessionWithView(req, res);
    if (!ok) return;
    const execution = await prisma.launchGenerationExecution.findUnique({ where: { id: req.params.executionId as string } });
    if (!execution || execution.session_id !== req.params.id) {
      res.status(404).json({ error: "Execução não encontrada" });
      return;
    }
    res.json({ execution });
  } catch (err) {
    next(err);
  }
});

// POST /api/launch-sessions/:id/executions/:executionId/cancel
router.post("/:id/executions/:executionId/cancel", verifyToken, async (req, res, next) => {
  try {
    const ok = await loadSessionWithManage(req, res);
    if (!ok) return;
    const execution = await prisma.launchGenerationExecution.findUnique({ where: { id: req.params.executionId as string } });
    if (!execution || execution.session_id !== req.params.id) {
      res.status(404).json({ error: "Execução não encontrada" });
      return;
    }
    if (execution.status !== "pending") {
      res.status(200).json({ execution, already_finished: true });
      return;
    }
    cancelGeneration(execution.id);
    res.status(202).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// GET /api/launch-sessions/:id/versions
router.get("/:id/versions", verifyToken, async (req, res, next) => {
  try {
    const ok = await loadSessionWithView(req, res);
    if (!ok) return;
    const versions = await listLaunchVersions(req.params.id as string);
    res.json({ versions });
  } catch (err) {
    next(err);
  }
});

// GET /api/launch-sessions/:id/versions/:versionId
router.get("/:id/versions/:versionId", verifyToken, async (req, res, next) => {
  try {
    const ok = await loadSessionWithView(req, res);
    if (!ok) return;
    const version = await getLaunchVersion(req.params.versionId as string);
    if (!version || version.session_id !== req.params.id) {
      res.status(404).json({ error: "Versão não encontrada" });
      return;
    }
    res.json({ version });
  } catch (err) {
    next(err);
  }
});

// GET /api/launch-sessions/:id/eligible-assignments — especialidades ativas
// (catálogo real, plataforma inteira) + responsáveis elegíveis (só quem tem
// vínculo real com a EMPRESA/AGÊNCIA dona deste projeto específico, nunca a
// plataforma inteira) — pro editor humano oferecer como opções reais, nunca
// associar por texto parecido nem inventar id.
router.get("/:id/eligible-assignments", verifyToken, async (req, res, next) => {
  try {
    const loaded = await loadSessionWithView(req, res);
    if (!loaded) return;
    const [specialties, responsibles] = await Promise.all([
      prisma.specialty.findMany({ where: { is_active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
      listUsersEligibleForProjectResponsible(loaded.project_id),
    ]);
    res.json({ specialties, responsibles });
  } catch (err) {
    next(err);
  }
});

// POST /api/launch-sessions/:id/versions — edição humana. body: { plan, updated_at }
router.post("/:id/versions", verifyToken, async (req, res, next) => {
  try {
    const ok = await loadSessionWithManage(req, res);
    if (!ok) return;
    const parsedPlan = launchPlanSchema.safeParse(req.body?.plan);
    if (!parsedPlan.success) {
      res.status(422).json({ error: "Plano inválido", issues: parsedPlan.error.issues.map((i) => `${i.path.join(".") || "(raiz)"}: ${i.message}`) });
      return;
    }
    const session = await submitHumanEditedVersion({
      sessionId: req.params.id as string,
      actorUserId: req.user!.id,
      expectedUpdatedAt: req.body?.updated_at ?? null,
      plan: parsedPlan.data,
    });
    res.status(201).json({ session });
  } catch (err) {
    handleServiceError(err, res, next);
  }
});

// POST /api/launch-sessions/:id/approve — body: { updated_at, version_id? }
router.post("/:id/approve", verifyToken, async (req, res, next) => {
  try {
    const ok = await loadSessionWithManage(req, res);
    if (!ok) return;
    const session = await approveLaunchSessionAsDraft({
      sessionId: req.params.id as string,
      actorUserId: req.user!.id,
      expectedUpdatedAt: req.body?.updated_at ?? null,
      versionId: req.body?.version_id,
    });
    res.json({ session });
  } catch (err) {
    handleServiceError(err, res, next);
  }
});

// POST /api/launch-sessions/:id/cancel — body: { updated_at }
router.post("/:id/cancel", verifyToken, async (req, res, next) => {
  try {
    const ok = await loadSessionWithManage(req, res);
    if (!ok) return;
    const session = await cancelLaunchSession({ sessionId: req.params.id as string, actorUserId: req.user!.id, expectedUpdatedAt: req.body?.updated_at ?? null });
    res.json({ session });
  } catch (err) {
    handleServiceError(err, res, next);
  }
});

// GET /api/launch-sessions/:id/versions/:versionId/materialization-preview —
// resumo (tarefas/etapas/dependências/ondas/pendências) ANTES de confirmar.
// Nunca cria nada — só leitura, calculada em cima do JSON já salvo.
router.get("/:id/versions/:versionId/materialization-preview", verifyToken, async (req, res, next) => {
  try {
    const ok = await loadSessionWithManage(req, res);
    if (!ok) return;
    const version = await getLaunchVersion(req.params.versionId as string);
    if (!version || version.session_id !== req.params.id) {
      res.status(404).json({ error: "Versão não encontrada" });
      return;
    }
    let plan: LaunchPlan;
    try {
      plan = JSON.parse(version.structured_json);
    } catch {
      res.status(422).json({ error: "Versão não contém um plano JSON válido" });
      return;
    }
    res.json({ summary: previewMaterializationSummary(plan) });
  } catch (err) {
    next(err);
  }
});

// POST /api/launch-sessions/:id/materialize — body: { version_id, mode,
// client_action_id }. Transforma a proposta APROVADA em tarefas/etapas reais
// numa única transação (tudo ou nada), idempotente por client_action_id E
// por version_id (uma proposta aprovada só materializa uma vez).
router.post("/:id/materialize", verifyToken, async (req, res, next) => {
  try {
    const ok = await loadSessionWithManage(req, res);
    if (!ok) return;
    const mode = req.body?.mode === "execucao" ? "execucao" : req.body?.mode === "rascunho_operacional" ? "rascunho_operacional" : null;
    if (!mode) {
      res.status(400).json({ error: "mode deve ser 'rascunho_operacional' ou 'execucao'" });
      return;
    }
    const clientActionId = String(req.body?.client_action_id ?? "");
    if (!clientActionId) {
      res.status(400).json({ error: "client_action_id é obrigatório" });
      return;
    }
    const versionId = String(req.body?.version_id ?? "");
    if (!versionId) {
      res.status(400).json({ error: "version_id é obrigatório" });
      return;
    }
    const result = await materializeLaunchVersion({
      sessionId: req.params.id as string,
      versionId,
      mode,
      requestedByUserId: req.user!.id,
      clientActionId,
    });
    res.status(result.duplicate ? 200 : 201).json(result);
  } catch (err) {
    handleServiceError(err, res, next);
  }
});

export default router;
