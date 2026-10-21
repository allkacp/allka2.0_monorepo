"use client";

// Modal "Novo entregável" / "Editar entregável" (19/10): largo, cabeçalho e rodapé fixos, 8 blocos recolhíveis, nomes completos nos campos,
// ajuda simples, aviso de alterações não salvas, "Salvar rascunho" para entregável incompleto e erro de validação que NUNCA apaga o preenchimento.
import { useMemo, useRef, useState } from "react";
import { ArrowUpRight, ChevronDown, ChevronRight, Download, Paperclip, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { apiClient } from "@/lib/api-client";
import { VisibilitySelect, visibilitySummary } from "./catalog2-ops-ui";
import {
  DELIVERABLE_CYCLE_SCOPES, DELIVERABLE_MOMENTS, DELIVERABLE_RESPONSIBLES, DELIVERABLE_TYPES, FILE_PREFIX, deliverableIssues, type DeliverableIssue, type Fields,
} from "./catalog2-deliverable-fields";
import { RevealBox, flashElement, focusFirst } from "./reveal";

type SectionId = DeliverableIssue["section"];
const SECTIONS: { id: SectionId; title: string; hint: string }[] = [
  { id: 1, title: "Identificação", hint: "Nome e descrição do que será entregue." },
  { id: 2, title: "Entrega e formato", hint: "Que tipo de item é e em que formato deve vir." },
  { id: 3, title: "Responsável e etapa", hint: "Quem envia e em qual etapa este entregável é produzido." },
  { id: 4, title: "Momento e recorrência", hint: "Quando entregar e se vale em todo ciclo." },
  { id: 5, title: "Evidência e aprovação", hint: "Prova da entrega, conferência interna e aprovação do cliente." },
  { id: 6, title: "Condições", hint: "Só quando o entregável não vale sempre." },
  { id: 7, title: "Arquivo-modelo", hint: "Um modelo para o executor usar (opcional)." },
  { id: 8, title: "Visibilidade e avançado", hint: "Quem pode ver este item e o identificador permanente." },
];
const CTL = "h-10 w-full min-w-0 rounded-md border border-slate-300 bg-white px-2.5 text-sm text-slate-800 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100";
const LBL = "flex flex-col gap-1 text-xs font-semibold text-slate-700 dark:text-slate-300";
const HELP = "text-[11px] font-normal text-slate-500 dark:text-slate-400";

export interface DeliverableModalContext { taskName: string; stepName?: string; stepIndex?: number }

export function DeliverableEditorModal({ initial, isNew, steps, lockedStepName, context, keyLabel, onSave, onGoToStep, onClose }: {
  initial: Fields; isNew: boolean;
  /** Etapas da tarefa (nome completo) para "Etapa responsável". */
  steps: { id: string; name: string; index: number }[];
  /** Quando o entregável nasce dentro de uma etapa: a etapa já vem preenchida (continua alterável). */
  lockedStepName?: string;
  context: DeliverableModalContext;
  /** ID permanente (só para entregável já salvo). */
  keyLabel?: string;
  onSave: (v: Fields, opts: { draft: boolean }) => Promise<void>;
  onGoToStep?: () => void;
  onClose: () => void;
}) {
  const [v, setV] = useState<Fields>(initial);
  const [baseline, setBaseline] = useState(JSON.stringify(initial));
  const [open, setOpen] = useState<Set<SectionId>>(new Set([1, 3, 5]));
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState<null | "draft" | "final">(null);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [fileErr, setFileErr] = useState<string | null>(null);
  const [closeAsk, setCloseAsk] = useState(false);
  const root = useRef<HTMLDivElement | null>(null);
  const set = (p: Partial<Fields>) => setV((c) => ({ ...c, ...p }));
  const issues = useMemo(() => deliverableIssues(v), [v]);
  const dirty = JSON.stringify(v) !== baseline;
  const reveal = (s: SectionId) => setOpen((c) => (c.has(s) ? c : new Set([...c, s])));
  const err = (field: string) => (showErrors ? issues.find((i) => i.field === field)?.message ?? null : null);
  const hasFile = v.template_url.startsWith(FILE_PREFIX);

  const goTo = (it: DeliverableIssue | undefined) => {
    if (!it) return;
    reveal(it.section);
    window.setTimeout(() => { const el = root.current?.querySelector<HTMLElement>(`[data-field="${it.field}"]`); flashElement(el); focusFirst(el); }, 60);
  };
  const submit = async (draft: boolean) => {
    setSaveErr(null);
    if (!draft && issues.length) {
      setShowErrors(true);
      setOpen((c) => new Set([...c, ...issues.map((i) => i.section)]));
      goTo(issues[0]);
      return;
    }
    setSaving(draft ? "draft" : "final");
    try { await onSave(v, { draft }); setBaseline(JSON.stringify(v)); } catch (e: any) { setSaveErr(e?.message ?? "Não foi possível salvar. Nada do que você preencheu foi apagado."); setSaving(null); return; }
    setSaving(null);
  };
  const requestClose = () => { if (saving) return; if (dirty) setCloseAsk(true); else onClose(); };
  const upload = async (file: File) => {
    setFileErr(null);
    try { const r = await apiClient.uploadCatalog2DeliverableFile(file); set({ template_url: `${FILE_PREFIX}${r.file.id}`, template_name: r.file.name }); }
    catch (e: any) { setFileErr(e?.message ?? "Não foi possível enviar o arquivo."); }
  };
  const issuesIn = (s: SectionId) => issues.filter((i) => i.section === s).length;
  const summary = (s: SectionId): string => {
    switch (s) {
      case 1: return v.name.trim() || "(sem nome)";
      case 2: return `${DELIVERABLE_TYPES.find(([k]) => k === v.type)?.[1] ?? v.type}${v.format ? ` · ${v.format}` : ""}`;
      case 3: return `${DELIVERABLE_RESPONSIBLES.find(([k]) => k === v.responsible)?.[1] ?? v.responsible} · ${v.step_id ? steps.find((s2) => s2.id === v.step_id)?.name ?? "etapa" : "sem etapa (pendente)"}`;
      case 4: return `${DELIVERABLE_MOMENTS.find(([k]) => k === v.delivery_moment)?.[1] ?? ""} · ${DELIVERABLE_CYCLE_SCOPES.find(([k]) => k === v.cycle_scope)?.[1] ?? ""}`;
      case 5: return [v.is_required ? "obrigatório" : "opcional", v.evidence_required ? "exige evidência" : null, v.requires_qualification ? "qualificação interna" : null, v.requires_approval ? "aprovação do cliente" : "sem aprovação"].filter(Boolean).join(" · ");
      case 6: return v.is_conditional ? (v.condition_text.trim() ? `Condicional: ${v.condition_text.trim()}` : "Condicional — falta a condição") : "Vale sempre";
      case 7: return v.template_name || "nenhum arquivo";
      case 8: return visibilitySummary(v.visibility);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) requestClose(); }}>
      <DialogContent showCloseButton={false} className="flex max-h-[calc(100dvh-9rem)] w-[96vw] max-w-5xl flex-col gap-0 overflow-hidden bg-slate-50 p-0 dark:bg-slate-950 sm:max-w-5xl" data-testid="deliverable-modal">
        <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900" data-testid="deliverable-modal-header">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <DialogTitle className="text-base font-bold">{isNew ? "Novo entregável" : "Editar entregável"}</DialogTitle>
              <DialogDescription className="sr-only">Cadastre ou revise o entregável, seus responsáveis, vínculo com a etapa e regras de aprovação.</DialogDescription>
              <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300" data-testid="deliverable-modal-context">
                Tarefa: <strong>{context.taskName}</strong>{context.stepName ? <> · Etapa {context.stepIndex ? `${context.stepIndex} — ` : ""}<strong>{context.stepName}</strong></> : <> · <span className="font-semibold text-amber-700">sem etapa responsável</span></>}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {dirty && <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800" data-testid="deliverable-dirty">Alterações não salvas</span>}
              {issues.length > 0 && <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200" data-testid="deliverable-missing">{issues.length === 1 ? "falta 1 item para concluir" : `faltam ${issues.length} itens para concluir`}</span>}
              {onGoToStep && v.step_id && <button type="button" onClick={onGoToStep} className="inline-flex h-8 items-center gap-1 rounded-md border border-violet-300 bg-white px-2.5 text-xs font-semibold text-violet-700 hover:bg-violet-50 dark:bg-slate-900" data-testid="deliverable-go-step"><ArrowUpRight className="h-3.5 w-3.5" />Ir para a etapa</button>}
            </div>
          </div>
        </div>

        <div ref={root} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          {showErrors && issues.length > 0 && (
            <div role="alert" className="rounded-lg border border-rose-300 bg-rose-50 p-3 text-xs text-rose-900 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-100" data-testid="deliverable-error-summary">
              <p className="font-bold">O entregável ainda não pode ser concluído. Nada do que você preencheu foi apagado.</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5">{issues.map((it) => <li key={it.field}><button type="button" className="text-left underline decoration-dotted" onClick={() => goTo(it)}>{it.message}</button></li>)}</ul>
              <p className="mt-1">Corrija ou use “Salvar rascunho” para guardar assim mesmo.</p>
            </div>
          )}
          {saveErr && <p role="alert" className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800" data-testid="deliverable-save-error">{saveErr}</p>}
          <div className="flex justify-end gap-1.5">
            <button type="button" className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200" onClick={() => setOpen(new Set(SECTIONS.map((s) => s.id)))}>Expandir todos</button>
            <button type="button" className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200" onClick={() => setOpen(new Set())}>Recolher todos</button>
          </div>

          {SECTIONS.map((sec) => {
            const isOpen = open.has(sec.id);
            const n = issuesIn(sec.id);
            return (
              <section key={sec.id} className={`rounded-xl border bg-white shadow-sm dark:bg-slate-900 ${showErrors && n ? "border-rose-400 ring-1 ring-rose-300" : "border-slate-200 dark:border-slate-700"}`} data-testid={`deliverable-section-${sec.id}`} data-open={isOpen ? "true" : "false"}>
                <h5 className="m-0">
                  <button type="button" id={`dsec-${sec.id}-h`} aria-expanded={isOpen} aria-controls={`dsec-${sec.id}-p`} onClick={() => setOpen((c) => { const x = new Set(c); if (x.has(sec.id)) x.delete(sec.id); else x.add(sec.id); return x; })}
                    className="flex w-full min-w-0 items-center gap-2 rounded-xl px-4 py-2.5 text-left hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 dark:hover:bg-slate-800/50">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-600 text-xs font-bold text-white">{sec.id}</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{sec.title}</span>
                        {n > 0 ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800">{n === 1 ? "1 pendência" : `${n} pendências`}</span> : <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-800">ok</span>}
                      </span>
                      {!isOpen && <span className="mt-0.5 block text-xs font-normal text-slate-500 dark:text-slate-400">{summary(sec.id)}</span>}
                    </span>
                    {isOpen ? <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" /> : <ChevronRight className="h-4 w-4 shrink-0 text-slate-500" />}
                  </button>
                </h5>
                <div id={`dsec-${sec.id}-p`} role="region" aria-labelledby={`dsec-${sec.id}-h`} hidden={!isOpen} className="space-y-3 border-t border-slate-100 p-4 dark:border-slate-800">
                  <p className={HELP}>{sec.hint}</p>
                  {sec.id === 1 && (
                    <>
                      <label className={LBL} data-field="name" data-invalid={err("name") ? "true" : undefined}>Nome do entregável
                        <Input className="h-10 text-sm font-normal" value={v.name} maxLength={191} aria-label="Nome do entregável" title={v.name} onChange={(e) => set({ name: e.target.value })} />
                        {err("name") && <span role="alert" className="text-[11px] font-semibold text-rose-600">{err("name")}</span>}
                      </label>
                      <label className={LBL} data-field="description" data-invalid={err("description") ? "true" : undefined}>Descrição
                        <textarea rows={3} maxLength={4000} aria-label="Descrição do entregável" placeholder="O que é e como deve vir" className="w-full rounded-md border border-slate-300 bg-white p-2 text-sm font-normal dark:border-slate-600 dark:bg-slate-900" value={v.description} onChange={(e) => set({ description: e.target.value })} />
                        {err("description") && <span role="alert" className="text-[11px] font-semibold text-rose-600">{err("description")}</span>}
                      </label>
                    </>
                  )}
                  {sec.id === 2 && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className={LBL}>Tipo<select className={CTL} value={v.type} aria-label="Tipo" title={DELIVERABLE_TYPES.find(([k]) => k === v.type)?.[1]} onChange={(e) => set({ type: e.target.value })}>{DELIVERABLE_TYPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
                      <label className={LBL}>Formato<Input className="h-10 text-sm font-normal" value={v.format} maxLength={80} aria-label="Formato" placeholder="Ex.: PDF, planilha, link do painel" onChange={(e) => set({ format: e.target.value })} /></label>
                    </div>
                  )}
                  {sec.id === 3 && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className={LBL}>Quem envia<select className={CTL} value={v.responsible} aria-label="Quem envia" onChange={(e) => set({ responsible: e.target.value })}>{DELIVERABLE_RESPONSIBLES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
                      <label className={LBL} data-field="step">Etapa responsável
                        <select className={CTL} value={v.step_id} aria-label="Etapa" title={steps.find((s) => s.id === v.step_id)?.name ?? "Tarefa toda"} onChange={(e) => set({ step_id: e.target.value })}>
                          <option value="">Sem etapa responsável (pendente)</option>
                          {steps.map((s) => <option key={s.id} value={s.id}>{`Etapa ${s.index} — ${s.name}`}</option>)}
                        </select>
                        <span className={HELP}>{lockedStepName ? `Preenchida automaticamente com a etapa “${lockedStepName}”. Você pode trocar.` : "A etapa só conclui quando este item for entregue."}</span>
                      </label>
                    </div>
                  )}
                  {sec.id === 4 && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className={LBL}>Momento da entrega<select className={CTL} value={v.delivery_moment} aria-label="Momento da entrega" onChange={(e) => set({ delivery_moment: e.target.value })}>{DELIVERABLE_MOMENTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
                      <label className={LBL}>Recorrência<select className={CTL} value={v.cycle_scope} aria-label="Recorrência do entregável" onChange={(e) => set({ cycle_scope: e.target.value })}>{DELIVERABLE_CYCLE_SCOPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select><span className={HELP}>“Só na primeira execução”: não nasce nos ciclos seguintes.</span></label>
                    </div>
                  )}
                  {sec.id === 5 && (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {([
                        ["is_required", "Obrigatório", "Sem este item, a etapa (ou a tarefa) não conclui.", "Obrigatório"],
                        ["evidence_required", "Exige evidência", "Quem envia precisa anexar a PROVA (print, arquivo ou link).", "Exige evidência"],
                        ["requires_qualification", "Qualificação interna", "Um líder/qualificador confere o item antes de seguir.", "Passa por qualificação interna"],
                        ["requires_approval", "Aprovação do cliente", "O cliente precisa aprovar este item.", "Exige aprovação"],
                      ] as const).map(([key, title, help, aria]) => (
                        <label key={key} className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs dark:border-slate-700 dark:bg-slate-800/40">
                          <input type="checkbox" className="mt-0.5 h-4 w-4" aria-label={aria} checked={(v as any)[key]} onChange={(e) => set({ [key]: e.target.checked } as Partial<Fields>)} />
                          <span><strong className="block text-slate-800 dark:text-slate-100">{title}</strong><span className={HELP}>{help}</span></span>
                        </label>
                      ))}
                    </div>
                  )}
                  {sec.id === 6 && (
                    <>
                      <label className="inline-flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4" aria-label="Entregável condicional" checked={v.is_conditional} onChange={(e) => set({ is_conditional: e.target.checked })} /> Este entregável é condicional</label>
                      <RevealBox active={v.is_conditional} missing={v.is_conditional && !v.condition_text.trim() ? 1 : 0} title="Condição (texto de orientação para quem executa)" onReveal={() => reveal(6)} testId="deliverable-condition-box">
                        <label className={LBL} data-field="condition" data-invalid={err("condition") ? "true" : undefined}>
                          <Input className="h-10 text-sm font-normal" value={v.condition_text} maxLength={500} aria-label="Condição do entregável" placeholder="Ex.: só quando o cliente escolher a plataforma Meta" onChange={(e) => set({ condition_text: e.target.value })} />
                          {err("condition") && <span role="alert" className="text-[11px] font-semibold text-rose-600">{err("condition")}</span>}
                          <span className={HELP}>É uma orientação para quem executa: o sistema não filtra sozinho por este texto.</span>
                        </label>
                      </RevealBox>
                    </>
                  )}
                  {sec.id === 7 && (
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        {v.template_name ? <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-1 text-xs text-slate-700"><Paperclip className="h-3 w-3" />{v.template_name}</span> : <span className="text-xs text-slate-400">nenhum</span>}
                        <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"><Upload className="h-3 w-3" />Anexar<input type="file" className="sr-only" aria-label="Anexar arquivo-modelo do entregável" onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); e.currentTarget.value = ""; }} /></label>
                        {hasFile && <button type="button" className="inline-flex items-center gap-1 text-xs font-semibold text-violet-700 underline" onClick={() => void apiClient.downloadCatalog2DeliverableFile({ id: v.template_url.slice(FILE_PREFIX.length), name: v.template_name })}><Download className="h-3 w-3" />Baixar</button>}
                        {v.template_name && <button type="button" className="text-xs text-red-600 underline" onClick={() => set({ template_url: "", template_name: "" })}>Remover</button>}
                      </div>
                      {fileErr && <p role="alert" className="text-xs text-red-600">{fileErr}</p>}
                    </div>
                  )}
                  {sec.id === 8 && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className={LBL}>Quem pode ver este campo
                        <VisibilitySelect large value={v.visibility} onChange={(x) => set({ visibility: x })} />
                      </label>
                      <div className={LBL}>Identificador permanente<span className="rounded bg-slate-100 px-2 py-2 text-xs font-normal text-slate-600" data-testid="deliverable-modal-id">{keyLabel ? `ID ${keyLabel}` : "gerado ao salvar"}</span></div>
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900" data-testid="deliverable-modal-footer">
          <Button type="button" variant="ghost" disabled={saving !== null} onClick={requestClose}>Cancelar</Button>
          <Button type="button" variant="outline" disabled={saving !== null} onClick={() => void submit(true)} data-testid="deliverable-save-draft" title="Guarda o que já foi preenchido, mesmo incompleto. O entregável fica marcado como rascunho e bloqueia a publicação até ser concluído.">{saving === "draft" ? "Salvando…" : "Salvar rascunho"}</Button>
          <Button type="button" disabled={saving !== null} onClick={() => void submit(false)} data-testid="deliverable-save">{saving === "final" ? "Salvando…" : "Salvar"}</Button>
        </div>

        <Dialog open={closeAsk} onOpenChange={(o) => { if (!o) setCloseAsk(false); }}>
          <DialogContent className="max-w-md" data-testid="deliverable-close-ask">
            <DialogTitle>Há alterações não salvas</DialogTitle>
            <DialogDescription className="sr-only">Escolha se deseja continuar editando, guardar o rascunho ou descartar as alterações deste entregável.</DialogDescription>
            <p className="text-sm text-slate-600 dark:text-slate-300">O que você preencheu neste entregável ainda não foi salvo. O que prefere fazer?</p>
            <div className="flex flex-col gap-2 pt-1">
              <Button type="button" onClick={() => setCloseAsk(false)} data-testid="deliverable-close-continue">Continuar editando</Button>
              <Button type="button" variant="outline" disabled={saving !== null} onClick={() => { setCloseAsk(false); void submit(true); }} data-testid="deliverable-close-draft">Salvar como rascunho</Button>
              <Button type="button" variant="ghost" className="text-rose-600 hover:text-rose-700" onClick={() => { setCloseAsk(false); onClose(); }} data-testid="deliverable-close-discard">Descartar alterações</Button>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
