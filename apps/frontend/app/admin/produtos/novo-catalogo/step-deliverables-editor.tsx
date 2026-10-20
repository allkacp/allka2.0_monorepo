"use client";

// Bloco "Entregáveis desta etapa": a etapa é a FONTE do vínculo. Tudo aqui é rascunho da tela até a etapa ser salva (como nos acessos).
import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Copy, CopyPlus, Link2, Pencil, Plus, Trash2, Undo2, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { apiClient } from "@/lib/api-client";
import { DELIVERABLE_RESPONSIBLES, deliverableIssues, fieldsOf, labelOf, shortType, type Fields } from "./catalog2-deliverable-fields";
import { DeliverableEditorModal } from "./deliverable-modal";
import { activeDeliv, hasDelivPending, linkItem, newItem, syncDelivStates, unlinkedOf, type DelivItem } from "./step-deliverables";

type SetItems = (u: DelivItem[] | ((cur: DelivItem[]) => DelivItem[])) => void;
const BADGE: Record<string, { text: string; cls: string }> = {
  saved: { text: "Salvo no servidor", cls: "bg-slate-100 text-slate-700" },
  new: { text: "Novo — ainda não salvo", cls: "bg-violet-100 text-violet-800" },
  edited: { text: "Alterado — salva com a etapa", cls: "bg-amber-100 text-amber-800" },
  linked: { text: "Será vinculado a esta etapa", cls: "bg-sky-100 text-sky-800" },
  unlinked: { text: "O vínculo será removido (o entregável continua na tarefa)", cls: "bg-rose-100 text-rose-700" },
  deleted: { text: "Será excluído ao salvar a etapa", cls: "bg-rose-100 text-rose-700" },
};

