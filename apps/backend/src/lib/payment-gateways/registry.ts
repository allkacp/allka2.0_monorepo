// Catálogo de gateways que o Admin Master pode escolher. PARA ACRESCENTAR UM GATEWAY NOVO: escreva a classe do adaptador (implements PaymentGatewayAdapter)
// e acrescente UMA entrada em GATEWAYS abaixo. A tela de Pagamentos, o cofre de chaves, a troca e o aviso automático já funcionam para ele.
import type { PaymentGatewayAdapter } from "../payment-gateway";
import { PagBankGateway } from "./pagbank";

export interface GatewayField { key: string; label: string; secret: boolean; required: boolean; help: string }
export interface GatewayDescriptor {
  key: string;
  label: string;
  /** false = só reservado na lista (o adaptador ainda não foi escrito); não pode ser ativado. */
  implemented: boolean;
  /** true só depois de testado no sandbox/produção com chaves reais (mantido à mão neste arquivo). */
  proven: boolean;
  supports: { pix: boolean; card: boolean; recurring: boolean };
  docsUrl: string;
  fields: GatewayField[];
  create?(input: { mode: "sandbox" | "live"; secrets: Record<string, string>; values: Record<string, string> }): PaymentGatewayAdapter;
}

const PUBLIC_URL_FIELD: GatewayField = { key: "public_base_url", label: "Endereço público do servidor", secret: false, required: false, help: "Endereço pelo qual o gateway consegue chamar a Allka para avisar pagamentos (ex.: https://api.seudominio.com). Sem ele, a confirmação depende de consulta manual." };
const SITE_URL_FIELD: GatewayField = { key: "site_base_url", label: "Endereço do site", secret: false, required: false, help: "Para onde o cliente volta depois de pagar (ex.: https://app.seudominio.com)." };

export const GATEWAYS: GatewayDescriptor[] = [
  {
    key: "pagbank", label: "PagBank", implemented: true, proven: false,
    supports: { pix: true, card: true, recurring: false }, docsUrl: "https://developer.pagbank.com.br",
    fields: [
      { key: "token", label: "Token de acesso", secret: true, required: true, help: "Token da conta PagBank (Bearer). Use o do ambiente de teste enquanto estiver testando." },
      PUBLIC_URL_FIELD, SITE_URL_FIELD,
    ],
    create: ({ mode, secrets, values }) => new PagBankGateway({ token: secrets.token ?? "", mode, publicBaseUrl: values.public_base_url }),
  },
  { key: "asaas", label: "Asaas", implemented: false, proven: false, supports: { pix: true, card: true, recurring: true }, docsUrl: "https://docs.asaas.com", fields: [] },
  { key: "mercadopago", label: "Mercado Pago", implemented: false, proven: false, supports: { pix: true, card: true, recurring: true }, docsUrl: "https://www.mercadopago.com.br/developers", fields: [] },
  { key: "stripe", label: "Stripe", implemented: false, proven: false, supports: { pix: true, card: true, recurring: true }, docsUrl: "https://docs.stripe.com", fields: [] },
];

export function descriptorOf(key: string): GatewayDescriptor | undefined {
  return GATEWAYS.find((g) => g.key === key);
}
