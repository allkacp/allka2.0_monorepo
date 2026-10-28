"use client";

// RESUMO dos entregáveis da tarefa (19/10): o cadastro acontece DENTRO da etapa ("Entregáveis desta etapa"); aqui só se reúne, agrupado pela
// etapa responsável, o que já foi configurado. Editar por aqui altera o MESMO registro (nada é copiado nem duplicado) e abre o editor com o
// contexto da tarefa/etapa e a ação "Ir para a etapa". Entregável sem etapa aparece num grupo de pendências.
import { useMemo, useState } from "react";
import { FileIconMenu } from "./catalog2-commercial-ui";
import { AlertTriangle, ArrowDown, ArrowRight, ArrowUp, Copy, CopyPlus, Info, Paperclip, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { BRAND_GRADIENT_STYLE, BRAND_OUTLINE_CLASS } from "./catalog2-questionnaire-builder";
import { apiClient } from "@/lib/api-client";
import { visibilitySummary } from "./catalog2-ops-ui";
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

/** `summaryOnly` (R21-09, reunião 21/10): só resumo — sem criar/editar/excluir/reordenar aqui; cada item leva para a etapa de origem. */
export function TaskDeliverablesEditor({ task, act, readOnly = false, summaryOnly = false }: { task: any; act: any; readOnly?: boolean; version?: any; summaryOnly?: boolean }) {
  const canEdit = !readOnly && !summaryOnly;
  const list: any[] = task.deliverables ?? [];
  const steps: any[] = useMemo(() => [...(task.steps ?? [])].sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0)), [task.steps]);
  const stepInfo = (id: string | null | undefined) => { const i = steps.findIndex((s) => s.id === id); return i < 0 ? null : { id: steps[i].id as string, name: steps[i].name as string, index: i + 1 }; };
  const [lib, setLib] = useState(false);
  const [q, setQ] = useState("");
  const [modal, setModal] = useState<{ d: any | null } | null>(null);
  const [toDelete, setToDelete] = useState<any | null>(null);
  const [toDup, setToDup] = useState<any | null>(null);

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
  const iconBtn = "rounded-md p-1.5 text-slate-500 transition hover:bg-violet-50 hover:text-violet-700 disabled:opacity-30 disabled:hover:bg-transparent dark:hover:bg-slate-800";
  const cur = modal?.d ? fieldsOf(modal.d) : fieldsOf({ step_id: "" });

  return (
    <div className="w-full min-w-0 space-y-2" data-testid="task-deliverables">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="flex items-center gap-1.5 text-base font-bold text-slate-900 dark:text-slate-100"><Paperclip className="h-4 w-4" />Entregáveis da tarefa <span className="text-xs font-normal text-slate-500">({list.length}) — resumo do que foi configurado nas etapas</span>
          {orphanCount > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" data-testid="deliverables-orphans" aria-label="Atenção: entregável sem etapa responsável" className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-amber-300 bg-amber-50 text-amber-700 transition hover:bg-amber-100">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="sr-only">{orphanCount === 1 ? "1 entregável sem etapa responsável" : `${orphanCount} entregáveis sem etapa responsável`}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs border border-amber-300 !bg-amber-50 p-3 text-xs !text-amber-900">
                <p className="text-sm font-bold">{orphanCount === 1 ? "1 entregável sem etapa responsável" : `${orphanCount} entregáveis sem etapa responsável`}</p>
                <p className="mt-1">{orphanCount === 1 ? "Vincule-o" : "Vincule-os"} a uma etapa ({summaryOnly ? "abra a etapa de origem e use “Vincular da tarefa”" : "editar → “Etapa responsável”, ou abra a etapa e use “Vincular da tarefa”"}).</p>
              </TooltipContent>
            </Tooltip>
          )}
        </h4>
        <div className="flex flex-wrap items-center gap-2">
          {canEdit && <>
            <Button type="button" size="sm" variant="outline" className={`h-9 ${BRAND_OUTLINE_CLASS}`} title="Reutilizar um entregável já cadastrado em outro produto" onClick={() => setLib((v) => !v)}><Copy className="h-3.5 w-3.5" />Reutilizar existente</Button>
            <Button type="button" style={BRAND_GRADIENT_STYLE} className="h-9 gap-1.5 px-4 text-white shadow-md hover:brightness-110" title="Adicionar entregável (o ideal é adicionar dentro da etapa)" onClick={() => setModal({ d: null })}><Plus className="h-4 w-4" />Adicionar</Button>
          </>}
        </div>
      </div>
      {summaryOnly ? <p className="text-[11px] text-slate-500" data-testid="deliverables-hint">Resumo só para consulta: mostra o que foi configurado em cada etapa. Para criar ou editar um entregável, abra a etapa de origem pelo botão “Ir para a etapa”.</p> : <p className="text-[11px] text-slate-500" data-testid="deliverables-hint">Cadastre cada entregável dentro da própria etapa (“Entregáveis desta etapa”). Esta lista só reúne o que já foi configurado; editar aqui altera o mesmo registro.</p>}
      {list.length > 3 && (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Localizar entregável" data-testid="deliverable-search" placeholder="Localizar entregável (nome, tipo, etapa…)" className="h-9 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-9 text-sm dark:border-slate-600 dark:bg-slate-900" />
          {q && <button type="button" aria-label="Limpar busca de entregáveis" className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700" onClick={() => setQ("")}><X className="h-4 w-4" /></button>}
        </div>
      )}
      {lib && canEdit && <LibraryPicker task={task} act={act} onDone={() => setLib(false)} />}
      <div className="space-y-2" data-testid="deliverable-list">
        {groups.map((g) => (
          <section key={g.key} className={`overflow-hidden rounded-lg border bg-white dark:bg-slate-900/60 ${g.key === "__none" ? "border-amber-300" : "border-slate-200 dark:border-slate-800"}`} data-testid="deliverable-group" data-group={g.key}>
            <h5 className={`flex flex-wrap items-center gap-2 px-3 py-1.5 text-xs font-bold ${g.key === "__none" ? "bg-amber-50 text-amber-900" : "bg-slate-50 text-slate-700 dark:bg-slate-800/40 dark:text-slate-200"}`} data-testid="deliverable-group-title">
              <span>{g.title}</span><span className="font-normal opacity-70">({g.items.length})</span>
              {g.stepId && !summaryOnly && <button type="button" className="ml-auto text-[11px] font-semibold text-violet-700 underline" onClick={() => openStepEditor(g.stepId!)}>Ir para a etapa</button>}
            </h5>
            <ul>
              {g.items.map((d, i) => {
                const f = fieldsOf(d);
                const hasFile = f.template_url.startsWith(FILE_PREFIX);
                const sit = deliverableSituation(d);
                const st = stepInfo(d.step_id);
                const dt = "flex items-center justify-between gap-4";
                return (
                  <li key={d.id} className="border-t border-slate-100 first:border-t-0 dark:border-slate-800" data-testid="deliverable-row">
                    <div className="flex items-center gap-2 px-3 py-2.5 hover:bg-violet-50/40">
                      <span className="min-w-0 flex-1 truncate text-[15px] font-bold text-slate-900 dark:text-slate-100">{i + 1}ª {f.name || "(sem nome)"}</span>
                      {(hasFile || f.template_name) && <span className="inline-flex shrink-0 items-center text-violet-600" data-testid="deliverable-has-file" title={`Arquivo anexado: ${f.template_name || "modelo"}`}><Paperclip className="h-4 w-4" /></span>}
                      {!sit.complete && <span title={sit.draft ? "Salvo como rascunho incompleto" : `Falta: ${sit.missing.join(", ")}`}><Chip tone="amber">{sit.draft ? "rascunho" : "incompleto"}</Chip></span>}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type="button" aria-label={`Informações do entregável ${f.name || "(sem nome)"}`} className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-violet-200 bg-white text-violet-700 transition hover:bg-violet-50"><Info className="h-3.5 w-3.5" /></button>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="max-w-md p-3 text-xs" data-testid="deliverable-info">
                          <p className="text-sm font-bold">{f.name || "(sem nome)"}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-1" data-testid="deliverable-chips">
                            <Chip tone="sky">{shortType(f.type)}</Chip>
                            <Chip tone={f.cycle_scope === "first_execution" ? "violet" : "slate"}>{f.cycle_scope === "first_execution" ? "só 1ª execução" : "todo ciclo"}</Chip>
                            <Chip tone="slate">{labelOf(DELIVERABLE_RESPONSIBLES, f.responsible)}</Chip>
                            {f.delivery_moment && <Chip tone="slate">{labelOf(DELIVERABLE_MOMENTS, f.delivery_moment)}</Chip>}
                            <Chip tone={f.is_required ? "slate" : "amber"}>{f.is_required ? "obrigatório" : "opcional"}</Chip>
                            <Chip tone={f.requires_approval ? "violet" : "slate"}>{f.requires_approval ? "aprovação do cliente" : "sem aprovação"}</Chip>
                            <Chip tone="slate">{visibilitySummary(f.visibility)}</Chip>
                            {f.is_conditional && <Chip tone="amber">condicional</Chip>}
                            <Chip tone={sit.complete ? "green" : "amber"}>{sit.draft ? "rascunho" : sit.complete ? "completo" : "incompleto"}</Chip>
                          </div>
                          <dl className="mt-3 space-y-2">
                            <div className={dt}><dt className="font-semibold opacity-90">Exige evidência?</dt><dd>{yesNo(f.evidence_required)}</dd></div>
                            <div className={dt}><dt className="font-semibold opacity-90">Qualificação interna?</dt><dd>{yesNo(f.requires_qualification)}</dd></div>
                            <div className={dt}><dt className="font-semibold opacity-90">Etapa responsável</dt><dd className="text-right">{st ? `Etapa ${st.index} — ${st.name}` : "Sem etapa (pendente)"}</dd></div>
                            <div className={dt}><dt className="font-semibold opacity-90">Quem envia</dt><dd>{labelOf(DELIVERABLE_RESPONSIBLES, f.responsible)}</dd></div>
                            <div className={dt}><dt className="font-semibold opacity-90">Momento da entrega</dt><dd>{labelOf(DELIVERABLE_MOMENTS, f.delivery_moment)}</dd></div>
                            <div className={dt}><dt className="font-semibold opacity-90">Recorrência</dt><dd>{labelOf(DELIVERABLE_CYCLE_SCOPES, f.cycle_scope)}</dd></div>
                            {f.format && <div className={dt}><dt className="font-semibold opacity-90">Formato</dt><dd>{f.format}</dd></div>}
                            <div className={dt}><dt className="font-semibold opacity-90">Tipo</dt><dd>{labelOf(DELIVERABLE_TYPES, f.type)}</dd></div>
                          </dl>
                          {f.description && <p className="mt-2.5 border-t border-white/20 pt-2"><span className="font-semibold">Descrição:</span> <span className="opacity-90">{f.description}</span></p>}
                          {f.is_conditional && <p className="mt-2"><span className="font-semibold">Condição (orientação):</span> <span className="opacity-90">{f.condition_text || "—"}</span></p>}
                          {(hasFile || f.template_name) && <p className="mt-2 flex items-center gap-1"><Paperclip className="h-3 w-3" />Arquivo: {f.template_name || "modelo"}</p>}
                          <p className="mt-2 text-[10px] opacity-70" title="Identificador permanente deste entregável" data-testid="deliverable-id">ID {d.key}</p>
                        </TooltipContent>
                      </Tooltip>
                      {summaryOnly && (st
                        ? <button type="button" className={`inline-flex h-8 shrink-0 items-center gap-1 rounded-md border px-2.5 text-xs font-semibold ${BRAND_OUTLINE_CLASS}`} data-testid="deliverable-go-step" onClick={() => openStepEditor(st.id)}><ArrowRight className="h-3.5 w-3.5" />Ir para a etapa</button>
                        : <Tooltip>
                            <TooltipTrigger asChild>
                              <button type="button" aria-label="Atenção: sem etapa responsável" data-testid="deliverable-no-step" className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-amber-300 bg-amber-50 text-amber-700 transition hover:bg-amber-100">
                                <AlertTriangle className="h-4 w-4" />
                                <span className="sr-only">sem etapa responsável</span>
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="max-w-xs border border-amber-300 !bg-amber-50 p-3 text-xs !text-amber-900">
                              <p className="text-sm font-bold">Sem etapa responsável</p>
                              <p className="mt-1">Vincule este entregável a uma etapa: abra a etapa de origem e use “Vincular da tarefa”.</p>
                            </TooltipContent>
                          </Tooltip>)}
                      {canEdit && (
                        <span className="flex shrink-0 items-center gap-0.5" data-testid="deliverable-actions">
                          <button type="button" aria-label={`Subir entregável ${f.name}`} title="Subir" className={iconBtn} disabled={i === 0} onClick={() => move(d, g.items, -1)}><ArrowUp className="h-4 w-4" /></button>
                          <button type="button" aria-label={`Descer entregável ${f.name}`} title="Descer" className={iconBtn} disabled={i === g.items.length - 1} onClick={() => move(d, g.items, 1)}><ArrowDown className="h-4 w-4" /></button>
                          <button type="button" aria-label={`Duplicar entregável ${f.name}`} title="Duplicar" className={iconBtn} onClick={() => setToDup(d)}><CopyPlus className="h-4 w-4" /></button>
                          <button type="button" aria-label={`Editar entregável ${f.name}`} title="Editar" className="rounded-md bg-violet-100 p-2 text-violet-700 transition hover:bg-violet-200" onClick={() => setModal({ d })}><Pencil className="h-4 w-4" /></button>
                          <button type="button" aria-label={`Excluir entregável ${f.name}`} title="Excluir" className="rounded-md bg-rose-100 p-2 text-rose-600 transition hover:bg-rose-200" onClick={() => setToDelete(d)}><Trash2 className="h-4 w-4" /></button>
                        </span>
                      )}
                    </div>
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
        elevated open={!!toDelete} onClose={() => setToDelete(null)} title="Excluir entregável?" destructive confirmText="Excluir entregável"
        message={<>O entregável “{toDelete?.name}” será excluído da tarefa. Se ele só precisa sair desta etapa, edite-o e troque a etapa responsável. Tarefas já contratadas continuam como estão; se ele já foi usado, a exclusão é recusada.</>}
        onConfirm={() => { if (toDelete) void act(() => apiClient.deleteCatalog2Deliverable(toDelete.id), "Entregável removido."); setToDelete(null); }}
      />
      <ConfirmationDialog
        elevated open={!!toDup} onClose={() => setToDup(null)} title="Duplicar entregável?" destructive={false} confirmText="Duplicar entregável"
        message={<>Será criada uma cópia do entregável “{toDup?.name}” nesta tarefa, com o nome terminando em “(cópia)”.</>}
        onConfirm={() => { if (toDup) duplicate(toDup); setToDup(null); }}
      />
    </div>
  );
}
