
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Clock, Calendar, TrendingUp, Activity, BarChart3 } from "lucide-react"

interface UsageStats {
  lastAccess: string
  avgSessionDuration: number // in minutes
  totalTime: number // in hours
  sessionsCount: number
  sessionHistory: Array<{
    date: string
    duration: number // in minutes
    actions: number
  }>
}

export function UserUsageDashboard() {
  const [timePeriod, setTimePeriod] = useState("7days")

  const usageStats: UsageStats = {
    lastAccess: "2024-01-23T14:30:00",
    avgSessionDuration: 45,
    totalTime: 127.5,
    sessionsCount: 156,
    sessionHistory: [
      { date: "2024-01-23", duration: 62, actions: 45 },
      { date: "2024-01-22", duration: 38, actions: 28 },
      { date: "2024-01-21", duration: 51, actions: 37 },
      { date: "2024-01-20", duration: 29, actions: 19 },
      { date: "2024-01-19", duration: 44, actions: 31 },
      { date: "2024-01-18", duration: 55, actions: 42 },
      { date: "2024-01-17", duration: 41, actions: 26 },
    ],
  }

  const formatLastAccess = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return hours > 0 ? `${hours}h ${mins}min` : `${mins}min`
  }

  const getProgressPercentage = (value: number, max: number) => {
    return Math.min((value / max) * 100, 100)
  }

  return (
    <div className="space-y-6">
      {/* Filter Section */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Estatísticas de Uso</h3>
          <p className="text-sm text-muted-foreground">Acompanhe seu tempo e atividade na plataforma</p>
        </div>
        <Select value={timePeriod} onValueChange={setTimePeriod}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Selecione o período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7days">Últimos 7 dias</SelectItem>
            <SelectItem value="30days">Últimos 30 dias</SelectItem>
            <SelectItem value="90days">Últimos 90 dias</SelectItem>
            <SelectItem value="all">Todo o período</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Last Access */}
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4 text-blue-500" />
              Último Acesso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatLastAccess(usageStats.lastAccess).split(" ")[0]}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatLastAccess(usageStats.lastAccess).split(" ")[1]}
            </p>
          </CardContent>
        </Card>

        {/* Average Session Duration */}
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4 text-green-500" />
              Tempo Médio/Sessão
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(usageStats.avgSessionDuration)}</div>
            <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-500"
                style={{ width: `${getProgressPercentage(usageStats.avgSessionDuration, 120)}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Total Time */}
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <TrendingUp className="h-4 w-4 text-purple-500" />
              Tempo Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usageStats.totalTime.toFixed(1)}h</div>
            <p className="text-xs text-muted-foreground mt-1">{usageStats.sessionsCount} sessões</p>
          </CardContent>
        </Card>

        {/* Activity Score */}
        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <Activity className="h-4 w-4 text-orange-500" />
              Nível de Atividade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Alto</div>
            <div className="mt-2 flex gap-1">
              {[1, 2, 3, 4, 5].map((level) => (
                <div
                  key={level}
                  className={`h-2 flex-1 rounded-full ${
                    level <= 4 ? "bg-gradient-to-r from-orange-500 to-orange-600" : "bg-gray-200"
                  }`}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Session History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            Histórico de Sessões
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {usageStats.sessionHistory.map((session, index) => {
              const maxDuration = Math.max(...usageStats.sessionHistory.map((s) => s.duration))
              const widthPercentage = (session.duration / maxDuration) * 100

              return (
                <div key={index} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">
                      {new Date(session.date).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </span>
                    <div className="flex items-center gap-4 text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDuration(session.duration)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Activity className="h-3 w-3" />
                        {session.actions} ações
                      </span>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
                      style={{ width: `${widthPercentage}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Summary Card */}
      <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white rounded-lg shadow-sm">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-blue-900">Resumo do Período</h4>
              <p className="text-sm text-blue-700 mt-1">
                Você está {usageStats.avgSessionDuration > 40 ? "acima" : "abaixo"} da média de tempo por sessão.
                Continue assim para manter sua produtividade!
              </p>
              <div className="mt-3 flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="text-blue-800">
                    <strong>{usageStats.sessionsCount}</strong> sessões totais
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-purple-500" />
                  <span className="text-blue-800">
                    <strong>{usageStats.totalTime.toFixed(0)}h</strong> de uso acumulado
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
