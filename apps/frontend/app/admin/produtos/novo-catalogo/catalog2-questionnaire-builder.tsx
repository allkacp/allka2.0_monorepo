"use client";

// Questionário de contratação — estilo da plataforma antiga (17/10): na PÁGINA só aparece o questionário pronto (lista de perguntas
// recolhíveis, só leitura). "+ Adicionar" e o lápis de cada pergunta abrem um MODAL ("Editar Pergunta") com todas as configurações:
// 22 tipos, opções, anexos, validação, condição, seção, ativa/inativa… Também há modal para os dados do questionário (nome, seções, modelo global).
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, Copy, Eye, GripVertical, Info, Library, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { FramedModal, FRAMED_HEADER_CLASS } from "@/components/framed-panel";
import { apiClient } from "@/lib/api-client";
import { BriefingQuestionField, emptyBriefingValue, isVisible, pendingMessage, type BriefingValue } from "@/components/briefing-question-field";
import { QuestionConfigFields, cloneDraft, draftFromServer, emptyQuestion, payloadFromDraft, questionTypeLabel, type QuestionCtx, type QuestionDraft } from "./catalog2-questions-ui";

/** Degradê oficial dos botões principais (mesmo do Publicar) e o botão de contorno roxo (mesmo dos "Ver"). */
export const BRAND_GRADIENT_STYLE = { background: "var(--app-brand-gradient, linear-gradient(90deg, #2558FF 0%, #6E2C96 55%, #D92293 100%))" } as const;
export const BRAND_OUTLINE_CLASS = "border-violet-200 bg-white text-violet-700 hover:bg-violet-50 hover:text-violet-800";

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
    // Janela Moldura (padrão global): véu claro que cobre tudo menos a sidebar, janela centralizada com rolagem por dentro.
    <FramedModal open onOpenChange={(o) => { if (!o) onClose(); }} testId="question-modal" title={isNew ? "Nova Pergunta" : "Editar Pergunta"}>
      <div className={`flex shrink-0 items-center justify-between gap-2 rounded-2xl bg-white px-4 py-3 shadow-sm dark:bg-slate-900 ${FRAMED_HEADER_CLASS}`}>
        <div className="min-w-0"><p className="truncate text-base font-bold text-slate-900 dark:text-slate-100">{isNew ? "Adicionar pergunta" : "Editar pergunta"}</p><p className="truncate text-xs text-slate-500">Tipo de resposta, opções, anexos, condição e seção desta pergunta.</p></div>
        <Button type="button" size="sm" variant="outline" className={BRAND_OUTLINE_CLASS} onClick={onClose}>Fechar</Button>
      </div>
      <div className="mt-2 min-h-0 flex-1 overflow-y-auto rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-900">
        <div className="space-y-3">
          <label className="flex flex-col gap-1 text-sm font-semibold text-slate-800">Pergunta <span className="sr-only">(obrigatório)</span>
            <Input aria-label="Texto da pergunta" className="text-sm" value={q.label} maxLength={500} onChange={(e) => patch({ label: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold text-slate-800">Instrução de resposta
            <textarea aria-label="Instrução de resposta" rows={2} maxLength={1000} className="w-full rounded-md border border-slate-300 bg-white p-2 text-sm font-normal dark:border-slate-600 dark:bg-slate-900" value={q.help_text} onChange={(e) => patch({ help_text: e.target.value })} />
          </label>
          <QuestionConfigFields q={q} ctx={{ ...ctx, otherQuestions: ctx.otherQuestions }} hideHelp onChange={patch} />
          <div className="sticky bottom-[-1rem] z-10 -mx-4 -mb-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
            <span className="rounded bg-slate-100 px-1.5 py-1 text-[10px] text-slate-600" title="Identificador permanente da pergunta" data-testid="question-id">{q.id ? `ID ${String(q.id).slice(0, 8)}` : "ID gerado ao salvar"}</span>
            <span className="flex gap-2">
              <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
              <Button type="button" style={BRAND_GRADIENT_STYLE} className="text-white shadow-md hover:brightness-110 disabled:opacity-55" disabled={!q.label.trim()} onClick={() => onSave({ ...q, label: q.label.trim() })}>Salvar</Button>
            </span>
          </div>
        </div>
      </div>
    </FramedModal>
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
  const [toDup, setToDup] = useState<QuestionDraft | null>(null);
  const [showLib, setShowLib] = useState(false);
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiMsg, setAiMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const fullCtx: QuestionCtx = useMemo(() => ({ ...ctx, sections: sections.map((s) => ({ key: s.key, name: s.name || s.key })), otherQuestions: questions.map((x) => ({ key: x.key, label: x.label, question_type: x.question_type })) }), [ctx, sections, questions]);
  const toggle = (key: string) => setOpen((s) => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n; });
  // Subir/descer anda DENTRO da sessão (o vizinho é o da mesma sessão, não o da lista toda).
  const move = (i: number, d: number, neighbors: number[]) => { const at = neighbors.indexOf(i); const j = neighbors[at + d]; if (at < 0 || j === undefined) return; const c = questions.slice(); [c[i], c[j]] = [c[j], c[i]]; onChange(c); };
  const dropOn = (targetKey: string) => {
    if (!dragKey || dragKey === targetKey) return;
    const from = questions.findIndex((x) => x.key === dragKey); const to = questions.findIndex((x) => x.key === targetKey);
    if (from < 0 || to < 0) return;
    // Soltar sobre uma pergunta de OUTRA sessão leva a pergunta para aquela sessão.
    const target = questions[to];
    const c = questions.slice(); const [m] = c.splice(from, 1); c.splice(to, 0, { ...m, section_key: target.section_key });
    onChange(c);
  };
  // Soltar sobre o título de uma sessão (mesmo vazia) põe a pergunta no fim dela.
  const dropOnSection = (groupKey: string) => {
    if (!dragKey) return;
    const from = questions.findIndex((x) => x.key === dragKey); if (from < 0) return;
    const c = questions.slice(); const [m] = c.splice(from, 1);
    c.push({ ...m, section_key: groupKey === "__none" ? "" : groupKey });
    onChange(c);
  };
  const [overSection, setOverSection] = useState<string | null>(null);
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
  // Com sessões, a numeração recomeça em cada sessão (1ª, 2ª, 3ª…); sem sessões, é a lista toda.
  const ord = (pos: number) => `${pos + 1}ª`;
  // R21-17: com sessões cadastradas, as perguntas aparecem agrupadas em ACORDEÃO por sessão (a ordem de arrastar continua valendo na lista toda).
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const toggleSection = (key: string) => setCollapsed((c) => { const n = new Set(c); n.has(key) ? n.delete(key) : n.add(key); return n; });
  const groups = useMemo(() => {
    const indexed = questions.map((q, i) => ({ q, i }));
    if (sections.length === 0) return [{ key: "__all", name: "", showHeader: false, items: indexed }];
    const known = new Set(sections.map((x) => x.key));
    const out = sections.map((sec) => ({ key: sec.key, name: sec.name || sec.key, showHeader: true, items: indexed.filter((x) => x.q.section_key === sec.key) }));
    const loose = indexed.filter((x) => !known.has(x.q.section_key));
    if (loose.length > 0) out.push({ key: "__none", name: "Sem sessão", showHeader: true, items: loose });
    return out;
  }, [questions, sections]);
  const renderItem = (q: QuestionDraft, i: number, pos: number, neighbors: number[]) => {
    const att = q.att_allowed || ["arquivo", "imagem", "video", "audio", "documento"].includes(q.question_type);
    const iconBtn = "rounded-md p-1.5 text-slate-500 transition hover:bg-violet-50 hover:text-violet-700 disabled:opacity-30 disabled:hover:bg-transparent";
    return (
      <li key={q.key} className="border-b border-slate-200 last:border-b-0 dark:border-slate-800" data-testid="question-item" data-inactive={q.is_active ? undefined : "true"}
        draggable={!readOnly} onDragStart={() => setDragKey(q.key)} onDragOver={(e) => { if (dragKey) e.preventDefault(); }} onDrop={() => { dropOn(q.key); setDragKey(null); }} onDragEnd={() => setDragKey(null)}>
        <div className="flex items-center gap-2 px-3 py-2.5 hover:bg-violet-50/40" data-testid="question-summary">
          <span className="cursor-grab text-violet-400" title="Arraste para reordenar ou mover de sessão" aria-hidden="true"><GripVertical className="h-5 w-5" /></span>
          <span className={`min-w-0 flex-1 truncate text-[15px] font-bold ${q.is_active ? "text-slate-900 dark:text-slate-100" : "text-slate-400 line-through"}`}>{ord(pos)} {q.label || "(sem texto)"}</span>
          <span className="hidden flex-wrap items-center gap-1 sm:flex">
            {!q.is_active && <Chip>inativa</Chip>}
            {q.cond_source && <Chip tone="amber">condicional</Chip>}
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" aria-label={`Informações da pergunta ${pos + 1}`} className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-violet-200 bg-white text-violet-700 transition hover:bg-violet-50"><Info className="h-3.5 w-3.5" /></button>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-sm p-3 text-xs" data-testid="question-info">
              <p className="text-sm font-bold">{ord(pos)} pergunta</p>
              <dl className="mt-2.5 space-y-2">
                <div className="flex items-center justify-between gap-4"><dt className="font-semibold opacity-90">Tipo da resposta</dt><dd><Chip tone="green">{questionTypeLabel(q.question_type)}</Chip></dd></div>
                <div className="flex items-center justify-between gap-4"><dt className="font-semibold opacity-90">Anexo na pergunta?</dt><dd>{yesNo(att)}</dd></div>
                <div className="flex items-center justify-between gap-4"><dt className="font-semibold opacity-90">Pergunta obrigatória?</dt><dd>{yesNo(q.is_required)}</dd></div>
                {q.section_key && sectionName(q.section_key) && <div className="flex items-center justify-between gap-4"><dt className="font-semibold opacity-90">Seção</dt><dd><Chip tone="violet">{sectionName(q.section_key)}</Chip></dd></div>}
                {q.target_step_key && <div className="flex items-center justify-between gap-4"><dt className="font-semibold opacity-90">Etapa</dt><dd><Chip tone="sky">{stepName(q.target_step_key)}</Chip></dd></div>}
              </dl>
              {q.help_text && <p className="mt-2.5 border-t border-white/20 pt-2"><span className="font-semibold">Instruções de resposta:</span> <span className="opacity-90">{q.help_text}</span></p>}
              {q.id && <p className="mt-2 text-[10px] opacity-70" title="Identificador permanente da pergunta">ID {String(q.id).slice(0, 8)}</p>}
            </TooltipContent>
          </Tooltip>
          {!readOnly && (
            <span className="flex items-center gap-0.5">
              <button type="button" aria-label={`Subir pergunta ${pos + 1}`} title="Subir" className={iconBtn} disabled={pos === 0 || busy} onClick={() => move(i, -1, neighbors)}><ArrowUp className="h-4 w-4" /></button>
              <button type="button" aria-label={`Descer pergunta ${pos + 1}`} title="Descer" className={iconBtn} disabled={pos === neighbors.length - 1 || busy} onClick={() => move(i, 1, neighbors)}><ArrowDown className="h-4 w-4" /></button>
              <button type="button" aria-label={`Duplicar pergunta ${pos + 1}`} title="Duplicar" className={iconBtn} disabled={busy} onClick={() => setToDup(q)}><Copy className="h-4 w-4" /></button>
              <button type="button" aria-label={`Editar pergunta ${pos + 1}`} title="Editar" className="rounded-md bg-violet-100 p-2 text-violet-700 transition hover:bg-violet-200" disabled={busy} onClick={() => setModal({ q, isNew: false })}><Pencil className="h-4 w-4" /></button>
              <button type="button" aria-label={`Excluir pergunta ${pos + 1}`} title="Excluir" className="rounded-md bg-rose-100 p-2 text-rose-600 transition hover:bg-rose-200" disabled={busy} onClick={() => setToDelete(q)}><Trash2 className="h-4 w-4" /></button>
            </span>
          )}
        </div>
      </li>
    );
  };

  return (
    <div className="w-full min-w-0 space-y-2" data-testid="question-list-wrap">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">Perguntas <span className="text-xs font-normal text-slate-500">({questions.length})</span></h4>
        {!readOnly && (
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" variant="outline" className={`h-9 ${BRAND_OUTLINE_CLASS}`} onClick={() => setShowLib((v) => !v)}><Library className="h-3.5 w-3.5" />Reutilizar pergunta existente</Button>
            {onSuggest && <button type="button" data-testid="ai-questionnaire-more" disabled={aiBusy} onClick={() => void suggestMore()} title="A IA lê tudo o que está cadastrado no produto e sugere perguntas que ainda não existem. Você revisa antes de salvar." style={BRAND_GRADIENT_STYLE} className="inline-flex h-9 items-center gap-1 rounded-md px-3 text-xs font-semibold text-white shadow-md hover:brightness-110 disabled:opacity-60">{aiBusy ? "Pensando…" : "Sugerir mais perguntas com IA"}</button>}
            <Button type="button" style={BRAND_GRADIENT_STYLE} className="h-9 gap-1.5 px-4 text-white shadow-md hover:brightness-110" disabled={busy} onClick={() => setModal({ q: blank(), isNew: true })}><Plus className="h-4 w-4" />Adicionar</Button>
          </div>
        )}
      </div>
      {aiMsg && <p role={aiMsg.ok ? "status" : "alert"} className={`text-[11px] font-semibold ${aiMsg.ok ? "text-emerald-700" : "text-red-600"}`}>{aiMsg.text}</p>}
      {showLib && <QuestionLibrary onPick={reuse} onClose={() => setShowLib(false)} />}
      <div className="space-y-4" data-testid="question-list">
        {groups.map((g) => (
          <ul key={g.key} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
            {g.showHeader && (
              <li className={`border-b border-violet-100 bg-violet-50/80 dark:border-slate-800 dark:bg-violet-950/20 ${overSection === g.key ? "ring-2 ring-inset ring-violet-400" : ""}`} data-testid="question-section" onDragOver={(e) => { if (dragKey) { e.preventDefault(); setOverSection(g.key); } }} onDragLeave={() => setOverSection(null)} onDrop={() => { dropOnSection(g.key); setDragKey(null); setOverSection(null); }}>
                <button type="button" className="flex w-full items-center gap-2 px-3 py-2.5 text-left" aria-expanded={!collapsed.has(g.key)} aria-label={`${collapsed.has(g.key) ? "Abrir" : "Fechar"} sessão ${g.name}`} onClick={() => toggleSection(g.key)}>
                  {collapsed.has(g.key) ? <ChevronRight className="h-4 w-4 text-violet-700" /> : <ChevronDown className="h-4 w-4 text-violet-700" />}
                  <span className="text-sm font-bold text-violet-900 dark:text-violet-100">{g.name}</span>
                  <span className="text-[11px] text-slate-500">{g.items.length} pergunta(s)</span>
                </button>
              </li>
            )}
            {!collapsed.has(g.key) && g.items.map(({ q, i }, pos) => renderItem(q, i, pos, g.items.map((x) => x.i)))}
          </ul>
        ))}
        {questions.length === 0 && <p className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs text-neutral-400">Nenhuma pergunta ainda{readOnly ? "." : " — clique em “Adicionar”, reutilize uma existente ou gere com IA."}</p>}
      </div>
      {modal && <QuestionModal key={modal.q.key + (modal.isNew ? "-new" : "")} initial={modal.q} ctx={fullCtx} isNew={modal.isNew} onSave={saveModal} onClose={() => setModal(null)} />}
      <ConfirmationDialog
        elevated open={!!toDelete} onClose={() => setToDelete(null)} title="Excluir pergunta?" destructive confirmText="Excluir pergunta"
        message={<>A pergunta “{toDelete?.label}” sai deste questionário. Contratações já feitas não mudam (o briefing delas já está guardado).</>}
        onConfirm={() => { if (toDelete) onChange(questions.filter((x) => x.key !== toDelete.key)); setToDelete(null); }}
      />
      <ConfirmationDialog
        elevated open={!!toDup} onClose={() => setToDup(null)} title="Duplicar pergunta?" destructive={false} confirmText="Duplicar pergunta"
        message={<>Será criada uma cópia da pergunta “{toDup?.label}” logo abaixo dela, com ID novo gerado ao salvar.</>}
        onConfirm={() => { if (toDup) { const at = questions.findIndex((x) => x.key === toDup.key); if (at >= 0) dup(at); } setToDup(null); }}
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
