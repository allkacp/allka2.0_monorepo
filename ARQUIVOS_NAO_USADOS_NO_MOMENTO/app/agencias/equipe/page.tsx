
import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/page-header"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Users,
  Search,
  Mail,
  Phone,
  Calendar,
  Briefcase,
  Award,
  TrendingUp,
  Eye,
  Shield,
  Star,
  Crown,
} from "lucide-react"

const mockTeamMembers = [
  {
    id: 1,
    name: "João Silva",
    email: "joao.silva@agency.com",
    phone: "(11) 98765-4321",
    role: "Desenvolvedor Full Stack",
    level: "senior",
    avatar: "/placeholder.svg?height=100&width=100",
    joined_date: "2023-01-15",
    projects_count: 12,
    completed_tasks: 145,
    status: "active",
    skills: ["React", "Node.js", "TypeScript", "PostgreSQL"],
  },
  {
    id: 2,
    name: "Maria Santos",
    email: "maria.santos@agency.com",
    phone: "(11) 91234-5678",
    role: "Designer UI/UX",
    level: "pleno",
    avatar: "/placeholder.svg?height=100&width=100",
    joined_date: "2023-03-20",
    projects_count: 8,
    completed_tasks: 98,
    status: "active",
    skills: ["Figma", "Adobe XD", "Prototyping", "User Research"],
  },
  {
    id: 3,
    name: "Pedro Costa",
    email: "pedro.costa@agency.com",
    phone: "(11) 99999-8888",
    role: "Gerente de Projetos",
    level: "senior",
    avatar: "/placeholder.svg?height=100&width=100",
    joined_date: "2022-11-10",
    projects_count: 15,
    completed_tasks: 203,
    status: "active",
    skills: ["Scrum", "Agile", "Jira", "Team Management"],
  },
  {
    id: 4,
    name: "Ana Lima",
    email: "ana.lima@agency.com",
    phone: "(11) 97777-6666",
    role: "Desenvolvedora Frontend",
    level: "junior",
    avatar: "/placeholder.svg?height=100&width=100",
    joined_date: "2023-08-05",
    projects_count: 4,
    completed_tasks: 42,
    status: "active",
    skills: ["React", "CSS", "JavaScript", "Tailwind"],
  },
  {
    id: 5,
    name: "Carlos Souza",
    email: "carlos.souza@agency.com",
    phone: "(11) 96666-5555",
    role: "DevOps Engineer",
    level: "pleno",
    avatar: "/placeholder.svg?height=100&width=100",
    joined_date: "2023-05-12",
    projects_count: 10,
    completed_tasks: 87,
    status: "active",
    skills: ["AWS", "Docker", "Kubernetes", "CI/CD"],
  },
]

