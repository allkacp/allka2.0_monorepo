"use client";

// Perfis de IA (universal): criar, editar, ativar/inativar, testar a conexão, testar uma execução (descartável, nada é gravado em
// tarefa nenhuma), ver as versões do prompt e as execuções. Uma tarefa de IA só publica com perfil ativo, provedor configurado,
// modelo disponível, instruções, revisão humana (quando o perfil exige) e custo calculável.
import { useCallback, useEffect, useState } from "react";
import { Bot, CheckCircle2, Loader2, Plus, X, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { apiClient } from "@/lib/api-client";

const sel = "h-8 rounded-md border border-slate-200 bg-white px-2 text-xs dark:border-slate-700 dark:bg-slate-900";
const nullable = (v: string) => (v.trim() === "" ? null : Number(v));
const brl4 = (n: number | null | undefined) => (n == null ? "—" : `R$ ${n.toFixed(4).replace(".", ",")}`);

interface Form {
  name: string; description: string; provider: string; model: string; base_instructions: string; input_format: string; output_format: string;
  cin: string; cout: string; fixed: string; max_tokens_per_run: string; max_runs_per_task: string; on_failure: string; fallback_human: boolean; requires_human_review: boolean;
  leader: boolean; executor: boolean; is_active: boolean;
}
const blank = (): Form => ({ name: "", description: "", provider: "gemini", model: "gemini-2.5-flash", base_instructions: "", input_format: "", output_format: "", cin: "", cout: "", fixed: "", max_tokens_per_run: "", max_runs_per_task: "", on_failure: "forward_human", fallback_human: true, requires_human_review: true, leader: true, executor: false, is_active: true });
const fromProfile = (p: any): Form => ({
  name: p.name, description: p.description ?? "", provider: p.provider, model: p.model, base_instructions: p.base_instructions ?? "", input_format: p.input_format ?? "", output_format: p.output_format ?? "",
  cin: p.unit_cost_input_per_1k != null ? String(p.unit_cost_input_per_1k) : "", cout: p.unit_cost_output_per_1k != null ? String(p.unit_cost_output_per_1k) : "", fixed: p.fixed_cost_per_run ? String(p.fixed_cost_per_run) : "",
  max_tokens_per_run: p.max_tokens_per_run != null ? String(p.max_tokens_per_run) : "", max_runs_per_task: p.max_runs_per_task != null ? String(p.max_runs_per_task) : "",
  on_failure: p.on_failure ?? "forward_human", fallback_human: p.fallback_human ?? true, requires_human_review: p.requires_human_review ?? true,
  leader: String(p.allowed_actors ?? "").includes("leader"), executor: String(p.allowed_actors ?? "").includes("executor"), is_active: p.is_active,
});
const toBody = (f: Form) => ({
  name: f.name.trim(), description: f.description.trim() || null, provider: f.provider, model: f.model, base_instructions: f.base_instructions.trim() || null,
  input_format: f.input_format.trim() || null, output_format: f.output_format.trim() || null,
  unit_cost_input_per_1k: nullable(f.cin), unit_cost_output_per_1k: nullable(f.cout), fixed_cost_per_run: nullable(f.fixed) ?? 0,
  max_tokens_per_run: nullable(f.max_tokens_per_run), max_runs_per_task: nullable(f.max_runs_per_task), on_failure: f.on_failure, fallback_human: f.fallback_human, requires_human_review: f.requires_human_review,
  allowed_actors: [...(f.leader ? ["leader"] : []), ...(f.executor ? ["executor"] : [])], is_active: f.is_active,
});

function ProfileForm({ profileId, providers, onSaved, onCancel }: { profileId: string | null; providers: any; onSaved: (p: any) => void; onCancel: () => void }) {
  const [f, setF] = useState<Form>(blank());
  const [detail, setDetail] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [conn, setConn] = useState<any>(null);
  const [testing, setTesting] = useState<"conn" | "run" | null>(null);
  const [sample, setSample] = useState("");
  const [run, setRun] = useState<any>(null);
  const [confirmCost, setConfirmCost] = useState(false);
  useEffect(() => {
    setConn(null); setRun(null); setErr(null);
    if (!profileId) { setF(blank()); setDetail(null); return; }
    apiClient.getCatalog2AIProfile(profileId).then((p: any) => { setDetail(p); setF(fromProfile(p)); }).catch((e: any) => setErr(e?.message ?? "Não foi possível abrir o perfil."));
  }, [profileId]);
  const prov = (providers?.data ?? []).find((p: any) => p.key === f.provider);
  const set = (patch: Partial<Form>) => setF((c) => ({ ...c, ...patch }));
  const field = (label: string, node: React.ReactNode, hint?: string) => <label className="block space-y-0.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300" title={hint}>{label}{node}</label>;

  async function save() {
    setSaving(true); setErr(null);
    try { const p: any = profileId ? await apiClient.updateCatalog2AIProfile(profileId, toBody(f)) : await apiClient.createCatalog2AIProfile(toBody(f)); onSaved(p); }
    catch (e: any) { setErr(e?.message ?? "Não foi possível salvar."); }
    finally { setSaving(false); }
  }
  async function testConnection() {
    if (!profileId) return;
    setTesting("conn"); setConn(null);
    try { setConn(await apiClient.testCatalog2AIProfileConnection(profileId)); } catch (e: any) { setConn({ ok: false, message: e?.message ?? "Falha no teste." }); } finally { setTesting(null); }
  }
  async function testRun() {
    if (!profileId || !sample.trim()) return;
    setTesting("run"); setRun(null);
    try { setRun(await apiClient.testCatalog2AIProfileRun(profileId, { sample_input: sample, confirm_cost: confirmCost })); } catch (e: any) { setRun({ ok: false, message: e?.message ?? "Falha no teste." }); } finally { setTesting(null); }
  }

  return (
    <div className="space-y-3 text-xs">
      <div className="grid gap-2 sm:grid-cols-2">
        {field("Nome do perfil", <Input className="h-8 text-xs" maxLength={160} value={f.name} onChange={(e) => set({ name: e.target.value })} />)}
        {field("Provedor", <select aria-label="Provedor" className={`${sel} w-full`} value={f.provider} onChange={(e) => { const p = (providers?.data ?? []).find((x: any) => x.key === e.target.value); set({ provider: e.target.value, model: p?.models?.[0] ?? f.model }); }}>{(providers?.data ?? []).map((p: any) => <option key={p.key} value={p.key}>{p.label}{p.configured ? "" : " (sem chave neste ambiente)"}</option>)}</select>)}
        {field("Modelo", <select aria-label="Modelo" className={`${sel} w-full`} value={f.model} onChange={(e) => set({ model: e.target.value })}>{(prov?.models ?? [f.model]).map((m: string) => <option key={m} value={m}>{m}</option>)}</select>)}
        {field("Descrição (opcional)", <Input className="h-8 text-xs" value={f.description} onChange={(e) => set({ description: e.target.value })} />)}
      </div>
      {prov && !prov.configured && <p className="rounded-md bg-amber-50 px-2 py-1 text-amber-800">O provedor {prov.label} não tem chave configurada neste ambiente: tarefas com este perfil não publicam e o teste de conexão vai avisar.</p>}
      {field("Instrução-base (enviada antes das instruções de cada tarefa)", <Textarea rows={4} maxLength={20000} className="min-h-0 text-xs" value={f.base_instructions} onChange={(e) => set({ base_instructions: e.target.value })} />, "Mudar este texto cria uma nova versão do prompt.")}
      <div className="grid gap-2 sm:grid-cols-2">
        {field("Formato da entrada", <Textarea rows={2} className="min-h-0 text-xs" maxLength={4000} value={f.input_format} onChange={(e) => set({ input_format: e.target.value })} />)}
        {field("Formato da saída", <Textarea rows={2} className="min-h-0 text-xs" maxLength={4000} value={f.output_format} onChange={(e) => set({ output_format: e.target.value })} />)}
      </div>
      <div className="flex flex-wrap items-end gap-2">
        {field("R$ por 1.000 tokens (entrada)", <Input className="h-8 w-32 text-xs" type="number" step="0.0001" value={f.cin} onChange={(e) => set({ cin: e.target.value })} />)}
        {field("R$ por 1.000 tokens (saída)", <Input className="h-8 w-32 text-xs" type="number" step="0.0001" value={f.cout} onChange={(e) => set({ cout: e.target.value })} />)}
        {field("R$ fixo por execução", <Input className="h-8 w-28 text-xs" type="number" step="0.01" value={f.fixed} onChange={(e) => set({ fixed: e.target.value })} />)}
        {field("Limite de tokens por execução", <Input className="h-8 w-32 text-xs" type="number" value={f.max_tokens_per_run} onChange={(e) => set({ max_tokens_per_run: e.target.value })} />)}
        {field("Máx. execuções por tarefa", <Input className="h-8 w-28 text-xs" type="number" value={f.max_runs_per_task} onChange={(e) => set({ max_runs_per_task: e.target.value })} />)}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex items-center gap-1" title="Se a IA falhar ou faltar informação"><span className="font-semibold">Se falhar:</span>
          <select aria-label="Se a IA falhar" className={sel} value={f.on_failure} onChange={(e) => set({ on_failure: e.target.value })}>{(providers?.on_failure ?? []).map((o: any) => <option key={o.key} value={o.key}>{o.label}</option>)}</select>
        </label>
        <label className="inline-flex items-center gap-1"><input type="checkbox" checked={f.fallback_human} onChange={(e) => set({ fallback_human: e.target.checked })} /> Um humano assume se a IA não conseguir</label>
        <label className="inline-flex items-center gap-1" title="Tarefas que usam este perfil precisam configurar a revisão humana"><input type="checkbox" checked={f.requires_human_review} onChange={(e) => set({ requires_human_review: e.target.checked })} /> Exige revisão humana</label>
        <label className="inline-flex items-center gap-1"><input type="checkbox" checked={f.leader} onChange={(e) => set({ leader: e.target.checked })} /> Líder aciona</label>
        <label className="inline-flex items-center gap-1"><input type="checkbox" checked={f.executor} onChange={(e) => set({ executor: e.target.checked })} /> Executor aciona</label>
        <label className="inline-flex items-center gap-1"><input type="checkbox" checked={f.is_active} onChange={(e) => set({ is_active: e.target.checked })} /> Perfil ativo</label>
      </div>
      {err && <p role="alert" className="text-red-600">{err}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" disabled={saving || !f.name.trim()} onClick={() => void save()}>{saving ? "Salvando…" : profileId ? "Salvar perfil" : "Criar perfil"}</Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>Fechar</Button>
        {detail && <span className="ml-auto text-[11px] text-slate-500">Versão do prompt: <strong>{detail.prompt_version}</strong> · usado em {detail.task_count} tarefa(s) · {detail.run_count} execução(ões) · custo realizado {brl4(detail.total_cost)}</span>}
      </div>
      {profileId && (
        <div className="space-y-2 rounded-lg border border-violet-200 bg-violet-50/40 p-2 dark:border-violet-900/50 dark:bg-violet-950/10">
          <p className="text-[11px] font-bold uppercase tracking-wide text-violet-700 dark:text-violet-300">Testes (nada disso vira tarefa, entrega ou histórico)</p>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" disabled={testing !== null} onClick={() => void testConnection()}>{testing === "conn" ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}Testar conexão</Button>
            {conn && <span role="status" className={`inline-flex items-center gap-1 ${conn.ok ? "text-emerald-700" : "text-red-600"}`}>{conn.ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}{conn.message}{conn.latency_ms != null ? ` (${conn.latency_ms} ms)` : ""}</span>}
          </div>
          <Textarea rows={2} className="min-h-0 text-xs" placeholder="Texto de exemplo para a IA processar neste teste" aria-label="Texto de exemplo do teste" value={sample} onChange={(e) => setSample(e.target.value)} />
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-1 text-[11px]" title="Este teste chama o provedor de IA de verdade e pode gerar custo"><input type="checkbox" checked={confirmCost} onChange={(e) => setConfirmCost(e.target.checked)} /> Entendo que o teste chama a IA e pode gerar custo</label>
            <Button size="sm" variant="outline" disabled={testing !== null || !sample.trim() || !confirmCost} onClick={() => void testRun()}>{testing === "run" ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}Testar execução</Button>
          </div>
          {run && (run.ok
            ? <div role="status" className="space-y-1 rounded-md bg-white p-2 dark:bg-slate-900"><p className="whitespace-pre-wrap">{run.output_text || <em className="text-slate-400">(sem texto)</em>}</p>{run.missing_information?.length > 0 && <p className="text-amber-700">Faltou informação: {run.missing_information.join("; ")}</p>}<p className="text-[11px] text-slate-500">{run.prompt_tokens}/{run.completion_tokens} tokens · custo {brl4(run.cost)} · {run.duration_ms} ms · prompt v{run.prompt_version} · teste descartável</p></div>
            : <p role="alert" className="text-red-600">{run.message}</p>)}
        </div>
      )}
      {detail?.prompt_versions?.length > 0 && (
        <details className="rounded-lg border border-slate-200 p-2 dark:border-slate-800">
          <summary className="cursor-pointer text-[11px] font-semibold text-slate-600">Versões do prompt ({detail.prompt_versions.length})</summary>
          <ul className="mt-1 space-y-1">{detail.prompt_versions.map((v: any) => <li key={v.id} className="rounded bg-slate-50 p-1.5 dark:bg-slate-800/40"><span className="font-semibold">v{v.version}</span> <span className="text-slate-400">{new Date(v.created_at).toLocaleString("pt-BR")}</span><p className="whitespace-pre-wrap text-slate-600 dark:text-slate-300">{v.base_instructions || "(sem instrução-base)"}</p></li>)}</ul>
        </details>
      )}
    </div>
  );
}

export function AiProfilesManager({ open, onClose, onChanged }: { open: boolean; onClose: () => void; onChanged?: (profiles: any[]) => void }) {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [providers, setProviders] = useState<any>(null);
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const reload = useCallback(async () => {
    const [p, pv] = await Promise.all([apiClient.getCatalog2AIProfiles(), apiClient.getCatalog2AIProviders()]);
    setProfiles(p.data); setProviders(pv); onChanged?.(p.data);
  }, [onChanged]);
  useEffect(() => { if (open) void reload().catch(() => {}); }, [open, reload]);
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setEditing(null); onClose(); } }}>
      <DialogContent className="max-h-[88vh] w-[95vw] overflow-y-auto sm:max-w-3xl">
        <DialogTitle className="flex items-center gap-2"><Bot className="h-4 w-4" /> Perfis de IA</DialogTitle>
        <p className="text-xs text-slate-500">Um perfil define provedor, modelo, instruções-base, custo, limites e o que fazer em caso de falha. Tarefas de IA só publicam com um perfil ativo e utilizável.</p>
        {editing ? (
          <ProfileForm profileId={editing === "new" ? null : editing} providers={providers} onCancel={() => setEditing(null)} onSaved={async () => { await reload(); setEditing(null); }} />
        ) : (
          <div className="space-y-2">
            <Button size="sm" className="gap-1" onClick={() => setEditing("new")}><Plus className="h-3.5 w-3.5" /> Novo perfil</Button>
            <ul className="space-y-1.5">
              {profiles.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs dark:border-slate-800">
                  <span className="min-w-0"><span className="font-semibold">{p.name}</span> <span className="text-slate-500">· {p.provider} / {p.model} · prompt v{p.prompt_version} · {p.task_count} tarefa(s)</span>
                    <span className="block text-[11px]">{p.is_active ? <span className="text-emerald-700">ativo</span> : <span className="text-slate-500">inativo</span>} · {p.provider_configured ? <span className="text-emerald-700">provedor configurado</span> : <span className="text-amber-700">provedor sem chave neste ambiente</span>}</span></span>
                  <span className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => setEditing(p.id)}>Abrir</Button>
                    <Button size="sm" variant="ghost" title={p.is_active ? "Inativar (não aparece para novas tarefas)" : "Ativar"} onClick={async () => { await apiClient.updateCatalog2AIProfile(p.id, { is_active: !p.is_active }); await reload(); }}>{p.is_active ? <><X className="mr-1 h-3 w-3" />Inativar</> : "Ativar"}</Button>
                  </span>
                </li>
              ))}
              {profiles.length === 0 && <li className="text-xs text-slate-400">Nenhum perfil cadastrado.</li>}
            </ul>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
