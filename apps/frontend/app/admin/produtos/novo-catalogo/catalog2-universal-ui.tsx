"use client";

// Funções universais do cadastro (2026-10-02). Tudo aqui é OPCIONAL e vale para qualquer produto:
// disponibilidade de opção (orçamento personalizado), efeito de esforço, tipos de adicional, portões de aprovação,
// prazos/SLA estruturados, nome interno, contagem base × condicional e gatilhos de conexão.
// Nenhum cálculo é feito aqui: preço e regras vêm sempre do backend.
import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Pencil, Check as CheckIcon, X, ShieldCheck, Timer, ChevronDown, ChevronRight } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Act = (fn: () => Promise<any>, ok?: string) => Promise<any>;
const SEL = "h-7 rounded-md border border-slate-200 bg-white px-1.5 text-xs dark:border-slate-700 dark:bg-slate-900";

// ── Disponibilidade da opção ────────────────────────────────────────────
export const AVAILABILITY: [string, string, string][] = [
  ["auto", "Contratação automática", "A opção entra no preço e o cliente contrata sozinho (padrão)."],
  ["commercial_review", "Exige revisão comercial", "A opção entra, mas a contratação só segue depois de uma revisão do comercial."],
  ["custom_quote", "Orçamento personalizado", "O cliente vê o botão “Solicitar orçamento”. A contratação automática fica bloqueada (também no servidor)."],
  ["assisted_only", "Só com atendimento", "Só contrata com atendimento assistido da equipe."],
  ["unavailable", "Indisponível", "Aparece como indisponível e não pode ser escolhida."],
];
export const availabilityLabel = (k?: string | null) => AVAILABILITY.find(([v]) => v === (k ?? "auto"))?.[1] ?? k ?? "";

export function AvailabilityFields({ o, readOnly, act }: { o: any; readOnly: boolean; act: Act }) {
  const [note, setNote] = useState<string>(o.availability_note ?? "");
  const kind = o.availability ?? "auto";
  const put = (body: any, ok: string) => act(() => apiClient.updateCatalog2Option(o.id, body), ok);
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5 text-xs" title={AVAILABILITY.find(([v]) => v === kind)?.[2]}>
      <span className="font-semibold">Disponibilidade:</span>
      <select disabled={readOnly} aria-label="Disponibilidade da opção" className={SEL} value={kind} onChange={(e) => void put({ availability: e.target.value }, "Disponibilidade atualizada.")}>
        {AVAILABILITY.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      {kind !== "auto" && (
        <Input disabled={readOnly} aria-label="Nota da disponibilidade" maxLength={400} placeholder="Nota (o cliente vê)" className="h-7 w-64 text-xs" value={note} onChange={(e) => setNote(e.target.value)}
          onBlur={() => { if ((o.availability_note ?? "") !== note) void put({ availability_note: note.trim() ? note : null }, "Nota salva."); }} />
      )}
    </span>
  );
}

