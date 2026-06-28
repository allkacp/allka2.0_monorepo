// @ts-nocheck
"use client";

import { useState, useMemo } from "react";
import { usePartner } from "@/contexts/partner-context";
import {
  Building2,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  Search,
  Users,
  Star,
  Plus,
  ChevronRight,
  FileText,
  X,
  BarChart3,
  Calendar,
  Briefcase,
  ArrowUpRight,
  ChevronDown,
  Send,
  Pencil,
  Trash2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageLoader } from "@/components/ui/loading";
import { PageHeader } from "@/components/page-header";
import { apiClient } from "@/lib/api-client";
import type { LedAgency, AgencyReport } from "@/types/partner";

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function monthName(m: number) {
  return new Date(2000, m - 1, 1).toLocaleString("pt-BR", { month: "long" });
}

// ─── Status Config ────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  active: {
    label: "Ativa",
    bg: "bg-emerald-100 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
    icon: CheckCircle2,
  },
  onboarding: {
    label: "Onboarding",
    bg: "bg-blue-100 text-blue-700 border-blue-200",
    dot: "bg-blue-500",
    icon: Clock,
  },
  at_risk: {
    label: "Em risco",
    bg: "bg-amber-100 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
    icon: AlertTriangle,
  },
  inactive: {
    label: "Inativa",
    bg: "bg-slate-100 text-slate-500 border-slate-200",
    dot: "bg-slate-400",
    icon: XCircle,
  },
} as const;

// ─── KPI Strip ────────────────────────────────────────────────────────────────

