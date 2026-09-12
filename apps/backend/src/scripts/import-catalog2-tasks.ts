/**
 * Importador de tarefas/etapas dos 36 produtos reais do catalog2 (reunião
 * 10/09, "tarefas e etapas dos 36 produtos reais").
 *
 *   npm run catalog2:import-tasks -- --dry-run     (padrão)
 *   npm run catalog2:import-tasks -- --apply
 *   npm run catalog2:import-tasks -- --apply --json
 *
 * Fonte: `cardapio_ia_steps_text` ("Etapas Executáveis por IA"), já
 * preservado por produto em Catalog2ProductImportOrigin.original_texts_json
 * pela importação original dos 36 produtos — NÃO uma nova planilha. Dry-run
 * não grava. Idempotente (tarefa já existente nunca é recriada). Nunca
 * publica produto, nunca inventa especialidade/horas/dependências.
 */
import { runTasksImport } from "../lib/catalog2/import-tasks-from-steps-text";

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!hit) return undefined;
  const eq = hit.indexOf("=");
  return eq === -1 ? "" : hit.slice(eq + 1);
}

async function main() {
  const mode: "dry_run" | "apply" = arg("apply") !== undefined ? "apply" : "dry_run";
  console.log(`▶ Importação de tarefas/etapas (36 produtos reais) — modo ${mode.toUpperCase()}`);

  const r = await runTasksImport({ mode });

  console.log("\n════════ RESULTADO ════════");
  console.log(`  Produtos avaliados: ${r.products_total}`);
  console.log(`  Com tarefas ANTES: ${r.products_with_tasks_before}  ·  Com tarefas DEPOIS: ${r.products_with_tasks_after}`);
  console.log(`  Tarefas criadas: ${r.tasks_created_total}  ·  Já existentes (idempotência): ${r.tasks_already_existing_total}`);
  console.log(`  Pendência "content_review_pending" resolvida: ${r.content_pendency_cleared_count} produto(s)`);
  console.log(`  Pendência "task_effort_fields_pending" adicionada: ${r.effort_pendency_added_count} produto(s)`);
  if (r.products_no_source_text > 0) console.log(`  ⚠ Sem texto de etapas na fonte: ${r.products_no_source_text} produto(s)`);
  if (r.products_no_draft_version > 0) console.log(`  ⚠ Sem versão em rascunho: ${r.products_no_draft_version} produto(s)`);

  const truncated = r.lines.filter((l) => l.truncated_names.length > 0);
  if (truncated.length > 0) {
    console.log("\n  ⚠ Nomes de tarefa truncados (texto integral preservado em description):");
    for (const l of truncated) console.log(`   • ${l.product_name}: ${l.truncated_names.length} nome(s)`);
  }

  if (arg("json") !== undefined) console.log("\n" + JSON.stringify(r, null, 2));

  console.log("\n────────────────────────────────────────────");
  console.log(mode === "dry_run" ? "Nada foi gravado. Rode com --apply para importar." : "Importação concluída. Nenhum produto foi publicado.");
}

main().catch((err) => {
  console.error("❌", err instanceof Error ? err.message : err);
  process.exit(1);
});
