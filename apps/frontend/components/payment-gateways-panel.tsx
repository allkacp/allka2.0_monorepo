"use client";

// Configurações → Pagamentos (somente Admin Master): escolhe o gateway que recebe os pagamentos, guarda as chaves (nunca aparecem de volta),
// testa a conexão e troca o gateway ativo pedindo a senha de novo. Gateway novo = uma linha no registro do servidor; esta tela se monta sozinha.

import { useCallback, useEffect, useState } from "react";
import { Loader2, CheckCircle2, AlertCircle, ShieldCheck, KeyRound, PlugZap, History } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

interface Field { key: string; label: string; secret: boolean; required: boolean; help: string }
interface Gateway {
  key: string; label: string; implemented: boolean; proven: boolean; configured: boolean; is_active: boolean; mode: "sandbox" | "live";
  supports: { pix: boolean; card: boolean; recurring: boolean }; fields: Field[]; values: Record<string, string>; secrets_filled: Record<string, boolean>;
  fee_note: string | null; last_test: { at: string; ok: boolean | null; message: string | null } | null; docsUrl: string;
}

/** Texto curto do estado do gateway, mostrado no cartão. */
export function gatewayStatusText(g: Pick<Gateway, "implemented" | "configured" | "is_active" | "last_test" | "proven">): string {
  if (!g.implemented) return "Adaptador ainda não escrito";
  if (g.is_active) return g.proven ? "Ativo" : "Ativo (ainda não comprovado em produção)";
  if (!g.configured) return "Chaves não cadastradas";
  if (!g.last_test?.ok) return "Chaves salvas — falta testar a conexão";
  return "Pronto para ativar";
}

export function PaymentGatewaysPanel() {
  const [data, setData] = useState<{ vault_ready: boolean; active: string; gateways: Gateway[] } | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [openKey, setOpenKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [d, h] = await Promise.all([apiClient.listPaymentGateways(), apiClient.paymentGatewayHistory()]);
      setData(d); setHistory(h?.data ?? []);
    } catch (e: any) { setError(e?.message ?? "Não foi possível carregar os gateways (somente Admin Master)."); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  if (error) return <p className="flex items-center gap-2 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700"><AlertCircle className="h-4 w-4" /> {error}</p>;
  if (!data) return <div className="flex items-center gap-2 p-4 text-sm text-neutral-500"><Loader2 className="h-4 w-4 animate-spin" /> Carregando…</div>;

  const active = data.gateways.find((g) => g.is_active)?.label ?? "Pagamento de teste (fictício)";
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-900">
        <p className="flex items-center gap-2 font-semibold"><ShieldCheck className="h-4 w-4" /> Gateway ativo agora: {active}</p>
        <p className="mt-1 text-xs">Só o Admin Master troca. Cobranças já geradas no gateway anterior continuam sendo pagas e recebidas nele; as novas passam a sair pelo gateway escolhido. Quem guardou cartão no gateway antigo precisa cadastrar de novo no próximo pagamento.</p>
        {!data.vault_ready && <p className="mt-2 rounded bg-amber-100 p-2 text-xs text-amber-900">O cofre de chaves não está configurado neste servidor (META_TOKEN_ENCRYPTION_KEY): não dá para salvar chaves.</p>}
      </div>

      <ul className="space-y-3">
        {data.gateways.map((g) => (
          <GatewayCard key={g.key} g={g} open={openKey === g.key} onToggle={() => setOpenKey(openKey === g.key ? null : g.key)} onChanged={load} />
        ))}
      </ul>

      <section className="rounded-xl border border-neutral-200 bg-white p-4">
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold"><History className="h-4 w-4" /> Histórico de trocas</h3>
        {history.length === 0 ? <p className="text-xs text-neutral-500">Nenhuma troca registrada ainda.</p> : (
          <ul className="space-y-1 text-xs text-neutral-700">
            {history.map((h) => <li key={h.id}>{new Date(h.created_at).toLocaleString("pt-BR")} — de <b>{h.from_key ?? "—"}</b> para <b>{h.to_key}</b>{h.mode ? ` (${h.mode === "live" ? "produção" : "teste"})` : ""}{h.note ? ` — ${h.note}` : ""}</li>)}
          </ul>
        )}
      </section>
    </div>
  );
}

