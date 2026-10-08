// Adaptador PagBank (API de Pedidos + Checkout). ATENÇÃO: escrito pela documentação pública; só passa a valer como "comprovado" depois de
// testado no sandbox com as chaves da conta (botão "Testar conexão" + uma recarga Pix de teste). Pagamento de cartão = página segura do PagBank
// (a Allka nunca vê nem guarda o número do cartão).
import { createHash, timingSafeEqual } from "crypto";
import type { ChargeInput, ChargeResult, IntentInput, IntentResult, PaymentGatewayAdapter, RefundInput, RefundResult, WebhookEvent } from "../payment-gateway";

export interface PagBankConfig { token: string; mode: "sandbox" | "live"; publicBaseUrl?: string; fetchImpl?: typeof fetch }

const cents = (v: number) => Math.round(v * 100);

export class PagBankGateway implements PaymentGatewayAdapter {
  readonly name = "PAGBANK";
  private base: string;
  private f: typeof fetch;
  constructor(private cfg: PagBankConfig) {
    this.base = cfg.mode === "live" ? "https://api.pagseguro.com" : "https://sandbox.api.pagseguro.com";
    this.f = cfg.fetchImpl ?? fetch;
  }

  private async call(method: string, path: string, body?: unknown) {
    const res = await this.f(`${this.base}${path}`, {
      method,
      headers: { Authorization: `Bearer ${this.cfg.token}`, "Content-Type": "application/json", Accept: "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const json = await res.json().catch(() => null) as any;
    return { status: res.status, json };
  }
  private errorText(json: any, status: number) {
    const m = json?.error_messages?.map((e: any) => e.description ?? e.error ?? e.code).filter(Boolean).join("; ");
    return m || json?.message || `PagBank respondeu ${status}.`;
  }

  /** Cartão direto não é usado: o cartão é digitado na página do PagBank (createIntent method "card"). */
  async charge(_input: ChargeInput): Promise<ChargeResult> {
    return { approved: false, gateway: this.name, transactionId: "", declineReason: "O cartão é pago na página segura do PagBank.", declineCode: "hosted_only" };
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    const order = await this.call("GET", `/orders/${encodeURIComponent(input.transactionId)}`);
    const chargeId = order.json?.charges?.[0]?.id;
    if (!chargeId) throw new Error("Cobrança não encontrada no PagBank para estornar.");
    const r = await this.call("POST", `/charges/${chargeId}/cancel`, { amount: { value: cents(input.amount) } });
    if (r.status >= 300) throw new Error(this.errorText(r.json, r.status));
    return { refunded: true, gateway: this.name, refundId: String(r.json?.id ?? chargeId) };
  }

  async createIntent(input: IntentInput): Promise<IntentResult> {
    const customer = { name: input.customer.name, email: input.customer.email ?? undefined, tax_id: (input.customer.taxId ?? "").replace(/\D/g, "") || undefined };
    if (!customer.tax_id) throw new Error("Falta o CNPJ/CPF no cadastro para gerar a cobrança no PagBank.");
    const notification = input.notificationUrl ? [input.notificationUrl] : undefined;
    const item = { reference_id: input.referenceId, name: input.description.slice(0, 100), quantity: 1, unit_amount: cents(input.amount) };

    if (input.method === "pix") {
      const expiresAt = new Date(Date.now() + (input.expiresInMinutes ?? 30) * 60_000);
      const r = await this.call("POST", "/orders", {
        reference_id: input.referenceId, customer, items: [item],
        qr_codes: [{ amount: { value: cents(input.amount) }, expiration_date: expiresAt.toISOString() }],
        notification_urls: notification,
      });
      if (r.status >= 300) throw new Error(this.errorText(r.json, r.status));
      const text = r.json?.qr_codes?.[0]?.text;
      if (!text) throw new Error("O PagBank não devolveu o código Pix.");
      return { externalId: String(r.json.id), status: "pending", pixCopyPaste: text, expiresAt };
    }

    const r = await this.call("POST", "/checkouts", {
      reference_id: input.referenceId, customer, items: [item],
      payment_methods: [{ type: "CREDIT_CARD" }],
      redirect_url: input.redirectUrl, notification_urls: notification, payment_notification_urls: notification,
    });
    if (r.status >= 300) throw new Error(this.errorText(r.json, r.status));
    const pay = (r.json?.links ?? []).find((l: any) => String(l.rel).toUpperCase() === "PAY");
    if (!pay?.href) throw new Error("O PagBank não devolveu o link de pagamento.");
    return { externalId: String(r.json.id), status: "pending", redirectUrl: pay.href };
  }

  /** Consulta o pedido; para o checkout (CHEC_) procura pedidos com a nossa referência. */
  async getIntentStatus(externalId: string, referenceId?: string): Promise<"pending" | "paid" | "failed" | "expired"> {
    const path = externalId.startsWith("CHEC_") && referenceId ? `/orders?reference_id=${encodeURIComponent(referenceId)}` : `/orders/${encodeURIComponent(externalId)}`;
    const r = await this.call("GET", path);
    if (r.status >= 300) return "pending";
    const orders: any[] = Array.isArray(r.json?.orders) ? r.json.orders : [r.json];
    const charges = orders.flatMap((o) => o?.charges ?? []);
    if (charges.some((c: any) => c.status === "PAID")) return "paid";
    if (charges.length && charges.every((c: any) => ["DECLINED", "CANCELED"].includes(c.status))) return "failed";
    return "pending";
  }

  /** Confere a assinatura (x-authenticity-token = sha256 de "<token>-<corpo>") e traduz o aviso. */
  parseWebhook(input: { headers: Record<string, unknown>; rawBody: string; body: any }): WebhookEvent | null {
    const sent = String(input.headers["x-authenticity-token"] ?? "");
    const expected = createHash("sha256").update(`${this.cfg.token}-${input.rawBody}`).digest("hex");
    const a = Buffer.from(sent), b = Buffer.from(expected);
    if (!sent || a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const o = input.body ?? {};
    const charges: any[] = o.charges ?? [];
    const status: WebhookEvent["status"] = charges.some((c) => c.status === "PAID") ? "paid"
      : charges.length && charges.every((c) => ["DECLINED", "CANCELED"].includes(c.status)) ? "failed" : "pending";
    return { referenceId: o.reference_id ? String(o.reference_id) : undefined, externalId: o.id ? String(o.id) : undefined, status };
  }

  /** "Testar conexão": consulta um pedido que não existe. 401/403 = token inválido; 404 = token aceito. */
  async testConnection(): Promise<{ ok: boolean; message: string }> {
    const r = await this.call("GET", "/orders/ORDE_00000000-0000-0000-0000-000000000000");
    if (r.status === 401 || r.status === 403) return { ok: false, message: "O PagBank recusou o token. Confira se é o token do ambiente certo (teste ou produção)." };
    if (r.status === 404 || r.status === 200) return { ok: true, message: "Token aceito pelo PagBank." };
    return { ok: false, message: `Resposta inesperada do PagBank (${r.status}).` };
  }
}
