// Tipos de pergunta dos questionários (universal). Cada pergunta: id, chave, rótulo, ajuda, tipo, obrigatoriedade,
// opções, valor padrão, validação, ordem, visibilidade e uso da resposta (humano / IA). Perguntas antigas (texto longo) seguem válidas.

export const QUESTION_TYPES = [
  "texto_curto", "texto_longo", "numero", "moeda", "data", "hora", "data_hora", "sim_nao",
  "selecao_unica", "selecao_multipla", "lista_suspensa", "escala", "telefone", "email", "url", "endereco",
  "arquivo", "imagem", "video", "audio", "documento", "aceite", "acesso_ativo",
] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const QUESTION_TYPE_LABEL: Record<QuestionType, string> = {
  texto_curto: "Texto curto", texto_longo: "Texto longo", numero: "Número", moeda: "Moeda (valor em reais)", data: "Data", hora: "Hora", data_hora: "Data e hora",
  sim_nao: "Sim ou não", selecao_unica: "Seleção única", selecao_multipla: "Seleção múltipla", lista_suspensa: "Lista suspensa", escala: "Escala ou nota",
  telefone: "Telefone", email: "E-mail", url: "URL (link)", endereco: "Endereço", arquivo: "Anexo de arquivo", imagem: "Imagem", video: "Vídeo", audio: "Áudio",
  documento: "Documento", aceite: "Aceite ou confirmação", acesso_ativo: "Acesso ou ativo do cliente",
};
/** Tipos de escolha (têm opções). */
export const SELECT_TYPES: readonly string[] = ["selecao_unica", "selecao_multipla", "lista_suspensa"];
/** Tipos cuja resposta principal é um arquivo enviado. */
export const FILE_TYPES: readonly string[] = ["arquivo", "imagem", "video", "audio", "documento"];

export const QUESTION_VISIBILITIES = ["client", "team", "internal", "both"] as const;
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
  /** Etapa que usa a resposta (chave da etapa). null/"" = a tarefa toda. */
  target_step_key?: string | null;
  /** Quando a pergunta aparece: depende de variação/adicional escolhidos ou de uma resposta anterior. null = sempre. */
  condition?: unknown;
  /** Configuração estendida (placeholder, ativa/inativa, seção, anexos, escala, limites de escolha). */
  settings?: unknown;
}

