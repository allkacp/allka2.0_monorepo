// Leitura das planilhas de origem para a importação dos 36 produtos
// (sprint de produtos, bloco 4/6). Funções puras + leitura de arquivo. As
// planilhas ficam FORA do repo (pasta `allka-plataforma/`).

import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import * as XLSX from "xlsx";

// v2: corrige o mapeamento de PILAR (as chaves estavam com "A. "/"B. " e o
// ponto virava espaço em norm(), então nenhum pilar casava) e passa a
// reaplicar pilar/categoria/4F também na reimportação.
export const IMPORT_RULE_VERSION = "36-produtos-2";
export const MAIN_FILE = "Allka_Proposta_Catalogo_Produtos_v9.xlsx";
export const ROSE_FILE = "Review Rose.xlsx";
export const ATA_FILE = "Reunião iniciada às 2026_08_26 10_56 GMT-03_00 - Anotações do Gemini.pdf";

export function sha256File(p: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
}

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

export function slugForProduct(index: number, name: string): string {
  const s = norm(name).replace(/ /g, "-").slice(0, 60) || "produto";
  return `p${String(index).padStart(2, "0")}-${s}`;
}

// ── Variações / adicionais em texto livre → estrutura SÓ quando é seguro ──

export interface ParsedVariation {
  name: string;
  options: string[];
}
export interface ParseResult<T> {
  structured: T;
  ambiguous: boolean;
  raw: string;
}

/**
 * "Nome (a / b / c); Outro (x / y)" → [{name:"Nome",options:[a,b,c]}, ...].
 * Qualquer coisa que não caiba nesse padrão → ambiguous:true, structured:[].
 */
export function parseVariationsText(text: string): ParseResult<ParsedVariation[]> {
  const raw = (text ?? "").trim();
  if (!raw) return { structured: [], ambiguous: false, raw };
  // Multi-linha ou explicações longas → não estruturar.
  if (raw.includes("\n") || raw.length > 400) return { structured: [], ambiguous: true, raw };
  const segs = raw.split(";").map((s) => s.trim()).filter(Boolean);
  const out: ParsedVariation[] = [];
  for (const seg of segs) {
    const m = seg.match(/^(.+?)\s*\(([^()]+)\)\.?$/);
    if (!m) return { structured: [], ambiguous: true, raw };
    const name = m[1].trim().replace(/\.$/, "");
    const opts = m[2]
      .split(/\s*\/\s*|,| ou /i)
      .map((o) => o.trim())
      .filter(Boolean);
    if (!name || opts.length < 2) return { structured: [], ambiguous: true, raw };
    out.push({ name, options: opts });
  }
  return { structured: out, ambiguous: false, raw };
}

/** "A; B; C" → nomes de adicionais. Frases longas → ambiguous. */
export function parseAddonsText(text: string): ParseResult<string[]> {
  const raw = (text ?? "").trim();
  if (!raw) return { structured: [], ambiguous: false, raw };
  if (raw.includes("\n")) return { structured: [], ambiguous: true, raw };
  const parts = raw.split(";").map((s) => s.trim().replace(/\.$/, "")).filter(Boolean);
  if (parts.length === 0) return { structured: [], ambiguous: true, raw };
  // Cada parte deve ser curta (nome de add-on), não um parágrafo.
  if (parts.some((p) => p.length > 120)) return { structured: [], ambiguous: true, raw };
  return { structured: parts, ambiguous: false, raw };
}

// ── Estruturas de origem ──────────────────────────────────────────────

export interface MainProductRow {
  index: number;
  name: string;
  pillar_label: string;
  category_label: string;
  four_f: string[]; // ["fundacao","fluxo",...]
  origin: "existente" | "novo" | "reativado";
  price_min: number | null;
  price_max: number | null;
  cardapio_description: string;
  cardapio_variations_text: string;
  cardapio_addons_text: string;
  cardapio_ia_steps_text: string;
  ia_human_note: string | null; // dos "Novos e Reativados"
}

