import { Fragment, useCallback, useEffect, useState } from "react";
import {
  ExternalLink,
  RefreshCw,
  ShieldAlert,
  Users,
  Ban,
  CheckCircle2,
  PlusCircle,
  ChevronDown,
  ChevronRight,
  X,
  FlaskConical,
  KeyRound,
} from "lucide-react";
import { DashboardShellFrame } from "@/features/dashboards/shared/dashboard-shell-frame";
import { ArchiveGroupButton } from "./archive-group-button";
import { STANDARD_SHELL_TABLE_CARD_CLASS } from "@/components/standard-page-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiClient } from "@/lib/api-client";
import { tipoDaContaLogada } from "@/lib/conta-logada";
import { cn } from "@/lib/utils";
import { hasAdminModulePermission } from "@/lib/admin-permissions";
import { useOpenRoadmapPanel } from "@/hooks/use-open-roadmap-panel";
import { CentralChamadosAccessPanel } from "@/components/central-chamados-access-panel";

type Policy = "ALLOW_ALL_ACTIVE" | "DENY_ALL_EXCEPT_ALLOWED";

type ConfigResponse = {
  enabled: boolean;
  defaultPolicy: Policy;
  technicallyConfigured: boolean;
  roadmapInternalUrl: string | null;
};

type Summary = { released: number; blocked: number; exceptions: number; inactive: number; total: number };

type UserRow = {
  id: string;
  name: string;
  email: string;
  userCode: string | null;
  accountType: string;
  isActive: boolean;
  status: string;
  canUse: boolean;
  source: string;
  override: { effect: string; active: boolean; expiresAt: string | null } | null;
  groupCount: number;
};

type Group = {
  id: string;
  name: string;
  effect: "ALLOW" | "DENY";
  priority: number;
  active: boolean;
  expiresAt: string | null;
  reason: string | null;
  memberCount: number;
};

type GroupMember = { userId: string; name: string; email: string; userCode: string | null; addedAt: string };

type AuditEntry = {
  id: string;
  actor_id: string | null;
  target_user_id: string | null;
  action: string;
  before_json: string | null;
  after_json: string | null;
  reason: string | null;
  created_at: string;
};

type SimulateResult = { canUse: boolean; reason: string; source: string };

const policyLabels: Record<Policy, string> = {
  ALLOW_ALL_ACTIVE: "Liberar para todo usuário ativo (padrão)",
  DENY_ALL_EXCEPT_ALLOWED: "Bloquear todos, exceto quem for liberado",
};

