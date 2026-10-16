"use client";

// Construtor universal de perguntas (17/10): 22 tipos de resposta, opções editáveis/ordenáveis, anexos, validação, placeholder,
// ativar/desativar, visibilidade, seção, etapa de destino e lógica condicional sem código. Cada pergunta tem ID próprio e permanente (gerado ao salvar).
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";

export const QUESTION_TYPES: [string, string][] = [
  ["texto_curto", "Texto curto"], ["texto_longo", "Texto longo"], ["numero", "Número"], ["moeda", "Moeda (valor em reais)"], ["data", "Data"], ["hora", "Hora"], ["data_hora", "Data e hora"],
  ["sim_nao", "Sim ou não"], ["selecao_unica", "Seleção única"], ["selecao_multipla", "Seleção múltipla"], ["lista_suspensa", "Lista suspensa"], ["escala", "Escala ou nota"],
  ["telefone", "Telefone"], ["email", "E-mail"], ["url", "URL (link)"], ["endereco", "Endereço"],
  ["arquivo", "Anexo de arquivo"], ["imagem", "Imagem"], ["video", "Vídeo"], ["audio", "Áudio"], ["documento", "Documento"], ["aceite", "Aceite ou confirmação"],
  ["acesso_ativo", "Acesso ou ativo do cliente (antigo)"],
];
export const questionTypeLabel = (t?: string | null) => QUESTION_TYPES.find(([k]) => k === t)?.[1] ?? "Texto longo";
export const SELECT_TYPES = ["selecao_unica", "selecao_multipla", "lista_suspensa"];
export const FILE_TYPES = ["arquivo", "imagem", "video", "audio", "documento"];
const VISIBILITY: [string, string][] = [["client", "Cliente"], ["team", "Equipe interna"], ["both", "Cliente e equipe"], ["internal", "Só interno"]];
const USAGE: [string, string][] = [["both", "Pessoa e IA leem"], ["human", "Só pessoa"], ["ai", "Só IA"]];
export const DEFAULT_ACCEPT_HINT: Record<string, string> = { imagem: ".jpg, .png, .webp, .gif", video: ".mp4, .mov, .webm", audio: ".mp3, .wav, .m4a", documento: ".pdf, .docx, .xlsx, .pptx, .txt, .csv", arquivo: "qualquer tipo seguro (sem executáveis)" };

export interface OptionDraft { label: string; is_default: boolean }
export interface QuestionDraft {
  /** ID permanente (existe depois de salvar; nunca muda ao editar, reordenar ou duplicar-e-salvar). */
  id?: string;
  key: string; label: string; is_required: boolean;
  question_type: string; help_text: string; placeholder: string; opts: OptionDraft[]; default_value: string;
  min: string; max: string; min_length: string; max_length: string;
  visibility: string; answer_usage: string;
  is_active: boolean; section_key: string;
  /** Onde a resposta é usada: "" = a tarefa toda; senão a chave da etapa. */
  target_step_key: string;
  /** Quando a pergunta aparece: "" = sempre; senão depende de variação, adicional ou resposta anterior. */
  cond_source: string; cond_ref: string; cond_operator: string; cond_value: string;
  /** Anexos junto da resposta (ou resposta principal, nos tipos de arquivo). */
  att_allowed: boolean; att_required: boolean; att_accept: string; att_max_files: string; att_max_size_mb: string; att_require_description: boolean;
  scale_min: string; scale_max: string; allow_other: boolean; min_choices: string; max_choices: string;
}
export const emptyQuestion = (): Omit<QuestionDraft, "key" | "label" | "is_required"> => ({
  question_type: "texto_longo", help_text: "", placeholder: "", opts: [], default_value: "", min: "", max: "", min_length: "", max_length: "", visibility: "client", answer_usage: "both",
  is_active: true, section_key: "", target_step_key: "", cond_source: "", cond_ref: "", cond_operator: "selected", cond_value: "",
  att_allowed: false, att_required: false, att_accept: "", att_max_files: "", att_max_size_mb: "", att_require_description: false,
  scale_min: "1", scale_max: "5", allow_other: false, min_choices: "", max_choices: "",
});

