// Base de conhecimento do "Consultor IA" — lê os arquivos (PDF/txt/md) da
// pasta instrucoesAI/ (raiz do monorepo) e devolve o texto combinado pra ser
// usado como contexto nas chamadas ao Gemini (ver ai-consultor.ts).
//
// Fica em cache em memória, invalidado automaticamente quando o "fingerprint"
// da pasta muda (nome+tamanho+data de cada arquivo) — se o usuário adicionar,
// remover ou substituir um arquivo ali, a próxima chamada já usa o conteúdo
// novo, sem precisar reiniciar o backend. Isso é o que sustenta o pedido de
// "se eu mudar os arquivos dentro, precisa atualizar as ideias do consultor".
//
// Pasta hoje é editada manualmente pelo usuário no disco; um painel na
// plataforma pra upload/remoção (mencionado como próximo passo) pode escrever
// nesta MESMA pasta sem precisar mudar nada aqui.
import fs from "fs";
import path from "path";
import { PDFParse } from "pdf-parse";

const KNOWLEDGE_BASE_DIR = path.join(__dirname, "../../../../instrucoesAI");
const SUPPORTED_EXTENSIONS = new Set([".pdf", ".txt", ".md"]);

interface CacheEntry {
  fingerprint: string;
  text: string;
}

let cache: CacheEntry | null = null;

function computeFingerprint(files: { name: string; mtimeMs: number; size: number }[]): string {
  return files
    .map((f) => `${f.name}:${f.mtimeMs}:${f.size}`)
    .sort()
    .join("|");
}

async function extractFileText(filePath: string): Promise<string> {
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
  return fs.readFileSync(filePath, "utf-8");
}

/** Lê a pasta instrucoesAI/ e devolve o texto combinado de todos os arquivos
 * suportados, com cache automático por fingerprint da pasta. */
export async function getKnowledgeBaseText(): Promise<string> {
  if (!fs.existsSync(KNOWLEDGE_BASE_DIR)) {
    return "";
  }

  const entries = fs
    .readdirSync(KNOWLEDGE_BASE_DIR)
    .filter((name) => SUPPORTED_EXTENSIONS.has(path.extname(name).toLowerCase()));

  const stats = entries.map((name) => {
    const s = fs.statSync(path.join(KNOWLEDGE_BASE_DIR, name));
    return { name, mtimeMs: s.mtimeMs, size: s.size };
  });
  const fingerprint = computeFingerprint(stats);

  if (cache && cache.fingerprint === fingerprint) {
    return cache.text;
  }

  const sections: string[] = [];
  for (const name of entries) {
    try {
      const text = await extractFileText(path.join(KNOWLEDGE_BASE_DIR, name));
      sections.push(`### Documento: ${name}\n${text.trim()}`);
    } catch (err) {
      console.error(`[ai-knowledge-base] Falha ao ler "${name}":`, err);
    }
  }

  const combined = sections.join("\n\n---\n\n");
  cache = { fingerprint, text: combined };
  return combined;
}

/** Lista os arquivos hoje na pasta (nome + tamanho) — usado pelo futuro
 * painel de gestão da base de conhecimento na plataforma. */
export function listKnowledgeBaseFiles(): { name: string; size: number; updated_at: string }[] {
  if (!fs.existsSync(KNOWLEDGE_BASE_DIR)) return [];
  return fs
    .readdirSync(KNOWLEDGE_BASE_DIR)
    .filter((name) => SUPPORTED_EXTENSIONS.has(path.extname(name).toLowerCase()))
    .map((name) => {
      const s = fs.statSync(path.join(KNOWLEDGE_BASE_DIR, name));
      return { name, size: s.size, updated_at: s.mtime.toISOString() };
    });
}
