
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Award, BookOpen, CheckCircle, Lock, TrendingUp } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { PageHeader } from "@/components/page-header"

const qualifications = {
  active: [
    {
      id: 1,
      name: "Design Gráfico",
      category: "Design",
      level: "Avançado",
      certifiedAt: "Jan 2024",
      tasksCompleted: 45,
      rating: 4.8,
      status: "active",
    },
    {
      id: 2,
      name: "Copywriting",
      category: "Redação",
      level: "Intermediário",
      certifiedAt: "Fev 2024",
      tasksCompleted: 28,
      rating: 4.6,
      status: "active",
    },
  ],
  inProgress: [
    {
      id: 3,
      name: "Social Media",
      category: "Marketing",
      progress: 70,
      modulesCompleted: 7,
      totalModules: 10,
      estimatedCompletion: "2 semanas",
      status: "in-progress",
    },
    {
      id: 4,
      name: "Edição de Vídeo",
      category: "Audiovisual",
      progress: 35,
      modulesCompleted: 3,
      totalModules: 8,
      estimatedCompletion: "1 mês",
      status: "in-progress",
    },
  ],
  available: [
    {
      id: 5,
      name: "Desenvolvimento Web",
      category: "Tecnologia",
      duration: "8 semanas",
      modules: 12,
      difficulty: "Avançado",
      status: "available",
    },
    {
      id: 6,
      name: "Motion Design",
      category: "Design",
      duration: "6 semanas",
      modules: 10,
      difficulty: "Intermediário",
      status: "available",
    },
    {
      id: 7,
      name: "SEO & Analytics",
      category: "Marketing",
      duration: "4 semanas",
      modules: 8,
      difficulty: "Intermediário",
      status: "available",
    },
  ],
}

export default function HabilitacoesPage() {
  return (
    <div className="container mx-auto px-0 py-0">
      <PageHeader
        title="Habilitações"
        description="Desenvolva suas habilidades através da Allkademy"
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <CheckCircle className="h-4 w-4 mr-1" />
              {qualifications.active.length} Ativas
            </Badge>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              <BookOpen className="h-4 w-4 mr-1" />
              {qualifications.inProgress.length} Em Progresso
            </Badge>
          </div>
        }
      />

      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
            Habilitações Ativas
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {qualifications.active.map((qual) => (
              <Card key={qual.id} className="border-green-200 bg-green-50/50">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className="bg-green-600 text-white">Certificado</Badge>
                        <Badge variant="outline">{qual.level}</Badge>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">{qual.name}</h3>
                      <p className="text-sm text-gray-600">{qual.category}</p>
                    </div>
                    <Award className="h-8 w-8 text-green-600" />
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-gray-600">Tarefas Completadas</p>
                      <p className="text-lg font-semibold text-gray-900">{qual.tasksCompleted}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Avaliação Média</p>
                      <p className="text-lg font-semibold text-yellow-600">⭐ {qual.rating}</p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-green-200">
                    <p className="text-xs text-gray-600">Certificado em {qual.certifiedAt}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-blue-600" />
            Cursos em Progresso
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {qualifications.inProgress.map((qual) => (
              <Card key={qual.id} className="border-blue-200 bg-blue-50/50">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <Badge className="bg-blue-600 text-white mb-2">Em Progresso</Badge>
                      <h3 className="text-lg font-semibold text-gray-900">{qual.name}</h3>
                      <p className="text-sm text-gray-600">{qual.category}</p>
                    </div>
                    <BookOpen className="h-8 w-8 text-blue-600" />
                  </div>

                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">Progresso do Curso</span>
                        <span className="text-sm font-medium text-blue-600">{qual.progress}%</span>
                      </div>
                      <Progress value={qual.progress} className="h-2" />
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">
                        Módulos: {qual.modulesCompleted}/{qual.totalModules}
                      </span>
                      <span className="text-gray-600">~{qual.estimatedCompletion}</span>
                    </div>
                  </div>

                  <Button className="w-full mt-4 bg-blue-600 hover:bg-blue-700">Continuar Curso</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <Lock className="h-5 w-5 mr-2 text-gray-600" />
            Cursos Disponíveis
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {qualifications.available.map((qual) => (
              <Card key={qual.id}>
                <CardContent className="p-6">
                  <div className="mb-4">
                    <Badge variant="outline" className="mb-2">
                      {qual.category}
                    </Badge>
                    <h3 className="text-lg font-semibold text-gray-900">{qual.name}</h3>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Duração</span>
                      <span className="font-medium">{qual.duration}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Módulos</span>
                      <span className="font-medium">{qual.modules}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Dificuldade</span>
                      <Badge variant="outline" className="text-xs">
                        {qual.difficulty}
                      </Badge>
                    </div>
                  </div>

                  <Button variant="outline" className="w-full bg-transparent">
                    Iniciar Curso
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
