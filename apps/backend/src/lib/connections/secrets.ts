// Cofre de segredos das conexões. Cifra com AES-256-GCM (token-encryption.ts) e NUNCA devolve o valor:
// só o conector (código do servidor) pode usá-lo, e cada uso fica na trilha de auditoria.
import type { Prisma, PrismaClient } from "@prisma/client";
import { decryptToken, encryptToken, isTokenEncryptionConfigured } from "../token-encryption";
import { redactSecrets } from "../redact-secrets";
import { ConnectionError } from "./catalog";

type Db = PrismaClient | Prisma.TransactionClient;

export function vaultConfigured(): boolean {
  return isTokenEncryptionConfigured();
}

/** Guarda (ou troca) o segredo da conexão; devolve só a referência opaca. */
export async function storeSecret(db: Db, connectionId: string, plain: string): Promise<string> {
  if (!plain || plain.length < 4) throw new ConnectionError("Segredo vazio ou curto demais.", 422, "secret_invalid");
  if (!vaultConfigured()) throw new ConnectionError("O cofre de segredos não está configurado neste ambiente (META_TOKEN_ENCRYPTION_KEY).", 503, "secret_vault_not_configured");
  const ciphertext = encryptToken(plain);
  const existing = await db.connectionSecret.findUnique({ where: { connection_id: connectionId } });
  const row = existing
    ? await db.connectionSecret.update({ where: { id: existing.id }, data: { ciphertext, rotated_at: new Date(), revoked_at: null } })
    : await db.connectionSecret.create({ data: { connection_id: connectionId, ciphertext } });
  await db.clientConnection.update({ where: { id: connectionId }, data: { secret_ref: row.id } });
  return row.id;
}

/** Uso INTERNO pelo conector. Nunca exposto por rota. */
export async function readSecretForConnector(db: Db, connectionId: string): Promise<string | null> {
  const row = await db.connectionSecret.findUnique({ where: { connection_id: connectionId } });
  if (!row || row.revoked_at) return null;
  return decryptToken(row.ciphertext);
}

/** Revoga e APAGA o conteúdo cifrado (o segredo não fica guardado depois de revogado). */
export async function revokeSecret(db: Db, connectionId: string): Promise<boolean> {
  const row = await db.connectionSecret.findUnique({ where: { connection_id: connectionId } });
  if (!row) return false;
  await db.connectionSecret.update({ where: { id: row.id }, data: { ciphertext: "", revoked_at: new Date() } });
  return true;
}

export async function hasSecret(db: Db, connectionId: string): Promise<boolean> {
  const row = await db.connectionSecret.findUnique({ where: { connection_id: connectionId }, select: { revoked_at: true } });
  return !!row && !row.revoked_at;
}

const SECRET_KEY_RE = /(senha|password|passwd|secret|token|api[_-]?key|credencial|authorization)/i;
const SECRET_TEXT_RE = /(senha|password|passwd|token)\s*[:=]\s*\S+/i;
/** Campos aceitos para segredo (só nos endpoints de conexão): são separados do restante do corpo. */
export const SECRET_INPUT_FIELDS = ["secret_value"];

/** Recusa segredo em qualquer campo comum (comentário, briefing, nota, histórico, notificação…). */
export function assertNoSecretInPlainFields(body: unknown, allowed: string[] = []): void {
  const walk = (v: unknown, path: string): void => {
    if (v && typeof v === "object") {
      for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
        if (!allowed.includes(k) && SECRET_KEY_RE.test(k) && typeof val === "string" && val.length > 0) {
          throw new ConnectionError("Nunca informe senhas ou tokens em campos comuns. Use a conexão oficial, o convite ou o campo protegido de segredo.", 422, "secret_in_plain_field", { field: path ? `${path}.${k}` : k });
        }
        walk(val, path ? `${path}.${k}` : k);
      }
    } else if (typeof v === "string" && SECRET_TEXT_RE.test(v)) {
      throw new ConnectionError("O texto parece conter uma senha ou token. Nunca registre segredos em texto comum.", 422, "secret_in_plain_text", { field: path });
    }
  };
  walk(body, "");
}

/** Texto seguro para log/erro/notificação/histórico. */
export function safeText(t: unknown): string {
  return redactSecrets(t).replace(/(senha|password|passwd)\s*[:=]\s*\S+/gi, "$1: [oculto]");
}
