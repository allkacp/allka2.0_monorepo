// Fluxo das etapas de uma tarefa (reunião 2026-10-05, item A8): etapas em sequência, em paralelo ou dependendo de etapas específicas,
// e regra de quem executa (executor novo/automático ou o mesmo de outra etapa).
//
// Configuração no cadastro (por etapa, referenciando CHAVES de etapa da mesma tarefa):
//   depends_on = null      → padrão antigo: começa quando a etapa ANTERIOR (na ordem) termina
//   depends_on = []        → começa junto com a tarefa (sem esperar ninguém)
//   depends_on = ["a","b"] → começa quando TODAS as etapas listadas terminarem
//   executor_policy = "auto"         → o executor é escolhido pelo sistema (ou herda a regra de continuidade da tarefa)
//   executor_policy = "same_as_step" → mantém o MESMO executor da etapa indicada (executor_same_as_key)
// Tarefa sem nenhuma etapa configurada continua exatamente como sempre (sequência).

export const EXECUTOR_POLICIES = ["auto", "same_as_step", "prefer_same_as_step", "other_than_step"] as const;
/** Regras que apontam para OUTRA etapa (executor_same_as_key). */
export const REF_EXECUTOR_POLICIES = ["same_as_step", "prefer_same_as_step", "other_than_step"] as const;
export const isRefPolicy = (p: string | null | undefined) => (REF_EXECUTOR_POLICIES as readonly string[]).includes(p ?? "");
export type ExecutorPolicy = (typeof EXECUTOR_POLICIES)[number];
export const EXECUTOR_POLICY_LABEL: Record<ExecutorPolicy, string> = {
  auto: "Executor novo, escolhido automaticamente",
  same_as_step: "Mesmo executor de outra etapa",
  prefer_same_as_step: "Preferir o mesmo executor de outra etapa (oferece primeiro a ele, depois aos demais)",
  other_than_step: "Nunca o mesmo executor de outra etapa",
};

export const EXECUTOR_KINDS = ["nomad", "leader", "internal"] as const;
export type ExecutorKind = (typeof EXECUTOR_KINDS)[number];
export const EXECUTOR_KIND_LABEL: Record<ExecutorKind, string> = {
  nomad: "Nômade da plataforma (oferta e rodízio)",
  leader: "Líder",
  internal: "Equipe interna",
};
export const LEADER_MODES = ["auto", "specific"] as const;

/** Valida quem recebe a etapa (formato). A existência/atividade do líder é conferida no servidor. */
export function validateStepExecutor(s: { executor_kind?: string | null; leader_mode?: string | null; leader_user_id?: string | null; name?: string }): string | null {
  const kind = s.executor_kind ?? "nomad";
  if (!(EXECUTOR_KINDS as readonly string[]).includes(kind)) return `Tipo de executor inválido na etapa "${s.name ?? ""}".`;
  if (kind !== "leader") return null;
  const mode = s.leader_mode ?? "auto";
  if (!(LEADER_MODES as readonly string[]).includes(mode)) return `Modo de líder inválido na etapa "${s.name ?? ""}".`;
  if (mode === "specific" && !s.leader_user_id) return `A etapa "${s.name ?? ""}" vai para um líder específico, mas falta escolher qual.`;
  return null;
}

export interface FlowStep {
  key: string;
  name?: string;
  sort_order: number;
  /** JSON (string) ou array de chaves; null = sequência padrão. */
  depends_on_json?: string | null;
  depends_on?: string[] | null;
  executor_policy?: string | null;
  executor_same_as_key?: string | null;
  estimated_minutes?: number | null;
}

export function parseDepends(raw: unknown): string[] | null {
  if (raw == null) return null;
  let v: unknown = raw;
  if (typeof raw === "string") {
    try { v = JSON.parse(raw); } catch { return null; }
  }
  if (!Array.isArray(v)) return null;
  return [...new Set(v.filter((x): x is string => typeof x === "string" && x.length > 0))];
}

const dependsOf = (s: FlowStep): string[] | null => (s.depends_on !== undefined ? s.depends_on : parseDepends(s.depends_on_json));
const ordered = (steps: FlowStep[]) => [...steps].sort((a, b) => a.sort_order - b.sort_order);

/** A tarefa usa o fluxo configurado quando ao menos UMA etapa tem dependência explícita. Senão: sequência antiga. */
export function hasConfiguredFlow(steps: FlowStep[]): boolean {
  // também conta quando só há regra de executor (ex.: etapa 5 mantém o executor da 1 sem mexer na ordem)
  return steps.some((s) => dependsOf(s) !== null || (s.executor_policy ?? "auto") !== "auto");
}

/** Dependências "diretas" de cada etapa (chaves). Etapa com dependência nula depende da anterior na ordem; a primeira não depende de ninguém. */
export function directDeps(steps: FlowStep[]): Map<string, string[]> {
  const list = ordered(steps);
  const out = new Map<string, string[]>();
  list.forEach((s, i) => {
    const d = dependsOf(s);
    out.set(s.key, d === null ? (i === 0 ? [] : [list[i - 1].key]) : d);
  });
  return out;
}

