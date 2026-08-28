/**
 * Relatório DRY-RUN das planilhas de produtos (sprint de produtos, bloco 2/6).
 *
 *   npm run catalog2:analyze-spreadsheets
 *   npm run catalog2:analyze-spreadsheets -- --dir "C:/caminho/para/as/planilhas"
 *   npm run catalog2:analyze-spreadsheets -- --json
 *
 * NÃO insere, atualiza nem desativa produto. Só lê os .xlsx e imprime o que
 * pode ser mapeado + as divergências entre a planilha principal e a
 * Review Rose. As planilhas ficam FORA do repositório.
 */
import fs from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";
import {
  analyzeMainCatalog,
  analyzeRoseReview,
  crossCheck,
  type Row,
} from "../catalog2/spreadsheet-analysis";

const MAIN_FILE = "Allka_Proposta_Catalogo_Produtos_v9.xlsx";
const ROSE_FILE = "Review Rose.xlsx";

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!hit) return undefined;
  const eq = hit.indexOf("=");
  return eq === -1 ? "" : hit.slice(eq + 1);
}

function sheet(wb: XLSX.WorkBook, name: string): Row[] {
  const ws = wb.Sheets[name];
  if (!ws) throw new Error(`Aba "${name}" não encontrada. Abas: ${wb.SheetNames.join(", ")}`);
  return XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false }) as Row[];
}

function main() {
  // Padrão: pasta pai do repo (allka-plataforma/), onde as planilhas ficam
  // (src/scripts → src → backend → apps → allka-2026 → allka-plataforma).
  const defaultDir = path.resolve(__dirname, "..", "..", "..", "..", "..");
  const dir = arg("dir") || defaultDir;
  const mainPath = path.join(dir, MAIN_FILE);
  const rosePath = path.join(dir, ROSE_FILE);

  for (const p of [mainPath, rosePath]) {
    if (!fs.existsSync(p)) {
      console.error(`❌ Planilha não encontrada: ${p}`);
      console.error(`   Coloque "${MAIN_FILE}" e "${ROSE_FILE}" nessa pasta (ou passe --dir).`);
      process.exit(1);
    }
  }

  const mainWb = XLSX.readFile(mainPath);
  const roseWb = XLSX.readFile(rosePath);

  const filterRows = sheet(mainWb, "Catálogo com Filtros");
  const cardapioRows = sheet(mainWb, "Cardápio — Descrição Completa");
  const roseRows = sheet(roseWb, roseWb.SheetNames[0]);

  const main = analyzeMainCatalog(filterRows, cardapioRows);
  const rose = analyzeRoseReview(roseRows);
  const cross = crossCheck(main, rose, cardapioRows);

  if (arg("json") !== undefined) {
    console.log(JSON.stringify({ main, rose, cross }, null, 2));
    return;
  }

  const rec = (r: Record<string, number>) =>
    Object.entries(r)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k}: ${v}`)
      .join(" · ");

  console.log("════════ PLANILHA PRINCIPAL — Allka_Proposta_Catalogo_Produtos_v9.xlsx ════════");
  console.log(`Produtos:                         ${main.total}`);
  console.log(`Mapeáveis para a estrutura nova:  ${main.mappable} / ${main.total}`);
  console.log(`Pilares:                          ${rec(main.pillars)}`);
  console.log(`4Fs (marcações):                  ${rec(main.four_f)}`);
  console.log(`Categorias:                       ${rec(main.categories)}`);
  console.log(`Origem:                           ${rec(main.origins)}`);
  console.log(`Com variações (Cardápio):         ${main.with_variations}`);
  console.log(`Com adicionais (Cardápio):        ${main.with_addons}`);
  console.log(`Com tarefas/etapas estruturadas:  ${main.with_structured_tasks}`);
  if (main.incomplete_or_ambiguous.length) {
    console.log(`\nLinhas com informação incompleta ou ambígua (${main.incomplete_or_ambiguous.length}):`);
    for (const i of main.incomplete_or_ambiguous) console.log(`  #${i.index} ${i.name} → ${i.issues.join("; ")}`);
  } else {
    console.log("\nNenhuma linha incompleta.");
  }

  console.log("\n════════ REVIEW ROSE — Review Rose.xlsx ════════");
  console.log(`Produtos revisados:               ${rose.reviewed_count}`);
  console.log(`Áreas (Rose):                     ${rec(rose.areas)}`);

  console.log("\n════════ CRUZAMENTO (não resolve nada — só registra) ════════");
  console.log(`Revisados (casados com a principal): ${cross.reviewed_products.length}`);
  console.log(`Ainda NÃO revisados:                 ${cross.not_reviewed_products.length}`);
  for (const n of cross.not_reviewed_products) console.log(`   • ${n}`);
  console.log(`\nDivergência "Área" (Rose) × "Categoria" (principal): ${cross.area_vs_category.length}`);
  for (const d of cross.area_vs_category) console.log(`   • ${d.product}: Rose="${d.rose_area}" vs principal="${d.main_category}"`);
  console.log(`\nSEO → SEO + GEO: ${cross.seo_to_seo_geo.length}`);
  for (const n of cross.seo_to_seo_geo) console.log(`   • ${n}`);
  console.log(`\nDivergência conhecida do E-book:`);
  for (const e of cross.ebook_divergence) {
    console.log(`   • ${e.product}`);
    console.log(`     classificação: principal="${e.main_category}"  vs  Rose="${e.rose_area}"`);
    console.log(`     variações principal: ${e.main_variations}`);
    console.log(`     variações Rose:      ${e.rose_variations.replace(/\s+/g, " ").slice(0, 200)}`);
    console.log(`     → ${e.note}`);
  }
  console.log(`\nCard Post — autorização de IA: ${cross.card_post_ia_authorization_note ?? "não observado"}`);
  console.log(`Portfólio ausente confirmado: ${cross.portfolio_absence_confirmed ? "SIM (todas as 21 linhas da Rose sem material de portfólio)" : "não"}`);
  if (cross.ambiguous_matches.length) {
    console.log(`\nCasamentos ambíguos (precisam de conferência humana):`);
    for (const a of cross.ambiguous_matches) console.log(`   • Rose "${a.rose_product}" ≈ principal "${a.best_main_guess ?? "(nenhum)"}"`);
  }

  console.log("\n────────────────────────────────────────────────────────────");
  console.log("Nenhum produto foi inserido, atualizado ou desativado. Relatório apenas.");
}

main();