// ── Efeitos de esforço (somar / substituir minutos) ─────────────────────
export const EFFORT_TYPES: [string, string][] = [
  ["add_effort_minutes", "Somar minutos de esforço"],
  ["add_effort_hours", "Somar horas de esforço"],
  ["replace_effort_minutes", "Substituir minutos da etapa/tarefa"],
];
export const isEffortType = (t: string) => EFFORT_TYPES.some(([v]) => v === t);
const EFFORT_SCOPES: [string, string][] = [
  ["recurring", "Em todo ciclo"], ["implementation", "Só na implantação"], ["first_cycle", "Só no 1º ciclo"], ["one_time", "Uma única vez"], ["per_cycle", "Ciclos específicos"],
];
export function effortEffectSummary(ef: any, version?: any) {
  const verb = ef.effect_type === "replace_effort_minutes" ? "Substitui por" : "Soma";
  const unit = ef.effect_type === "add_effort_hours" ? "h" : "min";
  const tname = version?.tasks?.find((t: any) => t.key === ef.source_task_key)?.name ?? ef.source_task_key;
  const sname = ef.source_step_key ? version?.tasks?.find((t: any) => t.key === ef.source_task_key)?.steps?.find((s: any) => s.key === ef.source_step_key)?.name ?? ef.source_step_key : null;
  const scope = EFFORT_SCOPES.find(([v]) => v === (ef.charge_scope ?? "recurring"))?.[1] ?? ef.charge_scope;
  return `${verb} ${ef.effect_value} ${unit} em “${sname ? `${tname} › ${sname}` : tname}” — ${scope}${ef.charge_scope === "per_cycle" ? ` (ciclo ${ef.charge_start_cycle}${ef.charge_end_cycle != null ? ` a ${ef.charge_end_cycle}` : "+"})` : ""}${ef.effort_scale_by_quantity ? " · × quantidade" : ""}`;
}
/** Formulário do efeito de esforço: valor + onde entra (tarefa/etapa) + quando entra (escopo/ciclos) + multiplicar pela quantidade. */
export function EffortEffectForm({ value, onChange, version }: { value: any; onChange: (v: any) => void; version: any }) {
  const tasks: any[] = version?.tasks ?? [];
  const steps: any[] = tasks.find((t) => t.key === value.source_task_key)?.steps ?? [];
  const scope = value.charge_scope ?? "recurring";
  return (
    <div className="mt-1 flex flex-wrap items-center gap-1.5 rounded-md bg-slate-50 p-1.5 text-xs dark:bg-slate-800/40">
      <select aria-label="Tarefa que recebe o esforço" className={SEL} value={value.source_task_key ?? ""} onChange={(e) => onChange({ ...value, source_task_key: e.target.value || null, source_step_key: null })}>
        <option value="">Tarefa que recebe…</option>
        {tasks.map((t) => <option key={t.id} value={t.key}>{t.name}</option>)}
      </select>
      <select aria-label="Etapa que recebe o esforço" className={SEL} value={value.source_step_key ?? ""} onChange={(e) => onChange({ ...value, source_step_key: e.target.value || null })} disabled={!value.source_task_key}>
        <option value="">Tarefa inteira</option>
        {steps.map((s) => <option key={s.id} value={s.key}>{s.name}</option>)}
      </select>
      <select aria-label="Quando o esforço entra" className={SEL} value={scope} onChange={(e) => onChange({ ...value, charge_scope: e.target.value })}>
        {EFFORT_SCOPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      {scope === "per_cycle" && (
        <>
          <label className="inline-flex items-center gap-1">do ciclo <input type="number" min={0} className="h-7 w-14 rounded-md border border-slate-200 bg-white px-1 text-xs dark:border-slate-700 dark:bg-slate-900" value={value.charge_start_cycle ?? 0} onChange={(e) => onChange({ ...value, charge_start_cycle: Math.max(0, Math.trunc(Number(e.target.value) || 0)) })} /></label>
          <label className="inline-flex items-center gap-1">até <input type="number" min={0} placeholder="sempre" className="h-7 w-16 rounded-md border border-slate-200 bg-white px-1 text-xs dark:border-slate-700 dark:bg-slate-900" value={value.charge_end_cycle ?? ""} onChange={(e) => onChange({ ...value, charge_end_cycle: e.target.value === "" ? null : Math.max(0, Math.trunc(Number(e.target.value) || 0)) })} /></label>
        </>
      )}
      <label className="inline-flex items-center gap-1" title="Multiplica o esforço pela quantidade escolhida pelo cliente.">
        <input type="checkbox" checked={!!value.effort_scale_by_quantity} onChange={(e) => onChange({ ...value, effort_scale_by_quantity: e.target.checked })} /> × quantidade
      </label>
    </div>
  );
}

// ── Tipos de adicional ───────────────────────────────────────────────────
export const ADDON_TYPE_LABEL: Record<string, string> = {
  checkbox: "Simples (marcar / desmarcar)", quantity: "Por quantidade", range: "Faixa de quantidade", quoted_value: "Valor informado (sob orçamento)", single_select: "Escolha única", multi_select: "Escolha múltipla",
};
export function AddonTypeFields({ a, version, readOnly, act }: { a: any; version: any; readOnly: boolean; act: Act }) {
  const type = a.addon_type ?? "checkbox";
  const put = (body: any, ok: string) => act(() => apiClient.updateCatalog2Addon(a.id, body), ok);
  const num = (v: string): number | null => (v === "" ? null : Math.max(0, Number(v)));
  const tasks: any[] = version?.tasks ?? [];
  const steps: any[] = tasks.find((t) => t.key === a.source_task_key)?.steps ?? [];
  const Num = ({ label, field, w = "w-20", title }: { label: string; field: string; w?: string; title?: string }) => {
    const [v, setV] = useState<string>(a[field] == null ? "" : String(a[field]));
    useEffect(() => setV(a[field] == null ? "" : String(a[field])), [a[field]]);
    return (
      <label className="inline-flex items-center gap-1" title={title}>{label}
        <input disabled={readOnly} type="number" min={0} className={`h-7 ${w} rounded-md border border-slate-200 bg-white px-1 text-xs dark:border-slate-700 dark:bg-slate-900`} value={v} onChange={(e) => setV(e.target.value)}
          onBlur={() => { const n = num(v); if (n !== (a[field] ?? null)) void put({ [field]: n }, "Salvo."); }} />
      </label>
    );
  };
  return (
    <div className="space-y-1.5 text-xs">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold">Tipo:</span>
        <select disabled={readOnly} aria-label="Tipo do adicional" className={SEL} value={type} onChange={(e) => void put({ addon_type: e.target.value }, "Tipo do adicional atualizado.")}>
          {Object.entries(ADDON_TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        {type === "quantity" && (
          <>
            <Num label="mín." field="qty_min" w="w-14" /><Num label="máx." field="qty_max" w="w-16" title="Vazio = sem limite" /><Num label="passo" field="qty_step" w="w-14" />
            <label className="inline-flex items-center gap-1">unidade <input disabled={readOnly} className="h-7 w-24 rounded-md border border-slate-200 bg-white px-1 text-xs dark:border-slate-700 dark:bg-slate-900" defaultValue={a.unit_label ?? ""} onBlur={(e) => { if ((a.unit_label ?? "") !== e.target.value) void put({ unit_label: e.target.value || null }, "Unidade salva."); }} /></label>
            <Num label="custo/un. (R$)" field="unit_base_cost" w="w-20" /><Num label="min/un." field="unit_minutes" w="w-16" title="Minutos de esforço somados por unidade" /><Num label="dias/un." field="unit_deadline_days" w="w-14" />
            <Num label="orçamento acima de" field="auto_quote_limit" w="w-16" title="Acima desta quantidade o cliente precisa solicitar orçamento" />
          </>
        )}
      </div>
      {type === "quantity" && Number(a.unit_minutes ?? 0) > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-semibold">Os minutos entram em:</span>
          <select disabled={readOnly} aria-label="Tarefa do esforço" className={SEL} value={a.source_task_key ?? ""} onChange={(e) => void put({ source_task_key: e.target.value || null, source_step_key: null }, "Destino do esforço salvo.")}>
            <option value="">Escolha a tarefa…</option>
            {tasks.map((t) => <option key={t.id} value={t.key}>{t.name}</option>)}
          </select>
          <select disabled={readOnly || !a.source_task_key} aria-label="Etapa do esforço" className={SEL} value={a.source_step_key ?? ""} onChange={(e) => void put({ source_step_key: e.target.value || null }, "Destino do esforço salvo.")}>
            <option value="">Tarefa inteira</option>
            {steps.map((s) => <option key={s.id} value={s.key}>{s.name}</option>)}
          </select>
          <span className="text-[10px] text-slate-500">Cada unidade soma {a.unit_minutes} min ({a.charge_scope === "one_time" ? "uma vez" : "em todo ciclo"}); o preço vem da regra de preços do sistema.</span>
        </div>
      )}
      {["single_select", "multi_select", "range"].includes(type) && <AddonChoices a={a} readOnly={readOnly} act={act} />}
    </div>
  );
}
function AddonChoices({ a, readOnly, act }: { a: any; readOnly: boolean; act: Act }) {
  const [n, setN] = useState({ key: "", label: "", minutes: "", qty_from: "", qty_to: "", requires_quote: false });
  const isRange = a.addon_type === "range";
  return (
    <div className="rounded-md bg-slate-50 p-1.5 dark:bg-slate-800/40">
      <p className="mb-1 text-[10px] font-semibold text-slate-500">{isRange ? "Faixas de quantidade" : "Escolhas"}</p>
      <ul className="space-y-1">
        {(a.choices ?? []).map((c: any) => (
          <li key={c.id} className="flex flex-wrap items-center gap-2">
            <span>{c.label} <span className="text-slate-400">({c.key})</span></span>
            {c.minutes != null && <Badge className="bg-slate-100 text-slate-600">{c.minutes} min</Badge>}
            {(c.qty_from != null || c.qty_to != null) && <Badge className="bg-slate-100 text-slate-600">{c.qty_from ?? 1}–{c.qty_to ?? "∞"}</Badge>}
            {c.requires_quote && <Badge className="bg-amber-100 text-amber-800">sob orçamento</Badge>}
            {!readOnly && <button aria-label="Remover escolha" className="text-red-500" onClick={() => void act(() => apiClient.deleteCatalog2AddonChoice(c.id), "Escolha removida.")}><Trash2 className="h-3 w-3" /></button>}
          </li>
        ))}
      </ul>
      {!readOnly && (
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <Input className="h-7 w-24 text-xs" placeholder="chave" value={n.key} onChange={(e) => setN({ ...n, key: e.target.value })} />
          <Input className="h-7 w-40 text-xs" placeholder="rótulo" value={n.label} onChange={(e) => setN({ ...n, label: e.target.value })} />
          <Input className="h-7 w-20 text-xs" type="number" placeholder="min" value={n.minutes} onChange={(e) => setN({ ...n, minutes: e.target.value })} />
          {isRange && <><Input className="h-7 w-16 text-xs" type="number" placeholder="de" value={n.qty_from} onChange={(e) => setN({ ...n, qty_from: e.target.value })} /><Input className="h-7 w-16 text-xs" type="number" placeholder="até" value={n.qty_to} onChange={(e) => setN({ ...n, qty_to: e.target.value })} /></>}
          <label className="inline-flex items-center gap-1"><input type="checkbox" checked={n.requires_quote} onChange={(e) => setN({ ...n, requires_quote: e.target.checked })} /> sob orçamento</label>
          <Button size="sm" variant="ghost" className="h-7" onClick={() => { if (!n.key || !n.label) return; void act(() => apiClient.addCatalog2AddonChoice(a.id, { key: n.key, label: n.label, minutes: n.minutes === "" ? null : Number(n.minutes), qty_from: n.qty_from === "" ? null : Number(n.qty_from), qty_to: n.qty_to === "" ? null : Number(n.qty_to), requires_quote: n.requires_quote }), "Escolha adicionada.").then(() => setN({ key: "", label: "", minutes: "", qty_from: "", qty_to: "", requires_quote: false })); }}><Plus className="h-3 w-3" /></Button>
        </div>
      )}
    </div>
  );
}

// ── Nome interno ─────────────────────────────────────────────────────────
export function InternalNameEditor({ product, readOnly, onDone }: { product: any; readOnly: boolean; onDone: () => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState<string>(product.internal_name ?? "");
  const [slug, setSlug] = useState<string>(product.slug ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setName(product.internal_name ?? ""); setSlug(product.slug ?? ""); }, [product.internal_name, product.slug]);
  const slugChanged = slug !== (product.slug ?? "");
  async function save() {
    setBusy(true); setMsg(null);
    try {
      await apiClient.renameCatalog2ProductInternalName(product.id, { internal_name: name.trim(), ...(slugChanged ? { slug, confirm_slug_change: true } : {}) });
      setEditing(false); onDone();
    } catch (e: any) { setMsg(e?.message ?? "Não foi possível renomear."); } finally { setBusy(false); }
  }
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2 text-xs dark:border-slate-800 dark:bg-slate-900/60">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold">Nome interno:</span>
        {!editing ? <span data-testid="internal-name">{product.internal_name}</span> : <Input aria-label="Nome interno" className="h-7 w-96 text-xs" maxLength={200} value={name} onChange={(e) => setName(e.target.value)} />}
        {!readOnly && !editing && <Button size="sm" variant="ghost" className="h-6" onClick={() => setEditing(true)}><Pencil className="mr-1 h-3 w-3" />Editar</Button>}
        {editing && (
          <>
            <Button size="sm" className="h-6" disabled={busy || !name.trim()} onClick={() => void save()}><CheckIcon className="mr-1 h-3 w-3" />Salvar</Button>
            <Button size="sm" variant="ghost" className="h-6" onClick={() => { setEditing(false); setName(product.internal_name ?? ""); setSlug(product.slug ?? ""); setMsg(null); }}><X className="mr-1 h-3 w-3" />Cancelar</Button>
          </>
        )}
      </div>
      {editing && (
        <div className="mt-1.5 space-y-1">
          <p className="text-[10px] text-slate-500">O nome interno é só para a equipe: não muda o título que o cliente vê. O histórico guarda o nome antigo, o novo, quem alterou e quando.</p>
          <label className="flex items-center gap-1.5 text-[10px] text-slate-500">Endereço (slug) — só mude se tiver certeza:
            <Input aria-label="Slug" className="h-6 w-80 text-xs" value={slug} onChange={(e) => setSlug(e.target.value)} />
          </label>
          {slugChanged && <p className="text-[10px] font-semibold text-amber-700">Alterar o slug muda o endereço do produto e a identidade nos pacotes de transferência. Ao salvar, você confirma essa mudança.</p>}
        </div>
      )}
      {msg && <p className="mt-1 text-[11px] text-red-600">{msg}</p>}
    </div>
  );
}

// ── Contagem base × condicional ──────────────────────────────────────────
export function ProductCounts({ version }: { version: any }) {
  const c = version?.counts;
  if (!c) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs" data-testid="product-counts">
      <Badge className="bg-slate-100 text-slate-700">{c.tasks_base} tarefa(s)-base</Badge>
      <Badge className="bg-indigo-100 text-indigo-700">{c.tasks_conditional} condicional(is)</Badge>
      <span className="text-slate-500">· {c.tasks_total} possíveis</span>
      <span className="text-slate-300">|</span>
      <Badge className="bg-slate-100 text-slate-700">{c.steps_base} etapa(s)-base</Badge>
      <Badge className="bg-indigo-100 text-indigo-700">{c.steps_conditional} condicional(is)</Badge>
      <span className="text-slate-500">· {c.steps_total} possíveis</span>
      <span className="text-[10px] text-slate-500">Só as ativadas pelo cenário entram na execução e no preço.</span>
    </div>
  );
}

