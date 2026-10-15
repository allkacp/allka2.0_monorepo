// Anexo OPCIONAL de cada item do "Resumo dos entregáveis" (modelo/exemplo do que será entregue: PDF, planilha, ZIP, RAR…).
// O arquivo fica em disco (mesma infraestrutura de file-storage); a versão do produto guarda só a referência
// ({ id, name, size, mime }) dentro do próprio item da lista, então reordenar, editar o texto ou criar nova versão
// mantém o anexo junto do item. Qualquer tipo é aceito, EXCETO conteúdo ativo/executável que o navegador poderia rodar.
import fs from "fs";
import path from "path";
import { ensureUploadDir, generateStoredFileName, uploadedFilePath } from "./file-storage";

export const DELIVERABLE_FILES_SUBPATH = "catalog2-deliverable-models";
export const MAX_DELIVERABLE_FILE_BYTES = 50 * 1024 * 1024; // 50 MB
export const BLOCKED_EXTENSIONS = new Set([
  ".exe", ".msi", ".bat", ".cmd", ".com", ".scr", ".pif", ".vbs", ".vbe", ".js", ".jse", ".wsf", ".ps1", ".sh", ".jar",
  ".html", ".htm", ".xhtml", ".svg", ".hta", ".dll", ".apk",
]);

export interface DeliverableFileRef { id: string; name: string; size: number; mime: string }

const STORED_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(\.[A-Za-z0-9]{1,20})?$/i;
export const isStoredId = (v: unknown): v is string => typeof v === "string" && STORED_ID.test(v);

/** Valida e normaliza a referência vinda da API; devolve null se não for uma referência válida. */
export function normalizeFileRef(raw: unknown): DeliverableFileRef | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!isStoredId(r.id)) return null;
  const name = String(r.name ?? "").trim().slice(0, 200);
  if (!name) return null;
  const size = Number(r.size);
  return { id: r.id, name, size: Number.isFinite(size) && size >= 0 ? Math.round(size) : 0, mime: String(r.mime ?? "application/octet-stream").slice(0, 100) };
}

export function storedFileExists(id: string): boolean {
  return isStoredId(id) && fs.existsSync(uploadedFilePath(DELIVERABLE_FILES_SUBPATH, id));
}

/** Grava o arquivo enviado e devolve a referência. Lança Error com mensagem em português se o tipo for bloqueado. */
export function storeDeliverableFile(originalName: string, buffer: Buffer, mime: string): DeliverableFileRef {
  const name = path.basename(originalName || "arquivo").trim().slice(0, 200) || "arquivo";
  const ext = path.extname(name).toLowerCase();
  if (BLOCKED_EXTENSIONS.has(ext)) throw new Error(`Arquivos "${ext}" não são aceitos por segurança. Envie PDF, imagem, planilha, documento ou compactado (ZIP, RAR…).`);
  if (buffer.length === 0) throw new Error("O arquivo está vazio.");
  const dir = ensureUploadDir(DELIVERABLE_FILES_SUBPATH);
  const id = generateStoredFileName(name);
  fs.writeFileSync(path.join(dir, id), buffer);
  return { id, name, size: buffer.length, mime: (mime || "application/octet-stream").slice(0, 100) };
}
