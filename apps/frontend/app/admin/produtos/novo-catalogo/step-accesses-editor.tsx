"use client";

// Bloco 5 da etapa — "Conexões e acessos desta etapa" em RASCUNHO DA TELA: nada é gravado no servidor até a etapa ser salva.
// Cada acesso mostra se é NOVO (só na tela), SALVO, ALTERADO (salva com a etapa), SERÁ REMOVIDO (dá para desfazer) ou RASCUNHO INCOMPLETO.
import { useEffect, useRef, useState } from "react";
import { Pencil, Plus, Search, Settings2, Trash2, Undo2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { FramedPanel, FRAMED_HEADER_CLASS, FRAMED_FOOTER_CLASS } from "@/components/framed-panel";
import { ButtonLoader } from "@/components/ui/loading";
import { apiClient } from "@/lib/api-client";
import { AccessLogo } from "./access-logo";
import { RequirementRow, formIssues, type Form, type Vocab } from "./catalog2-connections-ui";
import type { QuickCreate } from "./quick-variation";
import { accessPatch, splitAccesses } from "./step-access-picker";
import {
  accessName, activeItems, configuredCount, formFromBody, hasPending, incompleteCount, newItemFromType, otherUsers, syncStates,
  type AccessItem, type StepScope,
} from "./step-accesses";

type SetItems = (u: AccessItem[] | ((cur: AccessItem[]) => AccessItem[])) => void;

const STATE_BADGE: Record<string, { text: string; cls: string }> = {
  saved: { text: "Salvo no servidor", cls: "bg-slate-100 text-slate-700" },
  new: { text: "Novo — ainda não salvo", cls: "bg-violet-100 text-violet-800" },
  edited: { text: "Alterado — salva com a etapa", cls: "bg-amber-100 text-amber-800" },
  removed: { text: "Será removido ao salvar a etapa", cls: "bg-rose-100 text-rose-700" },
};

export function StepAccessesEditor({ version, scope, readOnly, items, setItems, accessOn, setAccessOn, ops, setOps, stepNames, issues, showErrors, quick }: {
  version: any; scope: StepScope; readOnly: boolean;
  /** Criar variação/opção dentro da condição do acesso (mesmas rotas do cadastro de variações). */
  quick?: QuickCreate;
  items: AccessItem[]; setItems: SetItems;
  /** "Esta etapa precisa de acesso" (ligado/desligado) — o servidor só muda ao salvar a etapa. */
  accessOn: boolean; setAccessOn: (v: boolean) => void;
  /** ops da etapa em edição (access_keys, access_parked) e como alterar SÓ na tela. */
  ops: any; setOps: (patch: Record<string, unknown>) => void;
  stepNames?: Record<string, string>;
  issues: { field: string; message: string }[]; showErrors: boolean;
}) {
  const [types, setTypes] = useState<any[]>([]);
  const [vocab, setVocab] = useState<Vocab | null>(null);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [typeQuery, setTypeQuery] = useState("");
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [ask, setAsk] = useState<null | { mode: "off" | "remove"; entries: { item: AccessItem; users: { task: any; step: any }[]; choice: string }[] }>(null);
  useEffect(() => {
    let live = true;
    void Promise.all([apiClient.getConnectionTypes(), apiClient.getConnectionVocabulary()]).then(([t, v]) => { if (live) { setTypes(t.data); setVocab(v); } }).catch(() => {});
    return () => { live = false; };
  }, []);
  // Acesso com erro (ao tentar concluir) abre sozinho.
  useEffect(() => {
    if (!showErrors) return;
    const bad = issues.filter((i) => i.field.startsWith("access:")).map((i) => i.field.slice(7));
    if (bad.length) setOpen((cur) => new Set([...cur, ...bad]));
  }, [showErrors, issues]);

  const allReqs: any[] = (version.connection_requirements ?? []).filter((r: any) => !r.draft_incomplete);
  const { shared } = splitAccesses(allReqs, scope.step.key) as { shared: any[] };
  const keys: string[] = Array.isArray(ops?.access_keys) ? ops.access_keys : [];
  const usedShared = shared.filter((r) => keys.includes(r.key));
  const availableShared = shared.filter((r) => !keys.includes(r.key));
  const nameOfReq = (r: any) => r.label?.trim() || r.connection_type?.name || r.key;
  const methodLabel = (k: string) => vocab?.methods.find((m) => m.key === k)?.label ?? k;
  const parked: { reqs: any[]; keys: string[] } | undefined = ops?.access_parked;
  const parkedCount = (parked?.reqs?.length ?? 0) + (parked?.keys?.length ?? 0);
  const labelOf = ({ task, step }: { task: any; step: any }) => `${step.name}${(version.tasks ?? []).length > 1 ? ` (${task.name})` : ""}`;
  const update = (uid: string, form: Form) => setItems((cur) => syncStates(cur.map((i) => (i.uid === uid ? { ...i, form } : i))));
  // Cada acesso abre num PAINEL MOLDURA (um por vez). "Cancelar" volta ao que estava ao abrir; "Salvar alterações" mantém no rascunho da etapa.
  const snaps = useRef<Record<string, Form>>({});
  const toggleOpen = (uid: string) => setOpen((cur) => { if (cur.has(uid)) return new Set(); const it = items.find((x) => x.uid === uid); if (it) snaps.current[uid] = it.form; return new Set([uid]); });
  const closePanel = () => setOpen(new Set());
  const cancelPanel = (uid: string) => { const snap = snaps.current[uid]; if (snap) update(uid, snap); closePanel(); };

  const markRemoved = (entries: { item: AccessItem; choice: string }[]) => setItems((cur) => cur.flatMap((i) => {
    const e = entries.find((x) => x.item.uid === i.uid);
    if (!e) return [i];
    if (i.state === "new" || !i.reqId) return []; // nunca foi ao servidor: some da tela
    return [{ ...i, state: "removed" as const, decision: e.choice }];
  }));
  const undoRemove = (uid: string) => setItems((cur) => syncStates(cur.map((i) => (i.uid === uid ? { ...i, state: "saved" as const, decision: undefined } : i))));
  const startRemove = (items1: AccessItem[], mode: "off" | "remove") => {
    const entries = items1.map((item) => ({ item, users: item.key ? otherUsers(version, item.key, scope.task.key, scope.step.key) : [], choice: "all" })).filter((e) => e.users.length > 0);
    if (entries.length) { setAsk({ mode, entries }); return; }
    markRemoved(items1.map((item) => ({ item, choice: "all" })));
    if (mode === "off") setAccessOn(false);
  };
  const confirmAsk = () => {
    if (!ask) return;
    const asked = new Set(ask.entries.map((e) => e.item.uid));
    const rest = ask.mode === "off" ? activeItems(items).filter((i) => !asked.has(i.uid)).map((item) => ({ item, choice: "all" })) : [];
    markRemoved([...ask.entries.map((e) => ({ item: e.item, choice: e.choice })), ...rest]);
    if (ask.mode === "off") setAccessOn(false);
    setAsk(null);
  };

  const turnOn = () => {
    setAccessOn(true);
    // Voltou a ligar na mesma edição: o que estava marcado para sair volta como estava.
    setItems((cur) => syncStates(cur.map((i) => (i.state === "removed" ? { ...i, state: "saved" as const, decision: undefined } : i))));
    // Acessos GUARDADOS de uma vez anterior: voltam para a lista como itens novos (só gravam ao salvar a etapa).
    if (parkedCount > 0 && parked) {
      setItems((cur) => [...cur, ...(parked.reqs ?? []).map((p: any) => {
        const t = types.find((x) => x.id === p.body.connection_type_id);
        const base = newItemFromType(t ?? { id: p.body.connection_type_id, name: p.key, key: p.key }, scope);
        return { ...base, key: p.key, form: { ...formFromBody(p.body), key: p.key } };
      })]);
      setOps({ access_scope: "some", access_keys: Array.from(new Set([...(parked.keys ?? []), ...keys])), access_parked: undefined });
    }
  };
  const turnOff = () => {
    const mine = activeItems(items).filter((i) => i.reqId || i.state === "new");
    if (mine.length === 0) { setAccessOn(false); return; }
    startRemove(mine, "off");
  };

  const addType = (t: any) => {
    setItems((cur) => [...cur, newItemFromType(t, scope)]);
    setCatalogOpen(false);
    setAccessOn(true);
  };
  const allTypes = types.filter((t) => t.is_active !== false);
  // Busca sem acento e sem diferenciar maiúsculas: nome, descrição, chave, plataforma e o que o cliente informa.
  const norm = (v: unknown) => String(v ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const needle = norm(typeQuery).trim();
  const catalogTypes = needle
    ? allTypes.filter((t) => needle.split(/\s+/).every((w) => norm([t.name, t.description, t.key, t.provider, ...(t.fields ?? []).map((f: any) => f.label)].join(" ")).includes(w)))
    : allTypes;
  const usedTypeIds = new Set(activeItems(items).map((i) => i.form.connection_type_id));
  const active = activeItems(items);
  const removedItems = items.filter((i) => i.state === "removed");
  const newCount = items.filter((i) => i.state === "new").length;
  const pending = hasPending(items);

  return (
    <section className="space-y-2.5" data-testid="connections-section">
      <label className={`flex h-9 items-center gap-2 text-sm ${readOnly ? "opacity-70" : "cursor-pointer"}`}>
        <Switch aria-label="Esta etapa precisa de acesso" checked={accessOn} disabled={readOnly} onCheckedChange={(v) => { if (v) turnOn(); else turnOff(); }} />
        <span data-no-info="" className="font-semibold text-slate-700 dark:text-slate-200">Esta etapa precisa de acesso</span>
        <span className="field-info" data-help="Ligue quando o cliente precisa liberar algum acesso para esta etapa acontecer (conta de anúncios, site, e-mail…). Desligar guarda os acessos da etapa para voltarem se você ligar de novo. Nada é gravado até você salvar a etapa." aria-hidden="true">i</span>
      </label>
      {!accessOn && parkedCount > 0 && (
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-300" data-testid="parked-note">
          Acessos guardados desta etapa: <strong>{parkedCount}</strong>. Eles voltam quando você ligar “Esta etapa precisa de acesso” de novo.
        </p>
      )}
      {accessOn && (
        <div className="space-y-2" data-testid="step-access-list" data-field="accesses" data-invalid={showErrors && issues.some((i) => i.field === "accesses") ? "true" : undefined}>
          <div className="rounded-lg border border-sky-200 bg-sky-50/70 px-3 py-2 text-[11px] text-sky-900 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-100" data-testid="access-draft-banner">
            <strong>Rascunho dos acessos:</strong> o que você adiciona, altera ou remove aqui só é gravado no servidor quando você salva a etapa (“Salvar rascunho da etapa” ou “Concluir e salvar etapa”). Se cancelar, nada fica gravado.
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <p className="font-semibold text-slate-700 dark:text-slate-200" data-testid="access-counter">{configuredCount(items) + usedShared.length} acesso{configuredCount(items) + usedShared.length === 1 ? "" : "s"} configurado{configuredCount(items) + usedShared.length === 1 ? "" : "s"}</p>
            {incompleteCount(items) > 0 && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800" data-testid="access-incomplete-count">{incompleteCount(items)} incompleto{incompleteCount(items) === 1 ? "" : "s"} (não conta{incompleteCount(items) === 1 ? "" : "m"})</span>}
            {newCount > 0 && <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-800">{newCount} só no rascunho da tela</span>}
            {pending && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] text-amber-800">há alterações ainda não salvas</span>}
          </div>
          {showErrors && issues.filter((i) => i.field === "accesses").map((i) => <p key={i.message} role="alert" className="text-[11px] font-semibold text-rose-600">{i.message}</p>)}
          {active.length === 0 && usedShared.length === 0 && removedItems.length === 0 && <p className="rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs text-slate-500 dark:border-slate-700">Nenhum acesso ainda. Clique em “Adicionar acesso” e escolha na lista (Google Ads, WordPress…).</p>}
          <ul className="space-y-2">
            {usedShared.map((r) => (
              <li key={r.id} className="rounded-xl border border-violet-200 bg-violet-50/50 p-3 text-xs shadow-sm dark:border-violet-900 dark:bg-violet-950/20" data-testid="step-access-shared-used">
                <div className="flex items-start gap-2">
                  <AccessLogo type={{ ...r.connection_type, name: nameOfReq(r) }} size={32} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{nameOfReq(r)}</p>
                    <p className="text-[11px] text-slate-500">Cadastrado na etapa {stepNames?.[r.when_step_key ?? ""] ?? r.when_step_key} · usado aqui</p>
                  </div>
                  {!readOnly && <button type="button" aria-label={`Deixar de usar ${nameOfReq(r)} nesta etapa`} title="Deixar de usar nesta etapa (o acesso continua na etapa de origem)" className="rounded p-1 text-slate-400 hover:text-red-600" onClick={() => setOps(accessPatch("some", keys.filter((k) => k !== r.key)))}><X className="h-4 w-4" /></button>}
                </div>
              </li>
            ))}
            {items.map((i) => {
              const isOpen = open.has(i.uid);
              const iss = showErrors ? issues.filter((x) => x.field === `access:${i.uid}`) : [];
              const badge = i.state === "saved" && i.form.draft_incomplete ? { text: "Rascunho incompleto", cls: "bg-amber-100 text-amber-800" } : STATE_BADGE[i.state];
              const removed = i.state === "removed";
              const issuesNow = removed ? [] : formIssues(i.form);
              return (
                <li key={i.uid} className={`rounded-xl border bg-white p-3 text-xs shadow-sm dark:bg-slate-900 ${removed ? "border-rose-200 opacity-70" : iss.length ? "border-rose-400 ring-1 ring-rose-300" : "border-slate-200 dark:border-slate-700"}`} data-testid="step-access-item" data-state={i.state} data-field={`access:${i.uid}`} data-invalid={iss.length ? "true" : undefined}>
                  <div className="flex items-start gap-2">
                    <AccessLogo type={{ ...(i.typeObj ?? {}), name: accessName(i) }} size={32} />
                    <button type="button" className="min-w-0 flex-1 text-left" aria-haspopup="dialog" aria-label={`Abrir o acesso ${accessName(i)}`} onClick={() => toggleOpen(i.uid)} disabled={removed}>
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{accessName(i)}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.cls}`} data-testid="access-state">{badge.text}</span>
                        {issuesNow.length > 0 && !removed && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">incompleto</span>}
                      </span>
                      <span className="block text-[11px] text-slate-500">O cliente libera por: {methodLabel(i.form.method)}{i.form.obligation === "optional" ? " · opcional" : i.form.obligation === "conditional" ? " · condicional" : " · obrigatório"}</span>
                    </button>
                    {removed
                      ? <button type="button" className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50" onClick={() => undoRemove(i.uid)}><Undo2 className="h-3 w-3" />Desfazer</button>
                      : !readOnly && <button type="button" aria-label={`Remover ${accessName(i)}`} className="rounded p-1 text-slate-400 hover:text-red-600" onClick={() => startRemove([i], "remove")}><Trash2 className="h-4 w-4" /></button>}
                    {!removed && <button type="button" aria-label={`${readOnly ? "Ver" : "Editar"} o acesso ${accessName(i)}`} title={readOnly ? "Ver" : "Editar"} className="rounded p-1 text-violet-600 hover:bg-violet-50" onClick={() => toggleOpen(i.uid)} data-testid="access-edit"><Pencil className="h-4 w-4" /></button>}
                  </div>
                  {iss.map((x) => <p key={x.message} role="alert" className="mt-1.5 text-[11px] font-semibold text-rose-600">{x.message}</p>)}
                  {isOpen && !removed && vocab && (
                    <FramedPanel open onOpenChange={(o) => { if (!o) cancelPanel(i.uid); }} testId="step-access-panel" title={accessName(i)}>
                      <div className={`flex shrink-0 items-center justify-between gap-2 rounded-2xl bg-white px-4 py-3 shadow-sm dark:bg-slate-900 ${FRAMED_HEADER_CLASS}`}>
                        <div className="flex min-w-0 items-center gap-2"><AccessLogo type={{ ...(i.typeObj ?? {}), name: accessName(i) }} size={32} /><div className="min-w-0"><p className="truncate text-base font-bold text-slate-900 dark:text-slate-100">{accessName(i)}</p><p className="truncate text-xs text-slate-500">{readOnly ? "Somente leitura" : "As alterações só vão para o rascunho da etapa; ela é gravada quando você salvar a etapa."}</p></div></div>
                      </div>
                      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
                        <RequirementRow embedded lockType initial={i.form} isNew={i.state === "new"} types={types} vocab={vocab} tasks={[]} version={version} readOnly={readOnly} scope={{ kind: "step", task: scope.task, step: scope.step }} onChange={(f) => update(i.uid, f)} quick={quick} />
                      </div>
                      <div className={`flex shrink-0 justify-end gap-2 ${FRAMED_FOOTER_CLASS}`}>
                        {readOnly ? <Button type="button" variant="outline" onClick={closePanel}>Fechar</Button> : (<><Button type="button" variant="outline" onClick={() => cancelPanel(i.uid)} data-testid="access-panel-cancel">Cancelar</Button><Button type="button" onClick={closePanel} data-testid="access-panel-save">Salvar alterações</Button></>)}
                      </div>
                    </FramedPanel>
                  )}
                </li>
              );
            })}
          </ul>
          {!readOnly && (
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" className="h-9" onClick={() => setCatalogOpen(true)} data-testid="add-step-access"><Plus className="mr-1.5 h-4 w-4" />Adicionar acesso</Button>
            </div>
          )}
          {availableShared.length > 0 && (
            <div className="rounded-lg border border-violet-200 bg-violet-50/60 p-2.5 dark:border-violet-900 dark:bg-violet-950/20" data-testid="shared-accesses">
              <p className="text-xs font-semibold text-violet-800 dark:text-violet-200">Acessos de outras etapas, disponíveis para usar aqui</p>
              <ul className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
                {availableShared.map((r) => (
                  <li key={r.key} className="flex items-center gap-2 rounded-lg border border-violet-200 bg-white px-2 py-1.5 dark:border-violet-900 dark:bg-slate-900">
                    <AccessLogo type={{ ...r.connection_type, name: nameOfReq(r) }} size={26} />
                    <span className="min-w-0 flex-1 text-xs"><span className="block truncate font-semibold">{nameOfReq(r)}</span><span className="text-[10px] text-slate-500">da etapa {stepNames?.[r.when_step_key ?? ""] ?? r.when_step_key}</span></span>
                    {!readOnly && <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-[11px]" onClick={() => setOps(accessPatch("some", [...keys, r.key]))}>Usar nesta etapa</Button>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      <Dialog open={ask !== null} onOpenChange={(v) => { if (!v) setAsk(null); }}>
        <DialogContent className="max-w-xl" data-testid="access-transfer-dialog">
          <DialogTitle className="text-base">{ask?.mode === "off" ? "Estes acessos são usados por outras etapas" : "Este acesso é usado por outras etapas"}</DialogTitle>
          <p className="text-xs text-slate-600 dark:text-slate-300">Escolha o que fazer com cada um: tirar de todas as etapas, ou passar para uma das etapas que o usa (ela vira a etapa “mãe” do acesso). Isso só é aplicado quando você salvar a etapa.</p>
          <div className="space-y-3">
            {ask?.entries.map((e, idx) => (
              <fieldset key={e.item.uid} className="rounded-lg border border-slate-200 p-2.5 dark:border-slate-700">
                <legend className="px-1 text-sm font-bold">{accessName(e.item)}</legend>
                <label className="flex items-center gap-2 py-0.5 text-xs">
                  <input type="radio" name={`ask-${idx}`} checked={e.choice === "all"} onChange={() => setAsk((cur) => cur && { ...cur, entries: cur.entries.map((x, j) => (j === idx ? { ...x, choice: "all" } : x)) })} />
                  <span>{ask.mode === "off" ? "Desativar em todas as etapas (fica guardado)" : "Remover de todas as etapas"}</span>
                </label>
                {e.users.map((u) => {
                  const v = `${u.task.key}::${u.step.key}`;
                  return (
                    <label key={v} className="flex items-center gap-2 py-0.5 text-xs">
                      <input type="radio" name={`ask-${idx}`} checked={e.choice === v} onChange={() => setAsk((cur) => cur && { ...cur, entries: cur.entries.map((x, j) => (j === idx ? { ...x, choice: v } : x)) })} />
                      <span>Passar para a etapa <strong>{labelOf(u)}</strong> (ela passa a ser a etapa mãe)</span>
                    </label>
                  );
                })}
              </fieldset>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setAsk(null)}>Cancelar</Button>
            <Button type="button" onClick={confirmAsk} data-testid="access-transfer-confirm">Confirmar</Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={catalogOpen} onOpenChange={(o) => { setCatalogOpen(o); if (!o) setTypeQuery(""); }}>
        <DialogContent className="max-h-[calc(100dvh-9rem)] w-[95vw] max-w-4xl overflow-y-auto sm:max-w-4xl" data-testid="step-access-catalog">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <DialogTitle className="text-base">Adicionar acesso — {scope.step.name}</DialogTitle>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">Escolha o tipo de acesso. Ele entra no <strong>rascunho da etapa</strong> e só é gravado quando você salvar a etapa.</p>
            </div>
            {!readOnly && <Button type="button" variant="outline" size="sm" className="h-8 text-xs" data-testid="manage-access-types" onClick={() => { setCatalogOpen(false); window.dispatchEvent(new Event("catalog2:manage-access-types")); }}><Settings2 className="mr-1.5 h-3.5 w-3.5" />Configurar tipos de acesso</Button>}
          </div>
          {!vocab && <p className="text-xs text-slate-500"><ButtonLoader text="Carregando o catálogo de acessos…" /></p>}
          <div className="sticky top-0 z-10 -mx-1 bg-white px-1 py-1 dark:bg-slate-950">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input type="search" autoFocus value={typeQuery} onChange={(e) => setTypeQuery(e.target.value)} aria-label="Pesquisar acessos" data-testid="access-type-search"
                placeholder="Pesquisar acesso (ex.: Google, Meta, site, e-mail…)"
                className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-9 text-sm text-slate-800 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100" />
              {typeQuery && <button type="button" aria-label="Limpar pesquisa" className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700" onClick={() => setTypeQuery("")}><X className="h-4 w-4" /></button>}
            </div>
            {vocab && <p className="mt-1 text-[11px] text-slate-500" data-testid="access-type-count" aria-live="polite">{needle ? `${catalogTypes.length} de ${allTypes.length} acessos` : `${allTypes.length} acessos`}</p>}
          </div>
          <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {catalogTypes.map((t) => {
              const fields: any[] = t.fields ?? [];
              const used = usedTypeIds.has(t.id);
              return (
                <li key={t.id} className={`flex flex-col rounded-xl border bg-white p-3 text-xs shadow-sm dark:bg-slate-900 ${used ? "border-emerald-300" : "border-slate-200 dark:border-slate-700"}`} data-testid={`step-access-type-${t.key}`}>
                  <div className="flex items-start gap-2.5">
                    <AccessLogo type={t} size={40} />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{t.name}</p>
                      <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-500">{t.description || "Sem descrição."}</p>
                    </div>
                  </div>
                  <p className="mt-1.5 text-[11px] text-slate-600 dark:text-slate-300"><span className="font-semibold">Cliente libera por:</span> {(t.allowed_methods ?? []).map(methodLabel).join(", ") || "—"}</p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300"><span className="font-semibold">Cliente informa:</span> {fields.length ? fields.map((f) => f.label).join(", ") : "identificação da conta"}</p>
                  <Button type="button" size="sm" className="mt-2 h-8" disabled={used} onClick={() => addType(t)}><Plus className="mr-1 h-3.5 w-3.5" />{used ? "Já nesta etapa" : "Adicionar ao rascunho"}</Button>
                </li>
              );
            })}
            {vocab && allTypes.length === 0 && <li className="col-span-full text-xs text-slate-500">Nenhum tipo de acesso cadastrado. Cadastre no catálogo de acessos do produto.</li>}
            {vocab && allTypes.length > 0 && catalogTypes.length === 0 && <li className="col-span-full rounded-lg border border-dashed border-slate-300 px-3 py-4 text-center text-xs text-slate-500" data-testid="access-type-empty">Nenhum acesso encontrado para “{typeQuery}”. Tente outra palavra ou <button type="button" className="font-semibold text-violet-700 underline" onClick={() => setTypeQuery("")}>limpe a pesquisa</button>.</li>}
          </ul>
        </DialogContent>
      </Dialog>
    </section>
  );
}
