"use client";
import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function DeliverableFilePicker({ onChoose, onClose }: { onChoose: (file: { id: string; name: string }) => void; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [retry, setRetry] = useState(0);
  const [rows, setRows] = useState<{ id: string; name: string; from: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [more, setMore] = useState(false);
  useEffect(() => {
    let live = true;
    setLoading(true); setError(null); setRows([]);
    const timer = window.setTimeout(() => {
      apiClient.getCatalog2DeliverableFiles(q.trim()).then((r) => {
        if (live) { setRows(r.data); setMore(r.has_more); }
      }).catch(() => { if (live) setError("Não foi possível carregar os arquivos salvos. Tente novamente."); })
        .finally(() => { if (live) setLoading(false); });
    }, 250);
    return () => { live = false; window.clearTimeout(timer); };
  }, [q, retry]);
  return <div className="space-y-2 rounded-lg border border-violet-200 bg-violet-50/40 p-2.5 dark:border-violet-900 dark:bg-violet-950/20" data-testid="deliverable-file-picker">
    <div className="flex items-center gap-2"><Input className="h-8 min-w-0 flex-1 text-xs" aria-label="Buscar arquivo-modelo salvo" placeholder="Buscar pelo nome do arquivo…" value={q} onChange={(e) => setQ(e.target.value)} /><Button type="button" size="sm" variant="ghost" className="h-8 text-xs" onClick={onClose}>Cancelar seleção</Button></div>
    <p className="text-[11px] text-slate-500">Arquivos-modelo já salvos em entregáveis. A seleção só é gravada ao salvar o cadastro.</p>
    {loading ? <p role="status" className="text-xs text-slate-500">Buscando arquivos…</p> : error ? <div role="alert" className="text-xs text-rose-700">{error} <button type="button" className="font-semibold text-violet-700 underline" onClick={() => setRetry((n) => n + 1)}>Tentar novamente</button></div> : <>
      {!rows.length && <p role="status" className="text-xs text-slate-500">{q.trim() ? "Nenhum arquivo encontrado para essa busca." : "Nenhum arquivo-modelo salvo disponível. Use Anexar para enviar o primeiro."}</p>}
      <ul className="divide-y divide-violet-100 dark:divide-violet-900">{rows.map((file) => <li key={file.id} className="flex min-w-0 items-center gap-2 py-1.5"><span className="min-w-0 flex-1"><span className="block break-words text-xs font-semibold">{file.name}</span><span className="block break-words text-[10px] text-slate-500">{file.from}</span></span><Button type="button" variant="outline" size="sm" className="h-7 shrink-0 border-violet-200 text-xs text-violet-700" aria-label={`Usar ${file.name}`} onClick={() => onChoose(file)}>Usar arquivo</Button></li>)}</ul>
      {more && <p className="text-[11px] text-slate-500">Há mais arquivos. Refine a busca pelo nome.</p>}
    </>}
  </div>;
}
