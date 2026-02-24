
import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/page-header"
import {
  Users,
  Search,
  MessageCircle,
  Star,
  UserPlus,
  Settings,
  TrendingUp,
  AlertTriangle,
  Edit,
  Wallet,
  Target,
  Crown,
  Database,
  Play,
  Pause,
  CheckCircle,
  XCircle,
} from "lucide-react"

// Mock data - would come from API
const nomades = [
  {
    id: "1",
    name: "Ana Silva",
    email: "ana@email.com",
    whatsapp: "+5511999999999",
    level: "silver",
    status: "ativo",
    score: 4.2,
    tasksCompleted: { quarter: 45, total: 180 },
    areasOfInterest: ["Design Gráfico", "UI/UX"],
    registrationDate: "2024-01-15",
    lastAccess: "2024-02-10",
    termsAccepted: true,
    performance: { averageRating: 4.2, onTimeDelivery: 95, rejectionRate: 5 },
    wallet: { availableBalance: 2500, unavailableBalance: 800 },
  },
  {
    id: "2",
    name: "Carlos Santos",
    email: "carlos@email.com",
    whatsapp: "+5511888888888",
    level: "gold",
    status: "ativo",
    score: 4.6,
    tasksCompleted: { quarter: 72, total: 320 },
    areasOfInterest: ["Copywriting", "Marketing"],
    registrationDate: "2023-08-20",
    lastAccess: "2024-02-10",
    termsAccepted: true,
    performance: { averageRating: 4.6, onTimeDelivery: 98, rejectionRate: 2 },
    wallet: { availableBalance: 4200, unavailableBalance: 1200 },
  },
]

