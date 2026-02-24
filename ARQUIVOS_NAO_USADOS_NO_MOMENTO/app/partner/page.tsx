
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  Crown,
  TrendingUp,
  Users,
  DollarSign,
  Award,
  Briefcase,
  Target,
  Zap,
  CheckCircle2,
  ArrowRight,
  Star,
  Sparkles,
} from "lucide-react"

const partnerLevels = [
  {
    name: "Bronze",
    icon: Award,
    color: "from-amber-700 to-amber-900",
    bgColor: "bg-amber-50",
    textColor: "text-amber-700",
    borderColor: "border-amber-200",
    requirements: {
      mrr: "Nível inicial",
      agencies: "-",
      mrrAgencies: "-",
    },
    benefits: ["Acesso ao catálogo de produtos", "Projetos básicos", "Suporte padrão", "Treinamento inicial"],
    status: "completed",
  },
  {
    name: "Silver",
    icon: Star,
    color: "from-slate-400 to-slate-600",
    bgColor: "bg-slate-50",
    textColor: "text-slate-700",
    borderColor: "border-slate-200",
    requirements: {
      mrr: "R$ 1.001 - R$ 2.000",
      agencies: "5 agências",
      mrrAgencies: "R$ 2.500",
    },
    benefits: [
      "Produtos premium até R$ 1.500",
      "10% desconto em créditos",
      "Suporte prioritário",
      "Treinamento avançado",
    ],
    status: "completed",
  },
  {
    name: "Gold",
    icon: Crown,
    color: "from-yellow-400 to-yellow-600",
    bgColor: "bg-yellow-50",
    textColor: "text-yellow-700",
    borderColor: "border-yellow-200",
    requirements: {
      mrr: "R$ 2.001 - R$ 4.000",
      agencies: "10 agências",
      mrrAgencies: "R$ 5.000",
    },
    benefits: [
      "Produtos premium até R$ 3.000",
      "15% desconto em créditos",
      "Gerente de conta dedicado",
      "Comissão de 30% em projetos premium",
      "5% comissão em agências lideradas",
    ],
    status: "current",
  },
  {
    name: "Platinum",
    icon: Sparkles,
    color: "from-blue-400 to-blue-600",
    bgColor: "bg-blue-50",
    textColor: "text-blue-700",
    borderColor: "border-blue-200",
    requirements: {
      mrr: "R$ 4.001 - R$ 8.000",
      agencies: "20 agências",
      mrrAgencies: "R$ 10.000",
    },
    benefits: [
      "Produtos premium até R$ 5.000",
      "20% desconto em créditos",
      "Suporte VIP 24/7",
      "Acesso antecipado a novos produtos",
      "Eventos exclusivos",
    ],
    status: "next",
  },
  {
    name: "Diamond",
    icon: Zap,
    color: "from-purple-400 to-purple-600",
    bgColor: "bg-purple-50",
    textColor: "text-purple-700",
    borderColor: "border-purple-200",
    requirements: {
      mrr: "Acima de R$ 8.000",
      agencies: "40 agências",
      mrrAgencies: "R$ 15.000",
    },
    benefits: [
      "Premium acima de R$ 5.000",
      "25% desconto em créditos",
      "Squad dedicado",
      "Consultoria estratégica",
      "Co-marketing com Allka",
      "Participação em decisões de produto",
    ],
    status: "locked",
  },
]

const currentStats = {
  level: "Gold",
  mrr: 3200,
  agencies: 8,
  mrrAgencies: 4100,
  projects: 12,
  commission: 4500,
}

