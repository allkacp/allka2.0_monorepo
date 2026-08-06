import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  Lock,
  Paperclip,
  PlayCircle,
  Trash2,
  Wallet,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  STANDARD_SHELL_PANEL_CLASS,
  StandardPageBanner,
} from "@/components/standard-page-shell";
import { PinToTrayButton } from "@/components/pin-to-tray-button";
import { apiClient } from "@/lib/api-client";
import { cn } from "@/lib/utils";

/**
 * Nômade › Minhas Tarefas.
 *
 * Até 2026-08-04 esta tela rodava numa lista fixa dentro do próprio arquivo
 * (`MY_TASKS`) — o nômade não via nada da plataforma. Agora consome
 * `GET /api/nomades/me/tarefas`.
 *
 * A unidade de trabalho aqui é a ETAPA, não a tarefa: com o motor de etapas,
 * uma tarefa de "Website" pode ter o layout com uma pessoa e a programação com
 * outra. A tela lista as etapas atribuídas a quem está logado, destaca a que
 * está aberta e é por ela que se entrega.
 */

interface Etapa {
  id: string;
  titulo: string;
  descricao: string | null;
  ordem: number;
  status: string;
  executor_type: string;
  categoria: string | null;
  prazo_execucao: string | null;
  horas_execucao: number | null;
  valor_nomade: number | null;
  exige_anexo: boolean;
}

interface Anexo {
  id: string;
  name: string;
  url: string;
  created_at: string;
}

interface Tarefa {
  id: string;
  task_code: string | null;
  title: string;
  status: string;
  due_date: string | null;
  project?: { project_code?: string; title?: string } | null;
  catalog_task?: { name?: string; category?: string } | null;
  total_etapas: number;
  minhas_etapas: Etapa[];
  etapa_atual: Etapa | null;
  valor_previsto: number;
  responsavel_pela_tarefa: boolean;
}

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtData = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("pt-BR") : "—";

const ETAPA_CFG: Record<string, { label: string; cls: string; Icon: any }> = {
  EM_ANDAMENTO: {
    label: "Para executar",
    cls: "bg-blue-100 text-blue-700 border-blue-200",
    Icon: PlayCircle,
  },
  AGUARDANDO_EXECUTOR: {
    label: "Aguardando início",
    cls: "bg-orange-100 text-orange-700 border-orange-200",
    Icon: Clock,
  },
  CONCLUIDA: {
    label: "Entregue",
    cls: "bg-emerald-100 text-emerald-700 border-emerald-200",
    Icon: CheckCircle2,
  },
  BLOQUEADA: {
    label: "Aguardando etapa anterior",
    cls: "bg-slate-100 text-slate-600 border-slate-200",
    Icon: Lock,
  },
  PENDENTE: {
    label: "Na fila",
    cls: "bg-slate-100 text-slate-600 border-slate-200",
    Icon: Clock,
  },
};