// ── Portões de aprovação ─────────────────────────────────────────────────
export function ApprovalGatesSection({ version, readOnly, act }: { version: any; readOnly: boolean; act: Act }) {
  const [opts, setOpts] = useState<any>(null);
  useEffect(() => { apiClient.getCatalog2GateOptions().then(setOpts).catch(() => setOpts(null)); }, []);
  const tasks: any[] = version.tasks ?? [];
  const blank = { name: "", anchor_task_key: "", anchor_step_key: "", position: "before_step", approver_kind: "client", group_key: "", sequence_no: 1, rejection_return_step_key: "", requires_comment: false };
  const [n, setN] = useState<any>(blank);
  const [adding, setAdding] = useState(false);
  const steps: any[] = tasks.find((t) => t.key === n.anchor_task_key)?.steps ?? [];
  const label = (list: any[] | undefined, k: string) => list?.find((x) => x.key === k)?.label ?? k;
  const gates: any[] = version.approval_gates ?? [];
  const taskLabel = (key: string) => tasks.find((t) => t.key === key)?.name ?? "Etapa configurada";
  const stepLabel = (key?: string | null) => {
    if (!key) return "Etapa configurada";
    for (const task of tasks) {
      const step = (task.steps ?? []).find((s: any) => s.key === key);
      if (step) return step.name;
    }
    return "Etapa configurada";
  };
  const body = () => ({ name: n.name.trim(), anchor_task_key: n.anchor_task_key, anchor_step_key: n.anchor_step_key || null, position: n.position, approver_kind: n.approver_kind, group_key: n.group_key || null, sequence_no: Number(n.sequence_no) || 0, group_mode: "sequence", rejection_return_step_key: n.rejection_return_step_key || null, requires_comment: n.requires_comment });
  return (
    <section className="space-y-2 rounded-[14px] border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900" id="sec-approval-gates">
      <div className="flex flex-wrap items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-50 text-emerald-600"><ShieldCheck className="h-4 w-4" /></span>
        <h3 className="font-semibold text-slate-900 dark:text-white">Portões de aprovação</h3>
        <Badge className="bg-sky-100 text-sky-800">{gates.length} configurados</Badge>
        {!readOnly && <Button type="button" variant="outline" size="sm" className="ml-auto h-8 border-violet-300 bg-white text-violet-700 hover:bg-violet-50" onClick={() => setAdding((v) => !v)}><Plus className="mr-1 h-3.5 w-3.5" />Nova aprovação</Button>}
      </div>
      {gates.length === 0 && <p className="py-2 text-xs italic text-slate-400">Nenhum portão cadastrado.</p>}
      <ul className="space-y-1.5">
        {gates.map((g) => (
          <li key={g.id} className="flex min-h-[62px] items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-900/60">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-600"><ShieldCheck className="h-4 w-4" /></span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-semibold text-slate-800 dark:text-slate-100">{g.name}</span>
                <Badge className="bg-slate-100 text-slate-700">Antes de publicar</Badge>
                <Badge className="bg-indigo-100 text-indigo-700">{g.approver_kind === "client" ? "Cliente" : label(opts?.approvers, g.approver_kind)}</Badge>
                <span className="text-slate-500">Etapa: {g.anchor_step_key ? stepLabel(g.anchor_step_key) : taskLabel(g.anchor_task_key)}</span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-slate-500">
                <span>Se reprovado, retorna para: {stepLabel(g.rejection_return_step_key)}</span>
                {g.requires_comment && <Badge className="bg-amber-100 text-amber-800">Comentário obrigatório</Badge>}
              </div>
            </div>
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-100 font-semibold text-slate-700">{g.sequence_no}</span>
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-500" />
            {!readOnly && <button aria-label="Remover portão" className="shrink-0 text-red-500" onClick={() => void act(() => apiClient.deleteCatalog2ApprovalGate(g.id), "Portão removido.")}><Trash2 className="h-3.5 w-3.5" /></button>}
          </li>
        ))}
      </ul>
      {!readOnly && adding && (
        <div className="flex flex-wrap items-end gap-1.5 border-t border-slate-100 pt-2 text-xs dark:border-slate-800">
          <Input className="h-7 w-56 text-xs" placeholder="Nome do portão" value={n.name} onChange={(e) => setN({ ...n, name: e.target.value })} />
          <select aria-label="Tarefa do portão" className={SEL} value={n.anchor_task_key} onChange={(e) => setN({ ...n, anchor_task_key: e.target.value, anchor_step_key: "", rejection_return_step_key: "" })}><option value="">Tarefa…</option>{tasks.map((t) => <option key={t.id} value={t.key}>{t.name}</option>)}</select>
          <select aria-label="Etapa do portão" className={SEL} value={n.anchor_step_key} onChange={(e) => setN({ ...n, anchor_step_key: e.target.value })}><option value="">Etapa…</option>{steps.map((s) => <option key={s.id} value={s.key}>{s.name}</option>)}</select>
          <select aria-label="Posição" className={SEL} value={n.position} onChange={(e) => setN({ ...n, position: e.target.value })}>{(opts?.positions ?? []).map((p: any) => <option key={p.key} value={p.key}>{p.label}</option>)}</select>
          <select aria-label="Quem aprova" className={SEL} value={n.approver_kind} onChange={(e) => setN({ ...n, approver_kind: e.target.value })}>{(opts?.approvers ?? []).map((p: any) => <option key={p.key} value={p.key}>{p.label}</option>)}</select>
          <select aria-label="Etapa de retorno" className={SEL} value={n.rejection_return_step_key} onChange={(e) => setN({ ...n, rejection_return_step_key: e.target.value })}><option value="">Se reprovar, voltar para…</option>{steps.map((s) => <option key={s.id} value={s.key}>{s.name}</option>)}</select>
          <Input className="h-7 w-28 text-xs" placeholder="grupo (opcional)" value={n.group_key} onChange={(e) => setN({ ...n, group_key: e.target.value })} />
          <Input className="h-7 w-14 text-xs" type="number" min={0} aria-label="Ordem no grupo" value={n.sequence_no} onChange={(e) => setN({ ...n, sequence_no: e.target.value })} />
          <label className="inline-flex items-center gap-1"><input type="checkbox" checked={n.requires_comment} onChange={(e) => setN({ ...n, requires_comment: e.target.checked })} /> exige comentário</label>
          <Button size="sm" className="h-7 bg-gradient-to-r from-violet-700 to-fuchsia-600" disabled={!n.name.trim() || !n.anchor_task_key} onClick={() => void act(() => apiClient.addCatalog2ApprovalGate(version.id, body()), "Portão adicionado.").then(() => { setN(blank); setAdding(false); })}><Plus className="mr-1 h-3 w-3" />Adicionar aprovação</Button>
        </div>
      )}
    </section>
  );
}

