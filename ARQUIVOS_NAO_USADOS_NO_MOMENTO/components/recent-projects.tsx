import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"

const projects = [
  {
    name: "Website Redesign",
    client: "TechCorp",
    progress: 75,
    value: "R$ 15.000",
    status: "Em Progresso",
    statusColor: "bg-blue-500",
  },
  {
    name: "Mobile App",
    client: "StartupXYZ",
    progress: 45,
    value: "R$ 25.000",
    status: "Revisão",
    statusColor: "bg-orange-500",
  },
]

export function RecentProjects() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Projetos Recentes</CardTitle>
        <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
          Ver todos
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {projects.map((project, index) => (
          <div key={index} className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h4 className="font-medium">{project.name}</h4>
                <p className="text-sm text-gray-500">Cliente: {project.client}</p>
              </div>
              <div className="text-right">
                <Badge className={`${project.statusColor} text-white`}>{project.status}</Badge>
                <p className="text-sm font-medium mt-1">{project.value}</p>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>Progresso: {project.progress}%</span>
              </div>
              <Progress value={project.progress} className="h-2" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