function GatewayCard({ g, open, onToggle, onChanged }: { g: Gateway; open: boolean; onToggle: () => void; onChanged: () => void }) {
  const [mode, setMode] = useState<"sandbox" | "live">(g.mode);
  const [secrets, setSecrets] = useState<Record<string, string>>({});
  const [values, setValues] = useState<Record<string, string>>(g.values);
  const [fee, setFee] = useState(g.fee_note ?? "");
  const [password, setPassword] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function run(label: string, fn: () => Promise<any>, okText: (r: any) => string) {
    setBusy(label); setMsg(null);
    try { const r = await fn(); setMsg({ ok: r?.ok === false ? false : true, text: okText(r) }); onChanged(); }
    catch (e: any) { setMsg({ ok: false, text: e?.message ?? "Não foi possível concluir." }); }
    finally { setBusy(null); }
  }

  const canConfigure = g.key !== "fake_sandbox" && g.implemented;
  const canActivate = g.key === "fake_sandbox" ? !g.is_active : g.implemented && g.configured && !!g.last_test?.ok && !g.is_active;
  const input = "w-full rounded border border-neutral-300 px-2 py-1.5 text-sm";

  return (
    <li className={`rounded-xl border bg-white p-4 ${g.is_active ? "border-violet-400 ring-1 ring-violet-300" : "border-neutral-200"}`}>
      <button type="button" className="flex w-full items-center justify-between text-left" onClick={onToggle}>
        <span>
          <span className="text-sm font-semibold text-neutral-900">{g.label}</span>
          <span className="ml-2 text-[11px] text-neutral-500">{[g.supports.pix && "Pix", g.supports.card && "cartão", g.supports.recurring && "recorrência"].filter(Boolean).join(" · ")}</span>
        </span>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${g.is_active ? "bg-violet-100 text-violet-800" : g.implemented ? "bg-neutral-100 text-neutral-700" : "bg-neutral-50 text-neutral-400"}`}>{gatewayStatusText(g)}</span>
      </button>

      {open && (
        <div className="mt-3 space-y-3 border-t border-neutral-100 pt-3">
          {!g.implemented && <p className="text-xs text-neutral-500">Este gateway está reservado na lista. Quando você tiver as chaves de teste dele, o adaptador é escrito e ele passa a poder ser ativado aqui.</p>}
          {g.key === "fake_sandbox" && <p className="text-xs text-neutral-600">Pagamento fictício para testes: nenhum dinheiro real. Cartão final 0002 simula recusa.</p>}

          {canConfigure && (
            <>
              <div className="flex gap-2 text-xs">
                <Button type="button" size="sm" variant={mode === "sandbox" ? "default" : "outline"} onClick={() => setMode("sandbox")}>Ambiente de teste</Button>
                <Button type="button" size="sm" variant={mode === "live" ? "default" : "outline"} onClick={() => setMode("live")}>Produção (dinheiro real)</Button>
              </div>
              {g.fields.map((f) => (
                <div key={f.key}>
                  <label className="mb-1 flex items-center gap-1 text-xs font-medium text-neutral-700">{f.secret && <KeyRound className="h-3 w-3" />}{f.label}{f.required ? " *" : ""}</label>
                  {f.secret ? (
                    <input type="password" autoComplete="off" className={input} placeholder={g.secrets_filled[f.key] ? "•••••••• (salvo — deixe vazio para manter)" : "Cole aqui"} value={secrets[f.key] ?? ""} onChange={(e) => setSecrets({ ...secrets, [f.key]: e.target.value })} />
                  ) : (
                    <input className={input} value={values[f.key] ?? ""} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} />
                  )}
                  <p className="mt-0.5 text-[11px] text-neutral-500">{f.help}</p>
                </div>
              ))}
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-700">Anotação da taxa negociada (opcional)</label>
                <input className={input} placeholder="Ex.: Pix 0,99% · cartão 3,5% — válido até dez/2026" value={fee} onChange={(e) => setFee(e.target.value)} />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" disabled={!!busy} onClick={() => run("save", () => apiClient.savePaymentGateway(g.key, { mode, secrets, values, fee_note: fee || null }).then((r) => { setSecrets({}); return r; }), () => "Chaves salvas no cofre.")}>
                  {busy === "save" && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Salvar
                </Button>
                <Button size="sm" variant="outline" disabled={!!busy || !g.configured} onClick={() => run("test", () => apiClient.testPaymentGateway(g.key), (r) => r.message)}>
                  {busy === "test" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlugZap className="h-3.5 w-3.5" />} Testar conexão
                </Button>
              </div>
              {g.last_test && <p className={`text-[11px] ${g.last_test.ok ? "text-emerald-700" : "text-red-700"}`}>Último teste ({new Date(g.last_test.at).toLocaleString("pt-BR")}): {g.last_test.message}</p>}
            </>
          )}

          {canActivate && (
            <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs font-semibold text-amber-900">Ativar {g.label}</p>
              <p className="text-[11px] text-amber-800">As novas cobranças passam a ser recebidas na conta deste gateway. Confirme com a sua senha de Admin Master.</p>
              <input type="password" autoComplete="current-password" className={input} placeholder="Sua senha" value={password} onChange={(e) => setPassword(e.target.value)} />
              <input className={input} placeholder="Motivo da troca (opcional) — ex.: taxa menor" value={note} onChange={(e) => setNote(e.target.value)} />
              <Button size="sm" disabled={!!busy || !password} onClick={() => run("activate", () => apiClient.activatePaymentGateway(g.key, { password, note: note || undefined }).then((r) => { setPassword(""); return r; }), () => `${g.label} agora é o gateway ativo.`)}>
                {busy === "activate" && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Ativar este gateway
              </Button>
            </div>
          )}

          {msg && <p className={`flex items-center gap-1.5 text-xs ${msg.ok ? "text-emerald-700" : "text-red-700"}`}>{msg.ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />} {msg.text}</p>}
        </div>
      )}
    </li>
  );
}
