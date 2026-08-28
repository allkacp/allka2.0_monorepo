// Análise em DRY-RUN das planilhas de produtos (sprint de produtos, bloco
// 2/6). Funções PURAS sobre linhas já parseadas — nenhuma escrita no banco,
// nunca insere/atualiza/desativa produto. O CLI
// (scripts/analyze-catalog-spreadsheets.ts) lê os .xlsx e chama estas.
//
// As planilhas de referência ficam FORA do repositório (pasta
// `allka-plataforma/`, ao lado de `allka-2026/`) — nunca são copiadas nem
// versionadas.

export type Row = (string | number | null | undefined)[];

function norm(v: unknown): string {
  return String(v ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
function tokens(v: unknown): Set<string> {
  return new Set(norm(v).split(" ").filter((t) => t.length > 3));
}
function overlap(a: Set<string>, b: Set<string>): number {
  let n = 0;
  for (const t of a) if (b.has(t)) n++;
  return n;
}

// ── Planilha principal ("Catálogo com Filtros" + "Cardápio — Descrição Completa") ──

export interface MainProduct {
  index: number;
  name: string;
  pillar: string | null;
  category: string | null;
  four_f: string[];
  origin: string | null;
  has_variations: boolean;
  has_addons: boolean;
  has_structured_tasks: boolean;
  incomplete: string[];
}

export interface MainAnalysis {
  total: number;
  mappable: number;
  pillars: Record<string, number>;
  four_f: Record<string, number>;
  categories: Record<string, number>;
  origins: Record<string, number>;
  with_variations: number;
  with_addons: number;
  with_structured_tasks: number;
  incomplete_or_ambiguous: Array<{ index: number; name: string; issues: string[] }>;
  products: MainProduct[];
}

/**
 * `filterRows` = linhas de "Catálogo com Filtros" (header na linha 0).
 * `cardapioRows` = linhas de "Cardápio — Descrição Completa" (header em índice 2).
 */
export function analyzeMainCatalog(filterRows: Row[], cardapioRows: Row[]): MainAnalysis {
  const dataRows = filterRows.slice(1).filter((r) => r && r[0] != null && String(r[2] ?? "").trim());

  // Índice do cardápio por nome normalizado: col 3=descrição, 4=variações, 5=adicionais, 6=etapas IA.
  const cardapio = new Map<string, { desc: string; vars: string; addons: string; ia: string }>();
  for (const r of cardapioRows) {
    const name = String(r?.[2] ?? "").trim();
    if (!name || norm(name) === "produto") continue;
    cardapio.set(norm(name), {
      desc: String(r?.[3] ?? "").trim(),
      vars: String(r?.[4] ?? "").trim(),
      addons: String(r?.[5] ?? "").trim(),
      ia: String(r?.[6] ?? "").trim(),
    });
  }

  const products: MainProduct[] = dataRows.map((r) => {
    const name = String(r[2]).trim();
    const pillar = r[1] ? String(r[1]).trim() : null;
    const category = r[3] ? String(r[3]).trim() : null;
    const four_f: string[] = [];
    if (String(r[4] ?? "").trim().toUpperCase() === "X") four_f.push("Fundação");
    if (String(r[5] ?? "").trim().toUpperCase() === "X") four_f.push("Fluxo");
    if (String(r[6] ?? "").trim().toUpperCase() === "X") four_f.push("Força");
    if (String(r[7] ?? "").trim().toUpperCase() === "X") four_f.push("Fidelização");
    const origin = r[8] ? String(r[8]).trim() : null;

    const card = cardapio.get(norm(name));
    const has_variations = !!card && card.vars.length > 0;
    const has_addons = !!card && card.addons.length > 0;
    const has_structured_tasks = !!card && card.ia.length > 0;

    const incomplete: string[] = [];
    if (!pillar) incomplete.push("sem pilar");
    if (!category) incomplete.push("sem categoria");
    if (four_f.length === 0) incomplete.push("sem marcação de fase 4Fs");
    if (!card) incomplete.push("sem linha no Cardápio (descrição/variações/adicionais)");
    else {
      if (!card.desc) incomplete.push("Cardápio sem descrição");
      if (!card.vars) incomplete.push("Cardápio sem variações");
    }

    return {
      index: Number(r[0]),
      name,
      pillar,
      category,
      four_f,
      origin,
      has_variations,
      has_addons,
      has_structured_tasks,
      incomplete,
    };
  });

  const bump = (rec: Record<string, number>, k: string | null) => {
    const key = k ?? "(vazio)";
    rec[key] = (rec[key] ?? 0) + 1;
  };
  const pillars: Record<string, number> = {};
  const four_f: Record<string, number> = {};
  const categories: Record<string, number> = {};
  const origins: Record<string, number> = {};
  for (const p of products) {
    bump(pillars, p.pillar);
    bump(categories, p.category);
    bump(origins, p.origin);
    if (p.four_f.length === 0) bump(four_f, null);
    for (const f of p.four_f) bump(four_f, f);
  }

  return {
    total: products.length,
    mappable: products.filter((p) => p.incomplete.length === 0).length,
    pillars,
    four_f,
    categories,
    origins,
    with_variations: products.filter((p) => p.has_variations).length,
    with_addons: products.filter((p) => p.has_addons).length,
    with_structured_tasks: products.filter((p) => p.has_structured_tasks).length,
    incomplete_or_ambiguous: products
      .filter((p) => p.incomplete.length > 0)
      .map((p) => ({ index: p.index, name: p.name, issues: p.incomplete })),
    products,
  };
}

// ── Review Rose ────────────────────────────────────────────────────────

export interface RoseReview {
  reviewed_count: number;
  areas: Record<string, number>;
  products: Array<{
    pillar: string;
    name: string;
    area: string;
    variations_text: string;
    has_portfolio: boolean;
    has_geo: boolean;
    mentions_ia_authorization: boolean;
  }>;
}

/** `roseRows` = aba "review" (header na linha 0). */
export function analyzeRoseReview(roseRows: Row[]): RoseReview {
  const data = roseRows.slice(1).filter((r) => r && String(r[1] ?? "").trim());
  const areas: Record<string, number> = {};
  const products = data.map((r) => {
    const area = String(r[2] ?? "").trim() || "(vazio)";
    areas[area] = (areas[area] ?? 0) + 1;
    const desc = String(r[3] ?? "");
    const vars = String(r[4] ?? "");
    const name = String(r[1] ?? "").trim();
    return {
      pillar: String(r[0] ?? "").trim(),
      name,
      area,
      variations_text: vars.trim(),
      has_portfolio: String(r[5] ?? "").trim().length > 0,
      has_geo: /\bgeo\b/i.test(name + " " + desc + " " + vars),
      mentions_ia_authorization: /uso de ia|ia.{0,20}autoriz|autoriz.{0,20}ia/i.test(desc + " " + vars),
    };
  });
  return { reviewed_count: products.length, areas, products };
}

// ── Cruzamento (não resolve nada — só registra) ────────────────────────

export interface CrossCheck {
  reviewed_products: string[];
  not_reviewed_products: string[];
  area_vs_category: Array<{ product: string; rose_area: string; main_category: string }>;
  seo_to_seo_geo: string[];
  ebook_divergence: Array<{
    product: string;
    main_category: string;
    rose_area: string;
    main_variations: string;
    rose_variations: string;
    note: string;
  }>;
  card_post_ia_authorization_note: string | null;
  portfolio_absence_confirmed: boolean;
  ambiguous_matches: Array<{ rose_product: string; best_main_guess: string | null }>;
}

export function crossCheck(main: MainAnalysis, rose: RoseReview, cardapioRows: Row[]): CrossCheck {
  const cardapioVars = new Map<string, string>();
  for (const r of cardapioRows) {
    const name = String(r?.[2] ?? "").trim();
    if (name && norm(name) !== "produto") cardapioVars.set(norm(name), String(r?.[4] ?? "").trim());
  }

  // Casa cada produto revisado da Rose com o mais próximo da planilha principal.
  const mainNames = main.products.map((p) => p.name);
  const matched = new Map<string, string>(); // main name -> rose name
  const ambiguous: CrossCheck["ambiguous_matches"] = [];
  for (const rp of rose.products) {
    let best: string | null = null;
    let bestScore = 0;
    const rt = tokens(rp.name);
    for (const mn of mainNames) {
      const s = overlap(rt, tokens(mn));
      if (s > bestScore) {
        bestScore = s;
        best = mn;
      }
    }
    if (best && bestScore >= 2) matched.set(best, rp.name);
    else ambiguous.push({ rose_product: rp.name, best_main_guess: best });
  }

  const reviewed = [...matched.keys()];
  const notReviewed = mainNames.filter((n) => !matched.has(n));

  const areaVsCategory: CrossCheck["area_vs_category"] = [];
  for (const [mn, rn] of matched) {
    const mp = main.products.find((p) => p.name === mn)!;
    const rp = rose.products.find((p) => p.name === rn)!;
    const cat = norm(mp.category);
    const area = norm(rp.area);
    // Só "designer" == "design" é um sinônimo aceito. "Mídias" é um recorte
    // diferente (não bate com "Redação" nem "Design"): sempre reportado para
    // decisão humana. Nunca escolhemos um lado.
    const equivalent = area === cat || (area === "designer" && cat === "design");
    if (!equivalent) areaVsCategory.push({ product: mn, rose_area: rp.area, main_category: mp.category ?? "(vazio)" });
  }

  const seoGeo = rose.products
    .filter((p) => p.has_geo)
    .map((p) => p.name);

  const ebookDivergence: CrossCheck["ebook_divergence"] = [];
  for (const [mn, rn] of matched) {
    if (!/e-?book/i.test(mn) && !/e-?book/i.test(rn)) continue;
    const rp = rose.products.find((p) => p.name === rn)!;
    const mp = main.products.find((p) => p.name === mn)!;
    const mainVars = cardapioVars.get(norm(mn)) ?? "(não encontrado no Cardápio)";
    const roseVars = rp.variations_text || "(vazio)";
    ebookDivergence.push({
      product: mn,
      main_category: mp.category ?? "(vazio)",
      rose_area: rp.area,
      main_variations: mainVars,
      rose_variations: roseVars,
      note:
        norm(mainVars) === norm(roseVars)
          ? "Variações batem. Divergência conhecida: classificação diferente entre as planilhas — decidir manualmente."
          : "Variações e classificação divergentes — decidir manualmente. Não resolvido aqui.",
    });
  }

  const cardPost = rose.products.find((p) => /card post/i.test(p.name) && p.mentions_ia_authorization);

  return {
    reviewed_products: reviewed.sort(),
    not_reviewed_products: notReviewed.sort(),
    area_vs_category: areaVsCategory,
    seo_to_seo_geo: seoGeo,
    ebook_divergence: ebookDivergence,
    card_post_ia_authorization_note: cardPost
      ? "Review Rose adiciona ao Card Post a escolha, na contratação, de autorizar ou não o uso de IA na produção da peça — sem interferir na precificação principal."
      : null,
    portfolio_absence_confirmed: rose.products.every((p) => !p.has_portfolio),
    ambiguous_matches: ambiguous,
  };
}