export default function AgenciasEquipePage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedMember, setSelectedMember] = useState<(typeof mockTeamMembers)[0] | null>(null)

  const filteredMembers = mockTeamMembers.filter(
    (member) =>
      member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const getLevelConfig = (level: string) => {
    switch (level) {
      case "senior":
        return {
          color: "bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-950/30 dark:text-purple-400",
          icon: Crown,
          label: "Sênior",
        }
      case "pleno":
        return {
          color: "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950/30 dark:text-blue-400",
          icon: Star,
          label: "Pleno",
        }
      case "junior":
        return {
          color: "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950/30 dark:text-emerald-400",
          icon: Shield,
          label: "Júnior",
        }
      default:
        return {
          color: "bg-slate-100 text-slate-700 border-slate-300",
          icon: Shield,
          label: level,
        }
    }
  }

  return (
    <div className="min-h-screen bg-slate-200 px-0 py-0">
      <div className="max-w-7xl mx-auto bg-slate-200 space-y-6 py-0 px-0">
        <PageHeader title="Equipe da Agência" description="Gerencie os membros da sua equipe" />

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90 mb-1">Total de Membros</p>
                  <p className="text-3xl font-bold">{mockTeamMembers.length}</p>
                </div>
                <Users className="h-10 w-10 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90 mb-1">Sêniores</p>
                  <p className="text-3xl font-bold">{mockTeamMembers.filter((m) => m.level === "senior").length}</p>
                </div>
                <Crown className="h-10 w-10 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90 mb-1">Projetos Ativos</p>
                  <p className="text-3xl font-bold">{mockTeamMembers.reduce((sum, m) => sum + m.projects_count, 0)}</p>
                </div>
                <Briefcase className="h-10 w-10 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90 mb-1">Tarefas Concluídas</p>
                  <p className="text-3xl font-bold">{mockTeamMembers.reduce((sum, m) => sum + m.completed_tasks, 0)}</p>
                </div>
                <TrendingUp className="h-10 w-10 opacity-80" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card className="mb-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-slate-200 dark:border-slate-800 shadow-lg">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar por nome, cargo ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Team Members Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMembers.map((member) => {
            const levelConfig = getLevelConfig(member.level)
            const LevelIcon = levelConfig.icon

            return (
              <Card
                key={member.id}
                className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-slate-200 dark:border-slate-800 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden"
              >
                <div className="h-24 bg-gradient-to-br from-blue-500 to-purple-600" />
                <CardContent className="p-6 -mt-12">
                  <div className="flex flex-col items-center mb-4">
                    <div className="w-24 h-24 rounded-full border-4 border-white dark:border-slate-900 shadow-lg mb-3 overflow-hidden bg-slate-200">
                      <img
                        src={member.avatar || "/placeholder.svg"}
                        alt={member.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 text-center">{member.name}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 text-center mb-2">{member.role}</p>
                    <Badge className={`${levelConfig.color} flex items-center gap-1`}>
                      <LevelIcon className="h-3 w-3" />
                      {levelConfig.label}
                    </Badge>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50">
                      <span className="text-xs text-slate-600 dark:text-slate-400">Projetos</span>
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {member.projects_count}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50">
                      <span className="text-xs text-slate-600 dark:text-slate-400">Tarefas Concluídas</span>
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {member.completed_tasks}
                      </span>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full gap-2 hover:bg-blue-50 dark:hover:bg-blue-950/20 hover:text-blue-600 hover:border-blue-300 bg-transparent"
                    onClick={() => setSelectedMember(member)}
                  >
                    <Eye className="h-4 w-4" />
                    Ver Detalhes
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {filteredMembers.length === 0 && (
          <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-slate-200 dark:border-slate-800 shadow-lg">
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 mx-auto text-slate-400 mb-4" />
              <p className="text-slate-600 dark:text-slate-400">Nenhum membro encontrado</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Member Details Modal */}
      <Dialog open={selectedMember !== null} onOpenChange={() => setSelectedMember(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-3">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-200">
                <img
                  src={selectedMember?.avatar || "/placeholder.svg"}
                  alt={selectedMember?.name}
                  className="w-full h-full object-cover"
                />
              </div>
              {selectedMember?.name}
            </DialogTitle>
            <DialogDescription>{selectedMember?.role}</DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Level Badge */}
            <div className="flex justify-center">
              {selectedMember &&
                (() => {
                  const levelConfig = getLevelConfig(selectedMember.level)
                  const LevelIcon = levelConfig.icon
                  return (
                    <Badge className={`${levelConfig.color} text-base px-4 py-2 flex items-center gap-2`}>
                      <LevelIcon className="h-4 w-4" />
                      {levelConfig.label}
                    </Badge>
                  )
                })()}
            </div>

            {/* Contact Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                <Mail className="h-5 w-5 text-blue-500" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-500 dark:text-slate-400">E-mail</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                    {selectedMember?.email}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                <Phone className="h-5 w-5 text-emerald-500" />
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Telefone</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{selectedMember?.phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                <Calendar className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Data de Entrada</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {selectedMember && new Date(selectedMember.joined_date).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                <Briefcase className="h-5 w-5 text-amber-500" />
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Cargo</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{selectedMember?.role}</p>
                </div>
              </div>
            </div>

            {/* Performance Stats */}
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                <Award className="h-5 w-5 text-blue-500" />
                Desempenho
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Projetos Ativos</p>
                  <p className="text-3xl font-bold text-blue-600">{selectedMember?.projects_count}</p>
                </div>
                <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Tarefas Concluídas</p>
                  <p className="text-3xl font-bold text-emerald-600">{selectedMember?.completed_tasks}</p>
                </div>
              </div>
            </div>

            {/* Skills */}
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">Habilidades</h4>
              <div className="flex flex-wrap gap-2">
                {selectedMember?.skills.map((skill, index) => (
                  <Badge
                    key={index}
                    variant="outline"
                    className="bg-slate-50 dark:bg-slate-900/50 text-slate-700 dark:text-slate-300"
                  >
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedMember(null)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
