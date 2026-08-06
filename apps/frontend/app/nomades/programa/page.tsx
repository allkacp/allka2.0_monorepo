import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  Star,
  Clock,
  Award,
  ChevronDown,
  ChevronUp,
  Gift,
  Lock,
  Loader2,
  Target,
} from "lucide-react";
import {
  STANDARD_SHELL_PANEL_CLASS,
  StandardPageBanner,
} from "@/components/standard-page-shell";
import { PinToTrayButton } from "@/components/pin-to-tray-button";
import { apiClient } from "@/lib/api-client";

/**
 * Nômade › Programa.
 *
 * Até 2026-08-06 esta tela rodava numa lista fixa de níveis (`LEVELS`) com
 * critérios que não existem no modelo: mínimo de tarefas por trimestre, nota
 * mínima, taxa máxima de rejeição e percentual de bônus por nível. Agora
 * consome `GET /api/nomades/me/programa`, que lê `NomadeLevel` — a mesma
 * tabela que o admin edita em /admin/niveis-nomades.
 *
 * A régua real é o **score**: cada nível tem `min_score`/`max_score`, mais uma
 * lista de benefícios e uma de requisitos (texto). Não existe promoção
 * automática calculada por nota/prazo/rejeição como o mock desenhava — por
 * isso as barrinhas de progresso por critério saíram. As estatísticas de
 * desempenho continuam aparecendo, mas como contexto do trabalho, não como
 * régua de promoção que a plataforma não aplica.
 */

interface Requisito {
  label: string;
  value: string;
}

interface Nivel {
  slug: string;
  nome: string;
  min_score: number;
  max_score: number | null;
  cor: string | null;
  icone: string | null;
  beneficios: string[];
  requisitos: Requisito[];
  atual: boolean;
  alcancado: boolean;
}

interface Programa {
  nomade: {
    level: string;
    score: number;
    tarefas_total: number;
    tarefas_trimestre: number;
    nota_media: number;
    no_prazo: number;
    taxa_rejeicao: number;
    membro_desde: string | null;
  };
  progresso: {
    percentual: number;
    pontos_faltando: number;
    proximo_nivel: string | null;
  };
  niveis: Nivel[];
}

