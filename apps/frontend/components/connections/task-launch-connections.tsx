"use client";

// Conexões NA HORA DE LANÇAR A TAREFA — versão compacta (pedido do usuário, 26/10/2026). A contratação é rápida e não pergunta mais nada;
// é aqui, ao lançar a tarefa, que o cliente resolve o que ela precisa. UMA LINHA por conexão: nome · para quê · situação · [Conectar agora]
// [Fazer depois] · ⓘ (abre todos os detalhes). Nunca trava o lançamento: "Fazer depois" só deixa a atividade que depende da conexão aguardando.
// Usa as mesmas rotas da central de Conexões (/api/connections/requirements/*), então o que for feito aqui aparece lá.
import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Info, Link2, Loader2, Plug } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { tipoDaContaLogada } from "@/lib/conta-logada";
import { Button } from "@/components/ui/button";
import { ConnectForm, NO_PASSWORD_MESSAGE, SCOPE_LABEL, StateBadge } from "./connection-forms";

// Só o dono do projeto (empresa/agência) resolve conexão; admin, líder e nômade veem a central, não este bloco.
const HUB_PORTAL: Record<string, string> = { agencias: "agency", empresas: "company" };

function Line({ item, taskId, onChanged }: { item: any; taskId: string | string[]; onChanged: () => void }) {
  const ids = Array.isArray(taskId) ? taskId : [taskId];
  const [info, setInfo] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [reusing, setReusing] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [existingId, setExistingId] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const portal = HUB_PORTAL[tipoDaContaLogada()];
  const mine = item.tasks.find((t: any) => ids.includes(t.id)) ?? item.tasks[0];
  const done = item.status === "valid" || item.status === "dispensed";
  const waiting = ["submitted", "awaiting_validation"].includes(item.status);
  const canConnect = !done && !waiting && item.action?.kind === "connect";
  const later = item.handling === "later";

  const loadDetail = useCallback(async () => {
    if (detail) return detail;
    try { const d = await apiClient.getConnectionRequirement(item.id); setDetail(d); return d; } catch (e: any) { setErr(e?.message ?? "Não foi possível carregar os detalhes."); return null; }
  }, [detail, item.id]);
  const run = async (fn: () => Promise<any>) => {
    setBusy(true); setErr(null);
    try { await fn(); setConnecting(false); setReusing(false); onChanged(); } catch (e: any) { setErr(e?.message ?? "Não foi possível salvar."); } finally { setBusy(false); }
  };

  return (
    <li className="space-y-1.5 py-1.5" data-testid="launch-connection" data-pcr={item.id}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <Plug className="h-3.5 w-3.5 shrink-0 text-violet-600" />
        <strong className="min-w-0 truncate text-xs">{item.label}</strong>
        {mine?.kind_label && <span className="hidden truncate text-[11px] text-slate-500 sm:inline">{mine.kind_label}</span>}
        {done
          ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800" data-testid="launch-connection-ok"><CheckCircle2 className="h-3 w-3" />{item.status === "dispensed" ? "Dispensada" : "Conectada"}</span>
          : later && !waiting ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800" data-testid="launch-connection-later">Fica para depois</span>
          : <StateBadge status={item.status} label={item.status_label} />}
        <span className="ml-auto flex shrink-0 items-center gap-1">
          {canConnect && <Button size="sm" className="h-7 px-2.5 text-xs" disabled={busy} onClick={async () => { setReusing(false); setConnecting((v) => !v); await loadDetail(); }}>Conectar agora</Button>}
          {canConnect && !later && <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs" disabled={busy} onClick={() => void run(() => apiClient.setConnectionHandling(item.id, { handling: "later" }))}>Fazer depois</Button>}
          {!done && !canConnect && portal && <a className="text-[11px] font-semibold text-violet-700 underline" href={`/${portal}/conexoes?pendencia=${item.id}`}>{item.action?.label ?? "Abrir em Conexões"}</a>}
          <button type="button" aria-label={`Detalhes de ${item.label}`} aria-expanded={info} title="Ver todos os detalhes" data-testid="launch-connection-info"
            className={`inline-flex h-6 w-6 items-center justify-center rounded-full border text-violet-700 transition ${info ? "border-violet-400 bg-violet-100" : "border-violet-200 hover:bg-violet-50"}`}
            onClick={async () => { setInfo((v) => !v); await loadDetail(); }}><Info className="h-3.5 w-3.5" /></button>
        </span>
      </div>

      {info && (
        <div className="space-y-1 rounded-md bg-slate-50 p-2 text-[11px] text-slate-600" data-testid="launch-connection-details">
          <dl className="grid gap-x-4 gap-y-0.5 sm:grid-cols-2">
            <div><dt className="inline font-semibold">Por quê: </dt><dd className="inline">{mine?.reason || "Necessária para executar parte do serviço contratado."}</dd></div>
            <div><dt className="inline font-semibold">Quando será exigida: </dt><dd className="inline">{item.when_label}</dd></div>
            <div><dt className="inline font-semibold">Forma de conexão: </dt><dd className="inline">{item.method_label}</dd></div>
            <div><dt className="inline font-semibold">Nível de permissão: </dt><dd className="inline">{item.permission_level}</dd></div>
            <div className="sm:col-span-2"><dt className="inline font-semibold">Atividade afetada: </dt><dd className="inline">{item.tasks.map((t: any) => `${t.title}${t.kind_label ? ` — ${t.kind_label}` : ""}`).join("; ")}</dd></div>
            <div className="sm:col-span-2"><dt className="inline font-semibold">Se ficar para depois: </dt><dd className="inline">{item.impact}</dd></div>
          </dl>
          {item.problem && <p className="rounded bg-orange-50 px-2 py-1 text-orange-900" role="note"><strong>Problema:</strong> {item.problem}{item.correction ? <> — <strong>Correção:</strong> {item.correction}</> : null}</p>}
          {detail?.instructions?.length > 0 && <p>{detail.instructions.join(" ")}</p>}
          <p className="text-emerald-800">{NO_PASSWORD_MESSAGE}</p>
        </div>
      )}

      {err && <p className="rounded bg-red-50 px-2 py-1 text-[11px] text-red-700" role="alert">{err}</p>}

      {connecting && detail && (
        <div className="space-y-1.5">
          <ConnectForm
            fields={detail.fields ?? []} allowedMethods={detail.allowed_methods} permissionLevels={detail.permission_levels} defaultPermission={item.permission_level}
            tasks={item.tasks.map((t: any) => ({ id: t.id, title: t.title }))} onCancel={() => setConnecting(false)}
            onSubmit={async (b) => {
              const r = await apiClient.createAndLinkConnection(item.id, { ...b });
              if (b.method === "oauth") {
                try { const o = await apiClient.startConnectionOAuth(r.connection_id, b.permission_level); window.location.href = o.url; return; } catch (e: any) { setErr(e?.message ?? "A integração oficial ainda não está configurada; a conexão ficou como rascunho."); }
              }
              setConnecting(false); onChanged();
            }}
          />
          {(detail.reuse_candidates?.length ?? 0) > 0 && !reusing && <button type="button" className="text-[11px] font-semibold text-violet-700 underline" onClick={() => setReusing(true)}>Usar uma conexão que já tenho</button>}
        </div>
      )}
      {reusing && detail && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-violet-200 bg-violet-50/40 p-2 text-xs">
          <select aria-label="Conexão existente" className="h-8 min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-2 text-xs" value={existingId} onChange={(e) => setExistingId(e.target.value)}>
            <option value="">Selecione…</option>
            {detail.reuse_candidates.map((c: any) => <option key={c.id} value={c.id}>{c.label}{c.external_id ? ` · ${c.external_id}` : ""} — {c.status_label}</option>)}
          </select>
          <Button size="sm" className="h-8 px-2.5 text-xs" disabled={!existingId || busy} onClick={() => void run(() => apiClient.linkConnectionRequirement(item.id, { connection_id: existingId, scope: "project" }))}><Link2 className="h-3.5 w-3.5" />Usar esta</Button>
          <span className="text-[11px] text-slate-500">{SCOPE_LABEL.project}</span>
        </div>
      )}
    </li>
  );
}

