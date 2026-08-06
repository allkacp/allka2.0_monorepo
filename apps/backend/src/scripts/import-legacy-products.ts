/**
 * import-legacy-products.ts — Importa o CATÁLOGO de produtos da base antiga.
 *
 * Fonte: produtos-modelos-questionarios.json (dump da plataforma antiga).
 * Escopo: SOMENTE produtos (status = 1 / ativos) + suas variações.
 *   ❌ NÃO importa task_template / CatalogTask / vínculos
 *   ❌ NÃO importa questionários / briefing
 *   Vínculos de tarefa já existentes nos 5 produtos-piloto são preservados.
 *
 * Consolidação: produtos que na base antiga eram registros separados só por
 * quantidade/tamanho ("Edição de vídeo até 5/10/20/30 min", "1x/2x/4x
 * Criativo"...) viram UM produto com várias ProductVariation — ver GROUPS.
 * 142 produtos ativos → 73 produtos consolidados.
 *
 * Códigos:
 *   - `product_code` = "prod_N" sequencial a partir de 1 (convenção já usada
 *     na UI e na URL de /admin/produtos — ver src/lib/product-code.ts).
 *   - `metadata.code` = código legível "ALK-<CAT>-<NNN>" (ex.: ALK-DES-007),
 *     categoria + sequência dentro da categoria.
 *   - `id` mantém o prefixo provisório "LEGACY-IMPORT-" (a definir depois).
 *
 * Idempotente: upsert por id determinístico; variações são recriadas a cada
 * execução. Rodar: npx tsx src/scripts/import-legacy-products.ts [--apply]
 * Sem --apply faz dry-run (só imprime o plano, não escreve nada).
 */

import fs from "node:fs";
import path from "node:path";
import { prisma } from "../lib/prisma";

const APPLY = process.argv.includes("--apply");

const JSON_PATH = path.resolve(
  __dirname,
  "../../../../produtos-modelos-questionarios.json",
);

const ORIGEM =
  "Importado do catálogo da plataforma antiga (produtos-modelos-questionarios.json), somente produtos ativos. Registros que só variavam em quantidade/tamanho foram consolidados em variações. ID com prefixo LEGACY-IMPORT- é provisório.";

// ── Tipos do dump ───────────────────────────────────────────────────────────

interface LegacyProduct {
  id: number;
  productCategoryId: number;
  name: string;
  presentation: string | null;
  presentationVideo: string | null;
  presentationOffHiring: string | null;
  presentationRecurrentHiring: string | null;
  description: string | null;
  descriptionSummary: string | null;
  descriptionIncludedItems: string | null;
  descriptionNotIncludedItems: string | null;
  descriptionAttention: string | null;
  howToSendTaskAttention: string | null;
  taskDescription: string | null;
  tags: string | null;
  price: number;
  deliveryTimeHours: number | null;
  enabledFrequencyType: number;
  status: number;
}

// ── Categorias → prefixo do código legível ──────────────────────────────────

const CATEGORY_PREFIX: Record<string, string> = {
  "Design e Criação": "DES",
  "Mídias e Conteúdo": "MID",
  "Soluções Web": "WEB",
  "Performance e Anúncios Patrocinados": "ADS",
  "Audiovisual e Multimedia": "AV",
  "Pacotes Estratégicos": "PCT",
  "Estratégico e Vendas": "EST",
};

// Ordem em que as categorias entram na numeração sequencial (prod_N).
const CATEGORY_ORDER = [
  "Design e Criação",
  "Mídias e Conteúdo",
  "Soluções Web",
  "Performance e Anúncios Patrocinados",
  "Audiovisual e Multimedia",
  "Pacotes Estratégicos",
  "Estratégico e Vendas",
];

// ── Grupos de consolidação ──────────────────────────────────────────────────
// Cada grupo vira 1 produto; cada entrada de `items` vira 1 ProductVariation.
// O primeiro item é a "base" (nome/descrições/apresentação herdados dele).

interface Group {
  name: string;
  items: Array<{ legacyId: number; label: string }>;
}