export default function PartnerProgramPage() {
  const currentLevelIndex = partnerLevels.findIndex((level) => level.status === "current")
  const nextLevel = partnerLevels[currentLevelIndex + 1]
  const progressToNext = nextLevel ? (currentStats.mrr / 4001) * 100 : 100

  return (
    <div className="container mx-auto pt-6 px-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-600 via-amber-600 to-orange-600 bg-clip-text text-transparent flex items-center gap-2">
            <Crown className="h-8 w-8 text-yellow-600" />
            Programa Partner
          </h1>
          <p className="text-slate-600 mt-1">Escale suas operações e maximize seus ganhos com privilégios exclusivos</p>
        </div>
        <Badge className="bg-gradient-to-r from-yellow-500 to-amber-600 text-white border-0 px-4 py-2 text-base shadow-lg">
          <Crown className="h-4 w-4 mr-1" />
          Partner Gold
        </Badge>
      </div>

      {/* Current Status */}
      <Card className="border-yellow-200 bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-900">
            <Target className="h-5 w-5 text-yellow-600" />
            Seu Status Atual
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-white/80 backdrop-blur border border-yellow-200 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-5 w-5 text-emerald-600" />
                <p className="text-sm font-medium text-slate-600">MRR Atual</p>
              </div>
              <p className="text-2xl font-bold text-slate-900">R$ {currentStats.mrr.toLocaleString()}</p>
              <p className="text-xs text-slate-500 mt-1">Meta: R$ 4.001 para Platinum</p>
            </div>

            <div className="p-4 rounded-xl bg-white/80 backdrop-blur border border-yellow-200 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-5 w-5 text-blue-600" />
                <p className="text-sm font-medium text-slate-600">Agências Lideradas</p>
              </div>
              <p className="text-2xl font-bold text-slate-900">{currentStats.agencies}</p>
              <p className="text-xs text-slate-500 mt-1">Meta: 20 para Platinum</p>
            </div>

            <div className="p-4 rounded-xl bg-white/80 backdrop-blur border border-yellow-200 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Briefcase className="h-5 w-5 text-purple-600" />
                <p className="text-sm font-medium text-slate-600">Projetos Premium</p>
              </div>
              <p className="text-2xl font-bold text-slate-900">{currentStats.projects}</p>
              <p className="text-xs text-emerald-600 mt-1">30% comissão cada</p>
            </div>

            <div className="p-4 rounded-xl bg-white/80 backdrop-blur border border-yellow-200 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-5 w-5 text-amber-600" />
                <p className="text-sm font-medium text-slate-600">Comissões Mês</p>
              </div>
              <p className="text-2xl font-bold text-slate-900">R$ {currentStats.commission.toLocaleString()}</p>
              <p className="text-xs text-emerald-600 mt-1">+18% vs. mês anterior</p>
            </div>
          </div>

          {nextLevel && (
            <div className="p-4 rounded-xl bg-white/80 backdrop-blur border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-slate-700">Progresso para {nextLevel.name}</p>
                <p className="text-sm font-bold text-blue-600">{Math.min(progressToNext, 100).toFixed(0)}%</p>
              </div>
              <Progress value={Math.min(progressToNext, 100)} className="h-3" />
              <p className="text-xs text-slate-500 mt-2">
                Faltam R$ {(4001 - currentStats.mrr).toLocaleString()} de MRR e {20 - currentStats.agencies} agências
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Partner Levels */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Award className="h-6 w-6 text-yellow-600" />
          Níveis de Gamificação
        </h2>

        {partnerLevels.map((level, index) => {
          const Icon = level.icon
          const isCompleted = level.status === "completed"
          const isCurrent = level.status === "current"
          const isNext = level.status === "next"
          const isLocked = level.status === "locked"

          return (
            <Card
              key={level.name}
              className={`transition-all duration-200 ${
                isCurrent
                  ? `border-2 ${level.borderColor} ${level.bgColor} shadow-lg`
                  : isCompleted
                    ? `${level.bgColor} border ${level.borderColor}`
                    : isNext
                      ? "border-2 border-blue-200 bg-blue-50/50"
                      : "border border-slate-200 bg-slate-50/50 opacity-75"
              }`}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-12 w-12 rounded-xl bg-gradient-to-br ${level.color} flex items-center justify-center shadow-md`}
                    >
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl text-slate-900 flex items-center gap-2">
                        {level.name}
                        {isCurrent && (
                          <Badge className="bg-yellow-500 text-white border-0">
                            <Crown className="h-3 w-3 mr-1" />
                            Atual
                          </Badge>
                        )}
                        {isCompleted && (
                          <Badge className="bg-emerald-500 text-white border-0">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Conquistado
                          </Badge>
                        )}
                        {isNext && (
                          <Badge className="bg-blue-500 text-white border-0">
                            <ArrowRight className="h-3 w-3 mr-1" />
                            Próximo
                          </Badge>
                        )}
                      </CardTitle>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-3">Requisitos</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="h-4 w-4 text-emerald-600" />
                        <span className="text-slate-700">
                          <strong>MRR:</strong> {level.requirements.mrr}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="h-4 w-4 text-blue-600" />
                        <span className="text-slate-700">
                          <strong>Agências:</strong> {level.requirements.agencies}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <TrendingUp className="h-4 w-4 text-purple-600" />
                        <span className="text-slate-700">
                          <strong>MRR Lideradas:</strong> {level.requirements.mrrAgencies}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-slate-900 mb-3">Benefícios</h4>
                    <ul className="space-y-2">
                      {level.benefits.map((benefit, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Call to Action */}
      <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-lg">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Pronto para o próximo nível?</h3>
              <p className="text-slate-600">
                Continue crescendo e desbloqueie benefícios ainda mais exclusivos no Programa Partner.
              </p>
            </div>
            <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md gap-2">
              Ver Estratégias de Crescimento
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
