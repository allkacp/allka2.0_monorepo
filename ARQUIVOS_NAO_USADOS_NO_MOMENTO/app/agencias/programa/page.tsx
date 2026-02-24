
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { PageHeader } from "@/components/page-header"
import {
  Award,
  Star,
  TrendingUp,
  Users,
  DollarSign,
  CheckCircle2,
  Lock,
  Unlock,
  Gift,
  Zap,
  Target,
  Trophy,
  Crown,
  Sparkles,
} from "lucide-react"

const programLevels = [
  {
    id: 1,
    name: "Básico",
    level: 1,
    commission: 15,
    color: "blue",
    requirements: {
      mrr: 0,
      projects: 0,
      agencies: 0,
    },
    benefits: [
      { icon: Star, text: "Comissão de 15% em todos os projetos", active: true },
      { icon: TrendingUp, text: "Suporte prioritário por email", active: true },
      { icon: Users, text: "Acesso ao catálogo completo", active: true },
      { icon: Gift, text: "Material de marketing básico", active: true },
    ],
  },
  {
    id: 2,
    name: "Partner",
    level: 2,
    commission: 20,
    color: "purple",
    requirements: {
      mrr: 5000,
      projects: 10,
      agencies: 0,
    },
    benefits: [
      { icon: Star, text: "Comissão de 20% em todos os projetos", active: true },
      { icon: Users, text: "Capacidade de liderar outras agências", active: true },
      { icon: DollarSign, text: "Comissão de 5% sobre agências lideradas", active: true },
      { icon: Zap, text: "Suporte prioritário via chat", active: true },
      { icon: Gift, text: "Kit de marketing avançado", active: true },
      { icon: Target, text: "Treinamentos exclusivos mensais", active: true },
    ],
  },
  {
    id: 3,
    name: "Premium",
    level: 3,
    commission: 25,
    color: "amber",
    requirements: {
      mrr: 10000,
      projects: 25,
      agencies: 3,
    },
    benefits: [
      { icon: Crown, text: "Comissão de 25% em todos os projetos", active: true },
      { icon: Users, text: "Liderança ilimitada de agências", active: true },
      { icon: DollarSign, text: "Comissão de 7% sobre agências lideradas", active: true },
      { icon: Trophy, text: "Gerente de conta dedicado", active: true },
      { icon: Sparkles, text: "Acesso antecipado a novos recursos", active: true },
      { icon: Gift, text: "Kit premium completo + eventos exclusivos", active: true },
      { icon: Award, text: "Certificação oficial Partner Premium", active: true },
      { icon: Target, text: "Consultoria estratégica trimestral", active: true },
    ],
  },
]

const currentLevel = 3
const currentStats = {
  mrr: 12500,
  projects: 45,
  agencies: 5,
}

