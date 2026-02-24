
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/page-header"
import { Star, Award, TrendingUp, Users, Clock, DollarSign, CheckCircle, Lock } from "lucide-react"
import { Progress } from "@/components/ui/progress"

const levels = [
  {
    name: "Bronze",
    current: false,
    completed: true,
    criteria: {
      tasks: "Nível inicial",
      rating: "Sem requisitos",
      hours: "Sem requisitos",
    },
    benefits: ["Remuneração padrão", "Acesso a tarefas básicas", "Suporte da comunidade"],
    bonus: "0%",
    color: "orange",
  },
  {
    name: "Silver",
    current: true,
    completed: false,
    criteria: {
      tasks: "30 tarefas / 90 dias",
      rating: "Nota média 4.0+",
      hours: "Sem requisitos",
    },
    benefits: [
      "+25% remuneração",
      "Prioridade em tarefas",
      "Acesso a projetos intermediários",
      "Badge Silver no perfil",
    ],
    bonus: "+25%",
    color: "gray",
    progress: {
      tasks: { current: 45, required: 30, percentage: 100 },
      rating: { current: 4.2, required: 4.0, percentage: 100 },
    },
  },
  {
    name: "Gold",
    current: false,
    completed: false,
    criteria: {
      tasks: "60 tarefas / 90 dias",
      rating: "Nota média 4.5+",
      hours: "Sem requisitos",
    },
    benefits: [
      "+50% remuneração",
      "Acesso a squads especiais",
      "Projetos premium",
      "Mentoria de Leaders",
      "Badge Gold no perfil",
    ],
    bonus: "+50%",
    color: "yellow",
    progress: {
      tasks: { current: 45, required: 60, percentage: 75 },
      rating: { current: 4.2, required: 4.5, percentage: 93 },
    },
  },
  {
    name: "Platinum",
    current: false,
    completed: false,
    criteria: {
      tasks: "Convite exclusivo",
      rating: "Nota média 4.5+",
      hours: "20h semanais",
    },
    benefits: [
      "Remuneração mínima mensal garantida",
      "Projetos de alto valor",
      "Acesso VIP a novos recursos",
      "Participação em decisões",
      "Badge Platinum no perfil",
    ],
    bonus: "Garantia mensal",
    color: "blue",
    locked: true,
  },
  {
    name: "Leader",
    current: false,
    completed: false,
    criteria: {
      tasks: "Convite exclusivo",
      rating: "Nota média 4.5+",
      hours: "24h semanais",
    },
    benefits: [
      "Remuneração mínima mensal",
      "Gestão de squads",
      "Bônus por performance da equipe",
      "Participação nos lucros",
      "Badge Leader no perfil",
    ],
    bonus: "Gestão + Lucros",
    color: "purple",
    locked: true,
  },
]

export default function ProgramaPage() {
  const currentLevel = levels.find((l) => l.current)
  const nextLevel = levels.find((l) => !l.completed && !l.current && !l.locked)

  return (
    <div className="container mx-auto px-0 py-0">
      <PageHeader
        title="Programa de Níveis"
        description="Evolua sua carreira e aumente seus ganhos"
        actions={
          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
            <Award className="h-4 w-4 mr-1" />
            Nível {currentLevel?.name}
          </Badge>
        }
      />

      {currentLevel && nextLevel && (
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-purple-50">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-blue-600" />
              Seu Progresso para {nextLevel.name}
            </h3>

            <div className="space-y-4">
              {nextLevel.progress && (
                <>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-700">Tarefas Completadas (últimos 90 dias)</span>
                      <span className="text-sm font-medium text-blue-600">
                        {nextLevel.progress.tasks.current}/{nextLevel.progress.tasks.required}
                      </span>
                    </div>
                    <Progress value={nextLevel.progress.tasks.percentage} className="h-2" />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-700">Nota Média</span>
                      <span className="text-sm font-medium text-blue-600">
                        {nextLevel.progress.rating.current}/{nextLevel.progress.rating.required}
                      </span>
                    </div>
                    <Progress value={nextLevel.progress.rating.percentage} className="h-2" />
                  </div>
                </>
              )}

              <div className="p-4 bg-white rounded-lg border border-blue-200 mt-4">
                <p className="text-sm text-gray-700">
                  <strong className="text-blue-700">Para alcançar {nextLevel.name}:</strong> Complete mais{" "}
                  {nextLevel.progress && nextLevel.progress.tasks.required - nextLevel.progress.tasks.current} tarefas e
                  mantenha nota média acima de {nextLevel.criteria.rating.split(" ")[2]} para desbloquear{" "}
                  {nextLevel.bonus} de remuneração e benefícios exclusivos.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Todos os Níveis</h2>

        {levels.map((level, index) => (
          <Card
            key={index}
            className={`${
              level.current
                ? "border-blue-400 border-2 bg-blue-50/50"
                : level.completed
                  ? "border-green-400 bg-green-50/50"
                  : level.locked
                    ? "border-gray-200 bg-gray-50"
                    : "border-orange-400 bg-orange-50/50"
            }`}
          >
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="text-2xl font-bold text-gray-900">{level.name}</h3>
                    {level.current && <Badge className="bg-blue-500 text-white">Nível Atual</Badge>}
                    {level.completed && <Badge className="bg-green-500 text-white">✓ Concluído</Badge>}
                    {!level.completed && !level.current && !level.locked && (
                      <Badge className="bg-orange-500 text-white">Próximo</Badge>
                    )}
                    {level.locked && (
                      <Badge variant="outline" className="text-gray-500">
                        <Lock className="h-3 w-3 mr-1" />
                        Bloqueado
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-600">Tarefas</p>
                        <p className="text-sm font-medium text-gray-900">{level.criteria.tasks}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Star className="h-5 w-5 text-yellow-600 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-600">Avaliação</p>
                        <p className="text-sm font-medium text-gray-900">{level.criteria.rating}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Clock className="h-5 w-5 text-purple-600 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-600">Disponibilidade</p>
                        <p className="text-sm font-medium text-gray-900">{level.criteria.hours}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center">
                      <Award className="h-4 w-4 mr-1" />
                      Benefícios
                    </h4>
                    <ul className="space-y-1">
                      {level.benefits.map((benefit, i) => (
                        <li key={i} className="text-sm text-gray-700 flex items-center">
                          <span className="text-green-600 mr-2">✓</span>
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="text-right">
                  <div className="p-4 bg-white rounded-lg border border-gray-200">
                    <DollarSign className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Bônus</p>
                    <p className="text-2xl font-bold text-green-600">{level.bonus}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Users className="h-5 w-5 mr-2 text-purple-600" />
            Como Funciona o Programa
          </h3>
          <div className="space-y-3 text-sm text-gray-700">
            <p>
              <strong>Bronze:</strong> Todos os nômades começam neste nível com acesso a tarefas básicas e remuneração
              padrão.
            </p>
            <p>
              <strong>Silver:</strong> Após completar 30 tarefas em 90 dias com nota média 4.0+, você recebe +25% de
              bônus em todas as tarefas.
            </p>
            <p>
              <strong>Gold:</strong> Com 60 tarefas em 90 dias e nota 4.5+, você ganha +50% de bônus e acesso a squads
              especiais.
            </p>
            <p>
              <strong>Platinum:</strong> Por convite, com garantia de renda mensal mínima para nômades com 20h semanais
              disponíveis.
            </p>
            <p>
              <strong>Leader:</strong> Nível de gestão com funções de liderança de squads, bônus por performance da
              equipe e participação nos lucros.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
