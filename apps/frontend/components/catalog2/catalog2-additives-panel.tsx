"use client";

// Aba "Aditivos" do detalhe do projeto (fechamento técnico do sprint de
// produtos). Cliente autorizado solicita um aditivo sobre um item do
// catalog2 já contratado neste projeto; Admin aprova/rejeita; preço e prazo
// vêm sempre do backend (nunca calculados aqui). A configuração em si
// (variação/adicional/quantidade nova) é feita no configurador já existente
// do catálogo do cliente — este painel reaproveita a COTAÇÃO gerada lá,
// nunca reimplementa o configurador.

import { useCallback, useEffect, useState } from "react";
import { Loader2, AlertCircle, CheckCircle2, Clock, XCircle, ExternalLink, RefreshCw } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

function money(v: number | null | undefined, currency = "BRL") {
  if (v == null) return "A definir";
  return `${currency} ${Number(v).toFixed(2)}`;
}

const STATUS_LABEL: Record<string, string> = {
  solicitado: "Em análise",
  aprovado: "Aprovado — aguardando pagamento",
  rejeitado: "Rejeitado",
  expirado: "Expirado",
  materializado: "Pago e aplicado",
  cancelado: "Cancelado",
};
const STATUS_STYLE: Record<string, string> = {
  solicitado: "bg-amber-100 text-amber-800 border-amber-300",
  aprovado: "bg-blue-100 text-blue-800 border-blue-300",
  rejeitado: "bg-red-100 text-red-700 border-red-300",
  expirado: "bg-neutral-100 text-neutral-600 border-neutral-300",
  materializado: "bg-emerald-100 text-emerald-800 border-emerald-300",
  cancelado: "bg-neutral-100 text-neutral-500 border-neutral-300",
};

export function Catalog2AdditivesPanel({ projectId }: { projectId: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [changeOrders, setChangeOrders] = useState<any[]>([]);
  const [catalog2Items, setCatalog2Items] = useState<any[]>([]);
  const [myQuotes, setMyQuotes] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [portal, setPortal] = useState<"company" | "agency" | "admin">("company");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cos, products, me] = await Promise.all([
        apiClient.listCatalog2ChangeOrders(projectId),
        apiClient.getProjectProducts({ project_id: projectId }),
        apiClient.getCurrentUser().catch(() => null),
      ]);
      setChangeOrders((cos as any)?.data ?? []);
      const items = ((products as any)?.data ?? products ?? []).filter(
        (p: any) => p.origin === "CATALOG2" || p.origin === "CATALOG2_ADDITIVE",
      );
      setCatalog2Items(items);
      const accountType = (me as any)?.account_type;
      const admin = accountType === "admin" || (me as any)?.role === "admin";
      setIsAdmin(admin);
      const resolvedPortal = admin ? "admin" : accountType === "agencias" ? "agency" : "company";
      setPortal(resolvedPortal);
      if (!admin) {
        const quotes = await apiClient.listClientCatalog2Quotes().catch(() => ({ data: [] }));
        setMyQuotes(((quotes as any)?.data ?? []).filter((q: any) => q.status === "valida"));
      }
    } catch (e: any) {
      setError(e?.message ?? "Não foi possível carregar os aditivos.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-neutral-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando aditivos…
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6">
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
        </div>
      )}

      {catalog2Items.length === 0 ? (
        <p className="text-sm text-neutral-500">Este projeto não tem itens do novo catálogo — aditivos só se aplicam a produtos contratados via Catálogo 2.0.</p>
      ) : portal !== "admin" ? (
        <RequestAdditiveForm
          catalog2Items={catalog2Items}
          myQuotes={myQuotes}
          projectId={projectId}
          onCreated={load}
          portal={portal}
        />
      ) : null}

      <div className="flex items-center justify-between" data-tour-id="catalog2-additives-history">
        <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">Histórico de aditivos</h3>
        <Button size="sm" variant="ghost" onClick={load}>
          <RefreshCw className="h-3.5 w-3.5" /> Atualizar
        </Button>
      </div>

      {changeOrders.length === 0 ? (
        <p className="text-sm text-neutral-500">Nenhum aditivo solicitado ainda.</p>
      ) : (
        <ul className="space-y-3">
          {changeOrders.map((co) => (
            <ChangeOrderRow key={co.id} co={co} isAdmin={isAdmin} portal={portal} onChanged={load} />
          ))}
        </ul>
      )}
    </div>
  );
}