function KpiCard({ icon: Icon, label, value, sub, color }: {
  icon: any; label: string; value: string; sub?: string; color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-start gap-4">
      <div className={`rounded-xl p-2.5 ${color}`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-400 font-medium mb-0.5">{label}</p>
        <p className="text-2xl font-bold text-slate-900 leading-none">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Star Rating Display ──────────────────────────────────────────────────────

function StarRating({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${i < value ? "text-amber-400 fill-amber-400" : "text-slate-200 fill-slate-200"}`}
        />
      ))}
    </span>
  );
}

// ─── StarRatingInput ─────────────────────────────────────────────────────────

function StarRatingInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <span className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          onMouseEnter={() => setHover(s)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(s)}
          className="focus:outline-none"
        >
          <Star
            className={`h-5 w-5 transition-colors ${(hover || value) >= s ? "text-amber-400 fill-amber-400" : "text-slate-200 fill-slate-200"}`}
          />
        </button>
      ))}
    </span>
  );
}

// ─── Report Card ─────────────────────────────────────────────────────────────

function ReportCard({ report, onEdit, onDelete }: {
  report: AgencyReport;
  onEdit: (r: AgencyReport) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const highlights = report.highlights ?? [];
  const improvements = report.improvements ?? [];

  return (
    <div className="border border-slate-100 rounded-xl bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50/50 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="bg-linear-to-br from-violet-500 to-indigo-600 rounded-lg p-2 shrink-0">
            <FileText className="h-3.5 w-3.5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">{report.title}</p>
            <p className="text-xs text-slate-400">{monthName(report.periodMonth)} {report.periodYear}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {report.rating && <StarRating value={report.rating} />}
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
            report.status === "published"
              ? "bg-emerald-50 text-emerald-600 border-emerald-200"
              : "bg-slate-50 text-slate-500 border-slate-200"
          }`}>
            {report.status === "published" ? "Publicado" : "Rascunho"}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(report); }}
            className="p-1 hover:bg-slate-100 rounded-md text-slate-400 hover:text-slate-600"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(report.id); }}
            className="p-1 hover:bg-red-50 rounded-md text-slate-400 hover:text-red-500"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </div>
      </div>

      {/* Expanded */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-50 space-y-3">
          {/* Stats row */}
          {(report.mrr || report.projectsCount || report.tasksCount) && (
            <div className="flex gap-4 pt-3 text-xs text-slate-500">
              {report.mrr && (
                <span className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-emerald-500" />
                  MRR: <strong className="text-slate-700">{fmtBRL(report.mrr)}</strong>
                </span>
              )}
              {report.projectsCount && (
                <span className="flex items-center gap-1">
                  <Briefcase className="h-3 w-3 text-blue-500" />
                  Projetos: <strong className="text-slate-700">{report.projectsCount}</strong>
                </span>
              )}
              {report.tasksCount && (
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-violet-500" />
                  Tarefas: <strong className="text-slate-700">{report.tasksCount}</strong>
                </span>
              )}
            </div>
          )}

          {/* Content */}
          <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{report.content}</p>

          {/* Highlights */}
          {highlights.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-emerald-600 mb-1.5 flex items-center gap-1">
                <ArrowUpRight className="h-3 w-3" /> Destaques
              </p>
              <ul className="space-y-1">
                {highlights.map((h, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
                    {h}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Improvements */}
          {improvements.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-amber-600 mb-1.5 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Pontos de melhoria
              </p>
              <ul className="space-y-1">
                {improvements.map((h, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
                    {h}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Report Form ─────────────────────────────────────────────────────────────

const INITIAL_FORM = {
  title: "",
  content: "",
  period_month: new Date().getMonth() + 1,
  period_year: new Date().getFullYear(),
  rating: 0,
  highlights: "",
  improvements: "",
  mrr: "",
  projects_count: "",
  tasks_count: "",
  status: "draft",
};

function ReportForm({ agencyId, initial, onSaved, onCancel }: {
  agencyId: string;
  initial?: AgencyReport | null;
  onSaved: (r: AgencyReport) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState(
    initial
      ? {
          title: initial.title,
          content: initial.content,
          period_month: initial.periodMonth,
          period_year: initial.periodYear,
          rating: initial.rating ?? 0,
          highlights: (initial.highlights ?? []).join("\n"),
          improvements: (initial.improvements ?? []).join("\n"),
          mrr: initial.mrr ? String(initial.mrr) : "",
          projects_count: initial.projectsCount ? String(initial.projectsCount) : "",
          tasks_count: initial.tasksCount ? String(initial.tasksCount) : "",
          status: initial.status,
        }
      : INITIAL_FORM,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.title.trim() || !form.content.trim()) {
      setError("Título e conteúdo são obrigatórios.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        content: form.content.trim(),
        period_month: Number(form.period_month),
        period_year: Number(form.period_year),
        rating: form.rating > 0 ? Number(form.rating) : undefined,
        highlights: form.highlights.split("\n").map((s) => s.trim()).filter(Boolean),
        improvements: form.improvements.split("\n").map((s) => s.trim()).filter(Boolean),
        mrr: form.mrr ? parseFloat(form.mrr) : undefined,
        projects_count: form.projects_count ? parseInt(form.projects_count) : undefined,
        tasks_count: form.tasks_count ? parseInt(form.tasks_count) : undefined,
        status: form.status,
      };
      let saved;
      if (initial?.id) {
        saved = await apiClient.updateAgencyReport(agencyId, initial.id, payload);
      } else {
        saved = await apiClient.createAgencyReport(agencyId, payload);
      }
      onSaved(saved);
    } catch (err) {
      setError("Erro ao salvar relatório. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: monthName(i + 1),
  }));
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Title */}
      <div>
        <label className="text-xs font-medium text-slate-600 block mb-1">Título *</label>
        <Input
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="Ex: Análise de Desempenho — Julho 2025"
          className="text-sm h-9"
        />
      </div>

      {/* Period */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-slate-600 block mb-1">Mês</label>
          <select
            value={form.period_month}
            onChange={(e) => set("period_month", Number(e.target.value))}
            className="w-full h-9 text-sm rounded-md border border-input bg-background px-3 text-slate-700"
          >
            {months.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 block mb-1">Ano</label>
          <select
            value={form.period_year}
            onChange={(e) => set("period_year", Number(e.target.value))}
            className="w-full h-9 text-sm rounded-md border border-input bg-background px-3 text-slate-700"
          >
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Rating */}
      <div>
        <label className="text-xs font-medium text-slate-600 block mb-1">Avaliação</label>
        <StarRatingInput value={form.rating} onChange={(v) => set("rating", v)} />
      </div>

      {/* Content */}
      <div>
        <label className="text-xs font-medium text-slate-600 block mb-1">Análise / Observações *</label>
        <textarea
          value={form.content}
          onChange={(e) => set("content", e.target.value)}
          rows={5}
          placeholder="Descreva o desempenho, conquistas e situação geral da agência neste período..."
          className="w-full text-sm rounded-md border border-input bg-background px-3 py-2 text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs font-medium text-slate-600 block mb-1">MRR (R$)</label>
          <Input
            type="number"
            value={form.mrr}
            onChange={(e) => set("mrr", e.target.value)}
            placeholder="0"
            className="text-sm h-9"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 block mb-1">Projetos</label>
          <Input
            type="number"
            value={form.projects_count}
            onChange={(e) => set("projects_count", e.target.value)}
            placeholder="0"
            className="text-sm h-9"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 block mb-1">Tarefas</label>
          <Input
            type="number"
            value={form.tasks_count}
            onChange={(e) => set("tasks_count", e.target.value)}
            placeholder="0"
            className="text-sm h-9"
          />
        </div>
      </div>

      {/* Highlights */}
      <div>
        <label className="text-xs font-medium text-slate-600 block mb-1">
          Destaques <span className="text-slate-400">(um por linha)</span>
        </label>
        <textarea
          value={form.highlights}
          onChange={(e) => set("highlights", e.target.value)}
          rows={3}
          placeholder="Conseguiu X novos clientes&#10;Bateu meta de MRR&#10;Entregou todos projetos no prazo"
          className="w-full text-sm rounded-md border border-input bg-background px-3 py-2 text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Improvements */}
      <div>
        <label className="text-xs font-medium text-slate-600 block mb-1">
          Pontos de melhoria <span className="text-slate-400">(um por linha)</span>
        </label>
        <textarea
          value={form.improvements}
          onChange={(e) => set("improvements", e.target.value)}
          rows={3}
          placeholder="Precisa melhorar comunicação com clientes&#10;Alta rotatividade de tarefas"
          className="w-full text-sm rounded-md border border-input bg-background px-3 py-2 text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Status */}
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-slate-600">Status:</label>
        <select
          value={form.status}
          onChange={(e) => set("status", e.target.value)}
          className="h-8 text-xs rounded-md border border-input bg-background px-2 text-slate-700"
        >
          <option value="draft">Rascunho</option>
          <option value="published">Publicado</option>
        </select>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex gap-2 pt-1">
        <Button type="submit" size="sm" disabled={saving} className="flex items-center gap-1.5">
          <Send className="h-3.5 w-3.5" />
          {saving ? "Salvando…" : initial ? "Atualizar" : "Salvar relatório"}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

// ─── Agency Detail Slide Panel ────────────────────────────────────────────────

function AgencyPanel({ agency, onClose }: {
  agency: LedAgency;
  onClose: () => void;
}) {
  const cfg = STATUS_CONFIG[agency.status] ?? STATUS_CONFIG.inactive;
  const [reports, setReports] = useState<AgencyReport[]>(agency.reports ?? []);
  const [showForm, setShowForm] = useState(false);
  const [editingReport, setEditingReport] = useState<AgencyReport | null>(null);

  const handleSaved = (r: AgencyReport) => {
    setReports((prev) => {
      const idx = prev.findIndex((x) => x.id === r.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = r;
        return next;
      }
      return [r, ...prev];
    });
    setShowForm(false);
    setEditingReport(null);
  };

  const handleDelete = async (reportId: string) => {
    try {
      await apiClient.deleteAgencyReport(agency.id, reportId);
      setReports((prev) => prev.filter((r) => r.id !== reportId));
    } catch {
      // ignore
    }
  };

  const avgRating = reports.length
    ? Math.round(reports.reduce((s, r) => s + (r.rating ?? 0), 0) / reports.length)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Panel */}
      <div className="relative z-10 w-full max-w-xl bg-white dark:bg-slate-900 h-full flex flex-col shadow-2xl overflow-hidden">
        {/* Panel header */}
        <div className="bg-linear-to-br from-slate-900 via-[#1a2a6f] to-[#c81a7f] px-6 py-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs text-white/50 font-medium uppercase tracking-wider mb-1">Agência Liderada</p>
              <h2 className="text-xl font-bold text-white">{agency.name}</h2>
              <p className="text-sm text-white/60 mt-0.5">{agency.email}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white/50 hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Metric row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-white">{fmtBRL(agency.mrr)}</p>
              <p className="text-[10px] text-white/50 mt-0.5">MRR</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-white">{agency.totalProjects}</p>
              <p className="text-[10px] text-white/50 mt-0.5">Projetos</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-white">{fmtBRL(agency.commissionAmount)}</p>
              <p className="text-[10px] text-white/50 mt-0.5">Comissão</p>
            </div>
          </div>
        </div>

        {/* Status + info */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-4">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.bg}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
          </span>
          <span className="text-xs text-slate-400">Plano: <strong className="text-slate-700">{
            agency.plan === "0" ? "Freemium" : `R$ ${agency.plan}/mês`
          }</strong></span>
          {avgRating > 0 && (
            <span className="flex items-center gap-1 text-xs text-slate-500">
              Média: <StarRating value={avgRating} />
            </span>
          )}
        </div>

        {/* Body — reports */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Section header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Relatórios</h3>
              <p className="text-xs text-slate-400">{reports.length} relatório{reports.length !== 1 ? "s" : ""}</p>
            </div>
            {!showForm && !editingReport && (
              <Button
                size="sm"
                onClick={() => setShowForm(true)}
                className="flex items-center gap-1.5 bg-linear-to-br from-[#1a2a6f] to-[#c81a7f] text-white border-0 hover:opacity-90"
              >
                <Plus className="h-3.5 w-3.5" />
                Novo relatório
              </Button>
            )}
          </div>

          {/* Add/Edit form */}
          {(showForm || editingReport) && (
            <div className="border border-indigo-100 bg-indigo-50/30 rounded-2xl p-4">
              <h4 className="text-sm font-semibold text-slate-800 mb-4">
                {editingReport ? "Editar relatório" : "Novo relatório"}
              </h4>
              <ReportForm
                agencyId={agency.id}
                initial={editingReport}
                onSaved={handleSaved}
                onCancel={() => { setShowForm(false); setEditingReport(null); }}
              />
            </div>
          )}

          {/* Reports list */}
          {reports.length === 0 && !showForm ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <FileText className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm font-medium">Nenhum relatório ainda</p>
              <p className="text-xs mt-1">Clique em "Novo relatório" para começar</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((r) => (
                <ReportCard
                  key={r.id}
                  report={r}
                  onEdit={(rep) => { setEditingReport(rep); setShowForm(false); }}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Agency Card ──────────────────────────────────────────────────────────────

function AgencyCard({ agency, onClick }: { agency: LedAgency; onClick: () => void }) {
  const cfg = STATUS_CONFIG[agency.status] ?? STATUS_CONFIG.inactive;
  const reports = agency.reports ?? [];
  const lastReport = reports[0];
  const avgRating = reports.filter((r) => r.rating).length
    ? Math.round(reports.filter((r) => r.rating).reduce((s, r) => s + (r.rating ?? 0), 0) / reports.filter((r) => r.rating).length)
    : 0;

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 cursor-pointer hover:border-indigo-200 hover:shadow-md transition-all group"
    >
      {/* Top row */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 rounded-xl bg-linear-to-br from-[#1a2a6f] to-[#c81a7f] flex items-center justify-center shrink-0">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-slate-900 truncate group-hover:text-indigo-700 transition-colors">
              {agency.name}
            </p>
            <p className="text-xs text-slate-400 truncate">{agency.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cfg.bg}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
          </span>
          <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-indigo-400 transition-colors" />
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-slate-50 rounded-xl p-2.5 text-center">
          <p className="text-sm font-bold text-slate-900">{fmtBRL(agency.mrr)}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">MRR</p>
        </div>
        <div className="bg-slate-50 rounded-xl p-2.5 text-center">
          <p className="text-sm font-bold text-slate-900">{agency.totalProjects}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Projetos</p>
        </div>
        <div className="bg-slate-50 rounded-xl p-2.5 text-center">
          <p className="text-sm font-bold text-slate-900">{reports.length}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Relatórios</p>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {avgRating > 0 ? (
            <StarRating value={avgRating} />
          ) : (
            <span className="text-xs text-slate-300">Sem avaliação</span>
          )}
        </div>
        {lastReport ? (
          <span className="text-[10px] text-slate-400 flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Último: {monthName(lastReport.periodMonth).slice(0, 3)} {lastReport.periodYear}
          </span>
        ) : (
          <span className="text-[10px] text-slate-300 flex items-center gap-1">
            <FileText className="h-3 w-3" />
            Sem relatórios
          </span>
        )}
      </div>

      {/* Commission */}
      <div className="mt-3 pt-3 border-t border-slate-50 flex items-center justify-between">
        <span className="text-xs text-slate-400">Comissão mensal</span>
        <span className="text-sm font-semibold text-emerald-600">{fmtBRL(agency.commissionAmount)}</span>
      </div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
      <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
        <Building2 className="h-8 w-8 opacity-40" />
      </div>
      <p className="text-base font-semibold text-slate-600">Nenhuma agência liderada</p>
      <p className="text-sm mt-1 text-center max-w-xs">
        Quando você liderar agências, elas aparecerão aqui com métricas e relatórios.
      </p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ParceiroAgencias() {
  const { ledAgencies, loading } = usePartner();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedAgency, setSelectedAgency] = useState<LedAgency | null>(null);

  const totalMrr = ledAgencies.reduce((s, a) => s + a.mrr, 0);
  const totalCommission = ledAgencies.reduce((s, a) => s + a.commissionAmount, 0);
  const activeCount = ledAgencies.filter((a) => a.status === "active").length;
  const atRiskCount = ledAgencies.filter((a) => a.status === "at_risk").length;
  const onboardingCount = ledAgencies.filter((a) => a.status === "onboarding").length;

  const filtered = useMemo(() => {
    return ledAgencies.filter((a) => {
      const matchSearch =
        !search ||
        a.name.toLowerCase().includes(search.toLowerCase()) ||
        a.email.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || a.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [ledAgencies, search, statusFilter]);

  if (loading) {
    return <PageLoader text="Carregando agências…" />;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <PageHeader
        title="Agências Lideradas"
        description="Acompanhe o desempenho e relatórios das agências sob sua liderança"
        actions={
          <span className="text-xs text-slate-400 bg-slate-100 rounded-full px-3 py-1 font-medium">
            {ledAgencies.length} agência{ledAgencies.length !== 1 ? "s" : ""}
          </span>
        }
      />

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={Users}
          label="Total Lideradas"
          value={String(ledAgencies.length)}
          sub={`${activeCount} ativas`}
          color="bg-linear-to-br from-[#1a2a6f] to-[#c81a7f]"
        />
        <KpiCard
          icon={TrendingUp}
          label="MRR Total"
          value={fmtBRL(totalMrr)}
          sub="consumo mensal"
          color="bg-linear-to-br from-emerald-500 to-teal-600"
        />
        <KpiCard
          icon={BarChart3}
          label="Comissão Mensal"
          value={fmtBRL(totalCommission)}
          sub="5% sobre MRR"
          color="bg-linear-to-br from-violet-500 to-indigo-600"
        />
        <KpiCard
          icon={AlertTriangle}
          label="Atenção Necessária"
          value={String(atRiskCount + onboardingCount)}
          sub={`${atRiskCount} em risco · ${onboardingCount} onboarding`}
          color="bg-linear-to-br from-amber-500 to-orange-600"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou e-mail…"
            className="pl-9 h-9 text-sm"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(["all", "active", "onboarding", "at_risk", "inactive"] as const).map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(s)}
              className={`h-9 text-xs ${statusFilter === s ? "bg-linear-to-br from-[#1a2a6f] to-[#c81a7f] text-white border-0" : ""}`}
            >
              {s === "all" ? "Todos" : STATUS_CONFIG[s]?.label ?? s}
            </Button>
          ))}
        </div>
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((agency) => (
            <AgencyCard
              key={agency.id}
              agency={agency}
              onClick={() => setSelectedAgency(agency)}
            />
          ))}
        </div>
      )}

      {/* Agency detail panel */}
      {selectedAgency && (
        <AgencyPanel
          agency={selectedAgency}
          onClose={() => setSelectedAgency(null)}
        />
      )}
    </div>
  );
}
