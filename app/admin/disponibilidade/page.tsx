import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageHeader } from "@/components/page-header"
import { Users, Target, CheckCircle, AlertCircle } from "lucide-react"
import { apiClient } from "@/lib/api-client"

const defaultAvailability = {
  categories: [] as any[],
  weeklySchedule: [] as any[],
}

export default function AdminDisponibilidadePage() {
  const [mockAvailability, setAvailability] = useState(defaultAvailability)

  useEffect(() => {
    apiClient.getNomades({ limit: "500" }).then((data: any) => {
      const nomades = Array.isArray(data) ? data : data?.data || []
      const specialtyMap: Record<string, any[]> = {}
      nomades.forEach((n: any) => {
        const spec = n.specialty || "Geral"
        if (!specialtyMap[spec]) specialtyMap[spec] = []
        specialtyMap[spec].push(n)
      })
      const categories = Object.entries(specialtyMap).map(([name, list], i) => ({
        id: i + 1,
        name,
        totalNomades: list.length,
        availableNomades: list.filter((n: any) => n.is_active !== false).length,
        activeTasks: 0,
        pendingTasks: 0,
        avgResponseTime: "-",
        utilizationRate: list.length > 0 ? Math.round(((list.length - list.filter((n: any) => n.is_active !== false).length) / list.length) * 100) : 0,
      }))
      setAvailability({ categories, weeklySchedule: [] })
    }).catch(() => {})
  }, [])

  const totalAvailable = mockAvailability.categories.reduce((sum, cat) => sum + cat.availableNomades, 0)
  const totalNomades = mockAvailability.categories.reduce((sum, cat) => sum + cat.totalNomades, 0)
  const totalActiveTasks = mockAvailability.categories.reduce((sum, cat) => sum + cat.activeTasks, 0)
  const totalPendingTasks = mockAvailability.categories.reduce((sum, cat) => sum + cat.pendingTasks, 0)

  return (
    <div className="container mx-auto space-y-6 bg-slate-200 py-0 px-0">
      <PageHeader
        title="Disponibilidade"
        description="Gerencie a disponibilidade dos nômades e acompanhe a capacidade por categoria"
      />

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Nômades Disponíveis</p>
                <p className="text-3xl font-bold mt-2">{totalAvailable}</p>
                <p className="text-xs opacity-75 mt-1">de {totalNomades} total</p>
              </div>
              <CheckCircle className="h-10 w-10 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Tarefas Ativas</p>
                <p className="text-3xl font-bold mt-2">{totalActiveTasks}</p>
              </div>
              <Target className="h-10 w-10 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Tarefas Pendentes</p>
                <p className="text-3xl font-bold mt-2">{totalPendingTasks}</p>
              </div>
              <AlertCircle className="h-10 w-10 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Taxa de Utilização</p>
                <p className="text-3xl font-bold mt-2">
                  {Math.round(((totalNomades - totalAvailable) / totalNomades) * 100)}%
                </p>
              </div>
              <Users className="h-10 w-10 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="categories" className="space-y-6">
        <TabsList>
          <TabsTrigger value="categories">Por Categoria</TabsTrigger>
          <TabsTrigger value="schedule">Agenda Semanal</TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="space-y-4">
          {mockAvailability.categories.map((category) => (
            <Card key={category.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{category.name}</CardTitle>
                  <Badge
                    variant="outline"
                    className={
                      category.utilizationRate > 80
                        ? "bg-red-50 text-red-700 border-red-200"
                        : category.utilizationRate > 60
                          ? "bg-orange-50 text-orange-700 border-orange-200"
                          : "bg-green-50 text-green-700 border-green-200"
                    }
                  >
                    {category.utilizationRate}% utilização
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                  <div>
                    <p className="text-sm text-gray-600">Disponíveis</p>
                    <p className="text-2xl font-bold text-green-600">{category.availableNomades}</p>
                    <p className="text-xs text-gray-500">de {category.totalNomades}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Tarefas Ativas</p>
                    <p className="text-2xl font-bold text-blue-600">{category.activeTasks}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Pendentes</p>
                    <p className="text-2xl font-bold text-orange-600">{category.pendingTasks}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Tempo Resposta</p>
                    <p className="text-2xl font-bold">{category.avgResponseTime}</p>
                  </div>
                  <div className="flex items-center">
                    <Button variant="outline" size="sm" className="w-full bg-transparent">
                      Ver Detalhes
                    </Button>
                  </div>
                </div>

                {/* Utilization Bar */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-600">Capacidade</span>
                    <span className="font-medium">{category.utilizationRate}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full ${
                        category.utilizationRate > 80
                          ? "bg-red-500"
                          : category.utilizationRate > 60
                            ? "bg-orange-500"
                            : "bg-green-500"
                      }`}
                      style={{ width: `${category.utilizationRate}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="schedule" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Disponibilidade Semanal</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockAvailability.weeklySchedule.map((day) => (
                  <div key={day.day} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{day.day}</span>
                      <span className="text-sm text-gray-600">
                        {day.available} disponíveis / {day.total} total
                      </span>
                    </div>
                    <div className="flex gap-1 h-8">
                      <div
                        className="bg-green-500 rounded flex items-center justify-center text-white text-xs font-medium"
                        style={{ width: `${(day.available / day.total) * 100}%` }}
                      >
                        {day.available > 10 && `${day.available}`}
                      </div>
                      <div
                        className="bg-red-500 rounded flex items-center justify-center text-white text-xs font-medium"
                        style={{ width: `${(day.busy / day.total) * 100}%` }}
                      >
                        {day.busy > 5 && `${day.busy}`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
