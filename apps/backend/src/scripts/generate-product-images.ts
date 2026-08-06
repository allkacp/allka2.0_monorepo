/**
 * generate-product-images.ts — Gera imagem principal + 3 imagens de portfólio
 * para cada produto do catálogo.
 *
 * As imagens são SVG vetorial gerado aqui (mockups: navegador, grade de posts,
 * frame de vídeo, dashboard, slide, pôster, paleta, celular), com paleta por
 * categoria e composição determinística a partir do código do produto — o
 * mesmo produto sempre recebe a mesma arte.
 *
 * Gravadas como ARQUIVO em apps/frontend/public/images/products/ (mesma
 * convenção dos 69 SVGs que já existiam ali), e referenciadas por caminho:
 *   - `product.image`                → /images/products/<code>.svg
 *   - `product.demonstrations`       → [principal, p1, p2, p3]
 *   - `metadata.portfolioImages[]`   → 3 peças de portfólio com título
 * Trocar por material real depois = só sobrescrever o arquivo (ou apontar
 * `image` pro novo caminho); o banco não guarda binário nenhum.
 *
 * ⚠ São imagens de preenchimento: parecem material real de catálogo, mas não
 * são fotos das entregas. Todo produto tocado leva `metadata._imagesPlaceholder
 * = true`, então dá pra localizar e substituir todas em lote depois.
 *
 * Idempotente. Rodar: npx tsx src/scripts/generate-product-images.ts [--apply]
 * Sem --apply é dry-run. Com --force regenera até quem já tem imagem própria.
 */

import fs from "node:fs";
import path from "node:path";
import { prisma } from "../lib/prisma";

const APPLY = process.argv.includes("--apply");
const FORCE = process.argv.includes("--force");

const W = 1200;
const H = 750;

// ── Paletas por categoria ───────────────────────────────────────────────────

interface Palette {
  from: string;
  to: string;
  accent: string;
  ink: string;
  soft: string;
}

const PALETTES: Record<string, Palette> = {
  "Design e Criação": { from: "#4c1d95", to: "#a21caf", accent: "#f0abfc", ink: "#faf5ff", soft: "#c4b5fd" },
  "Mídias e Conteúdo": { from: "#0f766e", to: "#0891b2", accent: "#5eead4", ink: "#ecfeff", soft: "#99f6e4" },
  "Soluções Web": { from: "#1e3a8a", to: "#4338ca", accent: "#93c5fd", ink: "#eff6ff", soft: "#a5b4fc" },
  "Performance e Anúncios Patrocinados": { from: "#9a3412", to: "#d97706", accent: "#fcd34d", ink: "#fffbeb", soft: "#fdba74" },
  "Audiovisual e Multimedia": { from: "#881337", to: "#be123c", accent: "#fda4af", ink: "#fff1f2", soft: "#fecdd3" },
  "Pacotes Estratégicos": { from: "#064e3b", to: "#047857", accent: "#6ee7b7", ink: "#ecfdf5", soft: "#a7f3d0" },
  "Estratégico e Vendas": { from: "#1e293b", to: "#475569", accent: "#94a3b8", ink: "#f8fafc", soft: "#cbd5e1" },
};

const FALLBACK: Palette = PALETTES["Estratégico e Vendas"];

// ── Cenas por categoria (1ª = principal, demais = portfólio) ────────────────

type Scene = "browser" | "postGrid" | "video" | "poster" | "chart" | "deck" | "swatch" | "mobile";

const SCENES: Record<string, Scene[]> = {
  "Design e Criação": ["poster", "swatch", "deck", "postGrid"],
  "Mídias e Conteúdo": ["postGrid", "mobile", "deck", "poster"],
  "Soluções Web": ["browser", "mobile", "deck", "chart"],
  "Performance e Anúncios Patrocinados": ["chart", "browser", "postGrid", "mobile"],
  "Audiovisual e Multimedia": ["video", "poster", "postGrid", "mobile"],
  "Pacotes Estratégicos": ["chart", "deck", "browser", "postGrid"],
  "Estratégico e Vendas": ["chart", "deck", "poster", "browser"],
};

