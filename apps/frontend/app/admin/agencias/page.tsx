import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Building2, Loader2, Search, Users } from "lucide-react";
import {
  StandardPageBanner,
  STANDARD_SHELL_PANEL_CLASS,
} from "@/components/standard-page-shell";
import { ExportButton } from "@/components/export-button";
import { PinToTrayButton } from "@/components/pin-to-tray-button";
import { ItemsPerPageSelect } from "@/components/items-per-page-select";
import { useItemsPerPage } from "@/lib/use-items-per-page";
import { LegacyIdBadge } from "@/components/legacy-id-badge";
import { apiClient } from "@/lib/api-client";
import { cn } from "@/lib/utils";

/**
 * Admin › Agências.
 *
 * A pasta existia vazia: as agências eram o único cadastro grande da
 * plataforma sem tela própria no Admin — dava para vê-las apenas de relance,
 * dentro de outros contextos. Com a importação da base antiga são 100
 * registros, então a lista passou a fazer falta de verdade.
 *
 * Segue o padrão de tela com tabela principal (painel + banner + toolbar),
 * mesmo shell de /admin/clientes.
 */

interface Agencia {
  id: string;
  sequence_number: number | null;
  name: string;
  cnpj: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  city: string | null;
  state: string | null;
  partner_level: string | null;
  legacy_id: number | null;
  created_at: string;
  user?: { name?: string; email?: string } | null;
  owner?: { name?: string; email?: string } | null;
  _count?: { members?: number; client_links?: number };
}

