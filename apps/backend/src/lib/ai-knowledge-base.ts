// Bases de conhecimento administráveis que alimentam diferentes fluxos de IA
// (Gemini) — uma categoria por finalidade (briefing/PLAC, produtos, etc.),
// gerenciadas pelo admin em Configurações > Base de Conhecimento IA (ver
// routes/ai-knowledge-base.ts). Os arquivos ficam em disco local, em
// uploads/knowledge-base/<category_key>/ — só o metadado (nome, categoria,
// quem subiu) fica no banco (AIKnowledgeCategory/AIKnowledgeDocument).
//
// A categoria "briefing" existia antes como uma pasta fixa (instrucoesAI/ na
// raiz do monorepo) editada manualmente no disco. Na primeira subida do
// servidor depois desta mudança, ensureDefaultKnowledgeCategories() copia o
// que já estava lá pra dentro do sistema novo — não perde o que já estava
// configurado, e dali em diante tudo passa a ser gerenciado pela tela.
//
// Cache em memória por categoria, invalidado por um fingerprint (id+tamanho
// de cada documento) — se um documento for adicionado/removido, a próxima
// chamada já usa o conteúdo novo, sem precisar reiniciar o backend.
import fs from "fs";
import path from "path";
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import { prisma } from "./prisma";
import { ensureUploadDir, generateStoredFileName, uploadedFilePath } from "./file-storage";

const LEGACY_KNOWLEDGE_BASE_DIR = path.join(__dirname, "../../../../instrucoesAI");
const LEGACY_SUPPORTED_EXTENSIONS = new Set([".pdf", ".txt", ".md"]);
const KB_SUBPATH = (categoryKey: string) => `knowledge-base/${categoryKey}`;

export const DEFAULT_CATEGORIES: { key: string; name: string; description: string }[] = [
  {
    key: "briefing",
    name: "Briefing (Consultor PLAC)",
    description:
      "Base do Consultor IA usado no preenchimento/melhoria de respostas do briefing de tarefas — metodologia PLAC e materiais de referência.",
  },
  {
    key: "produtos",
    name: "Catálogo de Produtos",
    description:
      "Referências usadas pela IA ao escrever/melhorar campos do cadastro de produtos (copy de venda, descrições).",
  },
  {
    key: "nomades_agencias",
    name: "Respostas a Nômades e Agências",
    description:
      "Reservado para um futuro assistente de IA que responda dúvidas de nômades e agências — ainda sem fluxo de IA consumindo esta categoria.",
  },
  {
    key: "desenvolvedores",
    name: "Glossário para Desenvolvedores",
    description:
      "Vocabulário técnico, nomes de telas/funcionalidades e convenções de como o time prefere que bugs/ideias sejam descritos — usado pela IA que melhora os textos do formulário \"Ajuda e sugestões\" antes de virar chamado.",
  },
];

/** Exportado pro bloco 3/4 (IA de lançamento) reaproveitar a mesma extração
 * de texto de anexo (PDF/DOCX/TXT/MD) — nunca duplicar pdf-parse/mammoth. */
export async function extractFileText(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".pdf") {
    const buf = fs.readFileSync(filePath);
    const parser = new PDFParse({ data: buf });
    try {
      const result = await parser.getText();
      return result.text;
    } finally {
      await parser.destroy();
    }
  }
  if (ext === ".docx") {
    const buf = fs.readFileSync(filePath);
    const result = await mammoth.extractRawText({ buffer: buf });
    return result.value;
  }
  if (ext === ".txt" || ext === ".md") {
    return fs.readFileSync(filePath, "utf-8");
  }
  // Imagens e outros formatos binários: sem extração de texto — o arquivo
  // fica disponível pra download/visualização, mas não entra no contexto de
  // texto enviado pro Gemini.
  return "";
}

/** Cria as categorias padrão (idempotente) e, na primeira vez, migra os
 * arquivos que já existiam em instrucoesAI/ pra dentro da categoria
 * "briefing" — chamado uma vez na subida do servidor (ver index.ts). */
