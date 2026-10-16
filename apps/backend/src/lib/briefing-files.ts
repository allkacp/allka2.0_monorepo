// Anexos das respostas do questionário de contratação: armazenamento seguro e validação do TIPO REAL do arquivo (não só da extensão).
// O arquivo fica em disco com nome aleatório; a API nunca expõe caminho interno. Quem enviou, quando e para qual pergunta fica em
// `task_briefing_files`. Extensão, conteúdo (assinatura binária) e tamanho são validados aqui, no servidor.
import fs from "fs";
import path from "path";
import { ensureUploadDir, generateStoredFileName, uploadedFilePath } from "./file-storage";
import { BLOCKED_ANSWER_EXTENSIONS, DEFAULT_ACCEPT, FILE_TYPES, type QuestionSettings } from "./catalog2-question-types";

export const BRIEFING_FILES_SUBPATH = "briefing-answers";
export const DEFAULT_MAX_BRIEFING_FILE_MB = 25;

export type DetectedKind = "image" | "video" | "audio" | "pdf" | "office" | "archive" | "text";
export class BriefingFileError extends Error {
  statusCode: number; code: string;
  constructor(message: string, code = "briefing_file_invalid", statusCode = 422) { super(message); this.code = code; this.statusCode = statusCode; }
}

const startsWith = (b: Buffer, sig: number[], at = 0) => b.length >= at + sig.length && sig.every((v, i) => b[at + i] === v);
const ascii = (b: Buffer, at: number, len: number) => b.subarray(at, at + len).toString("latin1");

/** Descobre o que o arquivo REALMENTE é pelo conteúdo. Devolve null se não for um tipo conhecido/seguro. */
export function detectKind(buf: Buffer): { kind: DetectedKind; mime: string } | null {
  if (buf.length < 4) return null;
  if (startsWith(buf, [0x25, 0x50, 0x44, 0x46])) return { kind: "pdf", mime: "application/pdf" };
  if (startsWith(buf, [0x89, 0x50, 0x4e, 0x47])) return { kind: "image", mime: "image/png" };
  if (startsWith(buf, [0xff, 0xd8, 0xff])) return { kind: "image", mime: "image/jpeg" };
  if (ascii(buf, 0, 4) === "GIF8") return { kind: "image", mime: "image/gif" };
  if (ascii(buf, 0, 4) === "RIFF" && ascii(buf, 8, 4) === "WEBP") return { kind: "image", mime: "image/webp" };
  if (ascii(buf, 0, 4) === "RIFF" && ascii(buf, 8, 4) === "WAVE") return { kind: "audio", mime: "audio/wav" };
  if (ascii(buf, 0, 3) === "ID3" || (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0)) return { kind: "audio", mime: "audio/mpeg" };
  if (ascii(buf, 0, 4) === "OggS") return { kind: "audio", mime: "audio/ogg" };
  if (ascii(buf, 4, 4) === "ftyp") {
    const brand = ascii(buf, 8, 4);
    return /^(M4A|M4B|F4A)/.test(brand) ? { kind: "audio", mime: "audio/mp4" } : { kind: "video", mime: brand.startsWith("qt") ? "video/quicktime" : "video/mp4" };
  }
  if (startsWith(buf, [0x1a, 0x45, 0xdf, 0xa3])) return { kind: "video", mime: "video/webm" };
  if (startsWith(buf, [0x50, 0x4b, 0x03, 0x04])) return { kind: "archive", mime: "application/zip" }; // zip, docx, xlsx, pptx, odt…
  if (startsWith(buf, [0xd0, 0xcf, 0x11, 0xe0])) return { kind: "office", mime: "application/x-ole-storage" }; // doc, xls, ppt antigos
  if (ascii(buf, 0, 4) === "Rar!") return { kind: "archive", mime: "application/vnd.rar" };
  // programas executáveis nunca passam (Windows/Linux/macOS e scripts com shebang)
  if (startsWith(buf, [0x4d, 0x5a]) || startsWith(buf, [0x7f, 0x45, 0x4c, 0x46]) || startsWith(buf, [0xcf, 0xfa, 0xed, 0xfe]) || startsWith(buf, [0x23, 0x21])) return null;
  // texto puro (txt/csv): sem bytes nulos e sem marcação ativa
  const head = buf.subarray(0, Math.min(buf.length, 8192));
  if (!head.includes(0)) {
    const t = head.toString("utf8").toLowerCase();
    if (/<\s*(script|html|iframe|svg|\?php)/.test(t)) return null;
    return { kind: "text", mime: "text/plain" };
  }
  return null;
}

