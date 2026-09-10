/**
 * SIMULADOR DE VIRADA LIMPA — manifesto de retenção + plano de domínios.
 * Bloco seguinte à auditoria de preparação (docs/… não gerado; ver relatório
 * da conversa). SOMENTE LEITURA — não existe, neste bloco, nenhum modo que
 * escreva no banco.
 *
 *   npm run cutover:simulate
 *   npm run cutover:simulate -- --json
 *
 * Guardas:
 *   • CUTOVER_SIM_ENVIRONMENT precisa ser "local" ou "qa" (nunca inferido de
 *     NODE_ENV) — ver src/lib/cutover/environment-guard.ts. Recusa "production"
 *     e qualquer DATABASE_URL com cara de produção.
 *   • O client Prisma usado aqui passa por attachReadOnlyGuard: qualquer
 *     create/update/delete/upsert/*Many/executeRaw* lança antes de tocar o
 *     banco — ver src/lib/cutover/read-only-guard.ts.
 *
 * O que este script NÃO faz (e não fará até um bloco futuro com aprovação
 * explícita): não cria snapshot real, não copia nada para o allka_legacy,
 * não apaga nem modifica nenhuma linha, não publica/altera catalog2, não
 * faz backup, não faz deploy. Qualquer aplicação real vai exigir, no
 * mínimo: backup verificável, snapshot Legacy oficial SELADO, confirmação
 * textual explícita do responsável e ambiente autorizado — nenhum desses
 * quatro requisitos está implementado aqui de propósito.
 */
import { prisma } from "../lib/prisma";
import { assertCutoverSimulationAllowed, CutoverEnvironmentNotAllowed } from "../lib/cutover/environment-guard";
import { attachReadOnlyGuard, PrismaLikeClient } from "../lib/cutover/read-only-guard";
import { buildRetentionManifest, RetentionManifestError } from "../lib/cutover/retention-manifest";
import { buildDomainPlan, DomainPlanDb } from "../lib/cutover/domain-plan";
import { getForeignKeyDependencies, restrictedDependencies } from "../lib/cutover/dependency-graph";

function has(flag: string): boolean {
  return process.argv.includes(`--${flag}`);
}

async function main() {
  const environment = assertCutoverSimulationAllowed();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  attachReadOnlyGuard(prisma as unknown as PrismaLikeClient);
  const db = prisma;

  const manifest = await buildRetentionManifest(db);

  const retainedIds = {
    userIds: new Set(manifest.map((m) => m.user_id)),
    agencyIds: new Set(manifest.map((m) => m.linked_agency_id).filter((id): id is string => !!id)),
    companyIds: new Set(manifest.map((m) => m.linked_company_id).filter((id): id is string => !!id)),
    nomadeIds: new Set(manifest.map((m) => m.linked_nomade_id).filter((id): id is string => !!id)),
  };

  const plan = await buildDomainPlan(db as unknown as DomainPlanDb, retainedIds);
  const dependencies = await getForeignKeyDependencies(db);
  const restricted = restrictedDependencies(dependencies);

  const result = {
    generated_at: new Date().toISOString(),
    environment,
    mode: "plan" as const,
    can_apply: false,
    note:
      "Simulação de virada — SOMENTE LEITURA. Nenhum dado foi criado, copiado, alterado ou removido. " +
      "Uma futura aplicação real exigirá: backup verificável + snapshot Legacy oficial selado + " +
      "confirmação textual explícita + ambiente autorizado — nenhum dos quatro existe neste bloco.",
    retention_manifest: manifest,
    domain_plan: {
      rows: plan.rows,
      catalog2: plan.catalog2,
      legacy_gaps: plan.legacy_gaps,
    },
    dependencies: {
      total: dependencies.length,
      restrict_on_delete: restricted,
    },
  };

  if (has("json")) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log("\n════════ SIMULAÇÃO DE VIRADA LIMPA (SOMENTE LEITURA) ════════\n");
  console.log(`  Ambiente confirmado: ${environment}`);
  console.log("  ⚠  Nenhum dado foi criado, copiado, alterado ou removido nesta execução.\n");

  console.log("  ── Manifesto de retenção ──");
  for (const m of manifest) {
    console.log(`   • ${m.email}  (${m.role}/${m.account_type}, ${m.status})`);
    for (const r of m.minimal_required_records) console.log(`       + ${r}`);
  }

  console.log("\n  ── Plano de domínios ──");
  const byDomain = new Map<string, typeof plan.rows>();
  for (const r of plan.rows) byDomain.set(r.domain, [...(byDomain.get(r.domain) ?? []), r]);
  for (const [domain, rows] of byDomain) {
    console.log(`\n   ${domain}:`);
    for (const r of rows) {
      console.log(`     [${r.bucket.padEnd(18)}] ${r.table}: ${r.count}${r.legacy_covered ? "" : "  (Legacy NÃO cobre ainda)"}`);
    }
  }

  console.log("\n  ── catalog2 ──");
  console.log(`   • Produtos reais: ${plan.catalog2.real_products} (preservar, estrutura intacta)`);
  console.log(`   • Produtos [TESTE LOCAL]: ${plan.catalog2.test_local_products} (separados da comunicação dos 36)`);

  console.log("\n  ── Lacunas do Legacy (bloqueiam a limpeza) ──");
  if (plan.legacy_gaps.length === 0) {
    console.log("   (nenhuma)");
  } else {
    for (const g of plan.legacy_gaps) console.log(`   ⛔ ${g}`);
  }

  console.log(`\n  ── Dependências (FK que travam exclusão, ON DELETE RESTRICT) ──`);
  console.log(`   ${restricted.length} de ${dependencies.length} vínculos com as tabelas-núcleo`);
  for (const d of restricted) console.log(`     ${d.table}.${d.column} → ${d.references_table}.${d.references_column}`);

  console.log("\n────────────────────────────────────────────");
  console.log("Plano apenas. Nenhum modo de escrita existe neste bloco.\n");
}

main()
  .catch((err) => {
    if (err instanceof CutoverEnvironmentNotAllowed || err instanceof RetentionManifestError) {
      console.error(`❌ ${err.message}`);
    } else {
      console.error("❌", err instanceof Error ? err.message : err);
    }
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
