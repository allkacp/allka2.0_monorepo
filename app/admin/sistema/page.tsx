// @ts-nocheck
import { useState, useEffect, useCallback } from "react";
import { useSidebar } from "@/contexts/sidebar-context";
import { apiClient } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import {
  Server, Database, HardDrive, Zap, Cpu, Activity, RefreshCw,
  CheckCircle2, AlertTriangle, XCircle, Users, Building2, FolderKanban,
  ClipboardList, Settings, Bug, Shield, Info,
} from "lucide-react";

function GaugeBar({ value, thresholds = [60, 80] }) {
  const [low, high] = thresholds;
  const color = value >= high ? "bg-red-500" : value >= low ? "bg-amber-500" : "bg-emerald-500";
  const label = value >= high ? "Alto" : value >= low ? "Moderado" : "Normal";
  const badge = value >= high
    ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-700/40"
    : value >= low
      ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-700/40"
      : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-700/40";
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-3xl font-bold text-slate-800 dark:text-slate-100 tabular-nums">{value}%</span>
        <Badge variant="outline" className={`text-[10px] font-semibold ${badge}`}>{label}</Badge>
      </div>
      <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-3">
        <div className={`h-3 rounded-full transition-all duration-700 ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function ServiceDot({ status }) {
  return (
    <span className={`inline-block w-2 h-2 rounded-full ${
      status === "operational" ? "bg-emerald-500" :
      status === "degraded" ? "bg-amber-500" : "bg-red-500"
    }`} />
  );
}

const LOG_LEVELS = {
  info:    { label: "INFO",  cls: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400" },
  warning: { label: "AVISO", cls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400" },
  error:   { label: "ERRO",  cls: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400" },
};

const MOCK_LOGS = [
  { id: 1, level: "info",    ts: "07/05 09:14", msg: "Backup automático concluído com sucesso." },
  { id: 2, level: "info",    ts: "07/05 08:30", msg: "Prisma Client gerado (v5.22.0)." },
  { id: 3, level: "warning", ts: "07/05 07:55", msg: "Latência elevada detectada: endpoint /api/projects (1.2s)." },
  { id: 4, level: "info",    ts: "06/05 23:00", msg: "Rotina de limpeza de sessões expiradas executada." },
  { id: 5, level: "warning", ts: "06/05 18:10", msg: "Tentativas de login suspeitas detectadas (IP: 192.168.x.x)." },
  { id: 6, level: "error",   ts: "06/05 15:00", msg: "Falha ao enviar email para parceiro@domain.com — SMTP timeout." },
  { id: 7, level: "info",    ts: "06/05 10:00", msg: "Deploy realizado: versão 1.4.2 em produção." },
];

const MOCK_SERVICES = [
  { name: "API Express",       status: "operational", uptime: "99.97%", restart: "há 3 dias" },
  { name: "Banco de Dados",    status: "operational", uptime: "99.99%", restart: "há 7 dias" },
  { name: "Prisma ORM",        status: "operational", uptime: "99.97%", restart: "há 3 dias" },
  { name: "Serviço de Email",  status: "degraded",    uptime: "98.12%", restart: "há 1 hora" },
  { name: "Armazenamento",     status: "operational", uptime: "100%",   restart: "há 14 dias" },
  { name: "WebSocket / Chat",  status: "operational", uptime: "99.80%", restart: "há 2 dias" },
];

export default function AdminSistemaPage() {
  useSidebar();
  const { toast } = useToast();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [perf, setPerf] = useState({ cpu: 18, mem: 44, disk: 27, rt: 142 });
  const [maintenance, setMaintenance] = useState(false);
  const [debug, setDebug] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const s = await apiClient.getDashboardStats();
      setStats(s);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Simulate slight metric drift on refresh
  function refreshMetrics() {
    setRefreshing(true);
    setTimeout(() => {
      setPerf({
        cpu:  Math.min(95, Math.max(5,  perf.cpu  + Math.round((Math.random() - 0.5) * 12))),
        mem:  Math.min(95, Math.max(20, perf.mem  + Math.round((Math.random() - 0.5) * 10))),
        disk: Math.min(90, Math.max(10, perf.disk + Math.round((Math.random() - 0.5) * 4))),
        rt:   Math.min(800,Math.max(60, perf.rt   + Math.round((Math.random() - 0.5) * 80))),
      });
      setRefreshing(false);
      toast({ title: "Status atualizado" });
    }, 700);
  }

  const services = MOCK_SERVICES;
  const operationalCount = services.filter(s => s.status === "operational").length;
  const overallOk = operationalCount === services.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Sistema</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Monitoramento e configurações da infraestrutura</p>
        </div>
        <Button variant="outline" size="sm" onClick={refreshMetrics} disabled={refreshing} className="h-8 gap-1.5 text-xs">
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} /> Atualizar
        </Button>
      </div>

      {/* Status strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Status Geral",   value: overallOk ? "Operacional" : "Atenção", icon: Server,       color: overallOk ? "text-emerald-500" : "text-amber-500",  bg: overallOk ? "bg-emerald-50 dark:bg-emerald-950/30" : "bg-amber-50 dark:bg-amber-950/30" },
          { label: "Nômades",        value: loading ? "…" : (stats?.nomades?.total ?? "—"),   icon: Users,        color: "text-blue-500",    bg: "bg-blue-50 dark:bg-blue-950/30" },
          { label: "Empresas",       value: loading ? "…" : (stats?.companies?.total ?? "—"), icon: Building2,    color: "text-violet-500",  bg: "bg-violet-50 dark:bg-violet-950/30" },
          { label: "Projetos Ativos",value: loading ? "…" : (stats?.projects?.active ?? "—"), icon: FolderKanban, color: "text-pink-500",    bg: "bg-pink-50 dark:bg-pink-950/30" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-3 flex items-center gap-2.5">
            <div className={`p-1.5 rounded-lg ${bg} shrink-0`}><Icon className={`h-3.5 w-3.5 ${color}`} /></div>
            <div className="min-w-0">
              <p className="text-[10px] text-slate-400 uppercase tracking-wide font-medium leading-none mb-0.5">{label}</p>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100 tabular-nums">{value}</p>
            </div>
          </div>
        ))}
      </div>

      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList className="h-8 text-xs">
          <TabsTrigger value="performance" className="text-xs px-3">Performance</TabsTrigger>
          <TabsTrigger value="services"    className="text-xs px-3">Serviços</TabsTrigger>
          <TabsTrigger value="logs"        className="text-xs px-3">Logs</TabsTrigger>
          <TabsTrigger value="settings"    className="text-xs px-3">Configurações</TabsTrigger>
        </TabsList>

        {/* ── Performance ── */}
        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: Cpu,      label: "CPU",      value: perf.cpu,  thresholds: [60, 80] },
              { icon: Activity, label: "Memória",  value: perf.mem,  thresholds: [70, 85] },
              { icon: HardDrive,label: "Disco",    value: perf.disk, thresholds: [70, 85] },
            ].map(({ icon: Icon, label, value, thresholds }) => (
              <Card key={label} className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Icon className="h-4 w-4 text-slate-500" />
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Uso de {label}</h3>
                </div>
                <GaugeBar value={value} thresholds={thresholds} />
              </Card>
            ))}
          </div>
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="h-4 w-4 text-slate-500" />
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Tempo de Resposta da API</h3>
              <Badge variant="outline" className="ml-auto text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400">
                Normal
              </Badge>
            </div>
            <p className="text-3xl font-bold text-slate-800 dark:text-slate-100 tabular-nums">{perf.rt}<span className="text-sm text-slate-400 ml-1">ms</span></p>
            <p className="text-xs text-slate-400 mt-1">Média dos últimos 5 min</p>
          </Card>
          <p className="text-xs text-slate-400 italic">* Métricas simuladas. Integração com endpoint real de telemetria pendente.</p>
        </TabsContent>

        {/* ── Services ── */}
        <TabsContent value="services">
          <Card className="overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Status dos Serviços</h3>
              <Badge variant="outline" className={`text-[10px] font-semibold ${overallOk
                ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400"
                : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400"}`}>
                {operationalCount}/{services.length} operacional
              </Badge>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {services.map((svc, i) => (
                <div key={i} className={`px-4 py-3.5 flex items-center gap-3 ${i % 2 === 0 ? "bg-[var(--table-row)]" : "bg-[var(--table-row-alt)]"} hover:bg-[var(--table-row-hover)] transition-colors`}>
                  <ServiceDot status={svc.status} />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200 flex-1">{svc.name}</span>
                  <span className="text-xs text-slate-400 hidden sm:block">Reiniciado {svc.restart}</span>
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 tabular-nums w-14 text-right">{svc.uptime}</span>
                  <Badge variant="outline" className={`text-[10px] font-semibold w-24 justify-center ${
                    svc.status === "operational"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400"
                      : svc.status === "degraded"
                        ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400"
                        : "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400"
                  }`}>
                    {svc.status === "operational" ? "Operacional" : svc.status === "degraded" ? "Degradado" : "Offline"}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* ── Logs ── */}
        <TabsContent value="logs">
          <Card className="overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Logs Recentes do Sistema</h3>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {MOCK_LOGS.map((log, i) => {
                const lv = LOG_LEVELS[log.level] || LOG_LEVELS.info;
                const Ico = log.level === "error" ? XCircle : log.level === "warning" ? AlertTriangle : Info;
                return (
                  <div key={log.id} className={`px-4 py-3 flex items-start gap-3 ${i % 2 === 0 ? "bg-[var(--table-row)]" : "bg-[var(--table-row-alt)]"}`}>
                    <Ico className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${log.level === "error" ? "text-red-500" : log.level === "warning" ? "text-amber-500" : "text-blue-400"}`} />
                    <Badge variant="outline" className={`text-[9px] font-bold px-1.5 py-0 h-4 shrink-0 ${lv.cls}`}>{lv.label}</Badge>
                    <p className="text-xs text-slate-600 dark:text-slate-400 flex-1 leading-relaxed">{log.msg}</p>
                    <span className="text-[10px] text-slate-400 shrink-0 tabular-nums">{log.ts}</span>
                  </div>
                );
              })}
            </div>
          </Card>
        </TabsContent>

        {/* ── Settings ── */}
        <TabsContent value="settings">
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="p-5 space-y-5">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                <Settings className="h-4 w-4 text-slate-400" /> Operação
              </h3>
              {[
                { label: "Modo de Manutenção", desc: "Desabilita acesso temporariamente para manutenção", state: maintenance, set: setMaintenance },
                { label: "Modo Debug", desc: "Ativa logs detalhados para desenvolvimento", state: debug, set: setDebug },
              ].map(({ label, desc, state, set }) => (
                <div key={label} className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
                  </div>
                  <Switch checked={state} onCheckedChange={(v) => {
                    set(v);
                    toast({ title: `${label} ${v ? "ativado" : "desativado"}` });
                  }} />
                </div>
              ))}
            </Card>
            <Card className="p-5 space-y-4">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                <Shield className="h-4 w-4 text-slate-400" /> Ações do Sistema
              </h3>
              {[
                { icon: Database, label: "Backup Manual", desc: "Gera snapshot do banco de dados" },
                { icon: RefreshCw, label: "Limpar Cache", desc: "Remove dados em cache do servidor" },
                { icon: Bug, label: "Exportar Logs", desc: "Baixa os logs das últimas 24h" },
              ].map(({ icon: Icon, label, desc }) => (
                <button key={label} onClick={() => toast({ title: `${label} iniciado…` })}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left">
                  <div className="p-1.5 rounded-md bg-slate-100 dark:bg-slate-800">
                    <Icon className="h-4 w-4 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{label}</p>
                    <p className="text-[10px] text-slate-400">{desc}</p>
                  </div>
                </button>
              ))}
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
