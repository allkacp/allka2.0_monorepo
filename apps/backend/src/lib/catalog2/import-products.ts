// Importador oficial dos 36 produtos definitivos (sprint de produtos, bloco
// 4/6). Dry-run por padrão; `--apply` explícito. Idempotente por
// `source_key`. NUNCA publica, NUNCA sobrescreve edição humana, NUNCA
// inventa preço/prazo/conteúdo, NUNCA esconde divergência.

import crypto from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { assertLocalDatabase } from "../assert-local-database";
import { hashPayload } from "../canonical-json";
import { seedCatalog2Classifications } from "../catalog2-classifications-seed";
import {
  IMPORT_RULE_VERSION,
  loadSources,
  parseAddonsText,
  parseVariationsText,
  pillarKeyFromLabel,
  categoryKeyFromLabel,
  slugForProduct,
  type LoadedSources,
  type MainProductRow,
  type RoseRow,
} from "./import-sources";

export interface ImportOptions {
  mode: "dry_run" | "apply";
  dir: string;
  actorUserId?: string | null;
  /** Permite RE-importar (atualizar rascunhos) quando a fonte mudou. */
  allowRefresh?: boolean;
}

interface DerivedProduct {
  source_index: number;
  source_key: string;
  source_name: string; // identidade — sempre da planilha principal
  slug: string;
  pillar_key: string | null;
  category_key: string | null;
  four_f: string[];
  origin: string;
  rose_reviewed: boolean;
  area_rose: string | null;
  // conteúdo da VERSÃO rascunho
  version_title: string;
  version_description: string;
  variations: Array<{ name: string; options: string[] }>;
  addons: string[];
  // preservados
  original_texts: Record<string, unknown>;
  historical_price_min: number | null;
  historical_price_max: number | null;
  main_fields: Record<string, unknown>;
  rose_fields: Record<string, unknown>;
  divergences: Array<{ type: string; detail: string; decision_pending: boolean }>;
  warnings: string[];
  pendencies: string[];
  review_state: string;
  checksum: string;
}

function isSeoProduct(name: string): boolean {
  return /\bseo\b/i.test(name);
}
function isEbook(name: string): boolean {
  return /e-?book/i.test(name);
}
function isCardPost(name: string): boolean {
  return /card post/i.test(name);
}
function areaMatchesCategory(area: string, categoryKey: string | null): boolean {
  const a = area
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
  if (!a || !categoryKey) return true;
  if (a === "designer" && categoryKey === "design") return true;
  if (a === "performance" && categoryKey === "performance") return true;
  if (a === "solucoes web" && categoryKey === "solucoes_web") return true;
  if (a === "redacao" && categoryKey === "redacao") return true;
  return false;
}

const PENDENCY_PRIORITY = [
  "content_review_pending",
  "classification_decision_pending",
  "price_pending",
  "deadline_pending",
  "portfolio_pending",
  "rose_review_pending",
];

function reviewStateFrom(pendencies: string[]): string {
  for (const p of PENDENCY_PRIORITY) if (pendencies.includes(p)) return p;
  return "ready_for_final_review";
}

