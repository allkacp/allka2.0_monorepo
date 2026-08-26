/**
 * alert-image-storage.ts — validação e cópia de imagens de Alertas (ata
 * 2026-08, 4º lote). Reaproveita a infraestrutura de disco já existente
 * (`file-storage.ts`, mesma usada pelos anexos de projeto) — não cria um
 * segundo sistema de arquivos.
 *
 * Validação por conteúdo real (assinatura de bytes / "magic bytes"), nunca
 * só extensão ou `Content-Type` do multipart — um `.png` renomeado de um
 * `.exe` é rejeitado aqui mesmo que o cliente minta o cabeçalho.
 */
import fs from "fs";
import path from "path";
import { ensureUploadDir, generateStoredFileName, uploadedFilePath, deleteUploadedFile } from "./file-storage";

export const ALERT_IMAGES_SUBPATH = "alert-images";
export const MAX_ALERT_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

// Conjunto fechado — SVG de propósito fora (pode carregar script; este
// pipeline não sanitiza XML) e nenhum outro formato executável/ativo.
const SIGNATURES: { mime: string; ext: string; check: (buf: Buffer) => boolean }[] = [
  { mime: "image/jpeg", ext: ".jpg", check: (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    mime: "image/png",
    ext: ".png",
    check: (b) => b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a,
  },
  {
    mime: "image/webp",
    ext: ".webp",
    check: (b) => b.length > 11 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP",
  },
];

export interface ValidatedImage {
  mime: string;
  ext: string;
}

/** Confirma o formato real pelos bytes — devolve null se não for nenhum dos aceitos. */
export function detectImageFormat(buffer: Buffer): ValidatedImage | null {
  const match = SIGNATURES.find((s) => s.check(buffer));
  return match ? { mime: match.mime, ext: match.ext } : null;
}

/**
 * Grava um buffer já validado como uma nova imagem de alerta, com nome
 * físico aleatório (nunca o nome enviado pelo usuário, nunca um caminho
 * vindo do cliente).
 */
export function storeAlertImageBuffer(buffer: Buffer, ext: string): string {
  ensureUploadDir(ALERT_IMAGES_SUBPATH);
  const fileName = generateStoredFileName(`file${ext}`);
  fs.writeFileSync(uploadedFilePath(ALERT_IMAGES_SUBPATH, fileName), buffer);
  return fileName;
}

/**
 * Copia fisicamente uma imagem já armazenada pra um arquivo novo — usado
 * quando uma Ocorrência nasce de um Padrão/Programação com imagem: a
 * Ocorrência precisa do PRÓPRIO arquivo, nunca uma referência viva ao
 * Padrão (ver comentário em AlertStandard.image_file_name no schema).
 */
export function snapshotAlertImage(sourceFileName: string): string | null {
  const sourcePath = uploadedFilePath(ALERT_IMAGES_SUBPATH, sourceFileName);
  if (!fs.existsSync(sourcePath)) return null;
  ensureUploadDir(ALERT_IMAGES_SUBPATH);
  const ext = path.extname(sourceFileName);
  const newFileName = generateStoredFileName(`file${ext}`);
  fs.copyFileSync(sourcePath, uploadedFilePath(ALERT_IMAGES_SUBPATH, newFileName));
  return newFileName;
}

export function deleteAlertImage(fileName: string): void {
  deleteUploadedFile(ALERT_IMAGES_SUBPATH, fileName);
}

export function alertImagePath(fileName: string): string {
  return uploadedFilePath(ALERT_IMAGES_SUBPATH, fileName);
}
