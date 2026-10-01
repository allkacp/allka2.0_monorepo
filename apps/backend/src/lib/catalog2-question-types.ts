// Tipos de pergunta dos questionários (universal). Cada pergunta: id, chave, rótulo, ajuda, tipo, obrigatoriedade,
// opções, valor padrão, validação, ordem, visibilidade e uso da resposta (humano / IA). Perguntas antigas (texto longo) seguem válidas.

export const QUESTION_TYPES = [
  "texto_curto", "texto_longo", "numero", "moeda", "data", "sim_nao", "selecao_unica", "selecao_multipla",
  "url", "email", "telefone", "arquivo", "acesso_ativo",
] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const QUESTION_TYPE_LABEL: Record<QuestionType, string> = {
  texto_curto: "Texto curto", texto_longo: "Texto longo", numero: "Número", moeda: "Valor em reais", data: "Data", sim_nao: "Sim ou não",
  selecao_unica: "Escolha uma opção", selecao_multipla: "Escolha várias opções", url: "Endereço (link)", email: "E-mail",
  telefone: "Telefone", arquivo: "Arquivo / anexo", acesso_ativo: "Acesso ou ativo do cliente",
};

export const QUESTION_VISIBILITIES = ["client", "team", "internal"] as const;
export const ANSWER_USAGES = ["human", "ai", "both"] as const;

/** Vocabulário que a tela de briefing já conhecia; os tipos novos passam com o próprio nome. */
const LEGACY_TYPE: Partial<Record<QuestionType, string>> = { texto_curto: "text_short", texto_longo: "text_long", selecao_multipla: "multiple_choice" };
export const snapshotType = (t: string) => LEGACY_TYPE[t as QuestionType] ?? t;

export class QuestionConfigError extends Error {
  statusCode = 422; code: string;
  constructor(message: string, code = "question_invalid") { super(message); this.code = code; }
}

export interface QuestionConfigInput {
  question_type?: string | null; options?: unknown; default_value?: string | null; validation?: unknown;
  visibility?: string | null; answer_usage?: string | null; help_text?: string | null;
}
export interface Validation { min?: number; max?: number; min_length?: number; max_length?: number; pattern?: string; max_files?: number; max_size_mb?: number; accept?: string[] }

const SELECT = ["selecao_unica", "selecao_multipla"];

export function parseOptions(json: string | null | undefined): { value: string; label: string }[] {
  try { const v = json ? JSON.parse(json) : []; return Array.isArray(v) ? v.map((o) => (typeof o === "string" ? { value: o, label: o } : { value: String(o.value), label: String(o.label ?? o.value) })) : []; } catch { return []; }
}
export function parseValidation(json: string | null | undefined): Validation {
  try { const v = json ? JSON.parse(json) : {}; return v && typeof v === "object" ? (v as Validation) : {}; } catch { return {}; }
}