const GROUPS: Group[] = [
  // ── Audiovisual e Multimedia ──
  {
    name: "Edição de Vídeo",
    items: [
      { legacyId: 1219, label: "Até 5 minutos" },
      { legacyId: 1220, label: "Até 10 minutos" },
      { legacyId: 1221, label: "Até 20 minutos" },
      { legacyId: 1222, label: "Até 30 minutos" },
    ],
  },
  // ── Design e Criação ──
  {
    name: "Criativo Estático ou Motion (apenas criativo)",
    items: [
      { legacyId: 1310, label: "1 criativo" },
      { legacyId: 1311, label: "2 criativos" },
      { legacyId: 1333, label: "3 criativos" },
      { legacyId: 1312, label: "4 criativos" },
      { legacyId: 1313, label: "6 criativos" },
      { legacyId: 1314, label: "8 criativos" },
      { legacyId: 1315, label: "10 criativos" },
    ],
  },
  {
    name: "Banner Digital Estático ou Carrossel (até 5 telas cada)",
    items: [
      { legacyId: 1229, label: "1 banner" },
      { legacyId: 1305, label: "2 banners" },
      { legacyId: 1306, label: "4 banners" },
    ],
  },
  {
    name: "Apresentação Digital (Powerpoint ou Prezi)",
    items: [
      { legacyId: 1225, label: "Até 10 slides" },
      { legacyId: 1226, label: "Até 20 slides" },
      { legacyId: 1227, label: "Até 30 slides" },
      { legacyId: 1252, label: "Até 60 slides" },
    ],
  },
  {
    name: "Card Post Estático ou Motion",
    items: [
      { legacyId: 1286, label: "1 criativo + 1 copy" },
      { legacyId: 1287, label: "2 criativos + 2 copy" },
      { legacyId: 1288, label: "4 criativos + 4 copy" },
      { legacyId: 1336, label: "5 criativos + 5 copy" },
      { legacyId: 1289, label: "8 criativos + 8 copy" },
    ],
  },
  {
    name: "Criação/Edição de E-book",
    items: [
      { legacyId: 1258, label: "Até 50 páginas" },
      { legacyId: 1304, label: "Até 150 páginas" },
    ],
  },
  {
    name: "Folder Digital (PDF e arquivo para impressão)",
    items: [
      { legacyId: 1215, label: "5 páginas" },
      { legacyId: 1216, label: "10 páginas" },
      { legacyId: 1217, label: "20 páginas" },
    ],
  },
  {
    name: "Layout de Website",
    items: [
      { legacyId: 1212, label: "Até 5 páginas" },
      { legacyId: 1213, label: "Até 10 páginas" },
      { legacyId: 1214, label: "Até 20 páginas" },
    ],
  },
  {
    name: "Tratamento de Imagens",
    items: [
      { legacyId: 1198, label: "Até 10 imagens" },
      { legacyId: 1253, label: "Até 20 imagens" },
      { legacyId: 1254, label: "Até 50 imagens" },
    ],
  },
  // ── Mídias e Conteúdo ──
  {
    name: "Copy para E-mail ou WhatsApp (400 palavras cada)",
    items: [
      { legacyId: 1270, label: "1 copy" },
      { legacyId: 1271, label: "5 copies" },
      { legacyId: 1177, label: "10 copies" },
      { legacyId: 1178, label: "20 copies" },
    ],
  },
  {
    name: "Copy para Páginas Web",
    items: [
      { legacyId: 1195, label: "1.000 palavras" },
      { legacyId: 1196, label: "2.000 palavras" },
      { legacyId: 1197, label: "3.000 palavras" },
    ],
  },
  {
    name: "Copy para Vídeo",
    items: [
      { legacyId: 1247, label: "Até 5 minutos" },
      { legacyId: 1248, label: "Até 10 minutos" },
      { legacyId: 1249, label: "Até 20 minutos" },
      { legacyId: 1250, label: "Até 30 minutos" },
    ],
  },
  {
    name: "Criação de Conteúdo",
    items: [
      { legacyId: 1272, label: "400 palavras" },
      { legacyId: 1273, label: "1.000 palavras" },
      { legacyId: 1274, label: "2.000 palavras" },
      { legacyId: 1275, label: "3.000 palavras" },
    ],
  },
  {
    name: "Legendas para Redes Sociais",
    items: [
      { legacyId: 1204, label: "1 unidade" },
      { legacyId: 1205, label: "4 unidades" },
      { legacyId: 1206, label: "8 unidades" },
      { legacyId: 1207, label: "12 unidades" },
      { legacyId: 1208, label: "16 unidades" },
      { legacyId: 1209, label: "20 unidades" },
    ],
  },
  {
    name: "Pauta de Conteúdo",
    items: [
      { legacyId: 1330, label: "10 temas" },
      { legacyId: 1176, label: "20 temas" },
      { legacyId: 1331, label: "30 temas" },
    ],
  },
  {
    name: "Post para Redes Sociais (criativo + legenda)",
    items: [
      { legacyId: 1276, label: "1 post" },
      { legacyId: 1277, label: "2 posts" },
      { legacyId: 1278, label: "4 posts" },
      { legacyId: 1279, label: "8 posts" },
      { legacyId: 1280, label: "12 posts" },
      { legacyId: 1281, label: "16 posts" },
      { legacyId: 1282, label: "20 posts" },
    ],
  },
  {
    name: "Resposta a Seguidores",
    items: [
      { legacyId: 1200, label: "Até 100 respostas" },
      { legacyId: 1201, label: "Até 300 respostas" },
    ],
  },
  {
    name: "Roteirização de Vídeo",
    items: [
      { legacyId: 1255, label: "Até 10 minutos" },
      { legacyId: 1256, label: "Até 20 minutos" },
      { legacyId: 1257, label: "Até 30 minutos" },
    ],
  },
  // ── Performance e Anúncios Patrocinados ──
  {
    name: "Análise de Usabilidade UX",
    items: [
      { legacyId: 1189, label: "Até 5 páginas" },
      { legacyId: 1190, label: "Até 10 páginas" },
      { legacyId: 1191, label: "Até 20 páginas" },
      { legacyId: 1192, label: "Até 50 páginas" },
    ],
  },
  {
    name: "Automação de E-mail (até 20 copys)",
    items: [
      { legacyId: 1237, label: "RD Station" },
      { legacyId: 1238, label: "Lead Lovers" },
      { legacyId: 1239, label: "Bitrix24" },
    ],
  },
  {
    name: "Gestão de Tráfego",
    items: [
      { legacyId: 1180, label: "Até 2 campanhas" },
      { legacyId: 1181, label: "Até 4 campanhas" },
      { legacyId: 1182, label: "Até 10 campanhas" },
    ],
  },
  {
    name: "SEO",
    items: [
      { legacyId: 1186, label: "Até 10 páginas" },
      { legacyId: 1187, label: "Até 20 páginas" },
      { legacyId: 1188, label: "Até 50 páginas" },
    ],
  },
  // ── Soluções Web ──
  {
    name: "Alteração de Website ou Loja Virtual",
    items: [
      { legacyId: 1246, label: "Até 10 itens" },
      { legacyId: 1307, label: "Até 30 itens" },
      { legacyId: 1308, label: "Até 50 itens" },
      { legacyId: 1309, label: "Até 100 itens" },
    ],
  },
  {
    name: "Construção de Website Wordpress (sem layout)",
    items: [
      { legacyId: 1300, label: "Até 5 páginas" },
      { legacyId: 1301, label: "Até 10 páginas" },
      { legacyId: 1302, label: "Até 20 páginas" },
    ],
  },
  {
    name: "Website Wordpress (layout + construção)",
    items: [
      { legacyId: 1267, label: "Até 5 páginas" },
      { legacyId: 1268, label: "Até 10 páginas" },
      { legacyId: 1269, label: "Até 20 páginas" },
    ],
  },
  {
    name: "WhatsApp Marketing",
    items: [
      { legacyId: 1240, label: "250 envios" },
      { legacyId: 1241, label: "500 envios" },
    ],
  },
];

