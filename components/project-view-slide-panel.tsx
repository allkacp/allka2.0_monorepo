// @ts-nocheck
import { useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ModalBrandHeader } from "@/components/ui/modal-brand-header";
import { useSidebar } from "@/contexts/sidebar-context";
import {
  X,
  Edit,
  Copy,
  FileText,
  Ban,
  FolderOpen,
  Building2,
  Users,
  Calendar,
  Clock,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Pause,
  Play,
  BarChart3,
  User,
  Mail,
  Hash,
  Link2,
  Activity,
  Briefcase,
  Package,
} from "lucide-react";

interface ProjectViewSlidePanelProps {
  open: boolean;
  project: any | null;
  onClose: () => void;
  onEdit: () => void;
  onClone: () => void;
  onExport: () => void;
  onCancel: () => void;
}

function getStatusBadge(status: string) {
  const map: Record<string, { label: string; cls: string }> = {
    active: { label: "Ativo", cls: "bg-emerald-500 text-white" },
    "in-progress": { label: "Em Andamento", cls: "bg-blue-500 text-white" },
    "awaiting-payment": {
      label: "Aguardando Pgto",
      cls: "bg-amber-400 text-amber-900",
    },
    paused: { label: "Pausado", cls: "bg-slate-400 text-white" },
    cancelled: { label: "Cancelado", cls: "bg-red-500 text-white" },
    completed: { label: "Concluído", cls: "bg-teal-500 text-white" },
    planning: { label: "Planejamento", cls: "bg-violet-500 text-white" },
    overdue: { label: "Atrasado", cls: "bg-red-400 text-white" },
  };
  const entry = map[status] ?? {
    label: status,
    cls: "bg-slate-300 text-slate-700",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${entry.cls}`}
    >
      {entry.label}
    </span>
  );
}

function InfoCell({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: any;
  mono?: boolean;
}) {
  return (
    <div className="bg-slate-100/70 rounded-lg px-2.5 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
        {label}
      </p>
      <p
        className={`text-sm font-semibold text-slate-800 ${mono ? "font-mono" : ""}`}
      >
        {value || "—"}
      </p>
    </div>
  );
}

export function ProjectViewSlidePanel({
  open,
  project,
  onClose,
  onEdit,
  onClone,
  onExport,
  onCancel,
}: ProjectViewSlidePanelProps) {
  const { sidebarWidth } = useSidebar();
  const [activeTab, setActiveTab] = useState("visao-geral");

  if (!project) return null;

  const spent = project.spent ?? 0;
  const budget = project.budget ?? project.value ?? 0;
  const progress = project.progress ?? 0;
  const remaining = budget - spent;
  const spentPct = budget > 0 ? Math.round((spent / budget) * 100) : 0;

  const fmtBRL = (v: number) =>
    v?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) ?? "—";

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <SheetContent
        side="right"
        hideOverlay={true}
        className="p-0 flex flex-col gap-0 !w-auto !max-w-none"
        style={{
          left: `${sidebarWidth}px`,
          width: `calc(100vw - ${sidebarWidth}px)`,
          maxWidth: `calc(100vw - ${sidebarWidth}px)`,
        }}
      >
        <div className="relative flex flex-col h-full overflow-hidden">
          <ModalBrandHeader
            left={
              <div className="flex items-center gap-4 flex-1 min-w-0">
                {/* Icon */}
                <div className="h-16 w-16 rounded-xl bg-white/15 border-2 border-white/30 flex items-center justify-center flex-shrink-0">
                  <FolderOpen className="h-8 w-8 text-white/80" />
                </div>
                {/* Names */}
                <div className="flex-1 min-w-0">
                  <h2 className="text-white font-bold text-lg truncate">
                    {project.name}
                  </h2>
                  <p className="text-blue-200 text-xs mt-0.5 truncate">
                    {project.client}{" "}
                    {project.agency ? `· ${project.agency}` : ""}
                  </p>
                  <p className="text-blue-300 text-[11px] mt-0.5">
                    {project.type ?? "Projeto"}
                  </p>
                </div>
              </div>
            }
            right={
              <div className="flex items-center gap-2 flex-shrink-0">
                {getStatusBadge(project.status)}

                {/* Action buttons */}
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-white/20 border border-white/20 h-8 px-3 text-xs gap-1.5"
                  onClick={onEdit}
                >
                  <Edit className="h-3.5 w-3.5" />
                  Editar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-white/20 border border-white/20 h-8 px-3 text-xs gap-1.5"
                  onClick={onClone}
                >
                  <Copy className="h-3.5 w-3.5" />
                  Clonar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-white/20 border border-white/20 h-8 px-3 text-xs gap-1.5"
                  onClick={onExport}
                >
                  <FileText className="h-3.5 w-3.5" />
                  Exportar
                </Button>
                {project.status !== "cancelled" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-300 hover:bg-red-500/20 border border-red-300/30 h-8 px-3 text-xs gap-1.5"
                    onClick={onCancel}
                  >
                    <Ban className="h-3.5 w-3.5" />
                    Cancelar
                  </Button>
                )}
              </div>
            }
          />

          {/* Content */}
          <div className="flex-1 flex flex-col bg-white dark:bg-background overflow-hidden">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="flex-1 flex flex-col min-h-0"
            >
              {/* Tab bar */}
              <div className="flex-shrink-0 bg-white dark:bg-background px-[50px] pt-0 pb-[10px] overflow-x-auto">
                <TabsList className="grid w-max grid-cols-7 gap-1 bg-transparent p-0 h-auto">
                  {[
                    { value: "visao-geral", label: "Visão Geral" },
                    { value: "tarefas", label: "Tarefas" },
                    { value: "produtos", label: "Produtos" },
                    { value: "financeiro", label: "Financeiro" },
                    { value: "equipe", label: "Equipe" },
                    { value: "nomades", label: "Nômades" },
                    { value: "logs", label: "Logs" },
                  ].map(({ value, label }) => (
                    <TabsTrigger
                      key={value}
                      value={value}
                      className="px-4 py-2 text-xs font-medium rounded-lg border border-transparent data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 data-[state=active]:border-blue-300 hover:bg-slate-100"
                    >
                      {label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              {/* ── VISÃO GERAL ── */}
              <TabsContent
                value="visao-geral"
                className="flex-1 overflow-y-auto bg-slate-200 mt-0"
              >
                <div className="px-[50px] py-[30px] pb-[80px] space-y-4">
                  {/* KPIs */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 border border-blue-200">
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                        Progresso
                      </p>
                      <div className="text-2xl font-bold text-slate-900 mt-1">
                        {progress}%
                      </div>
                      <div className="mt-2 h-1.5 rounded-full bg-blue-200">
                        <div
                          className="h-1.5 rounded-full bg-blue-600 transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg p-3 border border-emerald-200">
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                        Orçamento
                      </p>
                      <div className="text-xl font-bold text-slate-900 mt-1">
                        {fmtBRL(budget)}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Total contratado
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-violet-50 to-violet-100 rounded-lg p-3 border border-violet-200">
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                        Gasto
                      </p>
                      <div className="text-xl font-bold text-slate-900 mt-1">
                        {fmtBRL(spent)}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {spentPct}% do orçamento
                      </div>
                    </div>
                  </div>

                  {/* Info grid */}
                  <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <Briefcase className="h-4 w-4 text-blue-600" />
                      <h3 className="text-sm font-semibold text-slate-800">
                        Informações do Projeto
                      </h3>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <InfoCell label="Cliente" value={project.client} />
                      <InfoCell
                        label="CNPJ Cliente"
                        value={project.clientCNPJ}
                        mono
                      />
                      <InfoCell label="Agência" value={project.agency} />
                      <InfoCell label="Consultor" value={project.consultant} />
                      <InfoCell label="Tipo" value={project.type} />
                      <InfoCell label="Status" value={""} />
                    </div>
                    {/* Status row replacement */}
                    <div className="mt-2 bg-slate-100/70 rounded-lg px-2.5 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                        Status
                      </p>
                      {getStatusBadge(project.status)}
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <Calendar className="h-4 w-4 text-amber-500" />
                      <h3 className="text-sm font-semibold text-slate-800">
                        Datas
                      </h3>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <InfoCell
                        label="Criação"
                        value={project.createdDate ?? project.created_at}
                      />
                      <InfoCell label="Início" value={project.startDate} />
                      <InfoCell label="Prazo" value={project.deadline} />
                    </div>
                  </div>

                  {/* More Info */}
                  <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <Activity className="h-4 w-4 text-violet-500" />
                      <h3 className="text-sm font-semibold text-slate-800">
                        Configurações
                      </h3>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-slate-100/70 rounded-lg px-2.5 py-2 flex items-center justify-between">
                        <p className="text-xs text-slate-600 font-medium">
                          Sync Bitrix
                        </p>
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${project.bitrixSync ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"}`}
                        >
                          {project.bitrixSync ? "Ativo" : "Inativo"}
                        </span>
                      </div>
                      <div className="bg-slate-100/70 rounded-lg px-2.5 py-2 flex items-center justify-between">
                        <p className="text-xs text-slate-600 font-medium">
                          Portfólio
                        </p>
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${project.portfolioPermission ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"}`}
                        >
                          {project.portfolioPermission
                            ? "Permitido"
                            : "Não permitido"}
                        </span>
                      </div>
                      <div className="bg-slate-100/70 rounded-lg px-2.5 py-2 flex items-center justify-between">
                        <p className="text-xs text-slate-600 font-medium">
                          Origem Lead
                        </p>
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${project.fromLead ? "bg-blue-100 text-blue-700" : "bg-slate-200 text-slate-500"}`}
                        >
                          {project.fromLead ? "Sim" : "Não"}
                        </span>
                      </div>
                      <div className="bg-slate-100/70 rounded-lg px-2.5 py-2 flex items-center justify-between">
                        <p className="text-xs text-slate-600 font-medium">
                          Atrasado
                        </p>
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${project.overdue ? "bg-red-100 text-red-700" : "bg-slate-200 text-slate-500"}`}
                        >
                          {project.overdue ? "Sim" : "Não"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Email Consultor */}
                  {project.consultantEmail && (
                    <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                      <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-slate-400" />
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            E-mail Consultor
                          </p>
                          <p className="text-sm font-semibold text-blue-600">
                            {project.consultantEmail}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* ── TAREFAS ── */}
              <TabsContent
                value="tarefas"
                className="flex-1 overflow-y-auto bg-slate-200 mt-0"
              >
                <div className="px-[50px] py-[30px] pb-[80px] space-y-4">
                  <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle2 className="h-4 w-4 text-blue-600" />
                      <h3 className="text-sm font-semibold text-slate-800">
                        Tarefas do Projeto
                      </h3>
                    </div>
                    <div className="text-center py-10">
                      <CheckCircle2 className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                      <p className="text-sm font-medium text-slate-500">
                        Nenhuma tarefa cadastrada ainda
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        As tarefas deste projeto aparecerão aqui.
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* ── PRODUTOS ── */}
              <TabsContent
                value="produtos"
                className="flex-1 overflow-y-auto bg-slate-200 mt-0"
              >
                <div className="px-[50px] py-[30px] pb-[80px] space-y-4">
                  <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <Package className="h-4 w-4 text-blue-600" />
                      <h3 className="text-sm font-semibold text-slate-800">
                        Produtos Contratados
                      </h3>
                      {project.products && project.products.length > 0 && (
                        <span className="ml-auto text-xs text-slate-400">
                          {project.products.length} produto
                          {project.products.length !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                    {project.products && project.products.length > 0 ? (
                      <>
                        <div className="space-y-2">
                          {project.products.map((prod: any, i: number) => {
                            const total =
                              (prod.price ?? prod.value ?? 0) *
                              (prod.quantity ?? 1);
                            return (
                              <div
                                key={prod.id ?? i}
                                className="flex items-center gap-3 py-2.5 px-3 rounded-lg border border-slate-100 bg-slate-50 hover:bg-blue-50/50 hover:border-blue-200 transition-colors"
                              >
                                <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                                  <Package className="h-4 w-4 text-blue-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-slate-800 truncate">
                                    {prod.name}
                                  </p>
                                  <p className="text-xs text-slate-400 capitalize">
                                    {prod.category}
                                  </p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <p className="text-sm font-bold text-slate-900">
                                    {total.toLocaleString("pt-BR", {
                                      style: "currency",
                                      currency: "BRL",
                                    })}
                                  </p>
                                  <p className="text-[10px] text-slate-400">
                                    {(
                                      prod.price ??
                                      prod.value ??
                                      0
                                    ).toLocaleString("pt-BR", {
                                      style: "currency",
                                      currency: "BRL",
                                    })}{" "}
                                    × {prod.quantity ?? 1}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
                          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                            Total contratado
                          </span>
                          <span className="text-base font-bold text-slate-900">
                            {project.products
                              .reduce(
                                (sum: number, p: any) =>
                                  sum +
                                  (p.price ?? p.value ?? 0) * (p.quantity ?? 1),
                                0,
                              )
                              .toLocaleString("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              })}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-10">
                        <Package className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                        <p className="text-sm font-medium text-slate-500">
                          Nenhum produto vinculado
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          Os produtos contratados neste projeto aparecerão aqui.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* ── FINANCEIRO ── */}
              <TabsContent
                value="financeiro"
                className="flex-1 overflow-y-auto bg-slate-200 mt-0"
              >
                <div className="px-[50px] py-[30px] pb-[80px] space-y-4">
                  {/* Budget breakdown */}
                  <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <DollarSign className="h-4 w-4 text-emerald-600" />
                      <h3 className="text-sm font-semibold text-slate-800">
                        Resumo Financeiro
                      </h3>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-slate-100">
                        <span className="text-sm text-slate-600">
                          Orçamento Total
                        </span>
                        <span className="text-sm font-bold text-slate-900">
                          {fmtBRL(budget)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-slate-100">
                        <span className="text-sm text-slate-600">Gasto</span>
                        <span className="text-sm font-bold text-red-600">
                          {fmtBRL(spent)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-slate-100">
                        <span className="text-sm text-slate-600">Restante</span>
                        <span
                          className={`text-sm font-bold ${remaining >= 0 ? "text-emerald-600" : "text-red-600"}`}
                        >
                          {fmtBRL(remaining)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-sm text-slate-600">
                          % Utilizado
                        </span>
                        <span className="text-sm font-bold text-slate-900">
                          {spentPct}%
                        </span>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="mt-3">
                      <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                        <span>Orçamento utilizado</span>
                        <span>{spentPct}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100">
                        <div
                          className={`h-2 rounded-full transition-all ${spentPct > 90 ? "bg-red-500" : spentPct > 70 ? "bg-amber-400" : "bg-emerald-500"}`}
                          style={{ width: `${Math.min(spentPct, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Checkout links */}
                  {project.checkoutLinks &&
                    project.checkoutLinks.length > 0 && (
                      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-2 mb-3">
                          <Link2 className="h-4 w-4 text-blue-500" />
                          <h3 className="text-sm font-semibold text-slate-800">
                            Links de Checkout
                          </h3>
                        </div>
                        <div className="space-y-2">
                          {project.checkoutLinks.map((link: any, i: number) => (
                            <a
                              key={i}
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-xs font-medium hover:underline"
                            >
                              <Link2 className="h-3 w-3 flex-shrink-0" />
                              {link.label || link.url}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                  {(!project.checkoutLinks ||
                    project.checkoutLinks.length === 0) && (
                    <div className="bg-white rounded-xl p-4 border border-dashed border-slate-200 text-center">
                      <Link2 className="h-6 w-6 text-slate-300 mx-auto mb-1" />
                      <p className="text-xs text-slate-400">
                        Nenhum link de checkout cadastrado
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* ── EQUIPE ── */}
              <TabsContent
                value="equipe"
                className="flex-1 overflow-y-auto bg-slate-200 mt-0"
              >
                <div className="px-[50px] py-[30px] pb-[80px] space-y-4">
                  <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <Users className="h-4 w-4 text-blue-600" />
                      <h3 className="text-sm font-semibold text-slate-800">
                        Equipe do Projeto
                      </h3>
                      <span className="ml-auto text-xs text-slate-400">
                        {project.team ?? 0} membro
                        {(project.team ?? 0) !== 1 ? "s" : ""}
                      </span>
                    </div>
                    {project.teamMembers && project.teamMembers.length > 0 ? (
                      <div className="space-y-2">
                        {project.teamMembers.map((member: any, i: number) => (
                          <div
                            key={i}
                            className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0"
                          >
                            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                              <span className="text-xs font-bold text-blue-700">
                                {member.name?.charAt(0)?.toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-800">
                                {member.name}
                              </p>
                              <p className="text-xs text-slate-400">
                                {member.role}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Users className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-xs text-slate-400">
                          {project.team > 0
                            ? `${project.team} membro${project.team !== 1 ? "s" : ""} na equipe`
                            : "Nenhum membro cadastrado"}
                        </p>
                        {project.consultant && (
                          <div className="mt-3 inline-flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-1.5">
                            <User className="h-3.5 w-3.5 text-slate-400" />
                            <span className="text-xs text-slate-600 font-medium">
                              Consultor: {project.consultant}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* ── NÔMADES ── */}
              <TabsContent
                value="nomades"
                className="flex-1 overflow-y-auto bg-slate-200 mt-0"
              >
                <div className="px-[50px] py-[30px] pb-[80px] space-y-4">
                  <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <Users className="h-4 w-4 text-violet-600" />
                      <h3 className="text-sm font-semibold text-slate-800">
                        Nômades Vinculados
                      </h3>
                      <span className="ml-auto text-xs text-slate-400">
                        {project.nomades?.length ?? 0} nômade
                        {(project.nomades?.length ?? 0) !== 1 ? "s" : ""}
                      </span>
                    </div>
                    {project.nomades && project.nomades.length > 0 ? (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {project.nomades.map((n: string, i: number) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1.5 bg-violet-50 text-violet-700 border border-violet-200 rounded-full px-3 py-1 text-xs font-semibold"
                          >
                            <User className="h-3 w-3" />
                            {n}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Users className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-xs text-slate-400">
                          Nenhum nômade vinculado
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* ── LOGS ── */}
              <TabsContent
                value="logs"
                className="flex-1 overflow-y-auto bg-slate-200 mt-0"
              >
                <div className="px-[50px] py-[30px] pb-[80px] space-y-4">
                  <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <Activity className="h-4 w-4 text-slate-500" />
                      <h3 className="text-sm font-semibold text-slate-800">
                        Histórico de Atividades
                      </h3>
                    </div>
                    <div className="space-y-3">
                      {[
                        {
                          action: "Projeto criado",
                          date: project.createdDate ?? "—",
                          user: project.consultant ?? "Sistema",
                          color: "bg-blue-400",
                        },
                        {
                          action: "Status atualizado",
                          date: "—",
                          user: "Admin",
                          color: "bg-amber-400",
                        },
                      ].map((log, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <div
                            className={`h-2 w-2 rounded-full ${log.color} mt-1.5 flex-shrink-0`}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-800">
                              {log.action}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {log.date} · {log.user}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-300 text-center mt-4">
                      Logs completos disponíveis no sistema de auditoria
                    </p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
