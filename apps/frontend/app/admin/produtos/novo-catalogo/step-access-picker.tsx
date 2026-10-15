"use client";

// P-12 (08/10): cada etapa diz quais acessos do produto usa — o padrão, todos, ou só os escolhidos. O nômade só vê os acessos da etapa dele.
// 14/10: um acesso cadastrado dentro de uma etapa pode ficar "disponível para as outras etapas". Nas outras etapas ele aparece aqui,
// sempre à vista, para marcar — sem cadastrar de novo. O cadastro continua sendo um só (exigências de conexão do produto).
export type StepAccessScope = "default" | "all" | "some";
interface Req { key: string; label?: string | null; connection_type?: { name?: string | null } | null; when_step_key?: string | null; shared_with_steps?: boolean }

export const scopeOf = (ops: any): StepAccessScope => (ops?.access_scope === "all" ? "all" : ops?.access_scope === "some" ? "some" : "default");

/** Aplica a escolha ao ops da etapa: "padrão" apaga os campos; "todos" guarda só o escopo; "só os escolhidos" guarda as chaves. */
export function accessPatch(scope: StepAccessScope, keys: string[]): Record<string, unknown> {
  if (scope === "default") return { access_scope: undefined, access_keys: undefined };
  if (scope === "all") return { access_scope: "all", access_keys: undefined };
  return { access_scope: "some", access_keys: keys };
}

/** Separa o que esta etapa pode escolher: os acessos "dela" (produto, tarefa, ou cadastrados nela) e os de OUTRAS etapas marcados como disponíveis. */
export function splitAccesses(requirements: Req[], stepKey?: string | null): { own: Req[]; shared: Req[] } {
  if (!stepKey) return { own: requirements, shared: [] };
  const own: Req[] = []; const shared: Req[] = [];
  for (const r of requirements) {
    if (!r.when_step_key || r.when_step_key === stepKey) own.push(r);
    else if (r.shared_with_steps) shared.push(r);
  }
  return { own, shared };
}

export function StepAccessPicker({ requirements, value, disabled, onChange, stepKey, stepNames }: { requirements: Req[]; value: any; disabled?: boolean; onChange: (patch: Record<string, unknown>) => void; stepKey?: string | null; stepNames?: Record<string, string> }) {
  const scope = scopeOf(value);
  const keys: string[] = Array.isArray(value?.access_keys) ? value.access_keys : [];
  const nameOf = (r: Req) => r.label?.trim() || r.connection_type?.name || r.key;
  const { own, shared } = splitAccesses(requirements, stepKey);
  // Marcar um acesso de outra etapa já passa a etapa para "só os que eu escolher" (mantendo o que estava marcado).
  const toggleShared = (key: string, on: boolean) => {
    if (scope === "all") return;
    onChange(accessPatch("some", on ? [...keys, key] : keys.filter((k) => k !== key)));
  };
  return (
    <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/60 p-2.5 text-sm dark:border-slate-700 dark:bg-slate-800/30" data-testid="step-access-picker">
      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
        Quais acessos esta etapa usa
        <select aria-label="Quais acessos esta etapa usa" disabled={disabled} className="mt-1 h-9 w-full rounded-md border border-slate-200 bg-white px-2.5 text-sm dark:border-slate-700 dark:bg-slate-900" value={scope} onChange={(e) => onChange(accessPatch(e.target.value as StepAccessScope, keys))}>
          <option value="default">Padrão</option>
          <option value="all">Todos os acessos do produto</option>
          <option value="some">Só os que eu escolher</option>
        </select>
      </label>
      {scope === "some" && (
        own.length === 0 && shared.length === 0
          ? <p className="text-xs text-amber-700">O produto ainda não tem acessos cadastrados. Cadastre em “Conexões e acessos” do produto.</p>
          : own.length > 0 && <ul className="grid gap-1 sm:grid-cols-2">
              {own.map((r) => (
                <li key={r.key}>
                  <label className="flex items-center gap-2 text-xs">
                    <input type="checkbox" className="h-4 w-4" disabled={disabled} checked={keys.includes(r.key)} onChange={(e) => onChange(accessPatch("some", e.target.checked ? [...keys, r.key] : keys.filter((k) => k !== r.key)))} />
                    {nameOf(r)}
                  </label>
                </li>
              ))}
            </ul>
      )}
      {shared.length > 0 && (
        <div className="rounded-md border border-violet-200 bg-violet-50/70 p-2 dark:border-violet-900 dark:bg-violet-950/20" data-testid="shared-accesses">
          <p className="text-xs font-semibold text-violet-800 dark:text-violet-200">Acessos de outras etapas, disponíveis para usar aqui</p>
          <ul className="mt-1 grid gap-1 sm:grid-cols-2">
            {shared.map((r) => (
              <li key={r.key}>
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" className="h-4 w-4" disabled={disabled || scope === "all"} checked={scope === "all" || keys.includes(r.key)} onChange={(e) => toggleShared(r.key, e.target.checked)} />
                  <span>{nameOf(r)}<span className="ml-1 text-[10px] text-slate-500">(cadastrado na etapa {stepNames?.[r.when_step_key ?? ""] ?? r.when_step_key})</span></span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
