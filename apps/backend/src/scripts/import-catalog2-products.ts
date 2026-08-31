/**
 * Importador oficial dos 36 produtos definitivos (sprint de produtos, bloco 4/6).
 *
 *   npm run catalog2:import-products -- --dry-run     (padrão)
 *   npm run catalog2:import-products -- --apply
 *   npm run catalog2:import-products -- --apply --allow-refresh
 *   npm run catalog2:import-products -- --report
 *   npm run catalog2:import-products -- --dir "C:/caminho/das/planilhas"
 *
 * Dry-run NÃO grava. `--apply` é explícito e recusa host remoto. Idempotente.
 * NUNCA publica. NUNCA sobrescreve edição humana. NUNCA inventa preço/prazo/
 * conteúdo. As planilhas NÃO são copiadas para o repo.
 */
import path from "node:path";
import { runImport } from "../lib/catalog2/import-products";

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!hit) return undefined;
  const eq = hit.indexOf("=");
  return eq === -1 ? "" : hit.slice(eq + 1);
}

async function main() {
  const apply = arg("apply") !== undefined;
  const reportOnly = arg("report") !== undefined;
  const mode: "dry_run" | "apply" = apply && !reportOnly ? "apply" : "dry_run";
  // src/scripts → src → backend → apps → allka-2026 → allka-plataforma
  const dir = arg("dir") || path.resolve(__dirname, "..", "..", "..", "..", "..");

  console.log(`▶ Importação dos 36 produtos — modo ${mode.toUpperCase()} · pasta: ${dir}`);
  const r = await runImport({ mode, dir, allowRefresh: arg("allow-refresh") !== undefined });

  console.log("\n════════ FONTES ════════");
  console.log(`  Principal: ${r.sources.main.name}  sha256=${r.sources.main.checksum.slice(0, 16)}…  linhas=${r.sources.main.rows}`);
  console.log(`  Rose:      ${r.sources.rose.name}  sha256=${r.sources.rose.checksum.slice(0, 16)}…  linhas=${r.sources.rose.rows}`);
  console.log(`  Ata:       sha256=${r.sources.ata_checksum ? r.sources.ata_checksum.slice(0, 16) + "…" : "(não encontrada)"}`);
  console.log(`  Versão da regra: ${r.rule_version}`);
  console.log(`  Data: ${new Date().toISOString()}`);

  console.log("\n════════ RESULTADO ════════");
  console.log(`  Esperados: ${r.expected}  ·  Derivados da planilha: ${r.derived}`);
  console.log(`  Revisados pela Rose: ${r.rose_reviewed}  ·  Sem revisão: ${r.not_reviewed}`);
  if (mode === "apply") {
    console.log(`  Criados: ${r.created}  ·  Atualizados: ${r.updated}  ·  Inalterados: ${r.unchanged}`);
    console.log(`  Pulados (edição humana): ${r.skipped_human_edit}  ·  Divergências: ${r.divergence}  ·  Erros: ${r.errors}`);
    console.log(`  Lote: ${r.batch_id}`);
  } else {
    console.log(`  (dry-run — nada foi gravado)`);
    console.log(`  Divergências que exigem decisão: ${r.divergence}`);
  }

  console.log("\n════════ QUALIDADE ════════");
  const q = r.quality;
  console.log(`  Produtos: esperado ${q.expected_products} / encontrados ${q.found_products}`);
  console.log(`  Variações: ${q.variations}  ·  Opções: ${q.options}  ·  Adicionais: ${q.addons}`);
  console.log(`  Tarefas: ${q.tasks}  ·  Etapas: ${q.steps}  (não criadas nesta importação — texto de roadmap preservado)`);
  console.log(`  Conteúdo ambíguo: ${q.products_ambiguous_content}  ·  Sem preço: ${q.products_without_price}  ·  Sem prazo comercial: ${q.products_without_commercial_deadline}  ·  Sem portfólio: ${q.products_without_portfolio}`);
  console.log(`  Divergências categoria×área: ${q.category_area_divergences}`);
  if (q.decisions_needed.length) {
    console.log("\n  DECISÕES NECESSÁRIAS:");
    for (const d of q.decisions_needed) console.log(`   • ${d}`);
  }
  if (r.ambiguous_matches.length) {
    console.log("\n  Casamentos Rose ambíguos (não aplicados):");
    for (const a of r.ambiguous_matches) console.log(`   • Rose "${a.rose_name}" ≈ "${a.best_guess ?? "(nenhum)"}"`);
  }

  if (arg("json") !== undefined) console.log("\n" + JSON.stringify(r, null, 2));

  console.log("\n────────────────────────────────────────────");
  console.log(mode === "dry_run" ? "Nada foi gravado. Rode com --apply para importar." : "Importação concluída. Nenhum produto foi publicado.");
}

main().catch((err) => {
  console.error("❌", err instanceof Error ? err.message : err);
  process.exit(1);
});
