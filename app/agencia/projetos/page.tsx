// @ts-nocheck
"use client";

import { useState } from "react";
import { useAgencia, type AgenciaProject } from "@/contexts/agencia-context";
import { Search, FolderOpen, ShoppingBag, CreditCard, Copy, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ProjectCreateSlidePanel } from "@/components/project-create-slide-panel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDate(s?: string) {
  if (!s) return "—";
  return new Date(s + "T00:00:00").toLocaleDateString("pt-BR");
}

const STATUS_CONFIG = {
  briefing:              { label: "Briefing",         bg: "bg-slate-100 text-slate-600" },
  producao:              { label: "Produção",          bg: "bg-blue-100 text-blue-700" },
  revisao:               { label: "Revisão",           bg: "bg-amber-100 text-amber-700" },
  entregue:              { label: "Entregue",          bg: "bg-emerald-100 text-emerald-700" },
  cancelado:             { label: "Cancelado",         bg: "bg-red-100 text-red-700" },
  aguardando_pagamento:  { label: "Aguardando Pgto",   bg: "bg-yellow-100 text-yellow-800" },
} as const;

const STATUS_LABELS: Record<string, string> = {
  all: "Todos",
  briefing: "Briefing",
  producao: "Produção",
  revisao: "Revisão",
  entregue: "Entregue",
  cancelado: "Cancelado",
  aguardando_pagamento: "Aguardando Pgto",
};

function mapToAgenciaProject(raw: any): AgenciaProject {
  return {
    id: String(raw.id),
    clientName: raw.checkoutData?.client?.name ?? raw.checkoutData?.client?.company ?? "—",
    name: raw.name || "Novo Projeto",
    category: raw.products?.[0]?.category || "Contratação",
    status: "aguardando_pagamento",
    value: raw.checkoutData?.payment?.totalAmount ?? raw.checkoutData?.clientTotal ?? 0,
    startDate: raw.start_date || new Date().toISOString().split("T")[0],
    tasksDone: 0,
    tasksTotal: 0,
    products: (raw.products ?? []).map((p: any) => ({
      id: String(p.id),
      name: p.name ?? "",
      category: p.category ?? "",
      quantity: p.quantity ?? 1,
      value: (p.basePrice ?? p.finalPrice ?? 0) * (p.quantity ?? 1),
    })),
    checkoutLinks: raw.checkoutData?.checkoutLinks,
    payerMode: raw.checkoutData?.payerMode,
  };
}