export default function NomadesProgramaPage() {
  const [dados, setDados] = useState<Programa | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const r: any = await apiClient.getMeuPrograma();
      setDados(r ?? null);
      // Abre o nível atual e o seguinte — que é o que a pessoa quer ver.
      const atual = r?.niveis?.find((n: Nivel) => n.atual);
      const idx = r?.niveis?.findIndex((n: Nivel) => n.atual) ?? -1;
      const proximo = idx >= 0 ? r?.niveis?.[idx + 1] : null;
      setExpandidos(new Set([atual?.slug, proximo?.slug].filter(Boolean) as string[]));
    } catch (e: any) {
      setErro(
        String(e?.message).includes("nômade não encontrado")
          ? "Sua conta ainda não está vinculada a um perfil de nômade."
          : (e?.message ?? "Não foi possível carregar o programa."),
      );
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const alternar = (slug: string) =>
    setExpandidos((prev) => {
      const s = new Set(prev);
      if (s.has(slug)) s.delete(slug);
      else s.add(slug);
      return s;
    });

  const n = dados?.nomade;
  const p = dados?.progresso;
  const nivelAtual = dados?.niveis.find((x) => x.atual);

  return (
    <div className={STANDARD_SHELL_PANEL_CLASS}>
      <div className="relative h-full min-h-0 flex flex-col">
        <div className="shrink-0 -mb-[11px]">
          <StandardPageBanner
            icon={Award}
            title="Programa Nômade"
            description={
              carregando
                ? "Carregando…"
                : p?.proximo_nivel
                  ? `${p.pontos_faltando} pontos para ${p.proximo_nivel}`
                  : "Acompanhe sua evolução e os benefícios de cada nível"
            }
            actions={
              <PinToTrayButton
                id="page-nomades-programa"
                label="Programa Nômade"
                icon={Award}
                path="/nomades/programa"
              />
            }
          />
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="p-4 sm:p-6 space-y-5">
            {carregando ? (
              <div className="flex items-center justify-center gap-2 py-16 text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Carregando o programa…</span>
              </div>
            ) : erro ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
                <p className="text-sm text-amber-800 dark:text-amber-300">{erro}</p>
              </div>
            ) : !dados || !n || !p ? (
              <div className="py-16 text-center">
                <Award className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">Nada para mostrar ainda.</p>
              </div>
            ) : (
              <>
                {/* Nível atual */}
                <div className="rounded-2xl bg-linear-to-br from-slate-800 via-slate-700 to-slate-600 p-6 text-white shadow-md">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <p className="text-sm text-white/60 mb-1">Seu nível atual</p>
                      <div className="flex items-center gap-3">
                        <span className="text-4xl">{nivelAtual?.icone ?? "🏅"}</span>
                        <div>
                          <p className="text-2xl font-bold">{nivelAtual?.nome ?? n.level}</p>
                          <p className="text-sm text-white/60">
                            {n.score} {n.score === 1 ? "ponto" : "pontos"}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-6">
                      <div className="text-center">
                        <p className="text-2xl font-bold">{n.tarefas_total}</p>
                        <p className="text-xs text-white/50">tarefas</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold">
                          {n.nota_media > 0 ? n.nota_media.toFixed(1) : "—"}
                        </p>
                        <p className="text-xs text-white/50">avaliação</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold">
                          {n.no_prazo > 0 ? `${Math.round(n.no_prazo)}%` : "—"}
                        </p>
                        <p className="text-xs text-white/50">no prazo</p>
                      </div>
                    </div>
                  </div>

                  {/* Progresso até o próximo nível */}
                  {p.proximo_nivel && (
                    <div className="mt-5 pt-4 border-t border-white/10">
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="text-white/70">
                          Progresso até {p.proximo_nivel}
                        </span>
                        <span className="font-semibold">
                          faltam {p.pontos_faltando} pts
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-white/15 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-400 transition-all"
                          style={{ width: `${p.percentual}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Estatísticas de desempenho — contexto, não régua de promoção */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
                    <Target className="h-5 w-5 text-blue-500 mb-2" />
                    <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                      {n.tarefas_trimestre}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">Tarefas no trimestre</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
                    <Star className="h-5 w-5 text-amber-500 mb-2" />
                    <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                      {n.nota_media > 0 ? n.nota_media.toFixed(1) : "—"}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">Avaliação média</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
                    <Clock className="h-5 w-5 text-emerald-500 mb-2" />
                    <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                      {n.no_prazo > 0 ? `${Math.round(n.no_prazo)}%` : "—"}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">Entregas no prazo</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
                    <Award className="h-5 w-5 text-violet-500 mb-2" />
                    <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                      {n.score}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">Pontuação</p>
                  </div>
                </div>

                {/* A escada */}
                <div className="space-y-3">
                  {dados.niveis.map((nivel) => {
                    const aberto = expandidos.has(nivel.slug);
                    const bloqueado = !nivel.alcancado && !nivel.atual;
                    return (
                      <div
                        key={nivel.slug}
                        className={`rounded-xl border bg-white dark:bg-slate-900 shadow-sm overflow-hidden ${
                          nivel.atual
                            ? "border-l-4 border-emerald-300 dark:border-emerald-700"
                            : "border-slate-200 dark:border-slate-700"
                        }`}
                        style={nivel.atual && nivel.cor ? { borderLeftColor: nivel.cor } : undefined}
                      >
                        <button
                          onClick={() => alternar(nivel.slug)}
                          className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-2xl shrink-0">{nivel.icone ?? "🏅"}</span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                                  {nivel.nome}
                                </p>
                                {nivel.atual && (
                                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700">
                                    seu nível
                                  </span>
                                )}
                                {nivel.alcancado && !nivel.atual && (
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                )}
                                {bloqueado && <Lock className="h-3.5 w-3.5 text-slate-300" />}
                              </div>
                              <p className="text-xs text-slate-400">
                                {nivel.min_score}
                                {nivel.max_score !== null ? ` a ${nivel.max_score}` : "+"} pontos
                              </p>
                            </div>
                          </div>
                          {aberto ? (
                            <ChevronUp className="h-4 w-4 text-slate-400 shrink-0" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                          )}
                        </button>

                        {aberto && (
                          <div className="px-4 pb-4 grid sm:grid-cols-2 gap-4 border-t border-slate-100 dark:border-slate-800 pt-3">
                            <div>
                              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2 inline-flex items-center gap-1.5">
                                <Gift className="h-3.5 w-3.5 text-violet-500" />
                                Benefícios
                              </p>
                              {nivel.beneficios.length === 0 ? (
                                <p className="text-xs text-slate-400">
                                  Nenhum benefício cadastrado neste nível.
                                </p>
                              ) : (
                                <ul className="space-y-1">
                                  {nivel.beneficios.map((b, i) => (
                                    <li
                                      key={i}
                                      className="text-xs text-slate-600 dark:text-slate-300 flex items-start gap-1.5"
                                    >
                                      <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0 mt-0.5" />
                                      {b}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2 inline-flex items-center gap-1.5">
                                <Target className="h-3.5 w-3.5 text-blue-500" />
                                Requisitos
                              </p>
                              {nivel.requisitos.length === 0 ? (
                                <p className="text-xs text-slate-400">
                                  Nenhum requisito cadastrado neste nível.
                                </p>
                              ) : (
                                <ul className="space-y-1">
                                  {nivel.requisitos.map((r, i) => (
                                    <li
                                      key={i}
                                      className="text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between gap-2"
                                    >
                                      <span className="text-slate-500">{r.label}</span>
                                      <span className="font-medium">{r.value}</span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
