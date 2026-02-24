import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const tasks = [
  {
    title: "Design da homepage",
    project: "Website Redesign",
    assignee: "Maria Silva",
    date: "2024-01-12",
    priority: "Alta",
    priorityColor: "bg-red-500",
  },
  {
    title: "Desenvolvimento da API",
    project: "Mobile App",
    assignee: "João Santos",
    date: "2024-01-14",
    priority: "Média",
    priorityColor: "bg-orange-500",
  },
]

export function PendingTasks() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tarefas Pendentes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {tasks.map((task, index) => (
          <div key={index} className="space-y-2">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-medium">{task.title}</h4>
                <p className="text-sm text-gray-500">{task.project}</p>
                <p className="text-sm text-gray-500">Por: {task.assignee}</p>
              </div>
              <div className="text-right">
                <Badge className={`${task.priorityColor} text-white text-xs`}>{task.priority}</Badge>
                <p className="text-xs text-gray-500 mt-1">{task.date}</p>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
