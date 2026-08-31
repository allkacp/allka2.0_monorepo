import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  parseVariationsText,
  parseAddonsText,
  slugForProduct,
  pillarKeyFromLabel,
  categoryKeyFromLabel,
  type MainProductRow,
  type RoseRow,
} from "./import-sources";
import { deriveProduct } from "./import-products";

// Provas automatizadas do importador dos 36 produtos (sprint de produtos,
// bloco 4/6) — funções PURAS, sem banco e sem ler as planilhas reais.

function mainRow(over: Partial<MainProductRow> = {}): MainProductRow {
  return {
    index: 1,
    name: "Produto Exemplo",
    pillar_label: "A. Presença Digital e Conversão",
    category_label: "Performance",
    four_f: ["fundacao"],
    origin: "existente",
    price_min: 500,
    price_max: 900,
    cardapio_description: "Descrição da principal.",
    cardapio_variations_text: "",
    cardapio_addons_text: "",
    cardapio_ia_steps_text: "",
    ia_human_note: null,
    ...over,
  };
}
function roseRow(over: Partial<RoseRow> = {}): RoseRow {
  return {
    index: 1,
    pillar: "A",
    name: "Produto Exemplo",
    area: "",
    descricao_atualizada: "",
    variacoes_atualizadas: "",
    portfolio_material: "",
    ...over,
  };
}

describe("parseVariationsText — só estrutura o que é seguro", () => {
  it("1. texto vazio → sem variações, sem ambiguidade", () => {
    const r = parseVariationsText("");
    assert.equal(r.ambiguous, false);
    assert.deepEqual(r.structured, []);
  });
  it("2. padrão 'Nome (a / b / c)' vira estrutura", () => {
    const r = parseVariationsText("Formato (Quadrado / Story); Idioma (PT / EN)");
    assert.equal(r.ambiguous, false);
    assert.equal(r.structured.length, 2);
    assert.deepEqual(r.structured[0], { name: "Formato", options: ["Quadrado", "Story"] });
  });
  it("3. texto multi-linha → ambíguo e preservado", () => {
    const r = parseVariationsText("linha 1\nlinha 2 com regras");
    assert.equal(r.ambiguous, true);
    assert.deepEqual(r.structured, []);
    assert.match(r.raw, /linha 1/);
  });
  it("4. frase sem parênteses de opções → ambíguo (nada inventado)", () => {
    const r = parseVariationsText("depende do briefing e do volume contratado");
    assert.equal(r.ambiguous, true);
    assert.deepEqual(r.structured, []);
  });
  it("5. opção única não vira variação (precisa de 2+)", () => {
    const r = parseVariationsText("Plano (Único)");
    assert.equal(r.ambiguous, true);
  });
});

describe("parseAddonsText", () => {
  it("6. 'A; B; C' vira lista de nomes", () => {
    const r = parseAddonsText("Reunião extra; Versão em inglês; Entrega expressa");
    assert.equal(r.ambiguous, false);
    assert.deepEqual(r.structured, ["Reunião extra", "Versão em inglês", "Entrega expressa"]);
  });
  it("7. parágrafo longo → ambíguo e preservado", () => {
    const r = parseAddonsText("O cliente pode pedir ajustes conforme a necessidade do projeto e o escopo acordado na reunião inicial de briefing entre as partes");
    assert.equal(r.ambiguous, true);
  });
});

describe("slug / classificações", () => {
  it("8. slug é determinístico e prefixado pelo índice", () => {
    const a = slugForProduct(7, "SEO — Otimização para Buscadores");
    const b = slugForProduct(7, "SEO — Otimização para Buscadores");
    assert.equal(a, b);
    assert.match(a, /^p07-/);
  });
  it("9. rótulos conhecidos mapeiam para keys; desconhecido → null", () => {
    assert.equal(pillarKeyFromLabel("A. Presença Digital e Conversão"), "presenca_digital");
    assert.equal(categoryKeyFromLabel("Performance"), "performance");
    assert.equal(categoryKeyFromLabel("Categoria Inexistente"), null);
  });
});

