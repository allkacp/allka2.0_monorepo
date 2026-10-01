"use client";

// IA na tarefa (Pedido 3, fase 5): perfil de IA autorizado, modo de trabalho, instruções (com versão) e previsão de custo.
import { useEffect, useState } from "react";
import { Bot, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiClient } from "@/lib/api-client";
import { AiProfilesManager } from "./catalog2-ai-profiles-ui";

const MODES: [string, string, string][] = [
  ["autonoma", "Executa sozinha", "A IA executa a etapa e a conclui; a entrega sempre passa pela revisão humana (se a revisão estiver ligada)."],
  ["rascunho", "Rascunho para um humano", "A IA escreve e um humano autorizado adota (podendo editar) ou descarta. Nada segue sem essa confirmação."],
  ["auxilia", "Auxilia o humano", "O humano executa; a IA só dá sugestões, que ficam registradas."],
];
const TRIGGERS: [string, string][] = [["manual", "Manual (alguém aciona) — padrão"], ["automatica", "Automática após todos os pré-requisitos"], ["so_rascunho", "Apenas rascunho (nunca conclui sozinha)"]];
const n = (v: any) => (v === "" || v == null ? null : Number(v));

function NewProfile({ onCreated }: { onCreated: (p: any) => void }) {
  const [f, setF] = useState({ name: "", model: "gemini-2.5-flash", cin: "", cout: "", fixed: "", leader: true, executor: false });
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="space-y-1.5 rounded-lg border border-dashed border-slate-300 p-2 text-[11px] dark:border-slate-700">
      <div className="flex flex-wrap gap-1.5">
        <Input className="h-7 min-w-[10rem] flex-1 text-xs" placeholder="Nome do perfil (ex.: Redator Gemini)" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <Input className="h-7 w-44 text-xs" placeholder="Modelo" value={f.model} onChange={(e) => setF({ ...f, model: e.target.value })} />
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <Input className="h-7 w-28 text-xs" type="number" step="0.0001" placeholder="R$/1k entrada" value={f.cin} onChange={(e) => setF({ ...f, cin: e.target.value })} />
        <Input className="h-7 w-28 text-xs" type="number" step="0.0001" placeholder="R$/1k saída" value={f.cout} onChange={(e) => setF({ ...f, cout: e.target.value })} />
        <Input className="h-7 w-28 text-xs" type="number" step="0.01" placeholder="R$ fixo/exec." value={f.fixed} onChange={(e) => setF({ ...f, fixed: e.target.value })} />
        <label className="inline-flex items-center gap-1"><input type="checkbox" checked={f.leader} onChange={(e) => setF({ ...f, leader: e.target.checked })} /> Líder aciona</label>
        <label className="inline-flex items-center gap-1"><input type="checkbox" checked={f.executor} onChange={(e) => setF({ ...f, executor: e.target.checked })} /> Executor aciona</label>
        <Button size="sm" className="h-7" disabled={!f.name.trim()} onClick={async () => {
          setErr(null);
          try {
            const p = await apiClient.createCatalog2AIProfile({ name: f.name.trim(), model: f.model.trim() || undefined, unit_cost_input_per_1k: n(f.cin), unit_cost_output_per_1k: n(f.cout), fixed_cost_per_run: n(f.fixed) ?? 0, allowed_actors: [f.leader && "leader", f.executor && "executor"].filter(Boolean) });
            onCreated(p);
            setF({ ...f, name: "" });
          } catch (e: any) { setErr(e?.message ?? "Não foi possível criar o perfil."); }
        }}>Criar perfil</Button>
      </div>
      {err && <p role="alert" className="text-red-600">{err}</p>}
    </div>
  );
}