export default function NomadeManagementPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [selectedLevel, setSelectedLevel] = useState("all")
  const [selectedNomade, setSelectedNomade] = useState<string | null>(null)
  const [showManagementModal, setShowManagementModal] = useState(false)

  const filteredNomades = nomades.filter((nomade) => {
    const matchesSearch =
      nomade.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      nomade.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = selectedStatus === "all" || nomade.status === selectedStatus
    const matchesLevel = selectedLevel === "all" || nomade.level === selectedLevel

    return matchesSearch && matchesStatus && matchesLevel
  })

  const getLevelColor = (level: string) => {
    const colors = {
      bronze: "bg-orange-100 text-orange-800 border-orange-200",
      silver: "bg-gray-100 text-gray-800 border-gray-200",
      gold: "bg-yellow-100 text-yellow-800 border-yellow-200",
      platinum: "bg-purple-100 text-purple-800 border-purple-200",
      diamond: "bg-blue-100 text-blue-800 border-blue-200",
      leader: "bg-green-100 text-green-800 border-green-200",
    }
    return colors[level as keyof typeof colors] || colors.bronze
  }

  const getStatusColor = (status: string) => {
    const colors = {
      ativo: "bg-green-100 text-green-800 border-green-200",
      inativo: "bg-gray-100 text-gray-800 border-gray-200",
      aguardando_aprovacao: "bg-yellow-100 text-yellow-800 border-yellow-200",
      reprovado: "bg-red-100 text-red-800 border-red-200",
      pausado: "bg-orange-100 text-orange-800 border-orange-200",
    }
    return colors[status as keyof typeof colors] || colors.ativo
  }

  const handleManageNomade = (nomadeId: string) => {
    setSelectedNomade(nomadeId)
    setShowManagementModal(true)
  }

  return (
    <div className="container mx-auto px-0 py-0 space-y-6">
      {/* Header */}
      <PageHeader
        title="Gestão de Nômades"
        description="Central de gerenciamento de profissionais da plataforma."
        actions={
          <div className="flex items-center gap-3">
            <Button className="bg-blue-500 hover:bg-blue-600 text-white">
              <UserPlus className="h-4 w-4 mr-2" />
              Convidar Nômade
            </Button>
            <Button variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              Configurações
            </Button>
          </div>
        }
      />

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total de Nômades</p>
                <p className="text-3xl font-bold text-gray-900">247</p>
                <p className="text-sm text-green-600">+12 este mês</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Nômades Ativos</p>
                <p className="text-3xl font-bold text-gray-900">189</p>
                <p className="text-sm text-gray-600">76% do total</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Rating Médio</p>
                <p className="text-3xl font-bold text-gray-900">4.5</p>
                <p className="text-sm text-green-600">Padrão Allka</p>
              </div>
              <Star className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Aguardando Aprovação</p>
                <p className="text-3xl font-bold text-gray-900">15</p>
                <p className="text-sm text-orange-600">Requer atenção</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar por nome ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">Todos os Status</option>
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
                <option value="aguardando_aprovacao">Aguardando Aprovação</option>
                <option value="pausado">Pausado</option>
              </select>
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">Todos os Níveis</option>
                <option value="bronze">Bronze</option>
                <option value="silver">Silver</option>
                <option value="gold">Gold</option>
                <option value="platinum">Platinum</option>
                <option value="diamond">Diamond</option>
                <option value="leader">Leader</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Nomades List */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {filteredNomades.map((nomade) => (
              <div key={nomade.id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                      {nomade.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{nomade.name}</h4>
                      <p className="text-sm text-gray-600">{nomade.email}</p>
                      <div className="flex items-center mt-1 space-x-2">
                        <Badge className={getLevelColor(nomade.level)}>
                          {nomade.level.charAt(0).toUpperCase() + nomade.level.slice(1)}
                        </Badge>
                        <Badge className={getStatusColor(nomade.status)}>{nomade.status.replace("_", " ")}</Badge>
                        {nomade.termsAccepted ? (
                          <Badge className="bg-green-100 text-green-800 border-green-200">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Termos OK
                          </Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-800 border-red-200">
                            <XCircle className="h-3 w-3 mr-1" />
                            Termos Pendentes
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-6 text-sm">
                    <div className="text-center">
                      <p className="font-semibold text-gray-900">{nomade.score}</p>
                      <p className="text-gray-600">Rating</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-gray-900">{nomade.tasksCompleted.quarter}</p>
                      <p className="text-gray-600">Tarefas/90d</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-gray-900">R$ {nomade.wallet.availableBalance}</p>
                      <p className="text-gray-600">Saldo</p>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(`https://wa.me/${nomade.whatsapp.replace("+", "")}`, "_blank")}
                      >
                        <MessageCircle className="h-4 w-4 mr-1" />
                        WhatsApp
                      </Button>
                      <Button
                        size="sm"
                        className="bg-blue-500 hover:bg-blue-600 text-white"
                        onClick={() => handleManageNomade(nomade.id)}
                      >
                        <Settings className="h-4 w-4 mr-1" />
                        Gerenciar
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-sm text-gray-600">
                  <div className="flex items-center space-x-4">
                    <span>Áreas: {nomade.areasOfInterest.join(", ")}</span>
                    <span>Cadastro: {new Date(nomade.registrationDate).toLocaleDateString()}</span>
                    <span>Último acesso: {new Date(nomade.lastAccess).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-green-600">{nomade.performance.onTimeDelivery}% pontualidade</span>
                    <span className="text-red-600">{nomade.performance.rejectionRate}% rejeição</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {showManagementModal && selectedNomade && (
        <NomadeManagementModal
          nomadeId={selectedNomade}
          onClose={() => {
            setShowManagementModal(false)
            setSelectedNomade(null)
          }}
        />
      )}
    </div>
  )
}

function NomadeManagementModal({ nomadeId, onClose }: { nomadeId: string; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState("profile")

  // Mock data - would come from API
  const nomade = {
    id: nomadeId,
    name: "Ana Silva",
    email: "ana@email.com",
    whatsapp: "+5511999999999",
    level: "silver",
    status: "ativo",
    score: 4.2,
    tasksCompleted: { quarter: 45, total: 180 },
    areasOfInterest: ["Design Gráfico", "UI/UX"],
    registrationDate: "2024-01-15",
    lastAccess: "2024-02-10",
    termsAccepted: true,
    performance: { averageRating: 4.2, onTimeDelivery: 95, rejectionRate: 5 },
    wallet: { availableBalance: 2500, unavailableBalance: 800 },
    minimumMonthlyGoal: 3000,
    qualifications: [
      { id: "1", category: "Design", task: "Logo Design", status: "habilitado", certificationDate: "2024-01-20" },
      { id: "2", category: "Design", task: "UI Design", status: "pausado", pausedDate: "2024-02-01" },
    ],
    knowledgeBase: {
      specializations: ["Design Gráfico", "Branding"],
      workHistory: "Histórico de 180 tarefas com foco em design gráfico...",
      leaderNotes: "Profissional dedicado com excelente qualidade de entrega...",
    },
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Gestão de Nômade</h2>
              <p className="text-gray-600">
                {nomade.name} - {nomade.email}
              </p>
            </div>
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
          </div>

          {/* Tab Navigation */}
          <div className="flex space-x-4 mt-4">
            {[
              { id: "profile", label: "Dados Cadastrais", icon: Edit },
              { id: "qualifications", label: "Habilitações", icon: CheckCircle },
              { id: "performance", label: "Performance", icon: TrendingUp },
              { id: "knowledge", label: "Base de Dados IA", icon: Database },
              { id: "wallet", label: "Carteira", icon: Wallet },
              { id: "goals", label: "Metas", icon: Target },
              { id: "promotion", label: "Promoção", icon: Crown },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                  activeTab === tab.id ? "bg-blue-100 text-blue-700" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <tab.icon className="h-4 w-4 mr-2" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {/* Profile Tab */}
          {activeTab === "profile" && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Dados Cadastrais</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                  <Input defaultValue={nomade.name} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <Input defaultValue={nomade.email} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
                  <Input defaultValue={nomade.whatsapp} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md">
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                    <option value="pausado">Pausado</option>
                  </select>
                </div>
              </div>
              <Button className="bg-blue-500 hover:bg-blue-600 text-white">Salvar Alterações</Button>
            </div>
          )}

          {/* Qualifications Tab */}
          {activeTab === "qualifications" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Habilitações</h3>
                <div className="flex space-x-2">
                  <Button size="sm" variant="outline">
                    <Play className="h-4 w-4 mr-1" />
                    Ativar Todas
                  </Button>
                  <Button size="sm" variant="outline">
                    <Pause className="h-4 w-4 mr-1" />
                    Pausar Todas
                  </Button>
                </div>
              </div>
              <div className="space-y-3">
                {nomade.qualifications.map((qual) => (
                  <div
                    key={qual.id}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                  >
                    <div>
                      <h4 className="font-medium">{qual.task}</h4>
                      <p className="text-sm text-gray-600">{qual.category}</p>
                      {qual.certificationDate && (
                        <p className="text-xs text-gray-500">
                          Certificado em: {new Date(qual.certificationDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge
                        className={
                          qual.status === "habilitado" ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"
                        }
                      >
                        {qual.status}
                      </Badge>
                      <Button size="sm" variant="outline">
                        {qual.status === "habilitado" ? "Pausar" : "Ativar"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Performance Tab */}
          {activeTab === "performance" && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Performance e Pontuação</h3>
              <div className="grid grid-cols-3 gap-6">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">{nomade.score}</div>
                    <div className="text-sm text-gray-600">Rating Médio</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">{nomade.performance.onTimeDelivery}%</div>
                    <div className="text-sm text-gray-600">Pontualidade</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-red-600">{nomade.performance.rejectionRate}%</div>
                    <div className="text-sm text-gray-600">Taxa de Rejeição</div>
                  </CardContent>
                </Card>
              </div>

              {/* Level Progress */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Progresso para Gold</h4>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: "75%" }}></div>
                </div>
                <p className="text-sm text-gray-600 mt-1">75% - Faltam 15 tarefas para o próximo nível</p>
              </div>
            </div>
          )}

          {/* Knowledge Base Tab */}
          {activeTab === "knowledge" && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Base de Dados IA</h3>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Especializações</h4>
                  <div className="flex flex-wrap gap-2">
                    {nomade.knowledgeBase.specializations.map((spec, index) => (
                      <Badge key={index} className="bg-blue-100 text-blue-800">
                        {spec}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Histórico de Trabalho</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-700">{nomade.knowledgeBase.workHistory}</p>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Anotações de Líderes</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-700">{nomade.knowledgeBase.leaderNotes}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Wallet Tab */}
          {activeTab === "wallet" && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Carteira</h3>
              <div className="grid grid-cols-2 gap-6">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-green-600">R$ {nomade.wallet.availableBalance}</div>
                    <div className="text-sm text-gray-600">Saldo Disponível</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-orange-600">R$ {nomade.wallet.unavailableBalance}</div>
                    <div className="text-sm text-gray-600">Saldo Não Disponível</div>
                  </CardContent>
                </Card>
              </div>

              <div className="flex space-x-2">
                <Button className="bg-green-500 hover:bg-green-600 text-white">Adicionar Crédito</Button>
                <Button variant="outline">Ajustar Saldo</Button>
                <Button variant="outline">Histórico de Transações</Button>
              </div>
            </div>
          )}

          {/* Goals Tab */}
          {activeTab === "goals" && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Metas de Remuneração</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Meta Mínima Mensal (R$)</label>
                  <Input type="number" defaultValue={nomade.minimumMonthlyGoal} placeholder="Ex: 3000" />
                  <p className="text-sm text-gray-600 mt-1">
                    A plataforma complementará caso o valor não seja atingido
                  </p>
                </div>
                <Button className="bg-blue-500 hover:bg-blue-600 text-white">Definir Meta</Button>
              </div>
            </div>
          )}

          {/* Promotion Tab */}
          {activeTab === "promotion" && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Promoção a Líder</h3>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-medium text-yellow-800 mb-2">Requisitos para Líder</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>✓ Nível Diamond</li>
                  <li>✓ Habilitado em todas as tarefas da categoria</li>
                  <li>✓ Rating mínimo de 4.5</li>
                  <li>✓ Mais de 100 tarefas concluídas</li>
                </ul>
              </div>

              {nomade.level === "diamond" ? (
                <Button className="bg-purple-500 hover:bg-purple-600 text-white">
                  <Crown className="h-4 w-4 mr-2" />
                  Convidar para Líder
                </Button>
              ) : (
                <p className="text-gray-600">Nômade precisa atingir o nível Diamond para ser promovido a líder.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
