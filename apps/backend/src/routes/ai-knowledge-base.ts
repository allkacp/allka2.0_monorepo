import { Router } from "express";
import fs from "fs";
import multer from "multer";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { verifyToken, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { ensureUploadDir, generateStoredFileName, uploadedFilePath, deleteUploadedFile } from "../lib/file-storage";

const router = Router();

// Base de Conhecimento da IA (admin > Configurações) — CRUD de categorias
// ("bancos" de documentos, um por finalidade de IA: briefing/PLAC, produtos,
// nômades/agências...) e dos documentos dentro delas. Só admin gerencia;
// o conteúdo é lido pelos fluxos de IA em lib/ai-consultor.ts via
// getCategoryKnowledgeText() (lib/ai-knowledge-base.ts).
router.use(verifyToken, requireRole("admin"));

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, _file, cb) => {
      cb(null, ensureUploadDir(`knowledge-base/${req.params.key}`));
    },
    filename: (_req, file, cb) => cb(null, generateStoredFileName(file.originalname)),
  }),
  limits: { fileSize: 30 * 1024 * 1024 },
});

// GET /api/ai-knowledge-base/categories
router.get("/categories", async (_req, res, next) => {
  try {
    const categories = await prisma.aIKnowledgeCategory.findMany({
      orderBy: { created_at: "asc" },
      include: { _count: { select: { documents: true } } },
    });
    res.json({
      categories: categories.map((c) => ({
        id: c.id,
        key: c.key,
        name: c.name,
        description: c.description,
        document_count: c._count.documents,
        created_at: c.created_at,
      })),
    });
  } catch (err) {
    next(err);
  }
});

const createCategorySchema = z.object({
  key: z
    .string()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9_]+$/, "Use apenas letras minúsculas, números e underscore"),
  name: z.string().min(2).max(120),
  description: z.string().max(2000).optional(),
});

// POST /api/ai-knowledge-base/categories — cria um novo "banco" de documentos
router.post("/categories", validate(createCategorySchema), async (req, res, next) => {
  try {
    const { key, name, description } = req.body as z.infer<typeof createCategorySchema>;
    const existing = await prisma.aIKnowledgeCategory.findUnique({ where: { key } });
    if (existing) {
      res.status(409).json({ error: "Já existe uma categoria com essa chave" });
      return;
    }
    const category = await prisma.aIKnowledgeCategory.create({
      data: { key, name, description },
    });
    res.status(201).json(category);
  } catch (err) {
    next(err);
  }
});

// GET /api/ai-knowledge-base/categories/:key/documents
router.get("/categories/:key/documents", async (req, res, next) => {
  try {
    const category = await prisma.aIKnowledgeCategory.findUnique({
      where: { key: req.params.key as string },
    });
    if (!category) {
      res.status(404).json({ error: "Categoria não encontrada" });
      return;
    }
    const documents = await prisma.aIKnowledgeDocument.findMany({
      where: { category_id: category.id },
      orderBy: { created_at: "desc" },
    });
    res.json({ documents });
  } catch (err) {
    next(err);
  }
});

// POST /api/ai-knowledge-base/categories/:key/documents — upload de 1 arquivo
router.post("/categories/:key/documents", async (req, res, next) => {
  try {
    const category = await prisma.aIKnowledgeCategory.findUnique({
      where: { key: req.params.key as string },
    });
    if (!category) {
      res.status(404).json({ error: "Categoria não encontrada" });
      return;
    }
    next();
  } catch (err) {
    next(err);
  }
}, upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "Nenhum arquivo enviado" });
      return;
    }
    const category = await prisma.aIKnowledgeCategory.findUnique({
      where: { key: req.params.key as string },
    });
    const document = await prisma.aIKnowledgeDocument.create({
      data: {
        category_id: category!.id,
        name: req.file.originalname,
        file_name: req.file.filename,
        mime_type: req.file.mimetype,
        size: req.file.size,
        uploaded_by: req.user?.email ?? null,
      },
    });
    res.status(201).json(document);
  } catch (err) {
    next(err);
  }
});

// GET /api/ai-knowledge-base/documents/:id/download
router.get("/documents/:id/download", async (req, res, next) => {
  try {
    const document = await prisma.aIKnowledgeDocument.findUnique({
      where: { id: req.params.id as string },
      include: { category: true },
    });
    if (!document) {
      res.status(404).json({ error: "Documento não encontrado" });
      return;
    }
    const filePath = uploadedFilePath(`knowledge-base/${document.category.key}`, document.file_name);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: "Arquivo não encontrado em disco" });
      return;
    }
    res.download(filePath, document.name);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/ai-knowledge-base/documents/:id
router.delete("/documents/:id", async (req, res, next) => {
  try {
    const document = await prisma.aIKnowledgeDocument.findUnique({
      where: { id: req.params.id as string },
      include: { category: true },
    });
    if (!document) {
      res.status(404).json({ error: "Documento não encontrado" });
      return;
    }
    await prisma.aIKnowledgeDocument.delete({ where: { id: document.id } });
    deleteUploadedFile(`knowledge-base/${document.category.key}`, document.file_name);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
