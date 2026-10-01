"use client";

// Conexões e acessos necessários NA CONTRATAÇÃO (antes do pagamento). Nada aqui bloqueia o cliente por padrão:
// ele pode conectar agora, usar uma conexão existente, convidar/indicar um responsável, fazer depois ou salvar como rascunho.
import { useEffect, useState } from "react";
import { CheckCircle2, Link2, Loader2, Plug } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConnectForm, METHOD_LABEL, NO_PASSWORD_MESSAGE, SCOPE_LABEL, StateBadge } from "./connection-forms";

const HANDLING_LABEL: Record<string, string> = { now: "Conectar agora", later: "Fazer depois", draft: "Salvo como rascunho" };

function Item({ quote, item, reload }: { quote: any; item: any; reload: () => void }) {
  const [mode, setMode] = useState<"none" | "connect" | "existing" | "invite">("none");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [existingId, setExistingId] = useState("");
  const [existingScope, setExistingScope] = useState(item.default_grant_scope ?? "project");
  const [respName, setRespName] = useState(item.choice?.responsible_name ?? "");
  const [respEmail, setRespEmail] = useState(item.choice?.invited_email ?? "");
  const tasks = item.affected_activities.map((a: any) => ({ id: a.task_key, title: a.task_name }));
  const choice = item.choice;
  const run = async (fn: () => Promise<any>) => {
    setBusy(true); setErr(null);
    try { await fn(); setMode("none"); reload(); } catch (e: any) { setErr(e?.message ?? "Não foi possível salvar."); } finally { setBusy(false); }
  };
  const save = (body: Record<string, any>) => apiClient.saveQuoteConnectionChoice(quote.id, item.requirement_id, body);
  const connected = choice?.connection_id ? item.reuse_candidates.find((c: any) => c.id === choice.connection_id) : null;
  return (
    <li className="space-y-2 rounded-lg border border-slate-200 bg-white p-3 text-sm dark:border-slate-800 dark:bg-slate-900/50" data-testid="contracting-connection">
      <div className="flex flex-wrap items-center gap-2">
        <Plug className="h-4 w-4 text-violet-600" />
        <strong>{item.label}</strong>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">{item.obligation_label}</span>
        {choice && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800" data-testid="choice-saved">{HANDLING_LABEL[choice.handling] ?? choice.handling}{connected ? ` · ${connected.label}` : ""}</span>}
      </div>
      <dl className="grid gap-x-4 gap-y-1 text-xs text-slate-600 sm:grid-cols-2 dark:text-slate-300">
        <div><dt className="inline font-semibold">Por quê: </dt><dd className="inline">{item.reason || "Necessária para executar parte do serviço contratado."}</dd></div>
        <div><dt className="inline font-semibold">Quando será exigida: </dt><dd className="inline">{item.when_label}</dd></div>
        <div><dt className="inline font-semibold">Forma de conexão: </dt><dd className="inline">{item.method_label}</dd></div>
        <div><dt className="inline font-semibold">Nível de permissão: </dt><dd className="inline">{item.permission_level}</dd></div>
        <div className="sm:col-span-2"><dt className="inline font-semibold">Atividade afetada: </dt><dd className="inline">{item.affected_activities.length ? item.affected_activities.map((a: any) => `${a.task_name}${a.step_key ? ` (etapa)` : ""} — ${a.kind_label.toLowerCase()}`).join("; ") : "somente informativa"}</dd></div>
      </dl>
      {item.instructions.length > 0 && <p className="rounded bg-slate-50 px-2 py-1 text-[11px] text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">{item.instructions.join(" ")}</p>}
      {err && <p className="rounded bg-red-50 px-2 py-1 text-xs text-red-700" role="alert">{err}</p>}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={mode === "connect" ? "default" : "outline"} onClick={() => setMode(mode === "connect" ? "none" : "connect")}>Conectar agora</Button>
        {item.reuse_candidates.length > 0 && <Button size="sm" variant={mode === "existing" ? "default" : "outline"} onClick={() => setMode(mode === "existing" ? "none" : "existing")}>Usar uma conexão que já tenho</Button>}
        <Button size="sm" variant={mode === "invite" ? "default" : "outline"} onClick={() => setMode(mode === "invite" ? "none" : "invite")}>Enviar convite / indicar responsável</Button>
        {item.can_do_later && <Button size="sm" variant="outline" disabled={busy} onClick={() => void run(() => save({ handling: "later" }))}>Fazer depois</Button>}
        <Button size="sm" variant="outline" disabled={busy} onClick={() => void run(() => save({ handling: "draft" }))}>Salvar como rascunho</Button>
      </div>
      {mode === "connect" && (
        <ConnectForm
          allowedMethods={item.allowed_methods} permissionLevels={item.permission_levels ?? [{ key: item.permission_level, label: item.permission_level }]} defaultPermission={item.permission_level} defaultScope={item.default_grant_scope} tasks={tasks}
          submitLabel="Conectar e usar neste pedido" onCancel={() => setMode("none")}
          onSubmit={async (b) => {
            const created = await apiClient.createConnection({ connection_type_id: item.connection_type.id, method: b.method, label: b.label ?? item.label, account_label: b.account_label, external_id: b.external_id, permission_level: b.permission_level, ...(b.secret_value ? { secret_value: b.secret_value } : {}) });
            await save({ handling: "now", connection_id: created.id, grant_scope: b.scope, ...(b.task_ids ? { task_keys: b.task_ids } : {}) });
            if (b.method === "oauth") {
              try { const o = await apiClient.startConnectionOAuth(created.id, b.permission_level); window.location.href = o.url; return; } catch (e: any) { setErr(e?.message ?? "A integração oficial ainda não está configurada; a conexão ficou como rascunho."); }
            }
            reload(); setMode("none");
          }}
        />
      )}
      {mode === "existing" && (
        <div className="space-y-2 rounded-lg border border-violet-200 bg-violet-50/40 p-3 text-xs dark:border-violet-900 dark:bg-violet-950/20">
          <p className="font-semibold">Encontramos conexões compatíveis. Deseja reutilizar uma delas neste pedido?</p>
          <select aria-label="Conexão existente" className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-900" value={existingId} onChange={(e) => setExistingId(e.target.value)}>
            <option value="">Selecione…</option>
            {item.reuse_candidates.map((c: any) => <option key={c.id} value={c.id}>{c.label}{c.external_id ? ` · ${c.external_id}` : ""} — {c.status_label}</option>)}
          </select>
          <div className="flex flex-wrap gap-3">{Object.entries(SCOPE_LABEL).filter(([k]) => k !== "task").map(([k, v]) => <label key={k} className="flex items-center gap-1"><input type="radio" checked={existingScope === k} onChange={() => setExistingScope(k)} />{v}</label>)}</div>
          <Button size="sm" disabled={!existingId || busy} onClick={() => void run(() => save({ handling: "now", connection_id: existingId, grant_scope: existingScope, ...(existingScope === "selected_tasks" ? { task_keys: tasks.map((t: any) => t.id) } : {}) }))}><Link2 className="h-4 w-4" />Usar esta conexão</Button>
        </div>
      )}
      {mode === "invite" && (
        <div className="space-y-2 rounded-lg border border-violet-200 bg-violet-50/40 p-3 text-xs dark:border-violet-900 dark:bg-violet-950/20">
          <p>Indique quem na sua empresa vai resolver esta conexão. Ela receberá a pendência (sem senha) e poderá conectar quando puder.</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Input aria-label="Nome do responsável" placeholder="Nome do responsável" value={respName} onChange={(e) => setRespName(e.target.value)} />
            <Input aria-label="E-mail do responsável" type="email" placeholder="E-mail do responsável" value={respEmail} onChange={(e) => setRespEmail(e.target.value)} />
          </div>
          <Button size="sm" disabled={busy || !respName.trim()} onClick={() => void run(() => save({ handling: "later", responsible_name: respName.trim(), invited_email: respEmail.trim() || null }))}>Indicar responsável</Button>
        </div>
      )}
    </li>
  );
}

export function ContractingConnectionsPanel({ quotes }: { quotes: { id: string; product?: any; product_name?: string }[] }) {
  const [views, setViews] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const load = async () => {
    const next: Record<string, any> = {};
    for (const q of quotes) { try { next[q.id] = await apiClient.getQuoteConnectionRequirements(q.id); } catch { next[q.id] = { requires_connections: false, data: [] }; } }
    setViews(next); setLoading(false);
  };
  useEffect(() => { void load(); }, [quotes.map((q) => q.id).join(",")]); // eslint-disable-line react-hooks/exhaustive-deps
  const withItems = quotes.filter((q) => (views[q.id]?.data ?? []).length > 0);
  if (loading) return <div className="flex items-center gap-2 text-xs text-slate-500"><Loader2 className="h-3.5 w-3.5 animate-spin" />Verificando conexões necessárias…</div>;
  if (withItems.length === 0) return null; // módulo desativado/sem exigências: nada aparece para o cliente
  const pending = withItems.flatMap((q) => views[q.id].data).filter((i: any) => !i.choice).length;
  return (
    <section className="space-y-3 rounded-lg border border-violet-200 p-4 dark:border-violet-900" data-testid="contracting-connections">
      <h2 className="flex items-center gap-2 text-sm font-semibold"><Plug className="h-4 w-4 text-violet-600" />Conexões e acessos necessários</h2>
      <p className="flex items-start gap-1.5 rounded bg-emerald-50 px-2 py-1.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />{NO_PASSWORD_MESSAGE}</p>
      {withItems.map((q) => (
        <div key={q.id} className="space-y-2">
          {withItems.length > 1 && <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">{q.product_name ?? q.product?.name ?? "Produto"}</h3>}
          <ul className="space-y-2">{views[q.id].data.map((it: any) => <Item key={it.requirement_id} quote={q} item={it} reload={() => void load()} />)}</ul>
        </div>
      ))}
      <p className="text-[11px] text-slate-500">{pending > 0 ? `${pending} conexão(ões) ainda sem escolha. ` : ""}Você pode continuar a contratação: só a atividade que depende da conexão fica aguardando, e as demais seguem normalmente.</p>
    </section>
  );
}

export { METHOD_LABEL, StateBadge };