export function deriveProduct(main: MainProductRow, rose: RoseRow | undefined): DerivedProduct {
  const source_key = `catalogo_v9:${main.index}`;
  const slug = slugForProduct(main.index, main.name);
  const pillar_key = pillarKeyFromLabel(main.pillar_label);
  const category_key = categoryKeyFromLabel(main.category_label);

  const divergences: DerivedProduct["divergences"] = [];
  const warnings: string[] = [];
  const pendencies: string[] = [];
  const original_texts: Record<string, unknown> = {
    cardapio_variations_text: main.cardapio_variations_text || null,
    cardapio_addons_text: main.cardapio_addons_text || null,
    cardapio_ia_steps_text: main.cardapio_ia_steps_text || null,
    ia_human_note: main.ia_human_note || null,
  };
  const rose_fields: Record<string, unknown> = {};

  // ── Identidade + classificação (sempre da principal) ──────────────
  if (!pillar_key) warnings.push(`Pilar "${main.pillar_label}" não mapeado.`);
  if (!category_key) warnings.push(`Categoria "${main.category_label}" não mapeada.`);

  // ── Título e descrição comerciais ───────────────────────────────
  let version_title = main.name;
  let version_description = main.cardapio_description;

  const rose_reviewed = !!rose;
  const area_rose = rose?.area || null;

  if (rose) {
    if (rose.descricao_atualizada) {
      version_description = rose.descricao_atualizada;
      rose_fields.descricao_atualizada = rose.descricao_atualizada;
    }
    // SEO → SEO + GEO: aplica o nome comercial revisado, PRESERVA o anterior.
    if (isSeoProduct(main.name) && rose.name && rose.name.trim() !== main.name) {
      original_texts.original_product_name = main.name;
      version_title = rose.name.trim();
      rose_fields.name_updated = rose.name.trim();
      divergences.push({ type: "name_updated_seo_geo", detail: `Nome comercial atualizado pela Rose: "${main.name}" → "${rose.name.trim()}" (identidade interna mantida).`, decision_pending: false });
    }
    // "Área" da Rose NUNCA sobrescreve a categoria.
    if (area_rose && !areaMatchesCategory(area_rose, category_key)) {
      if (isEbook(main.name)) {
        divergences.push({ type: "ebook_classification", detail: `E-book: categoria da principal mantida (${main.category_label}); Review Rose classifica como "${area_rose}". Divergência "Redação × Mídias" — DECISÃO PENDENTE.`, decision_pending: true });
      } else {
        divergences.push({ type: "area_vs_category", detail: `Área da Rose ("${area_rose}") ≠ categoria da principal ("${main.category_label}"). "Área" preservada como sugestão; categoria NÃO alterada — DECISÃO PENDENTE.`, decision_pending: true });
      }
      pendencies.push("classification_decision_pending");
    }
  } else {
    pendencies.push("rose_review_pending");
  }

  // ── Variações ──────────────────────────────────────────────────
  let variations: Array<{ name: string; options: string[] }> = [];
  const roseVarParse = rose?.variacoes_atualizadas ? parseVariationsText(rose.variacoes_atualizadas) : null;
  const mainVarParse = parseVariationsText(main.cardapio_variations_text);
  if (roseVarParse && !roseVarParse.ambiguous && roseVarParse.structured.length > 0) {
    variations = roseVarParse.structured;
    rose_fields.variacoes_atualizadas = rose!.variacoes_atualizadas;
  } else if (!mainVarParse.ambiguous && mainVarParse.structured.length > 0) {
    variations = mainVarParse.structured;
  } else {
    // Texto não estruturável com segurança — preserva, marca pendência.
    original_texts.variations_raw = roseVarParse?.raw || mainVarParse.raw || null;
    if ((roseVarParse?.ambiguous || mainVarParse.ambiguous) && (roseVarParse?.raw || mainVarParse.raw)) {
      warnings.push("Texto de variações não pôde ser estruturado com segurança — preservado integralmente.");
      pendencies.push("content_review_pending");
    }
  }

  // ── Card Post: autorização de IA como informação obrigatória ─────
  if (isCardPost(main.name)) {
    if (!variations.some((v) => /uso de ia|ia/i.test(v.name))) {
      variations.push({ name: "Uso de IA na produção", options: ["Autorizado", "Não autorizado"] });
    }
    original_texts.card_post_ia_note = "Escolha obrigatória na contratação. Sem impacto automático no preço enquanto a regra não for definida.";
    warnings.push("Card Post: 'Uso de IA' incluído como variação obrigatória, sem efeito de preço.");
  }

  // ── Adicionais (só nomes; nunca custo/efeito inventado) ─────────
  const addonsParse = parseAddonsText(main.cardapio_addons_text);
  let addons: string[] = [];
  if (!addonsParse.ambiguous && addonsParse.structured.length > 0) {
    addons = addonsParse.structured;
  } else if (addonsParse.ambiguous && addonsParse.raw) {
    original_texts.addons_raw = addonsParse.raw;
    warnings.push("Texto de adicionais não pôde ser estruturado — preservado integralmente.");
    pendencies.push("content_review_pending");
  }

  // ── Tarefas/etapas: NÃO criadas nesta importação ───────────────
  if (main.cardapio_ia_steps_text) {
    warnings.push("As 'Etapas Executáveis por IA' são texto de roadmap interno — NÃO viraram tarefas/etapas; preservadas para revisão.");
    pendencies.push("content_review_pending");
  }

  // ── Preço e prazo: sempre pendentes nesta fase ─────────────────
  pendencies.push("price_pending"); // sem valor/hora nem % definidos
  pendencies.push("deadline_pending"); // sem prazo comercial base
  pendencies.push("portfolio_pending"); // Rose sem material de portfólio
  original_texts.portfolio_note = "Sem material de portfólio na Review Rose. Pendente — não criar imagem/link fictício.";

  const historical_price_min = main.price_min;
  const historical_price_max = main.price_max;

  const main_fields: Record<string, unknown> = {
    name: main.name,
    pillar: main.pillar_label,
    category: main.category_label,
    four_f: main.four_f,
    origin: main.origin,
    cardapio_description: main.cardapio_description || null,
  };

  const uniquePendencies = [...new Set(pendencies)];
  const review_state = reviewStateFrom(uniquePendencies);

  const checksumInput = {
    slug,
    pillar_key,
    category_key,
    four_f: [...main.four_f].sort(),
    origin: main.origin,
    version_title,
    version_description,
    variations,
    addons,
    historical_price_min,
    historical_price_max,
    rose_reviewed,
    area_rose,
    rule: IMPORT_RULE_VERSION,
  };

  return {
    source_index: main.index,
    source_key,
    source_name: main.name,
    slug,
    pillar_key,
    category_key,
    four_f: main.four_f,
    origin: main.origin,
    rose_reviewed,
    area_rose,
    version_title,
    version_description,
    variations,
    addons,
    original_texts,
    historical_price_min,
    historical_price_max,
    main_fields,
    rose_fields,
    divergences,
    warnings,
    pendencies: uniquePendencies,
    review_state,
    checksum: hashPayload(checksumInput),
  };
}

