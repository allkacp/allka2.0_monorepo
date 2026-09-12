/**
 * Preenchimento PROVISÓRIO da estrutura de SIMULAÇÃO de precificação dos 36
 * produtos reais do catalog2 (reunião 10/09, "precificação... funcional
 * para teste"): Catalog2PricingSimulationSettings + prazo comercial
 * provisório por produto + backfill de effort_ambiguous.
 *
 *   npm run catalog2:fill-provisional-pricing-simulation -- --dry-run   (padrão)
 *   npm run catalog2:fill-provisional-pricing-simulation -- --apply
 *   npm run catalog2:fill-provisional-pricing-simulation -- --apply --json
 *
 * Dry-run não grava. Idempotente. Nunca sobrescreve prazo real
 * (base_commercial_deadline_days) nem tarefa human_reviewed. Nunca toca a
 * fixture "[TESTE LOCAL]". Nunca torna produto publicável/contratável (ver
 * computePricing/publishVersion — sem relação com este preenchimento).
 */
import { runProvisionalPricingSimulationFill } from "../lib/catalog2/fill-provisional-pricing-simulation";

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!hit) return undefined;
  const eq = hit.indexOf("=");
  return eq === -1 ? "" : hit.slice(eq + 1);
}

async function main() {
  const mode: "dry_run" | "apply" = arg("apply") !== undefined ? "apply" : "dry_run";
  console.log(`▶ Preenchimento provisório de SIMULAÇÃO de precificação (36 produtos reais) — modo ${mode.toUpperCase()}`);

  const r = await runProvisionalPricingSimulationFill({ mode });

  console.log("\n════════ RESULTADO ════════");
  console.log(`  Catalog2PricingSimulationSettings: ${r.settings_outcome === "created" ? "criada agora" : "já existia (preservada, não sobrescrita)"}`);
  console.log(`  Produtos avaliados: ${r.products_total}`);
  console.log(`  Prazo provisório preenchido agora: ${r.deadline_filled}`);
  console.log(`  Prazo já tinha valor REAL (preservado): ${r.deadline_skipped_has_real}`);
  console.log(`  Prazo já tinha valor PROVISÓRIO (idempotência): ${r.deadline_skipped_already_provisional}`);
  console.log(`  Tarefas com ambiguidade recalculada: ${r.ambiguous_updated}  ·  ambíguas (true): ${r.ambiguous_total_true}`);

  if (arg("json") !== undefined) console.log("\n" + JSON.stringify(r, null, 2));

  console.log("\n────────────────────────────────────────────");
  console.log(mode === "dry_run" ? "Nada foi gravado. Rode com --apply para preencher." : "Preenchimento concluído. Nenhum produto foi publicado nem aprovado comercialmente.");
}

main().catch((err) => {
  console.error("❌", err instanceof Error ? err.message : err);
  process.exit(1);
});