/** Condição de exibição de uma pergunta (16/10): por variação, adicional ou resposta anterior. */
export const QUESTION_CONDITION_SOURCES = ["variation_option", "addon", "answer"] as const;
export const QUESTION_CONDITION_OPERATORS = ["selected", "not_selected", "eq", "neq", "contains", "gt", "lt", "attached", "not_attached"] as const;
/** Operadores que precisam de um valor de comparação. */
export const CONDITION_NEEDS_VALUE: readonly string[] = ["eq", "neq", "contains", "gt", "lt"];
export interface QuestionCondition { source: (typeof QUESTION_CONDITION_SOURCES)[number]; ref: string; operator: (typeof QUESTION_CONDITION_OPERATORS)[number]; value?: string }
export function parseQuestionCondition(json: string | null | undefined): QuestionCondition | null {
  try {
    const v = json ? JSON.parse(json) : null;
    return v && typeof v === "object" && (QUESTION_CONDITION_SOURCES as readonly string[]).includes(v.source) && typeof v.ref === "string" && (QUESTION_CONDITION_OPERATORS as readonly string[]).includes(v.operator) ? (v as QuestionCondition) : null;
  } catch { return null; }
}
/** Valida a condição vinda do cadastro e devolve o JSON a gravar (null = sem condição). */
export function normalizeQuestionCondition(raw: unknown): string | null {
  if (raw == null || raw === "") return null;
  const v = (typeof raw === "string" ? (() => { try { return JSON.parse(raw); } catch { return null; } })() : raw) as Record<string, unknown> | null;
  if (!v || typeof v !== "object") throw new QuestionConfigError("Condição da pergunta inválida.", "question_condition_invalid");
  if (!(QUESTION_CONDITION_SOURCES as readonly string[]).includes(String(v.source))) throw new QuestionConfigError("A condição precisa depender de uma variação, de um adicional ou de uma resposta anterior.", "question_condition_invalid");
  const ref = String(v.ref ?? "").trim();
  if (!ref) throw new QuestionConfigError("Escolha de qual variação/adicional/pergunta a condição depende.", "question_condition_invalid");
  if (!(QUESTION_CONDITION_OPERATORS as readonly string[]).includes(String(v.operator))) throw new QuestionConfigError("Operador da condição inválido.", "question_condition_invalid");
  const needsValue = CONDITION_NEEDS_VALUE.includes(String(v.operator));
  if (needsValue && !String(v.value ?? "").trim()) throw new QuestionConfigError("Informe o valor da comparação.", "question_condition_invalid");
  if ((v.operator === "gt" || v.operator === "lt") && !Number.isFinite(Number(String(v.value).replace(",", ".")))) throw new QuestionConfigError("Para “maior/menor que” informe um número.", "question_condition_invalid");
  if ((v.operator === "attached" || v.operator === "not_attached") && v.source !== "answer") throw new QuestionConfigError("“Foi anexado arquivo” só vale para a resposta de outra pergunta.", "question_condition_invalid");
  return JSON.stringify({ source: v.source, ref, operator: v.operator, ...(needsValue ? { value: String(v.value).trim() } : {}) });
}
/** A pergunta entra na contratação? Variação/adicional são decididos pela seleção; "resposta anterior" só se decide no preenchimento (aqui sempre entra). */
export function questionConditionMet(cond: QuestionCondition | null, sel: { variation_option_keys?: string[]; addon_keys?: string[] }): boolean {
  if (!cond || cond.source === "answer") return true;
  const picked = cond.source === "variation_option" ? (sel.variation_option_keys ?? []) : (sel.addon_keys ?? []);
  const has = picked.includes(cond.ref);
  return cond.operator === "not_selected" || cond.operator === "neq" ? !has : has;
}
export interface Validation { min?: number; max?: number; min_length?: number; max_length?: number; pattern?: string; max_files?: number; max_size_mb?: number; accept?: string[] }

const SELECT = SELECT_TYPES as string[];

export interface QuestionOption { value: string; label: string; is_default?: boolean }
export function parseOptions(json: string | null | undefined): QuestionOption[] {
  try {
    const v = json ? JSON.parse(json) : [];
    return Array.isArray(v) ? v.map((o) => (typeof o === "string" ? { value: o, label: o } : { value: String(o.value), label: String(o.label ?? o.value), ...(o.is_default ? { is_default: true } : {}) })) : [];
  } catch { return []; }
}

