"use client";

// Controles de variações, opções e adicionais (Pedido 3, fase 1): tipo de escolha, obrigatória,
// ativa, ordem, opção padrão, texto de ajuda, custo e vínculo com tarefa/etapa.
// Cada controle grava na hora (ao mudar/ao sair do campo), sem botão "salvar".
import { useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { Input } from "@/components/ui/input";
import { AvailabilityFields, AddonTypeFields } from "./catalog2-universal-ui";

type Act = (fn: () => Promise<any>, ok?: string) => Promise<any>;

const SELECTION_LABEL: Record<string, string> = {
  single: "Uma opção",
  multiple: "Várias opções",
  quantity: "Quantidade",
};
const SELECTION_HINT: Record<string, string> = {
  single: "O cliente escolhe exatamente uma opção.",
  multiple: "O cliente pode marcar várias opções; o efeito de cada marcada soma.",
  quantity: "O cliente informa um número. Os efeitos da opção valem POR UNIDADE (dias, valor fixo e percentual são multiplicados pela quantidade).",
};

export const CHARGE_SCOPES: [string, string, string][] = [
  ["recurring", "Em toda mensalidade", "O valor entra na primeira cobrança e em todas as renovações."],
  ["one_time", "Uma única vez", "Cobrado só na contratação. Nunca volta nas renovações."],
  ["first_cycle", "Só na primeira cobrança", "Como “uma única vez”, mas atrelado ao primeiro ciclo de entrega."],
  ["per_cycle", "Em ciclos específicos", "Cobrado só entre o ciclo inicial e o final que você escolher."],
  ["per_quantity", "Por quantidade", "O valor é multiplicado pela quantidade informada."],
];
export const chargeScopeLabel = (scope?: string | null) => CHARGE_SCOPES.find(([k]) => k === (scope ?? "recurring"))?.[1] ?? scope ?? "";
export interface ChargeValue { charge_scope?: string; charge_start_cycle?: number; charge_end_cycle?: number | null; charge_quantity?: number | null }

/** "Como cobrar": quando o valor de um adicional, efeito ou condição é cobrado (universal). Padrão: em toda mensalidade (como sempre foi). */
export function ChargeScopeFields({ value, onChange, disabled }: { value: ChargeValue; onChange: (v: ChargeValue) => void; disabled?: boolean }) {
  const scope = value.charge_scope ?? "recurring";
  const hint = CHARGE_SCOPES.find(([k]) => k === scope)?.[2];
  const num = (v: string) => (v === "" ? null : Math.max(0, Math.trunc(Number(v))));
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5 text-xs" title={hint}>
      <span className="font-semibold">Como cobrar:</span>
      <select disabled={disabled} aria-label="Como cobrar" className="h-7 rounded-md border border-slate-200 bg-white px-1.5 text-xs dark:border-slate-700 dark:bg-slate-900" value={scope} onChange={(e) => onChange({ ...value, charge_scope: e.target.value })}>
        {CHARGE_SCOPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      {scope === "per_cycle" && (
        <>
          <label className="inline-flex items-center gap-1">do ciclo <input disabled={disabled} type="number" min={0} aria-label="Ciclo inicial" className="h-7 w-14 rounded-md border border-slate-200 bg-white px-1 text-xs dark:border-slate-700 dark:bg-slate-900" value={value.charge_start_cycle ?? 0} onChange={(e) => onChange({ ...value, charge_start_cycle: num(e.target.value) ?? 0 })} /></label>
          <label className="inline-flex items-center gap-1">até o <input disabled={disabled} type="number" min={0} aria-label="Ciclo final" placeholder="sempre" className="h-7 w-16 rounded-md border border-slate-200 bg-white px-1 text-xs dark:border-slate-700 dark:bg-slate-900" value={value.charge_end_cycle ?? ""} onChange={(e) => onChange({ ...value, charge_end_cycle: num(e.target.value) })} /></label>
          <span className="text-[10px] text-slate-500">(0 = primeira cobrança)</span>
        </>
      )}
      {scope === "per_quantity" && (
        <label className="inline-flex items-center gap-1">quantidade <input disabled={disabled} type="number" min={1} aria-label="Quantidade cobrada" className="h-7 w-16 rounded-md border border-slate-200 bg-white px-1 text-xs dark:border-slate-700 dark:bg-slate-900" value={value.charge_quantity ?? ""} onChange={(e) => onChange({ ...value, charge_quantity: num(e.target.value) })} /></label>
      )}
    </span>
  );
}

function Check({ checked, onChange, disabled, children, title }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; children: React.ReactNode; title?: string }) {
  return (
    <label title={title} className={`inline-flex items-center gap-1.5 text-xs ${disabled ? "opacity-60" : "cursor-pointer"}`}>
      <input type="checkbox" disabled={disabled} checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {children}
    </label>
  );
}

