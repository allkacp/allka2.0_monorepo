
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, Plus, Edit, TrendingUp, AlertCircle, CheckCircle } from "lucide-react"
import { PageHeader } from "@/components/page-header"

const availabilitySlots = [
  {
    id: "1",
    day: "Segunda-feira",
    periods: [
      { start: "09:00", end: "12:00", status: "disponivel" },
      { start: "14:00", end: "18:00", status: "disponivel" },
    ],
  },
  {
    id: "2",
    day: "Terça-feira",
    periods: [
      { start: "09:00", end: "12:00", status: "ocupado" },
      { start: "14:00", end: "17:00", status: "disponivel" },
    ],
  },
  {
    id: "3",
    day: "Quarta-feira",
    periods: [
      { start: "09:00", end: "13:00", status: "disponivel" },
      { start: "15:00", end: "18:00", status: "disponivel" },
    ],
  },
  {
    id: "4",
    day: "Quinta-feira",
    periods: [
      { start: "09:00", end: "12:00", status: "ocupado" },
      { start: "14:00", end: "18:00", status: "disponivel" },
    ],
  },
  {
    id: "5",
    day: "Sexta-feira",
    periods: [
      { start: "09:00", end: "12:00", status: "disponivel" },
      { start: "14:00", end: "16:00", status: "ocupado" },
    ],
  },
  {
    id: "6",
    day: "Sábado",
    periods: [{ start: "10:00", end: "13:00", status: "disponivel" }],
  },
  {
    id: "7",
    day: "Domingo",
    periods: [],
  },
]

const upcomingCommitments = [
  {
    id: "1",
    title: "Reunião de Kickoff - Projeto TechStore",
    date: "2024-02-15",
    time: "10:00 - 11:00",
    type: "reuniao",
  },
  {
    id: "2",
    title: "Entrega: Banner Homepage",
    date: "2024-02-15",
    time: "18:00",
    type: "entrega",
  },
  {
    id: "3",
    title: "Revisão: Vídeos Instagram",
    date: "2024-02-16",
    time: "15:00 - 16:00",
    type: "revisao",
  },
  {
    id: "4",
    title: "Workshop Allkademy: Design Avançado",
    date: "2024-02-17",
    time: "14:00 - 17:00",
    type: "treinamento",
  },
]