/** Configuração estendida da pergunta (settings_json): placeholder, ativa/inativa, seção, anexos, escala e limites de escolha. */
export const ATTACH_EXTENSIONS_HELP = "Ex.: .pdf, .png, .jpg, .docx, .xlsx, .mp4, .mp3";
export interface QuestionSettings {
  placeholder?: string;
  /** false = pergunta desativada (some do contrato e da validação, sem ser apagada). Padrão: ativa. */
  is_active?: boolean;
  section_key?: string | null;
  attachments?: { allowed: boolean; required?: boolean; accept?: string[]; max_files?: number; max_size_mb?: number; require_description?: boolean };
  scale?: { min: number; max: number; min_label?: string; max_label?: string };
  allow_other?: boolean; min_choices?: number; max_choices?: number;
}
export const questionIsActive = (st: QuestionSettings | null | undefined) => st?.is_active !== false;
export function parseQuestionSettings(json: string | null | undefined): QuestionSettings {
  try { const v = json ? JSON.parse(json) : {}; return v && typeof v === "object" ? (v as QuestionSettings) : {}; } catch { return {}; }
}
const EXT_RE = /^\.[a-z0-9]{1,10}$/;
/** Valida a configuração estendida vinda do cadastro e devolve o JSON a gravar (null = tudo padrão). */
export function normalizeQuestionSettings(raw: unknown, type: string, optionCount?: number): string | null {
  if (raw == null) return null;
  if (typeof raw !== "object") throw new QuestionConfigError("Configuração da pergunta inválida.", "question_settings_invalid");
  const r = raw as Record<string, any>;
  const out: QuestionSettings = {};
  if (r.placeholder != null && String(r.placeholder).trim()) out.placeholder = String(r.placeholder).trim().slice(0, 200);
  if (r.is_active === false) out.is_active = false;
  if (r.section_key != null && String(r.section_key).trim()) out.section_key = String(r.section_key).trim().slice(0, 60);
  const a = r.attachments;
  if (a && typeof a === "object" && (a.allowed || FILE_TYPES.includes(type))) {
    const att: NonNullable<QuestionSettings["attachments"]> = { allowed: true };
    if (a.required) att.required = true;
    if (a.require_description) att.require_description = true;
    if (Array.isArray(a.accept) && a.accept.length) {
      const acc = a.accept.map((x: unknown) => String(x).trim().toLowerCase()).map((x: string) => (x.startsWith(".") ? x : `.${x}`));
      if (acc.some((x: string) => !EXT_RE.test(x))) throw new QuestionConfigError("Tipo de arquivo inválido. Use extensões como .pdf, .png, .docx.", "question_attachment_invalid");
      const blocked = acc.filter((x: string) => BLOCKED_ANSWER_EXTENSIONS.has(x));
      if (blocked.length) throw new QuestionConfigError(`Arquivos ${blocked.join(", ")} não são permitidos por segurança.`, "question_attachment_blocked");
      att.accept = [...new Set<string>(acc)];
    }
    for (const k of ["max_files", "max_size_mb"] as const) if (a[k] != null && a[k] !== "") {
      const n = Number(a[k]);
      if (!Number.isInteger(n) || n < 1 || n > (k === "max_files" ? 20 : 200)) throw new QuestionConfigError(k === "max_files" ? "A quantidade máxima de anexos vai de 1 a 20." : "O tamanho máximo por arquivo vai de 1 a 200 MB.", "question_attachment_invalid");
      att[k] = n;
    }
    out.attachments = att;
  }
  if (type === "escala") {
    const sc = r.scale ?? {};
    const min = Number(sc.min ?? 1), max = Number(sc.max ?? 5);
    if (!Number.isInteger(min) || !Number.isInteger(max) || min >= max || max - min > 20) throw new QuestionConfigError("A escala precisa de mínimo menor que o máximo (até 21 pontos).", "question_scale_invalid");
    out.scale = { min, max, ...(sc.min_label ? { min_label: String(sc.min_label).slice(0, 40) } : {}), ...(sc.max_label ? { max_label: String(sc.max_label).slice(0, 40) } : {}) };
  }
  if (SELECT.includes(type)) {
    if (r.allow_other) out.allow_other = true;
    for (const k of ["min_choices", "max_choices"] as const) if (r[k] != null && r[k] !== "") {
      const n = Number(r[k]);
      if (!Number.isInteger(n) || n < 0 || n > 50) throw new QuestionConfigError("Quantidade de escolhas inválida.", "question_choices_invalid");
      out[k] = n;
    }
    if (type !== "selecao_multipla") { delete out.min_choices; delete out.max_choices; }
    if (out.min_choices != null && out.max_choices != null && out.min_choices > out.max_choices) throw new QuestionConfigError("O mínimo de escolhas não pode ser maior que o máximo.", "question_choices_invalid");
    if (out.max_choices != null && optionCount != null && !out.allow_other && out.max_choices > optionCount) throw new QuestionConfigError("O máximo de escolhas é maior que o número de opções.", "question_choices_invalid");
  }
  return Object.keys(out).length ? JSON.stringify(out) : null;
}
/** Extensões que nunca podem ser aceitas como anexo de resposta (conteúdo executável/ativo). */
export const BLOCKED_ANSWER_EXTENSIONS = new Set([
  ".exe", ".msi", ".bat", ".cmd", ".com", ".scr", ".pif", ".vbs", ".vbe", ".js", ".jse", ".wsf", ".ps1", ".sh", ".jar", ".html", ".htm", ".xhtml", ".svg", ".hta", ".dll", ".apk", ".php", ".py", ".rb", ".pl", ".lnk",
]);
/** Extensões padrão de cada tipo de anexo (quando a pergunta não restringe). */
export const DEFAULT_ACCEPT: Record<string, string[]> = {
  imagem: [".jpg", ".jpeg", ".png", ".webp", ".gif"],
  video: [".mp4", ".mov", ".webm", ".mkv"],
  audio: [".mp3", ".wav", ".m4a", ".ogg"],
  documento: [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".txt", ".csv", ".odt", ".ods"],
};
export function parseValidation(json: string | null | undefined): Validation {
  try { const v = json ? JSON.parse(json) : {}; return v && typeof v === "object" ? (v as Validation) : {}; } catch { return {}; }
}

