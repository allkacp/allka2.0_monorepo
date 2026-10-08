"use client";

// P-12 (08/10): cada etapa diz quais acessos do produto usa — o padrão, todos, ou só os escolhidos. O nômade só vê os acessos da etapa dele.
// O cadastro dos acessos é um só (exigências de conexão do produto); aqui só se escolhe quais valem para ESTA etapa.
export type StepAccessScope = "default" | "all" | "some";
interface Req { key: string; label?: string | null; connection_type?: { name?: string | null } | null }

export const scopeOf = (ops: any): StepAccessScope => (ops?.access_scope === "all" ? "all" : ops?.access_scope === "some" ? "some" : "default");

/** Aplica a escolha ao ops da etapa: "padrão" apaga os campos; "todos" guarda só o escopo; "só os escolhidos" guarda as chaves. */
export function accessPatch(scope: StepAccessScope, keys: string[]): Record<string, unknown> {
  if (scope === "default") return { access_scope: undefined, access_keys: undefined };
  if (scope === "all") return { access_scope: "all", access_keys: undefined };
  return { access_scope: "some", access_keys: keys };
}

export function StepAccessPicker({ requirements, value, disabled, onChange }: { requirements: Req[]; value: any; disabled?: boolean; onChange: (patch: Record<string, unknown>) => void }) {
  const scope = scopeOf(value);
  const keys: string[] = Array.isArray(value?.access_keys) ? value.access_keys : [];
  const nameOf = (r: Req) => r.label?.trim() || r.connection_type?.name || r.key;
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-2.5 text-sm dark:border-slate-700 dark:bg-slate-800/30" data-testid="step-access-picker">
      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300" title="Quais acessos do produto esta etapa usa. Padrão: a etapa de validação de acessos usa todos e as demais, nenhum. O nômade só vê os acessos da etapa dele.">
        Quais acessos esta etapa usa
        <select aria-label="Quais acessos esta etapa usa" disabled={disabled} className="mt-1 h-9 w-full rounded-md border border-slate-200 bg-white px-2.5 text-sm dark:border-slate-700 dark:bg-slate-900" value={scope} onChange={(e) => onChange(accessPatch(e.target.value as StepAccessScope, keys))}>
          <option value="default">Padrão</option>
          <option value="all">Todos os acessos do produto</option>
          <option value="some">Só os que eu escolher</option>
        </select>
      </label>
      {scope === "some" && (
        requirements.length === 0
          ? <p className="mt-2 text-xs text-amber-700">O produto ainda não tem acessos cadastrados. Cadastre em “Conexões e acessos” do produto.</p>
          : <ul className="mt-2 grid gap-1 sm:grid-cols-2">
              {requirements.map((r) => (
                <li key={r.key}>
                  <label className="flex items-center gap-2 text-xs">
                    <input type="checkbox" className="h-4 w-4" disabled={disabled} checked={keys.includes(r.key)} onChange={(e) => onChange(accessPatch("some", e.target.checked ? [...keys, r.key] : keys.filter((k) => k !== r.key)))} />
                    {nameOf(r)}
                  </label>
                </li>
              ))}
            </ul>
      )}
    </div>
  );
}
