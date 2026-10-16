"use client";

// Construtor universal de questionário (17/10): perguntas compactas e recolhíveis (uma linha resumida, expande para editar), seções,
// reordenar/duplicar/excluir/ativar, reutilizar pergunta existente (por nome ou ID), modelo global e "visualizar como o cliente vê".
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, Copy, Eye, Library, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiClient } from "@/lib/api-client";
import { BriefingQuestionField, emptyBriefingValue, isVisible, pendingMessage, type BriefingValue } from "@/components/briefing-question-field";
import { QuestionConfigFields, cloneDraft, draftFromServer, emptyQuestion, payloadFromDraft, questionTypeLabel, type QuestionCtx, type QuestionDraft } from "./catalog2-questions-ui";

export interface SectionDraft { key: string; name: string; description: string }
export interface QuestionnaireState { name: string; description: string; sections: SectionDraft[]; questions: QuestionDraft[]; is_global_model: boolean }

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

export function QuestionnaireEditor({ initial, ctx, saving, saveLabel, onSave, onCancel, notice, usedByCount = 0, onSuggest }: {
  initial: QuestionnaireState; ctx: Omit<QuestionCtx, "otherQuestions" | "sections">; saving?: boolean; saveLabel: string;
  onSave: (s: QuestionnaireState) => void; onCancel?: () => void; notice?: React.ReactNode; usedByCount?: number;
  /** IA: sugere MAIS perguntas (mesmos tipos/configurações) sem repetir as existentes. */
  onSuggest?: (existingLabels: string[]) => Promise<QuestionDraft[]>;
}) {
  const [aiBusy, setAiBusy] = useState(false);
  const [aiMsg, setAiMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [sections, setSections] = useState<SectionDraft[]>(initial.sections);
  const [questions, setQuestions] = useState<QuestionDraft[]>(initial.questions);
  const [isGlobal, setIsGlobal] = useState(initial.is_global_model);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [newLabel, setNewLabel] = useState("");
  const [showLib, setShowLib] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showSections, setShowSections] = useState(initial.sections.length > 0);
  const state: QuestionnaireState = { name, description, sections, questions, is_global_model: isGlobal };
  const fullCtx: QuestionCtx = useMemo(() => ({ ...ctx, sections: sections.map((s) => ({ key: s.key, name: s.name || s.key })), otherQuestions: questions.map((x) => ({ key: x.key, label: x.label, question_type: x.question_type })) }), [ctx, sections, questions]);
  const upd = (key: string, patch: Partial<QuestionDraft>) => setQuestions((qs) => qs.map((x) => (x.key === key ? { ...x, ...patch } : x)));
  const move = (i: number, d: number) => setQuestions((qs) => { const j = i + d; if (j < 0 || j >= qs.length) return qs; const c = qs.slice(); [c[i], c[j]] = [c[j], c[i]]; return c; });
  const toggle = (key: string) => setOpen((s) => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n; });
  const add = () => {
    if (!newLabel.trim()) return;
    const key = slugKey(newLabel, questions.map((x) => x.key));
    setQuestions((qs) => [...qs, { key, label: newLabel.trim(), is_required: true, ...emptyQuestion() }]);
    setOpen((s) => new Set(s).add(key)); setNewLabel("");
  };
  const dup = (i: number) => setQuestions((qs) => { const copy = cloneDraft(qs[i], qs.map((x) => x.key)); const c = qs.slice(); c.splice(i + 1, 0, copy); return c; });
  const remove = (key: string) => setQuestions((qs) => qs.filter((x) => x.key !== key));
  const reuse = (r: any) => {
    const d = draftFromServer(r);
    const copy = cloneDraft({ ...d, section_key: "", target_step_key: "", cond_source: "", cond_ref: "" }, questions.map((x) => x.key));
    const clean = { ...copy, key: slugKey(r.label, questions.map((x) => x.key)), label: r.label };
    setQuestions((qs) => [...qs, clean]); setOpen((s) => new Set(s).add(clean.key)); setShowLib(false);
  };
  const addSection = () => setSections((ss) => [...ss, { key: `s${ss.length + 1}-${Date.now().toString(36).slice(-3)}`, name: `Seção ${ss.length + 1}`, description: "" }]);
  const moveSection = (i: number, d: number) => setSections((ss) => { const j = i + d; if (j < 0 || j >= ss.length) return ss; const c = ss.slice(); [c[i], c[j]] = [c[j], c[i]]; return c; });
  const removeSection = (key: string) => { setSections((ss) => ss.filter((s) => s.key !== key)); setQuestions((qs) => qs.map((x) => (x.section_key === key ? { ...x, section_key: "" } : x))); };
  const sectionName = (key: string) => sections.find((s) => s.key === key)?.name;
  const suggestMore = async () => {
    if (!onSuggest) return;
    setAiBusy(true); setAiMsg(null);
    try {
      const novas = await onSuggest(questions.map((x) => x.label));
      const taken = new Set(questions.map((x) => x.key));
      const fixed = novas.map((d) => { let k = d.key; while (taken.has(k)) k += "x"; taken.add(k); return { ...d, key: k }; });
      setQuestions((qs) => [...qs, ...fixed]);
      setAiMsg({ ok: true, text: `${fixed.length} pergunta(s) sugerida(s) adicionada(s) ao final. Revise antes de salvar.` });
    } catch (e: any) { setAiMsg({ ok: false, text: e?.message ?? "Não foi possível usar a IA agora." }); } finally { setAiBusy(false); }
  };
  const canSave = !!name.trim() && questions.length > 0 && !saving && questions.every((x) => x.label.trim());

  return (
    <div className="w-full min-w-0 space-y-2 rounded-lg border border-dashed border-neutral-300 p-2 dark:border-neutral-700" data-testid="questionnaire-editor">
      {notice}
      <div className="grid gap-2 md:grid-cols-2">
        <label className="flex min-w-0 flex-col gap-0.5 text-[11px] font-semibold text-slate-600">Nome do questionário<Input aria-label="Nome do questionário" className="h-8 text-sm" value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label className="flex min-w-0 flex-col gap-0.5 text-[11px] font-semibold text-slate-600">Descrição (opcional)<Input aria-label="Descrição do questionário" className="h-8 text-sm" value={description} onChange={(e) => setDescription(e.target.value)} /></label>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-[11px]">
        <label className="inline-flex items-center gap-1" title="Aparece na biblioteca para ser reutilizado em qualquer produto"><input type="checkbox" checked={isGlobal} onChange={(e) => setIsGlobal(e.target.checked)} aria-label="Salvar como modelo global" />Salvar como modelo global</label>
        {usedByCount > 1 && <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-800">Usado por {usedByCount} tarefas</span>}
        <button type="button" className="inline-flex items-center gap-1 font-semibold text-violet-700 underline" onClick={() => setShowSections((v) => !v)}>{showSections ? "Esconder seções" : `Seções (${sections.length})`}</button>
        <button type="button" className="inline-flex items-center gap-1 font-semibold text-violet-700 underline" onClick={() => setOpen(open.size ? new Set() : new Set(questions.map((x) => x.key)))}>{open.size ? "Recolher todas" : "Expandir todas"}</button>
        <button type="button" className="inline-flex items-center gap-1 font-semibold text-violet-700 underline" aria-pressed={showPreview} onClick={() => setShowPreview((v) => !v)}><Eye className="h-3.5 w-3.5" />{showPreview ? "Fechar prévia" : "Visualizar como cliente"}</button>
      </div>
      {showSections && (
        <div className="space-y-1 rounded-md border border-slate-200 p-2 dark:border-slate-700" data-testid="sections-editor">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Seções do questionário</p>
          {sections.length === 0 && <p className="text-[11px] text-slate-500">Sem seções: as perguntas aparecem em sequência. Crie seções para agrupar por assunto.</p>}
          {sections.map((s, i) => (
            <div key={s.key} className="flex flex-wrap items-center gap-1.5" data-testid="section-row">
              <Input className="h-8 min-w-[9rem] flex-1 text-xs" aria-label={`Nome da seção ${i + 1}`} value={s.name} onChange={(e) => setSections((ss) => ss.map((x) => (x.key === s.key ? { ...x, name: e.target.value } : x)))} />
              <Input className="h-8 min-w-[9rem] flex-[2] text-xs" aria-label={`Descrição da seção ${i + 1}`} placeholder="Descrição (opcional)" value={s.description} onChange={(e) => setSections((ss) => ss.map((x) => (x.key === s.key ? { ...x, description: e.target.value } : x)))} />
              <button type="button" aria-label={`Subir seção ${i + 1}`} className="rounded p-1 text-slate-500 disabled:opacity-30" disabled={i === 0} onClick={() => moveSection(i, -1)}><ArrowUp className="h-3.5 w-3.5" /></button>
              <button type="button" aria-label={`Descer seção ${i + 1}`} className="rounded p-1 text-slate-500 disabled:opacity-30" disabled={i === sections.length - 1} onClick={() => moveSection(i, 1)}><ArrowDown className="h-3.5 w-3.5" /></button>
              <button type="button" aria-label={`Excluir seção ${i + 1}`} className="rounded p-1 text-rose-500" onClick={() => removeSection(s.key)}><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
          <Button type="button" size="sm" variant="outline" className="h-7" onClick={addSection}><Plus className="h-3 w-3" />Nova seção</Button>
        </div>
      )}
      <ul className="space-y-1" data-testid="question-list">
        {questions.map((q, i) => {
          const isOpen = open.has(q.key);
          return (
            <li key={q.key} className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60" data-testid="question-item" data-inactive={q.is_active ? undefined : "true"}>
              <div className="flex flex-wrap items-center gap-1.5 px-2 py-1.5" data-testid="question-summary">
                <button type="button" className="inline-flex min-w-0 flex-1 items-center gap-1.5 text-left" aria-expanded={isOpen} aria-label={`${isOpen ? "Recolher" : "Expandir"} pergunta ${i + 1}`} onClick={() => toggle(q.key)}>
                  {isOpen ? <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" /> : <ChevronRight className="h-4 w-4 shrink-0 text-slate-500" />}
                  <span className={`min-w-0 truncate text-sm font-medium ${q.is_active ? "text-slate-800 dark:text-slate-100" : "text-slate-400 line-through"}`}>{i + 1}. {q.label || "(sem texto)"}</span>
                </button>
                <span className="hidden flex-wrap items-center gap-1 sm:flex">
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">{questionTypeLabel(q.question_type)}</span>
                  <span className={`rounded px-1.5 py-0.5 text-[10px] ${q.is_required ? "bg-red-50 text-red-700" : "bg-slate-50 text-slate-500"}`}>{q.is_required ? "obrigatória" : "opcional"}</span>
                  {!q.is_active && <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] text-slate-700">inativa</span>}
                  {q.cond_source && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-800">condicional</span>}
                  {(q.att_allowed || ["arquivo", "imagem", "video", "audio", "documento"].includes(q.question_type)) && <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] text-sky-800">anexo</span>}
                  {q.section_key && sectionName(q.section_key) && <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[10px] text-violet-800">{sectionName(q.section_key)}</span>}
                </span>
                <span className="flex items-center gap-0.5">
                  <button type="button" aria-label={`Subir pergunta ${i + 1}`} className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp className="h-3.5 w-3.5" /></button>
                  <button type="button" aria-label={`Descer pergunta ${i + 1}`} className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30" disabled={i === questions.length - 1} onClick={() => move(i, 1)}><ArrowDown className="h-3.5 w-3.5" /></button>
                  <button type="button" aria-label={`Duplicar pergunta ${i + 1}`} className="rounded p-1 text-slate-500 hover:bg-slate-100" onClick={() => dup(i)}><Copy className="h-3.5 w-3.5" /></button>
                  <button type="button" aria-label={`Excluir pergunta ${i + 1}`} className="rounded p-1 text-rose-500 hover:bg-rose-50" onClick={() => remove(q.key)}><Trash2 className="h-3.5 w-3.5" /></button>
                </span>
              </div>
              {isOpen && (
                <div className="space-y-2 border-t border-slate-100 p-2 dark:border-slate-800" data-testid="question-body">
                  <div className="flex flex-wrap items-end gap-2">
                    <label className="flex min-w-[14rem] flex-1 flex-col gap-0.5 text-[11px] font-semibold text-slate-600">Texto da pergunta<Input aria-label={`Texto da pergunta ${i + 1}`} className="h-8 text-sm" value={q.label} maxLength={500} onChange={(e) => upd(q.key, { label: e.target.value })} /></label>
                    <span className="rounded bg-slate-100 px-1.5 py-1 text-[10px] text-slate-600" title="Identificador permanente da pergunta" data-testid="question-id">{q.id ? `ID ${String(q.id).slice(0, 8)}` : "ID gerado ao salvar"}</span>
                  </div>
                  <QuestionConfigFields q={q} ctx={fullCtx} onChange={(patch) => upd(q.key, patch)} />
                </div>
              )}
            </li>
          );
        })}
        {questions.length === 0 && <li className="text-xs text-neutral-400">Nenhuma pergunta ainda. Adicione abaixo, reutilize uma existente ou gere com IA.</li>}
      </ul>
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex min-w-[14rem] flex-1 flex-col gap-0.5 text-[11px] font-semibold text-slate-600">Nova pergunta<Input aria-label="nova pergunta" className="h-8 text-sm" placeholder="Escreva a pergunta e clique em Adicionar" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} /></label>
        <Button type="button" size="sm" variant="outline" className="h-8" disabled={!newLabel.trim()} onClick={add}><Plus className="h-3.5 w-3.5" />Adicionar pergunta</Button>
        <Button type="button" size="sm" variant="outline" className="h-8" onClick={() => setShowLib((v) => !v)}><Library className="h-3.5 w-3.5" />Reutilizar pergunta existente</Button>
        {onSuggest && <button type="button" data-testid="ai-questionnaire-more" disabled={aiBusy} onClick={() => void suggestMore()} title="A IA lê tudo o que está cadastrado no produto e sugere perguntas que ainda não existem. Você revisa antes de salvar." className="inline-flex h-8 items-center gap-1 rounded-md bg-[image:var(--app-brand-button,linear-gradient(to_right,#2563eb,#7c3aed))] px-3 text-xs font-semibold text-white disabled:opacity-60">{aiBusy ? "Pensando…" : "Sugerir mais perguntas com IA"}</button>}
      </div>
      {aiMsg && <p role={aiMsg.ok ? "status" : "alert"} className={`text-[11px] font-semibold ${aiMsg.ok ? "text-emerald-700" : "text-red-600"}`}>{aiMsg.text}</p>}
      {showLib && <QuestionLibrary onPick={reuse} onClose={() => setShowLib(false)} />}
      {showPreview && <QuestionnairePreview state={state} />}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" disabled={!canSave} onClick={() => onSave(state)}>{saving ? "Salvando…" : saveLabel}</Button>
        {onCancel && <Button type="button" size="sm" variant="ghost" onClick={onCancel}>Cancelar</Button>}
        {!canSave && !saving && <span className="text-[11px] text-neutral-400">{!name.trim() ? "Dê um nome ao questionário." : questions.length === 0 ? "Adicione ao menos uma pergunta." : "Preencha o texto de todas as perguntas."}</span>}
      </div>
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
