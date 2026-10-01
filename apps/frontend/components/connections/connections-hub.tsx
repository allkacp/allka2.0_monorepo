"use client";

// Central de "Conexões e acessos necessários": pendências ACIONÁVEIS (um item por conexão, com botão direto para resolver),
// minhas conexões, histórico e orientação. Uma visão por perfil: cliente/agência (o que preciso fornecer), executor (o que bloqueia
// meu trabalho), líder (pendências da equipe) e administrador (visão completa). Nunca mostra segredo.
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Clock, Loader2, Plug, RefreshCw, Sparkles } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConnectForm, METHOD_LABEL, NO_PASSWORD_MESSAGE, SCOPE_LABEL, StateBadge } from "./connection-forms";

export type HubRole = "company" | "agency" | "nomad" | "leader" | "admin";
const ROLE_TITLE: Record<HubRole, string> = {
  company: "O que você precisa fornecer", agency: "O que seus clientes precisam fornecer", nomad: "O que bloqueia o seu trabalho", leader: "Pendências da sua equipe", admin: "Todas as pendências de conexão",
};
const KIND_LABEL: Record<string, string> = { event: "" };
const EVENT_LABEL: Record<string, string> = {
  created: "Criada", authorized: "Uso autorizado", used: "Usada", validated: "Validação", reused: "Reutilizada", changed: "Alterada", expired: "Expirou", revoked: "Revogada", dispensed: "Dispensada",
  sensitive_view: "Visualização sensível", manual_release: "Liberação manual", requested: "Solicitada", reminder: "Lembrete", escalated: "Escalonado", blocked: "Bloqueou atividade", released: "Liberou atividade",
  paused: "Pausou atividade", resumed: "Retomou atividade", executor_changed: "Troca de executor", oauth_started: "OAuth iniciado", oauth_cancelled: "OAuth cancelado", oauth_failed: "OAuth falhou", guidance: "Orientação",
};
const minutes = (m: number) => (m < 60 ? `${m} min` : m < 1440 ? `${Math.round(m / 60)} h` : `${Math.round(m / 1440)} dia(s)`);
const dt = (s?: string | null) => (s ? new Date(s).toLocaleString("pt-BR") : "—");

function Guidance({ pcrId }: { pcrId: string }) {
  const [g, setG] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="space-y-1.5">
      {!g && <Button size="sm" variant="outline" disabled={busy} onClick={async () => { setBusy(true); setErr(null); try { setG(await apiClient.getConnectionGuidance(pcrId)); } catch (e: any) { setErr(e?.message ?? "Falha ao orientar."); } finally { setBusy(false); } }}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}Pedir orientação</Button>}
      {err && <p className="text-xs text-red-700">{err}</p>}
      {g && (
        <div className="space-y-1.5 rounded-lg border border-sky-200 bg-sky-50 p-3 text-xs dark:border-sky-900 dark:bg-sky-950/20" data-testid="guidance">
          <p className="font-semibold text-sky-900 dark:text-sky-200">Orientação {g.source === "ai" ? `da IA${g.ai_simulated ? " (simulada em QA)" : ""}` : "automática"} — só orienta: não valida, não libera atividade, não vê segredos e não encerra pendências.</p>
          <p>{g.summary}</p>
          {g.missing.length > 0 && <div><strong>O que falta:</strong><ul className="ml-4 list-disc">{g.missing.map((m: string, i: number) => <li key={i}>{m}</li>)}</ul></div>}
          <div><strong>Como conectar:</strong><ul className="ml-4 list-disc">{g.how_to_connect.map((m: string, i: number) => <li key={i}>{m}</li>)}</ul></div>
          {g.error_explained && <p><strong>Erro explicado:</strong> {g.error_explained}</p>}
          {g.fix && <p><strong>Correção:</strong> {g.fix}</p>}
          <p><strong>Próximo passo:</strong> {g.next_step}</p>
          <p><strong>Quem resolve:</strong> {g.suggested_responsible} · <strong>Impacto:</strong> {g.impact}</p>
          <p className="rounded bg-white/70 p-1.5 italic dark:bg-slate-900/50"><strong className="not-italic">Lembrete sugerido:</strong> {g.reminder_draft}</p>
          {g.ai_text && <p className="rounded bg-white/70 p-1.5 dark:bg-slate-900/50">{g.ai_text}</p>}
        </div>
      )}
    </div>
  );
}

