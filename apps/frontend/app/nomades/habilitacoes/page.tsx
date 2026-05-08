// @ts-nocheck
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Award,
  CheckCircle2,
  XCircle,
  Clock,
  BookOpen,
  ExternalLink,
  Search,
  FlaskConical,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/page-header";
import { CircuitoPreHabilitacaoModal } from "@/components/circuito-pre-habilitacao-modal";

// ─── Mock teste com circuito pré-habilitação (PA0001 — Tráfego Pago) ─────────
const MOCK_CIRCUITO_TEST = {
  id: "PA0001-TEST01",
  code: "PA0001-TEST01",
  name: "Gestão de Tráfego Pago — Habilitação",
  description: "Teste prático de onboarding e diagnóstico em tráfego pago.",
  linkedTaskId: "PA0001-T01",
  linkedTaskName: "Onboarding e Diagnóstico",
  passingScore: 70,
  timeLimit: 120,
  evaluationCriteria: [],
  enablesAdditionalTasks: [],
  isActive: true,
  preCircuit: {
    welcomeTitle: "Bem-vindo ao Teste de Habilitação",
    welcomeSubtitle:
      "Você está prestes a iniciar seu teste para ser habilitado em Gestão de Tráfego Pago. É o primeiro passo para executar projetos reais na Allka.",
    welcomeHighlights: [
      "Briefing fictício de cliente real como referência",
      "120 minutos para concluir",
      "Nota mínima de 70% para aprovação",
      "Habilita sua entrada nas tarefas de tráfego pago",
    ],
    aboutDescription:
      "Você vai atuar como um gestor de tráfego recém-contratado. Receberá o briefing de um cliente fictício (Luminex Cosméticos) e deverá conduzir o onboarding completo: coletar informações, diagnosticar e apresentar um plano de ação.",
    aboutWhatToExpect: [
      "Analisar o briefing e identificar os objetivos do cliente",
      "Preencher o checklist de onboarding com todos os dados",
      "Realizar diagnóstico do site e dos canais digitais do cliente",
      "Elaborar um plano de ação para os primeiros 30 dias",
      "Identificar e solicitar formalmente todos os acessos necessários",
    ],
    estimatedTime: "2 horas",
    videoUrl: null,
    videoTitle: "Onboarding Profissional em Tráfego Pago",
    videoDuration: "12:45",
    videoDescription:
      "Assista antes de iniciar. O vídeo explica os pontos-chave de um onboarding de qualidade em tráfego pago.",
    rules: [
      "Use apenas os dados fictícios do briefing — não busque informações reais.",
      "Todas as entregas devem ser feitas dentro da plataforma.",
      "O plano de ação deve ter no mínimo 3 ações documentadas.",
      "Registre dúvidas no campo de observações — não contate o suporte.",
      "Ao exceder o tempo limite, a tarefa é encerrada automaticamente.",
    ],
    warnings: [
      "Aprovação obrigatória para executar tarefas de Tráfego Pago na plataforma.",
      "Intervalo mínimo de 7 dias entre tentativas.",
    ],
    confirmChecklist: [
      "Li e entendi o briefing completo do cliente fictício (Luminex Cosméticos)",
      "Tenho 2 horas disponíveis para concluir o teste sem interrupções",
      "Entendo que não posso buscar informações externas sobre a empresa fictícia",
      "Estou ciente que ao clicar em 'Iniciar Teste', o cronômetro começa imediatamente",
    ],
  },
};

// ─── Mock habilitações ────────────────────────────────────────────────────────
const HABILITACOES = [
  {
    id: 1,
    type: "Desenvolvimento Web",
    category: "Tecnologia",
    status: "certificado",
    certifiedAt: "12/08/2025",
    score: 92,
    expiresAt: "12/08/2027",
    allkademyPath: "/allkademy",
  },
  {
    id: 2,
    type: "Design Gráfico",
    category: "Criação",
    status: "certificado",
    certifiedAt: "05/06/2025",
    score: 88,
    expiresAt: "05/06/2027",
    allkademyPath: "/allkademy",
  },
  {
    id: 3,
    type: "Redação e Conteúdo",
    category: "Conteúdo",
    status: "pendente",
    certifiedAt: null,
    score: null,
    expiresAt: null,
    testDate: "20/01/2026",
    allkademyPath: "/allkademy",
  },
  {
    id: 4,
    type: "Marketing Digital",
    category: "Marketing",
    status: "em_andamento",
    certifiedAt: null,
    score: null,
    expiresAt: null,
    progress: 60,
    allkademyPath: "/allkademy",
  },
  {
    id: 5,
    type: "Gestão de Projetos",
    category: "Gestão",
    status: "nao_habilitado",
    certifiedAt: null,
    score: null,
    expiresAt: null,
    allkademyPath: "/allkademy",
  },
  {
    id: 6,
    type: "Suporte ao Cliente",
    category: "Atendimento",
    status: "revogado",
    certifiedAt: "10/01/2025",
    score: 61,
    revokedAt: "15/11/2025",
    revokedReason: "Reclamações consecutivas registradas",
    allkademyPath: "/allkademy",
  },
  {
    id: 7,
    type: "SEO e Analytics",
    category: "Marketing",
    status: "nao_habilitado",
    certifiedAt: null,
    score: null,
    expiresAt: null,
    allkademyPath: "/allkademy",
  },
  {
    id: 8,
    type: "Fotografia e Vídeo",
    category: "Criação",
    status: "nao_habilitado",
    certifiedAt: null,
    score: null,
    expiresAt: null,
    allkademyPath: "/allkademy",
  },
];

