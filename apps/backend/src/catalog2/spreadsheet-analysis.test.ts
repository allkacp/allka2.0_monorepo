import assert from "node:assert/strict";
import { test } from "node:test";
import { analyzeMainCatalog, analyzeRoseReview, crossCheck, type Row } from "./spreadsheet-analysis";

// Análise dry-run das planilhas de produtos (sprint de produtos, bloco 2/6).
// Funções PURAS — nenhum acesso a banco, nada é gravado.

const FILTER_HEADER: Row = ["#", "Pilar (interno)", "Produto", "Categoria Padrão", "Fundação", "Fluxo", "Força", "Fidelização", "Origem"];
const filterRows: Row[] = [
  FILTER_HEADER,
  [1, "A. Presença Digital e Conversão", "SEO — Otimização para Buscadores", "Performance", "X", "X", null, null, "Existente"],
  [2, "C. Redes Sociais e Conteúdo", "Card Post (Arte, Copy e Legenda)", "Design", null, "X", "X", "X", "Existente"],
  [3, "B. Captação de Leads", "E-book / Material Rico para Captação de Leads", "Redação", "X", null, null, null, "Existente"],
  [4, "D. Branding e Design", "Produto sem fase", null, null, null, null, null, "NOVO"],
];

const CARDAPIO: Row[] = [
  ["Cardápio de Produtos"],
  ["nota interna"],
  ["#", "Pilar", "Produto", "Descrição Completa (o que inclui)", "Variações (dentro do produto)", "Adicionais (add-ons)", "Etapas Executáveis por IA (interno)"],
  [1, "A", "SEO — Otimização para Buscadores", "Otimização técnica...", "Número de páginas (até 10 / até 20 / até 50).", "Pesquisa de palavras-chave.", "Rodar auditoria; gerar meta descriptions."],
  [2, "C", "Card Post (Arte, Copy e Legenda)", "Peça de comunicação...", "Formato (Estático / Carrossel).", "Legenda extra.", "Gerar variações de copy."],
  [3, "B", "E-book / Material Rico para Captação de Leads", "Criação de e-book...", "Número de páginas (até 50 / até 150).", "Design de capa.", "Gerar sumário; revisar."],
];

const ROSE_HEADER: Row = ["Pilar", "Produto", "Área", "Descrição Atualizada", "Variações Atualizadas", "Material para portfólio "];
const roseRows: Row[] = [
  ROSE_HEADER,
  ["C. Redes Sociais e Conteúdo", "Card Post (Arte, Copy e Legenda)", "Mídias", "Peça... No momento da contratação é possível indicar se o uso de Inteligência Artificial está autorizado ou não.", "Formato / Escopo / Uso de IA: Autorizado / Não autorizado", ""],
  ["A. Presença Digital", "SEO E GEO — Otimização para Buscadores e IA", "Performance", "Otimização com foco em SEO e GEO (Generative Engine Optimization)...", "Número de páginas (até 10 / até 20 / até 50).", ""],
  ["B. Captação de Leads", "E-book / Material Rico", "Mídias", "Criação de e-book...", "Número de páginas (até 50 / até 150).", ""],
];

test("analyzeMainCatalog: conta produtos, pilares, 4Fs, categorias, origem; marca linha sem fase como incompleta", () => {
  const m = analyzeMainCatalog(filterRows, CARDAPIO);
  assert.equal(m.total, 4);
  assert.equal(m.pillars["A. Presença Digital e Conversão"], 1);
  assert.equal(m.categories["Performance"], 1);
  assert.equal(m.origins["NOVO"], 1);
  assert.equal(m.four_f["Fluxo"], 2);
  // Produto 4 não tem pilar-categoria-fase nem linha no cardápio → incompleto.
  const inc = m.incomplete_or_ambiguous.map((x) => x.name);
  assert.ok(inc.includes("Produto sem fase"));
  assert.equal(m.mappable, 3);
  assert.equal(m.with_variations, 3); // os 3 do cardápio
  assert.equal(m.with_addons, 3);
});

test("analyzeRoseReview: conta revisados e áreas, detecta GEO e menção de autorização de IA", () => {
  const r = analyzeRoseReview(roseRows);
  assert.equal(r.reviewed_count, 3);
  assert.equal(r.areas["Mídias"], 2);
  assert.equal(r.products.filter((p) => p.has_geo).length, 1);
  assert.ok(r.products.some((p) => p.mentions_ia_authorization));
  assert.ok(r.products.every((p) => !p.has_portfolio));
});

test("crossCheck: separa revisados/não-revisados, aponta Área×Categoria, SEO→SEO+GEO, E-book e portfólio ausente", () => {
  const m = analyzeMainCatalog(filterRows, CARDAPIO);
  const r = analyzeRoseReview(roseRows);
  const c = crossCheck(m, r, CARDAPIO);

  assert.equal(c.reviewed_products.length, 3);
  assert.equal(c.not_reviewed_products.length, 1); // "Produto sem fase" não está na Rose
  assert.ok(c.not_reviewed_products.includes("Produto sem fase"));

  // Card Post: Rose="Mídias" vs principal="Design" → divergência.
  assert.ok(c.area_vs_category.some((d) => /Card Post/.test(d.product) && d.rose_area === "Mídias"));

  assert.ok(c.seo_to_seo_geo.length >= 1);
  assert.equal(c.ebook_divergence.length, 1);
  assert.equal(c.ebook_divergence[0].rose_area, "Mídias");
  assert.equal(c.portfolio_absence_confirmed, true);
  assert.ok(c.card_post_ia_authorization_note);
});
