import { Router } from "express";
import multer from "multer";
import fs from "fs";
import { verifyToken } from "../middleware/auth";
import { prisma } from "../lib/prisma";
import { ensureUploadDir, generateStoredFileName, uploadedFilePath } from "../lib/file-storage";
import { checkMemoryAccess, isMemoryScopeType, type MemoryScopeType } from "../lib/memory-permissions";
import {
  findMemory,
  updateMemorySection,
  archiveMemory,
  addMemoryFile,
  archiveMemoryFile,
  listMemoryHistory,
  isMemorySection,
  MemoryConcurrencyError,
} from "../lib/memory-service";

const router = Router();

// Todo endpoint de escopo (:scopeType/:scopeId) passa por aqui primeiro —
// resolve 404 (não existe / sem visibilidade nenhuma, nunca revela
// existência) vs 403 (visível mas sem permissão de editar), igual ao padrão
// já usado em projects.ts (assertProjectAccess).
async function assertMemoryAccess(req: any, res: any, need: "view" | "edit"): Promise<{ scopeType: MemoryScopeType; scopeId: string; canEdit: boolean } | null> {
  const scopeTypeRaw = req.params.scopeType as string;
  const scopeId = req.params.scopeId as string;
  if (!isMemoryScopeType(scopeTypeRaw)) {
    res.status(400).json({ error: "Escopo inválido" });
    return null;
  }
  const result = await checkMemoryAccess(prisma, req.user!, scopeTypeRaw, scopeId, need);
  if (!result.ok) {
    res.status(result.status).json({ error: result.status === 404 ? "Memória não encontrada" : "Acesso negado" });
    return null;
  }
  return { scopeType: scopeTypeRaw, scopeId, canEdit: result.canEdit };
}

function emptyMemoryShell(scopeType: MemoryScopeType, scopeId: string) {
  return {
    id: null,
    scope_type: scopeType,
    scope_id: scopeId,
    positive_instructions: null,
    negative_instructions: null,
    summary: null,
    is_archived: false,
    updated_at: null,
    files: [],
  };
}

// GET /api/memory/:scopeType/:scopeId
router.get("/:scopeType/:scopeId", verifyToken, async (req, res, next) => {
  try {
    const access = await assertMemoryAccess(req, res, "view");
    if (!access) return;
    const memory = await findMemory(access.scopeType, access.scopeId);
    res.json({ memory: memory ?? emptyMemoryShell(access.scopeType, access.scopeId), can_edit: access.canEdit });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/memory/:scopeType/:scopeId — edita UMA seção por vez
router.patch("/:scopeType/:scopeId", verifyToken, async (req, res, next) => {
  try {
    const access = await assertMemoryAccess(req, res, "edit");
    if (!access) return;

    const { section, value, updatedAt } = req.body as { section?: string; value?: string; updatedAt?: string | null };
    if (!section || !isMemorySection(section)) {
      res.status(400).json({ error: "Seção inválida" });
      return;
    }
    if (typeof value !== "string") {
      res.status(400).json({ error: "Valor inválido" });
      return;
    }

    const memory = await updateMemorySection({
      scopeType: access.scopeType,
      scopeId: access.scopeId,
      section,
      value,
      actorUserId: req.user!.id,
      expectedUpdatedAt: updatedAt ?? null,
    });
    res.json({ memory });
  } catch (err) {
    if (err instanceof MemoryConcurrencyError) {
      res.status(err.httpStatus).json({ error: err.message, code: err.code });
      return;
    }
    next(err);
  }
});

// POST /api/memory/:scopeType/:scopeId/archive
router.post("/:scopeType/:scopeId/archive", verifyToken, async (req, res, next) => {
  try {
    const access = await assertMemoryAccess(req, res, "edit");
    if (!access) return;
    const { reason } = (req.body ?? {}) as { reason?: string };
    const memory = await archiveMemory(access.scopeType, access.scopeId, req.user!.id, reason);
    res.json({ memory });
  } catch (err) {
    next(err);
  }
});

// GET /api/memory/:scopeType/:scopeId/history
router.get("/:scopeType/:scopeId/history", verifyToken, async (req, res, next) => {
  try {
    const access = await assertMemoryAccess(req, res, "view");
    if (!access) return;
    const history = await listMemoryHistory(access.scopeType, access.scopeId);
    res.json({ history });
  } catch (err) {
    next(err);
  }
});

const memoryFilesUpload = multer({
  storage: multer.diskStorage({
    destination: (req, _file, cb) => {
      cb(null, ensureUploadDir(`memory/${req.params.scopeType}/${req.params.scopeId}`));
    },
    filename: (_req, file, cb) => cb(null, generateStoredFileName(file.originalname)),
  }),
  limits: { fileSize: 30 * 1024 * 1024 },
});

// POST /api/memory/:scopeType/:scopeId/files
router.post(
  "/:scopeType/:scopeId/files",
  verifyToken,
  async (req, res, next) => {
    try {
      const access = await assertMemoryAccess(req, res, "edit");
      if (!access) return;
      next();
    } catch (err) {
      next(err);
    }
  },
  memoryFilesUpload.single("file"),
  async (req, res, next) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "Nenhum arquivo enviado" });
        return;
      }
      const scopeType = req.params.scopeType as MemoryScopeType;
      const scopeId = req.params.scopeId as string;
      const file = await addMemoryFile({
        scopeType,
        scopeId,
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

// GET /api/memory/:scopeType/:scopeId/files/:fileId/download
router.get("/:scopeType/:scopeId/files/:fileId/download", verifyToken, async (req, res, next) => {
  try {
    const access = await assertMemoryAccess(req, res, "view");
    if (!access) return;

    const memory = await findMemory(access.scopeType, access.scopeId);
    const file = memory?.files.find((f) => f.id === req.params.fileId);
    if (!file) {
      res.status(404).json({ error: "Arquivo não encontrado" });
      return;
    }
    const filePath = uploadedFilePath(`memory/${access.scopeType}/${access.scopeId}`, file.file_name);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: "Arquivo não encontrado em disco" });
      return;
    }
    res.download(filePath, file.name);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/memory/:scopeType/:scopeId/files/:fileId — arquivamento
// lógico (nunca apaga o arquivo em disco na hora, nunca risca um anexo que
// outra entidade também referencia — este arquivo pertence só a esta
// memória, upload próprio, nunca reaproveita a linha de outro anexo).
router.delete("/:scopeType/:scopeId/files/:fileId", verifyToken, async (req, res, next) => {
  try {
    const access = await assertMemoryAccess(req, res, "edit");
    if (!access) return;

    const memory = await findMemory(access.scopeType, access.scopeId);
    const file = memory?.files.find((f) => f.id === req.params.fileId);
    if (!file) {
      res.status(404).json({ error: "Arquivo não encontrado" });
      return;
    }
    await archiveMemoryFile(file.id, req.user!.id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
