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

export interface PaymentGatewayAdapter {
  readonly name: string;
  charge(input: ChargeInput): Promise<ChargeResult>;
  refund(input: RefundInput): Promise<RefundResult>;
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
}

let cachedGateway: PaymentGatewayAdapter | null = null;

/**
 * Fábrica do gateway ativo — lê `PAYMENT_GATEWAY` do ambiente (default
 * FAKE_SANDBOX). Gateway real ainda não implementado: pedir explicitamente
 * um não-fake sem a classe existir falha alto e claro, em vez de cair
 * silenciosamente no fake.
 */
export function getPaymentGateway(): PaymentGatewayAdapter {
  if (cachedGateway) return cachedGateway;
  const configured = (process.env.PAYMENT_GATEWAY ?? "FAKE_SANDBOX").toUpperCase();
  switch (configured) {
    case "FAKE_SANDBOX":
      cachedGateway = new FakeSandboxGateway();
      return cachedGateway;
    default:
      throw new Error(
        `PAYMENT_GATEWAY="${configured}" não tem adapter implementado ainda. ` +
          "Implemente PaymentGatewayAdapter em src/lib/payment-gateway.ts e adicione o case correspondente.",
      );
  }
}

/** Só para testes — nunca usar em código de produção. */
export function __setPaymentGatewayForTests(gateway: PaymentGatewayAdapter | null): void {
  cachedGateway = gateway;
}
