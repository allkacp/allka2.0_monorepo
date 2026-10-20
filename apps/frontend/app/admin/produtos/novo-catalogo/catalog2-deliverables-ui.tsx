"use client";

// RESUMO dos entregáveis da tarefa (19/10): o cadastro acontece DENTRO da etapa ("Entregáveis desta etapa"); aqui só se reúne, agrupado pela
// etapa responsável, o que já foi configurado. Editar por aqui altera o MESMO registro (nada é copiado nem duplicado) e abre o editor com o
// contexto da tarefa/etapa e a ação "Ir para a etapa". Entregável sem etapa aparece num grupo de pendências.
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, Copy, CopyPlus, Download, Paperclip, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { apiClient } from "@/lib/api-client";
import { VISIBILITY_OPTIONS } from "./catalog2-ops-ui";
import {
  DELIVERABLE_CYCLE_SCOPES, DELIVERABLE_MOMENTS, DELIVERABLE_RESPONSIBLES, DELIVERABLE_TYPES, FILE_PREFIX, deliverableSituation, fieldsOf, labelOf, payloadOf, shortType, type Fields,
} from "./catalog2-deliverable-fields";
import { DeliverableEditorModal } from "./deliverable-modal";

// Compatibilidade: estes nomes já eram exportados daqui.
export { DELIVERABLE_CYCLE_SCOPES, DELIVERABLE_MOMENTS, DELIVERABLE_RESPONSIBLES, DELIVERABLE_TYPES, deliverableSituation };

/** Pede ao editor da etapa para abrir (o StepRow escuta). */
export const OPEN_STEP_EVENT = "catalog2:open-step";
export const openStepEditor = (stepId: string) => { if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(OPEN_STEP_EVENT, { detail: { stepId } })); };

