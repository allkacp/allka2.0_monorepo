// Preenchimento PROVISÓRIO da SIMULAÇÃO de precificação dos 36 produtos
// reais do catalog2 (reunião 10/09, "precificação... funcional para
// teste"). Três blocos independentes, todos idempotentes e todos restritos
// à estrutura de SIMULAÇÃO (nunca ao singleton comercial real nem a dado
// revisado por humano):
//
//   1. Catalog2PricingSimulationSettings (id="default") — criada UMA vez
//      com percentuais/ordem provisórios, documentados. Se a linha já
//      existir (desta execução ou de qualquer outra origem), NUNCA é
//      sobrescrita — evita apagar um ajuste manual futuro.
//   2. provisional_commercial_deadline_days por versão-rascunho dos 36
//      produtos reais — só quando o prazo REAL (base_commercial_deadline_days)
//      está ausente E o provisório ainda não foi preenchido. O real, quando
//      existir, sempre vence (nunca é lido/tocado aqui).
//   3. effort_ambiguous/effort_ambiguous_reason das tarefas já preenchidas
//      pelo classificador provisório (effort_source="provisional_fill_v1")
//      — recalculado de forma determinística a cada execução (mesmo
//      classify-provisional-effort.ts da 1ª fase); nunca toca
//      specialty_id/estimated_minutes nem tarefa human_reviewed.
import { PrismaClient } from "@prisma/client";
import { assertLocalDatabase } from "../assert-local-database";
import { classifyTaskEffort } from "./classify-provisional-effort";
import { WORKDAY_MINUTES } from "../catalog2-pricing";

const TEST_LOCAL_PREFIX = "[TESTE LOCAL]";
const SIMULATION_SOURCE = "provisional_simulation_v1";

// Percentuais PROVISÓRIOS de teste — plausíveis e documentados, mas NUNCA
// aprovados comercialmente. Impostos/comissão/taxa operacional reaproveitam
// a mesma ordem de grandeza do singleton real (referências fiscais/de
// mercado usuais); margem e revisão humana são deliberadamente mais
// conservadoras que a configuração real (30%/15%) para nunca serem
// confundidas com ela.
export const PROVISIONAL_PRICING_SIMULATION_SEED = {
  tax_percent: 6,
  commission_percent: 10,
  operational_fee_percent: 5,
  profit_margin_percent: 25,
  human_review_percent: 12,
  component_order_json: JSON.stringify(["tax", "commission", "operational", "margin"]),
  is_provisional: true,
  source: SIMULATION_SOURCE,
  notes:
    "Valores PROVISÓRIOS para teste (reunião 10/09) — nunca é configuração comercial aprovada. Impostos/comissão/taxa operacional na mesma ordem de grandeza do singleton real; margem (25%) e revisão humana (12%) deliberadamente diferentes da configuração real (30%/15%) para nunca serem confundidas com ela.",
};

// Prazo comercial provisório = dias de esforço humano estimado (soma dos
// minutos das tarefas humanas ÷ WORKDAY_MINUTES, arredondado pra cima) + um
// buffer fixo de revisão/ajuste interno, com piso mínimo — fórmula simples,
// determinística e documentada (nunca inventa valor arbitrário por produto).
export const PROVISIONAL_DEADLINE_BUFFER_DAYS = 3;
export const PROVISIONAL_DEADLINE_MIN_DAYS = 3;
const PROVISIONAL_DEADLINE_REASON_TEMPLATE = (effortDays: number, buffer: number) =>
  `Prazo comercial PROVISÓRIO para teste — dias de esforço humano estimado (${effortDays}) + buffer fixo de revisão/ajuste interno (${buffer} dias). NÃO é prazo comercial aprovado; nunca é promessa real ao cliente.`;

export interface DeadlineFillLine {
  product_name: string;
  version_id: string;
  outcome: "filled" | "skipped_has_real" | "skipped_already_provisional";
  provisional_commercial_deadline_days: number | null;
}

export interface AmbiguousBackfillLine {
  product_name: string;
  task_key: string;
  task_name: string;
  outcome: "updated" | "skipped_not_provisional_fill" | "skipped_human_reviewed";
  ambiguous: boolean;
  ambiguous_reason: string | null;
}

export interface PricingSimulationFillResult {
  mode: "dry_run" | "apply";
  settings_outcome: "created" | "already_exists";
  products_total: number;
  deadline_lines: DeadlineFillLine[];
  deadline_filled: number;
  deadline_skipped_has_real: number;
  deadline_skipped_already_provisional: number;
  ambiguous_lines: AmbiguousBackfillLine[];
  ambiguous_updated: number;
  ambiguous_total_true: number;
}