/** Contexto do produto usado para escolher a etapa de destino, a seção e a condição da pergunta. */
export interface QuestionCtx {
  steps: { key: string; name: string }[];
  variations: { key: string; name: string; options: { key: string; label: string }[] }[];
  addons: { key: string; name: string }[];
  otherQuestions: { key: string; label: string; question_type?: string }[];
  sections?: { key: string; name: string }[];
}
export const COND_SOURCES: [string, string][] = [["", "Sempre aparece"], ["variation_option", "Se a variação (opção) for escolhida"], ["addon", "Se o adicional for escolhido"], ["answer", "Conforme a resposta de outra pergunta"]];
export const ANSWER_OPERATORS: [string, string][] = [
  ["eq", "é igual a"], ["neq", "é diferente de"], ["contains", "contém"], ["selected", "está selecionado / respondido"], ["not_selected", "não está selecionado / vazio"],
  ["gt", "é maior que"], ["lt", "é menor que"], ["attached", "foi anexado arquivo"], ["not_attached", "não foi anexado arquivo"],
];
const NEEDS_VALUE = ["eq", "neq", "contains", "gt", "lt"];

const toOpts = (options: any[] | null | undefined): OptionDraft[] => (options ?? []).map((o: any) => (typeof o === "string" ? { label: o, is_default: false } : { label: String(o.label ?? o.value ?? ""), is_default: !!o.is_default }));

