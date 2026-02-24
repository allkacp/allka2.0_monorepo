
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3, Clock, Activity } from "lucide-react"

export function UserUsageDashboard() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Sessões
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">--</p>
          <p className="text-xs text-muted-foreground">Últimos 30 dias</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Tempo Médio
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">--</p>
          <p className="text-xs text-muted-foreground">Por sessão</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Ações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">--</p>
          <p className="text-xs text-muted-foreground">Total de interações</p>
        </CardContent>
      </Card>
    </div>
  )
}
