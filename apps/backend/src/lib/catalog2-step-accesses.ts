// P-12 (reunião 07/10, decisão de 08/10): os acessos do produto passam a ter UM cadastro só (as exigências de conexão do módulo
// "Conexões e acessos"). Cada ETAPA diz quais acessos usa: "todos" ou só os escolhidos; o nômade só vê os acessos da etapa dele.
// Sem escolha explícita, vale o padrão antigo: a etapa de validação de acessos usa todos; as demais, nenhum.
import { normalizeStepOps } from "./catalog2-ops";

export interface StepAccess { key: string; access_type: string; label: string; is_required: boolean; notes: string | null }
export interface RequirementLike {
  key: string; label: string | null; obligation: string; instructions: string | null;
  connection_type: { key: string; name: string };
}

export function toStepAccess(r: RequirementLike): StepAccess {
  return { key: r.key, access_type: r.connection_type.key, label: r.label?.trim() || r.connection_type.name, is_required: r.obligation !== "optional", notes: r.instructions };
}

/** Acessos que UMA etapa usa, conforme a escolha guardada em ops (all / some / padrão). */
export function accessesForStep(reqs: RequirementLike[], opsRaw: unknown, isAccessValidation: boolean): StepAccess[] {
  const ops = normalizeStepOps(opsRaw);
  if (ops?.access_scope === "some") {
    const chosen = new Set(ops.access_keys ?? []);
    return reqs.filter((r) => chosen.has(r.key)).map(toStepAccess);
  }
  if (ops?.access_scope === "all" || isAccessValidation) return reqs.map(toStepAccess);
  return [];
}

/** Acessos que a TAREFA inteira precisa (união dos acessos de suas etapas). Sem etapa que escolha, vale a lista toda do produto. */
export function accessesForTask(reqs: RequirementLike[], steps: { ops: unknown; isAccessValidation: boolean }[]): StepAccess[] {
  const explicit = steps.some((s) => { const sc = normalizeStepOps(s.ops)?.access_scope; return sc === "some" || sc === "all"; });
  if (!explicit) return reqs.map(toStepAccess);
  const seen = new Map<string, StepAccess>();
  for (const s of steps) for (const a of accessesForStep(reqs, s.ops, s.isAccessValidation)) seen.set(a.key, a);
  return [...seen.values()];
}
