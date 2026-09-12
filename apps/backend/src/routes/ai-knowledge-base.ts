import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import fs from "fs";
import path from "path";
import multer from "multer";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { verifyToken, requireRole, evaluateAdminMasterAccess } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { ensureUploadDir, generateStoredFileName, uploadedFilePath, deleteUploadedFile } from "../lib/file-storage";
import { extractFileText, SUPPORTED_KB_EXTENSIONS } from "../lib/ai-knowledge-base";

const router = Router();

// Base de Conhecimento da IA (admin > Configurações) — CRUD de categorias
// ("bancos" de documentos, um por finalidade de IA: briefing/PLAC, produtos,
// 4 Fs, processos, políticas...) e dos documentos dentro delas (reunião
// 10/09, "organização da base de conhecimento administrativa da IAllka").
// Leitura: qualquer admin autenticado. Escrita (criar categoria, subir/
// ativar/desativar/substituir/apagar documento): só Admin Master — mesma
// regra oficial (evaluateAdminMasterAccess) usada em outros módulos
// restritos, nunca reformulada aqui.
router.use(verifyToken, requireRole("admin"));

async function guardAdminMaster(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { admin_profile: { select: { is_master: true, is_active: true, permissions: { select: { module: true, action: true } } } } },
    });
    if (!evaluateAdminMasterAccess(req.user.account_type, user?.admin_profile ?? null)) {
      // Recusado ANTES do multer rodar — se o corpo for multipart (upload),
      // ninguém o consome; descarta explicitamente pra nunca deixar bytes
      // não lidos numa conexão keep-alive que seria reaproveitada pela
      // PRÓXIMA requisição (corromperia o parsing multipart dela).
      req.resume();
      res.status(403).json({ error: "Somente o Admin Master pode gerenciar a base de conhecimento." });
      return;
    }
    next();
  } catch (err) {
    next(err);
  }
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, _file, cb) => {
      cb(null, ensureUploadDir(`knowledge-base/${req.params.key}`));
    },
    filename: (_req, file, cb) => cb(null, generateStoredFileName(file.originalname)),
  }),
  limits: { fileSize: 30 * 1024 * 1024 },
});

// Upload de substituição usa a categoria do documento ORIGINAL (resolvida
// numa etapa anterior, guardada em res.locals) — nunca um :key de rota.
const uploadReplace = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, ensureUploadDir("knowledge-base/_replace_tmp")),
    filename: (_req, file, cb) => cb(null, generateStoredFileName(file.originalname)),
  }),
  limits: { fileSize: 30 * 1024 * 1024 },
});

const DOCUMENT_SELECT = {
  id: true,
  category_id: true,
  name: true,
  file_name: true,
  mime_type: true,
  size: true,
  uploaded_by: true,
  is_active: true,
  version: true,
  replaces_document_id: true,
  created_at: true,
  updated_at: true,
  replaced_by: { select: { id: true, name: true, version: true } },
} as const;

// Correção ("preservação do histórico da Base de Conhecimento"): uma cadeia
// de versões é a lista de documentos ligados por replaces_document_id, do
// primeiro (sem predecessor) até o mais recente. Anda pra trás até achar a
// raiz e depois pra frente coletando cada sucessor — funciona a partir de
// QUALQUER membro da cadeia, não só do mais novo.
async function getVersionChainIds(documentId: string): Promise<string[]> {
  let rootId = documentId;
  for (;;) {
    const doc = await prisma.aIKnowledgeDocument.findUnique({
      where: { id: rootId },
      select: { replaces_document_id: true },
    });
    if (!doc?.replaces_document_id) break;
    rootId = doc.replaces_document_id;
  }
  const ids = [rootId];
  let currentId = rootId;
  for (;;) {
    const next = await prisma.aIKnowledgeDocument.findFirst({
      where: { replaces_document_id: currentId },
      select: { id: true },
    });
    if (!next) break;
    ids.push(next.id);
    currentId = next.id;
  }
  return ids;
}