const STATUS_CONFIG: Record<
  string,
  { label: string; badgeCls: string; iconCls: string; Icon: any }
> = {
  certificado: {
    label: "Certificado",
    badgeCls: "bg-emerald-100 text-emerald-700 border-emerald-200",
    iconCls: "text-emerald-500",
    Icon: CheckCircle2,
  },
  pendente: {
    label: "Pendente",
    badgeCls: "bg-amber-100 text-amber-700 border-amber-200",
    iconCls: "text-amber-500",
    Icon: Clock,
  },
  em_andamento: {
    label: "Em andamento",
    badgeCls: "bg-blue-100 text-blue-700 border-blue-200",
    iconCls: "text-blue-500",
    Icon: BookOpen,
  },
  revogado: {
    label: "Revogado",
    badgeCls: "bg-red-100 text-red-700 border-red-200",
    iconCls: "text-red-500",
    Icon: XCircle,
  },
  nao_habilitado: {
    label: "Não habilitado",
    badgeCls: "bg-slate-100 text-slate-500 border-slate-200",
    iconCls: "text-slate-300",
    Icon: Award,
  },
};

// ─── Stat mini card ───────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  color,
  icon: Icon,
}: {
  label: string;
  value: number;
  color: string;
  icon: any;
}) {
  const clsMap: Record<string, { bg: string; icon: string; val: string }> = {
    emerald: {
      bg: "bg-emerald-50 border-emerald-100",
      icon: "text-emerald-500",
      val: "text-emerald-700",
    },
    amber: {
      bg: "bg-amber-50 border-amber-100",
      icon: "text-amber-500",
      val: "text-amber-700",
    },
    red: {
      bg: "bg-red-50 border-red-100",
      icon: "text-red-500",
      val: "text-red-700",
    },
    blue: {
      bg: "bg-blue-50 border-blue-100",
      icon: "text-blue-500",
      val: "text-blue-700",
    },
    slate: {
      bg: "bg-slate-50 border-slate-200",
      icon: "text-slate-400",
      val: "text-slate-600",
    },
  };
  const c = clsMap[color];
  return (
    <div className={`rounded-xl border p-4 ${c.bg}`}>
      <Icon className={`h-5 w-5 ${c.icon} mb-2`} />
      <p className={`text-2xl font-bold ${c.val}`}>{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function NomadesHabilitacoesPage() {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("todos");
  const [circuitTest, setCircuitTest] = useState(null);
  const [isCircuitOpen, setIsCircuitOpen] = useState(false);

  const openCircuito = (test) => {
    setCircuitTest(test);
    setIsCircuitOpen(true);
  };

  const certified = HABILITACOES.filter(
    (h) => h.status === "certificado",
  ).length;
  const inProgress = HABILITACOES.filter(
    (h) => h.status === "pendente" || h.status === "em_andamento",
  ).length;
  const revoked = HABILITACOES.filter((h) => h.status === "revogado").length;
  const notEnabled = HABILITACOES.filter(
    (h) => h.status === "nao_habilitado",
  ).length;

  const filtered = HABILITACOES.filter((h) => {
    const q = search.toLowerCase();
    const matchSearch =
      h.type.toLowerCase().includes(q) || h.category.toLowerCase().includes(q);
    const matchTab =
      tab === "todos" ||
      (tab === "certificado" && h.status === "certificado") ||
      (tab === "em_andamento" &&
        (h.status === "pendente" || h.status === "em_andamento")) ||
      (tab === "outros" &&
        (h.status === "nao_habilitado" || h.status === "revogado"));
    return matchSearch && matchTab;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Habilitações"
        subtitle="Suas certificações por tipo de tarefa na plataforma"
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Certificadas"
          value={certified}
          color="emerald"
          icon={CheckCircle2}
        />
        <StatCard
          label="Em andamento"
          value={inProgress}
          color="blue"
          icon={Clock}
        />
        <StatCard
          label="Revogadas"
          value={revoked}
          color="red"
          icon={XCircle}
        />
        <StatCard
          label="Não habilitado"
          value={notEnabled}
          color="slate"
          icon={Award}
        />
      </div>

      {/* Allkademy promo strip */}
      <div className="flex items-center gap-4 rounded-xl bg-linear-to-r from-violet-50 to-blue-50/60 border border-violet-200 p-4">
        <BookOpen className="h-8 w-8 text-violet-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Obtenha novas habilitações na Allkademy
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            Complete cursos e testes para ampliar seu catálogo de tarefas
            disponíveis.
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

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <Input
            placeholder="Buscar por tipo ou categoria..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="todos">Todos</TabsTrigger>
            <TabsTrigger value="certificado">Certificados</TabsTrigger>
            <TabsTrigger value="em_andamento">Em andamento</TabsTrigger>
            <TabsTrigger value="outros">Não habilitados</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Cards grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((h) => {
          const cfg = STATUS_CONFIG[h.status];
          const Icon = cfg.Icon;
          return (
            <div
              key={h.id}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm p-4 flex flex-col gap-3"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                    {h.type}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">{h.category}</p>
                </div>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full border shrink-0 ${cfg.badgeCls}`}
                >
                  {cfg.label}
                </span>
              </div>

              {/* Detail */}
              <div className="flex items-start gap-2">
                <Icon className={`h-4 w-4 ${cfg.iconCls} shrink-0 mt-0.5`} />
                <div className="min-w-0 flex-1">
                  {h.status === "certificado" && (
                    <>
                      <p className="text-xs text-slate-500">
                        Certificado em {h.certifiedAt}
                      </p>
                      {h.score && (
                        <p className="text-xs font-semibold text-emerald-600 mt-0.5">
                          Pontuação: {h.score}/100
                        </p>
                      )}
                      {h.expiresAt && (
                        <p className="text-xs text-slate-400 mt-0.5">
                          Válido até {h.expiresAt}
                        </p>
                      )}
                    </>
                  )}
                  {h.status === "pendente" && (
                    <p className="text-xs text-slate-500">
                      Teste agendado para {h.testDate}
                    </p>
                  )}
                  {h.status === "em_andamento" && (
                    <div className="w-full">
                      <p className="text-xs text-slate-500 mb-1.5">
                        Progresso do curso: {h.progress}%
                      </p>
                      <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${h.progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                  {h.status === "revogado" && (
                    <>
                      <p className="text-xs text-red-600">{h.revokedReason}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Revogado em {h.revokedAt}
                      </p>
                    </>
                  )}
                  {h.status === "nao_habilitado" && (
                    <p className="text-xs text-slate-400">
                      Ainda não certificado nesta área
                    </p>
                  )}
                </div>
              </div>

              {/* CTA */}
              {h.status !== "certificado" &&
                (h.status === "nao_habilitado" ? (
                  <button
                    onClick={() => openCircuito(MOCK_CIRCUITO_TEST)}
                    className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 hover:bg-violet-100 dark:bg-violet-950/20 dark:border-violet-700 dark:hover:bg-violet-900/30 text-violet-700 dark:text-violet-400 text-xs font-medium h-8 transition-colors"
                  >
                    <FlaskConical className="h-3.5 w-3.5" />
                    Iniciar Teste de Habilitação
                  </button>
                ) : (
                  <Link to={h.allkademyPath}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-1.5 text-xs h-8"
                    >
                      <BookOpen className="h-3.5 w-3.5" />
                      {h.status === "revogado"
                        ? "Recertificar na Allkademy"
                        : "Ir para Allkademy"}
                    </Button>
                  </Link>
                ))}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="col-span-full text-center py-14 text-slate-400">
            <Award className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhuma habilitação encontrada</p>
          </div>
        )}
      </div>

      {/* Circuito Pré-Habilitação */}
      <CircuitoPreHabilitacaoModal
        test={circuitTest}
        open={isCircuitOpen}
        onOpenChange={setIsCircuitOpen}
        onConfirmStart={(test) => {
          // TODO: integrar com backend para gerar a tarefa teste
          console.log("Tarefa teste iniciada para:", test.code);
        }}
      />
    </div>
  );
}
