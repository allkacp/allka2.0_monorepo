import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { config } from "../config";
import { prisma } from "./prisma";
import { PaymentValidationError } from "./confirm-payment";

export const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
/** Observação gravada no pagamento feito pelo cliente final no link da agência — o histórico do projeto usa para atribuir o pagamento ao cliente. */
export const AGENCY_CLIENT_LINK_PAYMENT_NOTE = "Link do cliente final — pagamento sandbox, sem cobrança real.";
export function agencyPrice(base: number, percent: number) {
  const commission = roundMoney(base * percent / 100);
  return { base: roundMoney(base), commission, total: roundMoney(base + commission) };
}

export async function paymentLinkOrder(projectId: string) {
  const order = await prisma.project.findUnique({ where: { id: projectId }, include: {
    products: { where: { status: { notIn: ["CANCELADO", "TRANSFERIDO"] } }, orderBy: { id: "asc" }, include: { catalog2_version: { select: { title: true } } } },
    payments: { where: { status: "PAGO" }, take: 1 },
  } });
  if (!order || !order.agency_id || ["cancelado", "cancelled"].includes(order.status) || !order.products?.length || order.products.some((p) => p.origin !== "CATALOG2" || p.pagador_snapshot !== "CLIENTE")) {
    throw new PaymentValidationError("Link de pagamento não encontrado.", 404);
  }
  const fingerprint = createHash("sha256").update(JSON.stringify(order.products.map((p: any) => [p.id, p.preco_final_cliente_snapshot, p.comissao_snapshot]))).digest("hex");
  return { order, fingerprint };
}

type PublicPaymentProduct = {
  product_name_snapshot: string | null; preco_final_cliente_snapshot: number; origin_catalog2_quote_id: string | null;
  catalog2_version_id: string | null; catalog2_period: string | null; catalog2_period_months: number | null;
  catalog2_version?: { title: string | null } | null;
};
/** O que o CLIENTE FINAL vê no link: o que foi contratado (quantidade, modalidade, opções escolhidas) e o preço final de cada linha.
 *  Lido da cotação congelada e da versão contratada — nunca custo, comissão, acessos ou dados internos da agência. */
export async function publicPaymentItems(products: PublicPaymentProduct[]) {
  const quoteIds = products.map((p) => p.origin_catalog2_quote_id).filter((id): id is string => !!id);
  const versionIds = [...new Set(products.map((p) => p.catalog2_version_id).filter((id): id is string => !!id))];
  const [quotes, variations, addons] = await Promise.all([
    quoteIds.length ? prisma.catalog2Quote.findMany({ where: { id: { in: quoteIds } }, select: { id: true, quantity: true, selection_json: true } }) : [],
    versionIds.length ? prisma.catalog2Variation.findMany({ where: { version_id: { in: versionIds } }, orderBy: { sort_order: "asc" }, select: { version_id: true, name: true, options: { orderBy: { sort_order: "asc" }, select: { key: true, label: true } } } }) : [],
    versionIds.length ? prisma.catalog2Addon.findMany({ where: { version_id: { in: versionIds } }, orderBy: { sort_order: "asc" }, select: { version_id: true, key: true, name: true } }) : [],
  ]);
  const quoteById = new Map(quotes.map((q) => [q.id, q]));
  return products.map((p) => {
    const quote = p.origin_catalog2_quote_id ? quoteById.get(p.origin_catalog2_quote_id) : undefined;
    let sel: { variation_option_keys?: unknown; addon_keys?: unknown; addon_selections?: Record<string, { quantity?: unknown }>; delivery_groups?: unknown } = {};
    try { sel = quote ? JSON.parse(quote.selection_json) ?? {} : {}; } catch { sel = {}; }
    const optionKeys = new Set(Array.isArray(sel.variation_option_keys) ? sel.variation_option_keys.map(String) : []);
    const addonKeys = new Set(Array.isArray(sel.addon_keys) ? sel.addon_keys.map(String) : []);
    const options = [
      ...variations.filter((v) => v.version_id === p.catalog2_version_id)
        .flatMap((v) => v.options.filter((o) => optionKeys.has(o.key)).map((o) => `${v.name}: ${o.label}`)),
      ...addons.filter((a) => a.version_id === p.catalog2_version_id && addonKeys.has(a.key)).map((a) => {
        const qty = Math.floor(Number(sel.addon_selections?.[a.key]?.quantity ?? 1));
        return qty > 1 ? `${a.name} (${qty})` : a.name;
      }),
    ];
    const groups = Array.isArray(sel.delivery_groups) ? sel.delivery_groups.map(Number).filter((n) => Number.isInteger(n) && n > 0) : [];
    return {
      name: p.catalog2_version?.title || p.product_name_snapshot,
      total: p.preco_final_cliente_snapshot,
      modality: p.catalog2_period || "avulso",
      period_months: p.catalog2_period ? (p.catalog2_period_months ?? 1) : null,
      quantity: quote?.quantity ?? 1,
      delivery_groups: groups,
      options,
    };
  });
}

function signature(payload: string) {
  return createHmac("sha256", config.JWT_SECRET).update(`allka:agency-payment:v1:${payload}`).digest("base64url");
}
export async function issueAgencyPaymentLink(projectId: string) {
  const { fingerprint } = await paymentLinkOrder(projectId);
  const payload = Buffer.from(JSON.stringify({ projectId, fingerprint, expires: Date.now() + 86400000 })).toString("base64url");
  return `/pagar/contratacao/${payload}.${signature(payload)}`;
}
export async function verifyAgencyPaymentLink(token: string) {
  if (token.length > 2048) throw new PaymentValidationError("Link inválido.", 404);
  const [payload, signed, extra] = token.split(".");
  const expected = payload ? signature(payload) : "";
  if (extra || !signed || !/^[A-Za-z0-9_-]{43}$/.test(signed) || signed.length !== expected.length || !timingSafeEqual(Buffer.from(signed), Buffer.from(expected))) {
    throw new PaymentValidationError("Link inválido ou expirado. Solicite um novo link à agência.", 404);
  }
  let decoded: any;
  try { decoded = JSON.parse(Buffer.from(payload, "base64url").toString()); } catch { throw new PaymentValidationError("Link inválido.", 404); }
  if (typeof decoded.expires !== "number" || decoded.expires < Date.now() || typeof decoded.projectId !== "string") throw new PaymentValidationError("Este link expirou. Solicite outro à agência.", 410);
  const result = await paymentLinkOrder(decoded.projectId);
  if (decoded.fingerprint !== result.fingerprint) throw new PaymentValidationError("O pedido mudou. Solicite um novo link à agência.", 409);
  return result.order;
}