/** Valida e normaliza a configuração de UMA pergunta (cadastro). Devolve as colunas a gravar. */
export function normalizeQuestionConfig(input: QuestionConfigInput, current?: { question_type: string; options_json: string | null; default_value: string | null; validation_json: string | null; settings_json?: string | null }) {
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
  if (input.target_step_key !== undefined) out.target_step_key = input.target_step_key?.toString().trim() || null;
  if (input.condition !== undefined) out.condition_json = normalizeQuestionCondition(input.condition);

  const optionsRaw = input.options !== undefined ? input.options : current?.options_json ? JSON.parse(current.options_json) : undefined;
  if (SELECT.includes(type)) {
    const arr = Array.isArray(optionsRaw) ? optionsRaw : [];
    const opts: QuestionOption[] = arr.map((o) => (typeof o === "string" ? { value: o.trim(), label: o.trim() } : { value: String(o?.value ?? "").trim(), label: String(o?.label ?? o?.value ?? "").trim(), ...(o?.is_default ? { is_default: true } : {}) })).filter((o) => o.value);
    if (opts.length < 2) throw new QuestionConfigError("Perguntas de escolha precisam de pelo menos 2 opções.", "question_options_required");
    if (new Set(opts.map((o) => o.value)).size !== opts.length) throw new QuestionConfigError("As opções da pergunta não podem se repetir.", "question_options_duplicated");
    if (type !== "selecao_multipla" && opts.filter((o) => o.is_default).length > 1) throw new QuestionConfigError("Só uma opção pode ser a padrão neste tipo de pergunta.", "question_options_default");
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

  if (input.settings !== undefined) {
    const optCount = SELECT.includes(type) ? JSON.parse((out.options_json as string | null) ?? current?.options_json ?? "[]").length : undefined;
    out.settings_json = normalizeQuestionSettings(input.settings, type, optCount);
  }
  const def = input.default_value !== undefined ? input.default_value : current?.default_value;
  if (input.default_value !== undefined) {
    const d = def == null || def === "" ? null : String(def);
    if (d != null) {
      const err = validateAnswerValue({ type, options: SELECT.includes(type) ? JSON.parse((out.options_json as string | null) ?? current?.options_json ?? "[]") : [], validation: out.validation_json ? JSON.parse(out.validation_json as string) : {}, settings: out.settings_json ? JSON.parse(out.settings_json as string) : parseQuestionSettings(current?.settings_json) }, d);
      if (err) throw new QuestionConfigError(`O valor padrão não é válido: ${err}`, "question_default_invalid");
    }
    out.default_value = d;
  }
  return out;
}

const URL_RE = /^https?:\/\/[^\s/$.?#][^\s]*$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const NOT_APPLICABLE = "__na__";
const OTHER_PREFIX = "outro:";
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATETIME_RE = /^\d{4}-\d{2}-\d{2}[T ]([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;
const TRUTHY = ["sim", "true", "1", "on", "aceito", "confirmado"];

function selectedValues(value: string): string[] | null {
  let arr: unknown;
  try { arr = JSON.parse(value); } catch { arr = value.split(",").map((x) => x.trim()).filter(Boolean); }
  return Array.isArray(arr) ? arr.map(String) : null;
}

/** Valida UM valor de resposta (texto) contra o tipo. Devolve a mensagem de erro em linguagem simples, ou null. */
export function validateAnswerValue(q: { type: string; options?: { value: string }[]; validation?: Validation; settings?: QuestionSettings }, raw: string): string | null {
  const v = q.validation ?? {};
  const st = q.settings ?? {};
  const value = raw.trim();
  if (value === "") return null;
  if (FILE_TYPES.includes(q.type)) return null; // a resposta principal é o arquivo (validado à parte)
  if (v.min_length != null && value.length < v.min_length) return `Escreva pelo menos ${v.min_length} caracteres.`;
  if (v.max_length != null && value.length > v.max_length) return `Escreva no máximo ${v.max_length} caracteres.`;
  if (v.pattern && !new RegExp(v.pattern).test(value)) return "O formato da resposta não é o esperado.";
  const okOption = (x: string) => (q.options ?? []).some((o) => o.value === x) || (!!st.allow_other && x.startsWith(OTHER_PREFIX) && x.slice(OTHER_PREFIX.length).trim() !== "");
  switch (q.type) {
    case "texto_curto": return value.length > 500 ? "Resposta curta demais para o campo: use no máximo 500 caracteres." : null;
    case "endereco": return value.length < 5 ? "Informe o endereço completo (rua, número, cidade)." : null;
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
    case "escala": {
      const sc = st.scale ?? { min: 1, max: 5 };
      const n = Number(value);
      return Number.isInteger(n) && n >= sc.min && n <= sc.max ? null : `Escolha uma nota de ${sc.min} a ${sc.max}.`;
    }
    case "data": {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value))) return "Informe uma data válida (AAAA-MM-DD).";
      const d = new Date(`${value}T00:00:00Z`);
      return d.toISOString().slice(0, 10) === value ? null : "Essa data não existe.";
    }
    case "hora": return TIME_RE.test(value) ? null : "Informe uma hora válida (HH:MM).";
    case "data_hora": return DATETIME_RE.test(value) && !Number.isNaN(Date.parse(value.replace(" ", "T"))) ? null : "Informe data e hora válidas (AAAA-MM-DD HH:MM).";
    case "sim_nao": return ["sim", "nao", "não", "true", "false"].includes(value.toLowerCase()) ? null : "Responda sim ou não.";
    case "aceite": return TRUTHY.includes(value.toLowerCase()) ? null : "Marque a caixa para confirmar.";
    case "selecao_unica":
    case "lista_suspensa": return okOption(value) ? null : "Escolha uma das opções disponíveis.";
    case "selecao_multipla": {
      const arr = selectedValues(value);
      if (!arr || arr.length === 0) return "Escolha pelo menos uma opção.";
      if (!arr.every(okOption)) return "Há opção escolhida que não existe na pergunta.";
      if (st.min_choices != null && arr.length < st.min_choices) return `Escolha pelo menos ${st.min_choices} opção(ões).`;
      if (st.max_choices != null && arr.length > st.max_choices) return `Escolha no máximo ${st.max_choices} opção(ões).`;
      return null;
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
  /** Etapa que usa a resposta (chave) e condição de exibição (quando houver). */
  target_step_key?: string | null; condition?: QuestionCondition | null;
  /** ID permanente da pergunta, versão do questionário de origem e configuração estendida (placeholder, anexos, escala, seção…). */
  question_id?: string; questionnaire_id?: string; questionnaire_revision?: number;
  settings?: QuestionSettings; placeholder?: string | null;
  section_key?: string | null; section_name?: string | null; section_description?: string | null;
}

/** Fotografia da pergunta copiada para a tarefa do projeto (cópia: editar o cadastro depois não a altera). */
export function snapshotQuestion(q: { id?: string; settings_json?: string | null; key: string; label: string; is_required: boolean; sort_order: number; question_type: string; help_text: string | null; options_json: string | null; default_value: string | null; validation_json: string | null; visibility: string; answer_usage: string; target_step_key?: string | null; condition_json?: string | null }, meta?: { questionnaireId?: string; revision?: number; sections?: { key: string; name: string; description?: string | null }[] }): SnapshotQuestion {
  const settings = parseQuestionSettings(q.settings_json);
  const section = settings.section_key ? meta?.sections?.find((x) => x.key === settings.section_key) : undefined;
  return {
    question_key: q.key, question_text: q.label, type: snapshotType(q.question_type), required: q.is_required,
    description: q.help_text, options: parseOptions(q.options_json), default_value: q.default_value, validation: parseValidation(q.validation_json),
    visibility: q.visibility, answer_usage: q.answer_usage, sort_order: q.sort_order,
    ...(q.target_step_key ? { target_step_key: q.target_step_key } : {}),
    ...(q.condition_json ? { condition: parseQuestionCondition(q.condition_json) } : {}),
    ...(q.id ? { question_id: q.id } : {}),
    ...(meta?.questionnaireId ? { questionnaire_id: meta.questionnaireId, questionnaire_revision: meta.revision ?? 1 } : {}),
    ...(Object.keys(settings).length ? { settings } : {}),
    ...(settings.placeholder ? { placeholder: settings.placeholder } : {}),
    ...(section ? { section_key: section.key, section_name: section.name, section_description: section.description ?? null } : {}),
    // tipo do cadastro (inclui os novos); a tela antiga continua lendo `type`
    ...({ question_type: q.question_type } as object),
  };
}

const REVERSE_LEGACY: Record<string, QuestionType> = { text_short: "texto_curto", text_long: "texto_longo", multiple_choice: "selecao_multipla" };

export interface BriefingFileRef { id?: string; name?: string; size?: number; mime_type?: string; description?: string }
const typeOf = (q: SnapshotQuestion): string => ((q as unknown as { question_type?: string }).question_type ?? REVERSE_LEGACY[q.type] ?? q.type) as string;
const filesOf = (raw: string | null | undefined): BriefingFileRef[] | null => {
  if (!raw) return [];
  try { const a = JSON.parse(raw); return Array.isArray(a) ? a.filter((x) => x && typeof x === "object") : null; } catch { return null; }
};
export interface AnswerLike { answer: string | null; files: string | null }

/** A condição (resposta anterior) está atendida? Condições de variação/adicional já foram resolvidas na geração (aqui valem como atendidas). */
export function conditionMetByAnswers(cond: QuestionCondition | null | undefined, answers: Map<string, AnswerLike>): boolean {
  if (!cond || cond.source !== "answer") return true;
  const a = answers.get(cond.ref);
  const text = (a?.answer ?? "").trim();
  const files = filesOf(a?.files) ?? [];
  const hasFiles = files.some((f) => !!f.id || !!f.name);
  switch (cond.operator) {
    case "selected": return text !== "" || hasFiles;
    case "not_selected": return text === "" && !hasFiles;
    case "eq": { const arr = selectedValues(text); return text === (cond.value ?? "") || (!!arr && arr.length > 1 && arr.includes(cond.value ?? "")); }
    case "neq": { const arr = selectedValues(text); return !(text === (cond.value ?? "") || (!!arr && arr.length > 1 && arr.includes(cond.value ?? ""))); }
    case "contains": return text.toLowerCase().includes((cond.value ?? "").toLowerCase());
    case "gt": return Number(text.replace(",", ".")) > Number(String(cond.value).replace(",", "."));
    case "lt": return text !== "" && Number(text.replace(",", ".")) < Number(String(cond.value).replace(",", "."));
    case "attached": return hasFiles;
    case "not_attached": return !hasFiles;
    default: return true;
  }
}

function parseSnapshot(snapshotJson: string | null): SnapshotQuestion[] {
  try { const p = snapshotJson ? JSON.parse(snapshotJson) : []; return Array.isArray(p) ? p.filter((x) => x && typeof x === "object") : []; } catch { return []; }
}

/** Perguntas que valem para estas respostas: ativas e com a condição (resposta anterior) atendida. */
export function visibleQuestions(snapshotJson: string | null, merged: Map<string, AnswerLike>): SnapshotQuestion[] {
  return parseSnapshot(snapshotJson).filter((q) => questionIsActive(q.settings) && conditionMetByAnswers(q.condition, merged));
}

/** Valida as respostas de um briefing contra as perguntas fotografadas na tarefa. `final` exige as obrigatórias (e os anexos obrigatórios). */
export function validateBriefingAnswers(snapshotJson: string | null, answers: { question_key: string; answer?: string | null; files?: string | null; links?: string | null }[], opts: { final: boolean; existing?: { question_key: string; answer: string | null; files: string | null }[] }): { key: string; message: string }[] {
  const errors: { key: string; message: string }[] = [];
  const questions = parseSnapshot(snapshotJson);
  if (questions.length === 0) return errors;
  const merged = new Map<string, AnswerLike>();
  for (const e of opts.existing ?? []) merged.set(e.question_key, { answer: e.answer, files: e.files });
  for (const a of answers) merged.set(a.question_key, { answer: a.answer ?? null, files: a.files ?? null });
  const active = new Set(visibleQuestions(snapshotJson, merged).map((q) => q.question_key));
  const byKey = new Map(questions.map((q) => [q.question_key, q]));
  const checkFiles = (q: SnapshotQuestion, t: string, rawFiles: string | null | undefined) => {
    const att = q.settings?.attachments;
    const fileMode = FILE_TYPES.includes(t);
    if (!fileMode && !att?.allowed) return;
    const arr = filesOf(rawFiles);
    if (arr === null) { errors.push({ key: q.question_key, message: "Arquivo em formato inválido." }); return; }
    const maxFiles = att?.max_files ?? q.validation?.max_files ?? null;
    const maxMb = att?.max_size_mb ?? q.validation?.max_size_mb ?? null;
    if (maxFiles != null && arr.length > maxFiles) errors.push({ key: q.question_key, message: `Envie no máximo ${maxFiles} arquivo(s).` });
    if (maxMb != null && arr.some((f) => Number(f.size ?? 0) > maxMb * 1024 * 1024)) errors.push({ key: q.question_key, message: `Cada arquivo pode ter no máximo ${maxMb} MB.` });
    const accept = att?.accept?.length ? att.accept : DEFAULT_ACCEPT[t];
    if (accept) for (const f of arr) {
      const ext = (f.name ?? "").toLowerCase().match(/\.[a-z0-9]{1,10}$/)?.[0] ?? "";
      if (ext && !accept.includes(ext)) { errors.push({ key: q.question_key, message: `O arquivo "${f.name}" não é de um tipo permitido (${accept.join(", ")}).` }); break; }
    }
    if (att?.require_description && arr.some((f) => !String(f.description ?? "").trim())) errors.push({ key: q.question_key, message: "Descreva cada arquivo enviado." });
  };
  for (const a of answers) {
    const q = byKey.get(a.question_key);
    if (!q) continue; // perguntas fora da fotografia (legado) continuam aceitas
    if (!active.has(q.question_key)) continue; // desativada ou condição não atendida: não valida
    const t = typeOf(q);
    checkFiles(q, t, a.files);
    if (t === "arquivo" || FILE_TYPES.includes(t)) continue;
    if (a.answer != null && a.answer !== "") {
      const err = validateAnswerValue({ type: t, options: q.options, validation: q.validation, settings: q.settings }, a.answer);
      if (err) errors.push({ key: q.question_key, message: err });
    }
  }
  if (opts.final) {
    for (const q of questions) {
      if (!active.has(q.question_key)) continue;
      const t = typeOf(q);
      const m = merged.get(q.question_key);
      const files = filesOf(m?.files) ?? [];
      const hasFiles = files.length > 0;
      const attRequired = !!q.settings?.attachments?.required;
      if (attRequired && !hasFiles) errors.push({ key: q.question_key, message: "Anexo obrigatório." });
      if (!q.required) continue;
      const filled = FILE_TYPES.includes(t) ? hasFiles : !!m?.answer && m.answer.trim() !== "";
      if (!filled) errors.push({ key: q.question_key, message: "Resposta obrigatória." });
    }
  }
  return errors;
}
