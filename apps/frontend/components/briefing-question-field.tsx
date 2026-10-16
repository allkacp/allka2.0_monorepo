"use client";

// Campo de resposta de UMA pergunta do questionário de contratação — serve a todos os tipos do construtor universal (22 tipos),
// com opção "Outro", escala, anexos (com descrição) e mensagens claras. É usado pelo cliente (tarefa) e pela prévia do administrador.
import { useRef, useState } from "react";
import { Download, Loader2, Paperclip, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export interface BriefingFileRef { id?: string; name: string; size?: number; mime_type?: string; description?: string | null }
export interface BriefingValue { answer: string; files: BriefingFileRef[] }
export const emptyBriefingValue = (): BriefingValue => ({ answer: "", files: [] });

export const FILE_QUESTION_TYPES = ["arquivo", "imagem", "video", "audio", "documento"];
export const SELECT_QUESTION_TYPES = ["selecao_unica", "selecao_multipla", "lista_suspensa"];
const DEFAULT_ACCEPT: Record<string, string[]> = {
  imagem: [".jpg", ".jpeg", ".png", ".webp", ".gif"], video: [".mp4", ".mov", ".webm", ".mkv"], audio: [".mp3", ".wav", ".m4a", ".ogg"],
  documento: [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".txt", ".csv", ".odt", ".ods"],
};
const OTHER = "outro:";

/** Tipo da pergunta (os snapshots antigos usam text_short/text_long/multiple_choice). */
export const typeOf = (q: any): string => q.question_type ?? ({ text_short: "texto_curto", text_long: "texto_longo", multiple_choice: "selecao_multipla", select: "selecao_unica", file: "arquivo", link: "url" } as Record<string, string>)[q.type] ?? q.type ?? "texto_curto";
export const optionsOf = (q: any): { value: string; label: string; is_default?: boolean }[] => (q.options ?? []).map((o: any) => (typeof o === "string" ? { value: o, label: o } : o));
export const attachmentRules = (q: any) => {
  const t = typeOf(q); const a = q.settings?.attachments;
  const isFile = FILE_QUESTION_TYPES.includes(t);
  return { allowed: isFile || !!a?.allowed, required: !!a?.required, accept: (a?.accept?.length ? a.accept : DEFAULT_ACCEPT[t]) as string[] | undefined, maxFiles: a?.max_files ?? q.validation?.max_files ?? null, maxMb: a?.max_size_mb ?? q.validation?.max_size_mb ?? null, requireDescription: !!a?.require_description };
};

/** Mesma regra do servidor (conditionMetByAnswers) para esconder/mostrar perguntas conforme respostas anteriores. */
export function conditionMet(cond: any, values: Record<string, BriefingValue>): boolean {
  if (!cond || cond.source !== "answer") return true;
  const a = values[cond.ref]; const text = (a?.answer ?? "").trim(); const hasFiles = (a?.files ?? []).length > 0;
  let arr: string[] | null = null; try { const p = JSON.parse(text); arr = Array.isArray(p) ? p.map(String) : null; } catch { arr = null; }
  const eq = text === (cond.value ?? "") || (!!arr && arr.length > 1 && arr.includes(cond.value ?? ""));
  switch (cond.operator) {
    case "selected": return text !== "" || hasFiles;
    case "not_selected": return text === "" && !hasFiles;
    case "eq": return eq;
    case "neq": return !eq;
    case "contains": return text.toLowerCase().includes(String(cond.value ?? "").toLowerCase());
    case "gt": return Number(text.replace(",", ".")) > Number(String(cond.value).replace(",", "."));
    case "lt": return text !== "" && Number(text.replace(",", ".")) < Number(String(cond.value).replace(",", "."));
    case "attached": return hasFiles;
    case "not_attached": return !hasFiles;
    default: return true;
  }
}
export const isVisible = (q: any, values: Record<string, BriefingValue>) => q.settings?.is_active !== false && conditionMet(q.condition, values);
export function isAnswered(q: any, v?: BriefingValue): boolean {
  if (!v) return false;
  return FILE_QUESTION_TYPES.includes(typeOf(q)) ? v.files.length > 0 : v.answer.trim() !== "";
}
/** O que ainda falta numa pergunta obrigatória (mensagem em português) ou null. */
export function pendingMessage(q: any, v?: BriefingValue): string | null {
  const rules = attachmentRules(q);
  if (q.required && !isAnswered(q, v)) return FILE_QUESTION_TYPES.includes(typeOf(q)) ? "Envie o arquivo." : "Resposta obrigatória.";
  if (rules.required && !(v?.files ?? []).length) return "Anexo obrigatório.";
  return null;
}

const FIELD = "w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100";

export function BriefingQuestionField({ q, value, onChange, disabled, error, onUploadFile, onRemoveFile, onDownloadFile }: {
  q: any; value: BriefingValue; onChange: (v: BriefingValue) => void; disabled?: boolean; error?: string | null;
  onUploadFile?: (file: File, description: string) => Promise<BriefingFileRef>; onRemoveFile?: (f: BriefingFileRef) => Promise<void> | void; onDownloadFile?: (f: BriefingFileRef) => void;
}) {
  const t = typeOf(q);
  const id = `bq-${q.question_key}`;
  const set = (answer: string) => onChange({ ...value, answer });
  const options = optionsOf(q);
  const st = q.settings ?? {};
  const ph = q.placeholder ?? st.placeholder ?? undefined;
  const rules = attachmentRules(q);
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);
  const [fileErr, setFileErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected: string[] = (() => { try { const p = JSON.parse(value.answer || "[]"); return Array.isArray(p) ? p.map(String) : []; } catch { return value.answer ? value.answer.split(",").map((x) => x.trim()) : []; } })();
  const otherText = (val: string) => (val.startsWith(OTHER) ? val.slice(OTHER.length) : "");
  const toggleMulti = (v: string, on: boolean) => set(JSON.stringify(on ? [...selected.filter((x) => x !== v), v] : selected.filter((x) => x !== v)));
  const otherSelected = selected.find((x) => x.startsWith(OTHER));

  async function pick(files: FileList | null) {
    if (!files || files.length === 0) return;
    setFileErr(null);
    if (rules.requireDescription && !desc.trim()) { setFileErr("Descreva o arquivo antes de enviar."); if (inputRef.current) inputRef.current.value = ""; return; }
    setBusy(true);
    try {
      let list = value.files;
      let sentAny = false;
      for (const f of Array.from(files)) {
        if (rules.maxFiles != null && list.length >= rules.maxFiles) { setFileErr(`Envie no máximo ${rules.maxFiles} arquivo(s).`); break; }
        if (rules.maxMb != null && f.size > rules.maxMb * 1024 * 1024) { setFileErr(`Cada arquivo pode ter no máximo ${rules.maxMb} MB.`); break; }
        const ext = `.${(f.name.split(".").pop() ?? "").toLowerCase()}`;
        if (rules.accept && !rules.accept.includes(ext)) { setFileErr(`Tipo não permitido. Aceitos: ${rules.accept.join(", ")}.`); break; }
        const ref = onUploadFile ? await onUploadFile(f, desc.trim()) : { name: f.name, size: f.size, mime_type: f.type, description: desc.trim() || null };
        list = [...list, ref];
        sentAny = true;
        onChange({ ...value, files: list });
      }
      if (sentAny) setDesc("");
    } catch (e: any) { setFileErr(e?.message ?? "Não foi possível enviar o arquivo."); }
    finally { setBusy(false); if (inputRef.current) inputRef.current.value = ""; }
  }

  let body: React.ReactNode;
  switch (t) {
    case "texto_longo": body = <Textarea id={id} rows={4} className="text-sm" placeholder={ph} disabled={disabled} value={value.answer} onChange={(e) => set(e.target.value)} />; break;
    case "endereco": body = <Textarea id={id} rows={2} className="text-sm" placeholder={ph ?? "Rua, número, bairro, cidade, estado e CEP"} disabled={disabled} value={value.answer} onChange={(e) => set(e.target.value)} />; break;
    case "numero": body = <Input id={id} inputMode="decimal" className="text-sm" placeholder={ph} disabled={disabled} value={value.answer} onChange={(e) => set(e.target.value)} />; break;
    case "moeda": body = <div className="flex items-center gap-1.5"><span className="text-sm text-slate-500">R$</span><Input id={id} inputMode="decimal" className="text-sm" placeholder={ph ?? "0,00"} disabled={disabled} value={value.answer} onChange={(e) => set(e.target.value)} /></div>; break;
    case "data": body = <Input id={id} type="date" className="text-sm" disabled={disabled} value={value.answer} onChange={(e) => set(e.target.value)} />; break;
    case "hora": body = <Input id={id} type="time" className="text-sm" disabled={disabled} value={value.answer} onChange={(e) => set(e.target.value)} />; break;
    case "data_hora": body = <Input id={id} type="datetime-local" className="text-sm" disabled={disabled} value={value.answer.replace(" ", "T")} onChange={(e) => set(e.target.value)} />; break;
    case "telefone": body = <Input id={id} type="tel" className="text-sm" placeholder={ph ?? "(11) 91234-5678"} disabled={disabled} value={value.answer} onChange={(e) => set(e.target.value)} />; break;
    case "email": body = <Input id={id} type="email" className="text-sm" placeholder={ph ?? "nome@empresa.com"} disabled={disabled} value={value.answer} onChange={(e) => set(e.target.value)} />; break;
    case "url": body = <Input id={id} type="url" className="text-sm" placeholder={ph ?? "https://"} disabled={disabled} value={value.answer} onChange={(e) => set(e.target.value)} />; break;
    case "sim_nao":
      body = <div className="flex gap-3" role="radiogroup" aria-label="Sim ou não">{[["sim", "Sim"], ["nao", "Não"]].map(([v, l]) => <label key={v} className="inline-flex items-center gap-1.5 text-sm"><input type="radio" name={id} disabled={disabled} checked={value.answer === v} onChange={() => set(v)} />{l}</label>)}</div>;
      break;
    case "aceite":
      body = <label className="inline-flex items-start gap-2 text-sm"><input type="checkbox" className="mt-0.5" disabled={disabled} checked={value.answer === "sim"} onChange={(e) => set(e.target.checked ? "sim" : "")} />Li e confirmo</label>;
      break;
    case "escala": {
      const sc = st.scale ?? { min: 1, max: 5 };
      const pts = Array.from({ length: sc.max - sc.min + 1 }, (_, i) => sc.min + i);
      body = <div><div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Nota">{pts.map((n) => <button key={n} type="button" role="radio" aria-checked={value.answer === String(n)} disabled={disabled} onClick={() => set(String(n))} className={`h-9 min-w-9 rounded-md border px-2 text-sm font-semibold ${value.answer === String(n) ? "border-violet-600 bg-violet-600 text-white" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}>{n}</button>)}</div>{(sc.min_label || sc.max_label) && <p className="mt-1 flex justify-between text-[11px] text-slate-500"><span>{sc.min_label}</span><span>{sc.max_label}</span></p>}</div>;
      break;
    }
    case "selecao_unica":
      body = (
        <div className="space-y-1.5" role="radiogroup">
          {options.map((o) => <label key={o.value} className="flex items-center gap-2 text-sm"><input type="radio" name={id} disabled={disabled} checked={value.answer === o.value} onChange={() => set(o.value)} />{o.label}</label>)}
          {st.allow_other && <div className="flex flex-wrap items-center gap-2 text-sm"><label className="inline-flex items-center gap-2"><input type="radio" name={id} disabled={disabled} checked={value.answer.startsWith(OTHER)} onChange={() => set(OTHER)} />Outro</label>{value.answer.startsWith(OTHER) && <Input className="h-8 max-w-xs text-sm" aria-label="Outro: descreva" placeholder="Descreva" disabled={disabled} value={otherText(value.answer)} onChange={(e) => set(OTHER + e.target.value)} />}</div>}
        </div>
      );
      break;
    case "lista_suspensa":
      body = (
        <div className="space-y-1.5">
          <select id={id} className={FIELD} disabled={disabled} value={value.answer.startsWith(OTHER) ? OTHER : value.answer} onChange={(e) => set(e.target.value)}>
            <option value="">Selecione…</option>
            {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            {st.allow_other && <option value={OTHER}>Outro</option>}
          </select>
          {st.allow_other && value.answer.startsWith(OTHER) && <Input className="max-w-xs text-sm" aria-label="Outro: descreva" placeholder="Descreva" disabled={disabled} value={otherText(value.answer)} onChange={(e) => set(OTHER + e.target.value)} />}
        </div>
      );
      break;
    case "selecao_multipla":
      body = (
        <div className="space-y-1.5">
          {options.map((o) => <label key={o.value} className="flex items-center gap-2 text-sm"><input type="checkbox" disabled={disabled} checked={selected.includes(o.value)} onChange={(e) => toggleMulti(o.value, e.target.checked)} />{o.label}</label>)}
          {st.allow_other && <div className="flex flex-wrap items-center gap-2 text-sm"><label className="inline-flex items-center gap-2"><input type="checkbox" disabled={disabled} checked={!!otherSelected} onChange={(e) => set(JSON.stringify(e.target.checked ? [...selected, OTHER] : selected.filter((x) => !x.startsWith(OTHER))))} />Outro</label>{otherSelected && <Input className="h-8 max-w-xs text-sm" aria-label="Outro: descreva" placeholder="Descreva" disabled={disabled} value={otherText(otherSelected)} onChange={(e) => set(JSON.stringify([...selected.filter((x) => !x.startsWith(OTHER)), OTHER + e.target.value]))} />}</div>}
          {(st.min_choices != null || st.max_choices != null) && <p className="text-[11px] text-slate-500">Escolha {st.min_choices != null ? `ao menos ${st.min_choices}` : ""}{st.min_choices != null && st.max_choices != null ? " e " : ""}{st.max_choices != null ? `no máximo ${st.max_choices}` : ""}.</p>}
        </div>
      );
      break;
    case "arquivo": case "imagem": case "video": case "audio": case "documento": body = null; break;
    case "acesso_ativo": body = <Input id={id} className="text-sm" placeholder="Identificador do acesso cadastrado" disabled={disabled} value={value.answer} onChange={(e) => set(e.target.value)} />; break;
    default: body = <Input id={id} className="text-sm" placeholder={ph} disabled={disabled} value={value.answer} onChange={(e) => set(e.target.value)} />;
  }

  return (
    <div className="space-y-2" data-testid={`bq-${q.question_key}`}>
      {body}
      {rules.allowed && (
        <div className="space-y-1.5 rounded-lg border border-dashed border-slate-300 bg-slate-50/70 p-2 dark:border-slate-700 dark:bg-slate-800/30" data-testid="bq-files">
          <p className="flex items-center gap-1 text-[11px] font-semibold text-slate-600"><Paperclip className="h-3 w-3" />{FILE_QUESTION_TYPES.includes(t) ? "Envie o arquivo" : "Anexos (opcional)"}{rules.required ? " — obrigatório" : ""}
            <span className="font-normal text-slate-500">{rules.accept ? ` · ${rules.accept.join(", ")}` : ""}{rules.maxFiles ? ` · até ${rules.maxFiles}` : ""}{rules.maxMb ? ` · ${rules.maxMb} MB cada` : ""}</span></p>
          {rules.requireDescription && <Input className="h-8 text-xs" aria-label="Descrição do arquivo" placeholder="Descreva o arquivo (obrigatório)" disabled={disabled || busy} value={desc} onChange={(e) => setDesc(e.target.value)} />}
          {!disabled && <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Paperclip className="h-3.5 w-3.5" />}Escolher arquivo
            <input ref={inputRef} type="file" className="sr-only" aria-label="Escolher arquivo" multiple={(rules.maxFiles ?? 2) > 1} accept={rules.accept?.join(",")} disabled={busy} onChange={(e) => void pick(e.target.files)} />
          </label>}
          {fileErr && <p role="alert" className="text-[11px] font-semibold text-red-600">{fileErr}</p>}
          <ul className="space-y-1">
            {value.files.map((f, i) => (
              <li key={f.id ?? `${f.name}-${i}`} className="flex flex-wrap items-center gap-2 rounded bg-white px-2 py-1 text-xs dark:bg-slate-900" data-testid="bq-file">
                <span className="min-w-0 flex-1 truncate"><strong>{f.name}</strong>{f.description ? <span className="text-slate-500"> — {f.description}</span> : null}</span>
                {f.id && onDownloadFile && <button type="button" aria-label={`Baixar ${f.name}`} className="text-violet-700" onClick={() => onDownloadFile(f)}><Download className="h-3.5 w-3.5" /></button>}
                {!disabled && <button type="button" aria-label={`Remover ${f.name}`} className="text-rose-500" onClick={async () => { try { await onRemoveFile?.(f); onChange({ ...value, files: value.files.filter((x) => x !== f) }); } catch (e: any) { setFileErr(e?.message ?? "Não foi possível remover."); } }}><Trash2 className="h-3.5 w-3.5" /></button>}
              </li>
            ))}
          </ul>
        </div>
      )}
      {error && <p role="alert" className="text-xs font-semibold text-red-600">{error}</p>}
    </div>
  );
}
