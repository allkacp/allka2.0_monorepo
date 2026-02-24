import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle, Clock, DollarSign, Users } from "lucide-react"

const stats = [
  {
    title: "Tarefas Concluídas",
    value: "156",
    subtitle: "Este mês",
    change: "+12% vs. mês anterior",
    icon: CheckCircle,
    color: "bg-green-500",
    textColor: "text-white",
  },
  {
    title: "Projetos Ativos",
    value: "8",
    subtitle: "Em andamento",
    change: "+25% vs. mês anterior",
    icon: Clock,
    color: "bg-blue-500",
    textColor: "text-white",
  },
  {
    title: "Receita Total",
    value: "R$ 45.2k",
    subtitle: "Este mês",
    change: "+8% vs. mês anterior",
    icon: DollarSign,
    color: "bg-orange-500",
    textColor: "text-white",
  },
  {
    title: "Nômades Ativos",
    value: "24",
    subtitle: "Trabalhando",
    change: "+15% vs. mês anterior",
    icon: Users,
    color: "bg-purple-500",
    textColor: "text-white",
  },
]

export function DashboardStats() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => (
        <Card key={index} className={`${stat.color} ${stat.textColor} border-0`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium opacity-90">{stat.title}</p>
                <p className="text-3xl font-bold mt-2">{stat.value}</p>
                <p className="text-sm opacity-75 mt-1">{stat.subtitle}</p>
                <p className="text-xs opacity-75 mt-2">{stat.change}</p>
              </div>
              <div className="ml-4">
                <stat.icon className="h-8 w-8 opacity-80" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