export default function AgenciaProjetos() {
  const { projects, addProject, confirmProjectPayment } = useAgencia();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showContratar, setShowContratar] = useState(false);
  const [paymentProject, setPaymentProject] = useState<AgenciaProject | null>(null);
  const [expandedProductsId, setExpandedProductsId] = useState<string | null>(null);

  const filtered = projects.filter((p) => {
    const matchSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.clientName.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Projetos</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Gerencie os projetos da sua agência
            </p>
          </div>
          <Button onClick={() => setShowContratar(true)} className="shrink-0 btn-brand">
            <ShoppingBag className="h-4 w-4 mr-2" />
            Contratar Produto
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, cliente ou categoria..."
            className="pl-9 h-9 text-sm"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {Object.entries(STATUS_LABELS).map(([key, label]) => (
            <Button
              key={key}
              variant={statusFilter === key ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(key)}
              className="h-9 text-xs"
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-12 text-center">
          <FolderOpen className="h-10 w-10 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Nenhum projeto encontrado.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((project) => {
            const cfg = STATUS_CONFIG[project.status] ?? { label: project.status, bg: "bg-slate-100 text-slate-500" };
            const pct = Math.round((project.tasksDone / Math.max(project.tasksTotal, 1)) * 100);
            const isExpanded = expandedProductsId === project.id;
            return (
              <div
                key={project.id}
                className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 flex flex-col gap-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 text-sm leading-snug">{project.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{project.clientName} · {project.category}</p>
                  </div>
                  <Badge className={`${cfg.bg} border-0 text-xs shrink-0`}>{cfg.label}</Badge>
                </div>

                {project.status !== "aguardando_pagamento" && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>{project.tasksDone}/{project.tasksTotal} tarefas</span>
                      <span className="font-medium">{pct}%</span>
                    </div>
                    <Progress value={pct} className="h-1.5" />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-slate-400">Valor</p>
                    <p className="font-semibold text-slate-900">{fmtBRL(project.value)}</p>
                  </div>
                  {project.status !== "aguardando_pagamento" && (
                    <div>
                      <p className="text-slate-400">Entrega prev.</p>
                      <p className="font-semibold text-slate-900">
                        {fmtDate(project.deliveryDate ?? project.completedDate)}
                      </p>
                    </div>
                  )}
                </div>

                {/* Payment button */}
                {project.status === "aguardando_pagamento" && (
                  <button
                    type="button"
                    onClick={() => setPaymentProject(project)}
                    className="w-full flex items-center justify-center gap-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold py-2.5 transition-colors"
                  >
                    <CreditCard className="h-4 w-4" />
                    Efetuar Pagamento
                  </button>
                )}

                {/* Contracted products (shown after payment) */}
                {project.products && project.products.length > 0 && project.status !== "aguardando_pagamento" && (
                  <div className="border-t border-slate-100 pt-3 -mt-1">
                    <button
                      type="button"
                      onClick={() => setExpandedProductsId(isExpanded ? null : project.id)}
                      className="w-full flex items-center justify-between text-xs font-medium text-slate-600 hover:text-slate-900"
                    >
                      <span>📦 Produtos contratados ({project.products.length})</span>
                      {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>
                    {isExpanded && (
                      <div className="mt-2 space-y-2">
                        {project.products.map((prod) => (
                          <div key={prod.id} className="rounded-lg bg-slate-50 border border-slate-100 p-2.5">
                            <p className="text-xs font-semibold text-slate-800">{prod.name}</p>
                            <p className="text-xs text-slate-400">{prod.category} · Qtd: {prod.quantity}</p>
                            {prod.stages && prod.stages.length > 0 && (
                              <div className="mt-1.5 space-y-1">
                                {prod.stages.map((stage, i) => (
                                  <div key={i} className="flex items-center gap-2 text-xs">
                                    <span className={`w-2 h-2 rounded-full shrink-0 ${
                                      stage.status === "done" ? "bg-emerald-500" :
                                      stage.status === "in_progress" ? "bg-blue-500" : "bg-slate-300"
                                    }`} />
                                    <span className="text-slate-600">{stage.name}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {filtered.length > 0 && (
        <p className="text-xs text-slate-400">
          {filtered.length} projeto{filtered.length !== 1 ? "s" : ""} · Total:{" "}
          {fmtBRL(filtered.reduce((s, p) => s + p.value, 0))}
        </p>
      )}

      {/* Create project panel */}
      <ProjectCreateSlidePanel
        open={showContratar}
        onClose={() => setShowContratar(false)}
        onSubmit={(raw: any) => {
          if (raw.status === "aguardando_pagamento" && raw.products) {
            addProject(mapToAgenciaProject(raw));
          }
          setShowContratar(false);
        }}
        payerType="agency"
      />

      {/* Payment dialog */}
      {paymentProject && (
        <Dialog open={!!paymentProject} onOpenChange={(open) => { if (!open) setPaymentProject(null); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Efetuar Pagamento</DialogTitle>
              <DialogDescription>{paymentProject.name} · {fmtBRL(paymentProject.value)}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-1">
              {/* Self checkout */}
              <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-4 space-y-3">
                <p className="text-sm font-semibold text-blue-800">💳 Checkout — Eu mesmo</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-white border border-blue-200 rounded px-2 py-1.5 truncate text-slate-700">
                    {paymentProject.checkoutLinks?.self || "Link não disponível"}
                  </code>
                  <button
                    type="button"
                    title="Copiar link"
                    onClick={() => navigator.clipboard?.writeText(paymentProject.checkoutLinks?.self || "")}
                    className="shrink-0 p-1.5 rounded border border-blue-200 hover:bg-blue-100 transition-colors"
                  >
                    <Copy className="h-3.5 w-3.5 text-blue-600" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    confirmProjectPayment(paymentProject.id);
                    setPaymentProject(null);
                  }}
                  className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
                >
                  ✓ Confirmar Pagamento
                </button>
              </div>

              {/* Client checkout */}
              <div className="rounded-xl border-2 border-purple-200 bg-purple-50 p-4 space-y-3">
                <p className="text-sm font-semibold text-purple-800">👤 Checkout — Cliente paga</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-white border border-purple-200 rounded px-2 py-1.5 truncate text-slate-700">
                    {paymentProject.checkoutLinks?.client || "Link não disponível"}
                  </code>
                  <button
                    type="button"
                    title="Copiar link"
                    onClick={() => navigator.clipboard?.writeText(paymentProject.checkoutLinks?.client || "")}
                    className="shrink-0 p-1.5 rounded border border-purple-200 hover:bg-purple-100 transition-colors"
                  >
                    <Copy className="h-3.5 w-3.5 text-purple-600" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const url = `https://wa.me/?text=${encodeURIComponent(
                      "Olá! Segue o link para pagamento do projeto \"" +
                        paymentProject.name +
                        "\": " +
                        (paymentProject.checkoutLinks?.client || "")
                    )}`;
                    window.open(url, "_blank", "noopener,noreferrer");
                  }}
                  className="w-full py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition-colors"
                >
                  📱 Enviar por WhatsApp
                </button>
                <button
                  type="button"
                  onClick={() => {
                    confirmProjectPayment(paymentProject.id);
                    setPaymentProject(null);
                  }}
                  className="w-full py-2.5 rounded-lg border border-purple-300 hover:bg-purple-100 text-purple-800 text-sm font-medium transition-colors"
                >
                  ✓ Pagamento recebido — Iniciar projeto
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}


