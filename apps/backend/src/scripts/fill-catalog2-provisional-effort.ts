/**
 * Preenchimento PROVISÓRIO de especialidade/tempo nas 102 tarefas dos 36
 * produtos reais do catalog2 (reunião 10/09, "36 produtos funcionalmente
 * completos para teste").
 *
 *   npm run catalog2:fill-provisional-effort -- --dry-run     (padrão)
 *   npm run catalog2:fill-provisional-effort -- --apply
 *   npm run catalog2:fill-provisional-effort -- --apply --json
 *
 * Dry-run não grava. Idempotente (tarefa já preenchida — por este script ou
 * por humano — nunca é sobrescrita). Nunca toca a fixture "[TESTE LOCAL]".
 * Nunca cria etapa/dependência. Nunca torna produto publicável/contratável
 * (ver computePricing/publishVersion — bloqueiam com effort_is_provisional).
 */
import { runProvisionalTaskEffortFill } from "../lib/catalog2/fill-provisional-task-effort";

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!hit) return undefined;
  const eq = hit.indexOf("=");
  return eq === -1 ? "" : hit.slice(eq + 1);
}

async function main() {
  const mode: "dry_run" | "apply" = arg("apply") !== undefined ? "apply" : "dry_run";
  console.log(`▶ Preenchimento provisório de esforço (36 produtos reais) — modo ${mode.toUpperCase()}`);

  const r = await runProvisionalTaskEffortFill({ mode });

  console.log("\n════════ RESULTADO ════════");
  console.log(`  Produtos avaliados: ${r.products_total}`);
  console.log(`  Tarefas avaliadas: ${r.tasks_total}`);
  console.log(`  Preenchidas agora: ${r.tasks_filled}  ·  Já tinham valor (idempotência): ${r.tasks_skipped_already_has_value}`);
  console.log(`  Ambíguas (revisão humana recomendada): ${r.tasks_ambiguous}`);
  if (r.minutes_range) console.log(`  Faixa de minutos: ${r.minutes_range.min}–${r.minutes_range.max}`);
  console.log("  Especialidades usadas:");
  for (const [key, count] of Object.entries(r.specialties_used).sort((a, b) => b[1] - a[1])) {
    console.log(`   • ${key}: ${count} tarefa(s)`);
  }

  const errors = r.lines.filter((l) => l.outcome === "error");
  if (errors.length > 0) {
    console.log("\n  ⚠ ERROS:");
    for (const e of errors) console.log(`   • ${e.product_name} / ${e.task_key}: ${e.error}`);
  }

  const ambiguous = r.lines.filter((l) => l.ambiguous);
  if (ambiguous.length > 0) {
    console.log("\n  ⚠ AMBÍGUAS (revisar manualmente):");
    for (const a of ambiguous) console.log(`   • ${a.product_name} / "${a.task_name}" → ${a.specialty_key} (${a.ambiguous_reason})`);
  }

  if (arg("json") !== undefined) console.log("\n" + JSON.stringify(r, null, 2));

  console.log("\n────────────────────────────────────────────");
  console.log(mode === "dry_run" ? "Nada foi gravado. Rode com --apply para preencher." : "Preenchimento concluído. Nenhum produto foi publicado.");
}

main().catch((err) => {
  console.error("❌", err instanceof Error ? err.message : err);
  process.exit(1);
});