// GET /api/ai-knowledge-base/categories
router.get("/categories", async (_req, res, next) => {
  try {
    const categories = await prisma.aIKnowledgeCategory.findMany({
      orderBy: { created_at: "asc" },
      include: { _count: { select: { documents: { where: { is_active: true } } } } },
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
router.post("/categories", guardAdminMaster, validate(createCategorySchema), async (req, res, next) => {
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

// GET /api/ai-knowledge-base/categories/:key/documents — inclui inativos
// (marcados no payload), pra tela mostrar o histórico de versões.
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
      select: DOCUMENT_SELECT,
    });
    res.json({ documents });
  } catch (err) {
    next(err);
  }
});

function rejectUnsupportedExtension(originalName: string, res: Response): boolean {
  const ext = path.extname(originalName).toLowerCase();
  if (!SUPPORTED_KB_EXTENSIONS.has(ext)) {
    res.status(422).json({
      error: `Formato "${ext || "desconhecido"}" não suportado. Envie PDF, DOCX, TXT ou MD.`,
    });
    return true;
  }
  return false;
}

/** Extrai o texto do arquivo recém-salvo; se vier vazio (arquivo inválido,
 * corrompido, ou sem texto extraível), apaga o arquivo do disco e devolve
 * null — quem chama NUNCA deve gravar um AIKnowledgeDocument nesse caso. */
async function extractOrReject(filePath: string, res: Response): Promise<string | null> {
  let text: string;
  try {
    text = await extractFileText(filePath);
  } catch {
    text = "";
  }
  if (!text.trim()) {
    fs.rmSync(filePath, { force: true });
    res.status(422).json({ error: "Não foi possível extrair texto deste arquivo (vazio ou inválido). Nenhum documento foi salvo." });
    return null;
  }
  return text;
}

// POST /api/ai-knowledge-base/categories/:key/documents — upload de 1 arquivo
router.post("/categories/:key/documents", guardAdminMaster, async (req, res, next) => {
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
    if (rejectUnsupportedExtension(req.file.originalname, res)) {
      fs.rmSync(req.file.path, { force: true });
      return;
    }
    if ((await extractOrReject(req.file.path, res)) === null) return;

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
      select: DOCUMENT_SELECT,
    });
    res.status(201).json(document);
  } catch (err) {
    next(err);
  }
});

// POST /api/ai-knowledge-base/documents/:id/activate — ativa esta versão e
// desativa QUALQUER outra versão ativa da mesma cadeia (nunca duas
// vigentes ao mesmo tempo). As duas escritas (desativar as outras, ativar
// esta) ficam na MESMA transação — concorrência (duas ativações na mesma
// cadeia ao mesmo tempo) serializa pelas travas de linha do próprio UPDATE,
// nunca resultando em duas ativas.
router.post("/documents/:id/activate", guardAdminMaster, async (req, res, next) => {
  try {
    const document = await prisma.aIKnowledgeDocument.findUnique({ where: { id: req.params.id as string } });
    if (!document) {
      res.status(404).json({ error: "Documento não encontrado" });
      return;
    }
    const chainIds = await getVersionChainIds(document.id);
    const [, updated] = await prisma.$transaction([
      prisma.aIKnowledgeDocument.updateMany({
        where: { id: { in: chainIds.filter((id) => id !== document.id) } },
        data: { is_active: false },
      }),
      prisma.aIKnowledgeDocument.update({
        where: { id: document.id },
        data: { is_active: true },
        select: DOCUMENT_SELECT,
      }),
    ]);
    res.json(updated);
  } catch (err) {
    // Duas ativações concorrentes na MESMA cadeia disputam as mesmas
    // linhas — o MySQL detecta e aborta uma delas (deadlock/write
    // conflict, P2034). Nunca deixa duas versões ativas: quem perdeu só
    // precisa tentar de novo (a invariante "uma só ativa" nunca quebra).
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2034") {
      res.status(409).json({ error: "Outra ativação/substituição desta cadeia está em andamento. Tente de novo." });
      return;
    }
    next(err);
  }
});