// ── Aplicação idempotente ───────────────────────────────────────────

export interface LineResult {
  source_index: number;
  source_name: string;
  slug: string;
  outcome: "created" | "updated" | "unchanged" | "skipped_human_edit" | "divergence" | "error";
  product_id: string | null;
  version_id: string | null;
  rose_reviewed: boolean;
  pendencies: string[];
  divergences: DerivedProduct["divergences"];
  warnings: string[];
  errors: string[];
}

export interface ImportRunResult {
  mode: string;
  rule_version: string;
  batch_id: string | null;
  sources: {
    dir: string;
    main: { name: string; checksum: string; rows: number };
    rose: { name: string; checksum: string; rows: number };
    ata_checksum: string | null;
  };
  expected: number;
  derived: number;
  created: number;
  updated: number;
  unchanged: number;
  skipped_human_edit: number;
  divergence: number;
  errors: number;
  rose_reviewed: number;
  not_reviewed: number;
  ambiguous_matches: LoadedSources["ambiguousMatches"];
  quality: QualityReport;
  lines: LineResult[];
}

export interface QualityReport {
  expected_products: number;
  found_products: number;
  rose_reviewed: number;
  not_reviewed: number;
  variations: number;
  options: number;
  addons: number;
  tasks: number;
  steps: number;
  execution_human: number;
  execution_ia: number;
  execution_hybrid: number;
  products_ambiguous_content: number;
  products_without_price: number;
  products_without_commercial_deadline: number;
  products_without_portfolio: number;
  category_area_divergences: number;
  decisions_needed: string[];
  errors: string[];
  warnings: string[];
  checksums: { main: string; rose: string; ata: string | null };
}

async function resolvePillarCat(db: PrismaClient) {
  const pillars = new Map((await db.catalog2Pillar.findMany()).map((p) => [p.key, p.id]));
  const cats = new Map((await db.catalog2Category.findMany()).map((c) => [c.key, c.id]));
  const fourF = new Map((await db.catalog2FourF.findMany()).map((f) => [f.key, f.id]));
  return { pillars, cats, fourF };
}

type ClassMaps = { pillars: Map<string, string>; cats: Map<string, string>; fourF: Map<string, string> };