export function StepDeliverablesEditor({ task, step, stepIndex, readOnly, items, setItems, declaredNone, setDeclaredNone, issues, showErrors }: {
  task: any; step: { id: string; name: string }; stepIndex: number; readOnly: boolean;
  items: DelivItem[]; setItems: SetItems;
  /** "Esta etapa não tem entregáveis". */
  declaredNone: boolean; setDeclaredNone: (v: boolean) => void;
  issues: { field: string; message: string }[]; showErrors: boolean;
}) {
  const [modal, setModal] = useState<{ item: DelivItem | null } | null>(null);
  const [toDelete, setToDelete] = useState<DelivItem | null>(null);
  const [pickLink, setPickLink] = useState(false);
  const [libOpen, setLibOpen] = useState(false);
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<any[] | null>(null);
  const [libErr, setLibErr] = useState<string | null>(null);
  const steps = (task.steps ?? []) as any[];
  const stepList = [...steps].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)).map((s, i) => ({ id: s.id as string, name: s.name as string, index: i + 1 }));
  const unlinked = unlinkedOf(task.deliverables ?? []).filter((d) => !items.some((i) => i.id === d.id));
  const act = activeDeliv(items);
  const pending = hasDelivPending(items);
  useEffect(() => { setLibErr(null); }, [libOpen]);

  const patch = (uid: string, p: Partial<DelivItem>) => setItems((cur) => syncDelivStates(cur.map((i) => (i.uid === uid ? { ...i, ...p } : i))));
  const saveFromModal = async (v: Fields, { draft }: { draft: boolean }) => {
    const edit = modal?.item;
    const fields = { ...v };
    if (edit) setItems((cur) => syncDelivStates(cur.map((i) => (i.uid === edit.uid ? { ...i, fields, draft } : i))));
    else setItems((cur) => [...cur, newItem(step.id, fields, draft)]);
    setModal(null);
  };
  const duplicate = (i: DelivItem) => setItems((cur) => [...cur, newItem(step.id, { ...i.fields, name: `${i.fields.name.slice(0, 170)} (cópia)` }, i.draft)]);
  const move = (uid: string, dir: -1 | 1) => setItems((cur) => {
    const idx = cur.findIndex((x) => x.uid === uid); const act2 = cur.filter((x) => x.state !== "unlinked" && x.state !== "deleted");
    const a = act2.findIndex((x) => x.uid === uid); const b = a + dir; if (b < 0 || b >= act2.length) return cur;
    const other = cur.findIndex((x) => x.uid === act2[b].uid); const out = cur.slice(); [out[idx], out[other]] = [out[other], out[idx]]; return out;
  });
  const unlink = (i: DelivItem) => setItems((cur) => (i.state === "new" || i.state === "linked" ? cur.filter((x) => x.uid !== i.uid) : cur.map((x) => (x.uid === i.uid ? { ...x, state: "unlinked" as const } : x))));
  const del = (i: DelivItem) => setItems((cur) => (i.state === "new" ? cur.filter((x) => x.uid !== i.uid) : cur.map((x) => (x.uid === i.uid ? { ...x, state: "deleted" as const } : x))));
  const undo = (uid: string) => setItems((cur) => syncDelivStates(cur.map((i) => (i.uid === uid ? { ...i, state: "saved" as const } : i))));
  const searchLib = async () => { setLibErr(null); try { const r: any = await apiClient.searchCatalog2DeliverableLibrary(q); setRows(r.data ?? []); } catch (e: any) { setLibErr(e?.message ?? "Não foi possível buscar."); } };
  const reuse = (r: any) => { setItems((cur) => [...cur, newItem(step.id, fieldsOf({ ...r, step_id: step.id }))]); setLibOpen(false); };

  return (
    <section className="space-y-2.5" data-testid="step-deliverables">
      <fieldset className="flex flex-wrap items-center gap-4 text-sm" disabled={readOnly}>
        <legend className="sr-only">Esta etapa possui entregáveis?</legend>
        <label className="inline-flex cursor-pointer items-center gap-2"><input type="radio" name={`deliv-has-${step.id}`} checked={!declaredNone} onChange={() => setDeclaredNone(false)} /> Esta etapa <strong>tem</strong> entregáveis</label>
        <label className="inline-flex cursor-pointer items-center gap-2"><input type="radio" name={`deliv-has-${step.id}`} checked={declaredNone} onChange={() => setDeclaredNone(true)} aria-label="Esta etapa não tem entregáveis" /> Esta etapa <strong>não tem</strong> entregáveis</label>
      </fieldset>
      {declaredNone ? (
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-300" data-testid="deliverables-none-note">
          Declarado: esta etapa <strong>não tem entregáveis</strong> (conclui só pelo critério e pela evidência). {act.length > 0 && <strong className="text-amber-800">Atenção: há {act.length} entregável(is) ligado(s) a ela — marque “tem entregáveis” ou remova os vínculos.</strong>}
        </p>
      ) : (
        <div className="space-y-2">
          <div className="rounded-lg border border-sky-200 bg-sky-50/70 px-3 py-2 text-[11px] text-sky-900 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-100" data-testid="deliverables-draft-banner">
            <strong>Rascunho dos entregáveis:</strong> criar, editar, vincular e remover aqui só é gravado no servidor quando você salva a etapa. O entregável nasce já ligado a esta etapa e aparece no resumo da tarefa.
            {pending && <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-800">há alterações ainda não salvas</span>}
          </div>
          {showErrors && issues.filter((x) => x.field === "deliverables").map((x) => <p key={x.message} role="alert" className="text-[11px] font-semibold text-rose-600">{x.message}</p>)}
          {items.length === 0 && <p className="rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs text-slate-500 dark:border-slate-700" data-testid="deliverables-empty">Nenhum entregável ligado a esta etapa ainda. Clique em “Novo entregável”, vincule um da tarefa ou reutilize um existente — ou declare que a etapa não tem entregáveis.</p>}
          <ul className="space-y-2">
            {items.map((i) => {
              const gone = i.state === "unlinked" || i.state === "deleted";
              const f = i.fields;
              const iss = deliverableIssues(f);
              const rowIssues = showErrors ? issues.filter((x) => x.field === `deliverable:${i.uid}`) : [];
              const badge = i.state === "saved" && i.draft ? { text: "Rascunho incompleto", cls: "bg-amber-100 text-amber-800" } : BADGE[i.state];
              const idx = act.findIndex((x) => x.uid === i.uid);
              return (
                <li key={i.uid} data-testid="step-deliverable-item" data-state={i.state} data-field={`deliverable:${i.uid}`} data-invalid={rowIssues.length ? "true" : undefined}
                  className={`rounded-xl border bg-white p-3 text-xs shadow-sm dark:bg-slate-900 ${gone ? "border-rose-200 opacity-70" : rowIssues.length ? "border-rose-400 ring-1 ring-rose-300" : "border-slate-200 dark:border-slate-700"}`}>
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-1.5">
                        <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{f.name.trim() || "(sem nome)"}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.cls}`} data-testid="deliverable-state">{badge.text}</span>
                        {!gone && (iss.length > 0 || i.draft) && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">incompleto</span>}
                      </p>
                      <p className="mt-0.5 flex flex-wrap gap-x-2 text-[11px] text-slate-500">
                        <span>{shortType(f.type)}</span><span>· {f.cycle_scope === "first_execution" ? "só 1ª execução" : "todo ciclo"}</span><span>· {labelOf(DELIVERABLE_RESPONSIBLES, f.responsible)}</span>
                        <span>· {f.requires_approval ? "aprovação do cliente" : "sem aprovação"}</span><span>· Etapa {stepIndex} — {step.name}</span>
                      </p>
                    </div>
                    {gone ? (
                      <button type="button" className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50" onClick={() => undo(i.uid)}><Undo2 className="h-3 w-3" />Desfazer</button>
                    ) : !readOnly && (
                      <span className="flex shrink-0 items-center" data-testid="step-deliverable-actions">
                        <button type="button" aria-label={`Subir ${f.name}`} className="rounded p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30" disabled={idx <= 0} onClick={() => move(i.uid, -1)}><ArrowUp className="h-3.5 w-3.5" /></button>
                        <button type="button" aria-label={`Descer ${f.name}`} className="rounded p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30" disabled={idx < 0 || idx >= act.length - 1} onClick={() => move(i.uid, 1)}><ArrowDown className="h-3.5 w-3.5" /></button>
                        <button type="button" aria-label={`Duplicar ${f.name}`} title="Duplicar (cria um novo entregável nesta etapa)" className="rounded p-1.5 text-slate-500 hover:bg-slate-100" onClick={() => duplicate(i)}><CopyPlus className="h-3.5 w-3.5" /></button>
                        <button type="button" aria-label={`Editar ${f.name}`} className="rounded-md bg-sky-100 p-1.5 text-sky-700 hover:bg-sky-200" onClick={() => setModal({ item: i })}><Pencil className="h-4 w-4" /></button>
                        <button type="button" aria-label={`Remover o vínculo de ${f.name}`} title="Remover só o vínculo com esta etapa (o entregável continua na tarefa, sem etapa)" className="ml-1 rounded-md bg-amber-100 p-1.5 text-amber-700 hover:bg-amber-200" onClick={() => unlink(i)}><Unlink className="h-4 w-4" /></button>
                        <button type="button" aria-label={`Excluir ${f.name}`} title="Excluir o entregável (pede confirmação)" className="ml-1 rounded-md bg-rose-100 p-1.5 text-rose-600 hover:bg-rose-200" onClick={() => (i.state === "new" ? del(i) : setToDelete(i))}><Trash2 className="h-4 w-4" /></button>
                      </span>
                    )}
                  </div>
                  {rowIssues.map((x) => <p key={x.message} role="alert" className="mt-1.5 text-[11px] font-semibold text-rose-600">{x.message}</p>)}
                </li>
              );
            })}
          </ul>
          {!readOnly && (
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" className="h-9" onClick={() => setModal({ item: null })} data-testid="add-step-deliverable"><Plus className="mr-1.5 h-4 w-4" />Novo entregável</Button>
              <Button type="button" variant="outline" className="h-9" disabled={unlinked.length === 0} title={unlinked.length ? "Vincular um entregável da tarefa que está sem etapa" : "Não há entregável da tarefa sem etapa"} onClick={() => setPickLink((v) => !v)} data-testid="link-step-deliverable"><Link2 className="mr-1.5 h-4 w-4" />Vincular da tarefa{unlinked.length ? ` (${unlinked.length})` : ""}</Button>
              <Button type="button" variant="outline" className="h-9" onClick={() => setLibOpen((v) => !v)} data-testid="reuse-step-deliverable"><Copy className="mr-1.5 h-4 w-4" />Reutilizar de outro produto</Button>
            </div>
          )}
          {pickLink && unlinked.length > 0 && (
            <ul className="space-y-1 rounded-lg border border-dashed border-sky-300 bg-sky-50/50 p-2" data-testid="link-list">
              {unlinked.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-2 rounded bg-white px-2 py-1 text-xs dark:bg-slate-900"><span className="min-w-0 truncate font-semibold">{d.name}</span><Button type="button" size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => { setItems((cur) => [...cur, linkItem(d, step.id)]); setPickLink(false); }}>Vincular a esta etapa</Button></li>
              ))}
            </ul>
          )}
          {libOpen && (
            <div className="space-y-1.5 rounded-lg border border-dashed border-violet-300 bg-violet-50/40 p-2" data-testid="step-deliverable-library">
              <div className="flex items-center gap-1.5">
                <Input className="h-8 flex-1 text-xs" aria-label="Buscar entregável existente" placeholder="Buscar entregável de outro produto pelo nome…" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void searchLib(); }} />
                <Button type="button" size="sm" className="h-8 px-2 text-[11px]" onClick={() => void searchLib()}>Buscar</Button>
              </div>
              {libErr && <p role="alert" className="text-[11px] text-red-600">{libErr}</p>}
              {rows && rows.length === 0 && <p className="text-[11px] text-slate-500">Nenhum entregável encontrado.</p>}
              <ul className="max-h-44 space-y-1 overflow-y-auto">{(rows ?? []).map((r) => <li key={r.id} className="flex items-center justify-between gap-2 rounded bg-white px-2 py-1 text-[11px] dark:bg-slate-900"><span className="min-w-0"><strong className="block truncate">{r.name}</strong><span className="block truncate text-slate-500">{r.from}</span></span><Button type="button" size="sm" variant="outline" className="h-6 px-2 text-[11px]" onClick={() => reuse(r)}>Reutilizar (cópia)</Button></li>)}</ul>
            </div>
          )}
        </div>
      )}
      {modal && (
        <DeliverableEditorModal key={modal.item?.uid ?? "new"} initial={modal.item ? modal.item.fields : { ...fieldsOf({}), step_id: step.id }} isNew={!modal.item || modal.item.state === "new"} steps={stepList}
          lockedStepName={modal.item ? undefined : step.name} context={{ taskName: task.name ?? "", stepName: stepList.find((s) => s.id === (modal.item?.fields.step_id || step.id))?.name, stepIndex: stepList.find((s) => s.id === (modal.item?.fields.step_id || step.id))?.index }}
          keyLabel={modal.item?.key} onSave={saveFromModal} onClose={() => setModal(null)} />
      )}
      <ConfirmationDialog open={!!toDelete} onClose={() => setToDelete(null)} title="Excluir entregável?" destructive confirmText="Excluir entregável"
        message={<>O entregável “{toDelete?.fields.name}” será excluído da tarefa quando você salvar a etapa. Se ele já foi usado em tarefa contratada, a exclusão é recusada — nesse caso use “Remover o vínculo”.</>}
        onConfirm={() => { if (toDelete) del(toDelete); setToDelete(null); }} />
    </section>
  );
}