function ItemCard({ item, role, onChanged }: { item: any; role: HubRole; onChanged: (msg?: string) => void }) {
  const staff = role === "admin" || role === "leader";
  const external = role === "company" || role === "agency";
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [panel, setPanel] = useState<"" | "connect" | "existing" | "fix" | "validate" | "history" | "dispense" | "release" | "authorize">("");
  const [form, setForm] = useState<Record<string, string>>({});
  const [existingId, setExistingId] = useState("");
  const [scope, setScope] = useState("project");
  const f = (k: string) => form[k] ?? "";
  const setF = (k: string, v: string) => setForm((c) => ({ ...c, [k]: v }));
  const loadDetail = useCallback(async () => { try { setDetail(await apiClient.getConnectionRequirement(item.id)); } catch (e: any) { setErr(e?.message ?? "Não foi possível carregar."); } }, [item.id]);
  useEffect(() => { if (open && !detail) void loadDetail(); }, [open, detail, loadDetail]);
  const run = async (fn: () => Promise<any>, msg: string) => {
    setBusy(true); setErr(null); setOkMsg(null);
    try { await fn(); setOkMsg(msg); setPanel(""); setDetail(null); onChanged(msg); } catch (e: any) { setErr(e?.message ?? "Não foi possível concluir."); } finally { setBusy(false); }
  };
  const open_ = (p: typeof panel) => { setOpen(true); setPanel(p); };
  const act = item.action;
  const tasks = useMemo(() => item.tasks.map((t: any) => ({ id: t.id, title: t.title })), [item.tasks]);
  const primary = () => {
    if (act.kind === "connect") { if (external) open_("connect"); else setOpen(true); }
    else if (act.kind === "fix") open_(external ? "fix" : "validate");
    else if (act.kind === "reconnect") open_(external ? "connect" : "validate");
    else if (act.kind === "authorize") open_(staff ? "authorize" : "existing");
    else if (act.kind === "validate") open_("validate");
    else if (act.kind === "light_check") open_("validate");
    else setOpen(true);
  };
  const dis = item.status === "valid" && !item.light_check_pending && item.tasks.every((t: any) => t.state === "valid");
  return (
    <li className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/60" data-testid="pending-item" data-pcr={item.id}>
      <div className="flex flex-wrap items-start gap-2">
        <Plug className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2"><strong className="text-sm">{item.label}</strong><StateBadge status={item.status} label={item.status_label} />{item.paused_tasks > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-800"><AlertTriangle className="h-3 w-3" />Atividade pausada por dependência externa</span>}</div>
          <p className="text-xs text-slate-500">{item.product ? `${item.product} · ` : ""}Projeto {item.project.code ?? ""} {item.project.title}</p>
          <ul className="mt-1 space-y-0.5 text-xs text-slate-700 dark:text-slate-300">
            {item.tasks.map((t: any) => <li key={t.id}>• <strong>{t.title}</strong> — {t.kind_label || "informativa"}: <span className="text-slate-500">{t.reason}</span></li>)}
          </ul>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400"><Clock className="mr-1 inline h-3 w-3" />Pendente há {minutes(item.pending_minutes)} · última solicitação {dt(item.last_request_at)} · {item.reminder_count} lembrete(s) · Responsável: {item.responsible.name ?? "a definir"} · {item.impact}</p>
          {item.problem && <p className="mt-1 rounded bg-orange-50 px-2 py-1 text-xs text-orange-900" role="note"><strong>Problema:</strong> {item.problem}{item.correction ? <> — <strong>Correção:</strong> {item.correction}</> : null}</p>}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {!dis && act.kind !== "wait" && <Button size="sm" onClick={primary} data-testid="action-button">{!external && act.kind === "reconnect" ? "Renovar e validar" : act.label}</Button>}
          {act.kind === "wait" && <span className="text-xs font-semibold text-sky-700">{act.label}</span>}
          <button type="button" className="text-[11px] text-violet-700 underline" onClick={() => { setOpen(!open); }}>{open ? "Recolher" : "Detalhes e histórico"}</button>
        </div>
      </div>
      {okMsg && <p className="mt-2 rounded bg-emerald-50 px-2 py-1 text-xs text-emerald-800" role="status">{okMsg}</p>}
      {err && <p className="mt-2 rounded bg-red-50 px-2 py-1 text-xs text-red-700" role="alert">{err}</p>}
      {open && (
        <div className="mt-3 space-y-3 border-t border-slate-100 pt-3 dark:border-slate-800">
          <div className="flex flex-wrap gap-1.5">
            {external && <Button size="sm" variant="outline" onClick={() => setPanel("connect")}>Conectar agora</Button>}
            {external && (detail?.reuse_candidates?.length ?? 0) > 0 && <Button size="sm" variant="outline" onClick={() => setPanel("existing")}>Usar uma conexão existente</Button>}
            {staff && <Button size="sm" variant="outline" onClick={() => setPanel("validate")}>Validar</Button>}
            {staff && <Button size="sm" variant="outline" onClick={() => setPanel("authorize")}>Autorizar executor</Button>}
            {(staff || item.tasks.length > 0) && <Button size="sm" variant="outline" onClick={() => setPanel("dispense")}>Dispensar</Button>}
            {staff && <Button size="sm" variant="outline" onClick={() => setPanel("release")}>Liberar manualmente</Button>}
            <Button size="sm" variant="outline" onClick={() => setPanel("history")}>Histórico</Button>
          </div>
          {detail?.instructions?.length > 0 && <p className="rounded bg-slate-50 px-2 py-1 text-xs text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">{detail.instructions.join(" ")}</p>}

          {panel === "connect" && detail && (
            <ConnectForm allowedMethods={detail.allowed_methods} permissionLevels={detail.permission_levels} defaultPermission={item.permission_level} tasks={tasks} onCancel={() => setPanel("")}
              onSubmit={async (b) => {
                const r = await apiClient.createAndLinkConnection(item.id, { ...b });
                if (b.method === "oauth") {
                  try { const o = await apiClient.startConnectionOAuth(r.connection_id, b.permission_level); window.location.href = o.url; return; }
                  catch (e: any) { setOkMsg("Conexão criada como rascunho. " + (e?.message ?? "A integração oficial ainda não está configurada.")); }
                }
                setPanel(""); setDetail(null); onChanged();
              }} />
          )}
          {panel === "existing" && detail && (
            <div className="space-y-2 rounded-lg border border-violet-200 bg-violet-50/40 p-3 text-xs">
              <p className="font-semibold">Deseja reutilizar uma conexão que já existe?</p>
              <select aria-label="Conexão existente" className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm" value={existingId} onChange={(e) => setExistingId(e.target.value)}>
                <option value="">Selecione…</option>{detail.reuse_candidates.map((c: any) => <option key={c.id} value={c.id}>{c.label}{c.external_id ? ` · ${c.external_id}` : ""} — {c.status_label}{c.authorized_in_project ? " · já autorizada neste projeto" : c.authorized_elsewhere ? " · autorizada em outro projeto" : ""}</option>)}
              </select>
              <div className="flex flex-wrap gap-3">{Object.entries(SCOPE_LABEL).map(([k, v]) => <label key={k} className="flex items-center gap-1"><input type="radio" checked={scope === k} onChange={() => setScope(k)} />{v}</label>)}</div>
              <p className="text-[11px] text-slate-500">Outro projeto exige uma nova autorização sua — o segredo nunca é copiado, só referenciado.</p>
              <Button size="sm" disabled={!existingId || busy} onClick={() => void run(() => apiClient.linkConnectionRequirement(item.id, { connection_id: existingId, scope, ...(scope !== "project" ? { task_ids: [tasks[0]?.id].filter(Boolean) } : {}) }), "Conexão vinculada e autorizada.")}>Usar esta conexão</Button>
            </div>
          )}
          {panel === "fix" && item.connection_id && (
            <div className="space-y-2 rounded-lg border border-orange-200 bg-orange-50/50 p-3 text-xs">
              <p className="font-semibold">{item.correction ?? "Revise os dados da conexão."}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <Input aria-label="Novo identificador" placeholder="ID/endereço da conta (se mudou)" value={f("external_id")} onChange={(e) => setF("external_id", e.target.value)} />
                <Input aria-label="Novo segredo protegido" type="password" autoComplete="off" placeholder="Novo token/senha de aplicação (cofre, revogável)" value={f("secret")} onChange={(e) => setF("secret", e.target.value)} />
              </div>
              <Button size="sm" disabled={busy || (!f("external_id") && !f("secret"))} onClick={() => void run(async () => { await apiClient.updateConnection(item.connection_id, { ...(f("external_id") ? { external_id: f("external_id") } : {}), ...(f("secret") ? { secret_value: f("secret") } : {}) }); await apiClient.submitConnection(item.connection_id); setForm({}); }, "Correção enviada para nova validação.")}>Enviar correção</Button>
            </div>
          )}
          {panel === "validate" && (
            <div className="space-y-2 rounded-lg border border-slate-200 p-3 text-xs">
              {item.light_check_pending && <div className="space-y-1"><p className="font-semibold">Conferência leve (a conexão já era válida)</p><Input aria-label="Observação da conferência" placeholder="Observação" value={f("note")} onChange={(e) => setF("note", e.target.value)} /><Button size="sm" disabled={busy} onClick={() => void run(() => apiClient.confirmConnectionLightCheck(item.id, f("note")), "Conferência leve registrada.")}>Confirmar conferência leve</Button></div>}
              {item.connection_id && (
                <>
                  <p className="font-semibold">Validação da conexão (a IA nunca valida — só pessoa autorizada ou integração oficial)</p>
                  <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" disabled={busy} onClick={() => void run(async () => { const r = await apiClient.verifyConnection(item.connection_id); if (r.outcome === "provider_unavailable" || r.outcome === "not_configured") throw new Error(r.problem ?? "Verificação automática indisponível; valide manualmente."); }, "Verificação automática concluída.")}><RefreshCw className="h-4 w-4" />Verificar automaticamente</Button></div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <select aria-label="Resultado da validação" className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm" value={f("result") || "valid"} onChange={(e) => setF("result", e.target.value)}>
                      <option value="valid">Válida</option><option value="incomplete">Incompleta</option><option value="invalid">Inválida</option><option value="needs_correction">Precisa de correção</option>
                    </select>
                    <Input aria-label="Evidência" placeholder="Evidência (o que foi conferido)" value={f("evidence")} onChange={(e) => setF("evidence", e.target.value)} />
                    <Input aria-label="Problema encontrado" placeholder="Problema encontrado" value={f("problem")} onChange={(e) => setF("problem", e.target.value)} />
                    <Input aria-label="Correção necessária" placeholder="Correção necessária" value={f("correction")} onChange={(e) => setF("correction", e.target.value)} />
                  </div>
                  <Button size="sm" disabled={busy} onClick={() => void run(() => apiClient.validateConnection(item.connection_id, { result: f("result") || "valid", evidence: f("evidence") || null, problem: f("problem") || null, correction_needed: f("correction") || null }), "Validação registrada.")}>Registrar validação</Button>
                </>
              )}
              {!item.connection_id && !item.light_check_pending && <p>Ainda não há conexão enviada pelo cliente.</p>}
            </div>
          )}
          {panel === "authorize" && (
            <div className="space-y-2 rounded-lg border border-slate-200 p-3 text-xs">
              <p className="font-semibold">Autorizar o executor desta tarefa (convite/usuário temporário)</p>
              <select aria-label="Tarefa" className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm" value={f("task")} onChange={(e) => setF("task", e.target.value)}><option value="">Tarefa…</option>{tasks.map((t: any) => <option key={t.id} value={t.id}>{t.title}</option>)}</select>
              <Input aria-label="ID do executor" placeholder="ID do executor (nômade)" value={f("executor")} onChange={(e) => setF("executor", e.target.value)} />
              <Button size="sm" disabled={busy || !f("task") || !f("executor")} onClick={() => void run(() => apiClient.authorizeConnectionExecutor(item.id, f("task"), f("executor")), "Executor autorizado.")}>Autorizar</Button>
            </div>
          )}
          {panel === "dispense" && (
            <div className="space-y-2 rounded-lg border border-slate-200 p-3 text-xs">
              <p className="font-semibold">Dispensar esta conexão (fica registrado com a justificativa)</p>
              <Input aria-label="Justificativa" placeholder="Justificativa (mín. 10 caracteres)" value={f("reason")} onChange={(e) => setF("reason", e.target.value)} />
              <Button size="sm" disabled={busy || f("reason").trim().length < 10} onClick={() => void run(() => apiClient.dispenseConnectionRequirement(item.id, f("reason")), "Conexão dispensada.")}>Dispensar</Button>
            </div>
          )}
          {panel === "release" && (
            <div className="space-y-2 rounded-lg border border-slate-200 p-3 text-xs">
              <p className="font-semibold">Liberação manual da atividade (não valida a conexão; fica registrada)</p>
              <ReleaseList tasks={item.tasks} busy={busy} run={run} />
            </div>
          )}
          {panel === "history" && detail && (
            <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-200 p-2 text-xs" data-testid="history">
              {detail.events.length === 0 && <p className="text-slate-500">Sem registros ainda.</p>}
              <ul className="space-y-1">{detail.events.map((e: any) => <li key={e.id}><span className="text-slate-400">{dt(e.created_at)}</span> · <strong>{EVENT_LABEL[e.kind] ?? e.kind}</strong> — {e.message}</li>)}</ul>
              {detail.reminders.length > 0 && <p className="mt-2 font-semibold">Lembretes enviados: {detail.reminders.length}</p>}
            </div>
          )}
          <Guidance pcrId={item.id} />
        </div>
      )}
    </li>
  );
}