const SCENE_LABEL: Record<Scene, string> = {
  browser: "Layout aprovado",
  postGrid: "Grade de peças",
  video: "Frame da entrega",
  poster: "Conceito visual",
  chart: "Relatório de performance",
  deck: "Apresentação entregue",
  swatch: "Identidade e paleta",
  mobile: "Versão mobile",
};

// ── Utilidades ──────────────────────────────────────────────────────────────

/** PRNG determinístico (mulberry32) a partir de uma string. */
function seeded(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function esc(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Quebra o nome do produto em até `max` linhas de ~`per` caracteres. */
function wrap(text: string, per: number, max: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if (!cur) cur = w;
    else if ((cur + " " + w).length <= per) cur += " " + w;
    else {
      lines.push(cur);
      cur = w;
      if (lines.length === max) break;
    }
  }
  if (cur && lines.length < max) lines.push(cur);
  if (lines.length === max) {
    const joined = lines.join(" ");
    if (joined.length < text.length) {
      lines[max - 1] = lines[max - 1].replace(/[\s,–-]*$/, "") + "…";
    }
  }
  return lines;
}

const FONT = "Inter, 'Segoe UI', system-ui, -apple-system, sans-serif";

// ── Cenas ───────────────────────────────────────────────────────────────────

function sceneBrowser(p: Palette, r: () => number): string {
  const rows = 3 + Math.floor(r() * 2);
  let s = `<rect x="150" y="150" width="900" height="470" rx="16" fill="${p.ink}" opacity="0.97"/>`;
  s += `<rect x="150" y="150" width="900" height="46" rx="16" fill="${p.soft}" opacity="0.5"/>`;
  s += `<rect x="150" y="180" width="900" height="16" fill="${p.soft}" opacity="0.5"/>`;
  ["#ef4444", "#f59e0b", "#22c55e"].forEach((c, i) => {
    s += `<circle cx="${180 + i * 24}" cy="173" r="7" fill="${c}" opacity="0.85"/>`;
  });
  s += `<rect x="270" y="164" width="420" height="18" rx="9" fill="${p.from}" opacity="0.12"/>`;
  s += `<rect x="182" y="232" width="836" height="150" rx="10" fill="${p.from}" opacity="0.14"/>`;
  s += `<rect x="214" y="268" width="300" height="20" rx="10" fill="${p.from}" opacity="0.45"/>`;
  s += `<rect x="214" y="302" width="420" height="12" rx="6" fill="${p.from}" opacity="0.22"/>`;
  s += `<rect x="214" y="326" width="360" height="12" rx="6" fill="${p.from}" opacity="0.22"/>`;
  s += `<rect x="806" y="288" width="180" height="42" rx="21" fill="${p.to}" opacity="0.9"/>`;
  for (let i = 0; i < rows; i++) {
    const y = 410 + i * 66;
    if (y > 560) break;
    s += `<rect x="182" y="${y}" width="248" height="52" rx="10" fill="${p.from}" opacity="0.1"/>`;
    s += `<rect x="476" y="${y}" width="248" height="52" rx="10" fill="${p.from}" opacity="0.1"/>`;
    s += `<rect x="770" y="${y}" width="248" height="52" rx="10" fill="${p.from}" opacity="0.1"/>`;
  }
  return s;
}

function scenePostGrid(p: Palette, r: () => number): string {
  let s = "";
  for (let i = 0; i < 6; i++) {
    const x = 205 + (i % 3) * 270;
    const y = 175 + Math.floor(i / 3) * 250;
    s += `<rect x="${x}" y="${y}" width="230" height="210" rx="14" fill="${p.ink}" opacity="0.95"/>`;
    const variant = Math.floor(r() * 3);
    if (variant === 0) {
      s += `<circle cx="${x + 115}" cy="${y + 88}" r="${44 + r() * 14}" fill="${p.to}" opacity="0.55"/>`;
    } else if (variant === 1) {
      s += `<rect x="${x + 34}" y="${y + 40}" width="162" height="96" rx="10" fill="${p.from}" opacity="0.45"/>`;
    } else {
      s += `<path d="M ${x + 34} ${y + 136} L ${x + 104} ${y + 48} L ${x + 196} ${y + 136} Z" fill="${p.to}" opacity="0.5"/>`;
      s += `<circle cx="${x + 68}" cy="${y + 62}" r="16" fill="${p.accent}" opacity="0.8"/>`;
    }
    s += `<rect x="${x + 34}" y="${y + 156}" width="${110 + r() * 60}" height="11" rx="6" fill="${p.from}" opacity="0.3"/>`;
    s += `<rect x="${x + 34}" y="${y + 176}" width="${70 + r() * 60}" height="11" rx="6" fill="${p.from}" opacity="0.18"/>`;
  }
  return s;
}

function sceneVideo(p: Palette, r: () => number): string {
  let s = `<rect x="170" y="150" width="860" height="440" rx="16" fill="#0b0b0f" opacity="0.9"/>`;
  s += `<circle cx="600" cy="350" r="${120 + r() * 20}" fill="${p.to}" opacity="0.25"/>`;
  s += `<circle cx="600" cy="350" r="58" fill="${p.ink}" opacity="0.95"/>`;
  s += `<path d="M 583 320 L 583 380 L 630 350 Z" fill="${p.from}"/>`;
  s += `<rect x="200" y="540" width="800" height="6" rx="3" fill="${p.ink}" opacity="0.28"/>`;
  s += `<rect x="200" y="540" width="${300 + r() * 320}" height="6" rx="3" fill="${p.accent}"/>`;
  for (let i = 0; i < 26; i++) {
    const h = 8 + r() * 46;
    s += `<rect x="${206 + i * 30}" y="${508 - h / 2}" width="6" height="${h}" rx="3" fill="${p.accent}" opacity="0.5"/>`;
  }
  return s;
}

function scenePoster(p: Palette, r: () => number): string {
  let s = "";
  s += `<circle cx="${240 + r() * 120}" cy="${230 + r() * 80}" r="${120 + r() * 60}" fill="${p.accent}" opacity="0.22"/>`;
  s += `<circle cx="${880 + r() * 100}" cy="${470 + r() * 60}" r="${140 + r() * 70}" fill="${p.ink}" opacity="0.12"/>`;
  s += `<rect x="${380 + r() * 80}" y="${180 + r() * 60}" width="${300 + r() * 120}" height="${240 + r() * 120}" rx="24" fill="${p.ink}" opacity="0.1" transform="rotate(${-12 + r() * 24} 600 375)"/>`;
  for (let i = 0; i < 5; i++) {
    s += `<rect x="${150 + i * 42}" y="${560 + r() * 40}" width="18" height="${40 + r() * 90}" rx="9" fill="${p.accent}" opacity="0.35"/>`;
  }
  return s;
}

function sceneChart(p: Palette, r: () => number): string {
  let s = `<rect x="150" y="150" width="900" height="470" rx="18" fill="${p.ink}" opacity="0.96"/>`;
  for (let i = 0; i < 3; i++) {
    const x = 182 + i * 292;
    s += `<rect x="${x}" y="182" width="268" height="94" rx="12" fill="${p.from}" opacity="0.1"/>`;
    s += `<rect x="${x + 22}" y="${206}" width="86" height="10" rx="5" fill="${p.from}" opacity="0.3"/>`;
    s += `<rect x="${x + 22}" y="${228}" width="${100 + r() * 70}" height="24" rx="6" fill="${p.to}" opacity="0.75"/>`;
  }
  const bars = 9;
  const points: string[] = [];
  for (let i = 0; i < bars; i++) {
    const h = 40 + r() * 190;
    const x = 200 + i * 96;
    s += `<rect x="${x}" y="${570 - h}" width="52" height="${h}" rx="8" fill="${p.to}" opacity="0.55"/>`;
    points.push(`${x + 26},${560 - h - 18}`);
  }
  s += `<polyline points="${points.join(" ")}" fill="none" stroke="${p.from}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" opacity="0.75"/>`;
  points.forEach((pt) => {
    const [cx, cy] = pt.split(",");
    s += `<circle cx="${cx}" cy="${cy}" r="6" fill="${p.from}"/>`;
  });
  s += `<line x1="182" y1="572" x2="1018" y2="572" stroke="${p.from}" stroke-width="2" opacity="0.25"/>`;
  return s;
}

function sceneDeck(p: Palette, r: () => number): string {
  let s = `<rect x="196" y="196" width="820" height="410" rx="14" fill="${p.ink}" opacity="0.35"/>`;
  s += `<rect x="174" y="174" width="820" height="410" rx="14" fill="${p.ink}" opacity="0.6"/>`;
  s += `<rect x="150" y="150" width="820" height="410" rx="14" fill="${p.ink}" opacity="0.97"/>`;
  s += `<rect x="192" y="196" width="${220 + r() * 120}" height="22" rx="11" fill="${p.from}" opacity="0.5"/>`;
  s += `<rect x="192" y="238" width="${380 + r() * 120}" height="12" rx="6" fill="${p.from}" opacity="0.2"/>`;
  s += `<rect x="192" y="300" width="360" height="216" rx="12" fill="${p.from}" opacity="0.12"/>`;
  s += `<circle cx="372" cy="408" r="72" fill="none" stroke="${p.to}" stroke-width="26" opacity="0.65"/>`;
  s += `<circle cx="372" cy="408" r="72" fill="none" stroke="${p.accent}" stroke-width="26" stroke-dasharray="${120 + r() * 180} 452" opacity="0.95"/>`;
  for (let i = 0; i < 4; i++) {
    const y = 306 + i * 54;
    s += `<rect x="590" y="${y}" width="24" height="24" rx="7" fill="${p.to}" opacity="0.6"/>`;
    s += `<rect x="630" y="${y + 7}" width="${180 + r() * 110}" height="11" rx="6" fill="${p.from}" opacity="0.25"/>`;
  }
  return s;
}

function sceneSwatch(p: Palette, r: () => number): string {
  const cols = [p.from, p.to, p.accent, p.soft, p.ink];
  let s = "";
  cols.forEach((c, i) => {
    s += `<rect x="${168 + i * 178}" y="180" width="150" height="230" rx="14" fill="${c}"/>`;
    s += `<rect x="${168 + i * 178}" y="424" width="${70 + r() * 60}" height="10" rx="5" fill="${p.ink}" opacity="0.5"/>`;
  });
  s += `<text x="168" y="560" font-family="${FONT}" font-size="96" font-weight="700" fill="${p.ink}" opacity="0.9">Aa</text>`;
  s += `<text x="330" y="560" font-family="${FONT}" font-size="42" font-weight="300" fill="${p.ink}" opacity="0.6">ABCDEFGH · 0123456789</text>`;
  s += `<rect x="330" y="580" width="${360 + r() * 200}" height="10" rx="5" fill="${p.ink}" opacity="0.25"/>`;
  return s;
}

function sceneMobile(p: Palette, r: () => number): string {
  let s = "";
  for (let k = 0; k < 3; k++) {
    const x = 300 + k * 220;
    const y = 150 + (k === 1 ? -20 : 20);
    s += `<rect x="${x}" y="${y}" width="200" height="420" rx="28" fill="${p.ink}" opacity="${k === 1 ? 0.98 : 0.75}"/>`;
    s += `<rect x="${x + 72}" y="${y + 14}" width="56" height="8" rx="4" fill="${p.from}" opacity="0.25"/>`;
    s += `<rect x="${x + 16}" y="${y + 40}" width="168" height="${110 + r() * 40}" rx="12" fill="${p.to}" opacity="0.5"/>`;
    for (let i = 0; i < 3; i++) {
      s += `<rect x="${x + 16}" y="${y + 200 + i * 34}" width="${100 + r() * 66}" height="12" rx="6" fill="${p.from}" opacity="0.22"/>`;
    }
    s += `<rect x="${x + 16}" y="${y + 330}" width="168" height="36" rx="18" fill="${p.to}" opacity="0.8"/>`;
  }
  return s;
}

const RENDERERS: Record<Scene, (p: Palette, r: () => number) => string> = {
  browser: sceneBrowser,
  postGrid: scenePostGrid,
  video: sceneVideo,
  poster: scenePoster,
  chart: sceneChart,
  deck: sceneDeck,
  swatch: sceneSwatch,
  mobile: sceneMobile,
};

// ── Montagem da imagem ──────────────────────────────────────────────────────

function buildSvg(opts: {
  scene: Scene;
  palette: Palette;
  seed: string;
  title: string;
  kicker: string;
  caption: string;
}): string {
  const { scene, palette: p, seed } = opts;
  const r = seeded(seed);
  const gid = `g${Math.floor(r() * 1e9).toString(36)}`;
  const angle = 20 + Math.floor(r() * 50);

  const titleLines = wrap(opts.title, 34, 2);
  const titleY = 686 - (titleLines.length - 1) * 40;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.title)}">`,
    `<defs>`,
    `<linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1" gradientTransform="rotate(${angle} 0.5 0.5)">`,
    `<stop offset="0%" stop-color="${p.from}"/><stop offset="100%" stop-color="${p.to}"/>`,
    `</linearGradient>`,
    `<linearGradient id="${gid}v" x1="0" y1="0" x2="0" y2="1">`,
    `<stop offset="55%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity="0.55"/>`,
    `</linearGradient>`,
    `</defs>`,
    `<rect width="${W}" height="${H}" fill="url(#${gid})"/>`,
    `<circle cx="${1080 + r() * 60}" cy="${80 + r() * 60}" r="${180 + r() * 60}" fill="#fff" opacity="0.07"/>`,
    `<circle cx="${120 - r() * 60}" cy="${660 + r() * 40}" r="${200 + r() * 60}" fill="#000" opacity="0.08"/>`,
    `<g opacity="0.98">${RENDERERS[scene](p, r)}</g>`,
    `<rect width="${W}" height="${H}" fill="url(#${gid}v)"/>`,
    `<text x="72" y="${titleY - 34}" font-family="${FONT}" font-size="22" font-weight="600" letter-spacing="3" fill="${p.accent}" opacity="0.95">${esc(opts.kicker.toUpperCase())}</text>`,
    titleLines
      .map(
        (l, i) =>
          `<text x="72" y="${titleY + i * 46}" font-family="${FONT}" font-size="40" font-weight="700" fill="#fff">${esc(l)}</text>`,
      )
      .join(""),
    `<text x="72" y="${titleY + titleLines.length * 46 - 2}" font-family="${FONT}" font-size="21" font-weight="400" fill="#fff" opacity="0.72">${esc(opts.caption)}</text>`,
    `</svg>`,
  ].join("");
}

