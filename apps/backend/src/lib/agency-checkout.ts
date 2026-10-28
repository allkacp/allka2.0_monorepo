import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { config } from "../config";
import { prisma } from "./prisma";
import { PaymentValidationError } from "./confirm-payment";

export const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
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
