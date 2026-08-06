/**
 * import-legacy-finance.ts — Carrega o financeiro da plataforma antiga no
 * arquivo histórico (tabela legacy_records).
 *
 * Nada aqui vira registro operacional da plataforma nova: não cria Invoice,
 * Payment, WalletTransaction nem toca em nenhum modelo existente. A tabela de
 * destino é isolada (sem FK em nenhuma direção), então apagar tudo depois é um
 * DELETE só — ver scripts/remover-dados-legados.ts.
 *
 * Cada linha do dump é preservada inteira em `dados` (JSON), e os vínculos
 * (projeto, agência, cliente, nômade, conta) ficam em colunas soltas para dar
 * consulta cruzada com o `legacy_id` das entidades já importadas.
 *
 * Idempotente: unique (tabela, legacy_id).
 *   npx tsx src/scripts/import-legacy-finance.ts [--apply]
 */

import fs from "node:fs";
import path from "node:path";
import { prisma } from "../lib/prisma";

const APPLY = process.argv.includes("--apply");
const ORIGEM = "financeiro";

const FIN = JSON.parse(
  fs.readFileSync(
    path.resolve(__dirname, "../../../../../allka antigo/financeiro-legado.json"),
    "utf8",
  ),
);

/** De onde tirar cada vínculo/valor/data, por tabela. */
interface Mapa {
  projeto?: string;
  agencia?: string;
  cliente?: string;
  nomade?: string;
  conta?: string;
  valor?: string;
  data?: string;
}

const MAPA: Record<string, Mapa> = {
  billing: { projeto: "projectId", conta: "accountId", valor: "amount", data: "createdAt" },
  billing_item: { valor: "total", data: "createdAt" },
  billing_discount: { valor: "amount", data: "createdAt" },
  nocharge_reason: {},
  contract: { data: "createdAt" },
  contract_billing: { data: "createdAt" },
  contract_billing_detail: {},
  contract_version: { data: "createdAt" },
  wallet: { valor: "balance", data: "createdAt" },
  wallet_transaction: { valor: "amount", data: "createdAt" },
  wallet_balance_release_request: { valor: "amount", data: "createdAt" },
  wallet_balance_release_request_item: { valor: "amount" },
  wallet_withdraw_request: { valor: "amount", data: "createdAt" },
  wallet_transaction_credit_expiration_track: { valor: "amount", data: "createdAt" },
  nomad_task_paid_out: { nomade: "nomadId" },
  leader_task_paid_out: {},
  project_invoice: {
    projeto: "projectId",
    agencia: "agencyId",
    cliente: "clientId",
    valor: "billingAmount",
    data: "createdAt",
  },
  project_billing_schedule: { projeto: "projectId", valor: "amount", data: "createdAt" },
  payment_notification: { data: "createdAt" },
  plan_billing_history: { conta: "accountId", valor: "amount", data: "createdAt" },
};

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function toDate(v: unknown): Date | null {
  const s = String(v ?? "").trim();
  if (!s || s.startsWith("0000")) return null;
  const d = new Date(s.replace(" ", "T"));
  return isNaN(d.getTime()) ? null : d;
}

async function main() {
  console.log(`▶ Financeiro da plataforma antiga → arquivo — ${APPLY ? "APPLY" : "DRY-RUN"}\n`);

  let total = 0;
  let gravados = 0;

  for (const [tabela, mapa] of Object.entries(MAPA)) {
    const linhas: any[] = FIN.data[tabela] ?? [];
    if (linhas.length === 0) {
      console.log(`  ${tabela.padEnd(44)} — vazia no dump`);
      continue;
    }
    total += linhas.length;

    if (!APPLY) {
      console.log(`  ${tabela.padEnd(44)} ${String(linhas.length).padStart(6)} linhas`);
      continue;
    }

    // Em lote: são dezenas de milhares de linhas e nenhuma delas tem relação
    // com o resto do banco, então não há ordem a respeitar.
    const lote = linhas.map((r) => ({
      origem: ORIGEM,
      tabela,
      legacy_id: num(r.id),
      projeto_legacy_id: mapa.projeto ? num(r[mapa.projeto]) : null,
      agencia_legacy_id: mapa.agencia ? num(r[mapa.agencia]) : null,
      cliente_legacy_id: mapa.cliente ? num(r[mapa.cliente]) : null,
      nomade_legacy_id: mapa.nomade ? num(r[mapa.nomade]) : null,
      conta_legacy_id: mapa.conta ? num(r[mapa.conta]) : null,
      valor: mapa.valor ? num(r[mapa.valor]) : null,
      data: mapa.data ? toDate(r[mapa.data]) : null,
      dados: JSON.stringify(r),
    }));

    let inseridos = 0;
    for (let i = 0; i < lote.length; i += 1000) {
      const res = await prisma.legacyRecord.createMany({
        data: lote.slice(i, i + 1000),
        skipDuplicates: true,
      });
      inseridos += res.count;
    }
    gravados += inseridos;
    console.log(
      `  ${tabela.padEnd(44)} ${String(inseridos).padStart(6)} gravadas${inseridos < linhas.length ? ` (${linhas.length - inseridos} já existiam)` : ""}`,
    );
  }

  if (!APPLY) {
    console.log(`\n◻ ${total} linhas prontas para o arquivo.`);
    console.log("(dry-run — nada foi escrito. Rode com --apply.)");
    return;
  }

  const noArquivo = await prisma.legacyRecord.count();
  const soma = await prisma.legacyRecord.aggregate({
    _sum: { valor: true },
    where: { tabela: "project_invoice" },
  });
  console.log(`\n✅ ${gravados} linhas gravadas · arquivo tem ${noArquivo} registros`);
  console.log(
    `   confer.: soma faturada em project_invoice = R$ ${(soma._sum.valor ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
  );
}

main()
  .catch((e) => {
    console.error("❌ Erro:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