function RequestAdditiveForm({ catalog2Items, myQuotes, projectId, onCreated, portal }: any) {
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [selectedQuoteId, setSelectedQuoteId] = useState<string>("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const selectedItem = catalog2Items.find((i: any) => i.id === selectedItemId);
  const eligibleQuotes = selectedItem
    ? myQuotes.filter((q: any) => q.product_id === selectedItem.catalog2_product_id)
    : [];
  const selectedQuote = eligibleQuotes.find((q: any) => q.id === selectedQuoteId);

  async function submit() {
    if (!selectedItem || !selectedQuoteId) return;
    setBusy(true);
    setLocalError(null);
    try {
      await apiClient.requestCatalog2ChangeOrder({
        project_id: projectId,
        original_project_product_id: selectedItem.id,
        quote_id: selectedQuoteId,
        request_note: note || undefined,
      });
      setSelectedItemId("");
      setSelectedQuoteId("");
      setNote("");
      await onCreated();
    } catch (e: any) {
      setLocalError(e?.message ?? "Não foi possível enviar a solicitação.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <h3 className="text-sm font-semibold">Solicitar aditivo</h3>
      <p className="text-xs text-neutral-500">
        1. Ajuste a configuração (variação, adicional ou quantidade) no{" "}
        <a
          className="inline-flex items-center gap-1 text-blue-600 underline"
          href={`/${portal}/catalog2`}
          target="_blank"
          rel="noreferrer"
        >
          Catálogo 2.0 <ExternalLink className="h-3 w-3" />
        </a>{" "}
        e gere uma cotação. 2. Volte aqui e selecione a cotação gerada para anexá-la a este pedido.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600">Item já contratado</label>
          <select
            className="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm dark:bg-neutral-900"
            value={selectedItemId}
            onChange={(e) => { setSelectedItemId(e.target.value); setSelectedQuoteId(""); }}
          >
            <option value="">Selecione…</option>
            {catalog2Items.map((i: any) => (
              <option key={i.id} value={i.id}>{i.product_name_snapshot}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600">Cotação gerada (válida)</label>
          <select
            className="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm dark:bg-neutral-900"
            value={selectedQuoteId}
            onChange={(e) => setSelectedQuoteId(e.target.value)}
            disabled={!selectedItem}
          >
            <option value="">{selectedItem ? "Selecione…" : "Escolha o item primeiro"}</option>
            {eligibleQuotes.map((q: any) => (
              <option key={q.id} value={q.id}>{money(q.commercial_price, q.currency)} — {q.commercial_deadline_days ?? "?"} dia(s)</option>
            ))}
          </select>
          {selectedItem && eligibleQuotes.length === 0 && (
            <p className="mt-1 text-[11px] text-amber-600">Nenhuma cotação válida ainda para este produto — gere uma no catálogo primeiro.</p>
          )}
        </div>
      </div>

      {selectedQuote && (
        <div className="rounded bg-neutral-50 p-3 text-sm dark:bg-neutral-800/50">
          <p className="font-medium text-neutral-700 dark:text-neutral-300">Impacto desta cotação (calculado pelo servidor):</p>
          <div className="mt-1 flex justify-between"><span>Preço</span><strong>{money(selectedQuote.commercial_price, selectedQuote.currency)}</strong></div>
          <div className="flex justify-between text-neutral-500"><span>Prazo</span><span>{selectedQuote.commercial_deadline_days ?? "A definir"} dia(s)</span></div>
        </div>
      )}

      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-600">Motivo (opcional)</label>
        <textarea
          className="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm dark:bg-neutral-900"
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Ex.: precisamos de mais uma variação de arte para o lançamento."
        />
      </div>

      {localError && (
        <p className="flex items-center gap-1.5 rounded border border-red-200 bg-red-50 px-2.5 py-2 text-xs text-red-700">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {localError}
        </p>
      )}

      <Button size="sm" disabled={!selectedItem || !selectedQuoteId || busy} onClick={submit}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Enviar solicitação
      </Button>
    </div>
  );
}

function ChangeOrderRow({ co, isAdmin, portal, onChanged }: any) {
  const [busy, setBusy] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rowError, setRowError] = useState<string | null>(null);

  async function approve() {
    setBusy(true);
    setRowError(null);
    try {
      await apiClient.approveCatalog2ChangeOrder(co.id, { approval_client_action_id: crypto.randomUUID() });
      await onChanged();
    } catch (e: any) {
      setRowError(e?.message ?? "Não foi possível aprovar.");
    } finally {
      setBusy(false);
    }
  }
  async function reject() {
    if (!rejectReason.trim()) return;
    setBusy(true);
    setRowError(null);
    try {
      await apiClient.rejectCatalog2ChangeOrder(co.id, { decision_note: rejectReason.trim() });
      setShowReject(false);
      await onChanged();
    } catch (e: any) {
      setRowError(e?.message ?? "Não foi possível rejeitar.");
    } finally {
      setBusy(false);
    }
  }
  async function pay() {
    setBusy(true);
    setRowError(null);
    try {
      await apiClient.checkoutCatalog2ChangeOrder(co.id);
      await onChanged();
    } catch (e: any) {
      setRowError(e?.message ?? "Não foi possível confirmar o pagamento.");
    } finally {
      setBusy(false);
    }
  }

  const StatusIcon = co.status === "materializado" ? CheckCircle2 : co.status === "rejeitado" ? XCircle : Clock;

  return (
    <li className="rounded-lg border border-neutral-200 p-3 text-sm dark:border-neutral-800">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <StatusIcon className="h-4 w-4 shrink-0 text-neutral-500" />
          <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[co.status] ?? ""}`}>
            {STATUS_LABEL[co.status] ?? co.status}
          </span>
        </div>
        <span className="text-xs text-neutral-500">{new Date(co.requested_at).toLocaleString("pt-BR")}</span>
      </div>
      <p className="mt-2 text-neutral-700 dark:text-neutral-300">{co.change_summary}</p>
      {co.request_note && <p className="mt-1 text-xs text-neutral-500">Motivo: {co.request_note}</p>}
      {co.price_impact_snapshot != null && (
        <div className="mt-2 flex gap-4 text-xs text-neutral-500">
          <span>Preço: <strong className="text-neutral-700 dark:text-neutral-300">{money(co.price_impact_snapshot, co.currency_snapshot)}</strong></span>
          {co.deadline_impact_days_snapshot != null && <span>Prazo: <strong className="text-neutral-700 dark:text-neutral-300">{co.deadline_impact_days_snapshot} dia(s)</strong></span>}
        </div>
      )}
      {co.decision_note && <p className="mt-1 text-xs text-neutral-500">Decisão: {co.decision_note}</p>}

      {rowError && (
        <p className="mt-2 flex items-center gap-1.5 rounded border border-red-200 bg-red-50 px-2.5 py-2 text-xs text-red-700">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {rowError}
        </p>
      )}

      <div className="mt-2 flex flex-wrap gap-2">
        {isAdmin && co.status === "solicitado" && (
          <>
            <Button size="sm" disabled={busy} onClick={approve}>{busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Aprovar</Button>
            <Button size="sm" variant="outline" className="text-red-600" disabled={busy} onClick={() => setShowReject((v) => !v)}>Rejeitar</Button>
          </>
        )}
        {portal !== "admin" && co.status === "aprovado" && (
          <Button size="sm" disabled={busy} onClick={pay}>{busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Simular pagamento do aditivo</Button>
        )}
      </div>

      {showReject && (
        <div className="mt-2 flex gap-2">
          <input
            className="flex-1 rounded border border-neutral-300 px-2 py-1 text-xs dark:bg-neutral-900"
            placeholder="Motivo da rejeição (obrigatório)"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <Button size="sm" variant="outline" className="text-red-600" disabled={!rejectReason.trim() || busy} onClick={reject}>Confirmar rejeição</Button>
        </div>
      )}
    </li>
  );
}
