"use client";

// "Alertas do Sistema" e "Registro do sistema" dos dashboards: dados REAIS do usuário (/api/system-alerts).
// Antes, cada dashboard tinha listas fixas com conteúdo inventado ("Fatura #201 de R$ 2.600", "Pico de tráfego +45%", "Backup concluído"…)
// que aparecia para clientes de verdade. Sem alertas reais, as listas ficam vazias (nunca dado inventado).
import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";

export interface DashboardAlert { id: string; type: "warning" | "info" | "success"; title: string; description: string; priority: "high" | "medium" | "low" }
export interface DashboardLogLine { message: string; type: "warning" | "info" | "success"; time: string }

const HIGH = new Set(["critical", "critico", "crítico", "high", "alta", "error", "red", "vermelho"]);
const OK = new Set(["success", "sucesso", "green", "verde"]);

/** Converte linhas de /api/system-alerts nas duas listas que os dashboards desenham. Função pura (testável). */
export function mapSystemAlerts(rows: any[], now: Date = new Date()): { alerts: DashboardAlert[]; log: DashboardLogLine[] } {
  const list = (Array.isArray(rows) ? rows : []).filter((r) => r && typeof r === "object");
  const sev = (r: any) => String(r?.severity ?? "").toLowerCase();
  const alerts: DashboardAlert[] = list
    .filter((r) => !r?.is_read)
    .slice(0, 6)
    .map((r, i) => ({
      id: String(r?.id ?? i),
      type: OK.has(sev(r)) ? "success" : HIGH.has(sev(r)) || sev(r) === "warning" ? "warning" : "info",
      title: String(r?.title ?? "Alerta"),
      description: String(r?.message ?? ""),
      priority: HIGH.has(sev(r)) ? "high" : "medium",
    }));
  const log: DashboardLogLine[] = list.slice(0, 6).map((r) => ({
    message: String(r?.title ?? r?.message ?? ""),
    type: OK.has(sev(r)) ? "success" : HIGH.has(sev(r)) || sev(r) === "warning" ? "warning" : "info",
    time: relativeTime(r?.created_at, now),
  }));
  return { alerts, log };
}

function relativeTime(iso: unknown, now: Date): string {
  const t = iso ? new Date(String(iso)).getTime() : NaN;
  if (!Number.isFinite(t)) return "";
  const min = Math.max(0, Math.round((now.getTime() - t) / 60000));
  if (min < 1) return "Agora";
  if (min < 60) return `${min} min atrás`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} h atrás`;
  return `${Math.round(h / 24)} d atrás`;
}

export function useDashboardSystemAlerts() {
  const [state, setState] = useState<{ alerts: DashboardAlert[]; log: DashboardLogLine[] }>({ alerts: [], log: [] });
  useEffect(() => {
    let alive = true;
    const get = (apiClient as any)?.getSystemAlerts;
    if (typeof get !== "function") return;
    Promise.resolve(get.call(apiClient, { page_size: 8 }))
      .then((res: any) => { if (alive) setState(mapSystemAlerts(res?.data ?? [])); })
      .catch(() => { /* sem alertas: lista vazia, nunca inventada */ });
    return () => { alive = false; };
  }, []);
  return state;
}