// ── Produtos-piloto já cadastrados (âncoras) ────────────────────────────────
// Conteúdo curado à mão na migração-piloto: preservamos as colunas de texto
// e o metadata existente, só sincronizamos preço/variações/código.
// `rename: true` quando a consolidação torna o nome antigo enganoso.

const ANCHORS: Record<number, { productId: string; rename?: boolean }> = {
  1234: { productId: "LEGACY-IMPORT-DM0243" }, // Anime seu Logotipo
  1203: { productId: "LEGACY-IMPORT-MC0208" }, // Layout e Config. de Redes Sociais
  1283: { productId: "LEGACY-IMPORT-PA0176" }, // Gestão de Projetos de Marketing
  1180: { productId: "LEGACY-IMPORT-PA0186", rename: true }, // vira "Gestão de Tráfego"
  1303: { productId: "LEGACY-IMPORT-SW0338" }, // Loja Virtual Woocommerce
};

// ── Helpers ─────────────────────────────────────────────────────────────────

const ENTITIES: Record<string, string> = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&ldquo;": "“",
  "&rdquo;": "”",
  "&lsquo;": "‘",
  "&rsquo;": "’",
  "&hellip;": "…",
  "&ndash;": "–",
  "&mdash;": "—",
};

/** Converte o HTML dos campos longblob antigos em texto simples. */
function htmlToText(html: string | null | undefined): string {
  if (!html) return "";
  let t = String(html);
  t = t.replace(/<\s*br\s*\/?\s*>/gi, "\n");
  t = t.replace(/<\s*\/\s*(p|div|h[1-6]|tr)\s*>/gi, "\n");
  t = t.replace(/<\s*li[^>]*>/gi, "• ");
  t = t.replace(/<\s*\/\s*li\s*>/gi, "\n");
  t = t.replace(/<[^>]+>/g, "");
  for (const [ent, ch] of Object.entries(ENTITIES)) {
    t = t.split(ent).join(ch);
  }
  t = t.replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)));
  t = t.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n");
  return t.trim();
}

