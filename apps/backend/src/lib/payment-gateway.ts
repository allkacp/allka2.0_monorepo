/**
 * Abstração de gateway de pagamento — ponto único por onde toda cobrança
 * (avulsa ou recorrente) passa. Hoje só existe `FakeSandboxGateway`
 * (nenhum gateway real está integrado — ver auditoria de lançamento).
 *
 * Trocar para um gateway real (Stripe/Pagar.me/Asaas) é: implementar
 * `PaymentGatewayAdapter` numa classe nova e adicionar um `case` em
 * `getPaymentGateway()`. Nenhum chamador (confirm-payment.ts, scheduler de
 * recorrência) precisa mudar — todos dependem só da interface.
 */

export interface ChargeInput {
  amount: number;
  cardLastDigits?: string;
  cardHolder?: string;
  /** Identificador da tentativa no nosso lado — usado como chave de idempotência no gateway real. */
  referenceId: string;
  description?: string;
}

export interface ChargeResult {
  approved: boolean;
  gateway: string;
  transactionId: string;
  /** Preenchido só quando approved=false. */
  declineReason?: string;
  declineCode?: string;
}

export interface RefundInput {
  transactionId: string;
  amount: number;
}

export interface RefundResult {
  refunded: boolean;
  gateway: string;
  refundId: string;
}

export interface PixCharge {
  gateway: string;
  transactionId: string;
  /** Código "copia e cola" do Pix. */
  copyPaste: string;
}

/** Cobrança em gateway REAL: o cliente paga fora da Allka (Pix copia e cola ou página segura do cartão) e o gateway avisa depois. */
export interface IntentInput {
  amount: number;
  method: "pix" | "card";
  /** Nossa referência (id da recarga): volta no aviso do gateway para sabermos qual cobrança foi paga. */
  referenceId: string;
  description: string;
  customer: { name: string; email?: string | null; taxId?: string | null };
  redirectUrl?: string;
  notificationUrl?: string;
  expiresInMinutes?: number;
}
export interface IntentResult { externalId: string; status: "pending" | "paid"; pixCopyPaste?: string; redirectUrl?: string; expiresAt?: Date }
export interface WebhookEvent { referenceId?: string; externalId?: string; status: "pending" | "paid" | "failed" | "expired" }

export interface PaymentGatewayAdapter {
  readonly name: string;
  charge(input: ChargeInput): Promise<ChargeResult>;
  refund(input: RefundInput): Promise<RefundResult>;
  /** Gateways reais: cria Pix ou página de cartão e devolve o que mostrar ao cliente. */
  createIntent?(input: IntentInput): Promise<IntentResult>;
  /** Consulta o gateway (usada quando o aviso automático ainda não chegou). */
  getIntentStatus?(externalId: string, referenceId?: string): Promise<"pending" | "paid" | "failed" | "expired">;
  /** Valida a assinatura do aviso do gateway e o traduz. Devolve null se for falso/inválido. */
  parseWebhook?(input: { headers: Record<string, unknown>; rawBody: string; body: any }): WebhookEvent | null;
  /** "Testar conexão" da tela de administração. */
  testConnection?(): Promise<{ ok: boolean; message: string }>;
  /** Gera uma cobrança Pix (sandbox). */
  createPix?(input: { amount: number; referenceId: string }): Promise<PixCharge>;
  /** Só no sandbox: lê o valor de um Pix gerado por este gateway (para "simular pagamento"). */
  parseFakePix?(transactionId: string): { amount: number } | null;
}

// ── Cartões de teste (convenção conhecida, mesmo espírito dos cartões de
// teste do Stripe) — qualquer final de cartão fora desta lista é aprovado.
// Usados pra exercitar de verdade os caminhos de falha (FALHOU), não só o
// caminho feliz. Documentado aqui pra QA/telas de teste linkarem.
const DECLINE_BY_LAST_DIGITS: Record<string, { reason: string; code: string }> = {
  "0002": { reason: "Cartão recusado pela operadora (saldo insuficiente, simulado)", code: "insufficient_funds" },
  "0069": { reason: "Cartão expirado (simulado)", code: "expired_card" },
  "0127": { reason: "CVV inválido (simulado)", code: "incorrect_cvc" },
  "0119": { reason: "Cartão perdido/bloqueado (simulado)", code: "lost_card" },
};

export class FakeSandboxGateway implements PaymentGatewayAdapter {
  readonly name = "FAKE_SANDBOX";

  async charge(input: ChargeInput): Promise<ChargeResult> {
    const last4 = (input.cardLastDigits ?? "4242").slice(-4);
    const decline = DECLINE_BY_LAST_DIGITS[last4];
    const transactionId = `FAKE_${Date.now()}_${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    if (decline) {
      return { approved: false, gateway: this.name, transactionId, declineReason: decline.reason, declineCode: decline.code };
    }
    return { approved: true, gateway: this.name, transactionId };
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    return { refunded: true, gateway: this.name, refundId: `FAKE_REFUND_${input.transactionId}` };
  }

  // Id do Pix fake = FAKE_PIX_<centavos>_<aleatório>: o sandbox não guarda estado, o valor viaja no próprio id.
  async createPix(input: { amount: number; referenceId: string }): Promise<PixCharge> {
    const transactionId = `FAKE_PIX_${Math.round(input.amount * 100)}_${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
    return { gateway: this.name, transactionId, copyPaste: `00020126FAKE-SANDBOX-PIX-${transactionId}` };
  }

  parseFakePix(transactionId: string): { amount: number } | null {
    const m = /^FAKE_PIX_(\d{3,9})_[A-Z0-9]{4,12}$/.exec(transactionId);
    return m ? { amount: Number(m[1]) / 100 } : null;
  }
}

let cachedGateway: PaymentGatewayAdapter | null = null;

/**
 * Gateway ATIVO. Quem decide é o Admin Master (tela Configurações → Pagamentos): o serviço carrega o escolhido na partida do servidor e a cada troca
 * (setActivePaymentGateway). Sem escolha, vale PAYMENT_GATEWAY do ambiente (padrão FAKE_SANDBOX, usado nos testes).
 */
export function getPaymentGateway(): PaymentGatewayAdapter {
  if (cachedGateway) return cachedGateway;
  const configured = (process.env.PAYMENT_GATEWAY ?? "FAKE_SANDBOX").toUpperCase();
  if (configured !== "FAKE_SANDBOX") {
    throw new Error(`PAYMENT_GATEWAY="${configured}" não é válido: escolha o gateway em Configurações → Pagamentos.`);
  }
  cachedGateway = new FakeSandboxGateway();
  return cachedGateway;
}

/** Define o gateway em uso (null = volta ao padrão). */
export function setActivePaymentGateway(gateway: PaymentGatewayAdapter | null): void {
  cachedGateway = gateway;
}

/** Só para testes — nunca usar em código de produção. */
export function __setPaymentGatewayForTests(gateway: PaymentGatewayAdapter | null): void {
  cachedGateway = gateway;
}
