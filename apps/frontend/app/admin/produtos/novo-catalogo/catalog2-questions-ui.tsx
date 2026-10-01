"use client";

// Perguntas dos questionários com TIPO (universal): texto curto/longo, número, valor em reais, data, sim/não,
// escolha única/múltipla, link, e-mail, telefone, arquivo e "acesso ou ativo do cliente".
// Cada pergunta tem ajuda, opções, valor padrão, validação, visibilidade e uso da resposta (equipe, IA ou ambos).
import { Input } from "@/components/ui/input";

export const QUESTION_TYPES: [string, string][] = [
  ["texto_curto", "Texto curto"], ["texto_longo", "Texto longo"], ["numero", "Número"], ["moeda", "Valor em reais"], ["data", "Data"],
  ["sim_nao", "Sim ou não"], ["selecao_unica", "Escolha uma opção"], ["selecao_multipla", "Escolha várias opções"], ["url", "Endereço (link)"],
  ["email", "E-mail"], ["telefone", "Telefone"], ["arquivo", "Arquivo / anexo"], ["acesso_ativo", "Acesso ou ativo do cliente"],
];
export const questionTypeLabel = (t?: string | null) => QUESTION_TYPES.find(([k]) => k === t)?.[1] ?? "Texto longo";
const VISIBILITY: [string, string][] = [["client", "Cliente responde"], ["team", "Só equipe"], ["internal", "Só interno"]];
const USAGE: [string, string][] = [["both", "Pessoa e IA leem"], ["human", "Só pessoa"], ["ai", "Só IA"]];

export interface QuestionDraft {
  key: string; label: string; is_required: boolean;
  question_type: string; help_text: string; options_text: string; default_value: string;
  min: string; max: string; min_length: string; max_length: string; max_files: string; max_size_mb: string;
  visibility: string; answer_usage: string;
}
export const emptyQuestion = (): Omit<QuestionDraft, "key" | "label" | "is_required"> => ({
  question_type: "texto_longo", help_text: "", options_text: "", default_value: "", min: "", max: "", min_length: "", max_length: "", max_files: "", max_size_mb: "", visibility: "client", answer_usage: "both",
});
/** Pergunta que veio do servidor → rascunho editável (opções uma por linha). */
export function draftFromServer(q: any): QuestionDraft {
  const v = q.validation ?? {};
  return {
    key: q.key, label: q.label, is_required: q.is_required,
    question_type: q.question_type ?? "texto_longo", help_text: q.help_text ?? "", options_text: (q.options ?? []).map((o: any) => o.label ?? o.value).join("\n"), default_value: q.default_value ?? "",
    min: v.min != null ? String(v.min) : "", max: v.max != null ? String(v.max) : "", min_length: v.min_length != null ? String(v.min_length) : "", max_length: v.max_length != null ? String(v.max_length) : "",
    max_files: v.max_files != null ? String(v.max_files) : "", max_size_mb: v.max_size_mb != null ? String(v.max_size_mb) : "",
    visibility: q.visibility ?? "client", answer_usage: q.answer_usage ?? "both",
  };
}
/** Rascunho → corpo aceito pela API (campos vazios não entram). */
export function payloadFromDraft(q: QuestionDraft) {
  const num = (s: string) => (s.trim() === "" ? undefined : Number(s));
  const validation: Record<string, number> = {};
  for (const [k, v] of [["min", q.min], ["max", q.max], ["min_length", q.min_length], ["max_length", q.max_length], ["max_files", q.max_files], ["max_size_mb", q.max_size_mb]] as const) { const n = num(v); if (n != null && Number.isFinite(n)) validation[k] = n; }
  const select = q.question_type === "selecao_unica" || q.question_type === "selecao_multipla";
  return {
    key: q.key, label: q.label, is_required: q.is_required,
    question_type: q.question_type, help_text: q.help_text.trim() || null,
    options: select ? q.options_text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean) : null,
    default_value: q.default_value.trim() || null,
    validation: Object.keys(validation).length ? validation : null,
    visibility: q.visibility, answer_usage: q.answer_usage,
  };
}

const sel = "h-7 rounded-md border border-slate-200 bg-white px-1 text-xs dark:border-slate-700 dark:bg-slate-900";
const num = "h-7 w-20 text-xs";