const Chip = ({ children, tone = "slate", title }: { children: React.ReactNode; tone?: "green" | "red" | "slate" | "amber" | "sky" | "violet"; title?: string }) => {
  const c = { green: "bg-emerald-500 text-white", red: "bg-rose-500 text-white", slate: "bg-slate-100 text-slate-600", amber: "bg-amber-100 text-amber-800", sky: "bg-sky-100 text-sky-800", violet: "bg-violet-100 text-violet-800" }[tone];
  return <span title={title} className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${c}`}>{children}</span>;
};
const yesNo = (v: boolean) => <Chip tone={v ? "red" : "slate"}>{v ? "SIM" : "NÃO"}</Chip>;

/** Escolhe um entregável JÁ cadastrado em outro produto/tarefa e cria uma cópia nesta tarefa (sem etapa: o vínculo é feito depois). */
function LibraryPicker({ task, act, onDone, stepId }: { task: any; act: any; onDone: () => void; stepId?: string }) {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<any[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const search = async () => {
    setErr(null);
    try { const r: any = await apiClient.searchCatalog2DeliverableLibrary(q); setRows(r.data ?? []); } catch (e: any) { setErr(e?.message ?? "Não foi possível buscar."); }
  };
  return (
    <div className="space-y-1.5 rounded-lg border border-dashed border-violet-300 bg-violet-50/40 p-2" data-testid="deliverable-library">
      <div className="flex items-center gap-1.5">
        <Input className="h-7 flex-1 text-xs" aria-label="Buscar entregável existente" placeholder="Buscar entregável existente pelo nome…" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void search(); }} />
        <Button type="button" size="sm" className="h-7 px-2 text-[11px]" onClick={() => void search()}>Buscar</Button>
        <button type="button" className="text-[11px] text-slate-500 underline" onClick={onDone}>Fechar</button>
      </div>
      {err && <p role="alert" className="text-[11px] text-red-600">{err}</p>}
      {rows && rows.length === 0 && <p className="text-[11px] text-slate-500">Nenhum entregável encontrado.</p>}
      <ul className="max-h-44 space-y-1 overflow-y-auto">
        {(rows ?? []).map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-2 rounded bg-white px-2 py-1 text-[11px] dark:bg-slate-900">
            <span className="min-w-0"><strong className="block truncate">{r.name}</strong><span className="block truncate text-slate-500">{r.from}</span></span>
            <Button type="button" size="sm" variant="outline" className="h-6 shrink-0 gap-1 px-2 text-[11px]" onClick={() => void act(() => apiClient.createCatalog2Deliverable(task.id, {
              name: r.name, description: r.description, type: r.type, format: r.format, responsible: r.responsible, is_required: r.is_required, requires_approval: r.requires_approval, visibility: r.visibility,
              evidence_required: r.evidence_required, requires_qualification: r.requires_qualification, delivery_moment: r.delivery_moment, cycle_scope: r.cycle_scope, template_url: r.template_url, template_name: r.template_name,
              ...(stepId ? { step_id: stepId } : {}),
            }), "Entregável reutilizado.").then(onDone)}><Copy className="h-3 w-3" />Reutilizar</Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
export { LibraryPicker };

const norm = (s: unknown) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function TaskDeliverablesEditor({ task, act, readOnly = false }: { task: any; act: any; readOnly?: boolean; version?: any }) {
  const list: any[] = task.deliverables ?? [];
  const steps: any[] = useMemo(() => [...(task.steps ?? [])].sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0)), [task.steps]);
  const stepInfo = (id: string | null | undefined) => { const i = steps.findIndex((s) => s.id === id); return i < 0 ? null : { id: steps[i].id as string, name: steps[i].name as string, index: i + 1 }; };
  const [lib, setLib] = useState(false);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [modal, setModal] = useState<{ d: any | null } | null>(null);
  const [toDelete, setToDelete] = useState<any | null>(null);
  const toggle = (id: string) => setOpen((cur) => { const n = new Set(cur); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const needle = norm(q).trim();
  const filtered = needle ? list.filter((d) => needle.split(/\s+/).every((w) => norm([d.name, d.description, d.type, d.format, stepInfo(d.step_id)?.name].join(" ")).includes(w))) : list;
  const groups = [
    ...steps.map((s, i) => ({ key: s.id as string, title: `Etapa ${i + 1} — ${s.name}`, stepId: s.id as string, items: filtered.filter((d) => d.step_id === s.id) })).filter((g) => g.items.length > 0),
    { key: "__none", title: "Entregáveis sem etapa responsável", stepId: null as string | null, items: filtered.filter((d) => !stepInfo(d.step_id)) },
  ].filter((g) => g.key !== "__none" || g.items.length > 0);
  const orphanCount = list.filter((d) => !stepInfo(d.step_id)).length;

  const save = async (v: Fields, { draft }: { draft: boolean }) => {
    const body = { ...payloadOf(v), draft };
    if (modal?.d) await act(() => apiClient.updateCatalog2Deliverable(modal.d.id, body), draft ? "Rascunho do entregável salvo." : "Entregável salvo.", { rethrow: true });
    else await act(() => apiClient.createCatalog2Deliverable(task.id, body), draft ? "Rascunho do entregável salvo." : "Entregável adicionado.", { rethrow: true });
    if (!draft) setModal(null);
  };
  const duplicate = (d: any) => void act(() => apiClient.createCatalog2Deliverable(task.id, { ...payloadOf(fieldsOf(d)), name: `${String(d.name).slice(0, 170)} (cópia)` }), "Entregável duplicado.");
  const move = (d: any, group: any[], dir: -1 | 1) => {
    const gi = group.findIndex((x) => x.id === d.id); const other = group[gi + dir]; if (!other) return;
    const ids = list.map((x) => x.id); const a = ids.indexOf(d.id); const b = ids.indexOf(other.id); [ids[a], ids[b]] = [ids[b], ids[a]];
    void act(() => apiClient.reorderCatalog2Deliverables(task.id, ids), "Ordem dos entregáveis atualizada.");
  };
  const allOpen = filtered.length > 0 && filtered.every((d) => open.has(d.id));
  const iconBtn = "rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800";
  const cur = modal?.d ? fieldsOf(modal.d) : fieldsOf({ step_id: "" });

  return (
    <div className="w-full min-w-0 space-y-2" data-testid="task-deliverables">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="flex items-center gap-1.5 text-base font-bold text-slate-900 dark:text-slate-100"><Paperclip className="h-4 w-4" />Entregáveis da tarefa <span className="text-xs font-normal text-slate-500">({list.length}) — resumo do que foi configurado nas etapas</span></h4>
        <div className="flex flex-wrap items-center gap-2">
          {list.length > 1 && <>
            <button type="button" className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200" disabled={allOpen} onClick={() => setOpen(new Set(filtered.map((d) => d.id)))}>Expandir todos</button>
            <button type="button" className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200" disabled={open.size === 0} onClick={() => setOpen(new Set())}>Recolher todos</button>
          </>}
          {!readOnly && <>
            <Button type="button" size="sm" variant="outline" className="h-9" title="Reutilizar um entregável já cadastrado em outro produto" onClick={() => setLib((v) => !v)}><Copy className="h-3.5 w-3.5" />Reutilizar existente</Button>
            <Button type="button" className="h-9 bg-blue-600 text-white hover:bg-blue-700" title="Adicionar entregável (o ideal é adicionar dentro da etapa)" onClick={() => setModal({ d: null })}><Plus className="h-4 w-4" />Adicionar</Button>
          </>}
        </div>
      </div>
      <p className="text-[11px] text-slate-500" data-testid="deliverables-hint">Cadastre cada entregável dentro da própria etapa (“Entregáveis desta etapa”). Esta lista só reúne o que já foi configurado; editar aqui altera o mesmo registro.</p>
      {orphanCount > 0 && <p role="status" className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900" data-testid="deliverables-orphans">{orphanCount === 1 ? "1 entregável sem etapa responsável" : `${orphanCount} entregáveis sem etapa responsável`} — {orphanCount === 1 ? "vincule-o" : "vincule-os"} a uma etapa (editar → “Etapa responsável”, ou abra a etapa e use “Vincular da tarefa”).</p>}
      {list.length > 3 && (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Localizar entregável" data-testid="deliverable-search" placeholder="Localizar entregável (nome, tipo, etapa…)" className="h-9 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-9 text-sm dark:border-slate-600 dark:bg-slate-900" />
          {q && <button type="button" aria-label="Limpar busca de entregáveis" className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700" onClick={() => setQ("")}><X className="h-4 w-4" /></button>}
        </div>
      )}
      {lib && !readOnly && <LibraryPicker task={task} act={act} onDone={() => setLib(false)} />}
      <div className="space-y-2" data-testid="deliverable-list">
        {groups.map((g) => (
          <section key={g.key} className={`overflow-hidden rounded-lg border bg-white dark:bg-slate-900/60 ${g.key === "__none" ? "border-amber-300" : "border-slate-200 dark:border-slate-800"}`} data-testid="deliverable-group" data-group={g.key}>
            <h5 className={`flex flex-wrap items-center gap-2 px-3 py-1.5 text-xs font-bold ${g.key === "__none" ? "bg-amber-50 text-amber-900" : "bg-slate-50 text-slate-700 dark:bg-slate-800/40 dark:text-slate-200"}`} data-testid="deliverable-group-title">
              <span>{g.title}</span><span className="font-normal opacity-70">({g.items.length})</span>
              {g.stepId && <button type="button" className="ml-auto text-[11px] font-semibold text-violet-700 underline" onClick={() => openStepEditor(g.stepId!)}>Ir para a etapa</button>}
            </h5>
            <ul>
              {g.items.map((d, i) => {
                const isOpen = open.has(d.id);
                const f = fieldsOf(d);
                const hasFile = f.template_url.startsWith(FILE_PREFIX);
                const sit = deliverableSituation(d);
                const st = stepInfo(d.step_id);
                return (
                  <li key={d.id} className="border-t border-slate-100 first:border-t-0 dark:border-slate-800" data-testid="deliverable-row">
                    <div className={`flex items-start gap-1 px-2 py-2 ${isOpen ? "bg-sky-50 dark:bg-sky-950/20" : ""}`}>
                      <button type="button" className="min-w-0 flex-1 text-left" aria-expanded={isOpen} aria-label={`${isOpen ? "Recolher" : "Expandir"} entregável ${f.name || "(sem nome)"}`} onClick={() => toggle(d.id)}>
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="min-w-0 truncate text-[15px] font-bold text-slate-900 dark:text-slate-100">{i + 1}ª {f.name || "(sem nome)"}</span>
                          {isOpen ? <ChevronDown className="ml-auto h-4 w-4 shrink-0 text-sky-700" /> : <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-sky-700" />}
                        </span>
                        <span className="mt-1 flex flex-wrap items-center gap-1" data-testid="deliverable-chips">
                          <Chip tone="sky">{shortType(f.type)}</Chip>
                          <Chip tone={f.cycle_scope === "first_execution" ? "violet" : "slate"}>{f.cycle_scope === "first_execution" ? "só 1ª execução" : "todo ciclo"}</Chip>
                          <Chip tone="slate">{labelOf(DELIVERABLE_RESPONSIBLES, f.responsible)}</Chip>
                          {f.delivery_moment && <Chip tone="slate">{labelOf(DELIVERABLE_MOMENTS, f.delivery_moment)}</Chip>}
                          <Chip tone={f.is_required ? "slate" : "amber"}>{f.is_required ? "obrigatório" : "opcional"}</Chip>
                          <Chip tone={f.requires_approval ? "violet" : "slate"}>{f.requires_approval ? "aprovação do cliente" : "sem aprovação"}</Chip>
                          <Chip tone="slate">{VISIBILITY_OPTIONS.find(([k]) => k === f.visibility)?.[1] ?? f.visibility}</Chip>
                          {f.is_conditional && <Chip tone="amber">condicional</Chip>}
                          <span title={sit.draft ? "Salvo como rascunho incompleto" : sit.complete ? "Nome e descrição preenchidos." : `Falta: ${sit.missing.join(", ")}`}><Chip tone={sit.complete ? "green" : "amber"}>{sit.draft ? "rascunho" : sit.complete ? "completo" : "incompleto"}</Chip></span>
                        </span>
                      </button>
                      {!readOnly && (
                        <span className="flex shrink-0 items-center" data-testid="deliverable-actions">
                          <button type="button" aria-label={`Subir entregável ${f.name}`} className={iconBtn} disabled={i === 0} onClick={() => move(d, g.items, -1)}><ArrowUp className="h-3.5 w-3.5" /></button>
                          <button type="button" aria-label={`Descer entregável ${f.name}`} className={iconBtn} disabled={i === g.items.length - 1} onClick={() => move(d, g.items, 1)}><ArrowDown className="h-3.5 w-3.5" /></button>
                          <button type="button" aria-label={`Duplicar entregável ${f.name}`} className={iconBtn} onClick={() => duplicate(d)}><CopyPlus className="h-3.5 w-3.5" /></button>
                          <button type="button" aria-label={`Editar entregável ${f.name}`} className="rounded-md bg-sky-100 p-1.5 text-sky-700 hover:bg-sky-200" onClick={() => setModal({ d })}><Pencil className="h-4 w-4" /></button>
                          <button type="button" aria-label={`Excluir entregável ${f.name}`} className="ml-1 rounded-md bg-rose-100 p-1.5 text-rose-600 hover:bg-rose-200" onClick={() => setToDelete(d)}><Trash2 className="h-4 w-4" /></button>
                        </span>
                      )}
                    </div>
                    {isOpen && (
                      <div className="space-y-2 px-3 py-3 text-sm" data-testid="deliverable-body">
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                          <span className="inline-flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">Obrigatório? {yesNo(f.is_required)}</span>
                          <span className="inline-flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">Exige evidência? {yesNo(f.evidence_required)}</span>
                          <span className="inline-flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">Exige aprovação? {yesNo(f.requires_approval)}</span>
                          <span className="inline-flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">Qualificação interna? {yesNo(f.requires_qualification)}</span>
                        </div>
                        {f.description && <p className="text-slate-700 dark:text-slate-300"><span className="font-semibold">Descrição:</span> <span className="text-slate-500">{f.description}</span></p>}
                        <div className="grid gap-x-6 gap-y-1 text-xs text-slate-600 dark:text-slate-300 sm:grid-cols-2">
                          <p><span className="font-semibold">Quem envia:</span> {labelOf(DELIVERABLE_RESPONSIBLES, f.responsible)}</p>
                          <p><span className="font-semibold">Etapa responsável:</span> {st ? `Etapa ${st.index} — ${st.name}` : "Sem etapa (pendente)"}</p>
                          <p><span className="font-semibold">Momento da entrega:</span> {labelOf(DELIVERABLE_MOMENTS, f.delivery_moment)}</p>
                          <p><span className="font-semibold">Recorrência:</span> {labelOf(DELIVERABLE_CYCLE_SCOPES, f.cycle_scope)}</p>
                          {f.format && <p><span className="font-semibold">Formato:</span> {f.format}</p>}
                          <p><span className="font-semibold">Tipo:</span> {labelOf(DELIVERABLE_TYPES, f.type)}</p>
                          {f.is_conditional && <p className="sm:col-span-2"><span className="font-semibold">Condição (orientação):</span> {f.condition_text || "—"}</p>}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {f.template_name && <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-700"><Paperclip className="h-3 w-3" />{f.template_name}</span>}
                          {hasFile && <button type="button" className="inline-flex items-center gap-1 text-[11px] font-semibold text-violet-700 underline" onClick={() => void apiClient.downloadCatalog2DeliverableFile({ id: f.template_url.slice(FILE_PREFIX.length), name: f.template_name })}><Download className="h-3 w-3" />Baixar modelo</button>}
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600" title="Identificador permanente deste entregável" data-testid="deliverable-id">ID {d.key}</span>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
        {list.length === 0 && <p className="rounded-lg border border-slate-200 bg-white px-3 py-3 text-xs text-neutral-400 dark:border-slate-800 dark:bg-slate-900/60">Nenhum entregável. A tarefa conclui só pelas etapas{readOnly ? "." : " — cadastre dentro da etapa (“Entregáveis desta etapa”)."}</p>}
        {list.length > 0 && filtered.length === 0 && <p className="rounded-lg border border-dashed border-slate-300 px-3 py-3 text-center text-xs text-slate-500" data-testid="deliverable-search-empty">Nenhum entregável encontrado para “{q}”.</p>}
      </div>
      {modal && (
        <DeliverableEditorModal key={modal.d?.id ?? "new"} initial={cur} isNew={!modal.d} steps={steps.map((s, i) => ({ id: s.id, name: s.name, index: i + 1 }))}
          context={{ taskName: task.name ?? "", stepName: stepInfo(modal.d?.step_id)?.name, stepIndex: stepInfo(modal.d?.step_id)?.index }}
          keyLabel={modal.d?.key} onSave={save}
          onGoToStep={modal.d?.step_id ? () => { const id = modal.d.step_id; setModal(null); openStepEditor(id); } : undefined}
          onClose={() => setModal(null)} />
      )}
      <ConfirmationDialog
        open={!!toDelete} onClose={() => setToDelete(null)} title="Excluir entregável?" destructive confirmText="Excluir entregável"
        message={<>O entregável “{toDelete?.name}” será excluído da tarefa. Se ele só precisa sair desta etapa, edite-o e troque a etapa responsável. Tarefas já contratadas continuam como estão; se ele já foi usado, a exclusão é recusada.</>}
        onConfirm={() => { if (toDelete) void act(() => apiClient.deleteCatalog2Deliverable(toDelete.id), "Entregável removido."); setToDelete(null); }}
      />
    </div>
  );
}
