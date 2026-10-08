// Configuração dos gateways: chaves no cofre (cifradas, nunca devolvidas), teste de conexão, ativação (troca) com histórico.
import { prisma } from "../prisma";
import { decryptToken, encryptToken, isTokenEncryptionConfigured } from "../token-encryption";
import { setActivePaymentGateway, type PaymentGatewayAdapter } from "../payment-gateway";
import { GATEWAYS, descriptorOf } from "./registry";

export class GatewayConfigError extends Error {
  constructor(message: string, public httpStatus = 422, public code = "gateway_invalid") { super(message); }
}

type Stored = { secrets: Record<string, string>; values: Record<string, string> };

async function readStored(key: string): Promise<{ row: any; data: Stored } | null> {
  const row = await prisma.paymentGatewayConfig.findUnique({ where: { key } });
  if (!row) return null;
  const secrets = row.secret_ciphertext ? JSON.parse(decryptToken(row.secret_ciphertext)) : {};
  const values = row.public_json ? JSON.parse(row.public_json) : {};
  return { row, data: { secrets, values } };
}

function buildAdapter(key: string, mode: "sandbox" | "live", data: Stored): PaymentGatewayAdapter {
  const d = descriptorOf(key);
  if (!d?.implemented || !d.create) throw new GatewayConfigError("O adaptador deste gateway ainda não foi escrito.", 422, "not_implemented");
  const missing = d.fields.filter((f) => f.required && !(f.secret ? data.secrets[f.key] : data.values[f.key]));
  if (missing.length) throw new GatewayConfigError(`Falta preencher: ${missing.map((m) => m.label).join(", ")}.`, 422, "missing_fields");
  return d.create({ mode, secrets: data.secrets, values: data.values });
}

/** Lista para a tela: nunca devolve segredo, só se ele está preenchido. */
export async function listGateways() {
  const rows = await prisma.paymentGatewayConfig.findMany();
  const byKey = new Map(rows.map((r) => [r.key, r]));
  const activeRow = rows.find((r) => r.is_active);
  return {
    vault_ready: isTokenEncryptionConfigured(),
    active: activeRow?.key ?? "fake_sandbox",
    gateways: [
      { key: "fake_sandbox", label: "Pagamento de teste (fictício)", implemented: true, proven: true, supports: { pix: true, card: true, recurring: true }, docsUrl: "", fields: [], configured: true, is_active: !activeRow, mode: "sandbox", values: {}, secrets_filled: {}, fee_note: null, last_test: null },
      ...GATEWAYS.map((d) => {
        const r = byKey.get(d.key);
        const secrets: Record<string, string> = r?.secret_ciphertext ? JSON.parse(decryptToken(r.secret_ciphertext)) : {};
        return {
          key: d.key, label: d.label, implemented: d.implemented, proven: d.proven, supports: d.supports, docsUrl: d.docsUrl, fields: d.fields,
          configured: !!r && d.fields.filter((f) => f.required).every((f) => f.secret ? !!secrets[f.key] : !!(r.public_json && JSON.parse(r.public_json)[f.key])),
          is_active: !!r?.is_active, mode: r?.mode ?? "sandbox",
          values: r?.public_json ? JSON.parse(r.public_json) : {},
          secrets_filled: Object.fromEntries(d.fields.filter((f) => f.secret).map((f) => [f.key, !!secrets[f.key]])),
          fee_note: r?.fee_note ?? null,
          last_test: r?.last_test_at ? { at: r.last_test_at, ok: r.last_test_ok, message: r.last_test_message } : null,
        };
      }),
    ],
  };
}

export async function saveGatewayConfig(input: { key: string; mode: "sandbox" | "live"; secrets: Record<string, string>; values: Record<string, string>; feeNote?: string | null; actor: string }) {
  const d = descriptorOf(input.key);
  if (!d) throw new GatewayConfigError("Gateway desconhecido.", 404, "unknown_gateway");
  if (!isTokenEncryptionConfigured()) throw new GatewayConfigError("O cofre de chaves não está configurado neste ambiente (META_TOKEN_ENCRYPTION_KEY).", 503, "vault_not_configured");
  const prev = await readStored(input.key);
  // Segredo vazio = manter o que já está guardado (a tela nunca recebe o segredo de volta).
  const secrets: Record<string, string> = { ...(prev?.data.secrets ?? {}) };
  for (const f of d.fields.filter((x) => x.secret)) { const v = input.secrets[f.key]; if (typeof v === "string" && v.trim()) secrets[f.key] = v.trim(); }
  const values: Record<string, string> = {};
  for (const f of d.fields.filter((x) => !x.secret)) { const v = input.values[f.key]; if (typeof v === "string" && v.trim()) values[f.key] = v.trim().replace(/\/+$/, ""); }
  const data = { secret_ciphertext: encryptToken(JSON.stringify(secrets)), public_json: JSON.stringify(values), mode: input.mode, fee_note: input.feeNote ?? prev?.row.fee_note ?? null, updated_by: input.actor };
  await prisma.paymentGatewayConfig.upsert({ where: { key: input.key }, create: { key: input.key, label: d.label, ...data }, update: data });
  // Se este é o gateway ativo, a mudança vale já.
  if (prev?.row.is_active) await loadActiveGateway();
}