/** Valida e normaliza a configuração de UMA pergunta (cadastro). Devolve as colunas a gravar. */
export function normalizeQuestionConfig(input: QuestionConfigInput, current?: { question_type: string; options_json: string | null; default_value: string | null; validation_json: string | null }) {
  const type = (input.question_type ?? current?.question_type ?? "texto_longo") as string;
  if (!(QUESTION_TYPES as readonly string[]).includes(type)) throw new QuestionConfigError(`Tipo de pergunta inválido: "${type}".`, "question_type_invalid");
  const out: Record<string, unknown> = { question_type: type };
  if (input.visibility != null) {
    if (!(QUESTION_VISIBILITIES as readonly string[]).includes(input.visibility)) throw new QuestionConfigError("Visibilidade inválida (use cliente, equipe ou interna).", "question_visibility_invalid");
    out.visibility = input.visibility;
  }
  if (input.answer_usage != null) {
    if (!(ANSWER_USAGES as readonly string[]).includes(input.answer_usage)) throw new QuestionConfigError("Uso da resposta inválido (use humano, IA ou ambos).", "question_usage_invalid");
    out.answer_usage = input.answer_usage;
  }
  if (input.help_text !== undefined) out.help_text = input.help_text?.trim() || null;

  const optionsRaw = input.options !== undefined ? input.options : current?.options_json ? JSON.parse(current.options_json) : undefined;
  if (SELECT.includes(type)) {
    const arr = Array.isArray(optionsRaw) ? optionsRaw : [];
    const opts = arr.map((o) => (typeof o === "string" ? { value: o.trim(), label: o.trim() } : { value: String(o?.value ?? "").trim(), label: String(o?.label ?? o?.value ?? "").trim() })).filter((o) => o.value);
    if (opts.length < 2) throw new QuestionConfigError("Perguntas de escolha precisam de pelo menos 2 opções.", "question_options_required");
    if (new Set(opts.map((o) => o.value)).size !== opts.length) throw new QuestionConfigError("As opções da pergunta não podem se repetir.", "question_options_duplicated");
    out.options_json = JSON.stringify(opts);
  } else if (input.options !== undefined) {
    if (Array.isArray(input.options) && input.options.length) throw new QuestionConfigError("Só perguntas de escolha aceitam opções.", "question_options_not_allowed");
    out.options_json = null;
  } else if (current && !SELECT.includes(type)) out.options_json = null;

  const vRaw = (input.validation !== undefined ? input.validation : current?.validation_json ? JSON.parse(current.validation_json) : null) as Validation | null;
  if (vRaw) {
    const v: Validation = {};
    for (const k of ["min", "max", "min_length", "max_length", "max_files", "max_size_mb"] as const) if (vRaw[k] != null) { if (typeof vRaw[k] !== "number" || !Number.isFinite(vRaw[k])) throw new QuestionConfigError(`Validação "${k}" deve ser um número.`, "question_validation_invalid"); v[k] = vRaw[k]; }
    if (v.min != null && v.max != null && v.min > v.max) throw new QuestionConfigError("O mínimo não pode ser maior que o máximo.", "question_validation_invalid");
    if (v.min_length != null && v.max_length != null && v.min_length > v.max_length) throw new QuestionConfigError("O tamanho mínimo não pode ser maior que o máximo.", "question_validation_invalid");
    if (vRaw.pattern) {
      if (vRaw.pattern.length > 200) throw new QuestionConfigError("Expressão de validação muito longa.", "question_validation_invalid");
      try { new RegExp(vRaw.pattern); } catch { throw new QuestionConfigError("Expressão de validação inválida.", "question_validation_invalid"); }
      v.pattern = vRaw.pattern;
    }
    if (Array.isArray(vRaw.accept)) v.accept = vRaw.accept.map(String);
    out.validation_json = Object.keys(v).length ? JSON.stringify(v) : null;
  } else if (input.validation !== undefined) out.validation_json = null;

  const def = input.default_value !== undefined ? input.default_value : current?.default_value;
  if (input.default_value !== undefined) {
    const d = def == null || def === "" ? null : String(def);
    if (d != null) {
      const err = validateAnswerValue({ type, options: SELECT.includes(type) ? JSON.parse((out.options_json as string | null) ?? "[]") : [], validation: out.validation_json ? JSON.parse(out.validation_json as string) : {} }, d);
      if (err) throw new QuestionConfigError(`O valor padrão não é válido: ${err}`, "question_default_invalid");
    }
    out.default_value = d;
  }
  return out;
}

const URL_RE = /^https?:\/\/[^\s/$.?#][^\s]*$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Valida UM valor de resposta (texto) contra o tipo. Devolve a mensagem de erro em linguagem simples, ou null. */
export function validateAnswerValue(q: { type: string; options?: { value: string }[]; validation?: Validation }, raw: string): string | null {
  const v = q.validation ?? {};
  const value = raw.trim();
  if (value === "") return null;
  if (v.min_length != null && value.length < v.min_length) return `Escreva pelo menos ${v.min_length} caracteres.`;
  if (v.max_length != null && value.length > v.max_length) return `Escreva no máximo ${v.max_length} caracteres.`;
  if (v.pattern && !new RegExp(v.pattern).test(value)) return "O formato da resposta não é o esperado.";
  switch (q.type) {
    case "texto_curto": return value.length > 500 ? "Resposta curta demais para o campo: use no máximo 500 caracteres." : null;
    case "numero": {
      const n = Number(value.replace(",", "."));
      if (!Number.isFinite(n)) return "Informe um número.";
      if (v.min != null && n < v.min) return `O valor mínimo é ${v.min}.`;
      if (v.max != null && n > v.max) return `O valor máximo é ${v.max}.`;
      return null;
    }
    case "moeda": {
      const n = Number(value.replace(/[R$\s.]/g, "").replace(",", "."));
      if (!Number.isFinite(n) || n < 0) return "Informe um valor em reais, como 1500,00.";
      if (v.min != null && n < v.min) return `O valor mínimo é ${v.min}.`;
      if (v.max != null && n > v.max) return `O valor máximo é ${v.max}.`;
      return null;
    }
    case "data": {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value))) return "Informe uma data válida (AAAA-MM-DD).";
      const d = new Date(`${value}T00:00:00Z`);
      return d.toISOString().slice(0, 10) === value ? null : "Essa data não existe.";
    }
    case "sim_nao": return ["sim", "nao", "não", "true", "false"].includes(value.toLowerCase()) ? null : "Responda sim ou não.";
    case "selecao_unica": return (q.options ?? []).some((o) => o.value === value) ? null : "Escolha uma das opções disponíveis.";
    case "selecao_multipla": {
      let arr: unknown;
      try { arr = JSON.parse(value); } catch { arr = value.split(",").map((s) => s.trim()); }
      if (!Array.isArray(arr) || arr.length === 0) return "Escolha pelo menos uma opção.";
      const ok = new Set((q.options ?? []).map((o) => o.value));
      return arr.every((x) => ok.has(String(x))) ? null : "Há opção escolhida que não existe na pergunta.";
    }
    case "url": return URL_RE.test(value) ? null : "Informe um endereço completo, começando com http:// ou https://.";
    case "email": return EMAIL_RE.test(value) ? null : "Informe um e-mail válido.";
    case "telefone": { const d = value.replace(/\D/g, ""); return d.length >= 10 && d.length <= 13 ? null : "Informe um telefone com DDD."; }
    default: return null;
  }
}