// Reaplica pilar/categoria/4F do produto a partir da planilha principal.
// Usado na criação E na reimportação (a classificação nunca vem da Rose).
async function writeProductClassifications(db: PrismaClient, productId: string, d: DerivedProduct, maps: ClassMaps) {
  await db.catalog2Product.update({
    where: { id: productId },
    data: {
      pillar_id: d.pillar_key ? maps.pillars.get(d.pillar_key) ?? null : null,
      category_id: d.category_key ? maps.cats.get(d.category_key) ?? null : null,
      origin: d.origin,
    },
  });
  const wantIds = d.four_f.map((k) => maps.fourF.get(k)).filter((x): x is string => !!x);
  await db.catalog2ProductFourF.deleteMany({ where: { product_id: productId } });
  for (const four_f_id of wantIds) await db.catalog2ProductFourF.create({ data: { product_id: productId, four_f_id } });
}

async function writeDraftContent(
  db: PrismaClient,
  versionId: string,
  d: DerivedProduct,
) {
  await db.catalog2ProductVersion.update({
    where: { id: versionId },
    data: { title: d.version_title, summary: d.version_description.slice(0, 500) || null, full_description: d.version_description || null },
  });
  // Reconstrói variações e adicionais a partir da fonte (o rascunho ainda não
  // foi editado por humano — garantido pelo chamador).
  await db.catalog2Variation.deleteMany({ where: { version_id: versionId } });
  await db.catalog2Addon.deleteMany({ where: { version_id: versionId } });
  for (let vi = 0; vi < d.variations.length; vi++) {
    const va = d.variations[vi];
    await db.catalog2Variation.create({
      data: {
        version_id: versionId,
        key: `v${vi + 1}`,
        name: va.name.slice(0, 120),
        is_required: true,
        sort_order: vi + 1,
        options: { create: va.options.map((label, oi) => ({ key: `o${oi + 1}`, label: label.slice(0, 160), sort_order: oi + 1, is_default: oi === 0 })) },
      },
    });
  }
  for (let ai = 0; ai < d.addons.length; ai++) {
    await db.catalog2Addon.create({
      data: { version_id: versionId, key: `a${ai + 1}`, name: d.addons[ai].slice(0, 160), sort_order: ai + 1, is_active: true },
    });
  }
}