export default function MinhasTarefasPage() {
  const [tab, setTab] = useState<"abertas" | "concluidas">("abertas");
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [entregando, setEntregando] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  // Entregas da etapa. Ficam por etapa (não por tarefa) porque é o anexo da
  // etapa que libera a conclusão quando ela exige arquivo.
  const [anexosPorEtapa, setAnexosPorEtapa] = useState<Record<string, Anexo[]>>({});
  const [formAberto, setFormAberto] = useState<string | null>(null);
  const [novoNome, setNovoNome] = useState("");
  const [novaUrl, setNovaUrl] = useState("");
  const [salvandoAnexo, setSalvandoAnexo] = useState(false);

  const carregarAnexos = useCallback(async (stageId: string) => {
    try {
      const r: any = await apiClient.getEntregasDaEtapa(stageId);
      setAnexosPorEtapa((prev) => ({ ...prev, [stageId]: r?.data ?? [] }));
    } catch {
      /* etapa sem acesso ou sem entrega: lista vazia já é o padrão */
    }
  }, []);

  const anexar = async (stageId: string) => {
    if (!novoNome.trim() || !novaUrl.trim()) return;
    setSalvandoAnexo(true);
    try {
      await apiClient.anexarEntregaNaEtapa(stageId, {
        name: novoNome.trim(),
        url: novaUrl.trim(),
      });
      setNovoNome("");
      setNovaUrl("");
      setFormAberto(null);
      await carregarAnexos(stageId);
    } catch (e: any) {
      setAviso(e?.message ?? "Não foi possível anexar a entrega.");
    } finally {
      setSalvandoAnexo(false);
    }
  };

  const removerAnexo = async (stageId: string, anexoId: string) => {
    try {
      await apiClient.removerEntregaDaEtapa(stageId, anexoId);
      await carregarAnexos(stageId);
    } catch (e: any) {
      setAviso(e?.message ?? "Não foi possível remover.");
    }
  };

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const r: any = await apiClient.getMinhasTarefasNomade(tab);
      setTarefas(Array.isArray(r?.data) ? r.data : []);
    } catch (e: any) {
      setErro(
        String(e?.message).includes("nômade não encontrado")
          ? "Sua conta ainda não está vinculada a um perfil de nômade."
          : (e?.message ?? "Não foi possível carregar suas tarefas."),
      );
    } finally {
      setCarregando(false);
    }
  }, [tab]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const entregar = async (etapa: Etapa) => {
    setEntregando(etapa.id);
    setAviso(null);
    try {
      const r: any = await apiClient.concluirMinhaEtapa(etapa.id);
      setAviso(
        r?.enviadaParaAprovacao
          ? "Etapa entregue — a tarefa foi para aprovação."
          : r?.proxima
            ? `Etapa entregue. A próxima ("${r.proxima.titulo}") foi aberta${r.proxima.herdou_nomade ? " para você" : ""}.`
            : "Etapa entregue.",
      );
      await carregar();
      setTimeout(() => setAviso(null), 6000);
    } catch (e: any) {
      setAviso(e?.message ?? "Não foi possível entregar a etapa.");
    } finally {
      setEntregando(null);
    }
  };

  const totais = useMemo(
    () => ({
      tarefas: tarefas.length,
      etapas: tarefas.reduce((s, t) => s + t.minhas_etapas.length, 0),
      valor: tarefas.reduce((s, t) => s + (t.valor_previsto ?? 0), 0),
    }),
    [tarefas],
  );

  return (
    <div className={STANDARD_SHELL_PANEL_CLASS}>
      <div className="relative h-full min-h-0 flex flex-col">
        <div className="shrink-0 -mb-[11px]">
          <StandardPageBanner
            icon={CheckCircle2}
            title="Minhas Tarefas"
            description={
              carregando
                ? "Carregando…"
                : `${totais.tarefas} tarefas · ${totais.etapas} etapas suas · ${fmtBRL(totais.valor)} previstos`
            }
            actions={
              <PinToTrayButton
                id="page-nomades-minhastarefas"
                label="Minhas Tarefas"
                icon={CheckCircle2}
                path="/nomades/minhastarefas"
              />
            }
          />
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="p-4 sm:p-6 space-y-5">
            <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
              <TabsList>
                <TabsTrigger value="abertas">Em aberto</TabsTrigger>
                <TabsTrigger value="concluidas">Concluídas</TabsTrigger>
              </TabsList>
            </Tabs>

            {aviso && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 dark:border-blue-800 dark:bg-blue-900/20">
                <p className="text-xs font-medium text-blue-800 dark:text-blue-300">{aviso}</p>
              </div>
            )}

            {carregando ? (
              <div className="flex items-center justify-center gap-2 py-16 text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Carregando suas tarefas…</span>
              </div>
            ) : erro ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
                <p className="text-sm text-amber-800 dark:text-amber-300">{erro}</p>
              </div>
            ) : tarefas.length === 0 ? (
              <div className="py-16 text-center">
                <CheckCircle2 className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">
                  {tab === "abertas"
                    ? "Você não tem nenhuma etapa em aberto no momento."
                    : "Nenhuma tarefa concluída ainda."}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {tarefas.map((t) => (
                  <div
                    key={t.id}
                    className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm overflow-hidden"
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-0.5">
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                              {t.title}
                            </p>
                            {t.task_code && (
                              <span className="text-[11px] font-mono text-slate-400">
                                {t.task_code}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400">
                            {t.project?.title ?? "—"}
                            {t.catalog_task?.category ? ` · ${t.catalog_task.category}` : ""}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          {t.valor_previsto > 0 && (
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-100 inline-flex items-center gap-1">
                              <Wallet className="h-3.5 w-3.5 text-emerald-600" />
                              {fmtBRL(t.valor_previsto)}
                            </p>
                          )}
                          <p
                            className={cn(
                              "text-xs",
                              t.due_date && new Date(t.due_date) < new Date()
                                ? "text-orange-600 font-semibold"
                                : "text-slate-400",
                            )}
                          >
                            {t.due_date && new Date(t.due_date) < new Date() && (
                              <AlertTriangle className="h-3 w-3 inline mr-0.5" />
                            )}
                            Prazo {fmtData(t.due_date)}
                          </p>
                        </div>
                      </div>

                      {/* Etapas atribuídas a este nômade */}
                      <div className="mt-3 space-y-2">
                        {t.minhas_etapas.length === 0 ? (
                          <p className="text-xs text-slate-400">
                            Tarefa inteira sob sua responsabilidade (sem etapas).
                          </p>
                        ) : (
                          t.minhas_etapas.map((e) => {
                            const cfg = ETAPA_CFG[e.status] ?? ETAPA_CFG.PENDENTE;
                            const Icon = cfg.Icon;
                            const podeEntregar = e.status === "EM_ANDAMENTO";
                            return (
                              <div
                                key={e.id}
                                className={cn(
                                  "rounded-lg border p-3 flex items-start justify-between gap-3",
                                  podeEntregar
                                    ? "border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-900/10"
                                    : "border-slate-200 dark:border-slate-700",
                                )}
                              >
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                                      {e.titulo}
                                    </p>
                                    <span
                                      className={cn(
                                        "text-[11px] font-medium px-2 py-0.5 rounded-full border inline-flex items-center gap-1",
                                        cfg.cls,
                                      )}
                                    >
                                      <Icon className="h-3 w-3" /> {cfg.label}
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[11px] text-slate-500">
                                    {e.prazo_execucao && (
                                      <span>Entregar até {fmtData(e.prazo_execucao)}</span>
                                    )}
                                    {e.horas_execucao ? <span>{e.horas_execucao}h</span> : null}
                                    {e.valor_nomade ? (
                                      <span className="text-emerald-700 font-semibold">
                                        {fmtBRL(e.valor_nomade)}
                                      </span>
                                    ) : null}
                                    {e.exige_anexo && (
                                      <span className="text-amber-700">exige arquivo</span>
                                    )}
                                  </div>
                                </div>

                                {podeEntregar && (
                                  <div className="shrink-0 flex flex-col items-end gap-1.5">
                                    <button
                                      onClick={() => {
                                        setFormAberto(formAberto === e.id ? null : e.id);
                                        if (!anexosPorEtapa[e.id]) carregarAnexos(e.id);
                                      }}
                                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:border-slate-600 dark:text-slate-300"
                                    >
                                      <Paperclip className="h-3.5 w-3.5" />
                                      Anexar entrega
                                    </button>
                                    <button
                                      onClick={() => entregar(e)}
                                      disabled={entregando === e.id}
                                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                                    >
                                      {entregando === e.id ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      ) : (
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                      )}
                                      Concluir etapa
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}

                        {/* Entregas da etapa aberta para anexo.
                            Não há upload de binário na plataforma: a entrega é
                            registrada como link (Drive, Figma, etc.), mesmo
                            padrão usado no resto do sistema. */}
                        {t.minhas_etapas
                          .filter((e) => formAberto === e.id)
                          .map((e) => (
                            <div
                              key={`form-${e.id}`}
                              className="rounded-lg border border-dashed border-slate-300 dark:border-slate-600 p-3 space-y-2"
                            >
                              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                                Entregas de “{e.titulo}”
                                {e.exige_anexo && (
                                  <span className="ml-1 text-amber-700">· obrigatória</span>
                                )}
                              </p>

                              {(anexosPorEtapa[e.id] ?? []).map((a) => (
                                <div
                                  key={a.id}
                                  className="flex items-center justify-between gap-2 rounded-md bg-slate-50 dark:bg-slate-800 px-2 py-1.5"
                                >
                                  <a
                                    href={a.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-700 dark:text-blue-400 hover:underline inline-flex items-center gap-1 min-w-0"
                                  >
                                    <ExternalLink className="h-3 w-3 shrink-0" />
                                    <span className="truncate">{a.name}</span>
                                  </a>
                                  <button
                                    onClick={() => removerAnexo(e.id, a.id)}
                                    className="shrink-0 text-slate-400 hover:text-red-600"
                                    aria-label="Remover entrega"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              ))}

                              {(anexosPorEtapa[e.id] ?? []).length === 0 && (
                                <p className="text-[11px] text-slate-400">
                                  Nenhuma entrega anexada ainda.
                                </p>
                              )}

                              <div className="flex flex-col sm:flex-row gap-2">
                                <input
                                  value={novoNome}
                                  onChange={(ev) => setNovoNome(ev.target.value)}
                                  placeholder="Nome do arquivo (ex.: Layout final)"
                                  className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs outline-none focus:border-[#2558FF]"
                                />
                                <input
                                  value={novaUrl}
                                  onChange={(ev) => setNovaUrl(ev.target.value)}
                                  placeholder="Link (Drive, Figma, WeTransfer…)"
                                  className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs outline-none focus:border-[#2558FF]"
                                />
                                <button
                                  onClick={() => anexar(e.id)}
                                  disabled={salvandoAnexo || !novoNome.trim() || !novaUrl.trim()}
                                  className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40 dark:bg-slate-100 dark:text-slate-900"
                                >
                                  {salvandoAnexo ? "Anexando…" : "Anexar"}
                                </button>
                              </div>
                            </div>
                          ))}
                      </div>

                      {t.total_etapas > t.minhas_etapas.length && (
                        <p className="mt-2 text-[11px] text-slate-400">
                          Esta tarefa tem {t.total_etapas} etapas no total; as demais são de
                          outros executores.
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