export interface SnapshotQuestion {
  question_key: string; question_text: string; type: string; required: boolean;
  description?: string | null; options?: { value: string; label: string }[]; default_value?: string | null;
  validation?: Validation; visibility?: string; answer_usage?: string; sort_order?: number;
}

/** Fotografia da pergunta copiada para a tarefa do projeto (cópia: editar o cadastro depois não a altera). */
export function snapshotQuestion(q: { key: string; label: string; is_required: boolean; sort_order: number; question_type: string; help_text: string | null; options_json: string | null; default_value: string | null; validation_json: string | null; visibility: string; answer_usage: string }): SnapshotQuestion {
  return {
    question_key: q.key, question_text: q.label, type: snapshotType(q.question_type), required: q.is_required,
    description: q.help_text, options: parseOptions(q.options_json), default_value: q.default_value, validation: parseValidation(q.validation_json),
    visibility: q.visibility, answer_usage: q.answer_usage, sort_order: q.sort_order,
    // tipo do cadastro (inclui os novos); a tela antiga continua lendo `type`
    ...({ question_type: q.question_type } as object),
  };
}

const REVERSE_LEGACY: Record<string, QuestionType> = { text_short: "texto_curto", text_long: "texto_longo", multiple_choice: "selecao_multipla" };

/** Valida as respostas de um briefing contra as perguntas fotografadas na tarefa. `final` exige as obrigatórias. */
export function validateBriefingAnswers(snapshotJson: string | null, answers: { question_key: string; answer?: string | null; files?: string | null; links?: string | null }[], opts: { final: boolean; existing?: { question_key: string; answer: string | null; files: string | null }[] }): { key: string; message: string }[] {
  const errors: { key: string; message: string }[] = [];
  let questions: SnapshotQuestion[] = [];
  try { const p = snapshotJson ? JSON.parse(snapshotJson) : []; questions = Array.isArray(p) ? p.filter((x) => x && typeof x === "object") : []; } catch { questions = []; }
  if (questions.length === 0) return errors;
  const byKey = new Map(questions.map((q) => [q.question_key, q]));
  const merged = new Map<string, { answer: string | null; files: string | null }>();
  for (const e of opts.existing ?? []) merged.set(e.question_key, { answer: e.answer, files: e.files });
  for (const a of answers) merged.set(a.question_key, { answer: a.answer ?? null, files: a.files ?? null });
  for (const a of answers) {
    const q = byKey.get(a.question_key);
    if (!q) continue; // perguntas fora da fotografia (legado) continuam aceitas
    const t = ((q as unknown as { question_type?: string }).question_type ?? REVERSE_LEGACY[q.type] ?? q.type) as string;
    if (t === "arquivo") {
      if (a.files) {
        let arr: unknown[] = [];
        try { arr = JSON.parse(a.files); } catch { errors.push({ key: q.question_key, message: "Arquivo em formato inválido." }); continue; }
        if (!Array.isArray(arr)) { errors.push({ key: q.question_key, message: "Arquivo em formato inválido." }); continue; }
        const v = q.validation ?? {};
        if (v.max_files != null && arr.length > v.max_files) errors.push({ key: q.question_key, message: `Envie no máximo ${v.max_files} arquivo(s).` });
        if (v.max_size_mb != null && arr.some((f) => Number((f as { size?: number }).size ?? 0) > v.max_size_mb! * 1024 * 1024)) errors.push({ key: q.question_key, message: `Cada arquivo pode ter no máximo ${v.max_size_mb} MB.` });
      }
      continue;
    }
    if (a.answer != null && a.answer !== "") {
      const err = validateAnswerValue({ type: t, options: q.options, validation: q.validation }, a.answer);
      if (err) errors.push({ key: q.question_key, message: err });
    }
  }
  if (opts.final) {
    for (const q of questions) {
      if (!q.required) continue;
      const t = ((q as unknown as { question_type?: string }).question_type ?? REVERSE_LEGACY[q.type] ?? q.type) as string;
      const m = merged.get(q.question_key);
      const filled = t === "arquivo" ? !!m?.files && m.files !== "[]" : !!m?.answer && m.answer.trim() !== "";
      if (!filled) errors.push({ key: q.question_key, message: "Resposta obrigatória." });
    }
  }
  return errors;
}
