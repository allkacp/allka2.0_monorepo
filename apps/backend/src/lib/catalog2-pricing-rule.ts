// FONTE ÚNICA da regra de preço (2026-10-02).
//
// Todo cálculo (simulação do admin, lista, pré-visualização, cotação, carrinho, checkout, contrato, relatórios, API e memória de cálculo)
// passa por computePricing, que lê SEMPRE esta regra: Catalog2PricingSettings (percentuais, ordem, bases), o valor/hora de cada
// especialidade e os componentes personalizados. Não existe mais uma segunda configuração "provisória" alimentando telas.
//
// Cada combinação distinta da regra recebe um número de versão estável (hash do conteúdo), gravado na memória de cálculo.
import crypto from "node:crypto";
import { prisma } from "./prisma";

export interface PricingRuleSnapshot {
  /** Número sequencial da versão da regra (mesmo conteúdo = mesmo número). null só se o banco recusar a gravação. */
  version: number | null;
  hash: string;
  calculated_at: string;
  currency: string;
  source: string;
  configured: boolean;
  tax_percent: number | null;
  commission_percent: number | null;
  operational_fee_percent: number | null;
  profit_margin_percent: number | null;
  /** Percentual padrão de qualificação/revisão humana sobre o custo humano da tarefa. */
  qualification_percent: number | null;
  component_order: string[];
  component_base: Record<string, string>;
  disabled_components: string[];
  custom_components: Array<{ key: string; label: string; percent: number | null }>;
}

const cache = new Map<string, number>();

function parseArr(raw: string | null | undefined): string[] {
  try { const v = raw ? JSON.parse(raw) : []; return Array.isArray(v) ? v.map(String) : []; } catch { return []; }
}
function parseObj(raw: string | null | undefined): Record<string, string> {
  try { const v = raw ? JSON.parse(raw) : {}; return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, string>) : {}; } catch { return {}; }
}

export interface RuleInputs {
  settings: {
    currency: string; tax_percent: number | null; commission_percent: number | null; operational_fee_percent: number | null; profit_margin_percent: number | null;
    human_review_percent: number | null; component_order_json: string | null; component_base_json: string | null; disabled_components_json: string | null;
  } | null;
  customComponents: Array<{ key: string; label: string; percent: number | null }>;
}

/** Monta o retrato da regra vigente e garante o número de versão. Escreve no banco só na PRIMEIRA vez que uma regra nova aparece. */
export async function snapshotPricingRule(inputs: RuleInputs, calculatedAt = new Date()): Promise<PricingRuleSnapshot> {
  const s = inputs.settings;
  const base: Omit<PricingRuleSnapshot, "version" | "hash" | "calculated_at"> = {
    currency: s?.currency ?? "BRL",
    source: "catalog2_pricing_settings:default",
    configured: !!s,
    tax_percent: s?.tax_percent ?? null,
    commission_percent: s?.commission_percent ?? null,
    operational_fee_percent: s?.operational_fee_percent ?? null,
    profit_margin_percent: s?.profit_margin_percent ?? null,
    qualification_percent: s?.human_review_percent ?? null,
    component_order: parseArr(s?.component_order_json),
    component_base: parseObj(s?.component_base_json),
    disabled_components: parseArr(s?.disabled_components_json),
    custom_components: inputs.customComponents.map((c) => ({ key: c.key, label: c.label, percent: c.percent ?? null })),
  };
  // O valor/hora de TODAS as especialidades também faz parte da regra: mudou o valor/hora, mudou a versão.
  const specs = await prisma.catalog2Specialty.findMany({ select: { id: true, max_hourly_rate: true }, orderBy: { id: "asc" } });
  const content = JSON.stringify({ base, rates: specs.map((x) => [x.id, x.max_hourly_rate ?? null]) });
  const hash = crypto.createHash("sha256").update(content).digest("hex");
  let version = cache.get(hash) ?? null;
  if (version == null) {
    try {
      const found = await prisma.catalog2PricingRuleVersion.findUnique({ where: { hash } });
      if (found) version = found.id;
      else {
        try { version = (await prisma.catalog2PricingRuleVersion.create({ data: { hash, snapshot_json: content } })).id; }
        catch { version = (await prisma.catalog2PricingRuleVersion.findUnique({ where: { hash } }))?.id ?? null; }
      }
    } catch { version = null; }
    if (version != null) cache.set(hash, version);
  }
  return { version, hash, calculated_at: calculatedAt.toISOString(), ...base };
}
