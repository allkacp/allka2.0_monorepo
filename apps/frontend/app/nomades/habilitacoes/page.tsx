import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Award,
  CheckCircle2,
  Clock,
  BookOpen,
  ExternalLink,
  Search,
  Loader2,
  PauseCircle,
  Star,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  STANDARD_SHELL_PANEL_CLASS,
  StandardPageBanner,
} from "@/components/standard-page-shell";
import { PinToTrayButton } from "@/components/pin-to-tray-button";
import { apiClient } from "@/lib/api-client";

/**
 * Nômade › Habilitações.
 *
 * Até 2026-08-06 esta tela rodava numa lista fixa de 8 áreas inventadas
 * (`HABILITACOES`), com pontuação, validade e progresso de curso que não
 * existem em lugar nenhum do modelo. Agora consome
 * `GET /api/nomades/me/habilidades`.
 *
 * A fonte é `NomadeHabilidade` — **não** `Qualification`. Qualification é o
 * modelo legado, usado só como fallback por `selecionar-nomade.ts`; mostrar
 * ele aqui daria ao nômade uma situação diferente da que realmente decide se
 * ele recebe tarefa.
 *
 * O que o mock prometia e o modelo não tem, saiu: pontuação de prova, data de
 * validade, progresso de curso e "revogado com motivo". O que existe de
 * verdade é área, categoria, nota média, disponibilidade e ativo.
 *
 * O botão "Iniciar Teste de Habilitação" também saiu: ele abria um circuito
 * completo de pré-teste que terminava num `console.log` — não existe geração
 * de tarefa-teste no backend. Habilitação hoje é concedida pelo admin
 * (`POST /api/habilidades/nomade/:id`, restrito a admin), e é isso que a tela
 * diz agora, em vez de oferecer um caminho que não leva a lugar nenhum.
 */

interface Habilidade {
  id: string;
  categoria_produto: string | null;
  nota_media: number;
  disponibilidade: string;
  ativo: boolean;
  desde: string;
}

interface AreaHabilitacao {
  slug: string;
  label: string;
  categorias: string[];
  status: "habilitado" | "pausado" | "indisponivel" | "nao_habilitado";
  total: number;
  nota_media: number | null;
  habilidades: Habilidade[];
}

interface Resposta {
  areas: AreaHabilitacao[];
  resumo: {
    habilitado: number;
    pausado: number;
    indisponivel: number;
    nao_habilitado: number;
  };
}

const STATUS_CONFIG: Record<
  AreaHabilitacao["status"],
  { label: string; badgeCls: string; iconCls: string; Icon: any }
> = {
  habilitado: {
    label: "Habilitado",
    badgeCls: "bg-emerald-100 text-emerald-700 border-emerald-200",
    iconCls: "text-emerald-500",
    Icon: CheckCircle2,
  },
  pausado: {
    label: "Pausado",
    badgeCls: "bg-amber-100 text-amber-700 border-amber-200",
    iconCls: "text-amber-500",
    Icon: PauseCircle,
  },
  indisponivel: {
    label: "Indisponível",
    badgeCls: "bg-slate-100 text-slate-600 border-slate-200",
    iconCls: "text-slate-400",
    Icon: Clock,
  },
  nao_habilitado: {
    label: "Não habilitado",
    badgeCls: "bg-slate-100 text-slate-500 border-slate-200",
    iconCls: "text-slate-300",
    Icon: Award,
  },
};

