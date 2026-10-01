"use client";

// Catálogo global de modelos de tarefa/etapa — peças de interface usadas pela
// tela "Entrega: tarefas, etapas e prazos" do editor de produto:
//  • seletor de modelo existente (busca por #ID, nome, especialidade, executor…)
//  • visualização do modelo global sem sair do cadastro do produto
//  • pergunta "somente neste produto" x "atualizar modelo global"
import { useCallback, useEffect, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

export const EXEC_LABEL: Record<string, string> = { humano: "Humano", ia: "IA", hibrido: "Humano ou IA" };
export const PURPOSE_LABEL: Record<string, string> = {
  execucao: "Execução",
  coleta_informacao: "Coleta de informação",
  validacao: "Validação",
  revisao: "Revisão",
  qualificacao: "Qualificação",
  aprovacao_cliente: "Aprovação do cliente",
  entrega: "Entrega",
};

export const CYCLE_TYPE_LABEL: Record<string, string> = {
  implementacao: "Implementação inicial",
  recorrente: "Recorrente",
  revalidacao: "Revalidação",
  avulso: "Avulso (uma vez)",
  sob_demanda: "Sob demanda",
};
export const REPEAT_RULE_LABEL: Record<string, string> = {
  all_cycles: "Todos os ciclos",
  first_only: "Somente na primeira execução",
  every_n_cycles: "A cada N ciclos",
  on_condition: "Somente por condição/mudança",
  manual: "Manual (um líder libera)",
};
export const CONTINUITY_LABEL: Record<string, string> = {
  not_allowed: "Não permitido (fila normal)",
  allowed: "Permitido (cliente ou líder escolhe)",
  recommended: "Recomendado (sugere manter)",
  required: "Obrigatório (mesmo executor)",
};
export const ASSET_RULE_LABEL: Record<string, string> = {
  first_only: "Validar só na primeira execução",
  always: "Sempre validar",
  every_x_days: "Revalidar a cada X dias",
  on_executor_change: "Revalidar se houver troca de executor",
  on_client_change: "Revalidar se o cliente informar mudança",
  none_while_valid: "Não exigir revalidação enquanto válido",
  light_check: "Só verificação leve enquanto válidos",
};
export const IMPLEMENTATION_RULE_LABEL: Record<string, string> = {
  first_only: "Somente na 1ª contratação do cliente",
  always: "Em toda contratação",
  on_revalidation: "Só quando houver revalidação (mudança de escopo, acesso expirado, novo ambiente)",
};

export function fmtMinutes(m: number | null | undefined) {
  if (m == null) return "? min";
  if (m >= 60 && m % 60 === 0) return `${m / 60} h`;
  return `${m} min`;
}

const selectCls = "h-9 rounded border border-neutral-300 bg-transparent px-1 text-sm dark:border-neutral-700";

/** Chips de "Modelo global" x "Configuração específica" (+ modelo atualizado). */
export function ModelStatusChips({ model, onSync, readOnly }: { model: any; onSync?: () => void; readOnly?: boolean }) {
  if (!model) return null;
  return (
    <>
      {model.customized ? (
        <span title="Este produto usa valores próprios; o modelo global não foi alterado." className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">Configuração específica deste produto</span>
      ) : (
        <span title="Os valores são os do modelo global." className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">Modelo global</span>
      )}
      {model.outdated && (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-800 dark:bg-blue-900/40 dark:text-blue-200">
          Modelo global atualizado (rev. {model.revision})
          {!readOnly && onSync && <button type="button" className="underline" onClick={onSync}>trazer para este produto</button>}
        </span>
      )}
      {model.is_active === false && <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-[10px] font-semibold text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200">Modelo inativo</span>}
    </>
  );
}

/** Indicadores da tarefa (condicional, aprovação do cliente, qualificação). */
export function TaskIndicators({ task }: { task: any }) {
  return (
    <>
      {task.cycle_type && task.cycle_type !== "recorrente" && <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-800 dark:bg-sky-900/40 dark:text-sky-200">{CYCLE_TYPE_LABEL[task.cycle_type] ?? task.cycle_type}</span>}
      {task.repeat_rule && task.repeat_rule !== "all_cycles" && <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700 dark:bg-sky-950/40 dark:text-sky-300">{task.repeat_rule === "every_n_cycles" ? `A cada ${task.repeat_every_cycles ?? 1} ciclos` : REPEAT_RULE_LABEL[task.repeat_rule] ?? task.repeat_rule}</span>}
      {task.executor_continuity && task.executor_continuity !== "not_allowed" && <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-semibold text-teal-800 dark:bg-teal-900/40 dark:text-teal-200">Continuidade: {(CONTINUITY_LABEL[task.executor_continuity] ?? task.executor_continuity).split(" (")[0]}</span>}
      {task.is_conditional && <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">Condicional</span>}
      {task.requires_review && <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">Revisão</span>}
      {task.requires_client_approval &&<span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">Aprovação do cliente</span>}
      {task.requires_qualification && <span className="rounded-full bg-fuchsia-100 px-2 py-0.5 text-[10px] font-semibold text-fuchsia-800 dark:bg-fuchsia-900/40 dark:text-fuchsia-200">Qualificação obrigatória</span>}
    </>
  );
}

// ── Seletor de modelo existente ─────────────────────────────────────────────
type PickerKind = "task" | "step";

export function ModelPickerDialog({
  kind, open, onClose, onPick, refs,
}: { kind: PickerKind; open: boolean; onClose: () => void; onPick: (modelId: number) => void | Promise<void>; refs: any }) {
  const [q, setQ] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [executor, setExecutor] = useState("");
  const [purpose, setPurpose] = useState("");
  const [cycle, setCycle] = useState("");
  const [status, setStatus] = useState<"active" | "inactive" | "all">("active");
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState<number | null>(null);
  const [limit, setLimit] = useState(20);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(() => {
      const params = { q: q.trim() || undefined, specialty_id: specialty || undefined, execution_mode: executor || undefined, purpose: kind === "step" ? purpose || undefined : undefined, cycle_type: kind === "task" ? cycle || undefined : undefined, status, limit };
      (kind === "task" ? apiClient.getCatalog2TaskModels(params) : apiClient.getCatalog2StepModels(params))
        .then((r) => { if (!cancelled) { setRows(r.data); setTotal(r.total); } })
        .finally(() => { if (!cancelled) setLoading(false); });
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [open, kind, q, specialty, executor, purpose, cycle, status, limit]);

  const label = kind === "task" ? "Tarefa" : "Etapa";
  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-hidden p-0">
          <div className="flex max-h-[85vh] flex-col gap-3 p-5">
            <DialogTitle>Selecionar {kind === "task" ? "modelo de tarefa" : "etapa"} existente</DialogTitle>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[14rem] flex-1">
                <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-neutral-400" />
                <Input className="pl-8" placeholder={`Buscar por #ID (ex.: #12) ou nome da ${label.toLowerCase()}…`} value={q} onChange={(e) => { setQ(e.target.value); setLimit(20); }} autoFocus />
              </div>
              <select aria-label="Especialidade" className={selectCls} value={specialty} onChange={(e) => setSpecialty(e.target.value)}>
                <option value="">Toda especialidade</option>
                {(refs?.specialties ?? []).map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <select aria-label="Executor" className={selectCls} value={executor} onChange={(e) => setExecutor(e.target.value)}>
                <option value="">Todo executor</option>
                {Object.entries(EXEC_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              {kind === "step" && (
                <select aria-label="Tipo/finalidade" className={selectCls} value={purpose} onChange={(e) => setPurpose(e.target.value)}>
                  <option value="">Toda finalidade</option>
                  {Object.entries(PURPOSE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              )}
              {kind === "task" && (
                <select aria-label="Tipo de ciclo" className={selectCls} value={cycle} onChange={(e) => setCycle(e.target.value)}>
                  <option value="">Todo tipo de ciclo</option>
                  {Object.entries(CYCLE_TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              )}
              <select aria-label="Status" className={selectCls} value={status} onChange={(e) => setStatus(e.target.value as any)}>
                <option value="active">Ativos</option>
                <option value="inactive">Inativos</option>
                <option value="all">Todos</option>
              </select>
            </div>
            <div className="min-h-[12rem] flex-1 space-y-1.5 overflow-y-auto pr-1">
              {loading && rows.length === 0 && <p className="flex items-center gap-2 text-sm text-neutral-500"><Loader2 className="h-4 w-4 animate-spin" /> Buscando…</p>}
              {!loading && rows.length === 0 && <p className="text-sm text-neutral-500">Nenhum modelo encontrado com esses filtros.</p>}
              {rows.map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-800">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${kind === "task" ? "bg-violet-100 text-violet-700" : "bg-sky-100 text-sky-700"}`}>{label} #{m.id}</span>
                      <span className="truncate font-medium">{m.name}</span>
                      {!m.is_active && <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-[10px] font-semibold text-neutral-700">inativo</span>}
                    </div>
                    <div className="mt-0.5 text-xs text-neutral-500">
                      {EXEC_LABEL[m.execution_mode] ?? m.execution_mode} · {m.specialty?.name ?? "sem especialidade"} · {fmtMinutes(m.estimated_minutes)}
                      {kind === "task" ? ` · ${CYCLE_TYPE_LABEL[m.cycle_type] ?? m.cycle_type ?? "—"} · ${m.step_count} etapa(s)` : ` · ${PURPOSE_LABEL[m.purpose] ?? m.purpose}`} · {kind === "task" && m.product_count != null ? `usado em ${m.product_count} produto(s)` : `usado em ${m.usage_count}`} · revisão {m.revision ?? 1}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {kind === "task" && <Button size="sm" variant="ghost" onClick={() => setInfo(m.id)}>Ver</Button>}
                    <Button size="sm" disabled={!m.is_active} onClick={async () => { await onPick(m.id); onClose(); }}>Usar</Button>
                  </div>
                </div>
              ))}
              {rows.length < total && <Button size="sm" variant="outline" onClick={() => setLimit((l) => l + 20)}>Mostrar mais ({total - rows.length} restantes)</Button>}
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-neutral-500">{total} modelo(s). Usar um modelo cria a {label.toLowerCase()} neste produto vinculada ao modelo global.</p>
              <Button variant="outline" size="sm" onClick={onClose}>Fechar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {info != null && <TaskModelInfoDialog id={info} onClose={() => setInfo(null)} />}
    </>
  );
}

/** Antes de criar uma tarefa/etapa nova: mostra os modelos de nome parecido e deixa usar um deles em vez de duplicar. */
export function SimilarModelsDialog({ kind, similar, onUse, onCreateAnyway, onCancel }: { kind: "task" | "step"; similar: { id: number; name: string; label: string; is_active: boolean; similarity: number; reason: string; compatible?: boolean; match?: string[]; same_specialty?: boolean; same_execution_mode?: boolean; same_cycle?: boolean | null }[]; onUse: (id: number) => void; onCreateAnyway: (justification: string) => void; onCancel: () => void }) {
  const [asking, setAsking] = useState(false);
  const [why, setWhy] = useState("");
  return (
    <Dialog open onOpenChange={(v) => { if (!v) onCancel(); }}>
      <DialogContent className="max-w-lg">
        <DialogTitle>Já existe {kind === "task" ? "uma tarefa" : "uma etapa"} parecida</DialogTitle>
        <p className="text-sm text-neutral-600 dark:text-neutral-300">Reaproveitar o modelo existente evita duplicar cadastro. Se for mesmo algo diferente, pode criar um novo.</p>
        <ul className="space-y-1.5">
          {similar.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-800">
              <span className="min-w-0"><span className="mr-1.5 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700">{m.label}</span><span className="font-medium">{m.name}</span><span className="block text-[11px] text-neutral-500">{(m.match ?? []).length ? `igual/parecido em: ${m.match!.join(", ")}` : m.reason === "mesmo_nome" ? "mesmo nome" : "nome parecido"} · {Math.round(m.similarity * 100)}% de semelhança</span><span className={`block text-[11px] ${m.compatible ? "font-semibold text-emerald-700" : "text-amber-700"}`}>{m.compatible ? "Compatível: mesma especialidade, executor e ciclo — recomendado reaproveitar" : `Diferenças: ${[m.same_specialty === false && "especialidade", m.same_execution_mode === false && "executor", m.same_cycle === false && "ciclo"].filter(Boolean).join(", ") || "—"}`}</span></span>
              <Button size="sm" disabled={!m.is_active} onClick={() => onUse(m.id)}>Usar este</Button>
            </li>
          ))}
        </ul>
        {asking ? (
          <div className="space-y-2">
            <textarea aria-label="Justificativa para criar um novo modelo" rows={2} className="w-full rounded-md border border-neutral-300 p-2 text-sm dark:border-neutral-700" placeholder="Por que um modelo novo, se já existe um parecido? (mínimo de 10 caracteres — fica registrado com o seu nome)" value={why} onChange={(e) => setWhy(e.target.value)} />
            <div className="flex justify-end gap-2"><Button variant="ghost" size="sm" onClick={() => setAsking(false)}>Voltar</Button><Button size="sm" disabled={why.trim().length < 10} onClick={() => onCreateAnyway(why.trim())}>Confirmar criação do novo modelo</Button></div>
          </div>
        ) : (
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={onCancel}>Cancelar</Button>
            <Button variant="outline" size="sm" onClick={() => setAsking(true)}>Criar novo mesmo assim…</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Ver o modelo global sem sair do produto ─────────────────────────────────
export function TaskModelInfoDialog({ id, onClose, kind = "task" }: { id: number; onClose: () => void; kind?: PickerKind }) {
  const [m, setM] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => {
    (kind === "task" ? apiClient.getCatalog2TaskModel(id) : apiClient.getCatalog2StepModel(id)).then(setM).catch((e: any) => setErr(e?.message ?? "Não foi possível carregar o modelo."));
  }, [id, kind]);
  useEffect(() => { load(); }, [load]);
  async function toggle() {
    if (!m) return;
    setBusy(true);
    try {
      await (kind === "task" ? apiClient.setCatalog2TaskModelActive(m.id, !m.is_active) : apiClient.setCatalog2StepModelActive(m.id, !m.is_active));
      load();
    } catch (e: any) { setErr(e?.message ?? "Falha ao alterar o status."); } finally { setBusy(false); }
  }
  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogTitle>{kind === "task" ? "Modelo global de tarefa" : "Modelo global de etapa"}{m ? ` #${m.id}` : ""}</DialogTitle>
        {err && <p role="alert" className="text-sm text-red-600">{err}</p>}
        {!m && !err && <p className="flex items-center gap-2 text-sm text-neutral-500"><Loader2 className="h-4 w-4 animate-spin" /> Carregando…</p>}
        {m && (
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-base font-semibold">{m.name}</p>
              {m.description && <p className="mt-1 whitespace-pre-line text-neutral-600 dark:text-neutral-300">{m.description}</p>}
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <dt className="text-neutral-500">Executor</dt><dd>{EXEC_LABEL[m.execution_mode] ?? m.execution_mode}</dd>
              <dt className="text-neutral-500">Especialidade</dt><dd>{m.specialty?.name ?? "—"}</dd>
              <dt className="text-neutral-500">Tempo estimado</dt><dd>{fmtMinutes(m.estimated_minutes)}</dd>
              {kind === "task" ? (
                <>
                  <dt className="text-neutral-500">Condicional</dt><dd>{m.is_conditional ? "Sim" : "Não"}</dd>
                  <dt className="text-neutral-500">Aprovação do cliente</dt><dd>{m.requires_client_approval ? "Sim" : "Não"}</dd>
                  <dt className="text-neutral-500">Qualificação obrigatória</dt><dd>{m.requires_qualification ? "Sim" : "Não"}</dd>
                  <dt className="text-neutral-500">Questionário</dt><dd>{m.questionnaire?.name ?? "—"}</dd>
                </>
              ) : (
                <>
                  <dt className="text-neutral-500">Finalidade</dt><dd>{PURPOSE_LABEL[m.purpose] ?? m.purpose}</dd>
                  <dt className="text-neutral-500">Critério de conclusão</dt><dd>{m.completion_criteria ?? "—"}</dd>
                </>
              )}
              <dt className="text-neutral-500">Revisão / status</dt><dd>rev. {m.revision} · {m.is_active ? "Ativo" : "Inativo"}</dd>
            </dl>
            {m.ops && (
              <dl className="space-y-1.5 rounded-lg bg-neutral-50 p-2 text-xs dark:bg-neutral-900">
                {([["objective", "Objetivo"], ["instructions", "Instruções"], ["required_inputs", "Entradas necessárias"], ["expected_output", "Saída esperada"], ["acceptance_criteria", "Critério de aceite"], ["risks_notes", "Riscos e observações"], ["evidence_hint", "Evidência"]] as const).filter(([k]) => m.ops[k]).map(([k, label]) => (
                  <div key={k}><dt className="font-semibold text-neutral-500">{label}</dt><dd className="whitespace-pre-line">{m.ops[k]}</dd></div>
                ))}
                {m.ops.evidence_required && <div className="font-semibold text-amber-700">Evidência obrigatória para concluir.</div>}
              </dl>
            )}
            {kind === "task" && m.steps?.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-semibold text-neutral-500">Etapas padrão</p>
                <ol className="space-y-1 text-xs">
                  {m.steps.map((s: any, i: number) => (
                    <li key={s.id}>{i + 1}. <span className="font-semibold text-sky-700">Etapa #{s.step_model.id}</span> {s.step_model.name} <span className="text-neutral-500">· {PURPOSE_LABEL[s.step_model.purpose] ?? s.step_model.purpose} · {EXEC_LABEL[s.step_model.execution_mode] ?? s.step_model.execution_mode} · {fmtMinutes(s.step_model.estimated_minutes)}</span></li>
                  ))}
                </ol>
              </div>
            )}
            {kind === "task" && (
              <div>
                <p className="mb-1 text-xs font-semibold text-neutral-500">Usado em {m.used_by?.length ?? 0} produto(s)</p>
                <ul className="space-y-0.5 text-xs">
                  {(m.used_by ?? []).map((u: any) => <li key={u.product_id}>{u.product_number != null ? `#${u.product_number} · ` : ""}{u.product_name} <span className="text-neutral-500">({[...new Set(u.versions)].join(", ")})</span></li>)}
                  {(m.used_by ?? []).length === 0 && <li className="text-neutral-500">Ainda não usado.</li>}
                </ul>
              </div>
            )}
            <div className="flex items-center justify-between gap-2 border-t border-neutral-200 pt-3 dark:border-neutral-800">
              <p className="text-xs text-neutral-500">Modelos nunca são apagados: só inativados (deixam de aparecer para novos produtos; o histórico e os produtos que já usam continuam intactos).</p>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => void toggle()}>{m.is_active ? "Inativar modelo" : "Reativar modelo"}</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── "Somente neste produto" x "Atualizar modelo global" ─────────────────────
export function ModelScopeDialog({
  open, kindLabel, modelId, onChoose, onCancel,
}: { open: boolean; kindLabel: string; modelId: number; onChoose: (scope: "product" | "model") => void; onCancel: () => void }) {
  const [confirmModel, setConfirmModel] = useState(false);
  if (confirmModel) {
    return (
      <Dialog open={open} onOpenChange={(v) => { if (!v) { setConfirmModel(false); onCancel(); } }}>
        <DialogContent className="max-w-lg">
          <DialogTitle>Confirmar alteração do modelo global?</DialogTitle>
          <p className="text-sm text-neutral-700 dark:text-neutral-200">Você está alterando o modelo global <strong>#{modelId}</strong>. Ele é reutilizado por outros produtos: eles receberão o aviso de “modelo global atualizado” e poderão trazer a mudança nas próximas versões. Versões já publicadas não mudam.</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setConfirmModel(false)}>Voltar</Button>
            <Button size="sm" onClick={() => { setConfirmModel(false); onChoose("model"); }}>Sim, atualizar o modelo global</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onCancel(); }}>
      <DialogContent className="max-w-lg">
        <DialogTitle>Onde aplicar esta alteração?</DialogTitle>
        <p className="text-sm text-neutral-600 dark:text-neutral-300">Esta {kindLabel} usa o modelo global #{modelId}. Escolha explicitamente:</p>
        <div className="space-y-2">
          <button type="button" className="w-full rounded-lg border border-neutral-300 p-3 text-left hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-900" onClick={() => onChoose("product")}>
            <p className="text-sm font-semibold">Alterar somente neste produto</p>
            <p className="text-xs text-neutral-500">Cria uma configuração própria deste produto. O modelo original continua intacto.</p>
          </button>
          <button type="button" className="w-full rounded-lg border border-neutral-300 p-3 text-left hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-900" onClick={() => setConfirmModel(true)}>
            <p className="text-sm font-semibold">Atualizar modelo global</p>
            <p className="text-xs text-neutral-500">Altera o modelo reutilizável (sobe a revisão). Outros produtos não mudam sozinhos: recebem o aviso "modelo global atualizado" e você decide quando trazer. Versões já publicadas nunca mudam.</p>
          </button>
        </div>
        <div className="flex justify-end"><Button variant="ghost" size="sm" onClick={onCancel}>Cancelar</Button></div>
      </DialogContent>
    </Dialog>
  );
}