describe("deriveProduct — política de combinação", () => {
  it("10. identidade, pilar, categoria e 4F sempre da planilha principal", () => {
    const d = deriveProduct(mainRow({ name: "Landing Page" }), roseRow({ name: "Landing Page", area: "Performance" }));
    assert.equal(d.source_key, "catalogo_v9:1");
    assert.equal(d.source_name, "Landing Page");
    assert.equal(d.pillar_key, "presenca_digital");
    assert.equal(d.category_key, "performance");
  });
  it("11. sem linha da Rose → pendência rose_review_pending e rose_reviewed=false", () => {
    const d = deriveProduct(mainRow(), undefined);
    assert.equal(d.rose_reviewed, false);
    assert.ok(d.pendencies.includes("rose_review_pending"));
  });
  it("12. descrição da Rose (quando preenchida) substitui a da principal; vazia não apaga", () => {
    const withRose = deriveProduct(mainRow(), roseRow({ descricao_atualizada: "Texto novo da Rose." }));
    assert.equal(withRose.version_description, "Texto novo da Rose.");
    const emptyRose = deriveProduct(mainRow(), roseRow({ descricao_atualizada: "" }));
    assert.equal(emptyRose.version_description, "Descrição da principal.");
  });
  it("13. 'Área' da Rose NUNCA vira categoria — vira divergência + decisão pendente", () => {
    const d = deriveProduct(
      mainRow({ name: "Copywriting", category_label: "Redação" }),
      roseRow({ name: "Copywriting", area: "Designer" }),
    );
    assert.equal(d.category_key, "redacao");
    assert.ok(d.divergences.some((x) => x.type === "area_vs_category" && x.decision_pending));
    assert.ok(d.pendencies.includes("classification_decision_pending"));
    assert.equal(d.area_rose, "Designer");
  });
  it("14. E-book: mantém categoria da principal e registra divergência 'Redação × Mídias'", () => {
    const d = deriveProduct(
      mainRow({ name: "E-book / Material Rico", category_label: "Redação" }),
      roseRow({ name: "E-book / Material Rico", area: "Mídias" }),
    );
    assert.equal(d.category_key, "redacao");
    assert.ok(d.divergences.some((x) => x.type === "ebook_classification" && x.decision_pending));
  });
  it("15. SEO → SEO + GEO: aplica nome revisado da Rose e preserva o anterior no histórico", () => {
    const d = deriveProduct(
      mainRow({ name: "SEO — Otimização para Buscadores" }),
      roseRow({ name: "SEO + GEO — Otimização para Buscadores e IA", descricao_atualizada: "" }),
    );
    assert.equal(d.version_title, "SEO + GEO — Otimização para Buscadores e IA");
    assert.equal(d.original_texts.original_product_name, "SEO — Otimização para Buscadores");
    assert.ok(d.divergences.some((x) => x.type === "name_updated_seo_geo"));
  });
  it("16. Card Post: inclui variação obrigatória 'Uso de IA na produção' sem efeito de preço", () => {
    const d = deriveProduct(mainRow({ name: "Card Post (Arte, Copy e Legenda)" }), undefined);
    const iaVar = d.variations.find((v) => /uso de ia/i.test(v.name));
    assert.ok(iaVar);
    assert.deepEqual(iaVar!.options, ["Autorizado", "Não autorizado"]);
  });
  it("17. variações em texto livre não estruturável → preservadas + content_review_pending", () => {
    const d = deriveProduct(mainRow({ cardapio_variations_text: "varia conforme o pacote\ne o número de páginas" }), undefined);
    assert.equal(d.variations.length, 0);
    assert.equal(d.original_texts.variations_raw, "varia conforme o pacote\ne o número de páginas");
    assert.ok(d.pendencies.includes("content_review_pending"));
  });
  it("18. 'Etapas Executáveis por IA' NÃO viram tarefas/etapas — texto preservado", () => {
    const d = deriveProduct(mainRow({ cardapio_ia_steps_text: "1. gerar rascunho com IA 2. revisar" }), undefined);
    assert.ok(d.pendencies.includes("content_review_pending"));
    assert.equal(d.original_texts.cardapio_ia_steps_text, "1. gerar rascunho com IA 2. revisar");
  });
  it("19. preço e prazo entram sempre pendentes; preço histórico é só referência", () => {
    const d = deriveProduct(mainRow({ price_min: 500, price_max: 900 }), undefined);
    assert.ok(d.pendencies.includes("price_pending"));
    assert.ok(d.pendencies.includes("deadline_pending"));
    assert.ok(d.pendencies.includes("portfolio_pending"));
    assert.equal(d.historical_price_min, 500);
    assert.equal(d.historical_price_max, 900);
  });
  it("20. portfólio ausente → pendência, sem imagem/link fictício", () => {
    const d = deriveProduct(mainRow(), roseRow({ portfolio_material: "" }));
    assert.ok(d.pendencies.includes("portfolio_pending"));
    assert.match(String(d.original_texts.portfolio_note), /não criar imagem\/link fictício|Pendente/i);
  });
  it("21. checksum é estável entre execuções e muda se a fonte muda", () => {
    const a = deriveProduct(mainRow({ name: "X" }), undefined);
    const b = deriveProduct(mainRow({ name: "X" }), undefined);
    const c = deriveProduct(mainRow({ name: "X", cardapio_description: "outra" }), undefined);
    assert.equal(a.checksum, b.checksum);
    assert.notEqual(a.checksum, c.checksum);
  });
  it("22. estado de preparo deriva das pendências (prioridade), nunca 'pronto' com pendência obrigatória", () => {
    const d = deriveProduct(mainRow({ cardapio_ia_steps_text: "passos" }), undefined);
    assert.equal(d.review_state, "content_review_pending");
    assert.notEqual(d.review_state, "ready_for_final_review");
  });
  it("23. campos da Rose vazios não apagam dados da principal", () => {
    const d = deriveProduct(
      mainRow({ cardapio_description: "principal", name: "P" }),
      roseRow({ name: "P", descricao_atualizada: "", variacoes_atualizadas: "", area: "" }),
    );
    assert.equal(d.version_description, "principal");
    assert.equal(d.divergences.length, 0);
  });
  it("24. adicionais viram só nomes (sem custo/efeito inventado)", () => {
    const d = deriveProduct(mainRow({ cardapio_addons_text: "Reunião extra; Versão em inglês" }), undefined);
    assert.deepEqual(d.addons, ["Reunião extra", "Versão em inglês"]);
  });
});