export default function AgenciasProgramaPage() {
  const [selectedLevel, setSelectedLevel] = useState<(typeof programLevels)[0] | null>(null)

  const currentLevelData = programLevels.find((l) => l.level === currentLevel)
  const nextLevel = programLevels.find((l) => l.level === currentLevel + 1)

  const getProgressToNextLevel = () => {
    if (!nextLevel) return 100
    const mrrProgress = Math.min((currentStats.mrr / nextLevel.requirements.mrr) * 100, 100)
    const projectsProgress = Math.min((currentStats.projects / nextLevel.requirements.projects) * 100, 100)
    const agenciesProgress = Math.min((currentStats.agencies / nextLevel.requirements.agencies) * 100, 100)
    return Math.round((mrrProgress + projectsProgress + agenciesProgress) / 3)
  }

  const getLevelColor = (color: string) => {
    const colors = {
      blue: {
        bg: "from-blue-500 to-blue-600",
        text: "text-blue-600",
        badge: "bg-blue-100 text-blue-700 border-blue-300",
        card: "border-blue-500",
      },
      purple: {
        bg: "from-purple-500 to-purple-600",
        text: "text-purple-600",
        badge: "bg-purple-100 text-purple-700 border-purple-300",
        card: "border-purple-500",
      },
      amber: {
        bg: "from-amber-500 to-amber-600",
        text: "text-amber-600",
        badge: "bg-amber-100 text-amber-700 border-amber-300",
        card: "border-amber-500",
      },
    }
    return colors[color as keyof typeof colors] || colors.blue
  }

  return (
    <div className="min-h-screen bg-slate-200 px-0 py-0">
      <div className="max-w-7xl mx-auto bg-slate-200 space-y-6 px-0 py-0">
        <PageHeader title="Programa Partner" description="Evolua sua agência e desbloqueie benefícios exclusivos" />

        {/* Current Level Card */}
        {currentLevelData && (
          <Card
            className={`bg-gradient-to-br ${getLevelColor(currentLevelData.color).bg} text-white border-0 shadow-lg`}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Crown className="h-6 w-6" />
                    <CardTitle className="text-2xl">Nível {currentLevelData.name}</CardTitle>
                  </div>
                  <p className="text-white/90">
                    {currentLevel === 3
                      ? "Você está no nível mais alto do programa!"
                      : "Continue crescendo para desbloquear mais benefícios"}
                  </p>
                </div>
                <Award className="h-16 w-16 text-white/30" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-white/10 backdrop-blur-sm">
                  <Star className="h-6 w-6" />
                  <div>
                    <p className="text-sm text-white/80">Comissão</p>
                    <p className="text-2xl font-bold">{currentLevelData.commission}%</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-white/10 backdrop-blur-sm">
                  <DollarSign className="h-6 w-6" />
                  <div>
                    <p className="text-sm text-white/80">MRR</p>
                    <p className="text-2xl font-bold">R$ {(currentStats.mrr / 1000).toFixed(1)}k</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-white/10 backdrop-blur-sm">
                  <Trophy className="h-6 w-6" />
                  <div>
                    <p className="text-sm text-white/80">Projetos</p>
                    <p className="text-2xl font-bold">{currentStats.projects}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-white/10 backdrop-blur-sm">
                  <Users className="h-6 w-6" />
                  <div>
                    <p className="text-sm text-white/80">Agências</p>
                    <p className="text-2xl font-bold">{currentStats.agencies}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Progress to Next Level */}
        {nextLevel && (
          <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-slate-200 dark:border-slate-800 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-500" />
                Progresso para {nextLevel.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Progresso Geral</span>
                  <span className="text-sm font-bold text-blue-600">{getProgressToNextLevel()}%</span>
                </div>
                <Progress value={getProgressToNextLevel()} className="h-3" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-600 dark:text-slate-400">MRR</span>
                    <span className="text-xs font-semibold">
                      {Math.min(Math.round((currentStats.mrr / nextLevel.requirements.mrr) * 100), 100)}%
                    </span>
                  </div>
                  <Progress
                    value={Math.min((currentStats.mrr / nextLevel.requirements.mrr) * 100, 100)}
                    className="h-2 mb-1"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    R$ {currentStats.mrr.toLocaleString()} / R$ {nextLevel.requirements.mrr.toLocaleString()}
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-600 dark:text-slate-400">Projetos</span>
                    <span className="text-xs font-semibold">
                      {Math.min(Math.round((currentStats.projects / nextLevel.requirements.projects) * 100), 100)}%
                    </span>
                  </div>
                  <Progress
                    value={Math.min((currentStats.projects / nextLevel.requirements.projects) * 100, 100)}
                    className="h-2 mb-1"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {currentStats.projects} / {nextLevel.requirements.projects}
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-600 dark:text-slate-400">Agências Lideradas</span>
                    <span className="text-xs font-semibold">
                      {Math.min(Math.round((currentStats.agencies / nextLevel.requirements.agencies) * 100), 100)}%
                    </span>
                  </div>
                  <Progress
                    value={Math.min((currentStats.agencies / nextLevel.requirements.agencies) * 100, 100)}
                    className="h-2 mb-1"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {currentStats.agencies} / {nextLevel.requirements.agencies}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Program Levels */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {programLevels.map((level) => {
            const colorConfig = getLevelColor(level.color)
            const isCurrentLevel = level.level === currentLevel
            const isUnlocked = level.level <= currentLevel

            return (
              <Card
                key={level.id}
                className={`bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all cursor-pointer ${
                  isCurrentLevel ? `border-2 ${colorConfig.card}` : "border-slate-200 dark:border-slate-800"
                }`}
                onClick={() => setSelectedLevel(level)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <CardTitle className={isCurrentLevel ? colorConfig.text : ""}>{level.name}</CardTitle>
                    {isUnlocked ? (
                      <Unlock className={`h-5 w-5 ${colorConfig.text}`} />
                    ) : (
                      <Lock className="h-5 w-5 text-slate-400" />
                    )}
                  </div>
                  <Badge className={colorConfig.badge}>Nível {level.level}</Badge>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center gap-2">
                      <Star className={`h-4 w-4 ${colorConfig.text}`} />
                      <span className="text-sm font-semibold">Comissão: {level.commission}%</span>
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                      <p>• MRR: R$ {level.requirements.mrr.toLocaleString()}+</p>
                      <p>• Projetos: {level.requirements.projects}+</p>
                      <p>• Agências: {level.requirements.agencies}+</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2 hover:bg-blue-50 dark:hover:bg-blue-950/20 bg-transparent"
                  >
                    Ver Benefícios
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Active Benefits */}
        <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-slate-200 dark:border-slate-800 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-purple-500" />
              Seus Benefícios Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentLevelData?.benefits.map((benefit, index) => {
                const Icon = benefit.icon
                return (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-4 rounded-lg bg-gradient-to-br from-slate-50 to-blue-50/30 dark:from-slate-900/50 dark:to-blue-950/20 border border-slate-200 dark:border-slate-800"
                  >
                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                      <Icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{benefit.text}</p>
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Level Details Modal */}
      <Dialog open={selectedLevel !== null} onOpenChange={() => setSelectedLevel(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-3">
              {selectedLevel && selectedLevel.level <= currentLevel ? (
                <Unlock className={getLevelColor(selectedLevel.color).text} />
              ) : (
                <Lock className="text-slate-400" />
              )}
              Nível {selectedLevel?.name}
            </DialogTitle>
            <DialogDescription>
              {selectedLevel && selectedLevel.level <= currentLevel
                ? "Você tem acesso a todos os benefícios deste nível"
                : "Complete os requisitos para desbloquear este nível"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Requirements */}
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-500" />
                Requisitos
              </h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-center">
                  <DollarSign className="h-5 w-5 mx-auto mb-1 text-emerald-500" />
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">MRR Mínimo</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    R$ {selectedLevel?.requirements.mrr.toLocaleString()}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-center">
                  <Trophy className="h-5 w-5 mx-auto mb-1 text-blue-500" />
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Projetos</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {selectedLevel?.requirements.projects}+
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-center">
                  <Users className="h-5 w-5 mx-auto mb-1 text-purple-500" />
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Agências</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {selectedLevel?.requirements.agencies}+
                  </p>
                </div>
              </div>
            </div>

            {/* Benefits */}
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                <Gift className="h-5 w-5 text-purple-500" />
                Benefícios Inclusos
              </h4>
              <div className="space-y-2">
                {selectedLevel?.benefits.map((benefit, index) => {
                  const Icon = benefit.icon
                  return (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800"
                    >
                      <Icon className="h-5 w-5 text-blue-500 flex-shrink-0" />
                      <p className="text-sm text-slate-900 dark:text-slate-100">{benefit.text}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedLevel(null)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