function Arrows({ onUp, onDown, disableUp, disableDown, what }: { onUp: () => void; onDown: () => void; disableUp: boolean; disableDown: boolean; what: string }) {
  const cls = "rounded p-0.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-slate-800";
  return (
    <span className="inline-flex items-center">
      <button type="button" className={cls} disabled={disableUp} onClick={onUp} aria-label={`Subir ${what}`} title={`Subir ${what} na ordem que o cliente vê`}><ArrowUp className="h-3.5 w-3.5" /></button>
      <button type="button" className={cls} disabled={disableDown} onClick={onDown} aria-label={`Descer ${what}`} title={`Descer ${what} na ordem que o cliente vê`}><ArrowDown className="h-3.5 w-3.5" /></button>
    </span>
  );
}

/** Renumera a lista na nova ordem (1, 2, 3…) — serve mesmo quando todos estavam com a mesma posição. */
async function renumber<T extends { id: string; sort_order: number }>(items: T[], index: number, dir: -1 | 1, update: (id: string, body: any) => Promise<any>) {
  const next = [...items];
  const j = index + dir;
  if (j < 0 || j >= next.length) return;
  [next[index], next[j]] = [next[j], next[index]];
  for (let i = 0; i < next.length; i++) if (next[i].sort_order !== i + 1) await update(next[i].id, { sort_order: i + 1 });
}

