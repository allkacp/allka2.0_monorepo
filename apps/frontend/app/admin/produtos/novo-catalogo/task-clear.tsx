"use client";
import { useEffect, useState } from "react";
import { Eraser, RotateCcw } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

// Todo produto tem ao menos uma tarefa: ela não é excluída, é LIMPA (etapas e entregáveis saem; nome e modelo ficam).
// Limpar exige duas confirmações (ler o que acontece e digitar o nome + LIMPAR). O servidor guarda uma fotografia no histórico
// do produto, e a tarefa vazia mostra "Restaurar" para voltar tudo como estava.
type Act = (fn: () => Promise<any>, ok?: string | ((r: any) => string | undefined), opts?: { rethrow?: boolean }) => Promise<any>;

export function ClearTaskButton({ task, act, onDone }: { task: any; act: Act; onDone?: () => void }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [phrase, setPhrase] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const steps = (task.steps ?? []).length;
  const deliverables = (task.deliverables ?? []).length;
  const nameOk = name.trim() === String(task.name ?? "").trim() && name.trim() !== "";
  const phraseOk = phrase.trim().toUpperCase() === "LIMPAR";
  const reset = () => { setStep(1); setName(""); setPhrase(""); setErr(null); setBusy(false); };
  const close = (v: boolean) => { setOpen(v); if (!v) reset(); };
  async function run() {
    setBusy(true); setErr(null);
    try {
      await act(() => apiClient.clearCatalog2Task(task.id, { confirm_name: name.trim(), confirm_phrase: "LIMPAR" }), "Tarefa limpa. Ela fica guardada no histórico e pode ser restaurada.", { rethrow: true });
      close(false); onDone?.();
    } catch (e: any) { setErr(e?.message ?? "Não foi possível limpar a tarefa."); setBusy(false); }
  }
  return (
    <>
      <button type="button" aria-label={`Limpar tarefa ${task.name}`} title="Limpar a tarefa: remove as etapas e os entregáveis, mas mantém a tarefa e guarda tudo no histórico para restaurar" onClick={() => setOpen(true)} className="inline-flex h-9 items-center justify-center rounded-lg border border-red-200 bg-white px-3 text-red-600 hover:bg-red-50 dark:border-slate-700 dark:bg-slate-900" data-testid="clear-task-open">
        <Eraser className="h-4 w-4" /><span className="ml-1.5 text-xs font-semibold">Limpar tarefa</span>
      </button>
      <Dialog open={open} onOpenChange={close}>
        <DialogContent className="max-w-lg" data-testid="clear-task-dialog">
          <DialogTitle className="text-base">{step === 1 ? "Limpar esta tarefa?" : "Confirme para limpar"}</DialogTitle>
          {step === 1 ? (
            <div className="space-y-3 text-sm">
              <p>Você vai limpar a tarefa <strong>“{task.name}”</strong>:</p>
              <ul className="list-disc space-y-1 pl-5 text-slate-700 dark:text-slate-200">
                <li><strong>{steps}</strong> etapa{steps === 1 ? "" : "s"} e <strong>{deliverables}</strong> entregável{deliverables === 1 ? "" : "is"} serão removidos.</li>
                <li>Os acessos cadastrados dentro das etapas também saem.</li>
                <li>A tarefa em si <strong>continua</strong> no produto (todo produto precisa de ao menos uma tarefa).</li>
                <li>Tudo fica guardado no histórico do produto e pode ser <strong>restaurado</strong> depois.</li>
              </ul>
              <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">Uma tarefa sem etapas impede a publicação do produto: ele fica desativado até ter etapas de novo.</p>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => close(false)}>Cancelar</Button>
                <Button type="button" className="bg-amber-600 text-white hover:bg-amber-700" onClick={() => setStep(2)}>Continuar</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              <label className="block font-semibold text-slate-700 dark:text-slate-200">Digite o nome da tarefa para confirmar
                <Input aria-label="Nome da tarefa para confirmar" className="mt-1" value={name} placeholder={String(task.name)} onChange={(e) => setName(e.target.value)} />
              </label>
              <label className="block font-semibold text-slate-700 dark:text-slate-200">Digite LIMPAR
                <Input aria-label="Digite LIMPAR" className="mt-1" value={phrase} placeholder="LIMPAR" onChange={(e) => setPhrase(e.target.value)} />
              </label>
              {err && <p role="alert" className="rounded bg-red-50 px-2 py-1 text-xs font-semibold text-red-700">{err}</p>}
              <div className="flex justify-between gap-2">
                <Button type="button" variant="ghost" onClick={() => setStep(1)}>Voltar</Button>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => close(false)}>Cancelar</Button>
                  <Button type="button" disabled={!nameOk || !phraseOk || busy} className="bg-red-600 text-white hover:bg-red-700" onClick={() => void run()} data-testid="clear-task-confirm">{busy ? "Limpando…" : "Limpar tarefa"}</Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Aparece só quando a tarefa está vazia e existe uma fotografia no histórico: devolve as etapas e os entregáveis. */
export function RestoreTaskPanel({ task, act }: { task: any; act: Act }) {
  const [snaps, setSnaps] = useState<{ event_id: string; created_at: string; steps: number; deliverables: number; step_names: string[] }[]>([]);
  const [pick, setPick] = useState("");
  const [busy, setBusy] = useState(false);
  const empty = (task.steps ?? []).length === 0;
  useEffect(() => {
    if (!empty) { setSnaps([]); return; }
    let live = true;
    apiClient.getCatalog2TaskClearSnapshots(task.id).then((r: any) => { if (live) { setSnaps(r?.data ?? []); setPick(r?.data?.[0]?.event_id ?? ""); } }).catch(() => {});
    return () => { live = false; };
  }, [empty, task.id]);
  if (!empty || snaps.length === 0) return null;
  const fmt = (iso: string) => { try { return new Date(iso).toLocaleString("pt-BR"); } catch { return iso; } };
  return (
    <section className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs dark:border-amber-800 dark:bg-amber-950/20" data-testid="restore-task">
      <RotateCcw className="h-4 w-4 shrink-0 text-amber-700" />
      <span className="font-semibold text-amber-900 dark:text-amber-200">Esta tarefa foi limpa. Você pode restaurar o que ela tinha:</span>
      <select aria-label="Ponto de restauração" className="h-8 max-w-full rounded-md border border-amber-300 bg-white px-2 text-xs dark:bg-slate-900" value={pick} onChange={(e) => setPick(e.target.value)}>
        {snaps.map((s) => <option key={s.event_id} value={s.event_id}>{fmt(s.created_at)} — {s.steps} etapa(s), {s.deliverables} entregável(is)</option>)}
      </select>
      <Button type="button" size="sm" disabled={!pick || busy} className="h-8 bg-amber-600 text-white hover:bg-amber-700" onClick={async () => { setBusy(true); try { await act(() => apiClient.restoreCatalog2Task(task.id, pick), "Tarefa restaurada.", { rethrow: true }); } catch { /* act já mostra o erro */ } finally { setBusy(false); } }}>{busy ? "Restaurando…" : "Restaurar tarefa"}</Button>
    </section>
  );
}
