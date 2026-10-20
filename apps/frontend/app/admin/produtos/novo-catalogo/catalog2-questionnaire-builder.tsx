"use client";

// Questionário de contratação — estilo da plataforma antiga (17/10): na PÁGINA só aparece o questionário pronto (lista de perguntas
// recolhíveis, só leitura). "+ Adicionar" e o lápis de cada pergunta abrem um MODAL ("Editar Pergunta") com todas as configurações:
// 22 tipos, opções, anexos, validação, condição, seção, ativa/inativa… Também há modal para os dados do questionário (nome, seções, modelo global).
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, Copy, Eye, GripVertical, Library, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { apiClient } from "@/lib/api-client";
import { BriefingQuestionField, emptyBriefingValue, isVisible, pendingMessage, type BriefingValue } from "@/components/briefing-question-field";
import { QuestionConfigFields, cloneDraft, draftFromServer, emptyQuestion, payloadFromDraft, questionTypeLabel, type QuestionCtx, type QuestionDraft } from "./catalog2-questions-ui";

export interface SectionDraft { key: string; name: string; description: string }
export interface QuestionnaireState { name: string; description: string; sections: SectionDraft[]; questions: QuestionDraft[]; is_global_model: boolean }
type Ctx = Omit<QuestionCtx, "otherQuestions" | "sections">;

export const slugKey = (label: string, taken: Iterable<string>) => {
  const base = `p-${label.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30) || "pergunta"}`;
  const t = new Set(taken); let key = base; let n = 2;
  while (t.has(key)) key = `${base}-${n++}`;
  return key;
};

/** Pergunta (rascunho do construtor) → formato do briefing congelado, para a prévia usar o MESMO campo que o cliente usa. */
export function draftToSnapshotQuestion(d: QuestionDraft) {
  const p: any = payloadFromDraft(d);
  return {
    question_key: d.key, question_text: d.label, question_type: d.question_type, required: d.is_required, description: d.help_text || null,
    options: (p.options ?? []).map((o: any) => (typeof o === "string" ? { value: o, label: o } : o)), settings: p.settings ?? {}, validation: p.validation ?? {},
    condition: p.condition ?? null, placeholder: d.placeholder || null, default_value: d.default_value || null,
  };
}

/** Prévia: como o cliente verá o questionário (mesmo campo, condições ao vivo, pendências). Nada é salvo. */
export function QuestionnairePreview({ state }: { state: QuestionnaireState }) {
  const [values, setValues] = useState<Record<string, BriefingValue>>({});
  const [checked, setChecked] = useState(false);
  const qs = state.questions.map(draftToSnapshotQuestion);
  const visible = qs.filter((q) => isVisible(q, values));
  const pending = visible.map((q) => ({ q, msg: pendingMessage(q, values[q.question_key]) })).filter((x) => x.msg);
  let lastSection = "";
  return (
    <div className="space-y-3 rounded-xl border border-violet-200 bg-white p-3 dark:border-violet-900 dark:bg-slate-900/60" data-testid="questionnaire-preview">
      <p className="text-xs font-bold uppercase tracking-wide text-violet-700">Prévia — como o cliente vê (nada é salvo)</p>
      <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">{state.name || "Questionário sem nome"}</h4>
      {state.description && <p className="text-sm text-slate-600">{state.description}</p>}
      {visible.length === 0 && <p className="text-sm text-slate-500">Nenhuma pergunta ativa para mostrar.</p>}
      {visible.map((q, i) => {
        const sec = state.questions.find((d) => d.key === q.question_key)?.section_key ?? "";
        const secDef = state.sections.find((s) => s.key === sec);
        const header = sec && sec !== lastSection && secDef ? (<div key={`s-${sec}`} className="border-b border-slate-200 pb-1 pt-2" data-testid="preview-section"><p className="text-sm font-bold text-slate-800">{secDef.name}</p>{secDef.description && <p className="text-xs text-slate-500">{secDef.description}</p>}</div>) : null;
        lastSection = sec || lastSection;
        const msg = checked ? pendingMessage(q, values[q.question_key]) : null;
        return (
          <div key={q.question_key}>
            {header}
            <div className="space-y-1.5 rounded-lg border border-slate-200 p-3" data-testid="preview-question">
              <p className="text-sm font-semibold text-slate-800">{i + 1}. {q.question_text}{q.required && <span className="ml-1 text-red-500" aria-label="obrigatória">*</span>}</p>
              {q.description && <p className="text-xs text-slate-500">{q.description}</p>}
              <BriefingQuestionField q={q} value={values[q.question_key] ?? emptyBriefingValue()} onChange={(v) => setValues((cur) => ({ ...cur, [q.question_key]: v }))} error={msg} />
            </div>
          </div>
        );
      })}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => setChecked(true)}>Conferir pendências</Button>
        {checked && (pending.length === 0
          ? <span className="text-xs font-semibold text-emerald-700" data-testid="preview-ok">Tudo respondido: nada bloqueia o envio.</span>
          : <span className="text-xs font-semibold text-amber-800" data-testid="preview-pending">{pending.length} pendência(s): {pending.map((x) => x.q.question_text).slice(0, 3).join("; ")}{pending.length > 3 ? "…" : ""}</span>)}
      </div>
    </div>
  );
}