function toDateInputValue(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

function dateInputToIso(value: string): string | null {
  if (!value) return null;
  return new Date(`${value}T23:59:59.999Z`).toISOString();
}

export default function AcessoAosChamadosPage() {
  const isAdmin = tipoDaContaLogada() === "admin";

  // A role "admin" já é checada acima (client-side, sinal fraco). O acesso de
  // verdade a esta tela é granular (perfil AdminProfile, módulo "sistema"):
  // o backend já exige requirePermission("sistema","view"/"edit") em toda
  // rota (ver product-feedback-admin.ts) — aqui só refletimos a mesma regra
  // para a UI não aparecer aberta a um admin sem essa permissão específica.
  // Perfil ausente/inativo ou is_master segue o mesmo comportamento legado
  // do middleware: libera tudo.
  const [permissionCheck, setPermissionCheck] = useState<"checking" | "granted" | "denied">("checking");
  const [canEdit, setCanEdit] = useState(false);
  const roadmapPanel = useOpenRoadmapPanel();

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    (async () => {
      try {
        const me = await apiClient.getCurrentUser();
        const profile = me?.admin_profile;
        const podeVer = hasAdminModulePermission(profile, "sistema", "view");
        const podeEditar = hasAdminModulePermission(profile, "sistema", "edit");
        if (!cancelled) {
          setPermissionCheck(podeVer ? "granted" : "denied");
          setCanEdit(podeEditar);
        }
      } catch {
        if (!cancelled) setPermissionCheck("denied");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  const [config, setConfig] = useState<ConfigResponse | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "allowed" | "blocked" | "override" | "inactive">("all");
  const [groups, setGroups] = useState<Group[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [auditPagination, setAuditPagination] = useState({ page: 1, limit: 20, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupEffect, setNewGroupEffect] = useState<"ALLOW" | "DENY">("ALLOW");
  const [newGroupPriority, setNewGroupPriority] = useState(0);
  const [newGroupExpiresAt, setNewGroupExpiresAt] = useState("");
  const [newGroupReason, setNewGroupReason] = useState("");

  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [batchReason, setBatchReason] = useState("");
  const [batchGroupId, setBatchGroupId] = useState("");

  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [groupMembersLoading, setGroupMembersLoading] = useState(false);
  const [groupEdits, setGroupEdits] = useState<Record<string, Partial<Group>>>({});

  const [simulateResults, setSimulateResults] = useState<Record<string, SimulateResult>>({});

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [cfg, sum, usersRes, groupsRes, auditRes] = await Promise.all([
        apiClient.getProductFeedbackAdminConfig(),
        apiClient.getProductFeedbackAdminSummary(),
        apiClient.getProductFeedbackAdminUsers({ page: pagination.page, limit: pagination.limit, search, filter }),
        apiClient.getProductFeedbackGroups(),
        apiClient.getProductFeedbackAudit({ page: auditPagination.page, limit: auditPagination.limit }),
      ]);
      setConfig(cfg);
      setSummary(sum);
      setUsers(usersRes.items);
      setPagination(usersRes.pagination);
      setGroups(groupsRes.items);
      setAudit(auditRes.items);
      setAuditPagination(auditRes.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar os dados.");
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, filter, auditPagination.page, auditPagination.limit]);

  useEffect(() => {
    if (isAdmin && permissionCheck === "granted") void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, permissionCheck, pagination.page, filter, auditPagination.page]);

  async function toggleEnabled(next: boolean) {
    if (!config) return;
    setConfig({ ...config, enabled: next });
    try {
      await apiClient.updateProductFeedbackAdminConfig({ enabled: next });
      await loadAll();
    } catch (err) {
      setConfig({ ...config, enabled: !next });
      setError(err instanceof Error ? err.message : "Não foi possível salvar.");
    }
  }

  async function changePolicy(next: Policy) {
    if (!config) return;
    const previous = config.defaultPolicy;
    setConfig({ ...config, defaultPolicy: next });
    try {
      await apiClient.updateProductFeedbackAdminConfig({ defaultPolicy: next });
      await loadAll();
    } catch (err) {
      setConfig({ ...config, defaultPolicy: previous });
      setError(err instanceof Error ? err.message : "Não foi possível salvar.");
    }
  }

  async function setOverride(userId: string, effect: "ALLOW" | "DENY" | "INHERIT") {
    try {
      await apiClient.setProductFeedbackUserOverride(userId, { effect });
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível alterar o acesso deste usuário.");
    }
  }

  async function createGroup() {
    if (!newGroupName.trim()) return;
    try {
      await apiClient.createProductFeedbackGroup({
        name: newGroupName.trim(),
        effect: newGroupEffect,
        priority: newGroupPriority,
        expiresAt: dateInputToIso(newGroupExpiresAt),
        reason: newGroupReason.trim() || undefined,
      });
      setNewGroupName("");
      setNewGroupPriority(0);
      setNewGroupExpiresAt("");
      setNewGroupReason("");
      setMessage("Grupo criado.");
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível criar o grupo.");
    }
  }

  // Arquivar grupo: ver <ArchiveGroupButton /> no JSX — a confirmação em
  // duas etapas (âmbar/atenção, não é exclusão) e o erro inline moram no
  // componente. Aqui ficam só a chamada real e a recarga com aviso.
  function archiveGroupRequest(id: string) {
    return apiClient.archiveProductFeedbackGroup(id);
  }
  async function afterGroupArchived() {
    setMessage("Grupo arquivado.");
    await loadAll();
  }

  function startEditingGroup(group: Group) {
    setGroupEdits((prev) => ({
      ...prev,
      [group.id]: {
        effect: group.effect,
        priority: group.priority,
        active: group.active,
        expiresAt: group.expiresAt,
        reason: group.reason,
      },
    }));
  }

  async function saveGroupEdit(groupId: string) {
    const edit = groupEdits[groupId];
    if (!edit) return;
    try {
      await apiClient.updateProductFeedbackGroup(groupId, {
        effect: edit.effect,
        priority: edit.priority,
        active: edit.active,
        expiresAt: edit.expiresAt ?? null,
        reason: edit.reason ?? undefined,
      });
      setGroupEdits((prev) => {
        const next = { ...prev };
        delete next[groupId];
        return next;
      });
      setMessage("Grupo atualizado.");
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar o grupo.");
    }
  }

  async function toggleGroupExpanded(groupId: string) {
    if (expandedGroupId === groupId) {
      setExpandedGroupId(null);
      setGroupMembers([]);
      return;
    }
    setExpandedGroupId(groupId);
    setGroupMembersLoading(true);
    try {
      const res = await apiClient.getProductFeedbackGroupMembers(groupId);
      setGroupMembers(res.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar os membros do grupo.");
    } finally {
      setGroupMembersLoading(false);
    }
  }

  async function removeGroupMember(groupId: string, userId: string) {
    try {
      await apiClient.removeProductFeedbackGroupMember(groupId, userId);
      setGroupMembers((prev) => prev.filter((m) => m.userId !== userId));
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível remover o membro.");
    }
  }

  function toggleUserSelected(userId: string) {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  function toggleSelectAllOnPage() {
    setSelectedUserIds((prev) => {
      const allSelected = users.every((u) => prev.has(u.id));
      if (allSelected) return new Set();
      return new Set(users.map((u) => u.id));
    });
  }

  async function applyBatchOverride(effect: "ALLOW" | "DENY" | "INHERIT") {
    if (selectedUserIds.size === 0) return;
    try {
      await apiClient.batchSetProductFeedbackOverride({
        userIds: Array.from(selectedUserIds),
        effect,
        reason: batchReason.trim() || undefined,
      });
      setMessage(`${selectedUserIds.size} usuário(s) atualizado(s).`);
      setSelectedUserIds(new Set());
      setBatchReason("");
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível aplicar em lote.");
    }
  }

  async function applyBatchAddToGroup() {
    if (selectedUserIds.size === 0 || !batchGroupId) return;
    try {
      await apiClient.addProductFeedbackGroupMembers(batchGroupId, Array.from(selectedUserIds));
      setMessage(`${selectedUserIds.size} usuário(s) adicionado(s) ao grupo.`);
      setSelectedUserIds(new Set());
      setBatchGroupId("");
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível adicionar ao grupo.");
    }
  }

  async function runSimulation(userId: string) {
    try {
      const res = await apiClient.simulateProductFeedbackAccess(userId);
      setSimulateResults((prev) => ({ ...prev, [userId]: res }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível simular o acesso.");
    }
  }

  // Mesmo cabeçalho gradiente nos 3 estados (negado/checando/pronto) — troca
  // de conteúdo interno, nunca de shell, pra não "piscar" outro visual
  // enquanto a permissão ainda está sendo resolvida.
  const header = (
    <div
      className="relative overflow-hidden flex flex-wrap items-center gap-3 rounded-xl px-4 py-3 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.15)]"
      style={{ background: "linear-gradient(90deg, #0a1628 0%, #3b1f6e 50%, #c81a7f 100%)" }}
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15">
          <KeyRound className="h-4.5 w-4.5 text-white" />
        </div>
        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-bold text-white leading-tight truncate">Acesso aos chamados</h1>
          <p className="text-[11px] text-white/70 leading-snug">
            Controla quem pode usar o botão “Ajuda e sugestões” e ver o próprio histórico de chamados.
          </p>
        </div>
      </div>
      {permissionCheck === "granted" && (
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {config?.roadmapInternalUrl && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5 bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white"
              onClick={() => void roadmapPanel.open()}
              disabled={roadmapPanel.loading}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {roadmapPanel.loading ? "Abrindo..." : "Abrir painel interno"}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5 bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white"
            onClick={() => void loadAll()}
            disabled={loading}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            Atualizar
          </Button>
        </div>
      )}
    </div>
  );

  if (!isAdmin || permissionCheck === "denied") {
    return (
      <DashboardShellFrame>
        <div className="space-y-4">
          {header}
          <p className="text-sm text-muted-foreground px-1">Você não tem permissão para ver esta página.</p>
        </div>
      </DashboardShellFrame>
    );
  }

  if (permissionCheck === "checking") {
    return (
      <DashboardShellFrame>
        <div className="space-y-4">{header}</div>
      </DashboardShellFrame>
    );
  }

  return (
    <DashboardShellFrame>
      <div className="space-y-4">
      {header}

      {(error || roadmapPanel.error) && (
        <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm px-4 py-3 dark:bg-red-950/30 dark:border-red-800 dark:text-red-300 flex items-center justify-between">
          {error || roadmapPanel.error}
          <button onClick={() => setError("")} aria-label="Fechar">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {message && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm px-4 py-3 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-300 flex items-center justify-between">
          {message}
          <button onClick={() => setMessage("")} aria-label="Fechar">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Configuração global ─────────────────────────────────────────── */}
      <div className={cn(STANDARD_SHELL_TABLE_CARD_CLASS, "p-5 space-y-4")}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Switch checked={config?.enabled ?? false} onCheckedChange={toggleEnabled} disabled={!config || !canEdit} />
            <div>
              <p className="text-sm font-medium">Produto ligado</p>
              <p className="text-xs text-gray-500">
                {config?.technicallyConfigured ? (
                  <span className="text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Integração técnica configurada
                  </span>
                ) : (
                  <span className="text-amber-600 dark:text-amber-400 inline-flex items-center gap-1">
                    <ShieldAlert className="h-3.5 w-3.5" /> Integração técnica não configurada — não é possível ligar o produto
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="w-full sm:w-72">
            <label className="text-xs font-medium text-gray-500 mb-1 block">Política padrão</label>
            <Select value={config?.defaultPolicy ?? "ALLOW_ALL_ACTIVE"} onValueChange={(v) => changePolicy(v as Policy)} disabled={!canEdit}>
              <SelectTrigger className="w-full text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(policyLabels) as Policy[]).map((value) => (
                  <SelectItem key={value} value={value}>
                    {policyLabels[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* ── Resumo ───────────────────────────────────────────────────────── */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Liberados", value: summary.released, icon: CheckCircle2, color: "text-emerald-600" },
            { label: "Bloqueados", value: summary.blocked, icon: Ban, color: "text-red-600" },
            { label: "Exceções (override)", value: summary.exceptions, icon: ShieldAlert, color: "text-amber-600" },
            { label: "Inativos", value: summary.inactive, icon: Users, color: "text-gray-500" },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-2xl border border-[#e6ebf3] dark:border-slate-700/60 bg-background p-4 shadow-[0_12px_32px_rgba(15,23,42,0.06)]"
            >
              <div className="flex items-center gap-2">
                <card.icon className={cn("h-4 w-4", card.color)} />
                <span className="text-xs text-gray-500">{card.label}</span>
              </div>
              <p className="text-2xl font-bold mt-1">{card.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Grupos ───────────────────────────────────────────────────────── */}
      <div className={cn(STANDARD_SHELL_TABLE_CARD_CLASS, "p-5 space-y-4")}>
        <h2 className="text-sm font-semibold">Grupos de acesso</h2>
        {canEdit && (
        <div className="flex flex-wrap gap-2 items-end">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Nome</label>
            <Input value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} className="w-48 text-xs" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Efeito</label>
            <Select value={newGroupEffect} onValueChange={(v) => setNewGroupEffect(v as "ALLOW" | "DENY")}>
              <SelectTrigger className="w-28 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALLOW">ALLOW</SelectItem>
                <SelectItem value="DENY">DENY</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Prioridade</label>
            <Input
              type="number"
              value={newGroupPriority}
              onChange={(e) => setNewGroupPriority(Number(e.target.value) || 0)}
              className="w-24 text-xs"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Expira em (opcional)</label>
            <Input
              type="date"
              value={newGroupExpiresAt}
              onChange={(e) => setNewGroupExpiresAt(e.target.value)}
              className="w-36 text-xs"
            />
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="text-xs text-gray-500 block mb-1">Motivo (opcional)</label>
            <Input value={newGroupReason} onChange={(e) => setNewGroupReason(e.target.value)} className="w-full text-xs" />
          </div>
          <Button size="sm" className="btn-brand text-xs gap-1.5" onClick={() => void createGroup()}>
            <PlusCircle className="h-3.5 w-3.5" />
            Criar grupo
          </Button>
        </div>
        )}
        <div className="space-y-2">
          {groups.length === 0 && <p className="text-xs text-gray-400">Nenhum grupo criado ainda.</p>}
          {groups.map((g) => {
            const isExpanded = expandedGroupId === g.id;
            const edit = groupEdits[g.id];
            return (
              <div key={g.id} className="rounded-lg border border-border/60">
                <div className="flex items-center justify-between gap-2 px-3 py-2">
                  <button
                    type="button"
                    className="flex items-center gap-2 text-xs flex-1 text-left"
                    onClick={() => void toggleGroupExpanded(g.id)}
                  >
                    {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                    <Badge variant={g.effect === "ALLOW" ? "default" : "destructive"} className="text-[10px]">
                      {g.effect}
                    </Badge>
                    <span className="font-medium">{g.name}</span>
                    {!g.active && <span className="text-gray-400">(inativo)</span>}
                    <span className="text-gray-400">prioridade {g.priority}</span>
                    <span className="text-gray-400">{g.memberCount} membro{g.memberCount !== 1 ? "s" : ""}</span>
                    {g.expiresAt && <span className="text-gray-400">expira {toDateInputValue(g.expiresAt)}</span>}
                  </button>
                  {canEdit && (
                  <div className="flex gap-1 shrink-0">
                    {!edit && (
                      <Button variant="ghost" size="sm" className="text-xs" onClick={() => startEditingGroup(g)}>
                        Editar
                      </Button>
                    )}
                    <ArchiveGroupButton
                      groupName={g.name}
                      memberCount={g.memberCount}
                      onArchive={() => archiveGroupRequest(g.id)}
                      onArchived={afterGroupArchived}
                    />
                  </div>
                  )}
                </div>

                {edit && (
                  <div className="border-t border-border/40 px-3 py-3 flex flex-wrap gap-2 items-end bg-gray-50 dark:bg-gray-900/30">
                    <div>
                      <label className="text-[10px] text-gray-500 block mb-1">Efeito</label>
                      <Select
                        value={edit.effect}
                        onValueChange={(v) => setGroupEdits((prev) => ({ ...prev, [g.id]: { ...prev[g.id], effect: v as "ALLOW" | "DENY" } }))}
                      >
                        <SelectTrigger className="w-24 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALLOW">ALLOW</SelectItem>
                          <SelectItem value="DENY">DENY</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 block mb-1">Prioridade</label>
                      <Input
                        type="number"
                        value={edit.priority ?? 0}
                        onChange={(e) => setGroupEdits((prev) => ({ ...prev, [g.id]: { ...prev[g.id], priority: Number(e.target.value) || 0 } }))}
                        className="w-20 text-xs"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Switch
                        checked={edit.active ?? true}
                        onCheckedChange={(v) => setGroupEdits((prev) => ({ ...prev, [g.id]: { ...prev[g.id], active: v } }))}
                      />
                      <span className="text-[10px] text-gray-500">Ativo</span>
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 block mb-1">Expira em</label>
                      <Input
                        type="date"
                        value={toDateInputValue(edit.expiresAt ?? null)}
                        onChange={(e) =>
                          setGroupEdits((prev) => ({ ...prev, [g.id]: { ...prev[g.id], expiresAt: dateInputToIso(e.target.value) } }))
                        }
                        className="w-36 text-xs"
                      />
                    </div>
                    <div className="flex-1 min-w-[160px]">
                      <label className="text-[10px] text-gray-500 block mb-1">Motivo</label>
                      <Input
                        value={edit.reason ?? ""}
                        onChange={(e) => setGroupEdits((prev) => ({ ...prev, [g.id]: { ...prev[g.id], reason: e.target.value } }))}
                        className="w-full text-xs"
                      />
                    </div>
                    <Button size="sm" className="btn-brand text-xs" onClick={() => void saveGroupEdit(g.id)}>
                      Salvar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs"
                      onClick={() =>
                        setGroupEdits((prev) => {
                          const next = { ...prev };
                          delete next[g.id];
                          return next;
                        })
                      }
                    >
                      Cancelar
                    </Button>
                  </div>
                )}

                {isExpanded && (
                  <div className="border-t border-border/40 px-3 py-3">
                    <p className="text-[10px] font-semibold text-gray-500 mb-2">Membros</p>
                    {groupMembersLoading && <p className="text-xs text-gray-400">Carregando...</p>}
                    {!groupMembersLoading && groupMembers.length === 0 && (
                      <p className="text-xs text-gray-400">Nenhum membro. Selecione usuários na tabela abaixo e use “Adicionar ao grupo”.</p>
                    )}
                    <div className="space-y-1">
                      {groupMembers.map((m) => (
                        <div key={m.userId} className="flex items-center justify-between text-xs py-1">
                          <span>
                            {m.name} <span className="text-gray-400">({m.email})</span>
                          </span>
                          {canEdit && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2 text-[10px] text-red-600"
                              onClick={() => void removeGroupMember(g.id, m.userId)}
                            >
                              Remover
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Usuários ─────────────────────────────────────────────────────── */}
      <div className={cn(STANDARD_SHELL_TABLE_CARD_CLASS, "p-5 space-y-4")}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">Usuários</h2>
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder="Buscar por nome, e-mail ou código"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadAll()}
              className="w-64 text-xs"
            />
            <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
              <SelectTrigger className="w-40 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="allowed">Liberados</SelectItem>
                <SelectItem value="blocked">Bloqueados</SelectItem>
                <SelectItem value="override">Com exceção</SelectItem>
                <SelectItem value="inactive">Inativos</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" className="text-xs" onClick={() => void loadAll()}>
              Buscar
            </Button>
          </div>
        </div>

        {selectedUserIds.size > 0 && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800 px-3 py-2.5 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium">{selectedUserIds.size} selecionado(s)</span>
            <Input
              placeholder="Motivo (opcional)"
              value={batchReason}
              onChange={(e) => setBatchReason(e.target.value)}
              className="w-48 text-xs"
            />
            <Button size="sm" className="h-7 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => void applyBatchOverride("ALLOW")}>
              Liberar selecionados
            </Button>
            <Button size="sm" variant="destructive" className="h-7 text-[10px]" onClick={() => void applyBatchOverride("DENY")}>
              Bloquear selecionados
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => void applyBatchOverride("INHERIT")}>
              Herdar (remover exceção)
            </Button>
            <span className="text-gray-300">|</span>
            <Select value={batchGroupId} onValueChange={setBatchGroupId}>
              <SelectTrigger className="w-40 h-7 text-[10px]" aria-label="Escolher grupo para adicionar em lote">
                <SelectValue placeholder="Escolher grupo" />
              </SelectTrigger>
              <SelectContent>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" className="h-7 text-[10px]" disabled={!batchGroupId} onClick={() => void applyBatchAddToGroup()}>
              Adicionar ao grupo
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-[10px] ml-auto" onClick={() => setSelectedUserIds(new Set())}>
              Limpar seleção
            </Button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-gray-500 border-b border-border/60">
                <th className="py-2 pr-3">
                  {canEdit && (
                    <input
                      type="checkbox"
                      checked={users.length > 0 && users.every((u) => selectedUserIds.has(u.id))}
                      onChange={toggleSelectAllOnPage}
                      aria-label="Selecionar todos nesta página"
                    />
                  )}
                </th>
                <th className="py-2 pr-3">Nome</th>
                <th className="py-2 pr-3">E-mail</th>
                <th className="py-2 pr-3">Acesso</th>
                <th className="py-2 pr-3">Origem</th>
                <th className="py-2 pr-3">Exceção</th>
                <th className="py-2 pr-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <Fragment key={u.id}>
                  <tr className="border-b border-border/40">
                    <td className="py-2 pr-3">
                      {canEdit && (
                        <input
                          type="checkbox"
                          checked={selectedUserIds.has(u.id)}
                          onChange={() => toggleUserSelected(u.id)}
                          aria-label={`Selecionar ${u.name}`}
                        />
                      )}
                    </td>
                    <td className="py-2 pr-3">{u.name}</td>
                    <td className="py-2 pr-3 text-gray-500">{u.email}</td>
                    <td className="py-2 pr-3">
                      <Badge variant={u.canUse ? "default" : "destructive"} className="text-[10px]">
                        {u.canUse ? "Liberado" : "Bloqueado"}
                      </Badge>
                    </td>
                    <td className="py-2 pr-3 text-gray-400">{u.source}</td>
                    <td className="py-2 pr-3 text-gray-400">{u.override ? u.override.effect : "—"}</td>
                    <td className="py-2 pr-3">
                      <div className="flex gap-1">
                        {canEdit && (
                          <>
                            <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-emerald-600" onClick={() => setOverride(u.id, "ALLOW")}>
                              Liberar
                            </Button>
                            <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-red-600" onClick={() => setOverride(u.id, "DENY")}>
                              Bloquear
                            </Button>
                            {u.override && (
                              <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-gray-500" onClick={() => setOverride(u.id, "INHERIT")}>
                                Herdar
                              </Button>
                            )}
                          </>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-[10px] text-blue-600 gap-1"
                          onClick={() => void runSimulation(u.id)}
                        >
                          <FlaskConical className="h-3 w-3" />
                          Simular
                        </Button>
                      </div>
                    </td>
                  </tr>
                  {simulateResults[u.id] && (
                    <tr className="border-b border-border/40 bg-blue-50/50 dark:bg-blue-950/20">
                      <td></td>
                      <td colSpan={6} className="py-1.5 pr-3 text-[10px] text-gray-600 dark:text-gray-300">
                        Simulação: {simulateResults[u.id]!.canUse ? "liberado" : "bloqueado"} — motivo interno: {simulateResults[u.id]!.reason} (origem: {simulateResults[u.id]!.source})
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>
            Página {pagination.page} — {pagination.total} usuário{pagination.total !== 1 ? "s" : ""}
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="text-xs"
              disabled={pagination.page <= 1}
              onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
            >
              Anterior
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-xs"
              disabled={pagination.page * pagination.limit >= pagination.total}
              onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
            >
              Próxima
            </Button>
          </div>
        </div>
      </div>

      <CentralChamadosAccessPanel />

      {/* ── Auditoria ────────────────────────────────────────────────────── */}
      <div className={cn(STANDARD_SHELL_TABLE_CARD_CLASS, "p-5 space-y-2")}>
        <h2 className="text-sm font-semibold">Auditoria</h2>
        {audit.length === 0 && <p className="text-xs text-gray-400">Nenhum evento registrado ainda.</p>}
        {audit.map((entry) => (
          <div key={entry.id} className="text-xs border-b border-border/40 py-1.5 flex items-center justify-between gap-2">
            <span className="truncate">
              {entry.action}
              {entry.reason && <span className="text-gray-400"> — {entry.reason}</span>}
            </span>
            <span className="text-gray-400 shrink-0">{new Date(entry.created_at).toLocaleString("pt-BR")}</span>
          </div>
        ))}
        <div className="flex items-center justify-between text-xs text-gray-500 pt-2">
          <span>
            Página {auditPagination.page} — {auditPagination.total} evento{auditPagination.total !== 1 ? "s" : ""}
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="text-xs"
              disabled={auditPagination.page <= 1}
              onClick={() => setAuditPagination((p) => ({ ...p, page: p.page - 1 }))}
            >
              Anterior
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-xs"
              disabled={auditPagination.page * auditPagination.limit >= auditPagination.total}
              onClick={() => setAuditPagination((p) => ({ ...p, page: p.page + 1 }))}
            >
              Próxima
            </Button>
          </div>
        </div>
      </div>
      </div>
    </DashboardShellFrame>
  );
}
