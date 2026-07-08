// @ts-nocheck
"use client";

import { useState, useEffect, useCallback } from "react";
import { usePartner } from "@/contexts/partner-context";
import {
  FolderOpen,
  CheckCircle2,
  Clock,
  XCircle,
  Search,
  ChevronLeft,
  ChevronRight,
  Plus,
} from "lucide-react";
import { useSorting, SortableHeader } from "@/hooks/useSorting";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageLoader } from "@/components/ui/loading";
import { PageHeader } from "@/components/page-header";
import { SlidePanel } from "@/components/slide-panel";
import { useItemsPerPage } from "@/lib/use-items-per-page";
import { ItemsPerPageSelect } from "@/components/items-per-page-select";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/components/ui/use-toast";

function fmtBRL(n: number) {
  return (n ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDate(s: string) {
  return new Date(s + "T00:00:00").toLocaleDateString("pt-BR");
}

const EMPTY_OWN_PROJECT_FORM = { title: "", type: "", value: "", description: "" };

export default function PartnerProjetos() {
  const { projects, stats, loading } = usePartner();
  const { toast } = useToast();

  // ── "Meus Projetos" — projetos próprios do Partner (partner_id), via
  // /api/projects. Separado de "Projetos Indicados" acima (relatório de
  // comissão sobre projetos de empresas indicadas, não tocado aqui).
  const [ownProjects, setOwnProjects] = useState<any[]>([]);
  const [ownLoading, setOwnLoading] = useState(true);
  const [ownCreateOpen, setOwnCreateOpen] = useState(false);
  const [ownForm, setOwnForm] = useState(EMPTY_OWN_PROJECT_FORM);
  const [ownSaving, setOwnSaving] = useState(false);
  const [ownError, setOwnError] = useState("");

  const loadOwnProjects = useCallback(async () => {
    setOwnLoading(true);
    try {
      const res: any = await apiClient.getProjects({ limit: "50" });
      setOwnProjects(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("[PartnerProjetos] Failed to load own projects:", err);
    } finally {
      setOwnLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOwnProjects();
  }, [loadOwnProjects]);

  async function handleCreateOwnProject() {
    if (!ownForm.title.trim()) {
      setOwnError("Título é obrigatório");
      return;
    }
    setOwnSaving(true);
    setOwnError("");
    try {
      await apiClient.createProject({
        title: ownForm.title,
        type: ownForm.type || undefined,
        value: ownForm.value ? Number(ownForm.value) : undefined,
        description: ownForm.description || undefined,
      });
      toast({ title: "Projeto criado com sucesso!" });
      setOwnCreateOpen(false);
      setOwnForm(EMPTY_OWN_PROJECT_FORM);
      loadOwnProjects();
    } catch (err: any) {
      setOwnError(err?.message ?? "Erro ao criar projeto");
    } finally {
      setOwnSaving(false);
    }
  }

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useItemsPerPage("parceiro-projetos", 10);
  const {
    sortKey,
    sortDir,
    handleSort,
    sortData,
    columnFilters,
    toggleColumnFilter,
    clearColumnFilter,
  } = useSorting();

  const filtered = projects.filter((p) => {
    if (
      search &&
      !p.projectName.toLowerCase().includes(search.toLowerCase()) &&
      !p.companyName.toLowerCase().includes(search.toLowerCase())
    )
      return false;
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    return true;
  });

  const sorted = sortData(filtered);
  const totalItems = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedProjects = sorted.slice(
    (safeCurrentPage - 1) * itemsPerPage,
    safeCurrentPage * itemsPerPage,
  );

  const totalValue = projects.reduce((s, p) => s + p.projectValue, 0);
  const totalCommission = projects.reduce(
    (s, p) => s + p.commissionGenerated,
    0,
  );

  const statusConfig = {
    active: {
      label: "Ativo",
      color: "bg-emerald-100 text-emerald-700",
      icon: Clock,
    },
    completed: {
      label: "Concluído",
      color: "bg-slate-100 text-slate-600",
      icon: CheckCircle2,
    },
    cancelled: {
      label: "Cancelado",
      color: "bg-red-100 text-red-700",
      icon: XCircle,
    },
  };

  const commStatusConfig = {
    pending: { label: "Pendente", color: "bg-amber-100 text-amber-700" },
    confirmed: { label: "Confirmado", color: "bg-blue-100 text-blue-700" },
    paid: { label: "Pago", color: "bg-emerald-100 text-emerald-700" },
  };

  if (loading) {
    return <PageLoader text="Carregando projetos…" />;
  }

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* Header */}
      {/* Meus Projetos — projetos próprios do Partner, separado do relatório de comissão abaixo */}
      <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">Meus Projetos</h2>
            <p className="text-xs text-slate-400">Projetos criados diretamente por você</p>
          </div>
          <Button size="sm" className="btn-brand" onClick={() => { setOwnForm(EMPTY_OWN_PROJECT_FORM); setOwnError(""); setOwnCreateOpen(true); }}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Criar projeto
          </Button>
        </div>
        {ownLoading ? (
          <div className="py-8 text-center text-sm text-slate-400">Carregando...</div>
        ) : ownProjects.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-400">Nenhum projeto próprio ainda</div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {ownProjects.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between px-4 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{p.title}</p>
                  <p className="text-[11px] text-slate-400">{p.type || "—"}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{fmtBRL(p.value)}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">{p.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <SlidePanel
        open={ownCreateOpen}
        onClose={() => { if (!ownSaving) setOwnCreateOpen(false); }}
        title="Criar projeto"
        subtitle="O projeto será vinculado automaticamente ao seu perfil de Partner"
        widthMode="compact"
        compactWidth={420}
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => setOwnCreateOpen(false)} disabled={ownSaving}>Cancelar</Button>
            <Button onClick={handleCreateOwnProject} disabled={ownSaving} className="btn-brand">
              {ownSaving ? "Salvando..." : "Salvar projeto"}
            </Button>
          </div>
        }
      >
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="space-y-2">
            <Label>Título *</Label>
            <Input
              placeholder="Ex: Campanha de lançamento"
              value={ownForm.title}
              onChange={(e) => setOwnForm({ ...ownForm, title: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Input
              placeholder="Ex: Marketing Digital"
              value={ownForm.type}
              onChange={(e) => setOwnForm({ ...ownForm, type: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Valor</Label>
            <Input
              type="number"
              placeholder="0,00"
              value={ownForm.value}
              onChange={(e) => setOwnForm({ ...ownForm, value: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Input
              placeholder="Notas sobre este projeto..."
              value={ownForm.description}
              onChange={(e) => setOwnForm({ ...ownForm, description: e.target.value })}
            />
          </div>
          {ownError && <p className="text-xs text-red-600">{ownError}</p>}
        </div>
      </SlidePanel>

      <PageHeader title="Projetos Indicados" description="Projetos contratados por empresas através do seu link" />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">
            Total de Projetos
          </p>
          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">
            {projects.length}
          </p>
        </div>
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">
            Valor Total
          </p>
          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">
            {fmtBRL(totalValue)}
          </p>
        </div>
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">
            Comissões Geradas
          </p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">
            {fmtBRL(totalCommission)}
          </p>
        </div>
      </div>

      {/* Filters + Items per page */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="Buscar projeto ou empresa..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            className="pl-8 h-8 text-sm"
          />
        </div>
        {(["all", "active", "completed", "cancelled"] as const).map((s) => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setCurrentPage(1); }}
            className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
              statusFilter === s
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300"
            }`}
          >
            {s === "all"
              ? "Todos"
              : s === "active"
                ? "Ativos"
                : s === "completed"
                  ? "Concluídos"
                  : "Cancelados"}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2 shrink-0">
          <ItemsPerPageSelect
            value={itemsPerPage.toString()}
            onValueChange={(v) => { setItemsPerPage(Number(v)); setCurrentPage(1); }}
            variant="top"
          />
          {totalItems > 0 && (
            <span className="text-xs text-slate-400 whitespace-nowrap">
              {totalItems} projeto{totalItems !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto allka-table-scroll">
          <table className="w-full text-sm min-w-150">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide w-28">
                  ID
                </th>
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <SortableHeader
                    label="Projeto"
                    field="projectName"
                    type="text"
                    sortKey={sortKey ? String(sortKey) : null}
                    sortDir={sortDir}
                    onSort={handleSort}
                  />
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <SortableHeader
                    label="Empresa"
                    field="companyName"
                    type="text"
                    sortKey={sortKey ? String(sortKey) : null}
                    sortDir={sortDir}
                    onSort={handleSort}
                  />
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <SortableHeader
                    label="Categoria"
                    field="serviceCategory"
                    type="status"
                    sortKey={sortKey ? String(sortKey) : null}
                    sortDir={sortDir}
                    onSort={handleSort}
                    columnFilters={columnFilters}
                    onFilter={toggleColumnFilter}
                    onClearFilter={clearColumnFilter}
                    filterValues={[
                      "Branding",
                      "Social Media",
                      "Produção de Vídeo",
                      "Conteúdo",
                    ]}
                  />
                </th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <SortableHeader
                    label="Valor"
                    field="projectValue"
                    type="number"
                    sortKey={sortKey ? String(sortKey) : null}
                    sortDir={sortDir}
                    onSort={handleSort}
                  />
                </th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <SortableHeader
                    label="Comissão"
                    field="commissionGenerated"
                    type="number"
                    sortKey={sortKey ? String(sortKey) : null}
                    sortDir={sortDir}
                    onSort={handleSort}
                  />
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <SortableHeader
                    label="Status"
                    field="status"
                    type="status"
                    sortKey={sortKey ? String(sortKey) : null}
                    sortDir={sortDir}
                    onSort={handleSort}
                    columnFilters={columnFilters}
                    onFilter={toggleColumnFilter}
                    onClearFilter={clearColumnFilter}
                    filterValues={["active", "completed", "cancelled"]}
                  />
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <SortableHeader
                    label="Contratado"
                    field="startDate"
                    type="date"
                    sortKey={sortKey ? String(sortKey) : null}
                    sortDir={sortDir}
                    onSort={handleSort}
                  />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paginatedProjects.map((p, idx) => {
                const sc = statusConfig[p.status] ?? {
                  label: p.status ?? "—",
                  color: "bg-slate-100 text-slate-600",
                  icon: FolderOpen,
                };
                const cc = commStatusConfig[p.commissionStatus] ?? {
                  label: p.commissionStatus ?? "—",
                  color: "bg-slate-100 text-slate-600",
                };
                return (
                  <tr
                    key={p.id}
                    className={
                      idx % 2 === 1 ? "bg-slate-50/50 dark:bg-slate-900/30" : ""
                    }
                  >
                    <td className="px-4 py-3" style={{ borderRight: "1px solid rgba(148,163,184,0.15)" }}>
                      <span className="font-mono text-xs text-slate-400">
                        proj_{String((p as any).seq ?? "?????").padStart(5, "0")}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-medium text-slate-700 dark:text-slate-200">
                      {p.projectName}
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                      {p.companyName}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">
                      {p.serviceCategory}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium text-slate-700 dark:text-slate-200">
                      {fmtBRL(p.projectValue)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="tabular-nums font-semibold text-emerald-600">
                        {fmtBRL(p.commissionGenerated)}
                      </span>
                      <span
                        className={`ml-2 text-[10px] px-1 py-0.5 rounded font-semibold ${cc.color}`}
                      >
                        {cc.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded font-semibold ${sc.color}`}
                      >
                        {sc.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {fmtDate(p.contractedAt)}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-10 text-center text-sm text-slate-400"
                  >
                    <FolderOpen className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                    Nenhum projeto encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={safeCurrentPage === 1}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-sm disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </button>
          <span className="text-sm text-slate-500">
            Página {safeCurrentPage} de {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={safeCurrentPage === totalPages}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-sm disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Próxima
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