// `taskId` pode ser uma lista (lançamento em lote): mostra, uma vez só, cada conexão que afeta QUALQUER uma das tarefas.
export function TaskLaunchConnections({ projectId, taskId }: { projectId?: string; taskId: string | string[] }) {
  const idsKey = (Array.isArray(taskId) ? taskId : [taskId]).join(",");
  const portal = HUB_PORTAL[tipoDaContaLogada()];
  const [items, setItems] = useState<any[] | null>(null);
  const load = useCallback(async () => {
    if (!projectId || !portal) { setItems([]); return; }
    try {
      const res: any = await apiClient.getProjectConnectionRequirements(projectId);
      setItems((res?.data ?? []).filter((i: any) => (i.tasks ?? []).some((t: any) => idsKey.split(",").includes(t.id))));
    } catch { setItems([]); } // módulo desligado, sem permissão ou rede: o lançamento segue sem este bloco
  }, [projectId, idsKey, portal]);
  useEffect(() => { void load(); }, [load]);

  if (items === null) return <div className="flex items-center gap-1.5 px-6 pt-3 text-[11px] text-slate-400"><Loader2 className="h-3 w-3 animate-spin" />Verificando conexões…</div>;
  if (items.length === 0) return null; // tarefa sem exigência de conexão: nada aparece
  const open = items.filter((i) => !["valid", "dispensed"].includes(i.status)).length;
  return (
    <section className="mx-6 mt-4 rounded-lg border border-violet-200 bg-white px-3 py-2" data-testid="task-launch-connections">
      <h3 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-violet-800">
        <Plug className="h-3.5 w-3.5" />Conexões desta tarefa
        <span className="rounded-full bg-violet-100 px-1.5 py-px text-[10px] font-semibold normal-case text-violet-700">{open > 0 ? `${open} para resolver` : "tudo certo"}</span>
      </h3>
      <ul className="divide-y divide-slate-100">
        {items.map((i) => <Line key={i.id} item={i} taskId={taskId} onChanged={() => void load()} />)}
      </ul>
      {open > 0 && <p className="pb-0.5 text-[11px] text-slate-500">Você pode lançar a tarefa sem conectar agora: só a atividade que depende da conexão espera.</p>}
    </section>
  );
}