export async function ensureDefaultKnowledgeCategories(): Promise<void> {
  for (const def of DEFAULT_CATEGORIES) {
    await prisma.aIKnowledgeCategory.upsert({
      where: { key: def.key },
      update: {},
      create: def,
    });
  }

  const briefingCategory = await prisma.aIKnowledgeCategory.findUnique({
    where: { key: "briefing" },
    include: { _count: { select: { documents: true } } },
  });
  if (!briefingCategory || briefingCategory._count.documents > 0) return;
  if (!fs.existsSync(LEGACY_KNOWLEDGE_BASE_DIR)) return;

  const legacyFiles = fs
    .readdirSync(LEGACY_KNOWLEDGE_BASE_DIR)
    .filter((name) => LEGACY_SUPPORTED_EXTENSIONS.has(path.extname(name).toLowerCase()));
  if (legacyFiles.length === 0) return;

  const destDir = ensureUploadDir(KB_SUBPATH("briefing"));
  for (const name of legacyFiles) {
    try {
      const storedName = generateStoredFileName(name);
      fs.copyFileSync(path.join(LEGACY_KNOWLEDGE_BASE_DIR, name), path.join(destDir, storedName));
      const stat = fs.statSync(path.join(LEGACY_KNOWLEDGE_BASE_DIR, name));
      await prisma.aIKnowledgeDocument.create({
        data: {
          category_id: briefingCategory.id,
          name,
          file_name: storedName,
          mime_type: path.extname(name) === ".pdf" ? "application/pdf" : "text/plain",
          size: stat.size,
          uploaded_by: "Migração automática (instrucoesAI/)",
        },
      });
    } catch (err) {
      console.error(`[ai-knowledge-base] Falha ao migrar "${name}" de instrucoesAI/:`, err);
    }
  }
  console.log(`[ai-knowledge-base] Migrados ${legacyFiles.length} documento(s) de instrucoesAI/ para a categoria "briefing".`);
}

interface CacheEntry {
  fingerprint: string;
  text: string;
}
const textCache = new Map<string, CacheEntry>();

/** Texto combinado de todos os documentos de uma categoria (extraído de
 * PDF/DOCX/TXT/MD), com cache automático por fingerprint dos documentos. */
export async function getCategoryKnowledgeText(categoryKey: string): Promise<string> {
  const category = await prisma.aIKnowledgeCategory.findUnique({
    where: { key: categoryKey },
    include: { documents: { orderBy: { created_at: "asc" } } },
  });
  if (!category || category.documents.length === 0) return "";

  const fingerprint = category.documents.map((d) => `${d.id}:${d.size ?? 0}`).join("|");
  const cached = textCache.get(categoryKey);
  if (cached && cached.fingerprint === fingerprint) return cached.text;

  const sections: string[] = [];
  for (const doc of category.documents) {
    try {
      const filePath = uploadedFilePath(KB_SUBPATH(categoryKey), doc.file_name);
      if (!fs.existsSync(filePath)) continue;
      const text = await extractFileText(filePath);
      if (text.trim()) sections.push(`### Documento: ${doc.name}\n${text.trim()}`);
    } catch (err) {
      console.error(`[ai-knowledge-base] Falha ao ler "${doc.name}" (categoria ${categoryKey}):`, err);
    }
  }

  const combined = sections.join("\n\n---\n\n");
  textCache.set(categoryKey, { fingerprint, text: combined });
  return combined;
}

/** Texto combinado dos documentos de CONTEXTO de um projeto específico (aba
 * "Documentos" do projeto — ProjectAttachment), pra alimentar a IA quando a
 * agência optar por usá-los ao preencher o briefing de uma tarefa (ver
 * fillBriefingWithAI em ai-consultor.ts). Sem cache: é lido sob demanda,
 * pouco frequente, e a agência espera o conteúdo mais atual do projeto. */
export async function getProjectDocumentsText(projectId: string): Promise<string> {
  const documents = await prisma.projectAttachment.findMany({
    where: { project_id: projectId },
    orderBy: { created_at: "asc" },
  });
  if (documents.length === 0) return "";

  const sections: string[] = [];
  for (const doc of documents) {
    try {
      const filePath = uploadedFilePath(`project-documents/${projectId}`, doc.file_name);
      if (!fs.existsSync(filePath)) continue;
      const text = await extractFileText(filePath);
      if (text.trim()) sections.push(`### Documento: ${doc.name}\n${text.trim()}`);
    } catch (err) {
      console.error(`[ai-knowledge-base] Falha ao ler documento de projeto "${doc.name}":`, err);
    }
  }
  return sections.join("\n\n---\n\n");
}