function ReleaseList({ tasks, busy, run }: { tasks: any[]; busy: boolean; run: (fn: () => Promise<any>, msg: string) => Promise<void> }) {
  const [reason, setReason] = useState("");
  const [rules, setRules] = useState<Record<string, string>>({});
  useEffect(() => { void (async () => { const m: Record<string, string> = {}; for (const t of tasks) { try { const v = await apiClient.getTaskConnections(t.id); const r = v.connections.find((c: any) => !c.satisfied); if (r) m[t.id] = r.rule_id; } catch { /* ignora */ } } setRules(m); })(); }, [tasks.map((t) => t.id).join(",")]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="space-y-2">
      <Input aria-label="Justificativa da liberação" placeholder="Justificativa (mín. 10 caracteres)" value={reason} onChange={(e) => setReason(e.target.value)} />
      {tasks.filter((t) => rules[t.id]).length === 0 && <p className="text-slate-500">Nenhuma atividade aguardando.</p>}
      {tasks.filter((t) => rules[t.id]).map((t) => <Button key={t.id} size="sm" variant="outline" disabled={busy || reason.trim().length < 10} onClick={() => void run(() => apiClient.releaseConnectionRule(rules[t.id], reason), "Atividade liberada manualmente.")}>Liberar “{t.title}”</Button>)}
    </div>
  );
}

