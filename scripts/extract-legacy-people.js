/**
 * extract-legacy-people.js — Extrai do dump antigo o bloco de CADASTROS:
 * contas, usuários, agências, clientes, nômades e líderes.
 *
 * Fora do escopo de propósito:
 *   - relatórios (`*_report`, `report_queue`, `dashboard`, `widget`) — não
 *     funcionavam na plataforma antiga, orientação do usuário
 *   - dados sensíveis de pagamento (`credit_card`, `bank_information`)
 *   - logs e históricos de status (não são cadastro)
 *
 * Uso: node scripts/extract-legacy-people.js
 */

const path = require("node:path");
const { extract } = require("./lib/dump-extract");

const WANTED = {
  // contas e acesso
  account: Infinity,
  account_type: Infinity,
  user: Infinity,
  // organizações
  agency: Infinity,
  agency_user: Infinity,
  client: Infinity,
  client_user: Infinity,
  client_agency: Infinity,
  // pessoas da operação
  nomad: Infinity,
  nomad_user: Infinity,
  nomad_task_category_interest: Infinity,
  nomad_enabled_task_template: Infinity,
  nomad_hour_availability: Infinity,
  leader: Infinity,
  leader_user: Infinity,
  // apoio
  avatar: Infinity,
  plan: Infinity,
  account_plan_subscription: Infinity,
};

extract({
  dump: path.resolve(__dirname, "../../allka antigo/Dump20260423.sql"),
  out: path.resolve(__dirname, "../../allka antigo/cadastros-legado.json"),
  wanted: WANTED,
  // Sem truncar: este JSON alimenta a importação real (import-legacy-platform),
  // e texto cortado viraria conteúdo cortado dentro da plataforma nova.
  maxString: 0,
  escopo:
    "Cadastros: contas, usuários, agências, clientes, nômades, líderes. Sem relatórios, sem dados de pagamento, sem logs.",
}).catch((e) => {
  console.error("❌", e);
  process.exit(1);
});
