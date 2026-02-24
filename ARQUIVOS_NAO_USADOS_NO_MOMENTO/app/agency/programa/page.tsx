
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Award, TrendingUp, Users, DollarSign, Star, Crown, Gem, Zap, Trophy } from "lucide-react"

// Mock data
const partnerStatus = {
  current_level: "gold",
  current_mrr: 12500,
  led_agencies: 5,
  total_commission: 45890.75,
  next_level: "platinum",
  next_level_mrr: 25000,
  progress: 50,
}

const partnerLevels = [
  {
    name: "Bronze",
    icon: Award,
    color: "from-orange-600 to-orange-700",
    requirements: {
      mrr: 5000,
      agencies: 2,
    },
    benefits: [
      "5% de comissão sobre MRR das agências lideradas",
      "Acesso ao programa de treinamento",
      "Badge Bronze no perfil",
      "Suporte prioritário",
    ],
  },
  {
    name: "Silver",
    icon: Star,
    color: "from-slate-400 to-slate-500",
    requirements: {
      mrr: 10000,
      agencies: 3,
    },
    benefits: [
      "7% de comissão sobre MRR das agências lideradas",
      "Acesso a eventos exclusivos",
      "Badge Silver no perfil",
      "Materiais de marketing personalizados",
      "Todos os benefícios Bronze",
    ],
  },
  {
    name: "Gold",
    icon: Crown,
    color: "from-yellow-500 to-yellow-600",
    requirements: {
      mrr: 15000,
      agencies: 5,
    },
    benefits: [
      "10% de comissão sobre MRR das agências lideradas",
      "Participação em decisões estratégicas",
      "Badge Gold no perfil",
      "Acesso antecipado a novos recursos",
      "Todos os benefícios Silver",
    ],
  },
  {
    name: "Platinum",
    icon: Gem,
    color: "from-cyan-500 to-blue-600",
    requirements: {
      mrr: 25000,
      agencies: 8,
    },
    benefits: [
      "12% de comissão sobre MRR das agências lideradas",
      "Consultoria estratégica personalizada",
      "Badge Platinum no perfil",
      "Co-branding em materiais oficiais",
      "Todos os benefícios Gold",
    ],
  },
  {
    name: "Diamond",
    icon: Trophy,
    color: "from-purple-600 to-pink-600",
    requirements: {
      mrr: 50000,
      agencies: 15,
    },
    benefits: [
      "15% de comissão sobre MRR das agências lideradas",
      "Participação nos lucros da plataforma",
      "Badge Diamond no perfil",
      "Representação em eventos internacionais",
      "Todos os benefícios Platinum",
    ],
  },
]

export default function AgencyProgramaPage() {
  console.log("[v0] AgencyProgramaPage rendered")

  const currentLevelData = partnerLevels.find((level) => level.name.toLowerCase() === partnerStatus.current_level)
  const CurrentLevelIcon = currentLevelData?.icon || Award

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 dark:from-slate-950 dark:via-blue-950/20 dark:to-purple-950/10">
      <div className="container mx-auto pt-6 px-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Programa Partner
          </h1>
          <p className="text-slate-600 dark:text-slate-400">Cresça conosco e seja recompensado pelo seu sucesso</p>
        </div>

        {/* Current Status */}
        <Card className="mb-8 bg-gradient-to-br from-blue-500 to-purple-600 text-white border-0 shadow-xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl flex items-center gap-3">
                  <CurrentLevelIcon className="h-8 w-8" />
                  Nível {partnerStatus.current_level.charAt(0).toUpperCase() + partnerStatus.current_level.slice(1)}
                </CardTitle>
                <CardDescription className="text-white/80 mt-2">Seu status atual no programa</CardDescription>
              </div>
              <Badge className="bg-white/20 text-white backdrop-blur-sm text-lg px-4 py-2">
                {partnerStatus.current_level.toUpperCase()}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-5 w-5" />
                  <span className="text-sm opacity-90">MRR Total</span>
                </div>
                <div className="text-2xl font-bold">R$ {partnerStatus.current_mrr.toLocaleString("pt-BR")}</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-5 w-5" />
                  <span className="text-sm opacity-90">Agências Lideradas</span>
                </div>
                <div className="text-2xl font-bold">{partnerStatus.led_agencies}</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-5 w-5" />
                  <span className="text-sm opacity-90">Comissões Totais</span>
                </div>
                <div className="text-2xl font-bold">R$ {partnerStatus.total_commission.toLocaleString("pt-BR")}</div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Progresso para {partnerStatus.next_level}</span>
                <span className="text-sm font-bold">{partnerStatus.progress}%</span>
              </div>
              <Progress value={partnerStatus.progress} className="h-3 bg-white/20" />
              <p className="text-xs mt-2 opacity-80">
                Faltam R$ {(partnerStatus.next_level_mrr - partnerStatus.current_mrr).toLocaleString("pt-BR")} em MRR
                para o próximo nível
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Partner Levels */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-6">Níveis do Programa</h2>
          <div className="grid grid-cols-1 gap-6">
            {partnerLevels.map((level) => {
              const LevelIcon = level.icon
              const isCurrentLevel = level.name.toLowerCase() === partnerStatus.current_level

              return (
                <Card
                  key={level.name}
                  className={`bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-2 shadow-lg hover:shadow-xl transition-all duration-300 ${
                    isCurrentLevel
                      ? "border-blue-500 ring-2 ring-blue-500/20"
                      : "border-slate-200 dark:border-slate-800"
                  }`}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div
                          className={`h-16 w-16 rounded-xl bg-gradient-to-br ${level.color} flex items-center justify-center text-white shadow-lg`}
                        >
                          <LevelIcon className="h-8 w-8" />
                        </div>
                        <div>
                          <CardTitle className="text-2xl flex items-center gap-2">
                            {level.name}
                            {isCurrentLevel && <Badge className="bg-blue-500 hover:bg-blue-600">Nível Atual</Badge>}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            MRR: R$ {level.requirements.mrr.toLocaleString("pt-BR")} | Agências:{" "}
                            {level.requirements.agencies}
                          </CardDescription>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm text-slate-600 dark:text-slate-400 mb-3">Benefícios:</h4>
                      {level.benefits.map((benefit, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <Zap className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-slate-700 dark:text-slate-300">{benefit}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
