// @ts-nocheck
import { useState, useEffect, useCallback, useMemo } from "react";
import { useSidebar } from "@/contexts/sidebar-context";
import { apiClient } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Server, Database, HardDrive, Zap, Cpu, Activity, RefreshCw,
  AlertTriangle, XCircle, Users, Building2, FolderKanban, ClipboardList,
  Settings, Bug, Shield, Info, Link2, Link2Off, Pencil,
  Trash2, TestTube2, Globe, Lock, MessageSquare, Bot,
  CreditCard, Mail, ChevronDown, ChevronUp, EyeOff,
  AlertCircle, CheckCircle, FileText, Search,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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

function maskApiKey(key) {
  if (!key || key.length < 6) return "Não configurado";
  return key.slice(0, 4) + "••••••••••••" + key.slice(-3);
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

// ─── Conectores ───────────────────────────────────────────────────────────────

const CONNECTOR_STATUS = {
  connected:    { label: "Conectado",       cls: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400" },
  disconnected: { label: "Desconectado",    cls: "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400" },
  testing:      { label: "Em teste",        cls: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400" },
  unconfigured: { label: "Não configurado", cls: "bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800 dark:text-slate-500" },
  error:        { label: "Erro",            cls: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400" },
};

const DPA_STATUS = {
  ok:      { label: "DPA Assinado", cls: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400", icon: CheckCircle },
  pending: { label: "DPA Pendente", cls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400",           icon: AlertTriangle },
  none:    { label: "Sem DPA",      cls: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400",                     icon: XCircle },
};

const MOCK_CONNECTORS = [
  {
    id: "openai", name: "OpenAI", subtitle: "GPT-4o / Assistants API", category: "Inteligência Artificial",
    icon: Bot, iconBg: "bg-slate-900", iconColor: "text-white", status: "connected",
    apiKey: "OPENAI_KEY_PLACEHOLDER", baseUrl: "https://api.openai.com",
    legalBasis: "Interesse Legítimo", purpose: "Geração de textos, análise de dados e automação inteligente",
    retention: "90 dias", dpa: "pending", internationalTransfer: true, transferCountry: "EUA",
    connectedAt: "12/01/2026", lastActivity: "há 2 min",
    capabilities: ["Chat completions", "Embeddings", "Assistants", "Vision", "Fine-tuning"],
  },
  {
    id: "google", name: "Google Workspace", subtitle: "Gmail, Drive, Calendar", category: "Produtividade",
    icon: Mail, iconBg: "bg-blue-500", iconColor: "text-white", status: "connected",
    apiKey: "GOOGLE_KEY_PLACEHOLDER", baseUrl: "https://www.googleapis.com",
    legalBasis: "Contrato", purpose: "Envio de e-mails transacionais e sincronização de agenda",
    retention: "365 dias", dpa: "ok", internationalTransfer: false, transferCountry: "Nacional",
    connectedAt: "03/11/2025", lastActivity: "há 15 min",
    capabilities: ["Gmail API", "Drive API", "Calendar API", "OAuth 2.0"],
  },
  {
    id: "whatsapp", name: "WhatsApp Business", subtitle: "Meta Business API", category: "Comunicação",
    icon: MessageSquare, iconBg: "bg-green-500", iconColor: "text-white", status: "connected",
    apiKey: "META_TOKEN_PLACEHOLDER", baseUrl: "https://graph.facebook.com",
    legalBasis: "Contrato", purpose: "Notificações, atendimento e campanhas de comunicação",
    retention: "180 dias", dpa: "ok", internationalTransfer: true, transferCountry: "EUA",
    connectedAt: "20/03/2026", lastActivity: "há 5 min",
    capabilities: ["Mensagens de texto", "Templates HSM", "Botões interativos", "Media messages"],
  },
  {
    id: "stripe", name: "Stripe", subtitle: "Pagamentos & Assinaturas", category: "Pagamentos",
    icon: CreditCard, iconBg: "bg-indigo-600", iconColor: "text-white", status: "connected",
    apiKey: "STRIPE_KEY_PLACEHOLDER", baseUrl: "https://api.stripe.com",
    legalBasis: "Contrato", purpose: "Processamento de pagamentos e gestão de assinaturas",
    retention: "7 anos (obrigação legal)", dpa: "ok", internationalTransfer: true, transferCountry: "EUA",
    connectedAt: "15/09/2025", lastActivity: "há 1 hora",
    capabilities: ["Pagamentos únicos", "Assinaturas recorrentes", "Webhooks", "Portal do cliente"],
  },
  {
    id: "sendgrid", name: "SendGrid", subtitle: "Twilio — E-mail marketing", category: "E-mail",
    icon: Mail, iconBg: "bg-cyan-500", iconColor: "text-white", status: "disconnected",
    apiKey: "SENDGRID_KEY_PLACEHOLDER", baseUrl: "https://api.sendgrid.com",
    legalBasis: "Consentimento", purpose: "E-mails de marketing e notificações em massa",
    retention: "60 dias", dpa: "pending", internationalTransfer: true, transferCountry: "EUA",
    connectedAt: "—", lastActivity: "Nunca utilizado",
    capabilities: ["Envio em massa", "Templates dinâmicos", "Analytics de abertura", "Listas de contatos"],
  },
  {
    id: "slack", name: "Slack", subtitle: "Colaboração em equipe", category: "Colaboração",
    icon: MessageSquare, iconBg: "bg-purple-600", iconColor: "text-white", status: "testing",
    apiKey: "SLACK_TOKEN_PLACEHOLDER", baseUrl: "https://slack.com/api",
    legalBasis: "Interesse Legítimo", purpose: "Notificações internas e alertas operacionais",
    retention: "30 dias", dpa: "none", internationalTransfer: true, transferCountry: "EUA",
    connectedAt: "22/05/2026", lastActivity: "há 3 horas",
    capabilities: ["Mensagens de canal", "Webhooks de entrada", "Slash commands", "Notificações"],
  },
  {
    id: "redrive", name: "Redrive CRM", subtitle: "CRM + WhatsApp + Automações", category: "CRM / WhatsApp",
    icon: Bot, iconBg: "bg-orange-500", iconColor: "text-white", status: "connected",
    apiKey: "REDRIVE_TOKEN_PLACEHOLDER", baseUrl: "https://api.redrive.com.br",
    docsUrl: "https://api.redrive.com.br/docs/",
    legalBasis: "Contrato", purpose: "Gestão de leads, CRM, envio de mensagens WhatsApp e automação comercial",
    retention: "365 dias", dpa: "pending", internationalTransfer: false, transferCountry: "Nacional",
    connectedAt: "25/05/2026", lastActivity: "há 10 min",
    capabilities: [
      "Login / Auth", "Listar contatos (CRM)", "Criar contato", "Atualizar contato",
      "Excluir contato", "Busca por telefone", "Busca por e-mail", "Busca genérica",
      "Adicionar tags", "Remover tags", "Marcar como perdido", "Marcar como cliente",
      "Bloquear contato", "Adicionar follow-up", "Marcar como oportunidade",
      "Enviar mensagem WhatsApp", "Enviar arquivo/imagem", "Enviar vídeo",
      "Enviar áudio", "Enviar contato", "Enviar link", "Listar bots ativos",
    ],
  },
  {
    id: "bitrix24", name: "Bitrix24", subtitle: "CRM, Tarefas & Colaboração", category: "CRM / Colaboração",
    icon: Settings, iconBg: "bg-red-600", iconColor: "text-white", status: "unconfigured",
    apiKey: "", baseUrl: "", docsUrl: "https://apidocs.bitrix24.com",
    legalBasis: "—", purpose: "Gestão de negócios, leads e atividades de CRM",
    retention: "—", dpa: "none", internationalTransfer: true, transferCountry: "EUA / Europa",
    connectedAt: "—", lastActivity: "Não configurado",
    capabilities: ["Negócios (Deals)", "Contatos", "Leads", "Tarefas", "Atividades", "Pipelines", "Webhooks"],
  },
];

const MOCK_CONNECTOR_LOGS = [
  { id: 1,  ts: "25/05 12:38", connector: "Redrive CRM",       action: "conectado",         user: "admin@allka.com.br", result: "sucesso" },
  { id: 2,  ts: "25/05 12:10", connector: "OpenAI",            action: "requisição_enviada", user: "sistema",            result: "sucesso" },
  { id: 3,  ts: "25/05 11:50", connector: "WhatsApp Business", action: "mensagem_enviada",   user: "sistema",            result: "sucesso" },
  { id: 4,  ts: "25/05 11:30", connector: "Redrive CRM",       action: "tag_adicionada",     user: "admin@allka.com.br", result: "sucesso" },
  { id: 5,  ts: "25/05 10:55", connector: "OpenAI",            action: "requisição_enviada", user: "sistema",            result: "sucesso" },
  { id: 6,  ts: "25/05 10:00", connector: "SendGrid",          action: "testado",            user: "admin@allka.com.br", result: "erro — SMTP timeout" },
  { id: 7,  ts: "24/05 18:22", connector: "Stripe",            action: "webhook_recebido",   user: "sistema",            result: "sucesso" },
  { id: 8,  ts: "24/05 17:40", connector: "Slack",             action: "conectado",          user: "admin@allka.com.br", result: "sucesso" },
  { id: 9,  ts: "24/05 15:05", connector: "Google Workspace",  action: "requisição_enviada", user: "sistema",            result: "sucesso" },
  { id: 10, ts: "24/05 14:10", connector: "OpenAI",            action: "editado",            user: "admin@allka.com.br", result: "sucesso" },
  { id: 11, ts: "24/05 09:30", connector: "WhatsApp Business", action: "mensagem_enviada",   user: "sistema",            result: "sucesso" },
  { id: 12, ts: "23/05 22:00", connector: "Stripe",            action: "requisição_enviada", user: "sistema",            result: "sucesso" },
  { id: 13, ts: "23/05 14:30", connector: "SendGrid",          action: "desconectado",       user: "admin@allka.com.br", result: "sucesso" },
  { id: 14, ts: "23/05 10:00", connector: "Google Workspace",  action: "conectado",          user: "admin@allka.com.br", result: "sucesso" },
  { id: 15, ts: "22/05 16:45", connector: "Redrive CRM",       action: "requisição_enviada", user: "sistema",            result: "erro — 500 Unauthorized" },
];

const ACTION_LABELS = {
  conectado:           { label: "Conectado",     cls: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400" },
  desconectado:        { label: "Desconectado",  cls: "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400" },
  editado:             { label: "Editado",        cls: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400" },
  testado:             { label: "Testado",        cls: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-400" },
  requisição_enviada:  { label: "Requisição",     cls: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400" },
  mensagem_enviada:    { label: "Mensagem WA",    cls: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400" },
  tag_adicionada:      { label: "Tag adicionada", cls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400" },
  webhook_recebido:    { label: "Webhook",        cls: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400" },
};

// ─── ConnectorCard ────────────────────────────────────────────────────────────

function ConnectorCard({ connector, onEdit, onDisconnect, onDelete, onTest }) {
  const [expanded, setExpanded] = useState(false);
  const st = CONNECTOR_STATUS[connector.status] ?? CONNECTOR_STATUS.unconfigured;
  const dp = DPA_STATUS[connector.dpa] ?? DPA_STATUS.none;
  const DpaIcon = dp.icon;
  const Icon = connector.icon;

  return (
    <Card className="overflow-hidden">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${connector.iconBg} shrink-0`}>
            <Icon className={`h-4 w-4 ${connector.iconColor}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-none">{connector.name}</p>
              <Badge variant="outline" className={`text-[9px] font-semibold h-4 px-1.5 ${st.cls}`}>{st.label}</Badge>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">{connector.subtitle}</p>
          </div>
          <Badge variant="outline" className="text-[9px] text-slate-400 border-slate-200 shrink-0 hidden sm:flex">{connector.category}</Badge>
        </div>

        <div className="mt-3 flex items-center gap-2 p-2 rounded-md bg-slate-50 dark:bg-slate-800/50">
          <Lock className="h-3 w-3 text-slate-400 shrink-0" />
          <code className="text-[10px] text-slate-500 dark:text-slate-400 flex-1 truncate font-mono">
            {maskApiKey(connector.apiKey)}
          </code>
          {connector.baseUrl && (
            <a href={connector.baseUrl} target="_blank" rel="noreferrer"
              className="text-[10px] text-blue-500 hover:underline truncate max-w-25 hidden md:block">
              {connector.baseUrl.replace("https://", "")}
            </a>
          )}
        </div>

        <div className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-1">
          <div className="flex items-center gap-1.5">
            <DpaIcon className="h-3 w-3 shrink-0 text-slate-400" />
            <Badge variant="outline" className={`text-[9px] font-semibold h-4 px-1.5 ${dp.cls}`}>{dp.label}</Badge>
          </div>
          <div className="flex items-center gap-1.5">
            <Globe className="h-3 w-3 shrink-0 text-slate-400" />
            <span className="text-[10px] text-slate-500 dark:text-slate-400">
              {connector.internationalTransfer ? `Transfere p/ ${connector.transferCountry}` : "Nacional"}
            </span>
          </div>
          <div className="col-span-2 flex items-center gap-1.5 mt-0.5 flex-wrap">
            <span className="text-[10px] text-slate-400">Base legal:</span>
            <span className="text-[10px] font-medium text-slate-600 dark:text-slate-300">{connector.legalBasis !== "—" ? connector.legalBasis : "—"}</span>
            <span className="text-[10px] text-slate-300 dark:text-slate-600 mx-0.5">·</span>
            <span className="text-[10px] text-slate-400">Última ativ.:</span>
            <span className="text-[10px] font-medium text-slate-600 dark:text-slate-300">{connector.lastActivity}</span>
          </div>
        </div>

        {connector.capabilities?.length > 0 && (
          <button
            onClick={() => setExpanded(v => !v)}
            className="mt-2.5 flex items-center gap-1 text-[10px] text-blue-500 hover:text-blue-600 transition-colors"
          >
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {expanded ? "Ocultar capacidades" : `Ver ${connector.capabilities.length} capacidades`}
          </button>
        )}
        {expanded && (
          <div className="mt-2 flex flex-wrap gap-1">
            {connector.capabilities.map(cap => (
              <span key={cap} className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                {cap}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-slate-100 dark:border-slate-800 px-3 py-2 flex items-center gap-1 bg-slate-50/50 dark:bg-slate-800/30 flex-wrap">
        <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1 px-2" onClick={() => onEdit(connector)}>
          <Pencil className="h-3 w-3" /> Editar
        </Button>
        <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1 px-2 text-blue-500 hover:text-blue-600" onClick={() => onTest(connector)}>
          <TestTube2 className="h-3 w-3" /> Testar
        </Button>
        {connector.status !== "unconfigured" && connector.status !== "disconnected" && (
          <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1 px-2 text-amber-600 hover:text-amber-700" onClick={() => onDisconnect(connector)}>
            <Link2Off className="h-3 w-3" /> Desconectar
          </Button>
        )}
        <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1 px-2 text-red-500 hover:text-red-600 ml-auto" onClick={() => onDelete(connector)}>
          <Trash2 className="h-3 w-3" /> Excluir
        </Button>
      </div>
    </Card>
  );
}

// ─── EditConnectorModal ───────────────────────────────────────────────────────

function EditConnectorModal({ connector, open, onClose, onSave }) {
  const [form, setForm] = useState(connector ?? {});
  const [showKey, setShowKey] = useState(false);

  useEffect(() => { setForm(connector ?? {}); setShowKey(false); }, [connector]);

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-sm">Editar conector — {form.name}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-3 py-2 max-h-[60vh] overflow-y-auto pr-1">
          <div>
            <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">Nome</p>
            <Input value={form.name ?? ""} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="h-8 text-xs" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">URL Base da API</p>
            <Input value={form.baseUrl ?? ""} onChange={e => setForm(f => ({ ...f, baseUrl: e.target.value }))} placeholder="https://api.exemplo.com" className="h-8 text-xs" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">Chave de API / Token</p>
            <div className="relative">
              <Input
                type={showKey ? "text" : "password"}
                value={form.apiKey ?? ""}
                onChange={e => setForm(f => ({ ...f, apiKey: e.target.value }))}
                placeholder="Cole a chave aqui"
                className="h-8 text-xs pr-8"
              />
              <button type="button" onClick={() => setShowKey(v => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <EyeOff className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
              <AlertCircle className="h-3 w-3 shrink-0" />
              Em produção, esta chave fica no .env do backend — nunca exposta ao navegador.
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">Finalidade do tratamento</p>
            <Input value={form.purpose ?? ""} onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))} className="h-8 text-xs" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">Base legal (LGPD Art. 7)</p>
            <Select value={form.legalBasis ?? ""} onValueChange={v => setForm(f => ({ ...f, legalBasis: v }))}>
              <SelectTrigger size="sm" className="h-8 text-xs w-full">
                <SelectValue placeholder="Selecionar..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Consentimento">Consentimento</SelectItem>
                <SelectItem value="Contrato">Execução de contrato</SelectItem>
                <SelectItem value="Obrigação Legal">Obrigação legal</SelectItem>
                <SelectItem value="Interesse Legítimo">Interesse legítimo</SelectItem>
                <SelectItem value="Proteção da vida">Proteção da vida</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">Prazo de retenção dos dados</p>
            <Input value={form.retention ?? ""} onChange={e => setForm(f => ({ ...f, retention: e.target.value }))} placeholder="ex: 90 dias" className="h-8 text-xs" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">DPA assinado</p>
            <Select value={form.dpa ?? ""} onValueChange={v => setForm(f => ({ ...f, dpa: v }))}>
              <SelectTrigger size="sm" className="h-8 text-xs w-full">
                <SelectValue placeholder="Selecionar..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ok">✅ DPA assinado</SelectItem>
                <SelectItem value="pending">⚠️ Pendente</SelectItem>
                <SelectItem value="none">❌ Sem DPA</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">País / Região de destino</p>
            <Input value={form.transferCountry ?? ""} onChange={e => setForm(f => ({ ...f, transferCountry: e.target.value }))} placeholder="ex: EUA, Europa, Nacional..." className="h-8 text-xs" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>Cancelar</Button>
          <Button size="sm" className="h-8 text-xs" onClick={() => { onSave(form); onClose(); }}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── LgpdPanel ────────────────────────────────────────────────────────────────

function LgpdPanel({ connectors }) {
  const total = connectors.length;
  const withDpa = connectors.filter(c => c.dpa === "ok").length;
  const withLegal = connectors.filter(c => c.legalBasis && c.legalBasis !== "—").length;
  const withPurpose = connectors.filter(c => c.purpose && c.purpose !== "—").length;
  const internationalOk = connectors.filter(c => c.internationalTransfer && c.dpa === "ok").length;
  const internationalTotal = connectors.filter(c => c.internationalTransfer).length;
  const overallScore = total > 0 ? Math.round(((withDpa + withLegal + withPurpose) / (total * 3)) * 100) : 0;

  const checks = [
    { label: "Base legal documentada (Art. 7)",              ok: withLegal,       total,                   icon: FileText },
    { label: "Finalidade registrada (Art. 9)",               ok: withPurpose,     total,                   icon: FileText },
    { label: "DPA com operadores (Art. 39)",                 ok: withDpa,         total,                   icon: Lock },
    { label: "Garantias transf. internacional (Art. 33/34)", ok: internationalOk, total: internationalTotal, icon: Globe },
  ];

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
            <Shield className="h-4 w-4 text-slate-400" /> Conformidade Geral LGPD
          </h4>
          <Badge variant="outline" className={`text-[10px] font-bold ${
            overallScore >= 80 ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400"
            : overallScore >= 50 ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400"
            : "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400"
          }`}>{overallScore}%</Badge>
        </div>
        <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2.5">
          <div className={`h-2.5 rounded-full transition-all duration-700 ${
            overallScore >= 80 ? "bg-emerald-500" : overallScore >= 50 ? "bg-amber-500" : "bg-red-500"
          }`} style={{ width: `${overallScore}%` }} />
        </div>
        <p className="text-[10px] text-slate-400 mt-1.5">
          Calculado com base em: base legal, finalidade e DPA dos {total} conectores.
        </p>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {checks.map(({ label, ok, total: t, icon: Icon }) => {
          const pct = t > 0 ? Math.round((ok / t) * 100) : 0;
          return (
            <Card key={label} className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <Icon className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <p className="text-[11px] font-medium text-slate-600 dark:text-slate-300 leading-tight">{label}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-1.5">
                  <div className={`h-1.5 rounded-full ${pct === 100 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                    style={{ width: `${pct}%` }} />
                </div>
                <span className="text-[10px] tabular-nums text-slate-500">{ok}/{t}</span>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="p-4 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-blue-700 dark:text-blue-400 mb-2">Checklist para Conecta Sebrae</p>
            <p className="text-[11px] text-blue-600 dark:text-blue-400 mb-3">
              Para participar do programa Conecta Sebrae e projetos governamentais, os seguintes requisitos LGPD são exigidos:
            </p>
            {[
              { done: true,  text: "Registro de operações de tratamento (Art. 37)" },
              { done: true,  text: "Política de privacidade publicada e versionada" },
              { done: true,  text: "Banner de cookies com consentimento granular" },
              { done: false, text: "DPO designado formalmente (Art. 41) — pendente" },
              { done: false, text: "DPA assinado com Redrive CRM — pendente" },
              { done: false, text: "DPA assinado com SendGrid — pendente" },
              { done: false, text: "DPA assinado com Slack — pendente" },
              { done: false, text: "Mapa de dados (Data Inventory) atualizado" },
              { done: false, text: "RIPD — Relatório de Impacto à Proteção de Dados — pendente" },
              { done: false, text: "Procedimento de notificação de incidentes à ANPD (≤2 dias úteis)" },
            ].map(({ done, text }) => (
              <div key={text} className="flex items-center gap-1.5 mb-1">
                {done
                  ? <CheckCircle className="h-3 w-3 text-emerald-500 shrink-0" />
                  : <AlertCircle className="h-3 w-3 text-amber-500 shrink-0" />}
                <span className={`text-[11px] ${done ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"}`}>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <p className="text-[10px] text-slate-400 italic">
        * Baseado na Lei nº 13.709/2018 (LGPD) e diretrizes da ANPD. Consulte seu DPO para conformidade completa.
        Registro mock — futuramente integrar com base real de operações de tratamento.
      </p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminSistemaPage() {
  useSidebar();
  const { toast } = useToast();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [perf, setPerf] = useState({ cpu: 18, mem: 44, disk: 27, rt: 142 });
  const [maintenance, setMaintenance] = useState(false);
  const [debug, setDebug] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [connectors, setConnectors] = useState(MOCK_CONNECTORS);
  const [editTarget, setEditTarget] = useState(null);
  const [disconnectTarget, setDisconnectTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [logFilterConnector, setLogFilterConnector] = useState("all");
  const [logFilterAction, setLogFilterAction] = useState("all");
  const [connectorSearch, setConnectorSearch] = useState("");
  const [connectorFilter, setConnectorFilter] = useState("all");
  const [logLevelFilter, setLogLevelFilter] = useState("all");

  const load = useCallback(async () => {
    try {
      const s = await apiClient.getDashboardStats();
      setStats(s);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

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

  function handleSaveConnector(updated) {
    setConnectors(cs => cs.map(c => c.id === updated.id ? { ...c, ...updated } : c));
    toast({ title: "Conector atualizado" });
  }

  function handleDisconnect() {
    if (!disconnectTarget) return;
    setConnectors(cs => cs.map(c => c.id === disconnectTarget.id ? { ...c, status: "disconnected" } : c));
    toast({ title: `${disconnectTarget.name} desconectado` });
    setDisconnectTarget(null);
  }

  function handleDelete() {
    if (!deleteTarget) return;
    setConnectors(cs => cs.filter(c => c.id !== deleteTarget.id));
    toast({ title: `${deleteTarget.name} excluído` });
    setDeleteTarget(null);
  }

  function handleTest(connector) {
    toast({ title: `Testando ${connector.name}…`, description: "Verificando conectividade com a API." });
    setTimeout(() => {
      toast({
        title: connector.name,
        description: connector.status === "unconfigured"
          ? "Configure a chave de API primeiro."
          : "Conexão bem-sucedida ✅",
      });
    }, 1500);
  }

  const filteredLogs = MOCK_CONNECTOR_LOGS.filter(l => {
    const matchC = logFilterConnector === "all" || l.connector === logFilterConnector;
    const matchA = logFilterAction === "all" || l.action === logFilterAction;
    return matchC && matchA;
  });

  const filteredConnectors = useMemo(() => {
    let arr = connectors;
    if (connectorFilter !== "all") arr = arr.filter(c => c.status === connectorFilter);
    if (connectorSearch.trim()) {
      const q = connectorSearch.toLowerCase();
      arr = arr.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        c.subtitle.toLowerCase().includes(q)
      );
    }
    return arr;
  }, [connectors, connectorFilter, connectorSearch]);

  const filteredSysLogs = useMemo(() => {
    if (logLevelFilter === "all") return MOCK_LOGS;
    return MOCK_LOGS.filter(l => l.level === logLevelFilter);
  }, [logLevelFilter]);

  const connectorNames = [...new Set(MOCK_CONNECTOR_LOGS.map(l => l.connector))];
  const actionKeys = [...new Set(MOCK_CONNECTOR_LOGS.map(l => l.action))];

  const services = MOCK_SERVICES;
  const operationalCount = services.filter(s => s.status === "operational").length;
  const overallOk = operationalCount === services.length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sistema"
        description="Monitoramento, conectores e configurações da infraestrutura"
        actions={<>
          <TooltipProvider delayDuration={400}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={refreshMetrics}
                  disabled={refreshing}
                  className="group relative flex items-center justify-center h-8 w-8 rounded-lg border border-border/60 hover:border-transparent overflow-hidden transition-all disabled:opacity-50"
                >
                  <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ background: "linear-gradient(135deg,#000000 0%,#1a2a6f 45%,#c81a7f 100%)" }} />
                  <RefreshCw className={`relative z-10 h-4 w-4 text-[#7d1b6a] group-hover:text-white transition-colors ${refreshing ? "animate-spin" : ""}`} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={6}>Atualizar</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </>}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Status Geral",    value: overallOk ? "Operacional" : "Atenção", icon: Server,       color: overallOk ? "text-emerald-500" : "text-amber-500",  bg: overallOk ? "bg-emerald-50 dark:bg-emerald-950/30" : "bg-amber-50 dark:bg-amber-950/30" },
          { label: "Nômades",         value: loading ? "…" : (stats?.nomades?.total ?? "—"),   icon: Users,        color: "text-blue-500",   bg: "bg-blue-50 dark:bg-blue-950/30" },
          { label: "Empresas",        value: loading ? "…" : (stats?.companies?.total ?? "—"), icon: Building2,    color: "text-violet-500", bg: "bg-violet-50 dark:bg-violet-950/30" },
          { label: "Projetos Ativos", value: loading ? "…" : (stats?.projects?.active ?? "—"), icon: FolderKanban, color: "text-pink-500",   bg: "bg-pink-50 dark:bg-pink-950/30" },
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
          <TabsTrigger value="conectores"  className="text-xs px-3">Conectores</TabsTrigger>
          <TabsTrigger value="settings"    className="text-xs px-3">Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: Cpu,       label: "CPU",     value: perf.cpu,  thresholds: [60, 80] },
              { icon: Activity,  label: "Memória", value: perf.mem,  thresholds: [70, 85] },
              { icon: HardDrive, label: "Disco",   value: perf.disk, thresholds: [70, 85] },
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
              <Badge variant="outline" className="ml-auto text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400">Normal</Badge>
            </div>
            <p className="text-3xl font-bold text-slate-800 dark:text-slate-100 tabular-nums">{perf.rt}<span className="text-sm text-slate-400 ml-1">ms</span></p>
            <p className="text-xs text-slate-400 mt-1">Média dos últimos 5 min</p>
          </Card>
          <p className="text-xs text-slate-400 italic">* Métricas simuladas. Integração com endpoint real de telemetria pendente.</p>
        </TabsContent>

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
                <div key={i} className={`px-4 py-3.5 flex items-center gap-3 ${i % 2 === 0 ? "bg-table-row" : "bg-table-row-alt"} hover:bg-table-row-hover transition-colors`}>
                  <ServiceDot status={svc.status} />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200 flex-1">{svc.name}</span>
                  <span className="text-xs text-slate-400 hidden sm:block">Reiniciado {svc.restart}</span>
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 tabular-nums w-14 text-right">{svc.uptime}</span>
                  <Badge variant="outline" className={`text-[10px] font-semibold w-24 justify-center ${
                    svc.status === "operational" ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400"
                    : svc.status === "degraded"  ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400"
                    : "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400"
                  }`}>
                    {svc.status === "operational" ? "Operacional" : svc.status === "degraded" ? "Degradado" : "Offline"}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card className="border border-slate-200/70 dark:border-slate-700/60 shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-200/70 dark:border-slate-700/60 bg-slate-50/60 dark:bg-slate-900/30 flex-wrap">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mr-auto">Logs do Sistema</h3>
              <span className="text-xs text-slate-400 whitespace-nowrap shrink-0">
                {filteredSysLogs.length} de{" "}
                <span className="font-semibold text-slate-600 dark:text-slate-300">{MOCK_LOGS.length}</span>
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                {[
                  { key: "all",     label: "Todos" },
                  { key: "info",    label: "Info",  dot: "#3b82f6" },
                  { key: "warning", label: "Aviso", dot: "#f59e0b" },
                  { key: "error",   label: "Erro",  dot: "#ef4444" },
                ].map(({ key, label, dot }) => {
                  const active = logLevelFilter === key;
                  return (
                    <button key={key} onClick={() => setLogLevelFilter(key)}
                      style={active && dot ? { background: dot, border: `2px solid ${dot}`, color: "#fff", boxShadow: `0 2px 10px ${dot}55` } : {}}
                      className={`h-8 px-3 rounded-lg text-xs font-semibold border-2 transition-all flex items-center gap-1.5 ${
                        active && !dot
                          ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-transparent shadow"
                          : active ? ""
                          : "bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-600 hover:border-slate-400"
                      }`}>
                      {dot && <span style={{ width:8, height:8, borderRadius:"50%", display:"inline-block", background: active ? "rgba(255,255,255,0.7)" : dot, flexShrink:0 }} />}
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredSysLogs.map((log, i) => {
                const lv = LOG_LEVELS[log.level] || LOG_LEVELS.info;
                const Ico = log.level === "error" ? XCircle : log.level === "warning" ? AlertTriangle : Info;
                return (
                  <div key={log.id} className={`px-4 py-3 flex items-start gap-3 ${i % 2 === 0 ? "bg-table-row" : "bg-table-row-alt"}`}>
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

        <TabsContent value="conectores" className="space-y-6">
          <Card className="border border-slate-200/70 dark:border-slate-700/60 shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-200/70 dark:border-slate-700/60 bg-slate-50/60 dark:bg-slate-900/30 flex-wrap">
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input placeholder="Buscar conector…" className="pl-9 h-9 text-sm w-full"
                  value={connectorSearch} onChange={e => setConnectorSearch(e.target.value)} />
              </div>
              <span className="text-xs text-slate-400 whitespace-nowrap shrink-0">
                {filteredConnectors.length} de{" "}
                <span className="font-semibold text-slate-600 dark:text-slate-300">{connectors.length}</span>{" "}
                conector{connectors.length !== 1 ? "es" : ""}
              </span>
              <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                {[
                  { key: "all",          label: "Todos" },
                  { key: "connected",    label: "Conectado",    dot: "#10b981" },
                  { key: "testing",      label: "Em teste",     dot: "#3b82f6" },
                  { key: "disconnected", label: "Desconectado", dot: "#94a3b8" },
                  { key: "unconfigured", label: "Não config.",  dot: "#64748b" },
                ].map(({ key, label, dot }) => {
                  const active = connectorFilter === key;
                  return (
                    <button key={key} onClick={() => setConnectorFilter(key)}
                      style={active && dot ? { background: dot, border: `2px solid ${dot}`, color: "#fff", boxShadow: `0 2px 10px ${dot}55` } : {}}
                      className={`h-8 px-3 rounded-lg text-xs font-semibold border-2 transition-all flex items-center gap-1.5 ${
                        active && !dot
                          ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-transparent shadow"
                          : active ? ""
                          : "bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-600 hover:border-slate-400"
                      }`}>
                      {dot && <span style={{ width:8, height:8, borderRadius:"50%", display:"inline-block", background: active ? "rgba(255,255,255,0.7)" : dot, flexShrink:0 }} />}
                      {label}
                      {key !== "all" && <span style={{ fontSize:"9px", opacity:0.8, marginLeft:1 }}>{connectors.filter(c => c.status === key).length}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="p-4">
              {filteredConnectors.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-8">Nenhum conector encontrado.</p>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredConnectors.map(c => (
                  <ConnectorCard
                    key={c.id}
                    connector={c}
                    onEdit={setEditTarget}
                    onDisconnect={setDisconnectTarget}
                    onDelete={setDeleteTarget}
                    onTest={handleTest}
                  />
                ))}
              </div>
            </div>
            <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-4 bg-slate-50/40 dark:bg-slate-900/20 flex-wrap">
              <span className="flex items-center gap-1 text-[10px] text-slate-400"><span style={{ width:8, height:8, borderRadius:"50%", display:"inline-block", background:"#10b981" }} />{connectors.filter(c=>c.status==="connected").length} Conectados</span>
              <span className="flex items-center gap-1 text-[10px] text-slate-400"><span style={{ width:8, height:8, borderRadius:"50%", display:"inline-block", background:"#3b82f6" }} />{connectors.filter(c=>c.status==="testing").length} Em teste</span>
              <span className="flex items-center gap-1 text-[10px] text-slate-400"><span style={{ width:8, height:8, borderRadius:"50%", display:"inline-block", background:"#94a3b8" }} />{connectors.filter(c=>c.status==="disconnected").length} Desconectados</span>
              <span className="flex items-center gap-1 text-[10px] text-slate-400"><span style={{ width:8, height:8, borderRadius:"50%", display:"inline-block", background:"#f59e0b" }} />{connectors.filter(c=>c.dpa!=="ok").length} DPA pendente</span>
            </div>
          </Card>

          <div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-slate-400" /> Registro de atividade
            </h3>
            <Card className="border border-slate-200/70 dark:border-slate-700/60 shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-200/70 dark:border-slate-700/60 bg-slate-50/60 dark:bg-slate-900/30 flex-wrap">
                <span className="text-xs text-slate-400 whitespace-nowrap">
                  {filteredLogs.length} de{" "}
                  <span className="font-semibold text-slate-600 dark:text-slate-300">{MOCK_CONNECTOR_LOGS.length}</span>{" "}registros
                </span>
                <div className="flex items-center gap-2 ml-auto">
                  <Select value={logFilterConnector} onValueChange={setLogFilterConnector}>
                    <SelectTrigger size="sm" className="h-7 text-xs w-40">
                      <SelectValue placeholder="Conector..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos conectores</SelectItem>
                      {connectorNames.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={logFilterAction} onValueChange={setLogFilterAction}>
                    <SelectTrigger size="sm" className="h-7 text-xs w-36">
                      <SelectValue placeholder="Ação..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas ações</SelectItem>
                      {actionKeys.map(a => <SelectItem key={a} value={a}>{ACTION_LABELS[a]?.label ?? a}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredLogs.length === 0 && (
                  <p className="px-4 py-6 text-xs text-slate-400 text-center">Nenhum registro encontrado.</p>
                )}
                {filteredLogs.map((log, i) => {
                  const act = ACTION_LABELS[log.action];
                  const isError = log.result.startsWith("erro");
                  return (
                    <div key={log.id} className={`px-4 py-2.5 flex items-center gap-3 text-xs ${i % 2 === 0 ? "bg-table-row" : "bg-table-row-alt"}`}>
                      <span className="text-[10px] text-slate-400 shrink-0 tabular-nums w-24">{log.ts}</span>
                      <span className="font-medium text-slate-700 dark:text-slate-200 w-36 shrink-0 truncate">{log.connector}</span>
                      {act && (
                        <Badge variant="outline" className={`text-[9px] font-semibold h-4 px-1.5 shrink-0 ${act.cls}`}>{act.label}</Badge>
                      )}
                      <span className="text-slate-400 flex-1 truncate hidden sm:block">{log.user}</span>
                      <span className={`text-[10px] shrink-0 ${isError ? "text-red-500" : "text-emerald-600 dark:text-emerald-400"}`}>
                        {isError ? log.result : "✓ sucesso"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>
            <p className="text-[10px] text-slate-400 italic mt-1.5">
              * Registro mock. Em produção, logs são persistidos no banco — obrigatório para conformidade LGPD (Art. 37).
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
              <Shield className="h-4 w-4 text-slate-400" /> Conformidade LGPD
            </h3>
            <LgpdPanel connectors={connectors} />
          </div>
        </TabsContent>

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
                { icon: Database,  label: "Backup Manual", desc: "Gera snapshot do banco de dados" },
                { icon: RefreshCw, label: "Limpar Cache",  desc: "Remove dados em cache do servidor" },
                { icon: Bug,       label: "Exportar Logs", desc: "Baixa os logs das últimas 24h" },
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

      <EditConnectorModal
        connector={editTarget}
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        onSave={handleSaveConnector}
      />

      <AlertDialog open={!!disconnectTarget} onOpenChange={v => { if (!v) setDisconnectTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm">Desconectar {disconnectTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              A integração será pausada. Os dados do conector permanecem salvos e você poderá reconectar a qualquer momento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-8 text-xs">Cancelar</AlertDialogCancel>
            <AlertDialogAction className="h-8 text-xs bg-amber-600 hover:bg-amber-700" onClick={handleDisconnect}>
              Desconectar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={v => { if (!v) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm">Excluir conector {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Esta ação é irreversível. A configuração, chave de API e histórico de logs serão permanentemente removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-8 text-xs">Cancelar</AlertDialogCancel>
            <AlertDialogAction className="h-8 text-xs bg-red-600 hover:bg-red-700" onClick={handleDelete}>
              Excluir permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