/** Quebra um bloco de texto em itens de lista (uma linha/bullet por item). */
function toList(html: string | null | undefined): string[] {
  const text = htmlToText(html);
  if (!text) return [];
  return text
    .split("\n")
    .map((l) => l.replace(/^[•\-–*]\s*/, "").trim())
    .filter((l) => l.length > 0);
}

// Correções de grafia/typo herdadas da base antiga, aplicadas a todo nome.
const NAME_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bWordpress\b/g, "WordPress"],
  [/\bWordPress\b/g, "WordPress"],
  [/\bPowerpoint\b/g, "PowerPoint"],
  [/\bWhatsapp\b/g, "WhatsApp"],
  [/\bWoocommerce\b/g, "WooCommerce"],
  [/\bNuvemshop\b/g, "NuvemShop"],
  [/\bInboud\b/g, "Inbound"],
  [/\bMaquina\b/g, "Máquina"],
  [/\bMultimedia\b/g, "Multimídia"],
  [/\bCarrosséis\b/g, "Carrosséis"],
  [/\bhtml\b/g, "HTML"],
  [/\bpdf\b/gi, "PDF"],
];

// Nomes reescritos por inteiro (pacotes com nomenclatura truncada).
const NAME_OVERRIDES: Record<number, string> = {
  1318: "F1 – Estruturação Inicial",
  1319: "F2 – Impulsionamento Testado",
  1320: "F3 – Impulsionamento Acelerado",
  1321: "F4 – Impulsionamento Sustentável",
  1322: "Fila na Porta (loja física)",
  1325: "Máquina de Vendas (venda online)",
  157: "Análise de Projeto Especial (gratuita)",
};