const STATUS_CFG: Record<string, { label: string; className: string }> = {
  ativo: {
    label: "Ativa",
    className:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800",
  },
  inativo: {
    label: "Inativa",
    className:
      "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  },
};

export default function AdminAgenciasPage() {
  const pageRef = useRef<HTMLDivElement>(null);
  const [agencias, setAgencias] = useState<Agencia[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  // Padrão da plataforma: a lista abre só com o que está ativo.
  const [status, setStatus] = useState<"ativo" | "inativo" | "todos">("ativo");
  const [pagina, setPagina] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useItemsPerPage("admin-agencias", 25);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const resp: any = await apiClient.getAgencies({ limit: 500 });
      setAgencias(Array.isArray(resp?.data) ? resp.data : Array.isArray(resp) ? resp : []);
    } catch (e: any) {
      setErro(e?.message ?? "Não foi possível carregar as agências.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return agencias.filter((a) => {
      const okStatus = status === "todos" || a.status === status;
      if (!okStatus) return false;
      if (!termo) return true;
      return [a.name, a.email, a.cnpj, a.city, String(a.legacy_id ?? "")]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(termo));
    });
  }, [agencias, busca, status]);

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / itemsPerPage));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const visiveis = filtradas.slice(
    (paginaAtual - 1) * itemsPerPage,
    paginaAtual * itemsPerPage,
  );

  const contagem = useMemo(
    () => ({
      total: agencias.length,
      ativas: agencias.filter((a) => a.status === "ativo").length,
      importadas: agencias.filter((a) => a.legacy_id != null).length,
    }),
    [agencias],
  );

  return (
    <div className={STANDARD_SHELL_PANEL_CLASS}>
      <div ref={pageRef} className="relative h-full min-h-0 flex flex-col overflow-hidden">
        <div className="shrink-0 -mb-[11px]">
          <StandardPageBanner
            icon={Building2}
            title="Agências"
            description="Agências parceiras da plataforma — donos, vínculos com clientes e origem do cadastro"
            actions={
              <>
                <div className="bg-white rounded-lg">
                  <ExportButton pageRef={pageRef} filename="agencias" />
                </div>
                <PinToTrayButton
                  id="page-agencias"
                  label="Agências"
                  icon={Building2}
                  path="/admin/agencias"
                />
              </>
            }
          />
        </div>

        <div className="flex-1 min-h-0 overflow-auto p-4">
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-2 p-3 border-b border-slate-200 dark:border-slate-700">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  value={busca}
                  onChange={(e) => {
                    setBusca(e.target.value);
                    setPagina(1);
                  }}
                  placeholder="Buscar por nome, e-mail, CNPJ, cidade ou número antigo…"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 pl-8 pr-3 py-2 text-sm outline-none focus:border-[#2558FF]"
                />
              </div>

              <div className="flex items-center gap-1">
                {(["ativo", "inativo", "todos"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setStatus(s);
                      setPagina(1);
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors",
                      status === s
                        ? "bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900"
                        : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
                    )}
                  >
                    {s === "ativo" ? "Ativas" : s === "inativo" ? "Inativas" : "Todas"}
                  </button>
                ))}
              </div>

              {/* O componente trabalha com string (mesmo uso em /admin/clientes). */}
              <ItemsPerPageSelect
                value={String(itemsPerPage)}
                onValueChange={(v) => {
                  setItemsPerPage(Number(v));
                  setPagina(1);
                }}
              />
            </div>

            {/* Resumo */}
            <div className="flex flex-wrap items-center gap-4 px-4 py-2 text-xs text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
              <span>
                <strong className="text-slate-700 dark:text-slate-200">{contagem.total}</strong>{" "}
                agências
              </span>
              <span>
                <strong className="text-emerald-600">{contagem.ativas}</strong> ativas
              </span>
              <span>
                <strong className="text-amber-600">{contagem.importadas}</strong> vindas da
                plataforma antiga
              </span>
              <span className="ml-auto">
                {filtradas.length} no filtro atual
              </span>
            </div>

            {/* Tabela */}
            {carregando ? (
              <div className="flex items-center justify-center gap-2 py-16 text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Carregando agências…</span>
              </div>
            ) : erro ? (
              <div className="py-16 text-center text-sm text-red-600">{erro}</div>
            ) : visiveis.length === 0 ? (
              <div className="py-16 text-center text-sm text-slate-500">
                Nenhuma agência encontrada com os filtros atuais.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                      {["ID", "Agência", "Responsável", "Contato", "Local", "Vínculos", "Status"].map(
                        (h) => (
                          <th
                            key={h}
                            className="py-3 px-4 text-left text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.04em] whitespace-nowrap"
                          >
                            {h}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {visiveis.map((a, i) => {
                      const cfg = STATUS_CFG[a.status] ?? STATUS_CFG.inativo;
                      const dono = a.owner ?? a.user;
                      return (
                        <tr
                          key={a.id}
                          className={cn(
                            "border-b border-slate-100 dark:border-slate-800",
                            i % 2 === 1 && "bg-slate-50/50 dark:bg-slate-900/30",
                          )}
                        >
                          <td className="py-3 px-4 align-top">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-xs font-mono font-semibold text-slate-500 dark:text-slate-400">
                                {a.sequence_number ?? "—"}
                              </span>
                              <LegacyIdBadge legacyId={a.legacy_id} entidade="agência" />
                            </div>
                          </td>
                          <td className="py-3 px-4 align-top">
                            <p className="font-semibold text-slate-800 dark:text-slate-100 leading-tight">
                              {a.name}
                            </p>
                            {a.cnpj && (
                              <p className="text-[11px] text-slate-400 font-mono mt-0.5">{a.cnpj}</p>
                            )}
                          </td>
                          <td className="py-3 px-4 align-top">
                            <p className="text-slate-700 dark:text-slate-300">
                              {dono?.name ?? "—"}
                            </p>
                            {dono?.email && (
                              <p className="text-[11px] text-slate-400">{dono.email}</p>
                            )}
                          </td>
                          <td className="py-3 px-4 align-top text-slate-600 dark:text-slate-300">
                            <p>{a.email ?? "—"}</p>
                            {a.phone && <p className="text-[11px] text-slate-400">{a.phone}</p>}
                          </td>
                          <td className="py-3 px-4 align-top text-slate-600 dark:text-slate-300 whitespace-nowrap">
                            {[a.city, a.state].filter(Boolean).join(" / ") || "—"}
                          </td>
                          <td className="py-3 px-4 align-top whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300">
                              <Users className="h-3.5 w-3.5 text-slate-400" />
                              {a._count?.members ?? 0} usuários
                            </span>
                          </td>
                          <td className="py-3 px-4 align-top">
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                                cfg.className,
                              )}
                            >
                              {cfg.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Paginação */}
            {totalPaginas > 1 && (
              <div className="flex items-center justify-between gap-2 p-3 border-t border-slate-200 dark:border-slate-700">
                <span className="text-xs text-slate-500">
                  Página {paginaAtual} de {totalPaginas}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPagina((p) => Math.max(1, p - 1))}
                    disabled={paginaAtual === 1}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold disabled:opacity-40"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                    disabled={paginaAtual === totalPaginas}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold disabled:opacity-40"
                  >
                    Próxima
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