const OUT_DIR = path.resolve(
  __dirname,
  "../../../frontend/public/images/products",
);
const PUBLIC_PREFIX = "/images/products";

/** Grava o SVG na pasta pública do frontend e devolve o caminho web. */
function writeSvg(fileName: string, svg: string): string {
  if (APPLY) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(path.join(OUT_DIR, fileName), svg, "utf8");
  }
  return `${PUBLIC_PREFIX}/${fileName}`;
}

/** ALK-DES-001 → alk-des-001 */
function slug(code: string): string {
  return code
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// ── Execução ────────────────────────────────────────────────────────────────

async function main() {
  console.log(`▶ Imagens de produto — ${APPLY ? "APPLY" : "DRY-RUN"}${FORCE ? " (force)" : ""}\n`);

  const products = await prisma.product.findMany({ orderBy: { product_code: "asc" } });
  let touched = 0;
  let skipped = 0;
  let bytes = 0;

  for (const prod of products) {
    let meta: any = {};
    try {
      meta = JSON.parse(prod.metadata || "{}");
    } catch {
      /* metadata corrompido: recomeça */
    }

    // Capa própria (upload real, não gerada aqui) nunca é sobrescrita — mas o
    // produto ainda ganha portfólio se não tiver nenhum.
    const curated = Boolean(prod.image) && meta._imagesPlaceholder !== true && !FORCE;
    const hasPortfolio =
      Array.isArray(meta.portfolioImages) && meta.portfolioImages.length > 0;
    if (curated && hasPortfolio) {
      skipped++;
      console.log(`  ${prod.product_code?.padEnd(8)} ${prod.name} → já tem capa e portfólio próprios`);
      continue;
    }

    const palette = PALETTES[prod.category] ?? FALLBACK;
    const scenes = SCENES[prod.category] ?? SCENES["Estratégico e Vendas"];
    const code = meta.code || prod.product_code || prod.id;
    const base = slug(code);

    const mainPath = curated
      ? prod.image!
      : writeSvg(
          `${base}.svg`,
          buildSvg({
            scene: scenes[0],
            palette,
            seed: `${code}-main`,
            title: prod.name,
            kicker: prod.category,
            caption: `${code} · Allka`,
          }),
        );

    const portfolio = scenes.slice(1, 4).map((scene, i) => {
      const url = writeSvg(
        `${base}-portfolio-0${i + 1}.svg`,
        buildSvg({
          scene,
          palette,
          seed: `${code}-p${i + 1}`,
          title: prod.name,
          kicker: SCENE_LABEL[scene],
          caption: `${code} · peça ${i + 1} de 3`,
        }),
      );
      return {
        id: `${prod.id}-IMG-${String(i + 1).padStart(2, "0")}`,
        url,
        title: SCENE_LABEL[scene],
        description: `${SCENE_LABEL[scene]} — ${prod.name}`,
        isMain: false,
        sortOrder: i + 1,
      };
    });

    meta.portfolioImages = portfolio;
    meta.productImagePreview = mainPath;
    // Só marca a capa como preenchimento quando fomos nós que a geramos.
    if (!curated) meta._imagesPlaceholder = true;
    meta._portfolioPlaceholder = true;

    bytes += curated ? 3 : 4;
    touched++;

    if (APPLY) {
      await prisma.product.update({
        where: { id: prod.id },
        data: {
          image: mainPath,
          demonstrations: JSON.stringify([mainPath, ...portfolio.map((p) => p.url)]),
          metadata: JSON.stringify(meta),
          updated_at: new Date(),
        },
      });
    }

    if (touched <= 5 || touched % 20 === 0) {
      console.log(`  ${prod.product_code?.padEnd(8)} ${code.padEnd(12)} ${prod.name} → ${scenes[0]} + ${portfolio.length} portfólio`);
    }
  }

  console.log(
    `\n${APPLY ? "✅" : "◻"} ${touched} produtos com imagem gerada (${skipped} preservados com arte própria) · ${bytes} arquivos SVG em ${OUT_DIR}`,
  );
  if (!APPLY) console.log("(dry-run — nada foi escrito. Rode com --apply.)");
}

main()
  .catch((e) => {
    console.error("❌ Erro ao gerar imagens:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
