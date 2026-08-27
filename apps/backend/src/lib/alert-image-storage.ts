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

// ── Dimensões reais do banner (ata 2026-08, reparo "banner visual") ───────
//
// Formato obrigatório pra banner NOVO: exatamente 1200×400 (3:1). Lido do
// CONTEÚDO decodificado (cabeçalho estrutural do próprio formato), nunca de
// metadado que o cliente poderia inventar.
//
// Deliberadamente NÃO usa a lib `image-size`: na auditoria ela apareceu com
// duas vulnerabilidades de DoS (loop infinito) sem correção disponível nos
// parsers de ICNS/JXL/HEIF (GHSA-w3rx-r6r6-pgpr, GHSA-5p2g-fcmc-qvqq) — que
// nunca usaríamos (só aceitamos JPEG/PNG/WebP), mas trazer a dependência
// mesmo assim adicionaria uma vulnerabilidade de alta severidade sem
// necessidade. Em vez disso, três leitores mínimos abaixo, cada um só lendo
// campos de tamanho FIXO da estrutura do próprio formato (PNG: IHDR nos
// primeiros bytes; JPEG: varredura de marcadores limitada ao tamanho do
// buffer, cada segmento pulado pelo próprio campo de tamanho dele, nunca um
// laço sem limite; WebP: os três sub-formatos VP8/VP8L/VP8X, campos de
// tamanho fixo, sem laço) — mesmo espírito de `detectImageFormat` acima.
export const BANNER_WIDTH = 1200;
export const BANNER_HEIGHT = 400;

export interface ImageDimensions {
  width: number;
  height: number;
}

function readPngDimensions(buf: Buffer): ImageDimensions | null {
  // IHDR é sempre o primeiro chunk, logo após os 8 bytes de assinatura:
  // 4 bytes de tamanho + "IHDR" (4 bytes) + largura (4 bytes BE) + altura (4 bytes BE).
  if (buf.length < 24) return null;
  if (buf.toString("ascii", 12, 16) !== "IHDR") return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function readJpegDimensions(buf: Buffer): ImageDimensions | null {
  // Varre marcadores JPEG (0xFF seguido do código do marcador). Cada
  // segmento carrega seu próprio tamanho (2 bytes BE, contado a partir do
  // campo de tamanho) — usamos ESSE campo pra pular pro próximo marcador,
  // nunca um laço que dependa de "achar" algo; o cursor sempre avança pelo
  // menos 1 byte, e o laço termina quando o cursor sai do buffer (limite
  // natural, sem contador artificial de iterações necessário).
  let offset = 2; // pula o SOI (0xFFD8)
  while (offset + 9 < buf.length) {
    if (buf[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buf[offset + 1]!;
    // SOF0..SOF3, SOF5..SOF7, SOF9..SOF11, SOF13..SOF15 carregam
    // dimensões — exclui SOF4/SOF8/SOF12 (não são starts-of-frame reais,
    // são DHT/JPG/DAC) e os marcadores sem payload de tamanho (0xD0-0xD9).
    const isSof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isSof) {
      // segmento: [0xFF][marker][len:2][precisão:1][altura:2][largura:2]...
      if (offset + 9 >= buf.length) return null;
      const height = buf.readUInt16BE(offset + 5);
      const width = buf.readUInt16BE(offset + 7);
      return { width, height };
    }
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2; // sem campo de tamanho
      continue;
    }
    const segmentLength = buf.readUInt16BE(offset + 2);
    if (segmentLength < 2) return null; // segmento inválido — nunca confia num tamanho que não avança
    offset += 2 + segmentLength;
  }
  return null;
}

function readWebpDimensions(buf: Buffer): ImageDimensions | null {
  if (buf.length < 30) return null;
  const chunkType = buf.toString("ascii", 12, 16);
  if (chunkType === "VP8X") {
    // Largura/altura vêm em 24 bits little-endian, "menos 1", a partir do
    // offset 24 e 27.
    const width = (buf[24]! | (buf[25]! << 8) | (buf[26]! << 16)) + 1;
    const height = (buf[27]! | (buf[28]! << 8) | (buf[29]! << 16)) + 1;
    return { width, height };
  }
  if (chunkType === "VP8 ") {
    // Bitstream VP8 "keyframe": os 3 bytes de start code (0x9d 0x01 0x2a)
    // ficam no offset 23-25; largura/altura (14 bits cada, os 2 bits altos
    // são escala) logo depois, little-endian.
    if (buf.length < 30 || buf[23] !== 0x9d || buf[24] !== 0x01 || buf[25] !== 0x2a) return null;
    const width = (buf[26]! | (buf[27]! << 8)) & 0x3fff;
    const height = (buf[28]! | (buf[29]! << 8)) & 0x3fff;
    return { width, height };
  }
  if (chunkType === "VP8L") {
    // Assinatura 0x2f no offset 20; largura/altura (14 bits cada) bit-a-bit
    // a partir do offset 21, little-endian, "menos 1".
    if (buf[20] !== 0x2f) return null;
    const b0 = buf[21]!, b1 = buf[22]!, b2 = buf[23]!, b3 = buf[24]!;
    const width = (1 + (((b1 & 0x3f) << 8) | b0));
    const height = (1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6)));
    return { width, height };
  }
  return null;
}

/**
 * Dimensões reais do conteúdo — devolve null se não conseguir ler (arquivo
 * corrompido/truncado é tratado como dimensão desconhecida pelo chamador,
 * que rejeita).
 */
export function readImageDimensions(buffer: Buffer, format: ValidatedImage): ImageDimensions | null {
  try {
    if (format.mime === "image/png") return readPngDimensions(buffer);
    if (format.mime === "image/jpeg") return readJpegDimensions(buffer);
    if (format.mime === "image/webp") return readWebpDimensions(buffer);
    return null;
  } catch {
    return null;
  }
}

/**
 * Banner NOVO precisa ser exatamente 1200×400 — nunca corta, redimensiona
 * ou distorce silenciosamente; se não bater, rejeita com mensagem amigável
 * mostrando o que foi enviado e o que era esperado. Retorna a mensagem de
 * erro, ou null se a dimensão está correta.
 */
export function validateBannerDimensions(buffer: Buffer, format: ValidatedImage): string | null {
  const dimensions = readImageDimensions(buffer, format);
  if (!dimensions || !dimensions.width || !dimensions.height) {
    return "Não foi possível ler as dimensões da imagem — envie um arquivo íntegro.";
  }
  if (dimensions.width !== BANNER_WIDTH || dimensions.height !== BANNER_HEIGHT) {
    return `A imagem enviada possui ${dimensions.width} × ${dimensions.height} px. O banner precisa ter exatamente ${BANNER_WIDTH} × ${BANNER_HEIGHT} px.`;
  }
  return null;
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