export default function NomadesDisponibilidadePage() {
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  const totalHoursPerWeek = availabilitySlots.reduce((total, day) => {
    return (
      total +
      day.periods.reduce((dayTotal, period) => {
        const start = Number.parseInt(period.start.split(":")[0])
        const end = Number.parseInt(period.end.split(":")[0])
        return dayTotal + (end - start)
      }, 0)
    )
  }, 0)

  const availableHours = availabilitySlots.reduce((total, day) => {
    return (
      total +
      day.periods
        .filter((p) => p.status === "disponivel")
        .reduce((dayTotal, period) => {
          const start = Number.parseInt(period.start.split(":")[0])
          const end = Number.parseInt(period.end.split(":")[0])
          return dayTotal + (end - start)
        }, 0)
    )
  }, 0)

  const occupiedHours = totalHoursPerWeek - availableHours

  const getTypeColor = (type: string) => {
    const colors = {
      reuniao: "bg-blue-100 text-blue-800 border-blue-200",
      entrega: "bg-green-100 text-green-800 border-green-200",
      revisao: "bg-orange-100 text-orange-800 border-orange-200",
      treinamento: "bg-purple-100 text-purple-800 border-purple-200",
    }
    return colors[type as keyof typeof colors] || colors.reuniao
  }

  const getTypeLabel = (type: string) => {
    const labels = {
      reuniao: "Reunião",
      entrega: "Entrega",
      revisao: "Revisão",
      treinamento: "Treinamento",
    }
    return labels[type as keyof typeof labels] || type
  }

  return (
    <div className="container mx-auto px-0 py-0 space-y-6">
      {/* Header */}
      <PageHeader
        title="Disponibilidade"
        description="Gerencie sua disponibilidade e compromissos semanais"
        actions={
          <Button className="bg-blue-500 hover:bg-blue-600 text-white">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Período
          </Button>
        }
      />

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Horas Semanais</p>
                <p className="text-3xl font-bold text-blue-600">{totalHoursPerWeek}h</p>
                <p className="text-sm text-gray-500">Total configurado</p>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Horas Disponíveis</p>
                <p className="text-3xl font-bold text-green-600">{availableHours}h</p>
                <p className="text-sm text-gray-500">
                  {((availableHours / totalHoursPerWeek) * 100).toFixed(0)}% livre
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Horas Ocupadas</p>
                <p className="text-3xl font-bold text-orange-600">{occupiedHours}h</p>
                <p className="text-sm text-gray-500">
                  {((occupiedHours / totalHoursPerWeek) * 100).toFixed(0)}% alocado
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Próximo Livre</p>
                <p className="text-2xl font-bold text-purple-600">Seg 14h</p>
                <p className="text-sm text-gray-500">Próximo slot</p>
              </div>
              <Calendar className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress to Platinum */}
      <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-purple-600" />
                Progresso para Nível Platinum
              </h3>
              <p className="text-sm text-gray-600 mt-1">Aumente sua disponibilidade para 20h semanais</p>
            </div>
            <Badge className="bg-purple-500 text-white">18h / 20h</Badge>
          </div>
          <div className="w-full bg-purple-200 rounded-full h-3 mb-2">
            <div className="bg-purple-600 h-3 rounded-full transition-all" style={{ width: "90%" }}></div>
          </div>
          <p className="text-sm text-purple-700">
            Faltam apenas <strong>2 horas</strong> para atingir o requisito de disponibilidade Platinum e ter acesso à
            remuneração mínima mensal garantida!
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Calendar */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-blue-500" />
                Calendário Semanal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {availabilitySlots.map((day) => (
                  <div
                    key={day.id}
                    className={`p-4 border rounded-lg transition-all ${
                      selectedDay === day.id ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => setSelectedDay(day.id)}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-gray-900">{day.day}</h4>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline">
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    {day.periods.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {day.periods.map((period, index) => (
                          <div
                            key={index}
                            className={`px-3 py-2 rounded-md text-sm font-medium ${
                              period.status === "disponivel"
                                ? "bg-green-100 text-green-800 border border-green-200"
                                : "bg-gray-100 text-gray-800 border border-gray-200"
                            }`}
                          >
                            {period.start} - {period.end}
                            {period.status === "disponivel" ? " ✓" : " 🔒"}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 italic">Nenhum período configurado</p>
                    )}

                    <div className="mt-2 text-xs text-gray-600">
                      Total:{" "}
                      {day.periods.reduce((total, period) => {
                        const start = Number.parseInt(period.start.split(":")[0])
                        const end = Number.parseInt(period.end.split(":")[0])
                        return total + (end - start)
                      }, 0)}
                      h | Disponível:{" "}
                      {day.periods
                        .filter((p) => p.status === "disponivel")
                        .reduce((total, period) => {
                          const start = Number.parseInt(period.start.split(":")[0])
                          const end = Number.parseInt(period.end.split(":")[0])
                          return total + (end - start)
                        }, 0)}
                      h
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Commitments */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertCircle className="h-5 w-5 mr-2 text-orange-500" />
                Próximos Compromissos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingCommitments.map((commitment) => (
                  <div key={commitment.id} className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-sm text-gray-900">{commitment.title}</h4>
                      <Badge className={getTypeColor(commitment.type)} variant="outline">
                        {getTypeLabel(commitment.type)}
                      </Badge>
                    </div>
                    <div className="flex items-center text-xs text-gray-600 space-x-3">
                      <div className="flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        {new Date(commitment.date).toLocaleDateString()}
                      </div>
                      <div className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {commitment.time}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Button className="w-full mt-4 bg-transparent" variant="outline">
                <Calendar className="h-4 w-4 mr-2" />
                Ver Calendário Completo
              </Button>
            </CardContent>
          </Card>

          {/* Quick Tips */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-sm">Dicas de Disponibilidade</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex items-start">
                  <CheckCircle className="h-4 w-4 mr-2 text-green-500 mt-0.5 flex-shrink-0" />
                  <p>Mantenha sua disponibilidade atualizada para receber mais oportunidades</p>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-4 w-4 mr-2 text-green-500 mt-0.5 flex-shrink-0" />
                  <p>20h semanais desbloqueiam o nível Platinum com renda garantida</p>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-4 w-4 mr-2 text-green-500 mt-0.5 flex-shrink-0" />
                  <p>Bloqueie períodos ocupados para evitar conflitos de agenda</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
