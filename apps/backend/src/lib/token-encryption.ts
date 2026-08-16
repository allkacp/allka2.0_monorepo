// Cifra os tokens OAuth de ProjectConnection.access_token_encrypted em
// repouso — nunca texto puro no banco. AES-256-GCM com a lib `crypto`
// nativa do Node, chave em META_TOKEN_ENCRYPTION_KEY (openssl rand -hex 32).
//
// Disciplina de log igual à de middleware/allka-hmac.ts deste mesmo repo:
// nunca interpolar o texto puro, o resultado decifrado, nem a chave em
// nenhuma mensagem de log ou erro.
import crypto from "crypto";
import { config } from "../config";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH_BYTES = 12; // padrão recomendado pro GCM

function getKey(): Buffer {
  const hex = config.META_TOKEN_ENCRYPTION_KEY;
  if (!hex || hex.trim().length === 0) {
    throw new Error("META_TOKEN_ENCRYPTION_KEY não configurada.");
  }
  const key = Buffer.from(hex, "hex");
  if (key.length !== 32) {
    throw new Error("META_TOKEN_ENCRYPTION_KEY precisa ter 32 bytes (64 caracteres hex).");
  }
  return key;
}

export function isTokenEncryptionConfigured(): boolean {
  const hex = config.META_TOKEN_ENCRYPTION_KEY;
  return Boolean(hex && Buffer.from(hex, "hex").length === 32);
}

/** "<iv_hex>:<authTag_hex>:<ciphertext_hex>" */
export function encryptToken(plain: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${ciphertext.toString("hex")}`;
}

export function decryptToken(encoded: string): string {
  const key = getKey();
  const parts = encoded.split(":");
  if (parts.length !== 3) {
    throw new Error("Token cifrado inválido ou corrompido.");
  }
  try {
    const [ivHex, authTagHex, ciphertextHex] = parts;
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const ciphertext = Buffer.from(ciphertextHex, "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return plain.toString("utf8");
  } catch {
    throw new Error("Token cifrado inválido ou corrompido.");
  }
}