export interface RoseRow {
  index: number;
  pillar: string;
  name: string;
  area: string;
  descricao_atualizada: string;
  variacoes_atualizadas: string;
  portfolio_material: string;
}

// Chaves na forma JÁ NORMALIZADA por `norm()` (sem o "A. "/"B. " — o ponto
// vira espaço e é colapsado). Os rótulos reais da planilha são
// "A. Presença Digital e Conversão" etc.
const PILLAR_KEY: Record<string, string> = {
  "a presenca digital e conversao": "presenca_digital",
  "b captacao de leads e automacao": "captacao_leads",
  "c redes sociais e conteudo": "redes_conteudo",
  "d branding e design": "branding_design",
  "e campanhas offline e impresso": "campanhas_offline",
};
const CATEGORY_KEY: Record<string, string> = {
  performance: "performance",
  "solucoes web": "solucoes_web",
  "vendas e automacoes": "vendas_automacoes",
  redacao: "redacao",
  design: "design",
};

export function pillarKeyFromLabel(label: string): string | null {
  return PILLAR_KEY[norm(label)] ?? null;
}
export function categoryKeyFromLabel(label: string): string | null {
  return CATEGORY_KEY[norm(label)] ?? null;
}

export interface LoadedSources {
  dir: string;
  mainPath: string;
  rosePath: string;
  ataPath: string | null;
  mainChecksum: string;
  roseChecksum: string;
  ataChecksum: string | null;
  rowCountMain: number;
  rowCountRose: number;
  products: MainProductRow[];
  rose: RoseRow[];
  // main index -> rose row (só os 21 casados)
  roseByMainIndex: Map<number, RoseRow>;
  ambiguousMatches: Array<{ rose_name: string; best_guess: string | null }>;
}

function sheet(wb: XLSX.WorkBook, name: string): (string | number | null | undefined)[][] {
  const ws = wb.Sheets[name];
  if (!ws) throw new Error(`Aba "${name}" não encontrada. Abas: ${wb.SheetNames.join(", ")}`);
  return XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false }) as (string | number | null | undefined)[][];
}

