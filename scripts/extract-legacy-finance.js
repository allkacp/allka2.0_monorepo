/**
 * extract-legacy-finance.js — Extrai do dump antigo o bloco FINANCEIRO:
 * faturamento, contratos, carteira e repasses.
 *
 * Este material não vira registro da plataforma nova: entra num arquivo
 * separado (tabela legacy_records) só para consulta histórica, sem FK nenhuma
 * — ver apps/backend/src/scripts/import-legacy-finance.ts.
 *
 * Fora do escopo de propósito:
 *   - relatórios (`*_report`) — não funcionavam na plataforma antiga
 *   - `credit_card` e `bank_information` — dado sensível de pagamento; guardar
 *     cópia num arquivo histórico é risco sem contrapartida
 *   - logs de integração (omie/bitrix24)
 *
 * Uso: node scripts/extract-legacy-finance.js
 */

const path = require("node:path");
const { extract } = require("./lib/dump-extract");

const WANTED = {
  // faturamento
  billing: Infinity,
  billing_item: Infinity,
  billing_discount: Infinity,
  nocharge_reason: Infinity,
  // contratos
  contract: Infinity,
  contract_billing: Infinity,
  contract_billing_detail: Infinity,
  contract_version: Infinity,
  // carteira
  wallet: Infinity,
  wallet_transaction: Infinity,
  wallet_balance_release_request: Infinity,
  wallet_balance_release_request_item: Infinity,
  wallet_withdraw_request: Infinity,
  wallet_transaction_credit_expiration_track: Infinity,
  // repasses a quem executa
  nomad_task_paid_out: Infinity,
  leader_task_paid_out: Infinity,
  // cobrança ligada a projeto
  project_invoice: Infinity,
  project_billing_schedule: Infinity,
  payment_notification: Infinity,
  plan_billing_history: Infinity,
};

extract({
  dump: path.resolve(__dirname, "../../allka antigo/Dump20260423.sql"),
  out: path.resolve(__dirname, "../../allka antigo/financeiro-legado.json"),
  wanted: WANTED,
  maxString: 0,
  escopo:
    "Financeiro: faturamento, contratos, carteira, repasses. Sem relatórios, sem dados de cartão/banco, sem logs de integração.",
}).catch((e) => {
  console.error("❌", e);
  process.exit(1);
});
