import { Router } from "express";
import multer from "multer";
import fs from "fs";
import { verifyToken, requireAdminMaster } from "../middleware/auth";
import { prisma } from "../lib/prisma";
import { isAdminUser } from "../lib/project-scope";
import { ensureUploadDir, generateStoredFileName, uploadedFilePath } from "../lib/file-storage";
import { canReportOnProject, isProjectOwnerForReports, canAccessHallucinationReport } from "../lib/hallucination-permissions";
import {
  createHallucinationReport,
  findHallucinationReport,
  listHallucinationReports,
  listHallucinationReportHistory,
  assumeAnalysis,
  markSuspectedOrigin,
  recordDiagnosis,
  closeHallucinationReport,
  addHallucinationReportFile,
  archiveHallucinationReportFile,
  isHallucinationCategory,
  isHallucinationImpact,
  HALLUCINATION_STATUSES,
  HallucinationConcurrencyError,
  HallucinationClosedError,
} from "../lib/hallucination-service";

const router = Router();

// ─── Relato de "possível alucinação" (bloco 2/4) ────────────────────────────
// Nunca afirma que houve alucinação de fato — só coleta a suspeita. Nunca
// corrige memória sozinho (isso passa pela API do bloco 1). Company/Agência
// só ENXERGAM os relatos do próprio vínculo (leitura); as transições
// administrativas (assumir/marcar origem/diagnosticar/resolver/descartar)
// são exclusivas de Admin Master.

function handleServiceError(err: unknown, res: any, next: any) {
  if (err instanceof HallucinationConcurrencyError) {
    res.status(err.httpStatus).json({ error: err.message, code: err.code });
    return true;
  }
  if (err instanceof HallucinationClosedError) {
    res.status(err.httpStatus).json({ error: err.message, code: err.code });
    return true;
  }
  next(err);
  return true;
}

// POST /api/hallucination-reports
router.post("/", verifyToken, async (req, res, next) => {
  try {
    const body = req.body ?? {};
    const projectId = String(body.project_id ?? "");
    const description = String(body.description ?? "").trim();
    const category = String(body.category ?? "");
    const impact = String(body.impact ?? "");

    if (!projectId || !description) {
      res.status(400).json({ error: "Projeto e descrição são obrigatórios." });
      return;
    }
    if (!isHallucinationCategory(category)) {
      res.status(400).json({ error: "Categoria inválida." });
      return;
    }
    if (!isHallucinationImpact(impact)) {
      res.status(400).json({ error: "Impacto inválido." });
      return;
    }

    const access = await canReportOnProject(prisma, req.user!, projectId);
    if (!access.exists || !access.allowed) {
      res.status(404).json({ error: "Projeto não encontrado" });
      return;
    }

    const { report, duplicate } = await createHallucinationReport({
      projectId,
      reportedByUserId: req.user!.id,
      description,
      questionedResponse: body.questioned_response ? String(body.questioned_response) : null,
      snapshotId: body.snapshot_id ? String(body.snapshot_id) : null,
      launchExecutionId: body.launch_execution_id ? String(body.launch_execution_id) : null,
      projectTaskId: body.project_task_id ? String(body.project_task_id) : null,
      category,
      impact,
      createClientActionId: body.create_client_action_id ? String(body.create_client_action_id) : null,
    });

    res.status(duplicate ? 200 : 201).json({ report, duplicate });
  } catch (err) {
    next(err);
  }
});