export async function runProvisionalPricingSimulationFill(opts: { mode: "dry_run" | "apply" }): Promise<PricingSimulationFillResult> {
  if (opts.mode === "apply") assertLocalDatabase(process.env.DATABASE_URL);
  const db = new PrismaClient();

  try {
    // ── 1. Catalog2PricingSimulationSettings — criação única, nunca sobrescreve ──
    const existingSettings = await db.catalog2PricingSimulationSettings.findUnique({ where: { id: "default" } });
    const settingsOutcome: "created" | "already_exists" = existingSettings ? "already_exists" : "created";
    if (!existingSettings && opts.mode === "apply") {
      await db.catalog2PricingSimulationSettings.create({ data: { id: "default", ...PROVISIONAL_PRICING_SIMULATION_SEED } });
    }

    // ── 2 & 3. por produto real (nunca [TESTE LOCAL]) ──
    const products = await db.catalog2Product.findMany({
      where: { NOT: { internal_name: { startsWith: TEST_LOCAL_PREFIX } } },
      orderBy: { internal_name: "asc" },
      include: {
        versions: {
          where: { state: "rascunho" },
          include: { tasks: true },
        },
      },
    });

    const deadlineLines: DeadlineFillLine[] = [];
    let deadlineFilled = 0;
    let deadlineSkippedHasReal = 0;
    let deadlineSkippedAlreadyProvisional = 0;

    const ambiguousLines: AmbiguousBackfillLine[] = [];
    let ambiguousUpdated = 0;
    let ambiguousTotalTrue = 0;

    for (const p of products) {
      const version = p.versions[0];
      if (!version) continue;

      // ── prazo comercial provisório ──
      if (version.base_commercial_deadline_days != null) {
        deadlineSkippedHasReal++;
        deadlineLines.push({ product_name: p.internal_name, version_id: version.id, outcome: "skipped_has_real", provisional_commercial_deadline_days: null });
      } else if (version.provisional_commercial_deadline_days != null) {
        deadlineSkippedAlreadyProvisional++;
        deadlineLines.push({ product_name: p.internal_name, version_id: version.id, outcome: "skipped_already_provisional", provisional_commercial_deadline_days: version.provisional_commercial_deadline_days });
      } else {
        // Sempre calculável (mesmo sem tarefa humana ainda estimada) — o
        // piso mínimo garante que os 36 produtos tenham prazo provisório
        // simulável desde já, nunca "aguardando" nesta camada de teste.
        const humanTasks = version.tasks.filter((t) => t.execution_mode !== "ia");
        const totalMinutes = humanTasks.reduce((a, t) => a + (t.estimated_minutes ?? 0), 0);
        const effortDays = totalMinutes > 0 ? Math.ceil(totalMinutes / WORKDAY_MINUTES) : 0;
        const days = Math.max(PROVISIONAL_DEADLINE_MIN_DAYS, effortDays + PROVISIONAL_DEADLINE_BUFFER_DAYS);
        if (opts.mode === "apply") {
          await db.catalog2ProductVersion.update({
            where: { id: version.id },
            data: {
              provisional_commercial_deadline_days: days,
              provisional_deadline_reason: PROVISIONAL_DEADLINE_REASON_TEMPLATE(effortDays, PROVISIONAL_DEADLINE_BUFFER_DAYS),
              provisional_deadline_source: SIMULATION_SOURCE,
            },
          });
        }
        deadlineFilled++;
        deadlineLines.push({ product_name: p.internal_name, version_id: version.id, outcome: "filled", provisional_commercial_deadline_days: days });
      }

      // ── ambiguidade das tarefas preenchidas provisoriamente ──
      for (const t of version.tasks) {
        if (t.effort_source === "human_reviewed") {
          ambiguousLines.push({ product_name: p.internal_name, task_key: t.key, task_name: t.name, outcome: "skipped_human_reviewed", ambiguous: false, ambiguous_reason: null });
          continue;
        }
        if (t.effort_source !== "provisional_fill_v1") {
          ambiguousLines.push({ product_name: p.internal_name, task_key: t.key, task_name: t.name, outcome: "skipped_not_provisional_fill", ambiguous: false, ambiguous_reason: null });
          continue;
        }
        const estimate = classifyTaskEffort(p.internal_name, t.name);
        if (opts.mode === "apply") {
          await db.catalog2Task.update({
            where: { id: t.id },
            data: { effort_ambiguous: estimate.ambiguous, effort_ambiguous_reason: estimate.ambiguous_reason },
          });
        }
        ambiguousUpdated++;
        if (estimate.ambiguous) ambiguousTotalTrue++;
        ambiguousLines.push({ product_name: p.internal_name, task_key: t.key, task_name: t.name, outcome: "updated", ambiguous: estimate.ambiguous, ambiguous_reason: estimate.ambiguous_reason });
      }
    }

    return {
      mode: opts.mode,
      settings_outcome: settingsOutcome,
      products_total: products.length,
      deadline_lines: deadlineLines,
      deadline_filled: deadlineFilled,
      deadline_skipped_has_real: deadlineSkippedHasReal,
      deadline_skipped_already_provisional: deadlineSkippedAlreadyProvisional,
      ambiguous_lines: ambiguousLines,
      ambiguous_updated: ambiguousUpdated,
      ambiguous_total_true: ambiguousTotalTrue,
    };
  } finally {
    await db.$disconnect();
  }
}
