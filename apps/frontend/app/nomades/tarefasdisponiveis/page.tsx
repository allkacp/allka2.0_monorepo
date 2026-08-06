import { useCallback, useEffect, useMemo, useState } from "react";
import { Clock, Loader2, ListChecks, Search, Wallet } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  STANDARD_SHELL_PANEL_CLASS,
  StandardPageBanner,
} from "@/components/standard-page-shell";
import { PinToTrayButton } from "@/components/pin-to-tray-button";
import { apiClient } from "@/lib/api-client";
import { cn } from "@/lib/utils";

/**
 * Nômade › Tarefas Disponíveis.
 *
 * Até 2026-08-04 esta tela mostrava uma lista fixa escrita no arquivo. Agora
 * consome `GET /api/nomades/me/disponiveis`: as ETAPAS que o motor abriu e
 * ficaram sem executor (`AGUARDANDO_EXECUTOR`) — a seleção automática não achou
 * ninguém, ou a etapa não pedia continuidade de nômade. Antes elas ficavam
 * paradas até alguém atribuir na mão.
 *
 * A unidade oferecida é a etapa, não a tarefa: numa tarefa de três etapas, o
 * nômade pode pegar só a que sabe fazer.
 */

interface Disponivel {
  id: string;
  titulo: string;
  descricao: string | null;
  categoria: string | null;
  prazo_execucao: string | null;
  horas_execucao: number | null;
  valor_nomade: number | null;
  exige_anexo: boolean;
  tarefa: {
    id: string;
    task_code: string | null;
    title: string;
    projeto: string | null;
  };
}

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtData = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("pt-BR") : "—";

export default function TarefasDisponiveisPage() {
  const [itens, setItens] = useState<Disponivel[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState("Todas");
  const [aceitando, setAceitando] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [porAfinidade, setPorAfinidade] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const r: any = await apiClient.getTarefasDisponiveisNomade();
      setItens(Array.isArray(r?.data) ? r.data : []);
      setPorAfinidade(Boolean(r?.filtradas_por_afinidade));
      if (r?.motivo === "cadastro_inativo") {
        setErro("Seu cadastro está inativo — fale com a Allka para voltar a receber tarefas.");
      }
    } catch (e: any) {
      setErro(
        String(e?.message).includes("nômade não encontrado")
          ? "Sua conta ainda não está vinculada a um perfil de nômade."
          : (e?.message ?? "Não foi possível carregar as tarefas disponíveis."),
      );
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const aceitar = async (item: Disponivel) => {
    setAceitando(item.id);
    setAviso(null);
    try {
      await apiClient.aceitarEtapa(item.id);
      setAviso(`Você assumiu "${item.titulo}". A etapa já está em Minhas Tarefas.`);
      await carregar();
      setTimeout(() => setAviso(null), 6000);
    } catch (e: any) {
      // 409 acontece quando outra pessoa pegou primeiro — recarrega para a
      // lista deixar de mostrar o que já não está disponível.
      setAviso(e?.message ?? "Não foi possível assumir esta etapa.");
      await carregar();
    } finally {
      setAceitando(null);
    }
  };

  const categorias = useMemo(() => {
    const set = new Set<string>();
    itens.forEach((i) => i.categoria && set.add(i.categoria));
    return ["Todas", ...[...set].sort()];
  }, [itens]);

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return itens.filter((i) => {
      if (categoria !== "Todas" && i.categoria !== categoria) return false;
      if (!termo) return true;
      return [i.titulo, i.tarefa.title, i.tarefa.projeto, i.categoria]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(termo));
    });
  }, [itens, busca, categoria]);

  return (
    <div className={STANDARD_SHELL_PANEL_CLASS}>
      <div className="relative h-full min-h-0 flex flex-col">
        <div className="shrink-0 -mb-[11px]">
          <StandardPageBanner
            icon={ListChecks}
            title="Tarefas Disponíveis"
            description={
              carregando
                ? "Carregando…"
                : `${itens.length} etapas abertas para você assumir${porAfinidade ? " (filtradas pelas suas áreas)" : ""}`
            }
            actions={
              <PinToTrayButton
                id="page-nomades-tarefasdisponiveis"
                label="Tarefas Disponíveis"
                icon={ListChecks}
                path="/nomades/tarefasdisponiveis"
              />
            }
          />
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="p-4 sm:p-6 space-y-5">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <Input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar por etapa, tarefa ou projeto…"
                  className="pl-9"
                />
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                {categorias.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategoria(c)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors",
                      categoria === c
                        ? "bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900"
                        : "bg-white text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {aviso && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 dark:border-blue-800 dark:bg-blue-900/20">
                <p className="text-xs font-medium text-blue-800 dark:text-blue-300">{aviso}</p>
              </div>
            )}

            {carregando ? (
              <div className="flex items-center justify-center gap-2 py-16 text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Buscando tarefas disponíveis…</span>
              </div>
            ) : erro ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
                <p className="text-sm text-amber-800 dark:text-amber-300">{erro}</p>
              </div>
            ) : visiveis.length === 0 ? (
              <div className="py-16 text-center">
                <ListChecks className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">
                  {itens.length === 0
                    ? "Nenhuma etapa aberta para as suas áreas no momento."
                    : "Nenhuma etapa corresponde ao filtro."}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {visiveis.map((i) => (
                  <div
                    key={i.id}
                    className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                            {i.titulo}
                          </p>
                          {i.categoria && (
                            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full border bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                              {i.categoria}
                            </span>
                          )}
                          {i.exige_anexo && (
                            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-200">
                              exige arquivo
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {i.tarefa.title}
                          {i.tarefa.projeto ? ` · ${i.tarefa.projeto}` : ""}
                        </p>
                        {i.descricao && (
                          <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">
                            {i.descricao}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[11px] text-slate-500">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" /> Entregar até{" "}
                            {fmtData(i.prazo_execucao)}
                          </span>
                          {i.horas_execucao ? <span>{i.horas_execucao}h estimadas</span> : null}
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        {i.valor_nomade ? (
                          <p className="text-sm font-bold text-slate-800 dark:text-slate-100 inline-flex items-center gap-1">
                            <Wallet className="h-3.5 w-3.5 text-emerald-600" />
                            {fmtBRL(i.valor_nomade)}
                          </p>
                        ) : (
                          <p className="text-xs text-slate-400">valor a definir</p>
                        )}
                        <button
                          onClick={() => aceitar(i)}
                          disabled={aceitando === i.id}
                          className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#2558FF] via-[#6E2C96] to-[#D92293] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                        >
                          {aceitando === i.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <ListChecks className="h-3.5 w-3.5" />
                          )}
                          Assumir etapa
                        </button>
                      </div>
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