/** Pergunta que veio do servidor → rascunho editável. */
export function draftFromServer(q: any): QuestionDraft {
  const v = q.validation ?? {};
  const st = q.settings ?? {};
  const att = st.attachments ?? {};
  const s = (x: unknown) => (x == null ? "" : String(x));
  return {
    id: q.id, key: q.key, label: q.label, is_required: q.is_required,
    question_type: q.question_type ?? "texto_longo", help_text: q.help_text ?? "", placeholder: st.placeholder ?? "", opts: toOpts(q.options), default_value: q.default_value ?? "",
    min: s(v.min), max: s(v.max), min_length: s(v.min_length), max_length: s(v.max_length),
    visibility: q.visibility ?? "client", answer_usage: q.answer_usage ?? "both",
    is_active: st.is_active !== false, section_key: st.section_key ?? "",
    target_step_key: q.target_step_key ?? "",
    cond_source: q.condition?.source ?? "", cond_ref: q.condition?.ref ?? "", cond_operator: q.condition?.operator ?? "selected", cond_value: q.condition?.value ?? "",
    att_allowed: !!att.allowed, att_required: !!att.required, att_accept: (att.accept ?? []).join(", "), att_max_files: s(att.max_files ?? v.max_files), att_max_size_mb: s(att.max_size_mb ?? v.max_size_mb), att_require_description: !!att.require_description,
    scale_min: s(st.scale?.min ?? 1), scale_max: s(st.scale?.max ?? 5), allow_other: !!st.allow_other, min_choices: s(st.min_choices), max_choices: s(st.max_choices),
  };
}
/** Pergunta sugerida pela IA → rascunho editável (mesmos tipos e configurações do construtor manual). */
export function draftFromSuggestion(q: any): QuestionDraft {
  const st = q.settings ?? {};
  return {
    ...emptyQuestion(), key: q.key, label: q.label, is_required: q.is_required !== false, question_type: q.question_type ?? "texto_longo", help_text: q.help_text ?? "",
    opts: toOpts(q.options), placeholder: st.placeholder ?? "", att_allowed: !!st.attachments?.allowed,
  };
}
/** Cópia de uma pergunta (duplicar ou reaproveitar de outro questionário): ID novo (gerado ao salvar) e chave nova. */
export function cloneDraft(q: QuestionDraft, takenKeys: Iterable<string>): QuestionDraft {
  const taken = new Set(takenKeys);
  let n = 2; let key = `${q.key.replace(/-copia-\d+$/, "")}-copia-${n}`;
  while (taken.has(key)) key = `${q.key.replace(/-copia-\d+$/, "")}-copia-${++n}`;
  return { ...q, id: undefined, key, label: `${q.label} (cópia)`, opts: q.opts.map((o) => ({ ...o })) };
}
/** Rascunho → corpo aceito pela API (campos vazios não entram). */
export function payloadFromDraft(q: QuestionDraft) {
  const num = (s: string) => (s.trim() === "" ? undefined : Number(s));
  const validation: Record<string, number> = {};
  for (const [k, v] of [["min", q.min], ["max", q.max], ["min_length", q.min_length], ["max_length", q.max_length]] as const) { const n = num(v); if (n != null && Number.isFinite(n)) validation[k] = n; }
  const select = SELECT_TYPES.includes(q.question_type);
  const fileType = FILE_TYPES.includes(q.question_type);
  const labels = q.opts.map((o) => ({ ...o, label: o.label.trim() })).filter((o) => o.label);
  const options = select ? (labels.some((o) => o.is_default) ? labels.map((o) => ({ value: o.label, label: o.label, ...(o.is_default ? { is_default: true } : {}) })) : labels.map((o) => o.label)) : null;
  const settings: Record<string, unknown> = {};
  if (q.placeholder.trim()) settings.placeholder = q.placeholder.trim();
  if (!q.is_active) settings.is_active = false;
  if (q.section_key) settings.section_key = q.section_key;
  if (q.att_allowed || fileType) {
    const att: Record<string, unknown> = { allowed: true };
    if (q.att_required) att.required = true;
    if (q.att_require_description) att.require_description = true;
    const accept = q.att_accept.split(/[,\s;]+/).map((x) => x.trim()).filter(Boolean);
    if (accept.length) att.accept = accept;
    const mf = num(q.att_max_files); if (mf != null && Number.isFinite(mf)) att.max_files = mf;
    const ms = num(q.att_max_size_mb); if (ms != null && Number.isFinite(ms)) att.max_size_mb = ms;
    settings.attachments = att;
  }
  if (q.question_type === "escala") settings.scale = { min: Number(q.scale_min || 1), max: Number(q.scale_max || 5) };
  if (select) {
    if (q.allow_other) settings.allow_other = true;
    if (q.question_type === "selecao_multipla") {
      const a = num(q.min_choices); if (a != null && Number.isFinite(a)) settings.min_choices = a;
      const b = num(q.max_choices); if (b != null && Number.isFinite(b)) settings.max_choices = b;
    }
  }
  return {
    ...(q.id ? { id: q.id } : {}),
    key: q.key, label: q.label, is_required: q.is_required,
    question_type: q.question_type, help_text: q.help_text.trim() || null,
    options,
    default_value: q.default_value.trim() || null,
    validation: Object.keys(validation).length ? validation : null,
    visibility: q.visibility, answer_usage: q.answer_usage,
    target_step_key: q.target_step_key.trim() || null,
    condition: q.cond_source && (q.cond_ref || q.cond_source === "") ? { source: q.cond_source, ref: q.cond_ref, operator: q.cond_operator, ...(NEEDS_VALUE.includes(q.cond_operator) ? { value: q.cond_value } : {}) } : null,
    settings: Object.keys(settings).length ? settings : null,
  };
}

const sel = "h-8 rounded-md border border-slate-200 bg-white px-1.5 text-xs dark:border-slate-700 dark:bg-slate-900";
const num = "h-8 w-20 text-xs";
const Lbl = ({ text, children, className = "" }: { text: string; children: React.ReactNode; className?: string }) => (
  <label className={`flex min-w-0 flex-col gap-0.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300 ${className}`}>{text}{children}</label>
);