function MyConnections({ role, onChanged }: { role: HubRole; onChanged: () => void }) {
  const [rows, setRows] = useState<any[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [usage, setUsage] = useState<Record<string, any>>({});
  const load = useCallback(async () => { try { setRows((await apiClient.getCompanyConnections()).data); } catch (e: any) { setErr(e?.message ?? "Não foi possível listar."); setRows([]); } }, []);
  useEffect(() => { void load(); }, [load]);
  if (!rows) return <Loader2 className="h-5 w-5 animate-spin text-slate-400" />;
  return (
    <div className="space-y-2" data-testid="my-connections">
      {err && <p className="text-xs text-red-700">{err}</p>}
      {rows.length === 0 && <p className="text-sm text-slate-500">Nenhuma conexão ainda.</p>}
      {rows.map((c) => (
        <div key={c.id} className="rounded-lg border border-slate-200 bg-white p-3 text-sm dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex flex-wrap items-center gap-2"><strong>{c.label}</strong><StateBadge status={c.status} label={c.status_label} /><span className="text-xs text-slate-500">{c.type.name} · {METHOD_LABEL[c.method] ?? c.method}</span>{c.has_secret && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">segredo protegido em cofre</span>}</div>
          <p className="text-xs text-slate-500">{c.external_id ?? "—"} · permissão {c.permission_level ?? "—"} · validada em {dt(c.last_validated_at)}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <Button size="sm" variant="outline" onClick={async () => setUsage({ ...usage, [c.id]: await apiClient.getConnectionUsage(c.id) })}>Onde está sendo usada</Button>
            {role !== "nomad" && !["revoked", "removed"].includes(c.status) && <Button size="sm" variant="outline" onClick={async () => { const reason = window.prompt("Motivo da revogação:"); if (reason && reason.trim().length >= 3) { await apiClient.revokeConnection(c.id, reason.trim()); await load(); onChanged(); } }}>Revogar</Button>}
          </div>
          {usage[c.id] && <ul className="mt-1 text-xs text-slate-600">{usage[c.id].projects.length === 0 && <li>Não está em uso em nenhum projeto.</li>}{usage[c.id].projects.map((p: any) => <li key={p.id}>• {p.title}: {p.scope.map((s: any) => (s.task_id ? `tarefa ${s.task_id.slice(-6)}` : "projeto inteiro")).join(", ")}</li>)}</ul>}
        </div>
      ))}
    </div>
  );
}

export function ConnectionsHub({ role }: { role: HubRole }) {
  const [data, setData] = useState<any[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [tab, setTab] = useState<"pendencias" | "conexoes">("pendencias");
  const [flash, setFlash] = useState<string | null>(null);
  const oauth = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("oauth") : null;
  const load = useCallback(async () => { try { setData((await apiClient.getConnectionPending()).data); setErr(null); } catch (e: any) { setErr(e?.message ?? "Não foi possível carregar as pendências."); setData([]); } }, []);
  useEffect(() => { void load(); }, [load]);
  const external = role === "company" || role === "agency";
  return (
    <div className="mx-auto h-full max-w-4xl space-y-4 overflow-y-auto p-4 md:p-6" data-testid="connections-hub">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">Conexões e acessos necessários</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">{ROLE_TITLE[role]}</p>
        {external && <p className="mt-1 rounded bg-emerald-50 px-2 py-1.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">{NO_PASSWORD_MESSAGE}</p>}
      </div>
      {oauth && <p className={`rounded px-2 py-1.5 text-xs ${oauth === "ok" ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`} role="status">{oauth === "ok" ? "Autorização concluída. Estamos validando a conexão." : oauth === "oauth_cancelled" ? "A autorização foi cancelada. Nada foi conectado." : oauth === "oauth_expired" ? "O link de autorização expirou. Inicie a conexão novamente." : "Não foi possível concluir a autorização. Tente novamente."}</p>}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800">
        {[["pendencias", `Pendências${data ? ` (${data.length})` : ""}`], ...(external ? [["conexoes", "Minhas conexões"]] : [])].map(([k, v]) => (
          <button key={k} type="button" onClick={() => setTab(k as any)} className={`-mb-px border-b-2 px-3 py-1.5 text-sm font-semibold ${tab === k ? "border-violet-600 text-violet-700" : "border-transparent text-slate-500"}`}>{v}</button>
        ))}
      </div>
      {err && <p className="rounded bg-red-50 px-2 py-1 text-xs text-red-700">{err}</p>}
      {flash && <p className="rounded bg-emerald-50 px-2 py-1.5 text-xs font-medium text-emerald-800" role="status" data-testid="flash">{flash}</p>}
      {tab === "pendencias" && (
        !data ? <Loader2 className="h-5 w-5 animate-spin text-slate-400" /> :
        data.length === 0 ? <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500" data-testid="no-pending">Nenhuma pendência de conexão. Tudo certo por aqui.</p> :
        <ul className="space-y-3">{data.map((it) => <ItemCard key={it.id} item={it} role={role} onChanged={(m) => { if (m) setFlash(m); void load(); }} />)}</ul>
      )}
      {tab === "conexoes" && <MyConnections role={role} onChanged={() => void load()} />}
    </div>
  );
}

void KIND_LABEL;