export async function testGateway(key: string) {
  const stored = await readStored(key);
  if (!stored) throw new GatewayConfigError("Salve as chaves antes de testar.", 422, "not_configured");
  const adapter = buildAdapter(key, stored.row.mode, stored.data);
  let res: { ok: boolean; message: string };
  try { res = adapter.testConnection ? await adapter.testConnection() : { ok: false, message: "Este adaptador não tem teste de conexão." }; }
  catch (e: any) { res = { ok: false, message: `Não foi possível falar com o gateway: ${e?.message ?? e}` }; }
  await prisma.paymentGatewayConfig.update({ where: { key }, data: { last_test_at: new Date(), last_test_ok: res.ok, last_test_message: res.message } });
  return res;
}

/** Troca o gateway ativo. Só gateways com chaves salvas e teste de conexão aprovado; o histórico guarda quem trocou. */
export async function activateGateway(input: { key: string; actor: string; note?: string }) {
  const current = await prisma.paymentGatewayConfig.findFirst({ where: { is_active: true } });
  if (input.key === "fake_sandbox") {
    await prisma.$transaction([
      prisma.paymentGatewayConfig.updateMany({ data: { is_active: false } }),
      prisma.paymentGatewayChange.create({ data: { from_key: current?.key ?? "fake_sandbox", to_key: "fake_sandbox", changed_by: input.actor, note: input.note ?? null } }),
    ]);
    setActivePaymentGateway(null);
    return;
  }
  const stored = await readStored(input.key);
  if (!stored) throw new GatewayConfigError("Salve as chaves deste gateway antes de ativar.", 422, "not_configured");
  buildAdapter(input.key, stored.row.mode, stored.data); // valida campos
  if (!stored.row.last_test_ok) throw new GatewayConfigError("Faça o \"Testar conexão\" com sucesso antes de ativar.", 422, "not_tested");
  await prisma.$transaction([
    prisma.paymentGatewayConfig.updateMany({ where: { key: { not: input.key } }, data: { is_active: false } }),
    prisma.paymentGatewayConfig.update({ where: { key: input.key }, data: { is_active: true } }),
    prisma.paymentGatewayChange.create({ data: { from_key: current?.key ?? "fake_sandbox", to_key: input.key, mode: stored.row.mode, changed_by: input.actor, note: input.note ?? null } }),
  ]);
  await loadActiveGateway();
}

export async function gatewayHistory() {
  return prisma.paymentGatewayChange.findMany({ orderBy: { created_at: "desc" }, take: 30 });
}

/** Carrega o gateway marcado como ativo (chamado na partida do servidor e a cada troca). Falha = volta ao de teste, nunca derruba o servidor. */
export async function loadActiveGateway(): Promise<void> {
  try {
    const row = await prisma.paymentGatewayConfig.findFirst({ where: { is_active: true } });
    if (!row) { setActivePaymentGateway(null); return; }
    const stored = await readStored(row.key);
    setActivePaymentGateway(stored ? buildAdapter(row.key, row.mode as "sandbox" | "live", stored.data) : null);
  } catch (e) {
    console.error("[payment-gateways] não foi possível carregar o gateway ativo; usando o de teste:", (e as Error).message);
    setActivePaymentGateway(null);
  }
}

/** Adaptador de um gateway específico (para validar avisos de um gateway que não é mais o ativo). */
export async function adapterFor(key: string): Promise<PaymentGatewayAdapter | null> {
  const stored = await readStored(key);
  return stored ? buildAdapter(key, stored.row.mode, stored.data) : null;
}

export async function publicValuesOf(key: string): Promise<Record<string, string>> {
  return (await readStored(key))?.data.values ?? {};
}