// GET /api/hallucination-reports?project_id=&status=&limit=&offset=
router.get("/", verifyToken, async (req, res, next) => {
  try {
    const projectId = req.query.project_id ? String(req.query.project_id) : undefined;
    const statusRaw = req.query.status ? String(req.query.status) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const offset = req.query.offset ? Number(req.query.offset) : undefined;

    const status = statusRaw && (HALLUCINATION_STATUSES as readonly string[]).includes(statusRaw) ? statusRaw : undefined;

    const admin = isAdminUser(req.user);
    const where: any = {};
    if (projectId) where.project_id = projectId;
    if (status) where.status = status;

    if (!admin) {
      if (projectId) {
        const owner = await isProjectOwnerForReports(prisma, req.user!, projectId);
        if (!owner) {
          // Visível mas não dono: só os relatos que a própria pessoa criou.
          where.reported_by_user_id = req.user!.id;
        }
      } else {
        // Sem projeto informado: só "meus relatos" entre todos os projetos.
        where.reported_by_user_id = req.user!.id;
      }
    }

    const result = await listHallucinationReports(where, { limit, offset });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

async function assertReportAccess(req: any, res: any) {
  const report = await findHallucinationReport(req.params.id);
  if (!report) {
    res.status(404).json({ error: "Relato não encontrado" });
    return null;
  }
  const allowed = await canAccessHallucinationReport(prisma, req.user!, report);
  if (!allowed) {
    res.status(404).json({ error: "Relato não encontrado" });
    return null;
  }
  return report;
}

// GET /api/hallucination-reports/:id
router.get("/:id", verifyToken, async (req, res, next) => {
  try {
    const report = await assertReportAccess(req, res);
    if (!report) return;
    res.json({ report });
  } catch (err) {
    next(err);
  }
});

// GET /api/hallucination-reports/:id/history
router.get("/:id/history", verifyToken, async (req, res, next) => {
  try {
    const report = await assertReportAccess(req, res);
    if (!report) return;
    const history = await listHallucinationReportHistory(report.id);
    res.json({ history });
  } catch (err) {
    next(err);
  }
});

const reportFilesUpload = multer({
  storage: multer.diskStorage({
    destination: (req, _file, cb) => cb(null, ensureUploadDir(`hallucination-reports/${req.params.id}`)),
    filename: (_req, file, cb) => cb(null, generateStoredFileName(file.originalname)),
  }),
  limits: { fileSize: 30 * 1024 * 1024 },
});

// POST /api/hallucination-reports/:id/files
router.post(
  "/:id/files",
  verifyToken,
  async (req, res, next) => {
    try {
      const report = await assertReportAccess(req, res);
      if (!report) return;
      if (report.status === "resolvido" || report.status === "descartado") {
        res.status(422).json({ error: "Este relato já foi encerrado e não aceita novos anexos." });
        return;
      }
      next();
    } catch (err) {
      next(err);
    }
  },
  reportFilesUpload.single("file"),
  async (req, res, next) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "Nenhum arquivo enviado" });
        return;
      }
      const file = await addHallucinationReportFile({
        reportId: req.params.id as string,
        actorUserId: req.user!.id,
        name: req.file.originalname,
        fileName: req.file.filename,
        mimeType: req.file.mimetype ?? null,
        size: req.file.size,
      });
      res.status(201).json({ file });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/hallucination-reports/:id/files/:fileId/download
router.get("/:id/files/:fileId/download", verifyToken, async (req, res, next) => {
  try {
    const report = await assertReportAccess(req, res);
    if (!report) return;
    const file = report.files.find((f) => f.id === req.params.fileId);
    if (!file) {
      res.status(404).json({ error: "Arquivo não encontrado" });
      return;
    }
    const filePath = uploadedFilePath(`hallucination-reports/${report.id}`, file.file_name);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: "Arquivo não encontrado em disco" });
      return;
    }
    res.download(filePath, file.name);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/hallucination-reports/:id/files/:fileId — arquivamento lógico,
// restrito a Admin ou a quem enviou o próprio arquivo.
router.delete("/:id/files/:fileId", verifyToken, async (req, res, next) => {
  try {
    const report = await assertReportAccess(req, res);
    if (!report) return;
    const file = report.files.find((f) => f.id === req.params.fileId);
    if (!file) {
      res.status(404).json({ error: "Arquivo não encontrado" });
      return;
    }
    if (!isAdminUser(req.user) && file.uploaded_by_user_id !== req.user!.id) {
      res.status(403).json({ error: "Você não tem autorização para remover este anexo." });
      return;
    }
    await archiveHallucinationReportFile(file.id, req.user!.id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ── Central administrativa — tudo abaixo exige Admin Master ────────────────

router.post("/:id/assume", verifyToken, requireAdminMaster, async (req, res, next) => {
  try {
    const { updated_at } = (req.body ?? {}) as { updated_at?: string | null };
    const report = await assumeAnalysis({ reportId: req.params.id as string, actorUserId: req.user!.id, expectedUpdatedAt: updated_at ?? null });
    res.json({ report });
  } catch (err) {
    handleServiceError(err, res, next);
  }
});

router.post("/:id/suspected-origin", verifyToken, requireAdminMaster, async (req, res, next) => {
  try {
    const { layer, memory_id, updated_at } = (req.body ?? {}) as { layer?: string; memory_id?: string | null; updated_at?: string | null };
    if (layer !== "project" && layer !== "company" && layer !== "agency") {
      res.status(400).json({ error: "Camada inválida." });
      return;
    }
    const report = await markSuspectedOrigin({
      reportId: req.params.id as string,
      actorUserId: req.user!.id,
      expectedUpdatedAt: updated_at ?? null,
      layer,
      memoryId: memory_id ?? null,
    });
    res.json({ report });
  } catch (err) {
    handleServiceError(err, res, next);
  }
});

router.post("/:id/diagnosis", verifyToken, requireAdminMaster, async (req, res, next) => {
  try {
    const { note, updated_at } = (req.body ?? {}) as { note?: string; updated_at?: string | null };
    if (!note || !note.trim()) {
      res.status(400).json({ error: "Diagnóstico não pode ser vazio." });
      return;
    }
    const report = await recordDiagnosis({ reportId: req.params.id as string, actorUserId: req.user!.id, expectedUpdatedAt: updated_at ?? null, note: note.trim() });
    res.json({ report });
  } catch (err) {
    handleServiceError(err, res, next);
  }
});

router.post("/:id/close", verifyToken, requireAdminMaster, async (req, res, next) => {
  try {
    const { outcome, justification, client_action_id, updated_at } = (req.body ?? {}) as {
      outcome?: string;
      justification?: string;
      client_action_id?: string;
      updated_at?: string | null;
    };
    if (outcome !== "resolvido" && outcome !== "descartado") {
      res.status(400).json({ error: "Desfecho inválido." });
      return;
    }
    if (!justification || !justification.trim()) {
      res.status(400).json({ error: "Justificativa é obrigatória para resolver ou descartar." });
      return;
    }
    if (!client_action_id) {
      res.status(400).json({ error: "client_action_id é obrigatório." });
      return;
    }

    const result = await closeHallucinationReport({
      reportId: req.params.id as string,
      actorUserId: req.user!.id,
      outcome,
      justification: justification.trim(),
      clientActionId: client_action_id,
      expectedUpdatedAt: updated_at ?? null,
    });

    if (result.alreadyClosed) {
      res.status(409).json({ error: "Este relato já foi encerrado.", already_closed: true, report: result.report });
      return;
    }
    res.status(result.duplicate ? 200 : 201).json({ report: result.report, duplicate: result.duplicate });
  } catch (err) {
    handleServiceError(err, res, next);
  }
});

export default router;
