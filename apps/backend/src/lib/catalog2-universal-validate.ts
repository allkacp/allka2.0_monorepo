// Coerência da estrutura universal v2 antes de publicar uma versão (esforço, adicionais tipados, portões, prazos).
// Cada mensagem diz o que corrigir. Versão sem esses recursos → nenhuma pendência (nada muda para produtos antigos).
import type { Prisma, PrismaClient } from "@prisma/client";
import { isEffortEffect, validateEffortEffect } from "./catalog2-effort";
import { validateGateInput } from "./approval-gates";
import { validateSlaRuleInput } from "./sla";

type Db = PrismaClient | Prisma.TransactionClient;

export async function validateUniversalV2(db: Db, versionId: string): Promise<string[]> {
  const issues: string[] = [];
  const v = await db.catalog2ProductVersion.findUnique({
    where: { id: versionId },
    include: {
      tasks: { include: { steps: { select: { key: true } } } },
      variations: { include: { options: { include: { effects: true } } } },
      addons: { include: { effects: true, choices: true } },
      conditions: true,
      approval_gates: true,
      sla_rules: true,
    },
  });
  if (!v) return issues;
  const taskKeys = new Set(v.tasks.map((t) => t.key));
  const stepRefs = new Set(v.tasks.flatMap((t) => t.steps.map((s) => `${t.key}:${s.key}`)));
  const ctx = { taskKeys, stepRefs };

  // esforço: o alvo precisa continuar existindo
  const effortOf = (from: string, e: { effect_type: string; effect_value: string; charge_scope: string; source_task_key: string | null; source_step_key: string | null }) => {
    if (!isEffortEffect(e.effect_type)) return;
    const err = validateEffortEffect(e.effect_type, e.effect_value, e, ctx);
    if (err) issues.push(`Esforço em ${from}: ${err}`);
  };
  for (const va of v.variations) for (const o of va.options) for (const e of o.effects) effortOf(`"${va.name}" / "${o.label}"`, e);
  for (const a of v.addons) for (const e of a.effects) effortOf(`adicional "${a.name}"`, e);
  for (const c of v.conditions) effortOf(`condição "${c.name}"`, c);

  // adicionais tipados
  for (const a of v.addons) {
    const type = a.addon_type ?? "checkbox";
    if (type === "quantity" && a.qty_max != null && a.qty_max < (a.qty_min ?? 1)) issues.push(`Adicional "${a.name}": a quantidade máxima é menor que a mínima.`);
    if ((a.unit_minutes ?? 0) > 0 && !a.source_task_key) issues.push(`Adicional "${a.name}": tem minutos por unidade, mas nenhuma tarefa/etapa recebe o esforço.`);
    if ((a.unit_minutes ?? 0) > 0 && a.source_task_key && !taskKeys.has(a.source_task_key)) issues.push(`Adicional "${a.name}": a tarefa "${a.source_task_key}" do esforço não existe.`);
    if (a.source_task_key && a.source_step_key && !stepRefs.has(`${a.source_task_key}:${a.source_step_key}`)) issues.push(`Adicional "${a.name}": a etapa "${a.source_step_key}" do esforço não existe na tarefa.`);
    if ((type === "single_select" || type === "multi_select" || type === "range") && a.choices.filter((c) => c.is_active).length === 0) issues.push(`Adicional "${a.name}" (${type}): cadastre ao menos uma escolha ativa.`);
    if (type === "range" && a.choices.some((c) => c.qty_from == null && c.qty_to == null)) issues.push(`Adicional "${a.name}": toda faixa precisa de início e/ou fim.`);
  }

  // portões e prazos
  for (const g of v.approval_gates.filter((x) => x.is_active)) {
    const e = await validateGateInput(db, versionId, { ...g, description: g.description });
    if (e) issues.push(`Portão de aprovação "${g.name}": ${e}`);
  }
  for (const r of v.sla_rules.filter((x) => x.is_active)) {
    const e = await validateSlaRuleInput(db, versionId, { ...r, description: r.description });
    if (e) issues.push(`Prazo "${r.name}": ${e}`);
  }
  return issues;
}
