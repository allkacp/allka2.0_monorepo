"use client";

// Modelos globais de tarefa e etapa. Os modelos NASCEM dentro do cadastro de produtos (criar tarefa/etapa já cria e liga o modelo);
// aqui só aparecem os reais. Editar abre, na própria página, o MESMO editor do produto (ProductEditor em modo embutido):
// não existe formulário reduzido nem paralelo. Ao salvar um modelo usado, o editor pergunta: criar novo modelo ou editar globalmente.
import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, ClipboardList, Copy, Layers, Link2, Loader2, Pencil, Search } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { STANDARD_SHELL_PANEL_CLASS, StandardPageBanner } from "@/components/standard-page-shell";
import { ProductEditor } from "@/app/admin/produtos/novo-catalogo/product-editor";

type Kind = "task" | "step";
type Model = Record<string, any> & { id: number; name: string; is_active: boolean; revision: number };

const STATE_LABEL = (s: string) => (s === "rascunho" ? "rascunho" : "publicada");

/** O editor completo, embutido: escolhe onde o modelo é usado (produto/tarefa/etapa) e abre o editor normal ali, sem navegar. */
export function EmbeddedModelEditorDialog({ kind, model, onClose }: { kind: Kind; model: Model; onClose: () => void }) {
  const [detail, setDetail] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pick, setPick] = useState(0);
  useEffect(() => {
    let live = true;
    Promise.resolve(kind === "task" ? apiClient.getCatalog2TaskModel(model.id) : apiClient.getCatalog2StepModel(model.id))
      .then((r: any) => { if (!live) return; setDetail(r); const first = (r.instances ?? []).findIndex((i: any) => i.state === "rascunho"); setPick(first >= 0 ? first : 0); })
      .catch((e: any) => { if (live) setError(e?.message ?? "Não foi possível abrir o modelo."); });
    return () => { live = false; };
  }, [kind, model.id]);
  const instances: any[] = detail?.instances ?? [];
  const inst = instances[pick];
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent showCloseButton={false} data-testid="model-editor-dialog" className="flex h-[calc(100dvh-7rem)] w-[98vw] max-w-[98vw] flex-col gap-0 overflow-hidden bg-[#dfe5f6] p-0 sm:max-w-[98vw] dark:bg-slate-950">
        <DialogTitle className="sr-only">Editar modelo global de {kind === "task" ? "tarefa" : "etapa"}</DialogTitle>
        {instances.length > 1 && (
          <label className="flex shrink-0 flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700">
            Este modelo é usado em {instances.length} lugares. Editar pelo uso em:
            <select className="h-8 min-w-0 rounded-md border border-slate-300 bg-white px-2 text-xs" value={pick} onChange={(e) => setPick(Number(e.target.value))} data-testid="model-instance-select">
              {instances.map((i, k) => <option key={`${i.step_id ?? i.task_id}`} value={k}>{`${i.product_name} · ${i.task_name ?? ""} · v${i.version} (${STATE_LABEL(i.state)})`}</option>)}
            </select>
          </label>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {error ? <p role="alert" className="p-6 text-sm text-rose-700">{error}</p>
            : !detail ? <div className="flex items-center justify-center gap-2 py-24 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Abrindo o editor…</div>
            : !inst ? (
              <div className="space-y-3 p-6 text-sm text-slate-700" data-testid="model-no-instance">
                <p className="font-semibold">Este modelo ainda não está em nenhuma {kind === "task" ? "tarefa" : "etapa"} de produto.</p>
                <p>Os modelos nascem dentro do cadastro de produtos. Para editar, use este modelo em uma tarefa/etapa de um produto (“Selecionar modelo existente”); depois ele abre aqui com o editor completo.</p>
                <Button variant="outline" onClick={onClose}>Fechar</Button>
              </div>
            ) : (
              <ProductEditor key={`${inst.product_id}:${inst.task_id}:${inst.step_id ?? ""}`} productId={inst.product_id} onBack={onClose}
                embedded={{ kind, modelId: model.id, taskId: inst.task_id, stepId: inst.step_id, modelName: model.name, onClose }} />
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block text-sm font-semibold text-slate-700"><span className="mb-1 block">{label}</span>{children}</label>; }

/** Duplicar a etapa (modelo novo, original intacta) e já vincular a tarefas. */
function CopyDialog({ model, tasks, onClose, onCopy }: { model: Model; tasks: Model[]; onClose: () => void; onCopy: (name: string, ids: number[]) => Promise<void> }) {
  const [name, setName] = useState(`${model.name} — cópia`); const [ids, setIds] = useState<number[]>([]); const [saving, setSaving] = useState(false);
  return <Dialog open onOpenChange={(open) => !open && onClose()}><DialogContent className="max-w-lg" data-testid="copy-dialog"><DialogTitle>Duplicar etapa e vincular</DialogTitle><p className="text-sm text-slate-500">A original permanece intacta. Escolha em quais tarefas a cópia será usada.</p><div className="mt-4 space-y-3"><Field label="Nome da cópia"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field><div><p className="mb-2 text-sm font-semibold">Vincular às tarefas</p><div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-slate-200 p-2">{tasks.map((task) => <label key={task.id} className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-violet-50"><input type="checkbox" checked={ids.includes(task.id)} onChange={() => setIds((old) => old.includes(task.id) ? old.filter((item) => item !== task.id) : [...old, task.id])} className="accent-violet-600" />{task.name}</label>)}</div></div><div className="flex justify-end gap-2"><Button variant="outline" onClick={onClose}>Cancelar</Button><Button disabled={!name.trim() || saving} onClick={async () => { setSaving(true); try { await onCopy(name.trim(), ids); } finally { setSaving(false); } }}>{saving ? "Copiando…" : "Criar cópia"}</Button></div></div></DialogContent></Dialog>;
}

/** Vincular a etapa (a MESMA, sem copiar) a mais tarefas. */
function LinkDialog({ model, tasks, onClose, onLink }: { model: Model; tasks: Model[]; onClose: () => void; onLink: (ids: number[]) => Promise<void> }) {
  const already = new Set<number>((model.task_models ?? []).map((l: any) => l.task_model_id ?? l.task_model?.id));
  const [ids, setIds] = useState<number[]>([]); const [saving, setSaving] = useState(false);
  const free = tasks.filter((t) => !already.has(t.id));
  return <Dialog open onOpenChange={(open) => !open && onClose()}><DialogContent className="max-w-lg" data-testid="link-dialog"><DialogTitle>Vincular “{model.name}” a mais tarefas</DialogTitle><p className="text-sm text-slate-500">Não cria cópia: a mesma etapa passa a fazer parte da lista padrão das tarefas escolhidas.</p><div className="max-h-56 space-y-1 overflow-y-auto rounded-xl border border-slate-200 p-2">{free.length ? free.map((task) => <label key={task.id} className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-violet-50"><input type="checkbox" checked={ids.includes(task.id)} onChange={() => setIds((old) => old.includes(task.id) ? old.filter((i) => i !== task.id) : [...old, task.id])} className="accent-violet-600" />{task.name}</label>) : <p className="p-2 text-sm text-slate-500">Todas as tarefas já usam esta etapa.</p>}</div><div className="flex justify-end gap-2"><Button variant="outline" onClick={onClose}>Cancelar</Button><Button disabled={!ids.length || saving} onClick={async () => { setSaving(true); try { await onLink(ids); } finally { setSaving(false); } }}>{saving ? "Vinculando…" : "Vincular"}</Button></div></DialogContent></Dialog>;
}

export default function Catalog2GlobalModelsPage() {
  const [kind, setKind] = useState<Kind>("task");
  const [rows, setRows] = useState<Model[]>([]);
  const [taskModels, setTaskModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [detail, setDetail] = useState<Model | null>(null);
  const [editing, setEditing] = useState<Model | null>(null);
  const [copy, setCopy] = useState<Model | null>(null);
  const [link, setLink] = useState<Model | null>(null);

  const all = useCallback(async (target: Kind) => {
    const fetchPage = (offset: number) => target === "task" ? apiClient.getCatalog2TaskModels({ limit: 100, offset }) : apiClient.getCatalog2StepModels({ limit: 100, offset });
    const first = await fetchPage(0); const result = [...(first.data ?? [])];
    for (let offset = result.length; offset < (first.total ?? 0); offset += 100) result.push(...((await fetchPage(offset)).data ?? []));
    return result as Model[];
  }, []);
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { const [tasks, steps] = await Promise.all([all("task"), all("step")]); setTaskModels(tasks); setRows(kind === "task" ? tasks : steps); }
    catch (e: any) { setError(e?.message ?? "Não foi possível carregar os modelos globais."); }
    finally { setLoading(false); }
  }, [all, kind]);
  useEffect(() => { void load(); }, [load]);
  const visible = useMemo(() => rows.filter((row) => !q || `${row.name} ${row.description ?? ""}`.toLocaleLowerCase().includes(q.toLocaleLowerCase())), [rows, q]);

  const openDetail = async (row: Model) => { try { setDetail(kind === "task" ? await apiClient.getCatalog2TaskModel(row.id) : await apiClient.getCatalog2StepModel(row.id)); } catch (e: any) { setError(e?.message ?? "Não foi possível abrir o modelo."); } };
  const startCopy = async (row: Model) => { try { setCopy(await apiClient.getCatalog2StepModel(row.id)); } catch (e: any) { setError(e?.message ?? "Não foi possível abrir a etapa para cópia."); } };
  const startLink = async (row: Model) => { try { setLink(await apiClient.getCatalog2StepModel(row.id)); } catch (e: any) { setError(e?.message ?? "Não foi possível abrir a etapa."); } };
  const toggleActive = async (row: Model) => { try { kind === "task" ? await apiClient.setCatalog2TaskModelActive(row.id, !row.is_active) : await apiClient.setCatalog2StepModelActive(row.id, !row.is_active); await load(); } catch (e: any) { setError(e?.message ?? "Não foi possível atualizar o status."); } };
  const Icon = kind === "task" ? ClipboardList : Layers;

  return (
    <div className={STANDARD_SHELL_PANEL_CLASS}>
      <StandardPageBanner icon={ClipboardList} title="Modelos globais" description="Tarefas e etapas reais já cadastradas nos produtos. Elas nascem no cadastro do produto." actions={<Button variant="outline" size="sm" onClick={() => void load()}><Loader2 className={`mr-1 h-4 w-4 ${loading ? "animate-spin" : ""}`} />Atualizar</Button>} />
      <div className="p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-xl border bg-slate-50 p-1">
            <button onClick={() => setKind("task")} className={`rounded-lg px-3 py-2 text-sm font-semibold ${kind === "task" ? "bg-gradient-to-r from-violet-700 to-fuchsia-600 text-white" : "text-slate-600"}`}>Tarefas</button>
            <button onClick={() => setKind("step")} className={`rounded-lg px-3 py-2 text-sm font-semibold ${kind === "step" ? "bg-gradient-to-r from-violet-700 to-fuchsia-600 text-white" : "text-slate-600"}`}>Etapas</button>
          </div>
          <p className="text-sm text-slate-500"><b className="text-slate-900" data-testid="models-count">{rows.length}</b> modelos</p>
        </div>
        <div className="relative mb-3 max-w-xl"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><Input className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Buscar modelos de ${kind === "task" ? "tarefa" : "etapa"}`} /></div>
        {error && <p role="alert" className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
        <section className="overflow-hidden rounded-2xl border bg-white">
          <div className="grid grid-cols-[1fr_auto] border-b bg-slate-50 px-4 py-3 text-sm font-bold"><span>Modelos globais de {kind === "task" ? "tarefas" : "etapas"}</span><span>Uso e revisão</span></div>
          {loading ? <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Carregando…</div>
            : visible.length === 0 ? <div className="py-16 text-center"><Icon className="mx-auto h-9 w-9 text-slate-300" /><p className="mt-3 font-semibold">Nenhum modelo encontrado.</p><p className="text-sm text-slate-500">Crie uma tarefa ou etapa dentro de um produto e ela aparece aqui.</p></div>
            : <div className="divide-y">{visible.map((row) => (
              <div key={row.id} data-testid="model-row" className="grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-3 hover:bg-violet-50/40">
                <button onClick={() => void openDetail(row)} className="min-w-0 text-left">
                  <span className="flex items-center gap-2"><span className="rounded-lg bg-violet-100 p-1.5 text-violet-700"><Icon className="h-4 w-4" /></span><b className="truncate">{row.name}</b><span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-700">#{row.id}</span><span className={`rounded-full px-2 py-0.5 text-[11px] ${row.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{row.is_active ? "Ativo" : "Inativo"}</span></span>
                  <span className="mt-1 block truncate pl-8 text-xs text-slate-500" data-testid="model-usage">
                    {kind === "step"
                      ? ((row.used_in_tasks ?? []).length ? `Usada em: ${(row.used_in_tasks as string[]).join(" · ")}` : "Ainda não usada em nenhuma tarefa de produto")
                      : `${row.step_count ?? 0} etapa(s) · ${row.product_count ?? 0} produto(s)`}
                  </span>
                </button>
                <div className="flex items-center gap-2">
                  <span className="hidden text-right text-xs text-slate-500 sm:block">{kind === "task" ? `${row.usage_count ?? 0} uso(s)` : `${row.usage_count ?? 0} uso(s)`}<br />revisão {row.revision}</span>
                  <button title="Ativar ou inativar" onClick={() => void toggleActive(row)} className="p-2 text-emerald-700">{row.is_active ? <CheckCircle2 className="h-4 w-4" /> : "Ativar"}</button>
                  {kind === "step" && <button title="Vincular a mais tarefas" aria-label={`Vincular ${row.name} a mais tarefas`} onClick={() => void startLink(row)} className="p-2 text-violet-700"><Link2 className="h-4 w-4" /></button>}
                  {kind === "step" && <button title="Duplicar e vincular" aria-label={`Duplicar ${row.name}`} onClick={() => void startCopy(row)} className="p-2 text-violet-700"><Copy className="h-4 w-4" /></button>}
                  <button title="Editar (editor completo)" aria-label={`Editar ${row.name}`} onClick={() => setEditing(row)} className="p-2 text-violet-700" data-testid="model-edit-btn"><Pencil className="h-4 w-4" /></button>
                </div>
              </div>))}</div>}
        </section>
      </div>

      {editing && <EmbeddedModelEditorDialog kind={kind} model={editing} onClose={() => { setEditing(null); void load(); }} />}

      {detail && (
        <Dialog open onOpenChange={(open) => !open && setDetail(null)}>
          <DialogContent className="max-h-[84vh] max-w-2xl overflow-y-auto" data-testid="model-detail">
            <DialogTitle>Modelo global de {kind === "task" ? "tarefa" : "etapa"} #{detail.id}</DialogTitle>
            <div className="mt-3 space-y-4">
              <div><p className="text-lg font-bold">{detail.name}</p><p className="text-sm text-slate-600">{detail.description || "Sem descrição."}</p></div>
              {kind === "task"
                ? <section><p className="mb-2 font-bold">Etapas vinculadas (na ordem)</p><div className="space-y-2">{(detail.steps ?? []).length ? (detail.steps as any[]).map((link: any, index: number) => <div key={link.id ?? index} className="rounded-xl border px-3 py-2 text-sm"><b>{index + 1}. {link.step_model?.name}</b></div>) : <p className="text-sm text-slate-500">Nenhuma etapa vinculada.</p>}</div><p className="mt-2 text-xs text-slate-500">Para mudar etapas, ordem e fluxo, abra o editor completo: ele mostra a tarefa inteira, igual ao produto.</p></section>
                : <section><p className="mb-2 font-bold">Tarefas que usam esta etapa</p>{(detail.instances ?? []).length ? <div className="space-y-2">{(detail.instances as any[]).map((i: any) => <div key={i.step_id} className="rounded-xl border px-3 py-2 text-sm font-medium">{i.task_name} <span className="font-normal text-slate-500">· {i.product_name} · v{i.version} ({STATE_LABEL(i.state)})</span></div>)}</div> : <p className="rounded-xl border border-dashed p-3 text-sm text-slate-500">Ainda não está em nenhuma tarefa de produto.</p>}</section>}
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="outline" onClick={() => setDetail(null)}>Fechar</Button>
                {kind === "step" && <Button variant="outline" onClick={() => { setLink(detail); setDetail(null); }}><Link2 className="mr-1 h-4 w-4" />Vincular a tarefas</Button>}
                {kind === "step" && <Button variant="outline" onClick={() => { setCopy(detail); setDetail(null); }}><Copy className="mr-1 h-4 w-4" />Duplicar e vincular</Button>}
                <Button onClick={() => { setEditing(detail); setDetail(null); }}>Editar</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
      {copy && <CopyDialog model={copy} tasks={taskModels} onClose={() => setCopy(null)} onCopy={async (name, ids) => { try { await apiClient.copyCatalog2StepModel(copy.id, { name, task_model_ids: ids }); setCopy(null); await load(); } catch (e: any) { setError(e?.message ?? "Não foi possível copiar a etapa."); throw e; } }} />}
      {link && <LinkDialog model={link} tasks={taskModels} onClose={() => setLink(null)} onLink={async (ids) => { try { await apiClient.linkCatalog2StepModelTasks(link.id, ids); setLink(null); await load(); } catch (e: any) { setError(e?.message ?? "Não foi possível vincular."); throw e; } }} />}
    </div>
  );
}