const EXT_KINDS: Record<string, DetectedKind[]> = {
  ".pdf": ["pdf"], ".png": ["image"], ".jpg": ["image"], ".jpeg": ["image"], ".gif": ["image"], ".webp": ["image"],
  ".mp4": ["video"], ".mov": ["video"], ".webm": ["video"], ".mkv": ["video"],
  ".mp3": ["audio"], ".wav": ["audio"], ".m4a": ["audio"], ".ogg": ["audio"],
  ".docx": ["archive"], ".xlsx": ["archive"], ".pptx": ["archive"], ".odt": ["archive"], ".ods": ["archive"], ".zip": ["archive"], ".rar": ["archive"],
  ".doc": ["office"], ".xls": ["office"], ".ppt": ["office"],
  ".txt": ["text"], ".csv": ["text"],
};
const EXT_ALLOWED_MIME_NOTE = Object.keys(EXT_KINDS).join(", ");

export interface BriefingFileRules { allowed: boolean; accept: string[] | null; maxFiles: number | null; maxBytes: number }
/** Regras de anexo da pergunta (cada tipo de pergunta de arquivo tem sua lista padrão). */
export function fileRulesOf(question: { question_type?: string; type?: string; settings?: QuestionSettings; validation?: { max_files?: number; max_size_mb?: number } }): BriefingFileRules {
  const t = question.question_type ?? question.type ?? "";
  const att = question.settings?.attachments;
  const allowed = FILE_TYPES.includes(t) || !!att?.allowed;
  const accept = att?.accept?.length ? att.accept : DEFAULT_ACCEPT[t] ?? null;
  const maxMb = att?.max_size_mb ?? question.validation?.max_size_mb ?? DEFAULT_MAX_BRIEFING_FILE_MB;
  return { allowed, accept, maxFiles: att?.max_files ?? question.validation?.max_files ?? null, maxBytes: maxMb * 1024 * 1024 };
}

/** Valida extensão, tipo real e tamanho; grava em disco e devolve os dados a registrar. Lança BriefingFileError em português. */
export function checkAndStoreBriefingFile(originalName: string, buffer: Buffer, rules: BriefingFileRules): { storedName: string; name: string; kind: DetectedKind; mime: string; size: number } {
  const name = path.basename(originalName || "arquivo").trim().slice(0, 200) || "arquivo";
  const ext = path.extname(name).toLowerCase();
  if (!rules.allowed) throw new BriefingFileError("Esta pergunta não aceita anexos.", "briefing_file_not_allowed");
  if (buffer.length === 0) throw new BriefingFileError("O arquivo está vazio.");
  if (buffer.length > rules.maxBytes) throw new BriefingFileError(`O arquivo passa do tamanho máximo de ${Math.round(rules.maxBytes / 1024 / 1024)} MB.`, "briefing_file_too_big");
  if (!ext || BLOCKED_ANSWER_EXTENSIONS.has(ext)) throw new BriefingFileError(`Arquivos "${ext || "sem extensão"}" não são aceitos por segurança.`, "briefing_file_blocked");
  if (!EXT_KINDS[ext]) throw new BriefingFileError(`Tipo de arquivo "${ext}" não permitido. Aceitos: ${EXT_ALLOWED_MIME_NOTE}.`, "briefing_file_blocked");
  if (rules.accept && !rules.accept.includes(ext)) throw new BriefingFileError(`Esta pergunta só aceita: ${rules.accept.join(", ")}.`, "briefing_file_type_not_accepted");
  const real = detectKind(buffer);
  if (!real) throw new BriefingFileError("O conteúdo do arquivo não foi reconhecido como um tipo permitido.", "briefing_file_blocked");
  if (!EXT_KINDS[ext].includes(real.kind)) throw new BriefingFileError("O conteúdo do arquivo não corresponde à extensão informada.", "briefing_file_mismatch");
  const dir = ensureUploadDir(BRIEFING_FILES_SUBPATH);
  const storedName = generateStoredFileName(name);
  fs.writeFileSync(path.join(dir, storedName), buffer);
  return { storedName, name, kind: real.kind, mime: real.mime, size: buffer.length };
}

export const briefingFilePath = (storedName: string) => uploadedFilePath(BRIEFING_FILES_SUBPATH, path.basename(storedName));
