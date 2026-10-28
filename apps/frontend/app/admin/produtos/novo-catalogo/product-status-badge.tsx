"use client";
import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { apiClient } from "@/lib/api-client";
import { CATALOG2_STATUSES, CATALOG2_STATUS_LABEL, CATALOG2_STATUS_MEANING } from "@/lib/catalog2-status";
import { StatusChangeDialog } from "./status-change-dialog";

// Selo de STATUS na lista de produtos: só o ADMIN MASTER clica (os outros veem só o selo). Escolher outro status pede confirmação com o resumo de valores,
// e o status vale na hora. O servidor também só aceita admin master nessa rota.
let masterCache: Promise<boolean> | null = null;
export function useIsMasterAdmin(): boolean {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    let off = false;
    masterCache ??= Promise.resolve(apiClient.getCurrentUser?.()).then((u: any) => u?.account_type === "admin" && u?.admin_profile?.is_active !== false && u?.admin_profile?.is_master === true).catch(() => false);
    masterCache.then((v) => { if (!off) setOk(v); });
    return () => { off = true; };
  }, []);
  return ok;
}
/** Só para testes: esquece a resposta guardada de "é admin master?". */
export const resetMasterCacheForTests = () => { masterCache = null; };

const NEEDS_PUBLISHED = ["pre_lancamento", "disponivel", "temporariamente_inativo", "esgotado_temporariamente"];

export function ProductStatusBadge({ product, tone, label, onChanged }: { product: any; tone: string; label: string; onChanged: () => void | Promise<void> }) {
  const master = useIsMasterAdmin();
  const [ask, setAsk] = useState<{ to: string; detail: any } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  if (!master) return <Badge className={`max-w-full ${tone}`} title={label}><span className="truncate">{label}</span></Badge>;

  const choose = async (to: string) => {
    setErr(null);
    if (to === product.status) return;
    if (NEEDS_PUBLISHED.includes(to) && !product.published_version_number) { setErr("Publique uma versão antes de usar este status: ele pode aparecer no catálogo do cliente."); return; }
    try {
      const detail: any = await apiClient.getCatalog2Product(product.id);
      setAsk({ to, detail });
    } catch (e: any) { setErr(e?.message ?? "Não foi possível abrir o produto."); }
  };
  const confirm = async () => {
    if (!ask) return;
    setBusy(true);
    try { await apiClient.setCatalog2ProductStatus(product.id, ask.to); setAsk(null); await onChanged(); }
    catch (e: any) { setErr(e?.message ?? "Não foi possível mudar o status."); setAsk(null); }
    finally { setBusy(false); }
  };
  const detail = ask?.detail;
  const version = detail ? (detail.versions ?? []).find((v: any) => v.id === detail.published_version_id) ?? detail.versions?.[0] : null;
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" aria-label="Mudar o status do produto" title="Clique para mudar o status (pede confirmação)" data-testid="list-status-badge" className="inline-flex min-w-0 max-w-full items-center rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400">
            <Badge className={`max-w-full cursor-pointer ${tone}`} title={label}><span className="truncate">{label}</span><ChevronDown className="h-3 w-3 shrink-0 opacity-70" /></Badge>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {CATALOG2_STATUSES.map((st) => (
            <DropdownMenuItem key={st} onClick={() => void choose(st)} className="flex flex-col items-start gap-0.5">
              <span className="font-semibold">{CATALOG2_STATUS_LABEL[st]}{st === product.status ? " ✓" : ""}</span>
              <span className="max-w-[16rem] text-[11px] leading-snug text-muted-foreground">{CATALOG2_STATUS_MEANING[st]}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {err && <span role="alert" className="ml-1 text-[11px] font-semibold text-red-600">{err}</span>}
      {ask && version && (
        <StatusChangeDialog open product={{ ...detail, internal_name: detail.internal_name ?? product.internal_name }} version={version} from={product.status} to={ask.to}
          fromLabel={CATALOG2_STATUS_LABEL[product.status as keyof typeof CATALOG2_STATUS_LABEL] ?? product.status} toLabel={CATALOG2_STATUS_LABEL[ask.to as keyof typeof CATALOG2_STATUS_LABEL] ?? ask.to}
          meaning={CATALOG2_STATUS_MEANING[ask.to as keyof typeof CATALOG2_STATUS_MEANING] ?? ""} busy={busy} onCancel={() => setAsk(null)} onConfirm={() => void confirm()} />
      )}
    </>
  );
}
