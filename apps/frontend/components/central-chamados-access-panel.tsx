import { useCallback, useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { apiClient } from "@/lib/api-client";

type Row = {
  id: string;
  name: string;
  email: string;
  userCode: string | null;
  accountType: string;
  role: string;
  isActive: boolean;
  status: string;
  profileId: string | null;
  profileName: string | null;
  isDedicatedProfile: boolean;
  hasExplicitCentralChamados: boolean;
  canOpenRoadmap: boolean;
};

type ConfirmState = { mode: "grant" | "revoke"; ids: string[]; label: string };

/**
 * Grants/revokes the "central_chamados" AdminPermission — the module that
 * lets a non-admin account (a developer or QA reviewer) see "Roadmap e
 * chamados" in the sidebar and use the SSO handoff, without the broader
 * "sistema" module. Search/filter/batch/per-user, all with confirmation and
 * automatic audit trail (feeds the same audit log below on this page —
 * apps/backend/src/routes/central-chamados-admin.ts writes to the same
 * ProductFeedbackAccessAudit table).
 *
 * The underlying permission model only allows ONE profile per user — this
 * panel works with that constraint explicitly (a dedicated, well-known
 * profile) rather than hiding it: granting a user who already has a
 * DIFFERENT profile is refused by the backend with a clear message, never
 * silently swapped.
 */
export function CentralChamadosAccessPanel() {
  const [items, setItems] = useState<Row[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "holders" | "dedicated_profile">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [reason, setReason] = useState("");
  const [applying, setApplying] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiClient.getCentralChamadosUsers({
        page: pagination.page,
        limit: pagination.limit,
        search: search || undefined,
        filter,
      });
      setItems(res.items);
      setPagination((p) => ({ ...p, total: res.pagination.total }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar usuários.");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, pagination.limit, search, filter]);

  useEffect(() => {
    void load();
  }, [load]);

  function toggleSelected(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function applyConfirmed() {
    if (!confirmState) return;
    setApplying(true);
    setError("");
    try {
      if (confirmState.mode === "grant") {
        if (confirmState.ids.length === 1) {
          await apiClient.grantCentralChamados(confirmState.ids[0], reason || undefined);
        } else {
          const res = await apiClient.batchGrantCentralChamados(confirmState.ids, reason || undefined);
          if (res.skipped.length > 0) {
            setError(`${res.granted} liberado(s). ${res.skipped.length} pulado(s): ${res.skipped.map((s) => `${s.name} (${s.reason})`).join("; ")}`);
          }
        }
      } else {
        if (confirmState.ids.length === 1) {
          await apiClient.revokeCentralChamados(confirmState.ids[0], reason || undefined);
        } else {
          const res = await apiClient.batchRevokeCentralChamados(confirmState.ids, reason || undefined);
          if (res.skipped.length > 0) {
            setError(`${res.revoked} removido(s). ${res.skipped.length} pulado(s): ${res.skipped.map((s) => `${s.name} (${s.reason})`).join("; ")}`);
          }
        }
      }
      setSelected(new Set());
      setConfirmState(null);
      setReason("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível aplicar a alteração.");
      setConfirmState(null);
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="rounded-xl border border-border/70 bg-background p-5 shadow-sm space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-sm font-semibold">Acesso à Central de Roadmap (permissão central_chamados)</h2>
          <p className="text-xs text-gray-500 max-w-xl">
            Libera o item &quot;Roadmap e chamados&quot; na sidebar e o login único para quem não deve ter o
            módulo &quot;sistema&quot; inteiro — desenvolvedores, QA ou qualquer conta interna.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              placeholder="Buscar por nome, e-mail ou código"
              className="h-8 pl-7 text-xs w-56"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value as typeof filter);
              setPagination((p) => ({ ...p, page: 1 }));
            }}
            className="h-8 text-xs rounded-md border border-input bg-background px-2"
          >
            <option value="all">Todos</option>
            <option value="holders">Só quem tem acesso</option>
            <option value="dedicated_profile">Perfil dedicado desta tela</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 text-xs px-3 py-2 dark:bg-red-950/30 dark:border-red-800 dark:text-red-300">
          {error}
        </div>
      )}

      {selected.size > 0 && (
        <div className="flex items-center gap-2 text-xs bg-muted/50 rounded-lg px-3 py-2">
          <span>{selected.size} selecionado{selected.size !== 1 ? "s" : ""}</span>
          <Button
            size="sm"
            className="h-7 text-xs"
            onClick={() =>
              setConfirmState({
                mode: "grant",
                ids: Array.from(selected),
                label: `Liberar acesso para ${selected.size} usuário(s)`,
              })
            }
          >
            Liberar selecionados
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={() =>
              setConfirmState({
                mode: "revoke",
                ids: Array.from(selected),
                label: `Remover acesso de ${selected.size} usuário(s)`,
              })
            }
          >
            Remover selecionados
          </Button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-gray-500 border-b border-border/60">
              <th className="py-2 pr-2 w-8" />
              <th className="py-2 pr-2">Usuário</th>
              <th className="py-2 pr-2">Tipo de conta</th>
              <th className="py-2 pr-2">Perfil</th>
              <th className="py-2 pr-2">Acesso</th>
              <th className="py-2 pr-2 text-right">Ação</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="py-4 text-center text-gray-400">
                  Carregando...
                </td>
              </tr>
            )}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={6} className="py-4 text-center text-gray-400">
                  Nenhum usuário encontrado.
                </td>
              </tr>
            )}
            {items.map((row) => (
              <tr key={row.id} className="border-b border-border/30">
                <td className="py-2 pr-2">
                  <input type="checkbox" checked={selected.has(row.id)} onChange={() => toggleSelected(row.id)} />
                </td>
                <td className="py-2 pr-2">
                  <div className="font-medium">{row.name}</div>
                  <div className="text-gray-400">{row.email}</div>
                </td>
                <td className="py-2 pr-2">{row.accountType}</td>
                <td className="py-2 pr-2">{row.profileName ?? "—"}</td>
                <td className="py-2 pr-2">
                  <Badge variant={row.canOpenRoadmap ? "default" : "secondary"} className="text-[10px]">
                    {row.canOpenRoadmap ? "Tem acesso" : "Sem acesso"}
                  </Badge>
                </td>
                <td className="py-2 pr-2 text-right">
                  {row.isDedicatedProfile || !row.profileId ? (
                    row.hasExplicitCentralChamados ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => setConfirmState({ mode: "revoke", ids: [row.id], label: `Remover acesso de ${row.name}` })}
                      >
                        Remover
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setConfirmState({ mode: "grant", ids: [row.id], label: `Liberar acesso para ${row.name}` })}
                      >
                        Liberar
                      </Button>
                    )
                  ) : (
                    <span className="text-gray-400" title={`Perfil "${row.profileName}" não é o dedicado desta tela — ajuste em Permissões.`}>
                      Perfil próprio
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
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

      <ConfirmationDialog
        open={confirmState !== null}
        onClose={() => {
          if (applying) return;
          setConfirmState(null);
          setReason("");
        }}
        onConfirm={() => void applyConfirmed()}
        title={confirmState?.label ?? ""}
        message={
          <div className="space-y-2">
            <p>
              {confirmState?.mode === "grant"
                ? 'Isso atribui o perfil dedicado "Acesso — Central de Roadmap" (só a permissão central_chamados/view). Se o usuário já tiver outro perfil, a mudança é recusada em vez de sobrescrever.'
                : "Isso remove o perfil dedicado, voltando a conta ao estado padrão."}
            </p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Motivo (opcional, fica registrado na auditoria)"
              className="w-full text-xs rounded-md border border-input bg-background p-2"
              rows={2}
            />
          </div>
        }
        confirmText={applying ? "Aplicando..." : confirmState?.mode === "grant" ? "Liberar" : "Remover"}
        destructive={confirmState?.mode === "revoke"}
      />
    </div>
  );
}