// ── Prazos / SLA ──────────────────────────────────────────────────────────
export function SlaRulesSection({ version, readOnly, act }: { version: any; readOnly: boolean; act: Act }) {
  const [opts, setOpts] = useState<any>(null);
  useEffect(() => { apiClient.getCatalog2SlaOptions().then(setOpts).catch(() => setOpts(null)); }, []);
  const tasks: any[] = version.tasks ?? [];
  const blank = { name: "", scope_kind: "implementation", target_key: "", modality: "any", amount: "", unit: "business_days", anchor: "start" };
  const [n, setN] = useState<any>(blank);
  const [adding, setAdding] = useState(false);
  const label = (list: any[] | undefined, k: string) => list?.find((x) => x.key === k)?.label ?? k;
  const needsTarget = ["task", "step", "deliverable", "approval", "report"].includes(n.scope_kind);
  const targets = useMemo(() => {
    if (n.scope_kind === "task" || n.scope_kind === "report") return tasks.map((t) => [t.key, t.name] as [string, string]);
    if (n.scope_kind === "step") return tasks.flatMap((t) => (t.steps ?? []).map((s: any) => [`${t.key}:${s.key}`, `${t.name} › ${s.name}`] as [string, string]));
    if (n.scope_kind === "deliverable") return tasks.flatMap((t) => (t.deliverables ?? []).map((d: any) => [d.key, d.name] as [string, string]));
    if (n.scope_kind === "approval") return (version.approval_gates ?? []).map((g: any) => [g.key, g.name] as [string, string]);
    return [] as [string, string][];
  }, [n.scope_kind, tasks, version.approval_gates]);
  const rules: any[] = version.sla_rules ?? [];
  const compactName = (name: string) => {
    if (/implanta.{0,3}[çc][aã]o inicial/i.test(name)) return "Implantação inicial";
    if (/ciclo recorrente/i.test(name)) return "Ciclo recorrente";
    if (/relat[óo]rio mensal/i.test(name)) return "Relatório mensal";
    return name;
  };
  return (
    <section className="space-y-2 rounded-[14px] border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900" id="sec-sla-rules">
      <div className="flex flex-wrap items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-sky-50 text-sky-600"><Timer className="h-4 w-4" /></span>
        <h3 className="font-semibold text-slate-900 dark:text-white">Prazos estruturados</h3>
        <span className="text-xs text-slate-500">O cálculo segue o tipo de contagem e o marco inicial.</span>
        {!readOnly && <Button type="button" variant="outline" size="sm" className="ml-auto h-8 border-violet-300 bg-white text-violet-700 hover:bg-violet-50" onClick={() => setAdding((v) => !v)}><Plus className="mr-1 h-3.5 w-3.5" />Novo prazo</Button>}
      </div>
      {rules.length === 0 && <p className="py-2 text-xs italic text-slate-400">Nenhum prazo estruturado cadastrado.</p>}
      <ul className="space-y-1.5">
        {rules.map((r) => (
          <li key={r.id} className="flex min-h-[46px] items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-1.5 text-xs dark:border-slate-800 dark:bg-slate-900/60">
            <Timer className="h-4 w-4 shrink-0 text-sky-600" />
            <span className="min-w-[12rem] font-semibold text-slate-800 dark:text-slate-100">{compactName(r.name)}</span>
            <Badge className="bg-sky-100 text-sky-800">{Number(r.amount)} {label(opts?.units, r.unit)}</Badge>
            <Badge className="bg-slate-100 text-slate-700">{label(opts?.scopes, r.scope_kind)}</Badge>
            <span className="min-w-0 flex-1 text-slate-500">{label(opts?.anchors, r.anchor)}</span>
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-500" />
            {!readOnly && <button aria-label="Remover prazo" className="shrink-0 text-red-500" onClick={() => void act(() => apiClient.deleteCatalog2SlaRule(r.id), "Prazo removido.")}><Trash2 className="h-3.5 w-3.5" /></button>}
          </li>
        ))}
      </ul>
      {opts && (
        <details className="group rounded-xl border border-slate-200 bg-white text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900"><summary className="flex h-[42px] cursor-pointer list-none items-center gap-2 px-3 font-medium"><span className="grid h-6 w-6 place-items-center rounded-lg bg-slate-100"><Timer className="h-3.5 w-3.5" /></span>Motivos de pausa do relógio<ChevronDown className="ml-auto h-4 w-4 transition-transform group-open:rotate-180" /></summary>
          <ul className="border-t border-slate-100 px-5 py-2 text-slate-500">{(opts.pause_reasons ?? []).map((p: any) => <li key={p.key}>{p.label}</li>)}</ul>
        </details>
      )}
      {!readOnly && adding && (
        <div className="flex flex-wrap items-end gap-1.5 border-t border-slate-100 pt-2 text-xs dark:border-slate-800">
          <Input className="h-7 w-64 text-xs" placeholder="Nome do prazo" value={n.name} onChange={(e) => setN({ ...n, name: e.target.value })} />
          <select aria-label="Escopo do prazo" className={SEL} value={n.scope_kind} onChange={(e) => setN({ ...n, scope_kind: e.target.value, target_key: "" })}>{(opts?.scopes ?? []).map((p: any) => <option key={p.key} value={p.key}>{p.label}</option>)}</select>
          {needsTarget && <select aria-label="Alvo do prazo" className={SEL} value={n.target_key} onChange={(e) => setN({ ...n, target_key: e.target.value })}><option value="">Alvo…</option>{targets.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>}
          <Input className="h-7 w-16 text-xs" type="number" min={0} aria-label="Quantidade do prazo" placeholder="qtd" value={n.amount} onChange={(e) => setN({ ...n, amount: e.target.value })} />
          <select aria-label="Unidade" className={SEL} value={n.unit} onChange={(e) => setN({ ...n, unit: e.target.value })}>{(opts?.units ?? []).map((p: any) => <option key={p.key} value={p.key}>{p.label}</option>)}</select>
          <select aria-label="Contado a partir de" className={SEL} value={n.anchor} onChange={(e) => setN({ ...n, anchor: e.target.value })}>{(opts?.anchors ?? []).map((p: any) => <option key={p.key} value={p.key}>{p.label}</option>)}</select>
          <select aria-label="Modalidade" className={SEL} value={n.modality} onChange={(e) => setN({ ...n, modality: e.target.value })}>{(opts?.modalities ?? []).map((p: any) => <option key={p.key} value={p.key}>{p.label}</option>)}</select>
          <Button size="sm" className="h-7 bg-gradient-to-r from-violet-700 to-fuchsia-600" disabled={!n.name.trim() || !(Number(n.amount) > 0) || (needsTarget && !n.target_key)} onClick={() => void act(() => apiClient.addCatalog2SlaRule(version.id, { name: n.name.trim(), scope_kind: n.scope_kind, target_key: needsTarget ? n.target_key : null, modality: n.modality, amount: Number(n.amount), unit: n.unit, anchor: n.anchor }), "Prazo adicionado.").then(() => { setN(blank); setAdding(false); })}><Plus className="mr-1 h-3 w-3" />Adicionar prazo</Button>
        </div>
      )}
    </section>
  );
}

// ── Gatilhos de ativação de uma exigência de conexão ───────────────────────
export const TRIGGER_KIND_LABEL: Record<string, string> = {
  product: "Produto contratado", variation: "Variação escolhida", option: "Opção escolhida", addon: "Adicional contratado", task: "Tarefa ativa", step: "Etapa ativa", questionnaire_answer: "Resposta do questionário", linked_product: "Produto vinculado contratado",
};
export function TriggerFields({ value, onChange, readOnly, version }: { value: { activation_mode: string; triggers: any[] }; onChange: (v: { activation_mode: string; triggers: any[] }) => void; readOnly: boolean; version: any }) {
  const refs = (kind: string): [string, string][] => {
    if (kind === "variation") return (version.variations ?? []).map((v: any) => [v.key, v.name]);
    if (kind === "option") return (version.variations ?? []).flatMap((v: any) => (v.options ?? []).map((o: any) => [o.key, `${v.name}: ${o.label}`]));
    if (kind === "addon") return (version.addons ?? []).map((a: any) => [a.key, a.name]);
    if (kind === "task") return (version.tasks ?? []).map((t: any) => [t.key, t.name]);
    if (kind === "step") return (version.tasks ?? []).flatMap((t: any) => (t.steps ?? []).map((s: any) => [`${t.key}:${s.key}`, `${t.name} › ${s.name}`]));
    return [];
  };
  const set = (i: number, patch: any) => onChange({ ...value, triggers: value.triggers.map((t, j) => (j === i ? { ...t, ...patch } : t)) });
  return (
    <div className="space-y-1 text-xs">
      <label className="inline-flex items-center gap-1.5"><span className="font-semibold">Ativar:</span>
        <select disabled={readOnly} aria-label="Modo de ativação" className={SEL} value={value.activation_mode} onChange={(e) => onChange({ ...value, activation_mode: e.target.value })}>
          <option value="manual">Manual (sempre, conforme a condição escrita)</option>
          <option value="any_trigger">Quando QUALQUER gatilho ocorrer</option>
          <option value="all_triggers">Quando TODOS os gatilhos ocorrerem</option>
        </select>
      </label>
      {value.activation_mode !== "manual" && (
        <ul className="space-y-1">
          {value.triggers.map((t, i) => (
            <li key={i} className="flex flex-wrap items-center gap-1.5">
              <select disabled={readOnly} aria-label="Tipo de gatilho" className={SEL} value={t.kind} onChange={(e) => set(i, { kind: e.target.value, ref_key: "", ref_value: "" })}>{Object.entries(TRIGGER_KIND_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
              {["variation", "option", "addon", "task", "step"].includes(t.kind)
                ? <select disabled={readOnly} aria-label="Referência do gatilho" className={`${SEL} max-w-[16rem]`} value={t.ref_key ?? ""} onChange={(e) => set(i, { ref_key: e.target.value })}><option value="">Escolha…</option>{refs(t.kind).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
                : t.kind !== "product" && <Input disabled={readOnly} className="h-7 w-48 text-xs" placeholder={t.kind === "linked_product" ? "ID do produto" : "chave da pergunta"} value={t.ref_key ?? ""} onChange={(e) => set(i, { ref_key: e.target.value })} />}
              {!readOnly && <button aria-label="Remover gatilho" className="text-red-500" onClick={() => onChange({ ...value, triggers: value.triggers.filter((_, j) => j !== i) })}><Trash2 className="h-3 w-3" /></button>}
            </li>
          ))}
          {!readOnly && <li><button type="button" className="text-[11px] font-semibold text-indigo-600" onClick={() => onChange({ ...value, triggers: [...value.triggers, { kind: "option", ref_key: "" }] })}>+ gatilho</button></li>}
        </ul>
      )}
    </div>
  );
}

// ── Memória de cálculo universal ───────────────────────────────────────────
const PRICE_STATUS_LABEL: Record<string, [string, string]> = {
  final: ["Preço final", "bg-emerald-100 text-emerald-800"], pending: ["Preço pendente de definição", "bg-amber-100 text-amber-800"], custom_quote: ["Orçamento personalizado", "bg-violet-100 text-violet-800"],
  commercial_review: ["Revisão comercial", "bg-violet-100 text-violet-800"], assisted_only: ["Só com atendimento", "bg-violet-100 text-violet-800"],
};
const AI_STATE_LABEL: Record<string, string> = { none: "Sem IA neste cenário", not_defined: "Custo de IA ainda não definido", disabled: "IA desativada", configured: "IA configurada", estimated: "IA estimada", executed: "IA executada" };
const brl = (v: number | null | undefined) => (v == null ? "—" : `R$ ${v.toFixed(2).replace(".", ",")}`);
/** Mostra de onde veio o preço: versão da regra, valor/hora, % aplicados, esforço extra, adicionais, cenário. É a MESMA memória usada em todas as telas (fonte única). */
export function UniversalMemory({ r }: { r: any }) {
  if (!r?.rule) return null;
  const [stLabel, stCls] = PRICE_STATUS_LABEL[r.price_status] ?? [r.price_status, "bg-slate-100 text-slate-700"];
  const rule = r.rule;
  return (
    <div className="mt-2 space-y-1.5 rounded-lg border border-indigo-100 bg-indigo-50/50 p-2 text-xs dark:border-indigo-900 dark:bg-indigo-950/20" data-testid="universal-memory">
      <div className="flex flex-wrap items-center gap-2">
        <Badge className={stCls}>{stLabel}</Badge>
        <span className="font-semibold">Regra de preço v{rule.version ?? "?"}</span>
        <span className="text-slate-500">calculada em {new Date(rule.calculated_at).toLocaleString("pt-BR")}</span>
        <span className="text-slate-400" title="Identificador da regra: mesmo conteúdo = mesmo identificador">#{String(rule.hash).slice(0, 8)}</span>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-slate-600">
        {(rule.hourly_rates_applied ?? []).map((h: any) => <span key={h.specialty}>{h.specialty}: {brl(h.hourly_rate)}/h</span>)}
        <span>Qualificação: {rule.qualification_percent ?? "—"}%</span>
        <span>Impostos: {rule.tax_percent ?? "—"}%</span><span>Comissão: {rule.commission_percent ?? "—"}%</span><span>Taxa operacional: {rule.operational_fee_percent ?? "—"}%</span><span>Margem: {rule.profit_margin_percent ?? "—"}%</span>
      </div>
      <div className="text-slate-600">IA: {AI_STATE_LABEL[r.ai_cost_state] ?? r.ai_cost_state}</div>
      {r.active_scenario && <div className="text-slate-600">Neste cenário: {r.active_scenario.base_tasks} tarefa(s)-base + {r.active_scenario.conditional_tasks_on} condicional(is) ativada(s) · {r.active_scenario.base_steps} etapa(s)-base + {r.active_scenario.conditional_steps_on} condicional(is) · possíveis {r.active_scenario.tasks_possible}/{r.active_scenario.steps_possible}</div>}
      {(r.scenario?.modality_note) && <div className="text-slate-600">{r.scenario.modality_note}</div>}
      {(r.variations_applied ?? []).length > 0 && <div className="text-slate-600">Variações: {r.variations_applied.map((v: any) => `${v.variation}: ${v.option}${v.availability && v.availability !== "auto" ? ` (${availabilityLabel(v.availability)})` : ""}`).join(" · ")}</div>}
      {(r.addon_breakdown ?? []).length > 0 && <div className="text-slate-600">Adicionais: {r.addon_breakdown.map((a: any) => `${a.name}${a.quantity > 1 || a.type === "quantity" ? ` ×${a.quantity}` : ""}`).join(" · ")}</div>}
      {(r.effort_breakdown ?? []).length > 0 && (
        <ul className="list-inside list-disc text-slate-600">
          {r.effort_breakdown.map((e: any, i: number) => <li key={i}>{e.from}: {e.mode === "replace" ? "substitui por" : "soma"} {e.minutes} min em {e.task}{e.step ? ` › ${e.step}` : ""} ({e.when}){e.scale > 1 ? ` · ${e.minutes_per_unit} min × ${e.scale}` : ""}</li>)}
        </ul>
      )}
      {(r.quote_requirements ?? []).length > 0 && <ul className="list-inside list-disc text-violet-800">{r.quote_requirements.map((q: any, i: number) => <li key={i}>{q.message}</li>)}</ul>}
      {(r.selection_issues ?? []).length > 0 && <ul className="list-inside list-disc text-red-700">{r.selection_issues.map((q: any, i: number) => <li key={i}>{q.message}</li>)}</ul>}
    </div>
  );
}
