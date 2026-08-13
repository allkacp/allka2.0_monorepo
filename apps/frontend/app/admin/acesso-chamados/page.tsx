import { useCallback, useEffect, useState } from "react";
import { ExternalLink, RefreshCw, ShieldAlert, Users, Ban, CheckCircle2, PlusCircle } from "lucide-react";
import { PageHeader } from "@/components/page-header";
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

const policyLabels: Record<Policy, string> = {
  ALLOW_ALL_ACTIVE: "Liberar para todo usuário ativo (padrão)",
  DENY_ALL_EXCEPT_ALLOWED: "Bloquear todos, exceto quem for liberado",
};

export default function AcessoAosChamadosPage() {
  const isAdmin = tipoDaContaLogada() === "admin";

  const [config, setConfig] = useState<ConfigResponse | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "allowed" | "blocked" | "override" | "inactive">("all");
  const [groups, setGroups] = useState<Group[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupEffect, setNewGroupEffect] = useState<"ALLOW" | "DENY">("ALLOW");
  const [newGroupPriority, setNewGroupPriority] = useState(0);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [cfg, sum, usersRes, groupsRes, auditRes] = await Promise.all([
        apiClient.getProductFeedbackAdminConfig(),
        apiClient.getProductFeedbackAdminSummary(),
        apiClient.getProductFeedbackAdminUsers({ page: pagination.page, limit: pagination.limit, search, filter }),
        apiClient.getProductFeedbackGroups(),
        apiClient.getProductFeedbackAudit({ limit: 20 }),
      ]);
      setConfig(cfg);
      setSummary(sum);
      setUsers(usersRes.items);
      setPagination(usersRes.pagination);
      setGroups(groupsRes.items);
      setAudit(auditRes.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar os dados.");
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, filter]);

  useEffect(() => {
    if (isAdmin) void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, pagination.page, filter]);

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
      });
      setNewGroupName("");
      setNewGroupPriority(0);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível criar o grupo.");
    }
  }

  async function archiveGroup(id: string) {
    if (!window.confirm("Arquivar este grupo? Ele deixa de valer para todos os membros.")) return;
    try {
      await apiClient.archiveProductFeedbackGroup(id);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível arquivar o grupo.");
    }
  }

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <PageHeader title="Acesso aos chamados" description="Acesso restrito ao Admin." />
        <p className="text-sm text-gray-500">Você não tem permissão para ver esta página.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Acesso aos chamados"
        description="Controla quem pode usar o botão “Ajuda e sugestões” e ver o próprio histórico de chamados."
        actions={
          <div className="flex items-center gap-2">
            {config?.roadmapInternalUrl && (
              <a href={config.roadmapInternalUrl} target="_blank" rel="noreferrer">
                <Button variant="outline" size="sm" className="text-xs gap-1.5">
                  <ExternalLink className="h-3.5 w-3.5" />
                  Abrir painel interno
                </Button>
              </a>
            )}
            <Button variant="ghost" size="sm" className="text-xs gap-1.5" onClick={() => void loadAll()} disabled={loading}>
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
              Atualizar
            </Button>
          </div>
        }
      />

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm px-4 py-3 dark:bg-red-950/30 dark:border-red-800 dark:text-red-300">
          {error}
        </div>
      )}

      {/* ── Configuração global ─────────────────────────────────────────── */}
      <div className="rounded-xl border border-border/70 bg-background p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Switch checked={config?.enabled ?? false} onCheckedChange={toggleEnabled} disabled={!config} />
            <div>
              <p className="text-sm font-medium">Produto ligado</p>
              <p className="text-xs text-gray-500">
                {config?.technicallyConfigured ? (
                  <span className="text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Integração técnica configurada
                  </span>
                ) : (
                  <span className="text-amber-600 dark:text-amber-400 inline-flex items-center gap-1">
                    <ShieldAlert className="h-3.5 w-3.5" /> Integração técnica não configurada — ninguém consegue usar mesmo com o produto ligado
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="w-full sm:w-72">
            <label className="text-xs font-medium text-gray-500 mb-1 block">Política padrão</label>
            <Select value={config?.defaultPolicy ?? "ALLOW_ALL_ACTIVE"} onValueChange={(v) => changePolicy(v as Policy)}>
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
            <div key={card.label} className="rounded-xl border border-border/70 bg-background p-4 shadow-sm">
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
      <div className="rounded-xl border border-border/70 bg-background p-5 shadow-sm space-y-4">
        <h2 className="text-sm font-semibold">Grupos de acesso</h2>
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
          <Button size="sm" className="btn-brand text-xs gap-1.5" onClick={() => void createGroup()}>
            <PlusCircle className="h-3.5 w-3.5" />
            Criar grupo
          </Button>
        </div>
        <div className="space-y-2">
          {groups.length === 0 && <p className="text-xs text-gray-400">Nenhum grupo criado ainda.</p>}
          {groups.map((g) => (
            <div key={g.id} className="flex items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2">
              <div className="flex items-center gap-2 text-xs">
                <Badge variant={g.effect === "ALLOW" ? "default" : "destructive"} className="text-[10px]">
                  {g.effect}
                </Badge>
                <span className="font-medium">{g.name}</span>
                <span className="text-gray-400">prioridade {g.priority}</span>
                <span className="text-gray-400">{g.memberCount} membro{g.memberCount !== 1 ? "s" : ""}</span>
              </div>
              <Button variant="ghost" size="sm" className="text-xs text-red-600" onClick={() => void archiveGroup(g.id)}>
                Arquivar
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* ── Usuários ─────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border/70 bg-background p-5 shadow-sm space-y-4">
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

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-gray-500 border-b border-border/60">
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
                <tr key={u.id} className="border-b border-border/40">
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
                    </div>
                  </td>
                </tr>
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

      {/* ── Auditoria ────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border/70 bg-background p-5 shadow-sm space-y-2">
        <h2 className="text-sm font-semibold">Auditoria recente</h2>
        {audit.length === 0 && <p className="text-xs text-gray-400">Nenhum evento registrado ainda.</p>}
        {audit.map((entry) => (
          <div key={entry.id} className="text-xs border-b border-border/40 py-1.5 flex items-center justify-between">
            <span>{entry.action}</span>
            <span className="text-gray-400">{new Date(entry.created_at).toLocaleString("pt-BR")}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