function findAta(dir: string): string | null {
  // A ata pode estar na pasta das planilhas OU um/dois níveis acima
  // (`_DESENVOLVIMENTOS/..` → `Verificação 2.0/`).
  for (const cand of [dir, path.resolve(dir, ".."), path.resolve(dir, "..", ".."), path.resolve(dir, "..", "..", "..")]) {
    const p = path.join(cand, ATA_FILE);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

export function loadSources(dir: string): LoadedSources {
  const mainPath = path.join(dir, MAIN_FILE);
  const rosePath = path.join(dir, ROSE_FILE);
  const ataPath = findAta(dir);
  for (const p of [mainPath, rosePath]) {
    if (!fs.existsSync(p)) throw new Error(`Planilha não encontrada: ${p}`);
  }
  const mainWb = XLSX.readFile(mainPath);
  const roseWb = XLSX.readFile(rosePath);

  const filterRows = sheet(mainWb, "Catálogo com Filtros");
  const cardapioRows = sheet(mainWb, "Cardápio — Descrição Completa");
  const novosRows = sheet(mainWb, "Novos e Reativados (detalhe)");
  const roseRawRows = sheet(roseWb, roseWb.SheetNames[0]);

  // Cardápio: header em índice 2; col 2=produto, 3=desc, 4=var, 5=add, 6=ia.
  const cardapio = new Map<string, { desc: string; vars: string; addons: string; ia: string }>();
  for (const r of cardapioRows) {
    const name = String(r?.[2] ?? "").trim();
    if (!name || norm(name) === "produto") continue;
    cardapio.set(norm(name), { desc: String(r?.[3] ?? "").trim(), vars: String(r?.[4] ?? "").trim(), addons: String(r?.[5] ?? "").trim(), ia: String(r?.[6] ?? "").trim() });
  }
  // Novos e reativados: col 2=produto, 4=como funciona (IA+humano).
  const iaHuman = new Map<string, string>();
  for (const r of novosRows.slice(1)) {
    const name = String(r?.[2] ?? "").replace(/—\s*REATIVADO/i, "").trim();
    if (name) iaHuman.set(norm(name), String(r?.[4] ?? "").trim());
  }

  const originOf = (raw: string): "existente" | "novo" | "reativado" => {
    const n = norm(raw);
    if (n.includes("novo")) return "novo";
    if (n.includes("reativ")) return "reativado";
    return "existente";
  };

  const products: MainProductRow[] = filterRows
    .slice(1)
    .filter((r) => r && r[0] != null && String(r[2] ?? "").trim())
    .map((r) => {
      const name = String(r[2]).trim();
      const four_f: string[] = [];
      if (String(r[4] ?? "").trim().toUpperCase() === "X") four_f.push("fundacao");
      if (String(r[5] ?? "").trim().toUpperCase() === "X") four_f.push("fluxo");
      if (String(r[6] ?? "").trim().toUpperCase() === "X") four_f.push("forca");
      if (String(r[7] ?? "").trim().toUpperCase() === "X") four_f.push("fidelizacao");
      const card = cardapio.get(norm(name)) ?? { desc: "", vars: "", addons: "", ia: "" };
      const toNum = (v: unknown) => (typeof v === "number" ? v : Number(v) || null);
      return {
        index: Number(r[0]),
        name,
        pillar_label: String(r[1] ?? "").trim(),
        category_label: String(r[3] ?? "").trim(),
        four_f,
        origin: originOf(String(r[8] ?? "")),
        price_min: toNum(r[11]),
        price_max: toNum(r[12]),
        cardapio_description: card.desc,
        cardapio_variations_text: card.vars,
        cardapio_addons_text: card.addons,
        cardapio_ia_steps_text: card.ia,
        ia_human_note: iaHuman.get(norm(name)) ?? null,
      };
    });

  const rose: RoseRow[] = roseRawRows
    .slice(1)
    .filter((r) => r && String(r[1] ?? "").trim())
    .map((r, i) => ({
      index: i + 1,
      pillar: String(r[0] ?? "").trim(),
      name: String(r[1] ?? "").trim(),
      area: String(r[2] ?? "").trim(),
      descricao_atualizada: String(r[3] ?? "").trim(),
      variacoes_atualizadas: String(r[4] ?? "").trim(),
      portfolio_material: String(r[5] ?? "").trim(),
    }));

  // Casa cada linha da Rose com o produto principal mais próximo.
  const roseByMainIndex = new Map<number, RoseRow>();
  const ambiguousMatches: LoadedSources["ambiguousMatches"] = [];
  const usedMain = new Set<number>();
  for (const rp of rose) {
    let best: MainProductRow | null = null;
    let bestScore = 0;
    const rt = tokens(rp.name);
    for (const mp of products) {
      if (usedMain.has(mp.index)) continue;
      const s = overlap(rt, tokens(mp.name));
      if (s > bestScore) {
        bestScore = s;
        best = mp;
      }
    }
    if (best && bestScore >= 2) {
      roseByMainIndex.set(best.index, rp);
      usedMain.add(best.index);
    } else {
      ambiguousMatches.push({ rose_name: rp.name, best_guess: best?.name ?? null });
    }
  }

  return {
    dir,
    mainPath,
    rosePath,
    ataPath,
    mainChecksum: sha256File(mainPath),
    roseChecksum: sha256File(rosePath),
    ataChecksum: ataPath ? sha256File(ataPath) : null,
    rowCountMain: filterRows.length,
    rowCountRose: roseRawRows.length,
    products,
    rose,
    roseByMainIndex,
    ambiguousMatches,
  };
}