/** Editor das opções (seleção única/múltipla/lista): adicionar, editar, excluir, ordenar e marcar padrão. */
export function OptionsEditor({ opts, onChange, multiple }: { opts: OptionDraft[]; onChange: (o: OptionDraft[]) => void; multiple: boolean }) {
  const set = (i: number, patch: Partial<OptionDraft>) => onChange(opts.map((o, k) => (k === i ? { ...o, ...patch } : !multiple && patch.is_default ? { ...o, is_default: false } : o)));
  const move = (i: number, d: number) => { const j = i + d; if (j < 0 || j >= opts.length) return; const c = opts.slice(); [c[i], c[j]] = [c[j], c[i]]; onChange(c); };
  return (
    <div className="space-y-1" data-testid="options-editor">
      <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Opções (mínimo 2)</p>
      <ul className="space-y-1">
        {opts.map((o, i) => (
          <li key={i} className="flex flex-wrap items-center gap-1" data-testid="option-row">
            <Input className="h-8 min-w-[8rem] flex-1 text-xs" aria-label={`Opção ${i + 1}`} value={o.label} maxLength={80} onChange={(e) => set(i, { label: e.target.value })} />
            <label className="inline-flex items-center gap-1 text-[11px]" title="Opção marcada por padrão"><input type={multiple ? "checkbox" : "radio"} checked={o.is_default} onChange={(e) => set(i, { is_default: multiple ? e.target.checked : true })} onClick={() => { if (!multiple && o.is_default) set(i, { is_default: false }); }} aria-label={`Opção ${i + 1} padrão`} />padrão</label>
            <button type="button" className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30" aria-label={`Subir opção ${i + 1}`} disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp className="h-3.5 w-3.5" /></button>
            <button type="button" className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30" aria-label={`Descer opção ${i + 1}`} disabled={i === opts.length - 1} onClick={() => move(i, 1)}><ArrowDown className="h-3.5 w-3.5" /></button>
            <button type="button" className="rounded p-1 text-rose-500 hover:bg-rose-50" aria-label={`Excluir opção ${i + 1}`} onClick={() => onChange(opts.filter((_, k) => k !== i))}><Trash2 className="h-3.5 w-3.5" /></button>
          </li>
        ))}
      </ul>
      <button type="button" className="inline-flex h-7 items-center gap-1 rounded-md border border-violet-300 bg-violet-50 px-2 text-[11px] font-semibold text-violet-700" onClick={() => onChange([...opts, { label: "", is_default: false }])}><Plus className="h-3 w-3" />Adicionar opção</button>
    </div>
  );
}