/** Dependências considerando só as etapas MANTIDAS no cenário (as removidas "passam adiante" as dependências delas). */
export function effectiveDeps(all: FlowStep[], keptKeys: Set<string>): Map<string, string[]> {
  const direct = directDeps(all);
  const resolve = (key: string, seen = new Set<string>()): string[] => {
    const out: string[] = [];
    for (const d of direct.get(key) ?? []) {
      if (seen.has(d)) continue;
      seen.add(d);
      if (keptKeys.has(d)) out.push(d);
      else out.push(...resolve(d, seen));
    }
    return [...new Set(out)];
  };
  const res = new Map<string, string[]>();
  for (const s of all) if (keptKeys.has(s.key)) res.set(s.key, resolve(s.key));
  return res;
}

/** Erros do fluxo em português (vazio = válido). */
export function validateStepFlow(steps: FlowStep[]): string[] {
  const errs: string[] = [];
  const keys = new Set(steps.map((s) => s.key));
  const name = (k: string) => steps.find((s) => s.key === k)?.name ?? k;
  for (const s of steps) {
    const d = dependsOf(s);
    if (d) {
      for (const k of d) {
        if (k === s.key) errs.push(`A etapa "${name(s.key)}" não pode depender dela mesma.`);
        else if (!keys.has(k)) errs.push(`A etapa "${name(s.key)}" depende de uma etapa que não existe nesta tarefa ("${k}").`);
      }
    }
    const pol = s.executor_policy ?? "auto";
    if (!(EXECUTOR_POLICIES as readonly string[]).includes(pol)) errs.push(`Regra de executor inválida na etapa "${name(s.key)}".`);
    if (isRefPolicy(pol)) {
      if (!s.executor_same_as_key) errs.push(`A etapa "${name(s.key)}" tem uma regra de executor ligada a outra etapa, mas falta dizer de qual etapa.`);
      else if (!keys.has(s.executor_same_as_key)) errs.push(`A etapa "${name(s.key)}" quer o mesmo executor de uma etapa que não existe ("${s.executor_same_as_key}").`);
      else if (s.executor_same_as_key === s.key) errs.push(`A etapa "${name(s.key)}" não pode herdar o executor dela mesma.`);
    }
  }
  if (errs.length) return errs;
  // ciclo (DFS sobre as dependências diretas)
  const direct = directDeps(steps);
  const state = new Map<string, 0 | 1 | 2>();
  let cycle: string[] | null = null;
  const dfs = (k: string, path: string[]) => {
    if (cycle) return;
    state.set(k, 1);
    for (const d of direct.get(k) ?? []) {
      if (state.get(d) === 1) { cycle = [...path, k, d]; return; }
      if (!state.get(d)) dfs(d, [...path, k]);
    }
    state.set(k, 2);
  };
  for (const s of steps) if (!state.get(s.key)) dfs(s.key, []);
  if (cycle) errs.push(`O fluxo tem um círculo: ${(cycle as string[]).map(name).join(" → ")}. Uma etapa não pode esperar por outra que depende dela.`);
  if (!errs.length && steps.length > 0 && ![...direct.values()].some((d) => d.length === 0)) errs.push("Pelo menos uma etapa precisa poder começar sem esperar ninguém.");
  if (!errs.length) {
    // "mesmo executor de X" exige que X venha ANTES (X é ancestral)
    const anc = (k: string, seen = new Set<string>()): Set<string> => {
      for (const d of direct.get(k) ?? []) if (!seen.has(d)) { seen.add(d); anc(d, seen); }
      return seen;
    };
    for (const s of steps) {
      if (isRefPolicy(s.executor_policy) && s.executor_same_as_key && !anc(s.key).has(s.executor_same_as_key)) {
        errs.push(`A etapa "${name(s.key)}" só pode manter o executor de uma etapa que termina ANTES dela (de quem ela depende, direta ou indiretamente).`);
      }
    }
  }
  return errs;
}

/** Duração mínima da tarefa em minutos (caminho mais longo): etapas em paralelo contam só a mais demorada. */
export function criticalPathMinutes(steps: FlowStep[]): number {
  const direct = directDeps(steps);
  const mins = new Map(steps.map((s) => [s.key, Math.max(0, s.estimated_minutes ?? 0)]));
  const memo = new Map<string, number>();
  const finish = (k: string, guard = new Set<string>()): number => {
    if (memo.has(k)) return memo.get(k)!;
    if (guard.has(k)) return 0;
    guard.add(k);
    const start = Math.max(0, ...(direct.get(k) ?? []).map((d) => finish(d, guard)));
    guard.delete(k);
    const v = start + (mins.get(k) ?? 0);
    memo.set(k, v);
    return v;
  };
  return Math.max(0, ...steps.map((s) => finish(s.key)));
}

/** "Ondas" para exibição: etapas que podem acontecer ao mesmo tempo ficam na mesma onda. */
export function flowWaves(steps: FlowStep[]): string[][] {
  const direct = directDeps(steps);
  const level = new Map<string, number>();
  const lv = (k: string, guard = new Set<string>()): number => {
    if (level.has(k)) return level.get(k)!;
    if (guard.has(k)) return 0;
    guard.add(k);
    const v = Math.max(-1, ...(direct.get(k) ?? []).map((d) => lv(d, guard))) + 1;
    guard.delete(k);
    level.set(k, v);
    return v;
  };
  const waves: string[][] = [];
  for (const s of ordered(steps)) { const l = lv(s.key); (waves[l] ??= []).push(s.key); }
  return waves.filter(Boolean);
}