/** Reaproveitar pergunta já cadastrada (busca por nome ou ID): cria uma cópia com ID novo. */
function QuestionLibrary({ onPick, onClose }: { onPick: (q: any) => void; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<any[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const search = async () => { setErr(null); try { setRows((await apiClient.searchCatalog2QuestionLibrary(q)).data ?? []); } catch (e: any) { setErr(e?.message ?? "Não foi possível buscar."); } };
  return (
    <div className="space-y-1.5 rounded-lg border border-dashed border-violet-300 bg-violet-50/40 p-2" data-testid="question-library">
      <div className="flex items-center gap-1.5">
        <Input className="h-8 flex-1 text-xs" aria-label="Buscar pergunta existente" placeholder="Buscar pergunta por nome ou ID…" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void search(); } }} />
        <Button type="button" size="sm" className="h-8" onClick={() => void search()}>Buscar</Button>
        <button type="button" className="text-[11px] text-slate-500 underline" onClick={onClose}>Fechar</button>
      </div>
      {err && <p role="alert" className="text-[11px] text-red-600">{err}</p>}
      {rows && rows.length === 0 && <p className="text-[11px] text-slate-500">Nenhuma pergunta encontrada.</p>}
      <ul className="max-h-44 space-y-1 overflow-y-auto">
        {(rows ?? []).map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-2 rounded bg-white px-2 py-1 text-[11px] dark:bg-slate-900">
            <span className="min-w-0"><strong className="block truncate">{r.label}</strong><span className="block truncate text-slate-500">{questionTypeLabel(r.question_type)} · {r.from} · ID {String(r.id).slice(0, 8)}</span></span>
            <Button type="button" size="sm" variant="outline" className="h-6 shrink-0 gap-1 px-2 text-[11px]" onClick={() => onPick(r)}><Copy className="h-3 w-3" />Reutilizar</Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

const Chip = ({ children, tone = "slate" }: { children: React.ReactNode; tone?: "green" | "red" | "slate" | "amber" | "sky" | "violet" }) => {
  const c = { green: "bg-emerald-500 text-white", red: "bg-rose-500 text-white", slate: "bg-slate-100 text-slate-600", amber: "bg-amber-100 text-amber-800", sky: "bg-sky-100 text-sky-800", violet: "bg-violet-100 text-violet-800" }[tone];
  return <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${c}`}>{children}</span>;
};
const yesNo = (v: boolean) => <Chip tone={v ? "red" : "slate"}>{v ? "SIM" : "NÃO"}</Chip>;

/** Modal "Editar Pergunta" / "Nova Pergunta": toda a configuração fica aqui, fora da página. */
export function QuestionModal({ initial, ctx, isNew, onSave, onClose }: { initial: QuestionDraft; ctx: QuestionCtx; isNew: boolean; onSave: (q: QuestionDraft) => void; onClose: () => void }) {
  const [q, setQ] = useState<QuestionDraft>(initial);
  const patch = (p: Partial<QuestionDraft>) => setQ((cur) => ({ ...cur, ...p }));
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent overlayClassName="!z-[1250]" className="!z-[1251] max-h-[calc(100dvh-9rem)] w-[96vw] max-w-3xl overflow-y-auto sm:max-w-3xl" data-testid="question-modal">
        <DialogTitle>{isNew ? "Nova Pergunta" : "Editar Pergunta"}</DialogTitle>
        <div className="space-y-3">
          <label className="flex flex-col gap-1 text-sm font-semibold text-slate-800">Pergunta <span className="sr-only">(obrigatório)</span>
            <Input aria-label="Texto da pergunta" className="text-sm" value={q.label} maxLength={500} onChange={(e) => patch({ label: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold text-slate-800">Instrução de resposta
            <textarea aria-label="Instrução de resposta" rows={2} maxLength={1000} className="w-full rounded-md border border-slate-300 bg-white p-2 text-sm font-normal dark:border-slate-600 dark:bg-slate-900" value={q.help_text} onChange={(e) => patch({ help_text: e.target.value })} />
          </label>
          <QuestionConfigFields q={q} ctx={{ ...ctx, otherQuestions: ctx.otherQuestions }} hideHelp onChange={patch} />
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-2">
            <span className="rounded bg-slate-100 px-1.5 py-1 text-[10px] text-slate-600" title="Identificador permanente da pergunta" data-testid="question-id">{q.id ? `ID ${String(q.id).slice(0, 8)}` : "ID gerado ao salvar"}</span>
            <span className="flex gap-2">
              <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
              <Button type="button" disabled={!q.label.trim()} onClick={() => onSave({ ...q, label: q.label.trim() })}>Salvar</Button>
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Lista de perguntas no estilo da plataforma antiga: linhas recolhíveis só de leitura; "+ Adicionar"; lápis abre o modal; lixeira exclui. */
export function QuestionList({ questions, sections, ctx, readOnly, busy, onChange, onSuggest, steps }: {
  questions: QuestionDraft[]; sections: SectionDraft[]; ctx: Ctx; readOnly?: boolean; busy?: boolean; onChange: (next: QuestionDraft[]) => void;
  onSuggest?: (existingLabels: string[]) => Promise<QuestionDraft[]>; steps?: { key: string; name: string }[];
}) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [modal, setModal] = useState<{ q: QuestionDraft; isNew: boolean } | null>(null);
  const [toDelete, setToDelete] = useState<QuestionDraft | null>(null);
  const [showLib, setShowLib] = useState(false);
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiMsg, setAiMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const fullCtx: QuestionCtx = useMemo(() => ({ ...ctx, sections: sections.map((s) => ({ key: s.key, name: s.name || s.key })), otherQuestions: questions.map((x) => ({ key: x.key, label: x.label, question_type: x.question_type })) }), [ctx, sections, questions]);
  const toggle = (key: string) => setOpen((s) => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n; });
  const move = (i: number, d: number) => { const j = i + d; if (j < 0 || j >= questions.length) return; const c = questions.slice(); [c[i], c[j]] = [c[j], c[i]]; onChange(c); };
  const dropOn = (targetKey: string) => {
    if (!dragKey || dragKey === targetKey) return;
    const from = questions.findIndex((x) => x.key === dragKey); const to = questions.findIndex((x) => x.key === targetKey);
    if (from < 0 || to < 0) return;
    const c = questions.slice(); const [m] = c.splice(from, 1); c.splice(to, 0, m); onChange(c);
  };
  const dup = (i: number) => { const copy = cloneDraft(questions[i], questions.map((x) => x.key)); const c = questions.slice(); c.splice(i + 1, 0, copy); onChange(c); };
  const blank = (): QuestionDraft => ({ key: slugKey("pergunta", questions.map((x) => x.key)), label: "", is_required: true, ...emptyQuestion() });
  const saveModal = (q: QuestionDraft) => {
    if (!modal) return;
    if (modal.isNew) onChange([...questions, { ...q, key: slugKey(q.label, questions.map((x) => x.key)) }]);
    else onChange(questions.map((x) => (x.key === q.key ? q : x)));
    setModal(null);
  };
  const reuse = (r: any) => {
    const d = draftFromServer(r);
    const copy = cloneDraft({ ...d, section_key: "", target_step_key: "", cond_source: "", cond_ref: "" }, questions.map((x) => x.key));
    setShowLib(false); setModal({ q: { ...copy, key: slugKey(r.label, questions.map((x) => x.key)), label: r.label }, isNew: true });
  };
  const suggestMore = async () => {
    if (!onSuggest) return;
    setAiBusy(true); setAiMsg(null);
    try {
      const novas = await onSuggest(questions.map((x) => x.label));
      const taken = new Set(questions.map((x) => x.key));
      const fixed = novas.map((d) => { let k = d.key; while (taken.has(k)) k += "x"; taken.add(k); return { ...d, key: k }; });
      onChange([...questions, ...fixed]);
      setAiMsg({ ok: true, text: `${fixed.length} pergunta(s) sugerida(s) adicionada(s) ao final. Revise antes de salvar.` });
    } catch (e: any) { setAiMsg({ ok: false, text: e?.message ?? "Não foi possível usar a IA agora." }); } finally { setAiBusy(false); }
  };
  const sectionName = (key: string) => sections.find((s) => s.key === key)?.name;
  const stepName = (key: string) => (steps ?? ctx.steps).find((s) => s.key === key)?.name ?? key;
  const ord = (i: number) => `${i + 1}ª`;

  return (
    <div className="w-full min-w-0 space-y-2" data-testid="question-list-wrap">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">Perguntas <span className="text-xs font-normal text-slate-500">({questions.length})</span></h4>
        {!readOnly && (
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" variant="outline" className="h-9" onClick={() => setShowLib((v) => !v)}><Library className="h-3.5 w-3.5" />Reutilizar pergunta existente</Button>
            {onSuggest && <button type="button" data-testid="ai-questionnaire-more" disabled={aiBusy} onClick={() => void suggestMore()} title="A IA lê tudo o que está cadastrado no produto e sugere perguntas que ainda não existem. Você revisa antes de salvar." className="inline-flex h-9 items-center gap-1 rounded-md bg-[image:var(--app-brand-button,linear-gradient(to_right,#2563eb,#7c3aed))] px-3 text-xs font-semibold text-white disabled:opacity-60">{aiBusy ? "Pensando…" : "Sugerir mais perguntas com IA"}</button>}
            <Button type="button" className="h-9 bg-blue-600 text-white hover:bg-blue-700" disabled={busy} onClick={() => setModal({ q: blank(), isNew: true })}><Plus className="h-4 w-4" />Adicionar</Button>
          </div>
        )}
      </div>
      {aiMsg && <p role={aiMsg.ok ? "status" : "alert"} className={`text-[11px] font-semibold ${aiMsg.ok ? "text-emerald-700" : "text-red-600"}`}>{aiMsg.text}</p>}
      {showLib && <QuestionLibrary onPick={reuse} onClose={() => setShowLib(false)} />}
      <ul className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60" data-testid="question-list">
        {questions.map((q, i) => {
          const isOpen = open.has(q.key);
          const att = q.att_allowed || ["arquivo", "imagem", "video", "audio", "documento"].includes(q.question_type);
          return (
            <li key={q.key} className="border-b border-slate-200 last:border-b-0 dark:border-slate-800" data-testid="question-item" data-inactive={q.is_active ? undefined : "true"}
              draggable={!readOnly} onDragStart={() => setDragKey(q.key)} onDragOver={(e) => { if (dragKey) e.preventDefault(); }} onDrop={() => { dropOn(q.key); setDragKey(null); }} onDragEnd={() => setDragKey(null)}>
              <div className={`flex items-center gap-2 px-2 py-2 ${isOpen ? "bg-sky-50 dark:bg-sky-950/20" : ""}`} data-testid="question-summary">
                <span className="cursor-grab text-sky-700" title="Arraste para reordenar" aria-hidden="true"><GripVertical className="h-5 w-5" /></span>
                <button type="button" className="inline-flex min-w-0 flex-1 items-center gap-2 text-left" aria-expanded={isOpen} aria-label={`${isOpen ? "Recolher" : "Expandir"} pergunta ${i + 1}`} onClick={() => toggle(q.key)}>
                  <span className={`min-w-0 truncate text-[15px] font-bold ${q.is_active ? "text-slate-900 dark:text-slate-100" : "text-slate-400 line-through"}`}>{ord(i)} {q.label || "(sem texto)"}</span>
                  <span className="hidden flex-wrap items-center gap-1 sm:flex">
                    {!q.is_active && <Chip>inativa</Chip>}
                    {q.cond_source && <Chip tone="amber">condicional</Chip>}
                  </span>
                  {isOpen ? <ChevronDown className="ml-auto h-4 w-4 shrink-0 text-sky-700" /> : <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-sky-700" />}
                </button>
              </div>
              {isOpen && (
                <div className="space-y-2 px-3 py-3 text-sm" data-testid="question-body">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                      <span className="inline-flex items-center gap-1.5 font-semibold text-slate-800">Tipo da resposta: <Chip tone="green">{questionTypeLabel(q.question_type)}</Chip></span>
                      <span className="inline-flex items-center gap-1.5 font-semibold text-slate-800">Habilitar anexo na pergunta? {yesNo(att)}</span>
                      <span className="inline-flex items-center gap-1.5 font-semibold text-slate-800">Pergunta obrigatória? {yesNo(q.is_required)}</span>
                    </div>
                    {!readOnly && (
                      <span className="flex items-center gap-1">
                        <button type="button" aria-label={`Subir pergunta ${i + 1}`} className="rounded p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30" disabled={i === 0 || busy} onClick={() => move(i, -1)}><ArrowUp className="h-3.5 w-3.5" /></button>
                        <button type="button" aria-label={`Descer pergunta ${i + 1}`} className="rounded p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30" disabled={i === questions.length - 1 || busy} onClick={() => move(i, 1)}><ArrowDown className="h-3.5 w-3.5" /></button>
                        <button type="button" aria-label={`Duplicar pergunta ${i + 1}`} className="rounded p-1.5 text-slate-500 hover:bg-slate-100" disabled={busy} onClick={() => dup(i)}><Copy className="h-3.5 w-3.5" /></button>
                        <button type="button" aria-label={`Editar pergunta ${i + 1}`} className="rounded-md bg-sky-100 p-2 text-sky-700 hover:bg-sky-200" disabled={busy} onClick={() => setModal({ q, isNew: false })}><Pencil className="h-4 w-4" /></button>
                        <button type="button" aria-label={`Excluir pergunta ${i + 1}`} className="rounded-md bg-rose-100 p-2 text-rose-600 hover:bg-rose-200" disabled={busy} onClick={() => setToDelete(q)}><Trash2 className="h-4 w-4" /></button>
                      </span>
                    )}
                  </div>
                  {q.help_text && <p className="text-slate-700"><span className="font-semibold">Instruções de resposta:</span> <span className="text-slate-500">{q.help_text}</span></p>}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {q.section_key && sectionName(q.section_key) && <Chip tone="violet">seção: {sectionName(q.section_key)}</Chip>}
                    {q.target_step_key && <Chip tone="sky">etapa: {stepName(q.target_step_key)}</Chip>}
                    {q.id && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600" title="Identificador permanente da pergunta">ID {String(q.id).slice(0, 8)}</span>}
                  </div>
                </div>
              )}
            </li>
          );
        })}
        {questions.length === 0 && <li className="px-3 py-3 text-xs text-neutral-400">Nenhuma pergunta ainda{readOnly ? "." : " — clique em “Adicionar”, reutilize uma existente ou gere com IA."}</li>}
      </ul>
      {modal && <QuestionModal key={modal.q.key + (modal.isNew ? "-new" : "")} initial={modal.q} ctx={fullCtx} isNew={modal.isNew} onSave={saveModal} onClose={() => setModal(null)} />}
      <ConfirmationDialog
        open={!!toDelete} onClose={() => setToDelete(null)} title="Excluir pergunta?" destructive confirmText="Excluir pergunta"
        message={<>A pergunta “{toDelete?.label}” sai deste questionário. Contratações já feitas não mudam (o briefing delas já está guardado).</>}
        onConfirm={() => { if (toDelete) onChange(questions.filter((x) => x.key !== toDelete.key)); setToDelete(null); }}
      />
    </div>
  );
}

/** Dados do questionário (nome, descrição, modelo global e seções) — modal. */
export function QuestionnaireDataModal({ initial, onSave, onClose, usedByCount = 0 }: { initial: Pick<QuestionnaireState, "name" | "description" | "sections" | "is_global_model">; onSave: (v: Pick<QuestionnaireState, "name" | "description" | "sections" | "is_global_model">) => void; onClose: () => void; usedByCount?: number }) {
  const [v, setV] = useState(initial);
  const moveSection = (i: number, d: number) => setV((c) => { const j = i + d; if (j < 0 || j >= c.sections.length) return c; const s = c.sections.slice(); [s[i], s[j]] = [s[j], s[i]]; return { ...c, sections: s }; });
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent overlayClassName="!z-[1250]" className="!z-[1251] max-h-[calc(100dvh-9rem)] w-[96vw] max-w-2xl overflow-y-auto sm:max-w-2xl" data-testid="questionnaire-data-modal">
        <DialogTitle>Dados do questionário</DialogTitle>
        <div className="space-y-3">
          <label className="flex flex-col gap-1 text-sm font-semibold text-slate-800">Nome do questionário<Input aria-label="Nome do questionário" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} /></label>
          <label className="flex flex-col gap-1 text-sm font-semibold text-slate-800">Descrição (opcional)<Input aria-label="Descrição do questionário" value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} /></label>
          <label className="inline-flex items-center gap-2 text-sm" title="Aparece na biblioteca para ser reutilizado em qualquer produto"><input type="checkbox" checked={v.is_global_model} onChange={(e) => setV({ ...v, is_global_model: e.target.checked })} aria-label="Salvar como modelo global" />Salvar como modelo global</label>
          {usedByCount > 1 && <p className="rounded bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">Usado por {usedByCount} tarefas: ao salvar, a tela pergunta se você quer editar o modelo ou criar uma cópia.</p>}
          <div className="space-y-1.5 rounded-md border border-slate-200 p-2" data-testid="sections-editor">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Seções</p>
            {v.sections.length === 0 && <p className="text-xs text-slate-500">Sem seções: as perguntas aparecem em sequência. Crie seções para agrupar por assunto.</p>}
            {v.sections.map((s, i) => (
              <div key={s.key} className="flex flex-wrap items-center gap-1.5" data-testid="section-row">
                <Input className="h-8 min-w-[9rem] flex-1 text-xs" aria-label={`Nome da seção ${i + 1}`} value={s.name} onChange={(e) => setV({ ...v, sections: v.sections.map((x) => (x.key === s.key ? { ...x, name: e.target.value } : x)) })} />
                <Input className="h-8 min-w-[9rem] flex-[2] text-xs" aria-label={`Descrição da seção ${i + 1}`} placeholder="Descrição (opcional)" value={s.description} onChange={(e) => setV({ ...v, sections: v.sections.map((x) => (x.key === s.key ? { ...x, description: e.target.value } : x)) })} />
                <button type="button" aria-label={`Subir seção ${i + 1}`} className="rounded p-1 text-slate-500 disabled:opacity-30" disabled={i === 0} onClick={() => moveSection(i, -1)}><ArrowUp className="h-3.5 w-3.5" /></button>
                <button type="button" aria-label={`Descer seção ${i + 1}`} className="rounded p-1 text-slate-500 disabled:opacity-30" disabled={i === v.sections.length - 1} onClick={() => moveSection(i, 1)}><ArrowDown className="h-3.5 w-3.5" /></button>
                <button type="button" aria-label={`Excluir seção ${i + 1}`} className="rounded p-1 text-rose-500" onClick={() => setV({ ...v, sections: v.sections.filter((x) => x.key !== s.key) })}><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            ))}
            <Button type="button" size="sm" variant="outline" className="h-8" onClick={() => setV({ ...v, sections: [...v.sections, { key: `s${v.sections.length + 1}-${Date.now().toString(36).slice(-3)}`, name: `Seção ${v.sections.length + 1}`, description: "" }] })}><Plus className="h-3 w-3" />Nova seção</Button>
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-200 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="button" disabled={!v.name.trim()} onClick={() => onSave({ ...v, name: v.name.trim() })}>Salvar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Criar questionário novo (dentro de um modal): dados + perguntas (cada pergunta tem seu modal) + prévia. */
export function QuestionnaireEditor({ initial, ctx, saving, saveLabel, onSave, onCancel, notice, usedByCount = 0, onSuggest }: {
  initial: QuestionnaireState; ctx: Ctx; saving?: boolean; saveLabel: string;
  onSave: (s: QuestionnaireState) => void; onCancel?: () => void; notice?: React.ReactNode; usedByCount?: number;
  onSuggest?: (existingLabels: string[]) => Promise<QuestionDraft[]>;
}) {
  const [data, setData] = useState({ name: initial.name, description: initial.description, sections: initial.sections, is_global_model: initial.is_global_model });
  const [questions, setQuestions] = useState<QuestionDraft[]>(initial.questions);
  const [showData, setShowData] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const state: QuestionnaireState = { ...data, questions };
  const canSave = !!data.name.trim() && questions.length > 0 && !saving && questions.every((x) => x.label.trim());
  return (
    <div className="w-full min-w-0 space-y-3" data-testid="questionnaire-editor">
      {notice}
      <div className="space-y-2 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">Dados do questionário</h4>
          <Button type="button" size="sm" variant="outline" className="h-8" onClick={() => setShowData(true)}><Pencil className="h-3.5 w-3.5" />Editar dados e seções</Button>
        </div>
        <label className="flex flex-col gap-1 text-sm font-semibold text-slate-800">Nome do questionário *<Input aria-label="Nome do questionário" value={data.name} onChange={(e) => setData({ ...data, name: e.target.value })} /></label>
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600">
          <span>Seções: <strong>{data.sections.length}</strong></span>
          {data.is_global_model && <Chip tone="violet">modelo global</Chip>}
          {usedByCount > 1 && <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-800">Usado por {usedByCount} tarefas</span>}
          <button type="button" className="inline-flex items-center gap-1 font-semibold text-violet-700 underline" aria-pressed={showPreview} onClick={() => setShowPreview((v) => !v)}><Eye className="h-3.5 w-3.5" />{showPreview ? "Fechar prévia" : "Visualizar como cliente"}</button>
        </div>
      </div>
      <QuestionList questions={questions} sections={data.sections} ctx={ctx} onChange={setQuestions} onSuggest={onSuggest} />
      {showPreview && <QuestionnairePreview state={state} />}
      <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 pt-2">
        <Button type="button" disabled={!canSave} onClick={() => onSave(state)}>{saving ? "Salvando…" : saveLabel}</Button>
        {onCancel && <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>}
        {!canSave && !saving && <span className="text-[11px] text-neutral-400">{!data.name.trim() ? "Dê um nome ao questionário." : questions.length === 0 ? "Adicione ao menos uma pergunta." : "Preencha o texto de todas as perguntas."}</span>}
      </div>
      {showData && <QuestionnaireDataModal initial={data} usedByCount={usedByCount} onClose={() => setShowData(false)} onSave={(v) => { setData(v); setShowData(false); }} />}
    </div>
  );
}

/** Estado do editor → corpo da API (conteúdo completo; IDs preservados nas perguntas que já existem). */
export function questionnaireBody(s: QuestionnaireState) {
  return {
    name: s.name.trim(), description: s.description.trim() || null,
    sections: s.sections.map((x) => ({ key: x.key, name: x.name.trim() || x.key, description: x.description.trim() || null })),
    questions: s.questions.map((q) => payloadFromDraft(q)),
  };
}
export const stateFromServer = (q: any): QuestionnaireState => ({
  name: q?.name ?? "", description: q?.description ?? "",
  sections: (q?.sections ?? []).map((x: any) => ({ key: x.key, name: x.name, description: x.description ?? "" })),
  questions: (q?.questions ?? []).map((x: any) => draftFromServer(x)),
  is_global_model: !!q?.is_global_model,
});