export function QuestionConfigFields({ q, onChange, ctx }: { q: QuestionDraft; onChange: (patch: Partial<QuestionDraft>) => void; ctx?: QuestionCtx }) {
  const t = q.question_type;
  const isSelect = SELECT_TYPES.includes(t);
  const isFile = FILE_TYPES.includes(t);
  const numeric = t === "numero" || t === "moeda";
  const texty = ["texto_curto", "texto_longo", "url", "email", "telefone", "endereco"].includes(t);
  const showAttach = q.att_allowed || isFile;
  const prevOps = ctx?.otherQuestions.filter((o) => o.key !== q.key) ?? [];
  return (
    <div className="space-y-2 rounded-lg bg-slate-50 p-2 text-xs dark:bg-slate-800/40" data-testid="question-config">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Lbl text="Tipo de resposta">
          <select aria-label="Tipo da pergunta" className={sel} value={t} onChange={(e) => onChange({ question_type: e.target.value })}>{QUESTION_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        </Lbl>
        <Lbl text="Quem vê">
          <select aria-label="Visibilidade da pergunta" className={sel} value={q.visibility} onChange={(e) => onChange({ visibility: e.target.value })}>{VISIBILITY.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        </Lbl>
        <Lbl text="Resposta usada por">
          <select aria-label="Uso da resposta" className={sel} value={q.answer_usage} onChange={(e) => onChange({ answer_usage: e.target.value })}>{USAGE.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        </Lbl>
        {ctx?.sections && ctx.sections.length > 0 && (
          <Lbl text="Seção">
            <select aria-label="Seção da pergunta" className={sel} value={q.section_key} onChange={(e) => onChange({ section_key: e.target.value })}><option value="">Sem seção</option>{ctx.sections.map((s) => <option key={s.key} value={s.key}>{s.name}</option>)}</select>
          </Lbl>
        )}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Lbl text="Texto de ajuda / orientação (opcional)"><Input className="h-8 text-xs" maxLength={1000} aria-label="Texto de ajuda da pergunta" value={q.help_text} onChange={(e) => onChange({ help_text: e.target.value })} /></Lbl>
        {!isFile && !["sim_nao", "aceite", "escala"].includes(t) && !isSelect && <Lbl text="Texto de exemplo (placeholder)"><Input className="h-8 text-xs" maxLength={200} aria-label="Texto de exemplo" value={q.placeholder} onChange={(e) => onChange({ placeholder: e.target.value })} /></Lbl>}
      </div>
      <div className="flex flex-wrap items-center gap-3 text-[11px]">
        <label className="inline-flex items-center gap-1"><input type="checkbox" checked={q.is_required} onChange={(e) => onChange({ is_required: e.target.checked })} aria-label="Pergunta obrigatória" />Obrigatória</label>
        <label className="inline-flex items-center gap-1" title="Desativada: some do contrato e da validação, mas não é apagada"><input type="checkbox" checked={q.is_active} onChange={(e) => onChange({ is_active: e.target.checked })} aria-label="Pergunta ativa" />Ativa</label>
        {!isFile && <label className="inline-flex items-center gap-1"><input type="checkbox" checked={q.att_allowed} onChange={(e) => onChange({ att_allowed: e.target.checked })} aria-label="Permitir anexos junto da resposta" />Permitir anexos junto da resposta</label>}
      </div>
      {isSelect && <OptionsEditor opts={q.opts} multiple={t === "selecao_multipla"} onChange={(opts) => onChange({ opts })} />}
      {isSelect && (
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center gap-1 text-[11px]"><input type="checkbox" checked={q.allow_other} onChange={(e) => onChange({ allow_other: e.target.checked })} aria-label="Permitir a opção Outro" />Permitir “Outro” (com texto)</label>
          {t === "selecao_multipla" && (<>
            <label className="inline-flex items-center gap-1">mín. escolhas <Input className={num} type="number" min={0} aria-label="Mínimo de escolhas" value={q.min_choices} onChange={(e) => onChange({ min_choices: e.target.value })} /></label>
            <label className="inline-flex items-center gap-1">máx. escolhas <Input className={num} type="number" min={1} aria-label="Máximo de escolhas" value={q.max_choices} onChange={(e) => onChange({ max_choices: e.target.value })} /></label>
          </>)}
        </div>
      )}
      {t === "escala" && (
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-1">de <Input className={num} type="number" aria-label="Escala: início" value={q.scale_min} onChange={(e) => onChange({ scale_min: e.target.value })} /></label>
          <label className="inline-flex items-center gap-1">até <Input className={num} type="number" aria-label="Escala: fim" value={q.scale_max} onChange={(e) => onChange({ scale_max: e.target.value })} /></label>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {!isFile && t !== "acesso_ativo" && t !== "aceite" && <Lbl text="Resposta padrão" className="w-40"><Input className="h-8 text-xs" aria-label="Valor padrão" value={q.default_value} onChange={(e) => onChange({ default_value: e.target.value })} /></Lbl>}
        {numeric && (<>
          <Lbl text="Mínimo"><Input className={num} type="number" aria-label="Valor mínimo" value={q.min} onChange={(e) => onChange({ min: e.target.value })} /></Lbl>
          <Lbl text="Máximo"><Input className={num} type="number" aria-label="Valor máximo" value={q.max} onChange={(e) => onChange({ max: e.target.value })} /></Lbl>
        </>)}
        {texty && (<>
          <Lbl text="Mín. caracteres"><Input className={num} type="number" aria-label="Mínimo de caracteres" value={q.min_length} onChange={(e) => onChange({ min_length: e.target.value })} /></Lbl>
          <Lbl text="Máx. caracteres"><Input className={num} type="number" aria-label="Máximo de caracteres" value={q.max_length} onChange={(e) => onChange({ max_length: e.target.value })} /></Lbl>
        </>)}
      </div>
      {showAttach && (
        <fieldset className="space-y-1.5 rounded-md border border-slate-200 p-2 dark:border-slate-700" data-testid="attachment-config">
          <legend className="px-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">{isFile ? "Arquivo da resposta" : "Anexos junto da resposta"}</legend>
          <div className="flex flex-wrap items-end gap-2">
            <Lbl text={`Tipos permitidos (padrão: ${DEFAULT_ACCEPT_HINT[t] ?? "qualquer tipo seguro"})`} className="min-w-[14rem] flex-1"><Input className="h-8 text-xs" aria-label="Tipos de arquivo permitidos" placeholder=".pdf, .png, .docx" value={q.att_accept} onChange={(e) => onChange({ att_accept: e.target.value })} /></Lbl>
            <Lbl text="Máx. anexos"><Input className={num} type="number" min={1} max={20} aria-label="Quantidade máxima de anexos" value={q.att_max_files} onChange={(e) => onChange({ att_max_files: e.target.value })} /></Lbl>
            <Lbl text="Tamanho máx. (MB)"><Input className={num} type="number" min={1} max={200} aria-label="Tamanho máximo por arquivo em MB" value={q.att_max_size_mb} onChange={(e) => onChange({ att_max_size_mb: e.target.value })} /></Lbl>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[11px]">
            {!isFile && <label className="inline-flex items-center gap-1"><input type="checkbox" checked={q.att_required} onChange={(e) => onChange({ att_required: e.target.checked })} aria-label="Anexo obrigatório" />Anexo obrigatório</label>}
            <label className="inline-flex items-center gap-1"><input type="checkbox" checked={q.att_require_description} onChange={(e) => onChange({ att_require_description: e.target.checked })} aria-label="Exigir descrição do arquivo" />Exigir descrição de cada arquivo</label>
          </div>
          <p className="text-[10px] text-slate-500">O servidor confere a extensão, o tipo real do arquivo e o tamanho. Executáveis e páginas ativas (.exe, .js, .html, .svg…) nunca são aceitos.</p>
        </fieldset>
      )}
      {t === "acesso_ativo" && <p className="text-[11px] text-slate-500">O cliente escolhe um acesso ou ativo já cadastrado pela empresa dele (nunca digita senha).</p>}
      {ctx && (
        <div className="space-y-1.5" data-testid="question-routing">
          <div className="flex flex-wrap items-end gap-2">
            <Lbl text="Resposta vai para">
              <select aria-label="Resposta vai para" className={sel} value={q.target_step_key} onChange={(e) => onChange({ target_step_key: e.target.value })}>
                <option value="">A tarefa toda</option>
                {ctx.steps.map((s) => <option key={s.key} value={s.key}>Etapa: {s.name}</option>)}
              </select>
            </Lbl>
            <Lbl text="Quando a pergunta aparece">
              <select aria-label="Quando a pergunta aparece" className={sel} value={q.cond_source} onChange={(e) => onChange({ cond_source: e.target.value, cond_ref: "", cond_value: "", cond_operator: e.target.value === "answer" ? "eq" : "selected" })}>
                {COND_SOURCES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Lbl>
          </div>
          {q.cond_source === "variation_option" && (
            <select aria-label="Opção de variação da condição" className={sel} value={q.cond_ref} onChange={(e) => onChange({ cond_ref: e.target.value })}>
              <option value="">Escolha a opção…</option>
              {ctx.variations.flatMap((v) => v.options.map((o) => <option key={`${v.key}/${o.key}`} value={o.key}>{v.name}: {o.label}</option>))}
            </select>
          )}
          {q.cond_source === "addon" && (
            <select aria-label="Adicional da condição" className={sel} value={q.cond_ref} onChange={(e) => onChange({ cond_ref: e.target.value })}>
              <option value="">Escolha o adicional…</option>
              {ctx.addons.map((a) => <option key={a.key} value={a.key}>{a.name}</option>)}
            </select>
          )}
          {q.cond_source === "answer" && (
            <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50/60 p-1.5" data-testid="condition-builder">
              <span className="text-[11px] font-semibold text-amber-900">Mostrar esta pergunta quando</span>
              <select aria-label="Pergunta da condição" className={sel} value={q.cond_ref} onChange={(e) => onChange({ cond_ref: e.target.value })}>
                <option value="">a pergunta…</option>
                {prevOps.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
              </select>
              <select aria-label="Operador da condição" className={sel} value={q.cond_operator} onChange={(e) => onChange({ cond_operator: e.target.value })}>
                {ANSWER_OPERATORS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              {NEEDS_VALUE.includes(q.cond_operator) && <Input className="h-8 w-40 text-xs" aria-label="Valor da condição" placeholder="valor" value={q.cond_value} onChange={(e) => onChange({ cond_value: e.target.value })} />}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