export function AiConfig({ task, act }: { task: any; act: any }) {
  const a = task.ai ?? {};
  const [profiles, setProfiles] = useState<any[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [manage, setManage] = useState(false);
  const [f, setF] = useState({
    profile_id: a.profile_id ?? "", ai_mode: a.ai_mode ?? "rascunho", ai_trigger: a.ai_trigger ?? "manual", instructions: a.instructions ?? "", human_review_required: a.human_review_required ?? true,
    est_input_tokens: a.est_input_tokens ?? "", est_output_tokens: a.est_output_tokens ?? "", est_review_rounds: a.est_review_rounds ?? "",
  });
  useEffect(() => { apiClient.getCatalog2AIProfiles().then((r) => setProfiles(r.data)).catch(() => {}); }, []);
  const prof = profiles.find((p) => p.id === f.profile_id);
  const est = prof && f.est_input_tokens !== "" ? ((Number(f.est_input_tokens) / 1000) * (prof.unit_cost_input_per_1k ?? 0) + (Number(f.est_output_tokens || 0) / 1000) * (prof.unit_cost_output_per_1k ?? 0) + (prof.fixed_cost_per_run ?? 0)) : null;
  return (
    <div className="w-full space-y-2 rounded-lg border border-violet-200 bg-violet-50/40 p-2.5 text-xs dark:border-violet-900/50 dark:bg-violet-950/10">
      <p className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-violet-700 dark:text-violet-300"><Bot className="h-3 w-3" /> IA desta tarefa <span className="font-normal normal-case text-slate-500">— só roda com um perfil de IA autorizado; a IA nunca publica nem envia nada sozinha</span></p>
      <div className="flex flex-wrap items-center gap-2">
        <select aria-label="Perfil de IA" className="h-8 rounded-md border border-slate-200 bg-white px-2 dark:border-slate-700 dark:bg-slate-900" value={f.profile_id} onChange={(e) => setF({ ...f, profile_id: e.target.value })}>
          <option value="">Escolha o perfil de IA…</option>
          {profiles.filter((p) => p.is_active || p.id === f.profile_id).map((p) => <option key={p.id} value={p.id}>{p.name}{p.is_active ? "" : " (desativado)"}</option>)}
        </select>
        <button type="button" title="Criar um novo perfil de IA" className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" onClick={() => setShowNew((v) => !v)}><Plus className="h-3 w-3" /> Novo perfil</button>
        <select aria-label="Modo da IA" className="h-8 rounded-md border border-slate-200 bg-white px-2 dark:border-slate-700 dark:bg-slate-900" value={f.ai_mode} onChange={(e) => setF({ ...f, ai_mode: e.target.value })}>
          {MODES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select aria-label="Quando a IA roda" className="h-8 rounded-md border border-slate-200 bg-white px-2 dark:border-slate-700 dark:bg-slate-900" value={f.ai_trigger} onChange={(e) => setF({ ...f, ai_trigger: e.target.value })}>
          {TRIGGERS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <label className="inline-flex items-center gap-1" title="A saída da IA passa pela revisão de um humano antes de seguir"><input type="checkbox" checked={f.human_review_required} onChange={(e) => setF({ ...f, human_review_required: e.target.checked })} /> Revisão humana obrigatória</label>
      </div>
      <p className="text-[11px] text-slate-500">{MODES.find((m) => m[0] === f.ai_mode)?.[2]}</p>
      <button type="button" className="text-[11px] font-semibold text-violet-700 underline" onClick={() => setManage(true)}>Gerenciar perfis de IA (editar, testar conexão e execução, versões do prompt)</button>
      <AiProfilesManager open={manage} onClose={() => setManage(false)} onChanged={setProfiles} />
      {showNew && <NewProfile onCreated={(p) => { setProfiles((c) => [...c, p]); setF((c) => ({ ...c, profile_id: p.id })); setShowNew(false); }} />}
      <label className="block space-y-1">
        <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Instruções para a IA <span className="font-normal text-slate-400">(versão do prompt: {a.prompt_version ?? 1} — sobe sozinha quando o texto muda)</span></span>
        <Textarea rows={4} maxLength={20000} value={f.instructions} onChange={(e) => setF({ ...f, instructions: e.target.value })} className="min-h-0 text-xs" />
      </label>
      <div className="flex flex-wrap items-end gap-2">
        {([["est_input_tokens", "Tokens de entrada (prev.)"], ["est_output_tokens", "Tokens de saída (prev.)"], ["est_review_rounds", "Rodadas de revisão"]] as const).map(([k, l]) => (
          <label key={k} className="space-y-0.5 text-[11px] text-slate-600 dark:text-slate-300">{l}<Input type="number" className="h-7 w-28 text-xs" value={(f as any)[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></label>
        ))}
        {est != null && <span className="pb-1 text-[11px] text-slate-600 dark:text-slate-300">Custo previsto por execução: <strong>R$ {est.toFixed(4).replace(".", ",")}</strong></span>}
        <Button size="sm" className="ml-auto h-7" onClick={() => void act(() => apiClient.updateCatalog2TaskAI(task.id, { profile_id: f.profile_id || null, ai_mode: f.ai_mode, ai_trigger: f.ai_trigger, instructions: f.instructions.trim() ? f.instructions : null, human_review_required: f.human_review_required, est_input_tokens: n(f.est_input_tokens), est_output_tokens: n(f.est_output_tokens), est_review_rounds: n(f.est_review_rounds) }), "IA da tarefa salva.")}>Salvar IA</Button>
      </div>
    </div>
  );
}
