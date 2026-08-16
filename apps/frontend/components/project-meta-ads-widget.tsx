/**
 * Widget de resumo do Meta Ads na "Visão Geral" do projeto — só renderiza
 * (retorna null) quando existe uma conexão Meta ativa. Soma os últimos 30
 * dias de apiClient.getProjectConnectionMetrics(). Números simples nesta
 * primeira versão, sem gráfico.
 */
import { useEffect, useState } from "react";
import { Facebook, DollarSign, Eye, MousePointerClick } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useProjectConnections } from "@/hooks/useProjectConnections";

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmtInt(v: number) {
  return v.toLocaleString("pt-BR");
}

interface ProjectMetaAdsWidgetProps {
  projectId: string | number;
}

export function ProjectMetaAdsWidget({ projectId }: ProjectMetaAdsWidgetProps) {
  const { connections } = useProjectConnections(projectId);
  const connection = connections.find((c) => c.provider === "meta_ads" && c.status === "connected");

  const [totals, setTotals] = useState<{ spend: number; impressions: number; clicks: number } | null>(null);

  useEffect(() => {
    if (!connection) {
      setTotals(null);
      return;
    }
    let cancelled = false;
    apiClient
      .getProjectConnectionMetrics(connection.id, 30)
      .then((res) => {
        if (cancelled) return;
        const rows = res?.data ?? [];
        setTotals({
          spend: rows.reduce((sum, r) => sum + (r.spend ?? 0), 0),
          impressions: rows.reduce((sum, r) => sum + (r.impressions ?? 0), 0),
          clicks: rows.reduce((sum, r) => sum + (r.clicks ?? 0), 0),
        });
      })
      .catch(() => setTotals(null));
    return () => {
      cancelled = true;
    };
  }, [connection]);

  if (!connection || !totals) return null;

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
          <Facebook className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
        </span>
        <h3 className="text-sm font-semibold text-slate-800 dark:text-white">Meta Ads</h3>
        <span className="ml-auto text-[10px] text-slate-400">Últimos 30 dias</span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <div className="flex items-center gap-1 text-[10px] text-slate-400 uppercase tracking-wider">
            <DollarSign className="h-3 w-3" />
            Investimento
          </div>
          <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">{fmtBRL(totals.spend)}</p>
        </div>
        <div>
          <div className="flex items-center gap-1 text-[10px] text-slate-400 uppercase tracking-wider">
            <Eye className="h-3 w-3" />
            Impressões
          </div>
          <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">{fmtInt(totals.impressions)}</p>
        </div>
        <div>
          <div className="flex items-center gap-1 text-[10px] text-slate-400 uppercase tracking-wider">
            <MousePointerClick className="h-3 w-3" />
            Cliques
          </div>
          <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">{fmtInt(totals.clicks)}</p>
        </div>
      </div>
    </div>
  );
}