function StatCard({
  label,
  value,
  color,
  icon: Icon,
}: {
  label: string;
  value: number;
  color: "emerald" | "amber" | "slate" | "blue";
  icon: any;
}) {
  const clsMap = {
    emerald: { bg: "bg-emerald-50 border-emerald-100", icon: "text-emerald-500", val: "text-emerald-700" },
    amber: { bg: "bg-amber-50 border-amber-100", icon: "text-amber-500", val: "text-amber-700" },
    blue: { bg: "bg-blue-50 border-blue-100", icon: "text-blue-500", val: "text-blue-700" },
    slate: { bg: "bg-slate-50 border-slate-200", icon: "text-slate-400", val: "text-slate-600" },
  } as const;
  const c = clsMap[color];
  return (
    <div className={`rounded-xl border p-4 ${c.bg}`}>
      <Icon className={`h-5 w-5 ${c.icon} mb-2`} />
      <p className={`text-2xl font-bold ${c.val}`}>{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </div>
  );
}

export default function NomadesHabilitacoesPage() {
  const [dados, setDados] = useState<Resposta | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("todos");

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const r: any = await apiClient.getMinhasHabilidades();
      setDados(r ?? null);
    } catch (e: any) {
      setErro(
        String(e?.message).includes("nômade não encontrado")
          ? "Sua conta ainda não está vinculada a um perfil de nômade."
          : (e?.message ?? "Não foi possível carregar suas habilitações."),
      );
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const areas = dados?.areas ?? [];
  const resumo = dados?.resumo;

  const filtradas = useMemo(() => {
    const q = search.toLowerCase();
    return areas.filter((a) => {
      const matchSearch =
        !q ||
        a.label.toLowerCase().includes(q) ||
        a.categorias.some((c) => c.toLowerCase().includes(q));
      const matchTab =
        tab === "todos" ||
        (tab === "habilitado" && a.status === "habilitado") ||
        (tab === "parcial" && (a.status === "pausado" || a.status === "indisponivel")) ||
        (tab === "nao_habilitado" && a.status === "nao_habilitado");
      return matchSearch && matchTab;
    });
  }, [areas, search, tab]);

  const nenhumaHabilitacao = resumo
    ? resumo.habilitado + resumo.pausado + resumo.indisponivel === 0
    : false;

  return (
    <div className={STANDARD_SHELL_PANEL_CLASS}>
      <div className="relative h-full min-h-0 flex flex-col">
        <div className="shrink-0 -mb-[11px]">
          <StandardPageBanner
            icon={Award}
            title="Habilitações"
            description={
              carregando
                ? "Carregando…"
                : resumo
                  ? `${resumo.habilitado} de ${areas.length} áreas habilitadas`
                  : "Suas habilitações por área na plataforma"
            }
            actions={
              <PinToTrayButton
                id="page-nomades-habilitacoes"
                label="Habilitações"
                icon={Award}
                path="/nomades/habilitacoes"
              />
            }
          />
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="p-4 sm:p-6 space-y-5">
            {carregando ? (
              <div className="flex items-center justify-center gap-2 py-16 text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Carregando suas habilitações…</span>
              </div>
            ) : erro ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
                <p className="text-sm text-amber-800 dark:text-amber-300">{erro}</p>
              </div>
            ) : (
              <>
                {/* Resumo */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard label="Habilitadas" value={resumo?.habilitado ?? 0} color="emerald" icon={CheckCircle2} />
                  <StatCard label="Pausadas" value={resumo?.pausado ?? 0} color="amber" icon={PauseCircle} />
                  <StatCard label="Indisponíveis" value={resumo?.indisponivel ?? 0} color="blue" icon={Clock} />
                  <StatCard label="Não habilitadas" value={resumo?.nao_habilitado ?? 0} color="slate" icon={Award} />
                </div>

                {/*
                  Quando o nômade não tem nenhuma habilitação, o mais útil é
                  dizer como se consegue uma — e a resposta honesta hoje é: o
                  admin cadastra. Não existe autoatendimento.
                */}
                {nenhumaHabilitacao && (
                  <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 dark:border-blue-800 dark:bg-blue-900/20">
                    <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">
                      Você ainda não tem habilitação em nenhuma área
                    </p>
                    <p className="text-xs text-blue-800/80 dark:text-blue-300/80 mt-1 leading-relaxed">
                      As habilitações são cadastradas pela equipe da Allka e definem
                      quais tarefas chegam até você na seleção automática. Fale com
                      seu líder para ser avaliado nas áreas em que você atua.
                    </p>
                  </div>
                )}

                {/* Allkademy */}
                <div className="flex items-center gap-4 rounded-xl bg-linear-to-r from-violet-50 to-blue-50/60 border border-violet-200 p-4">
                  <BookOpen className="h-8 w-8 text-violet-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                      Estude na Allkademy
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Os cursos preparam você para ser avaliado em novas áreas.
                    </p>
                  </div>
                  <Link to="/allkademy" className="shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 border-violet-200 text-violet-700 hover:bg-violet-50"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> Allkademy
                    </Button>
                  </Link>
                </div>

                {/* Filtros */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <Input
                      placeholder="Buscar por área ou categoria..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Tabs value={tab} onValueChange={setTab}>
                    <TabsList>
                      <TabsTrigger value="todos">Todas</TabsTrigger>
                      <TabsTrigger value="habilitado">Habilitadas</TabsTrigger>
                      <TabsTrigger value="parcial">Pausadas</TabsTrigger>
                      <TabsTrigger value="nao_habilitado">Não habilitadas</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                {/* Áreas */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filtradas.map((a) => {
                    const cfg = STATUS_CONFIG[a.status];
                    const Icon = cfg.Icon;
                    return (
                      <div
                        key={a.slug}
                        className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm p-4 flex flex-col gap-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                              {a.label}
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5 truncate">
                              {a.categorias.join(" · ")}
                            </p>
                          </div>
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded-full border shrink-0 ${cfg.badgeCls}`}
                          >
                            {cfg.label}
                          </span>
                        </div>

                        <div className="flex items-start gap-2">
                          <Icon className={`h-4 w-4 ${cfg.iconCls} shrink-0 mt-0.5`} />
                          <div className="min-w-0 flex-1">
                            {a.status === "nao_habilitado" ? (
                              <p className="text-xs text-slate-400">
                                Você ainda não recebe tarefas desta área.
                              </p>
                            ) : (
                              <>
                                <p className="text-xs text-slate-500">
                                  {a.total}{" "}
                                  {a.total === 1 ? "habilitação" : "habilitações"} nesta área
                                </p>
                                {a.nota_media !== null && (
                                  <p className="text-xs font-semibold text-emerald-600 mt-0.5 inline-flex items-center gap-1">
                                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                    Nota média {a.nota_media.toFixed(1)}
                                  </p>
                                )}
                                {a.status === "pausado" && (
                                  <p className="text-xs text-amber-600 mt-0.5">
                                    Pausada: não entra na seleção automática.
                                  </p>
                                )}
                                {a.status === "indisponivel" && (
                                  <p className="text-xs text-slate-400 mt-0.5">
                                    Marcada como indisponível.
                                  </p>
                                )}
                              </>
                            )}
                          </div>
                        </div>

                        {/* Categorias em que ele está habilitado de fato */}
                        {a.habilidades.length > 0 && (
                          <div className="flex flex-wrap gap-1 border-t border-slate-100 dark:border-slate-800 pt-2">
                            {a.habilidades.map((h) => (
                              <span
                                key={h.id}
                                className={`text-[10px] px-1.5 py-0.5 rounded border ${
                                  h.ativo && h.disponibilidade === "disponivel"
                                    ? "border-emerald-200 text-emerald-700 bg-emerald-50"
                                    : "border-slate-200 text-slate-500 bg-slate-50"
                                }`}
                              >
                                {h.categoria_produto ?? "Área toda"}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {filtradas.length === 0 && (
                    <div className="col-span-full text-center py-14 text-slate-400">
                      <Award className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">Nenhuma área encontrada com esse filtro</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