export function QuestionConfigFields({ q, onChange }: { q: QuestionDraft; onChange: (patch: Partial<QuestionDraft>) => void }) {
  const t = q.question_type;
  const isSelect = t === "selecao_unica" || t === "selecao_multipla";
  const numeric = t === "numero" || t === "moeda";
  const texty = t === "texto_curto" || t === "texto_longo" || t === "url" || t === "email" || t === "telefone";
  return (
    <div className="space-y-1.5 rounded-lg bg-slate-50 p-2 text-xs dark:bg-slate-800/40">
      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex items-center gap-1"><span className="font-semibold">Tipo</span>
          <select aria-label="Tipo da pergunta" className={sel} value={t} onChange={(e) => onChange({ question_type: e.target.value })}>{QUESTION_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        </label>
        <label className="inline-flex items-center gap-1"><span className="font-semibold">Quem vê</span>
          <select aria-label="Visibilidade da pergunta" className={sel} value={q.visibility} onChange={(e) => onChange({ visibility: e.target.value })}>{VISIBILITY.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        </label>
        <label className="inline-flex items-center gap-1" title="Quem lê a resposta: uma pessoa, a IA ou os dois"><span className="font-semibold">Resposta usada por</span>
          <select aria-label="Uso da resposta" className={sel} value={q.answer_usage} onChange={(e) => onChange({ answer_usage: e.target.value })}>{USAGE.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        </label>
      </div>
      <Input className="h-7 text-xs" maxLength={1000} placeholder="Texto de ajuda que o cliente vê abaixo da pergunta (opcional)" aria-label="Texto de ajuda da pergunta" value={q.help_text} onChange={(e) => onChange({ help_text: e.target.value })} />
      {isSelect && (
        <label className="block"><span className="font-semibold">Opções (uma por linha, mínimo 2)</span>
          <textarea aria-label="Opções da pergunta" rows={3} className="mt-0.5 w-full rounded-md border border-slate-200 bg-white p-1.5 text-xs dark:border-slate-700 dark:bg-slate-900" value={q.options_text} onChange={(e) => onChange({ options_text: e.target.value })} />
        </label>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {t !== "arquivo" && t !== "acesso_ativo" && <label className="inline-flex items-center gap-1"><span className="font-semibold">Valor padrão</span><Input className="h-7 w-40 text-xs" aria-label="Valor padrão" value={q.default_value} onChange={(e) => onChange({ default_value: e.target.value })} /></label>}
        {numeric && (<>
          <label className="inline-flex items-center gap-1">mínimo <Input className={num} type="number" aria-label="Valor mínimo" value={q.min} onChange={(e) => onChange({ min: e.target.value })} /></label>
          <label className="inline-flex items-center gap-1">máximo <Input className={num} type="number" aria-label="Valor máximo" value={q.max} onChange={(e) => onChange({ max: e.target.value })} /></label>
        </>)}
        {texty && (<>
          <label className="inline-flex items-center gap-1">mín. caracteres <Input className={num} type="number" aria-label="Mínimo de caracteres" value={q.min_length} onChange={(e) => onChange({ min_length: e.target.value })} /></label>
          <label className="inline-flex items-center gap-1">máx. caracteres <Input className={num} type="number" aria-label="Máximo de caracteres" value={q.max_length} onChange={(e) => onChange({ max_length: e.target.value })} /></label>
        </>)}
        {t === "arquivo" && (<>
          <label className="inline-flex items-center gap-1">máx. arquivos <Input className={num} type="number" aria-label="Máximo de arquivos" value={q.max_files} onChange={(e) => onChange({ max_files: e.target.value })} /></label>
          <label className="inline-flex items-center gap-1">tamanho máx. (MB) <Input className={num} type="number" aria-label="Tamanho máximo em MB" value={q.max_size_mb} onChange={(e) => onChange({ max_size_mb: e.target.value })} /></label>
        </>)}
      </div>
      {t === "acesso_ativo" && <p className="text-[11px] text-slate-500">O cliente escolhe um acesso ou ativo já cadastrado pela empresa dele (nunca digita senha).</p>}
    </div>
  );
}
