// Storage de arquivo em disco local (uploads/ na raiz do backend) — usado
// pelos documentos de projeto e pelas bases de conhecimento da IA. Ainda não
// há bucket externo (S3 etc.) configurado; por ora os binários ficam no
// próprio VPS, num volume que precisa sobreviver a deploys (ver docker
// compose de produção antes de ir pra produção de verdade com isso).
import fs from "fs";
import path from "path";
import crypto from "crypto";

const UPLOADS_ROOT = path.join(__dirname, "../../uploads");

/** Garante que a subpasta existe e devolve o caminho absoluto dela. */
export function ensureUploadDir(subpath: string): string {
  const dir = path.join(UPLOADS_ROOT, subpath);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/** Nome de arquivo gerado (evita colisão e path traversal do nome original). */
export function generateStoredFileName(originalName: string): string {
  const ext = path.extname(originalName).slice(0, 20);
  return `${crypto.randomUUID()}${ext}`;
}

export function uploadedFilePath(subpath: string, fileName: string): string {
  return path.join(UPLOADS_ROOT, subpath, fileName);
}

export function deleteUploadedFile(subpath: string, fileName: string): void {
  const filePath = uploadedFilePath(subpath, fileName);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}