function normalizeName(name: string): string {
  let n = name.trim().replace(/\s{2,}/g, " ");
  for (const [re, to] of NAME_REPLACEMENTS) n = n.replace(re, to);
  // "– (até 10 itens)" → "(até 10 itens)"; remove hífen solto antes de "("
  n = n.replace(/\s*[–-]\s*\(/g, " (");
  return n.replace(/\s*[–-]\s*$/, "").trim();
}

function recurrenceLabel(type: number): string {
  if (type === 2) return "Avulso";
  if (type === 3) return "Mensal";
  return "Avulso e Mensal";
}

function complexityFor(price: number): string {
  if (price < 300) return "basic";
  if (price < 800) return "intermediate";
  if (price < 2000) return "advanced";
  return "premium";
}

/** Tags do dump vinham em CSV com espaços/duplicatas — limpa e deduplica. */
function parseTags(raws: Array<string | null>): string[] {
  const seen = new Map<string, string>();
  for (const raw of raws) {
    for (const t of String(raw ?? "").split(/[,;]/)) {
      const tag = t.trim().replace(/\s{2,}/g, " ");
      if (!tag) continue;
      const key = tag.toLowerCase();
      if (!seen.has(key)) seen.set(key, tag);
    }
  }
  return [...seen.values()];
}

/** descriptionAttention → lista de avisos no formato do card de produto. */
function buildWarnings(html: string | null | undefined) {
  return toList(html).map((message) => ({
    level: /lei|responsab|direito autoral|isenta/i.test(message)
      ? ("warning" as const)
      : ("info" as const),
    message,
  }));
}

// ── Montagem do plano ───────────────────────────────────────────────────────

interface PlannedVariation {
  label: string;
  legacy: LegacyProduct;
}

interface PlannedProduct {
  name: string;
  category: string;
  base: LegacyProduct;
  variations: PlannedVariation[];
  subcategories: string[];
  tags: string[];
  anchorId?: string;
  renameAnchor?: boolean;
  code: string; // ALK-DES-001
  productId: string; // LEGACY-IMPORT-ALK-DES-001 ou id da âncora
  productCode: string; // prod_N
}

function buildPlan(): PlannedProduct[] {
  const raw = JSON.parse(fs.readFileSync(JSON_PATH, "utf8"));
  const categories: Record<number, string> = Object.fromEntries(
    (raw.product_category as Array<{ id: number; name: string }>).map((c) => [
      c.id,
      c.name,
    ]),
  );
  const active: LegacyProduct[] = (raw.product as LegacyProduct[]).filter(
    (p) => p.status === 1,
  );
  const byId = new Map(active.map((p) => [p.id, p]));

  // Categoria secundária (product_sub_category) → vira `subcategories`.
  const subsByProduct = new Map<number, string[]>();
  for (const s of raw.product_sub_category as Array<{
    productId: number;
    productCategoryId: number;
  }>) {
    const name = categories[s.productCategoryId];
    if (!name) continue;
    const list = subsByProduct.get(s.productId) ?? [];
    if (!list.includes(name)) list.push(name);
    subsByProduct.set(s.productId, list);
  }

  /** Junta subcategorias de todos os registros consolidados no produto. */
  const subsFor = (ids: number[]) => {
    const out: string[] = [];
    for (const id of ids) {
      for (const s of subsByProduct.get(id) ?? []) if (!out.includes(s)) out.push(s);
    }
    return out;
  };

  const grouped = new Set<number>();
  const planned: Array<Omit<PlannedProduct, "code" | "productId" | "productCode">> = [];

  for (const g of GROUPS) {
    const items = g.items.filter((i) => {
      if (!byId.has(i.legacyId)) {
        console.warn(`  ⚠ id legado ${i.legacyId} (${g.name}) não é ativo — ignorado`);
        return false;
      }
      return true;
    });
    if (items.length === 0) continue;
    items.forEach((i) => grouped.add(i.legacyId));
    const base = byId.get(items[0].legacyId)!;
    const anchorItem = items.find((i) => ANCHORS[i.legacyId]);
    const ids = items.map((i) => i.legacyId);
    planned.push({
      name: normalizeName(g.name),
      category: categories[base.productCategoryId],
      base,
      variations: items.map((i) => ({ label: i.label, legacy: byId.get(i.legacyId)! })),
      subcategories: subsFor(ids),
      tags: parseTags(ids.map((id) => byId.get(id)!.tags)),
      anchorId: anchorItem ? ANCHORS[anchorItem.legacyId].productId : undefined,
      renameAnchor: anchorItem ? ANCHORS[anchorItem.legacyId].rename : undefined,
    });
  }

  for (const p of active) {
    if (grouped.has(p.id)) continue;
    planned.push({
      name: NAME_OVERRIDES[p.id] ?? normalizeName(p.name),
      category: categories[p.productCategoryId],
      base: p,
      variations: [{ label: "Contratação Padrão", legacy: p }],
      subcategories: subsFor([p.id]),
      tags: parseTags([p.tags]),
      anchorId: ANCHORS[p.id]?.productId,
      renameAnchor: ANCHORS[p.id]?.rename,
    });
  }

  // Ordena por categoria (ordem fixa) e depois por nome, e numera.
  planned.sort((a, b) => {
    const ca = CATEGORY_ORDER.indexOf(a.category);
    const cb = CATEGORY_ORDER.indexOf(b.category);
    if (ca !== cb) return ca - cb;
    return a.name.localeCompare(b.name, "pt-BR");
  });

  const perCategory: Record<string, number> = {};
  return planned.map((p, idx) => {
    const prefix = CATEGORY_PREFIX[p.category] ?? "GEN";
    perCategory[prefix] = (perCategory[prefix] ?? 0) + 1;
    const code = `ALK-${prefix}-${String(perCategory[prefix]).padStart(3, "0")}`;
    return {
      ...p,
      code,
      productId: p.anchorId ?? `LEGACY-IMPORT-${code}`,
      productCode: `prod_${idx + 1}`,
    };
  });
}

// ── Escrita ─────────────────────────────────────────────────────────────────

function buildMetadata(p: PlannedProduct, minPrice: number, maxDays: number) {
  const b = p.base;
  const includedItems = toList(b.descriptionIncludedItems);
  const notIncludedItems = toList(b.descriptionNotIncludedItems);
  const variationsInternal: Record<string, any> = {};
  p.variations.forEach((v, i) => {
    variationsInternal[`${p.productId}-V${String(i + 1).padStart(2, "0")}`] = {
      legacyProductId: v.legacy.id,
      legacyName: v.legacy.name,
      price: v.legacy.price,
      deadlineDays: v.legacy.deliveryTimeHours ?? null,
    };
  });

  return {
    _origem: ORIGEM,
    code: p.code,
    legacyIds: p.variations.map((v) => v.legacy.id),
    legacyCategory: p.category,
    recurrence: recurrenceLabel(b.enabledFrequencyType),
    deliveryDays: maxDays,
    summaryDescription: htmlToText(b.descriptionSummary),
    finalPrice: minPrice,
    itemLimit: 1,
    presentation: {
      tagline: htmlToText(b.presentation),
      video: b.presentationVideo ?? null,
      highlights: includedItems,
      whatIsIncluded: includedItems.map((t) => ({ title: t, description: "" })),
      whatIsNotIncluded: notIncludedItems,
      targetAudience: [],
    },
    includedItems,
    notIncludedItems,
    baseFeatures: includedItems,
    warnings: buildWarnings(b.descriptionAttention),
    descriptionAttention: htmlToText(b.descriptionAttention),
    requestAttention: htmlToText(b.howToSendTaskAttention),
    oneTimeContract: htmlToText(b.presentationOffHiring),
    monthlyContract: htmlToText(b.presentationRecurrentHiring),
    categories: [p.category],
    subcategories: p.subcategories,
    variationsInternal,
  };
}

async function main() {
  console.log(`▶ Importação do catálogo antigo — ${APPLY ? "APPLY" : "DRY-RUN"}\n`);
  const plan = buildPlan();

  const totalLegacy = plan.reduce((s, p) => s + p.variations.length, 0);
  console.log(
    `Plano: ${totalLegacy} produtos ativos antigos → ${plan.length} produtos consolidados\n`,
  );

  for (const p of plan) {
    const prices = p.variations.map((v) => v.legacy.price);
    const minPrice = Math.min(...prices);
    const flags = [
      p.anchorId ? "âncora (preserva conteúdo curado)" : null,
      p.variations.length > 1 ? `${p.variations.length} variações` : null,
    ]
      .filter(Boolean)
      .join(", ");
    console.log(
      `  ${p.productCode.padEnd(8)} ${p.code}  ${p.name} — R$ ${minPrice.toFixed(2)}${flags ? ` [${flags}]` : ""}`,
    );
  }

  if (!APPLY) {
    console.log("\n(dry-run — nada foi escrito. Rode com --apply para gravar.)");
    return;
  }

  // Libera os product_code antes de reatribuir (constraint unique).
  await prisma.product.updateMany({
    where: { product_code: { not: null } },
    data: { product_code: null },
  });

  let created = 0;
  let updated = 0;

  for (const p of plan) {
    const prices = p.variations.map((v) => v.legacy.price);
    const minPrice = Math.min(...prices);
    const maxDays = Math.max(
      ...p.variations.map((v) => v.legacy.deliveryTimeHours ?? 0),
    );
    const existing = await prisma.product.findUnique({ where: { id: p.productId } });
    const isAnchor = Boolean(p.anchorId && existing);

    const meta = buildMetadata(p, minPrice, maxDays);
    let metadata = JSON.stringify(meta);
    if (isAnchor && existing?.metadata) {
      // Preserva o metadata curado; só injeta código, rastreio e variações.
      try {
        const prev = JSON.parse(existing.metadata);
        metadata = JSON.stringify({
          ...prev,
          code: meta.code,
          legacyIds: meta.legacyIds,
          legacyCategory: meta.legacyCategory,
          variationsInternal: meta.variationsInternal,
          finalPrice: minPrice,
          deliveryDays: maxDays,
        });
      } catch {
        /* metadata corrompido: usa o gerado */
      }
    }

    const common = {
      category: p.category,
      base_price: minPrice,
      complexity: complexityFor(minPrice),
      completion_time: maxDays > 0 ? `${maxDays} dias` : null,
      product_code: p.productCode,
      metadata,
      is_active: true,
      updated_at: new Date(),
    };

    const full = {
      ...common,
      name: p.name,
      description: htmlToText(p.base.description),
      short_description: htmlToText(p.base.descriptionSummary),
      tags: JSON.stringify(p.tags),
      visibility: JSON.stringify({
        company: true,
        agency: true,
        partner: false,
        inHouse: false,
      }),
      demonstrations: JSON.stringify(
        p.base.presentationVideo ? [p.base.presentationVideo] : [],
      ),
    };

    if (existing) {
      // Âncora: mantém nome/textos/imagem curados (salvo rename explícito).
      const data = isAnchor
        ? { ...common, ...(p.renameAnchor ? { name: p.name } : {}) }
        : full;
      await prisma.product.update({ where: { id: p.productId }, data });
      updated++;
    } else {
      await prisma.product.create({
        data: { id: p.productId, ...full, created_at: new Date() },
      });
      created++;
    }

    // Variações são sempre reconstruídas (idempotência).
    await prisma.productVariation.deleteMany({ where: { product_id: p.productId } });
    for (let i = 0; i < p.variations.length; i++) {
      const v = p.variations[i];
      await prisma.productVariation.create({
        data: {
          id: `${p.productId}-V${String(i + 1).padStart(2, "0")}`,
          product_id: p.productId,
          name: v.label,
          description: htmlToText(v.legacy.descriptionSummary) || null,
          price: v.legacy.price,
          price_modifier: 0,
          deadline_days: v.legacy.deliveryTimeHours ?? null,
          scope_description: v.label,
          features: JSON.stringify(toList(v.legacy.descriptionIncludedItems)),
          sort_order: i + 1,
          is_active: true,
        },
      });
    }
  }

  console.log(
    `\n✅ Concluído: ${created} produtos criados, ${updated} atualizados, ${plan.length} no total.`,
  );
}

main()
  .catch((e) => {
    console.error("❌ Erro na importação:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