export function VariationSettings({ va, index, list, readOnly, act }: { va: any; index: number; list: any[]; readOnly: boolean; act: Act }) {
  const [help, setHelp] = useState<string>(va.notes ?? "");
  const type = va.selection_type ?? "single";
  const put = (body: any, ok: string) => act(() => apiClient.updateCatalog2Variation(va.id, body), ok);
  return (
    <div className="mt-2 space-y-1.5 rounded-lg bg-slate-50 p-2 dark:bg-slate-800/40">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <label className="inline-flex items-center gap-1.5 text-xs" title="Como o cliente escolhe nesta variação">
          <span className="font-semibold">Tipo:</span>
          <select disabled={readOnly} className="h-7 rounded-md border border-slate-200 bg-white px-1.5 text-xs dark:border-slate-700 dark:bg-slate-900" value={type} onChange={(e) => void put({ selection_type: e.target.value }, "Tipo de escolha atualizado.")}>
            {Object.entries(SELECTION_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
        <Check disabled={readOnly} checked={va.is_required} onChange={(v) => void put({ is_required: v }, v ? "Variação obrigatória." : "Variação opcional.")} title="Se marcada, o cliente precisa escolher antes de contratar.">Obrigatória</Check>
        <Check disabled={readOnly} checked={va.is_active !== false} onChange={(v) => void put({ is_active: v }, v ? "Variação ativada." : "Variação desativada.")} title="Variação inativa não aparece para o cliente e não entra no preço.">Ativa</Check>
        {!readOnly && (
          <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-slate-500">
            Ordem <Arrows what="esta variação" disableUp={index === 0} disableDown={index === list.length - 1} onUp={() => void act(() => renumber(list, index, -1, apiClient.updateCatalog2Variation.bind(apiClient)))} onDown={() => void act(() => renumber(list, index, 1, apiClient.updateCatalog2Variation.bind(apiClient)))} />
          </span>
        )}
      </div>
      <p className="text-[10px] text-slate-500">{SELECTION_HINT[type]}</p>
      <label className="block">
        <span className="text-[10px] font-semibold text-slate-500">Texto de ajuda (o cliente vê)</span>
        <Input disabled={readOnly} maxLength={2000} className="mt-0.5 h-7 text-xs" value={help} onChange={(e) => setHelp(e.target.value)} onBlur={() => { if ((va.notes ?? "") !== help) void put({ notes: help.trim() ? help : null }, "Texto de ajuda salvo."); }} placeholder="Ex.: escolha o porte da sua empresa" />
      </label>
    </div>
  );
}

export function OptionSettings({ o, va, index, list, readOnly, act }: { o: any; va: any; index: number; list: any[]; readOnly: boolean; act: Act }) {
  const [label, setLabel] = useState<string>(o.label);
  const put = (body: any, ok: string) => act(() => apiClient.updateCatalog2Option(o.id, body), ok);
  const isQty = (va.selection_type ?? "single") === "quantity";
  return (
    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
      <Input disabled={readOnly} aria-label="Rótulo da opção" maxLength={160} className="h-7 w-44 text-xs" value={label} onChange={(e) => setLabel(e.target.value)} onBlur={() => { if (label.trim() && label !== o.label) void put({ label: label.trim() }, "Rótulo salvo."); }} />
      {!isQty && <Check disabled={readOnly} checked={!!o.is_default} onChange={(v) => void put({ is_default: v }, v ? "Opção padrão definida." : "Opção deixou de ser padrão.")} title={(va.selection_type ?? "single") === "multiple" ? "Já vem marcada para o cliente." : "É a opção que já vem escolhida. Só uma por variação."}>Padrão</Check>}
      <Check disabled={readOnly} checked={o.is_active !== false} onChange={(v) => void put({ is_active: v }, v ? "Opção ativada." : "Opção desativada.")} title="Opção inativa não aparece para o cliente e não entra no preço.">Ativa</Check>
      {isQty && <span className="text-[10px] text-slate-500">Efeitos abaixo valem por unidade.</span>}
      <AvailabilityFields o={o} readOnly={readOnly} act={act} />
      {!readOnly && <span className="ml-auto"><Arrows what="esta opção" disableUp={index === 0} disableDown={index === list.length - 1} onUp={() => void act(() => renumber(list, index, -1, apiClient.updateCatalog2Option.bind(apiClient)))} onDown={() => void act(() => renumber(list, index, 1, apiClient.updateCatalog2Option.bind(apiClient)))} /></span>}
    </div>
  );
}

export function AddonSettings({ a, index, list, version, readOnly, act }: { a: any; index: number; list: any[]; version: any; readOnly: boolean; act: Act }) {
  const [name, setName] = useState<string>(a.name);
  const [help, setHelp] = useState<string>(a.description ?? "");
  const [cost, setCost] = useState<string>(a.base_cost == null ? "" : String(a.base_cost));
  const put = (body: any, ok: string) => act(() => apiClient.updateCatalog2Addon(a.id, body), ok);
  const tasks: any[] = version.tasks ?? [];
  const steps: any[] = a.target_task_id ? (tasks.find((t) => t.id === a.target_task_id)?.steps ?? []) : tasks.flatMap((t) => t.steps ?? []);
  return (
    <div className="mt-2 space-y-1.5 rounded-lg bg-slate-50 p-2 dark:bg-slate-800/40">
      <div className="flex flex-wrap items-end gap-2">
        <label className="block min-w-[10rem] flex-1">
          <span className="text-[10px] font-semibold text-slate-500">Nome</span>
          <Input disabled={readOnly} maxLength={160} className="mt-0.5 h-7 text-xs" value={name} onChange={(e) => setName(e.target.value)} onBlur={() => { if (name.trim() && name !== a.name) void put({ name: name.trim() }, "Nome salvo."); }} />
        </label>
        <label className="block w-28">
          <span className="text-[10px] font-semibold text-slate-500">Custo (R$)</span>
          <Input disabled={readOnly} type="number" min={0} className="mt-0.5 h-7 text-xs" value={cost} onChange={(e) => setCost(e.target.value)} onBlur={() => { const n = cost === "" ? null : Number(cost); if (n !== a.base_cost && (n === null || (Number.isFinite(n) && n >= 0))) void put({ base_cost: n }, "Custo salvo."); }} />
        </label>
        <Check disabled={readOnly} checked={!!a.is_default_selected} onChange={(v) => void put({ is_default_selected: v }, v ? "Vem selecionado por padrão." : "Não vem mais selecionado.")} title="Já vem marcado para o cliente.">Selecionado por padrão</Check>
        <Check disabled={readOnly} checked={a.is_active !== false} onChange={(v) => void put({ is_active: v }, v ? "Adicional ativado." : "Adicional desativado.")} title="Adicional inativo não aparece para o cliente e não entra no preço.">Ativo</Check>
        {!readOnly && <span className="text-[10px] text-slate-500">Ordem <Arrows what="este adicional" disableUp={index === 0} disableDown={index === list.length - 1} onUp={() => void act(() => renumber(list, index, -1, apiClient.updateCatalog2Addon.bind(apiClient)))} onDown={() => void act(() => renumber(list, index, 1, apiClient.updateCatalog2Addon.bind(apiClient)))} /></span>}
      </div>
      <label className="block">
        <span className="text-[10px] font-semibold text-slate-500">Texto de ajuda (o cliente vê)</span>
        <Input disabled={readOnly} maxLength={4000} className="mt-0.5 h-7 text-xs" value={help} onChange={(e) => setHelp(e.target.value)} onBlur={() => { if ((a.description ?? "") !== help) void put({ description: help.trim() ? help : null }, "Texto de ajuda salvo."); }} placeholder="Explique o que este adicional inclui" />
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <ChargeScopeFields disabled={readOnly} value={a} onChange={(v) => void put({ charge_scope: v.charge_scope, charge_start_cycle: v.charge_start_cycle ?? 0, charge_end_cycle: v.charge_end_cycle ?? null, charge_quantity: v.charge_quantity ?? null }, "Forma de cobrança salva.")} />
      </div>
      <AddonTypeFields a={a} version={version} readOnly={readOnly} act={act} />
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-semibold">Vínculo:</span>
        <select disabled={readOnly} aria-label="Tarefa ligada ao adicional" className="h-7 max-w-[14rem] rounded-md border border-slate-200 bg-white px-1.5 text-xs dark:border-slate-700 dark:bg-slate-900" value={a.target_task_id ?? ""} onChange={(e) => void put({ target_task_id: e.target.value || null, target_step_id: null }, "Vínculo atualizado.")}>
          <option value="">Sem tarefa específica</option>
          {tasks.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select disabled={readOnly} aria-label="Etapa ligada ao adicional" className="h-7 max-w-[14rem] rounded-md border border-slate-200 bg-white px-1.5 text-xs dark:border-slate-700 dark:bg-slate-900" value={a.target_step_id ?? ""} onChange={(e) => void put({ target_step_id: e.target.value || null }, "Vínculo atualizado.")}>
          <option value="">Sem etapa específica</option>
          {steps.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <span className="text-[10px] text-slate-500">Informativo: indica a qual parte da entrega o adicional se refere.</span>
      </div>
    </div>
  );
}
