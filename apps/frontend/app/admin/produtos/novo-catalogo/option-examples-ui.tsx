"use client";
import { useRef, useState } from "react";
import { Download, Link2, Loader2, Paperclip, Plus, Trash2, X } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { Input } from "@/components/ui/input";

// Opção de variação: explicação curta para o CLIENTE, links de exemplos do entregável e um arquivo-modelo do entregável.
// Cada alteração é salva na hora (put = atualização da opção).
export interface ExampleLink { label: string | null; url: string }
export interface ExampleFile { id: string; name: string; size: number; mime: string }
const fmtBytes = (n: number) => (n >= 1048576 ? `${(n / 1048576).toFixed(1).replace(".", ",")} MB` : n >= 1024 ? `${Math.round(n / 1024)} KB` : `${n} B`);
export const isHttpUrl = (u: string) => /^https?:\/\/[^\s]+$/i.test(u.trim());

export function OptionExamples({ option, readOnly, put }: { option: any; readOnly: boolean; put: (body: Record<string, unknown>, ok: string) => Promise<unknown> | void }) {
  const [desc, setDesc] = useState<string>(option.short_description ?? "");
  const links: ExampleLink[] = option.example_links ?? [];
  const file: ExampleFile | null = option.example_file ?? null;
  const [newLabel, setNewLabel] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const addLink = () => {
    const url = newUrl.trim();
    if (!isHttpUrl(url)) { setErr("O link precisa começar com http:// ou https://"); return; }
    setErr(null);
    void put({ example_links: [...links, { label: newLabel.trim() || null, url }] }, "Link de exemplo adicionado.");
    setNewLabel(""); setNewUrl("");
  };
  async function upload(f: File | undefined) {
    if (!f) return;
    if (f.size > 50 * 1024 * 1024) { setErr("O arquivo passa de 50 MB."); return; }
    setBusy(true); setErr(null);
    try { const r = await apiClient.uploadCatalog2DeliverableFile(f); await put({ example_file: r.file }, "Arquivo-modelo anexado."); }
    catch (e: any) { setErr(e?.message ?? "Não foi possível enviar o arquivo."); }
    finally { setBusy(false); if (input.current) input.current.value = ""; }
  }

  return (
    <div className="space-y-2" data-testid="option-examples">
      <label className="block">
        <span className="mb-0.5 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">Descrição curta para o cliente <span className="font-normal text-slate-400">(aparece na hora de escolher esta opção)</span></span>
        <Input disabled={readOnly} aria-label="Descrição curta da opção" className="h-8 text-xs" maxLength={500} value={desc} placeholder="Ex.: 4 campanhas por mês, com relatório de resultado" onChange={(e) => setDesc(e.target.value)} onBlur={() => { if (desc !== (option.short_description ?? "")) void put({ short_description: desc.trim() || null }, "Descrição salva."); }} />
      </label>

      <div>
        <p className="mb-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300">Exemplos do entregável <span className="font-normal text-slate-400">(links e arquivo-modelo que o cliente pode ver)</span></p>
        {links.length > 0 && (
          <ul className="mb-1.5 space-y-1" data-testid="example-links">
            {links.map((l, i) => (
              <li key={`${l.url}-${i}`} className="flex items-center gap-1.5 rounded-md bg-slate-50 px-2 py-1 text-xs dark:bg-slate-800/50">
                <Link2 className="h-3.5 w-3.5 shrink-0 text-violet-600" />
                <a href={l.url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate font-medium text-violet-700 underline underline-offset-2 dark:text-violet-300">{l.label || l.url}</a>
                {!readOnly && <button type="button" aria-label={`Remover link ${l.label || l.url}`} className="rounded p-0.5 text-slate-400 hover:text-red-600" onClick={() => void put({ example_links: links.filter((_, j) => j !== i) }, "Link removido.")}><Trash2 className="h-3.5 w-3.5" /></button>}
              </li>
            ))}
          </ul>
        )}
        {!readOnly && (
          <div className="flex flex-wrap items-center gap-1.5">
            <Input aria-label="Nome do link de exemplo" className="h-8 w-40 text-xs" maxLength={120} placeholder="Nome (opcional)" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} />
            <Input aria-label="Endereço do link de exemplo" className="h-8 min-w-[12rem] flex-1 text-xs" maxLength={500} placeholder="https://… (Drive, site, vídeo…)" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addLink(); } }} />
            <button type="button" className="inline-flex h-8 items-center gap-1 rounded-md border border-violet-300 bg-violet-50 px-2.5 text-xs font-semibold text-violet-700 hover:bg-violet-100 disabled:opacity-50" disabled={!newUrl.trim()} onClick={addLink}><Plus className="h-3.5 w-3.5" />Adicionar link</button>
          </div>
        )}

        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          {file ? (
            <span className="inline-flex min-w-0 items-center gap-1.5 rounded-md border border-violet-200 bg-violet-50 px-2 py-1 text-xs text-violet-800 dark:border-violet-900 dark:bg-violet-950/30 dark:text-violet-200" data-testid="example-file">
              <Paperclip className="h-3.5 w-3.5 shrink-0" />
              <span className="min-w-0 truncate font-medium">{file.name}</span>
              <span className="shrink-0 text-violet-600/80">{fmtBytes(file.size)}</span>
              <button type="button" aria-label={`Baixar ${file.name}`} className="rounded p-0.5 underline" onClick={() => void apiClient.downloadCatalog2DeliverableFile(file).catch((e: any) => setErr(e?.message ?? "Não foi possível baixar."))}><Download className="h-3.5 w-3.5" /></button>
              {!readOnly && <button type="button" aria-label="Remover arquivo-modelo" className="rounded p-0.5 text-slate-500 hover:text-red-600" onClick={() => void put({ example_file: null }, "Arquivo-modelo removido.")}><X className="h-3.5 w-3.5" /></button>}
            </span>
          ) : <span className="text-[11px] text-slate-400">Nenhum arquivo-modelo anexado.</span>}
          {!readOnly && (
            <>
              <input ref={input} type="file" className="sr-only" tabIndex={-1} aria-label="Escolher arquivo-modelo do entregável" onChange={(e) => void upload(e.target.files?.[0])} />
              <button type="button" disabled={busy} className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" onClick={() => input.current?.click()}>
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Paperclip className="h-3.5 w-3.5" />}{file ? "Trocar arquivo-modelo" : "Anexar arquivo-modelo"}
              </button>
            </>
          )}
        </div>
        {err && <p role="alert" className="mt-1 text-[11px] font-semibold text-red-600">{err}</p>}
      </div>
    </div>
  );
}