// POST /api/ai-knowledge-base/documents/:id/deactivate — documento inativo
// nunca mais alimenta nenhum fluxo de IA (getCategoryKnowledgeSections já
// filtra por is_active), mas continua visível no histórico.
router.post("/documents/:id/deactivate", guardAdminMaster, async (req, res, next) => {
  try {
    const document = await prisma.aIKnowledgeDocument.findUnique({ where: { id: req.params.id as string } });
    if (!document) {
      res.status(404).json({ error: "Documento não encontrado" });
      return;
    }
    const updated = await prisma.aIKnowledgeDocument.update({
      where: { id: document.id },
      data: { is_active: false },
      select: DOCUMENT_SELECT,
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// POST /api/ai-knowledge-base/documents/:id/replace — sobe uma nova versão
// do documento :id. O documento ANTIGO nunca é apagado nem sobrescrito: ele
// vira is_active=false e a linha nova aponta pra ele via
// replaces_document_id (histórico preservado; só uma versão ativa por vez
// dentro da cadeia). Só a versão VIGENTE (is_active=true) pode ser
// substituída — evita duas substituições concorrentes criarem duas
// versões ativas na mesma cadeia (uma a partir de v1, outra a partir de
// v2). Duas substituições concorrentes da MESMA versão ainda são possíveis
// de tentar; a segunda esbarra na constraint única de
// replaces_document_id e recebe 409 (ver catch abaixo).
router.post(
  "/documents/:id/replace",
  guardAdminMaster,
  async (req, res, next) => {
    try {
      const oldDoc = await prisma.aIKnowledgeDocument.findUnique({
        where: { id: req.params.id as string },
        include: { category: true },
      });
      if (!oldDoc) {
        res.status(404).json({ error: "Documento não encontrado" });
        return;
      }
      if (!oldDoc.is_active) {
        req.resume();
        res.status(409).json({ error: "Este documento não é mais a versão vigente — substitua a versão ativa da cadeia." });
        return;
      }
      res.locals.oldDoc = oldDoc;
      next();
    } catch (err) {
      next(err);
    }
  },
  uploadReplace.single("file"),
  async (req, res, next) => {
    let destPath: string | undefined;
    try {
      const oldDoc = res.locals.oldDoc as { id: string; category_id: string; category: { key: string }; version: number };
      if (!req.file) {
        res.status(400).json({ error: "Nenhum arquivo enviado" });
        return;
      }
      if (rejectUnsupportedExtension(req.file.originalname, res)) {
        fs.rmSync(req.file.path, { force: true });
        return;
      }
      if ((await extractOrReject(req.file.path, res)) === null) return;

      // Move do diretório temporário pra dentro da categoria do original.
      const destDir = ensureUploadDir(`knowledge-base/${oldDoc.category.key}`);
      destPath = path.join(destDir, req.file.filename);
      fs.renameSync(req.file.path, destPath);

      const [newDoc] = await prisma.$transaction([
        prisma.aIKnowledgeDocument.create({
          data: {
            category_id: oldDoc.category_id,
            name: req.file.originalname,
            file_name: req.file.filename,
            mime_type: req.file.mimetype,
            size: req.file.size,
            uploaded_by: req.user?.email ?? null,
            version: oldDoc.version + 1,
            replaces_document_id: oldDoc.id,
          },
          select: DOCUMENT_SELECT,
        }),
        prisma.aIKnowledgeDocument.update({
          where: { id: oldDoc.id },
          data: { is_active: false },
        }),
      ]);
      res.status(201).json(newDoc);
    } catch (err) {
      // Corrida: outra substituição do MESMO documento já ganhou a
      // constraint única de replaces_document_id entre a checagem acima e
      // esta escrita — nunca deixa a cadeia com duas versões ativas.
      if (err instanceof Prisma.PrismaClientKnownRequestError && (err.code === "P2002" || err.code === "P2034")) {
        if (destPath) fs.rmSync(destPath, { force: true });
        else if (req.file) fs.rmSync(req.file.path, { force: true });
        res.status(409).json({ error: "Este documento já foi substituído por outra pessoa nesse meio-tempo. Recarregue e tente de novo." });
        return;
      }
      next(err);
    }
  },
);

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

// DELETE /api/ai-knowledge-base/documents/:id — correção ("preservação do
// histórico"): um documento que faça parte de uma cadeia de versões
// (substituiu outro OU foi substituído por outro) NUNCA pode ser apagado
// fisicamente — nem a versão antiga, nem a vigente. A única ação
// disponível pra esses é Desativar (POST .../deactivate), que preserva
// conteúdo, versão, datas e a relação de substituição. Excluir só é
// permitido pra um documento SEM histórico nenhum (nunca substituiu, nunca
// foi substituído) — remover esse nunca quebra nenhuma referência, porque
// nenhuma outra linha aponta pra ele.
router.delete("/documents/:id", guardAdminMaster, async (req, res, next) => {
  try {
    const document = await prisma.aIKnowledgeDocument.findUnique({
      where: { id: req.params.id as string },
      include: { category: true, replaced_by: { select: { id: true } } },
    });
    if (!document) {
      res.status(404).json({ error: "Documento não encontrado" });
      return;
    }
    const belongsToVersionChain = !!document.replaces_document_id || !!document.replaced_by;
    if (belongsToVersionChain) {
      res.status(409).json({
        error: "Este documento faz parte de um histórico de versões e não pode ser excluído. Use Desativar para preservar o histórico.",
      });
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
