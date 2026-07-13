// @ts-nocheck
import { useState } from "react"
import {
  Search, Filter, Clock, Star, Wallet, MapPin, ChevronDown, X, Bookmark, BookmarkCheck,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { PageHeader } from "@/components/page-header"
import { useSidebar } from "@/contexts/sidebar-context"
import { useAppFrameMetrics } from "@/hooks/useAppFrameMetrics"

const CATEGORIAS = ["Todos", "Design", "Conteúdo", "Desenvolvimento", "Marketing", "Gestão"]

const NIVEL_BADGE: Record<string, string> = {
  Bronze:   "bg-amber-100 text-amber-700 border-amber-200",
  Silver:   "bg-slate-100 text-slate-600 border-slate-300",
  Gold:     "bg-yellow-100 text-yellow-700 border-yellow-200",
  Platinum: "bg-sky-100 text-sky-700 border-sky-200",
  Diamond:  "bg-violet-100 text-violet-700 border-violet-200",
  Leader:   "bg-rose-100 text-rose-700 border-rose-200",
}

const URGENCIA_CFG: Record<string, { label: string; cls: string }> = {
  alta:   { label: "Alta", cls: "bg-red-100 text-red-700 border-red-200" },
  media:  { label: "Média", cls: "bg-amber-100 text-amber-700 border-amber-200" },
  baixa:  { label: "Baixa", cls: "bg-green-100 text-green-700 border-green-200" },
}

type Task = {
  id: number; title: string; client: string; category: string
  value: number; deadline: string; estimatedHours: number; rating: number
  urgency: "alta" | "media" | "baixa"; nivelMinimo: string; description: string
  skills: string[]; remote: boolean
}

const AVAILABLE_TASKS: Task[] = [
  {
    id: 1,  title: "Criação de Landing Page",          client: "Empresa XYZ",    category: "Desenvolvimento",
    value: 620,  deadline: "12/04/2026", estimatedHours: 8,  rating: 4.8, urgency: "alta",
    nivelMinimo: "Bronze", description: "Desenvolver landing page responsiva com seções hero, benefícios, depoimentos e CTA. Entregar em HTML/CSS/JS ou framework acordado.",
    skills: ["HTML/CSS", "JavaScript", "Design responsivo"], remote: true,
  },
  {
    id: 2,  title: "Redação de 4 artigos SEO",         client: "Blog Tecnologia", category: "Conteúdo",
    value: 480,  deadline: "10/04/2026", estimatedHours: 6,  rating: 4.6, urgency: "media",
    nivelMinimo: "Bronze", description: "Produzir quatro artigos de blog otimizados para SEO, entre 800–1.200 palavras cada, com foco em palavras-chave fornecidas pelo cliente.",
    skills: ["Redação", "SEO", "Revisão ortográfica"], remote: true,
  },
  {
    id: 3,  title: "Posts para Instagram (15 artes)",  client: "Loja Moda",      category: "Design",
    value: 390,  deadline: "08/04/2026", estimatedHours: 5,  rating: 4.9, urgency: "alta",
    nivelMinimo: "Bronze", description: "Criação de 15 artes para feed do Instagram no formato 1080x1080. Identidade visual já definida. Entrega em PNG e PSD.",
    skills: ["Photoshop", "Illustrator", "Canva"], remote: true,
  },
  {
    id: 4,  title: "Campanha Google Ads",              client: "Imobiliária Sul", category: "Marketing",
    value: 850,  deadline: "15/04/2026", estimatedHours: 10, rating: 4.7, urgency: "media",
    nivelMinimo: "Silver", description: "Configurar e otimizar campanha de pesquisa no Google Ads. Inclui criação de grupos de anúncio, extensões e relatório inicial de resultados.",
    skills: ["Google Ads", "Analytics", "Copywriting"], remote: true,
  },
  {
    id: 5,  title: "Edição de Vídeo Institucional",    client: "Const. JM",      category: "Design",
    value: 740,  deadline: "18/04/2026", estimatedHours: 9,  rating: 4.5, urgency: "baixa",
    nivelMinimo: "Silver", description: "Editar vídeo institucional de 3–5 minutos com narração, trilha sonora, motion graphics simples e legendas. Arquivos fonte já gravados.",
    skills: ["Premiere", "After Effects", "DaVinci Resolve"], remote: true,
  },
  {
    id: 6,  title: "Gestão LinkedIn — junho",          client: "Consultoria BM",  category: "Marketing",
    value: 580,  deadline: "30/04/2026", estimatedHours: 8,  rating: 4.4, urgency: "baixa",
    nivelMinimo: "Silver", description: "Gerenciar perfil LinkedIn corporativo: criação de 12 posts, interação com conexões, relatório mensal de alcance e engajamento.",
    skills: ["LinkedIn", "Copywriting", "Social Media"], remote: true,
  },
  {
    id: 7,  title: "Identidade Visual — Startup",      client: "AppTech",         category: "Design",
    value: 1800, deadline: "22/04/2026", estimatedHours: 20, rating: 4.9, urgency: "media",
    nivelMinimo: "Gold",   description: "Criar identidade visual completa: logo em variações, paleta de cores, tipografia, ícones e manual de marca em PDF. Mínimo 3 propostas iniciais.",
    skills: ["Branding", "Illustrator", "Figma"], remote: true,
  },
  {
    id: 8,  title: "Script e Pauta para Podcast",      client: "Rádio Digital",   category: "Conteúdo",
    value: 320,  deadline: "09/04/2026", estimatedHours: 4,  rating: 4.3, urgency: "alta",
    nivelMinimo: "Bronze", description: "Escrever pauta detalhada e script para 2 episódios de podcast (45 min cada), com tópicos, perguntas e sugestões de transição.",
    skills: ["Roteiro", "Pesquisa", "Redação"], remote: true,
  },
  {
    id: 9,  title: "Automação de Email Marketing",     client: "E-commerce Moda", category: "Marketing",
    value: 960,  deadline: "20/04/2026", estimatedHours: 12, rating: 4.8, urgency: "media",
    nivelMinimo: "Gold",   description: "Configurar fluxo de automação no RD Station: boas-vindas, carrinho abandonado e reativação. Inclui copywriting e design dos emails.",
    skills: ["RD Station", "Email Marketing", "Copywriting"], remote: true,
  },
  {
    id: 10, title: "Dashboard em Power BI",            client: "Fintech ABC",     category: "Gestão",
    value: 1200, deadline: "25/04/2026", estimatedHours: 14, rating: 4.6, urgency: "baixa",
    nivelMinimo: "Gold",   description: "Construir dashboard executivo no Power BI com KPIs de vendas, funil e retenção. Fontes: planilhas Excel e conexão SQL fornecidas.",
    skills: ["Power BI", "SQL", "Excel"], remote: true,
  },
  {
    id: 11, title: "Reels para Instagram — 8 vídeos", client: "Academia FIT",    category: "Design",
    value: 560,  deadline: "14/04/2026", estimatedHours: 7,  rating: 4.5, urgency: "media",
    nivelMinimo: "Bronze", description: "Criar e editar 8 Reels para as redes sociais da academia. Conteúdo: dicas de treino, motivação e divulgação de aulas. Roteiros fornecidos.",
    skills: ["CapCut", "Premiere", "Instagram"], remote: true,
  },
  {
    id: 12, title: "Proposta Comercial (template)",   client: "Agência 360",     category: "Design",
    value: 450,  deadline: "11/04/2026", estimatedHours: 6,  rating: 4.7, urgency: "alta",
    nivelMinimo: "Bronze", description: "Criar template de proposta comercial no Canva ou PowerPoint com design profissional, adaptado à identidade visual da agência. Versão editável.",
    skills: ["Canva", "PowerPoint", "Design editorial"], remote: true,
  },
  {
    id: 13, title: "E-book — Marketing para PMEs",    client: "Instituto MKT",   category: "Conteúdo",
    value: 1100, deadline: "28/04/2026", estimatedHours: 12, rating: 4.8, urgency: "baixa",
    nivelMinimo: "Silver", description: "Produzir e-book de 40–50 páginas sobre marketing digital para PMEs. Inclui pesquisa, redação, revisão e diagramação em Canva ou InDesign.",
    skills: ["Redação", "InDesign", "Pesquisa"], remote: true,
  },
  {
    id: 14, title: "Planilha de Precificação",        client: "Consultoria RH",  category: "Gestão",
    value: 380,  deadline: "07/04/2026", estimatedHours: 4,  rating: 4.4, urgency: "alta",
    nivelMinimo: "Bronze", description: "Construir planilha de Excel com cálculo automático de precificação de serviços de RH, com tabelas dinâmicas e dashboard visual.",
    skills: ["Excel", "Fórmulas avançadas", "Power Query"], remote: true,
  },
  {
    id: 15, title: "Newsletter Semanal — abril",      client: "Startup SaaS",    category: "Conteúdo",
    value: 280,  deadline: "30/04/2026", estimatedHours: 3,  rating: 4.6, urgency: "baixa",
    nivelMinimo: "Bronze", description: "Redigir 4 edições de newsletter semanal (500–700 palavras cada), com curadoria de notícias do setor, CTA e formatação em Mailchimp.",
    skills: ["Mailchimp", "Redação", "Curadoria"], remote: true,
  },
  {
    id: 16, title: "Site Institucional — 5 páginas",  client: "Clínica Estética", category: "Desenvolvimento",
    value: 2800, deadline: "30/04/2026", estimatedHours: 30, rating: 4.9, urgency: "media",
    nivelMinimo: "Gold",   description: "Desenvolver site responsivo com 5 páginas: home, sobre, serviços, galeria e contato. WordPress + Elementor ou React. SEO básico incluso.",
    skills: ["WordPress", "Elementor", "HTML/CSS"], remote: true,
  },
  {
    id: 17, title: "Infográfico — Relatório Anual",   client: "ONG Educação",    category: "Design",
    value: 540,  deadline: "16/04/2026", estimatedHours: 7,  rating: 4.5, urgency: "media",
    nivelMinimo: "Bronze", description: "Criar infográfico do relatório anual 2025 da ONG, com visualização de dados de impacto, programas e financiadores. Entrega em PDF e PNG.",
    skills: ["Illustrator", "Infografia", "Visualização de dados"], remote: true,
  },
  {
    id: 18, title: "Tráfego Pago — Meta Ads",        client: "Pet Shop Amigos",  category: "Marketing",
    value: 720,  deadline: "13/04/2026", estimatedHours: 8,  rating: 4.6, urgency: "alta",
    nivelMinimo: "Silver", description: "Criar e gerenciar campanha no Meta Ads (Facebook e Instagram) para pet shop. Inclui criação de públicos, criativos e relatório de desempenho.",
    skills: ["Meta Ads", "Copywriting", "Criativos"], remote: true,
  },
]

const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

export default function TarefasDisponiveisPage() {
  const { sidebarWidth } = useSidebar();
  const { headerHeight, footerHeight } = useAppFrameMetrics();
  const [search, setSearch]     = useState("")
  const [categoria, setCateg]   = useState("Todos")
  const [saved, setSaved]       = useState<Set<number>>(new Set())
  const [detail, setDetail]     = useState<Task | null>(null)
  const [applying, setApplying] = useState<number | null>(null)
  const [confirmApply, setConfirmApply] = useState<Task | null>(null)

  const toggleSave = (id: number) =>
    setSaved((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })

  const handleApply = (id: number) => {
    setApplying(id)
    setConfirmApply(null)
    setTimeout(() => setApplying(null), 1500)
  }

  const filtered = AVAILABLE_TASKS.filter((t) => {
    const q = search.toLowerCase()
    const matchQ = t.title.toLowerCase().includes(q) || t.client.toLowerCase().includes(q) || t.skills.some((s) => s.toLowerCase().includes(q))
    const matchC = categoria === "Todos" || t.category === categoria
    return matchQ && matchC
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tarefas Disponíveis"
        subtitle={`${AVAILABLE_TASKS.length} tarefas abertas para candidatura`}
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <Input
            placeholder="Buscar tarefa, cliente ou habilidade..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {CATEGORIAS.map((c) => (
            <button
              key={c}
              onClick={() => setCateg(c)}
              className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                categoria === c
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      <p className="text-xs text-slate-400">{filtered.length} resultado{filtered.length !== 1 ? "s" : ""}</p>

      {/* Task cards grid */}
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((t) => {
          const urg  = URGENCIA_CFG[t.urgency]
          const isSaved = saved.has(t.id)
          return (
            <div
              key={t.id}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm p-4 flex flex-col gap-3 hover:shadow-md transition-shadow"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-snug">{t.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{t.client}</p>
                </div>
                <button
                  onClick={() => toggleSave(t.id)}
                  className="shrink-0 text-slate-300 hover:text-amber-500 transition-colors mt-0.5"
                >
                  {isSaved
                    ? <BookmarkCheck className="h-4 w-4 text-amber-500" />
                    : <Bookmark className="h-4 w-4" />
                  }
                </button>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-1.5">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${urg.cls}`}>{urg.label}</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${NIVEL_BADGE[t.nivelMinimo]}`}>
                  {t.nivelMinimo}+
                </span>
                <span className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-transparent">
                  {t.category}
                </span>
              </div>

              {/* Meta row */}
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1"><Wallet className="h-3.5 w-3.5 text-violet-500" />{fmtBRL(t.value)}</span>
                <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-blue-400" />{t.estimatedHours}h est.</span>
                <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 text-amber-400" />{t.rating.toFixed(1)}</span>
              </div>

              {/* Deadline */}
              <p className="text-xs text-slate-400">
                Prazo: <span className="font-medium text-slate-600 dark:text-slate-300">{t.deadline}</span>
              </p>

              {/* Skills */}
              <div className="flex flex-wrap gap-1">
                {t.skills.slice(0, 3).map((s) => (
                  <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
                    {s}
                  </span>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-auto pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs h-8"
                  onClick={() => setDetail(t)}
                >
                  Ver detalhes
                </Button>
                <Button
                  size="sm"
                  className="flex-1 text-xs h-8 bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => setConfirmApply(t)}
                  disabled={applying === t.id}
                >
                  {applying === t.id ? "Enviado ✓" : "Candidatar-se"}
                </Button>
              </div>
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div className="col-span-full text-center py-16 text-slate-400">
            <Search className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhuma tarefa encontrada para este filtro</p>
          </div>
        )}
      </div>

      {/* Detail sheet */}
      <Sheet open={!!detail} onOpenChange={() => setDetail(null)}>
        <SheetContent
          side="right"
          hideOverlay
          className="w-full p-0 flex flex-col overflow-hidden"
          style={{
            left: `${sidebarWidth}px`,
            width: `calc(100vw - ${sidebarWidth}px)`,
            top: `${headerHeight - 1}px`,
            bottom: `${footerHeight - 1}px`,
          }}
        >
          {detail && (
            <>
              <div className="px-6 py-5 shrink-0 bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700">
                <SheetTitle className="text-lg font-bold text-white">{detail.title}</SheetTitle>
                <p className="text-sm text-blue-100 mt-1">{detail.client}</p>
              </div>

              <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950/40 px-[50px] py-[50px]">
                <div className="space-y-6 max-w-3xl mx-auto">
                  <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-900 shadow-sm p-6 space-y-4">
                    <div className="flex flex-wrap gap-2">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${URGENCIA_CFG[detail.urgency].cls}`}>
                    Urgência {URGENCIA_CFG[detail.urgency].label}
                  </span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${NIVEL_BADGE[detail.nivelMinimo]}`}>
                    {detail.nivelMinimo}+ requerido
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg bg-violet-50 dark:bg-violet-950/30 border border-violet-100 dark:border-violet-800 p-3 text-center">
                    <Wallet className="h-4 w-4 text-violet-500 mx-auto mb-1" />
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{fmtBRL(detail.value)}</p>
                    <p className="text-[10px] text-slate-400">Valor</p>
                  </div>
                  <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-800 p-3 text-center">
                    <Clock className="h-4 w-4 text-blue-500 mx-auto mb-1" />
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{detail.estimatedHours}h</p>
                    <p className="text-[10px] text-slate-400">Estimado</p>
                  </div>
                  <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-800 p-3 text-center">
                    <Star className="h-4 w-4 text-amber-500 mx-auto mb-1" />
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{detail.rating.toFixed(1)}</p>
                    <p className="text-[10px] text-slate-400">Avaliação</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Prazo de entrega</p>
                  <p className="text-sm text-slate-700 dark:text-slate-200">{detail.deadline}</p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Descrição</p>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{detail.description}</p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Habilidades necessárias</p>
                  <div className="flex flex-wrap gap-1.5">
                    {detail.skills.map((s) => (
                      <span key={s} className="text-xs px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200/80 dark:border-slate-700/80 px-6 py-4 bg-white dark:bg-slate-900 flex items-center justify-end gap-3">
                <Button variant="outline" onClick={() => setDetail(null)}>Fechar</Button>
                <Button
                  className="btn-brand"
                  onClick={() => { setConfirmApply(detail); setDetail(null) }}
                  disabled={applying === detail.id}
                >
                  {applying === detail.id ? "Candidatura enviada ✓" : "Candidatar-se agora"}
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Confirmation sheet for applying */}
      <Sheet open={!!confirmApply} onOpenChange={() => setConfirmApply(null)}>
        <SheetContent
          side="right"
          hideOverlay
          className="w-full p-0 flex flex-col overflow-hidden"
          style={{
            left: `${sidebarWidth}px`,
            width: `calc(100vw - ${sidebarWidth}px)`,
            top: `${headerHeight - 1}px`,
            bottom: `${footerHeight - 1}px`,
          }}
        >
          {confirmApply && (
            <>
              <div className="px-6 py-5 shrink-0 bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700">
                <SheetTitle className="text-lg font-bold text-white">
                  Confirmar Candidatura
                </SheetTitle>
                <p className="text-sm text-blue-100 mt-1">
                  Revise as informações antes de confirmar sua candidatura
                </p>
              </div>

              <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950/40 px-[50px] py-[50px]">
                <div className="space-y-6 max-w-3xl mx-auto">
                  {/* Task info card */}
                  <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-900 shadow-sm p-6 space-y-4">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Tarefa</p>
                      <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{confirmApply.title}</h3>
                      <p className="text-sm text-slate-500 mt-0.5">{confirmApply.client}</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${URGENCIA_CFG[confirmApply.urgency].cls}`}>
                        Urgência {URGENCIA_CFG[confirmApply.urgency].label}
                      </span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${NIVEL_BADGE[confirmApply.nivelMinimo]}`}>
                        {confirmApply.nivelMinimo}+ requerido
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-3 pt-2">
                      <div className="rounded-lg bg-violet-50 dark:bg-violet-950/30 border border-violet-100 dark:border-violet-800 p-3 text-center">
                        <Wallet className="h-4 w-4 text-violet-500 mx-auto mb-1" />
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{fmtBRL(confirmApply.value)}</p>
                        <p className="text-[10px] text-slate-400">Valor</p>
                      </div>
                      <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-800 p-3 text-center">
                        <Clock className="h-4 w-4 text-blue-500 mx-auto mb-1" />
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{confirmApply.estimatedHours}h</p>
                        <p className="text-[10px] text-slate-400">Estimativa</p>
                      </div>
                      <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-800 p-3 text-center">
                        <Clock className="h-4 w-4 text-amber-500 mx-auto mb-1" />
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{confirmApply.deadline}</p>
                        <p className="text-[10px] text-slate-400">Prazo</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Descrição</p>
                      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{confirmApply.description}</p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Habilidades necessárias</p>
                      <div className="flex flex-wrap gap-1.5">
                        {confirmApply.skills.map((s) => (
                          <span key={s} className="text-xs px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Expectations card */}
                  <div className="rounded-2xl border border-blue-200/80 dark:border-blue-700/80 bg-blue-50/50 dark:bg-blue-950/20 shadow-sm p-6">
                    <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-3">O que esperamos de você</h4>
                    <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
                      <li className="flex items-start gap-2">
                        <span className="text-blue-500 mt-0.5">•</span>
                        <span>Cumprir o prazo estabelecido ({confirmApply.deadline})</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-500 mt-0.5">•</span>
                        <span>Entregar trabalho de qualidade de acordo com os requisitos</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-500 mt-0.5">•</span>
                        <span>Manter comunicação ativa durante a execução</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-500 mt-0.5">•</span>
                        <span>Aplicar as habilidades listadas: {confirmApply.skills.join(", ")}</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200/80 dark:border-slate-700/80 px-6 py-4 bg-white dark:bg-slate-900 flex items-center justify-end gap-3">
                <Button variant="outline" onClick={() => setConfirmApply(null)}>
                  Cancelar
                </Button>
                <Button
                  className="btn-brand"
                  onClick={() => handleApply(confirmApply.id)}
                  disabled={applying === confirmApply.id}
                >
                  {applying === confirmApply.id ? "Enviado ✓" : "Confirmar candidatura"}
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