export async function runImport(opts: ImportOptions): Promise<ImportRunResult> {
  const src = loadSources(opts.dir);
  const derived = src.products.map((p) => deriveProduct(p, src.roseByMainIndex.get(p.index)));

  const quality: QualityReport = {
    expected_products: 36,
    found_products: derived.length,
    rose_reviewed: derived.filter((d) => d.rose_reviewed).length,
    not_reviewed: derived.filter((d) => !d.rose_reviewed).length,
    variations: derived.reduce((a, d) => a + d.variations.length, 0),
    options: derived.reduce((a, d) => a + d.variations.reduce((x, v) => x + v.options.length, 0), 0),
    addons: derived.reduce((a, d) => a + d.addons.length, 0),
    tasks: 0,
    steps: 0,
    execution_human: 0,
    execution_ia: 0,
    execution_hybrid: 0,
    products_ambiguous_content: derived.filter((d) => d.pendencies.includes("content_review_pending")).length,
    products_without_price: derived.filter((d) => d.pendencies.includes("price_pending")).length,
    products_without_commercial_deadline: derived.filter((d) => d.pendencies.includes("deadline_pending")).length,
    products_without_portfolio: derived.filter((d) => d.pendencies.includes("portfolio_pending")).length,
    category_area_divergences: derived.filter((d) => d.divergences.some((x) => x.type === "area_vs_category" || x.type === "ebook_classification")).length,
    decisions_needed: derived.flatMap((d) => d.divergences.filter((x) => x.decision_pending).map((x) => `#${d.source_index} ${d.source_name}: ${x.detail}`)),
    errors: [],
    warnings: derived.flatMap((d) => d.warnings.map((w) => `#${d.source_index} ${d.source_name}: ${w}`)),
    checksums: { main: src.mainChecksum, rose: src.roseChecksum, ata: src.ataChecksum },
  };

  const base: Omit<ImportRunResult, "lines" | "created" | "updated" | "unchanged" | "skipped_human_edit" | "divergence" | "errors" | "batch_id"> = {
    mode: opts.mode,
    rule_version: IMPORT_RULE_VERSION,
    sources: {
      dir: opts.dir,
      main: { name: "Allka_Proposta_Catalogo_Produtos_v9.xlsx", checksum: src.mainChecksum, rows: src.rowCountMain },
      rose: { name: "Review Rose.xlsx", checksum: src.roseChecksum, rows: src.rowCountRose },
      ata_checksum: src.ataChecksum,
    },
    expected: 36,
    derived: derived.length,
    rose_reviewed: quality.rose_reviewed,
    not_reviewed: quality.not_reviewed,
    ambiguous_matches: src.ambiguousMatches,
    quality,
  };

  // ── DRY-RUN: só relata ────────────────────────────────────────────
  if (opts.mode === "dry_run") {
    return {
      ...base,
      batch_id: null,
      created: 0,
      updated: 0,
      unchanged: 0,
      skipped_human_edit: 0,
      divergence: derived.filter((d) => d.divergences.some((x) => x.decision_pending)).length,
      errors: 0,
      lines: derived.map((d) => ({
        source_index: d.source_index,
        source_name: d.source_name,
        slug: d.slug,
        outcome: "unchanged" as const,
        product_id: null,
        version_id: null,
        rose_reviewed: d.rose_reviewed,
        pendencies: d.pendencies,
        divergences: d.divergences,
        warnings: d.warnings,
        errors: [],
      })),
    };
  }

  // ── APPLY ────────────────────────────────────────────────────────
  assertLocalDatabase(process.env.DATABASE_URL);
  const db = new PrismaClient();
  const lines: LineResult[] = [];
  let created = 0,
    updated = 0,
    unchanged = 0,
    skipped = 0,
    divergence = 0,
    errors = 0;
  let batchId: string | null = null;
  try {
    await seedCatalog2Classifications(db);
    const { pillars, cats, fourF } = await resolvePillarCat(db);

    const batch = await db.catalog2ImportBatch.create({
      data: {
        mode: "apply",
        rule_version: IMPORT_RULE_VERSION,
        source_main_name: base.sources.main.name,
        source_main_checksum: src.mainChecksum,
        source_rose_name: base.sources.rose.name,
        source_rose_checksum: src.roseChecksum,
        source_ata_checksum: src.ataChecksum,
        row_count_main: src.rowCountMain,
        row_count_rose: src.rowCountRose,
        expected_products: 36,
        status: "completed",
        actor_user_id: opts.actorUserId ?? null,
      },
    });
    batchId = batch.id;

    for (const d of derived) {
      const line: LineResult = {
        source_index: d.source_index,
        source_name: d.source_name,
        slug: d.slug,
        outcome: "unchanged",
        product_id: null,
        version_id: null,
        rose_reviewed: d.rose_reviewed,
        pendencies: d.pendencies,
        divergences: d.divergences,
        warnings: d.warnings,
        errors: [],
      };
      try {
        const existing = await db.catalog2ProductImportOrigin.findUnique({
          where: { source_key: d.source_key },
          include: { product: { include: { versions: { orderBy: { version_number: "desc" } } } } },
        });

        if (!existing) {
          const product = await db.catalog2Product.create({
            data: {
              slug: d.slug,
              internal_name: d.source_name,
              pillar_id: d.pillar_key ? pillars.get(d.pillar_key) ?? null : null,
              category_id: d.category_key ? cats.get(d.category_key) ?? null : null,
              origin: d.origin,
              status: "em_preparacao",
              created_by_user_id: opts.actorUserId ?? null,
              four_f: { create: d.four_f.map((k) => ({ four_f_id: fourF.get(k)! })).filter((x) => x.four_f_id) },
            },
          });
          const v1 = await db.catalog2ProductVersion.create({
            data: { product_id: product.id, version_number: 1, state: "rascunho", title: d.version_title, created_by_user_id: opts.actorUserId ?? null },
          });
          await writeDraftContent(db, v1.id, d);
          await db.catalog2VersionEvent.create({ data: { version_id: v1.id, event_type: "created", actor_user_id: opts.actorUserId ?? null, note: `Importado da planilha (#${d.source_index}).` } });
          await db.catalog2ProductImportOrigin.create({
            data: {
              product_id: product.id,
              source_key: d.source_key,
              source_index: d.source_index,
              source_name: d.source_name,
              rose_reviewed: d.rose_reviewed,
              area_rose: d.area_rose,
              review_state: d.review_state,
              pendencies_json: JSON.stringify(d.pendencies),
              last_import_checksum: d.checksum,
              last_import_batch_id: batch.id,
              main_fields_json: JSON.stringify(d.main_fields),
              rose_fields_json: JSON.stringify(d.rose_fields),
              original_texts_json: JSON.stringify(d.original_texts),
              divergences_json: JSON.stringify(d.divergences),
              historical_price_min: d.historical_price_min,
              historical_price_max: d.historical_price_max,
              historical_price_note: "Referência histórica da planilha — NÃO é o preço final.",
            },
          });
          line.outcome = "created";
          line.product_id = product.id;
          line.version_id = v1.id;
          created++;
        } else if (existing.last_import_checksum === d.checksum) {
          line.outcome = "unchanged";
          line.product_id = existing.product_id;
          line.version_id = existing.product.versions.find((v) => v.state === "rascunho")?.id ?? null;
          unchanged++;
        } else if (existing.human_edited_at) {
          // A fonte mudou MAS há edição humana — nunca sobrescreve.
          line.outcome = "skipped_human_edit";
          line.product_id = existing.product_id;
          line.errors.push("Fonte alterada, mas o rascunho tem edição humana — não sobrescrito. Requer revisão manual.");
          skipped++;
        } else if (!opts.allowRefresh) {
          // Fonte mudou, sem edição humana, mas --allow-refresh não passado.
          line.outcome = "divergence";
          line.product_id = existing.product_id;
          line.errors.push("Fonte alterada desde a última importação. Rode com --allow-refresh para atualizar o rascunho.");
          divergence++;
        } else {
          const draft = existing.product.versions.find((v) => v.state === "rascunho");
          if (!draft) {
            line.outcome = "error";
            line.errors.push("Sem versão rascunho para atualizar.");
            errors++;
          } else {
            await writeDraftContent(db, draft.id, d);
            await writeProductClassifications(db, existing.product_id, d, { pillars, cats, fourF });
            await db.catalog2VersionEvent.create({ data: { version_id: draft.id, event_type: "updated", actor_user_id: opts.actorUserId ?? null, note: `Reimportado (fonte alterada, lote ${batch.id}).` } });
            await db.catalog2ProductImportOrigin.update({
              where: { id: existing.id },
              data: {
                rose_reviewed: d.rose_reviewed,
                area_rose: d.area_rose,
                review_state: d.review_state,
                pendencies_json: JSON.stringify(d.pendencies),
                last_import_checksum: d.checksum,
                last_import_batch_id: batch.id,
                main_fields_json: JSON.stringify(d.main_fields),
                rose_fields_json: JSON.stringify(d.rose_fields),
                original_texts_json: JSON.stringify(d.original_texts),
                divergences_json: JSON.stringify(d.divergences),
              },
            });
            line.outcome = "updated";
            line.product_id = existing.product_id;
            line.version_id = draft.id;
            updated++;
          }
        }
      } catch (err) {
        line.outcome = "error";
        line.errors.push(err instanceof Error ? err.message.slice(0, 300) : "erro");
        errors++;
      }
      await db.catalog2ImportRecord.create({
        data: {
          batch_id: batch.id,
          source_key: d.source_key,
          source_index: d.source_index,
          source_name: d.source_name,
          product_id: line.product_id,
          version_id: line.version_id,
          slug: d.slug,
          outcome: line.outcome,
          checksum: d.checksum,
          fields_from_main_json: JSON.stringify(d.main_fields),
          fields_from_rose_json: JSON.stringify(d.rose_fields),
          original_texts_json: JSON.stringify(d.original_texts),
          divergences_json: JSON.stringify(d.divergences),
          warnings_json: JSON.stringify(d.warnings),
          errors_json: JSON.stringify(line.errors),
          rose_reviewed: d.rose_reviewed,
        },
      });
      lines.push(line);
    }

    const status = divergence > 0 || skipped > 0 || errors > 0 ? "completed_with_divergences" : "completed";
    const result: ImportRunResult = {
      ...base,
      batch_id: batch.id,
      created,
      updated,
      unchanged,
      skipped_human_edit: skipped,
      divergence,
      errors,
      lines,
    };
    await db.catalog2ImportBatch.update({
      where: { id: batch.id },
      data: { status, created_count: created, updated_count: updated, unchanged_count: unchanged, divergence_count: divergence, finished_at: new Date(), report_json: JSON.stringify({ ...result, lines: undefined, quality }) },
    });
    return result;
  } finally {
    await db.$disconnect();
  }
}
