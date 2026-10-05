"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ClipboardList, Loader2, Search } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StandardPageBanner } from "@/components/standard-page-shell";

const STATUS: Array<[string, string]> = [
  ["novo", "Novo"], ["em_analise", "Em análise"], ["aguardando_cliente", "Aguardando cliente"],
  ["proposta_preparada", "Proposta preparada"], ["proposta_enviada", "Proposta enviada"],
  ["aprovado", "Aprovado"], ["recusado", "Recusado"], ["cancelado", "Cancelado"], ["expirado", "Expirado"],
  // Estados antigos continuam legíveis para solicitações já criadas antes desta tela.
  ["aberta", "Aberta (legado)"], ["respondida", "Respondida (legado)"], ["convertida", "Convertida (legado)"],
];
const statusLabel = (status?: string) => STATUS.find(([key]) => key === status)?.[1] ?? status ?? "Novo";
const fmt = (value?: number | null) => value == null ? "—" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

export default function AdminCommercialRequestsPage() {
  const [items, setItems] = useState<any[]>([]); const [selected, setSelected] = useState<any | null>(null);
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState(""); const [status, setStatus] = useState("");
  const [draft, setDraft] = useState<Record<string, any>>({});
  const load = async () => { setLoading(true); try { const result = await apiClient.listCatalog2CommercialRequests({ status: status || undefined, search: search || undefined }); setItems(result?.data ?? []); } finally { setLoading(false); } };
  useEffect(() => { void load(); }, [status]);
  const select = (item: any) => { setSelected(item); setDraft({ status: item.status, internal_note: item.internal_note ?? "", response_note: item.response_note ?? "", assigned_to_user_id: item.assigned_to_user_id ?? "", proposed_price: item.proposed_price ?? "", proposed_deadline_days: item.proposed_deadline_days ?? "", proposal_valid_until: item.proposal_valid_until ? new Date(item.proposal_valid_until).toISOString().slice(0, 10) : "", client_response_note: item.client_response_note ?? "" }); };
  const save = async () => { if (!selected) return; setSaving(true); try { const body: Record<string, any> = { ...draft, assigned_to_user_id: draft.assigned_to_user_id || null, proposed_price: draft.proposed_price === "" ? null : Number(draft.proposed_price), proposed_deadline_days: draft.proposed_deadline_days === "" ? null : Number(draft.proposed_deadline_days), proposal_valid_until: draft.proposal_valid_until ? new Date(`${draft.proposal_valid_until}T00:00:00.000Z`).toISOString() : null }; const updated = await apiClient.updateCatalog2CommercialRequest(selected.id, body); const merged = { ...selected, ...updated, history: [...(selected.history ?? []), { at: new Date().toISOString(), status_after: body.status, changes: Object.keys(body) }] }; setSelected(merged); setItems((all) => all.map((item) => item.id === merged.id ? merged : item)); } finally { setSaving(false); } };
  const shown = useMemo(() => items, [items]);
  return <div className="space-y-4 p-4 md:p-6">
    <StandardPageBanner icon={ClipboardList} title="Pedidos de orçamento" description="Solicitações de orçamento personalizado. Cada atualização fica registrada; não gera contratação automática." />
    <Card className="flex flex-wrap items-center gap-2 p-3">
      <Input aria-label="Buscar pedidos" value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void load(); }} placeholder="Buscar por observação ou referência" className="max-w-md" />
      <select aria-label="Filtrar por status" value={status} onChange={(event) => setStatus(event.target.value)} className="h-9 rounded-md border bg-background px-2 text-sm"><option value="">Todos os status</option>{STATUS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
      <Button variant="outline" onClick={() => void load()}><Search className="mr-2 h-4 w-4" />Buscar</Button>
    </Card>
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
      <Card className="overflow-hidden">
        {loading ? <div className="flex min-h-40 items-center justify-center text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Carregando pedidos…</div> : shown.length === 0 ? <p className="p-6 text-sm text-muted-foreground">Nenhum pedido encontrado.</p> : <div className="divide-y">{shown.map((item) => <button type="button" key={item.id} onClick={() => select(item)} className={`grid w-full grid-cols-[minmax(0,1fr)_auto] gap-3 p-4 text-left hover:bg-muted/50 ${selected?.id === item.id ? "bg-muted" : ""}`}><span><strong className="block text-sm">{item.product ? `#${item.product.sequence_number} · ${item.product.internal_name}` : `Produto ${item.product_id}`}</strong><span className="block truncate text-xs text-muted-foreground">{item.client_note || "Sem observação do cliente"}</span><span className="mt-1 block text-[11px] text-muted-foreground">{new Date(item.created_at).toLocaleString("pt-BR")}</span></span><Badge variant="outline" className="h-fit">{statusLabel(item.status)}</Badge></button>)}</div>}
      </Card>
      <Card className="p-4">{!selected ? <p className="text-sm text-muted-foreground">Selecione um pedido para ver escolhas, proposta e histórico.</p> : <div className="space-y-3"><div><p className="font-semibold">{selected.product ? `#${selected.product.sequence_number} · ${selected.product.internal_name}` : "Produto"}</p><p className="text-xs text-muted-foreground">Solicitação {selected.id}</p></div><div className="rounded-md bg-muted p-2 text-xs"><strong>Escolhas originais</strong><pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap">{JSON.stringify(selected.selection, null, 2)}</pre></div><label className="block text-xs font-medium">Status<select value={draft.status ?? "novo"} onChange={(event) => setDraft({ ...draft, status: event.target.value })} className="mt-1 h-9 w-full rounded-md border bg-background px-2">{STATUS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="block text-xs font-medium">Responsável (ID do usuário)<Input value={draft.assigned_to_user_id ?? ""} onChange={(event) => setDraft({ ...draft, assigned_to_user_id: event.target.value })} /></label><div className="grid grid-cols-2 gap-2"><label className="text-xs font-medium">Preço proposto<Input type="number" min="0" value={draft.proposed_price ?? ""} onChange={(event) => setDraft({ ...draft, proposed_price: event.target.value })} /></label><label className="text-xs font-medium">Prazo em dias<Input type="number" min="0" value={draft.proposed_deadline_days ?? ""} onChange={(event) => setDraft({ ...draft, proposed_deadline_days: event.target.value })} /></label></div><label className="block text-xs font-medium">Validade<Input type="date" value={draft.proposal_valid_until ?? ""} onChange={(event) => setDraft({ ...draft, proposal_valid_until: event.target.value })} /></label><label className="block text-xs font-medium">Nota interna<textarea className="mt-1 min-h-16 w-full rounded-md border bg-background p-2 text-sm" value={draft.internal_note ?? ""} onChange={(event) => setDraft({ ...draft, internal_note: event.target.value })} /></label><label className="block text-xs font-medium">Resposta ao cliente<textarea className="mt-1 min-h-16 w-full rounded-md border bg-background p-2 text-sm" value={draft.response_note ?? ""} onChange={(event) => setDraft({ ...draft, response_note: event.target.value })} /></label><p className="text-xs text-muted-foreground">Proposta atual: {fmt(selected.proposed_price)} · {selected.proposed_deadline_days ?? "—"} dias</p><Button className="w-full" disabled={saving} onClick={() => void save()}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}Salvar atualização</Button><div className="border-t pt-2"><p className="text-xs font-semibold">Histórico</p>{(selected.history ?? []).slice().reverse().map((entry: any, index: number) => <p key={index} className="mt-1 text-[11px] text-muted-foreground">{new Date(entry.at).toLocaleString("pt-BR")} · {statusLabel(entry.status_after)} · {(entry.changes ?? []).join(", ")}</p>)}</div></div>}</Card>
    </div>
  </div>;
}
