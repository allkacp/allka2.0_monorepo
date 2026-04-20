import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  Users,
  DollarSign,
  Download,
  Calendar,
  FileText,
  Eye,
  Clock,
  Filter,
  Settings,
  Shield,
  Award,
  Tag,
  Activity,
} from "lucide-react";

const reportCategories = [
  {
    id: "financial",
    name: "Financeiro",
    icon: DollarSign,
    color: "from-green-500 to-emerald-600",
    reports: [
      {
        id: "revenue",
        name: "Receitas e Faturamento",
        description: "Análise detalhada de receitas",
        access: ["admin", "financeiro"],
      },
      {
        id: "expenses",
        name: "Despesas e Custos",
        description: "Controle de despesas operacionais",
        access: ["admin", "financeiro"],
      },
      {
        id: "profit",
        name: "Lucro Bruto e Líquido",
        description: "Margens e lucratividade",
        access: ["admin", "financeiro"],
      },
      {
        id: "cashflow",
        name: "Fluxo de Caixa",
        description: "Movimentações financeiras",
        access: ["admin", "financeiro"],
      },
      {
        id: "invoices",
        name: "Faturas e Cobranças",
        description: "Gestão de faturas",
        access: ["admin", "financeiro", "comercial"],
      },
    ],
  },
  {
    id: "operations",
    name: "Operações",
    icon: Activity,
    color: "from-blue-500 to-blue-600",
    reports: [
      {
        id: "projects",
        name: "Projetos e Entregas",
        description: "Status e performance de projetos",
        access: ["admin", "operacoes", "comercial"],
      },
      {
        id: "tasks",
        name: "Tarefas e Atividades",
        description: "Acompanhamento de tarefas",
        access: ["admin", "operacoes"],
      },
      {
        id: "availability",
        name: "Disponibilidade de Nômades",
        description: "Capacidade e alocação",
        access: ["admin", "operacoes"],
      },
      {
        id: "performance",
        name: "Performance Operacional",
        description: "KPIs operacionais",
        access: ["admin", "operacoes"],
      },
    ],
  },
  {
    id: "users",
    name: "Usuários",
    icon: Users,
    color: "from-purple-500 to-purple-600",
    reports: [
      {
        id: "clients",
        name: "Clientes e Empresas",
        description: "Base de clientes",
        access: ["admin", "comercial"],
      },
      {
        id: "nomades",
        name: "Nômades e Freelancers",
        description: "Profissionais cadastrados",
        access: ["admin", "operacoes"],
      },
      {
        id: "engagement",
        name: "Engajamento de Usuários",
        description: "Atividade e retenção",
        access: ["admin", "comercial"],
      },
      {
        id: "satisfaction",
        name: "Satisfação e NPS",
        description: "Feedback e avaliações",
        access: ["admin", "comercial", "operacoes"],
      },
    ],
  },
  {
    id: "gamification",
    name: "Gamificação",
    icon: Award,
    color: "from-yellow-500 to-amber-600",
    reports: [
      {
        id: "levels",
        name: "Níveis e Progressão",
        description: "Evolução de níveis",
        access: ["admin", "operacoes"],
      },
      {
        id: "achievements",
        name: "Conquistas e Badges",
        description: "Sistema de recompensas",
        access: ["admin", "operacoes"],
      },
      {
        id: "leaderboard",
        name: "Ranking e Competições",
        description: "Top performers",
        access: ["admin", "operacoes", "comercial"],
      },
    ],
  },
  {
    id: "marketing",
    name: "Marketing",
    icon: Tag,
    color: "from-pink-500 to-rose-600",
    reports: [
      {
        id: "campaigns",
        name: "Campanhas de Marketing",
        description: "Performance de campanhas",
        access: ["admin", "marketing"],
      },
      {
        id: "referrals",
        name: "Indicações e Referrals",
        description: "Programa de indicação",
        access: ["admin", "marketing", "comercial"],
      },
      {
        id: "promotions",
        name: "Promoções e Cupons",
        description: "Descontos e ofertas",
        access: ["admin", "marketing", "comercial"],
      },
      {
        id: "conversion",
        name: "Conversão e Funil",
        description: "Jornada do cliente",
        access: ["admin", "marketing", "comercial"],
      },
    ],
  },
  {
    id: "system",
    name: "Sistema",
    icon: Settings,
    color: "from-slate-500 to-slate-600",
    reports: [
      {
        id: "audit",
        name: "Auditoria e Logs",
        description: "Histórico de ações",
        access: ["admin"],
      },
      {
        id: "security",
        name: "Segurança e Acessos",
        description: "Controle de permissões",
        access: ["admin"],
      },
      {
        id: "integrations",
        name: "Integrações e APIs",
        description: "Conexões externas",
        access: ["admin", "ti"],
      },
      {
        id: "performance-sys",
        name: "Performance do Sistema",
        description: "Métricas técnicas",
        access: ["admin", "ti"],
      },
    ],
  },
];

const userProfiles = [
  {
    id: "admin",
    name: "Administrador",
    description: "Acesso total a todos os relatórios",
  },
  {
    id: "financeiro",
    name: "Financeiro",
    description: "Relatórios financeiros e contábeis",
  },
  {
    id: "operacoes",
    name: "Operações",
    description: "Relatórios operacionais e de projetos",
  },
  {
    id: "comercial",
    name: "Comercial",
    description: "Relatórios de vendas e clientes",
  },
  {
    id: "marketing",
    name: "Marketing",
    description: "Relatórios de campanhas e conversão",
  },
  { id: "ti", name: "TI", description: "Relatórios técnicos e de sistema" },
];

export default function AdminRelatoriosPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState("30");
  const [selectedProfile, setSelectedProfile] = useState("admin");

  const filteredCategories = reportCategories.filter((category) => {
    if (selectedCategory !== "all" && category.id !== selectedCategory)
      return false;
    if (searchQuery) {
      return (
        category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        category.reports.some((report) =>
          report.name.toLowerCase().includes(searchQuery.toLowerCase()),
        )
      );
    }
    return true;
  });

  return (
    <div className="container mx-auto space-y-6 bg-slate-200 px-0 py-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent text-2xl">
            Relatórios do Sistema
          </h1>
          <p className="text-gray-600">
            Gestão completa de relatórios e permissões de acesso
          </p>
        </div>
        <div className="flex gap-3">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Shield className="h-4 w-4 mr-2" />
                Gerenciar Permissões
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Gerenciar Permissões de Relatórios</DialogTitle>
                <DialogDescription>
                  Defina quais perfis de usuário têm acesso a cada relatório
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6 mt-4">
                <div>
                  <h3 className="font-semibold mb-3">Perfis de Usuário</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {userProfiles.map((profile) => (
                      <Card key={profile.id} className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold">{profile.name}</h4>
                            <p className="text-sm text-gray-600">
                              {profile.description}
                            </p>
                          </div>
                          <Badge variant="outline">{profile.id}</Badge>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-3">
                    Permissões por Categoria
                  </h3>
                  <div className="space-y-4">
                    {reportCategories.map((category) => (
                      <Card key={category.id}>
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                            <category.icon className="h-5 w-5" />
                            {category.name}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {category.reports.map((report) => (
                            <div
                              key={report.id}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                            >
                              <div className="flex-1">
                                <p className="font-medium text-sm">
                                  {report.name}
                                </p>
                                <p className="text-xs text-gray-600">
                                  {report.description}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                {userProfiles.map((profile) => (
                                  <div
                                    key={profile.id}
                                    className="flex items-center gap-1"
                                  >
                                    <Switch
                                      id={`${report.id}-${profile.id}`}
                                      defaultChecked={report.access.includes(
                                        profile.id,
                                      )}
                                    />
                                    <Label
                                      htmlFor={`${report.id}-${profile.id}`}
                                      className="text-xs cursor-pointer"
                                    >
                                      {profile.name}
                                    </Label>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Button>
            <Download className="h-4 w-4 mr-2" />
            Exportar Todos
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros Avançados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Buscar Relatório</Label>
              <Input
                placeholder="Nome do relatório..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select
                value={selectedCategory}
                onValueChange={setSelectedCategory}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Categorias</SelectItem>
                  {reportCategories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Período</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Últimos 7 dias</SelectItem>
                  <SelectItem value="30">Últimos 30 dias</SelectItem>
                  <SelectItem value="90">Últimos 90 dias</SelectItem>
                  <SelectItem value="365">Último ano</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Perfil de Acesso</Label>
              <Select
                value={selectedProfile}
                onValueChange={setSelectedProfile}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {userProfiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-8">
        {filteredCategories.map((category) => (
          <div key={category.id} className="space-y-4">
            <div className="flex items-center gap-3 mt-8">
              <div
                className={`p-3 rounded-lg bg-linear-to-br ${category.color} text-white`}
              >
                <category.icon className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{category.name}</h2>
                <p className="text-gray-600">
                  {category.reports.length} relatórios disponíveis
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {category.reports
                .filter((report) => report.access.includes(selectedProfile))
                .map((report) => (
                  <Card
                    key={report.id}
                    className="hover:shadow-lg transition-shadow"
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-base">
                            {report.name}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            {report.description}
                          </CardDescription>
                        </div>
                        <Badge variant="outline" className="ml-2">
                          <FileText className="h-3 w-3 mr-1" />
                          PDF
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                        <Clock className="h-4 w-4" />
                        <span>Atualizado há 2 horas</span>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" className="flex-1">
                          <Eye className="h-4 w-4 mr-2" />
                          Visualizar
                        </Button>
                        <Button size="sm" variant="outline">
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <Calendar className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="mt-3 pt-3 border-t">
                        <div className="flex flex-wrap gap-1">
                          {report.access.map((profileId) => {
                            const profile = userProfiles.find(
                              (p) => p.id === profileId,
                            );
                            return (
                              <Badge
                                key={profileId}
                                variant="secondary"
                                className="text-xs"
                              >
                                {profile?.name}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>
        ))}
      </div>

      {filteredCategories.length === 0 && (
        <Card className="p-12 text-center">
          <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            Nenhum relatório encontrado
          </h3>
          <p className="text-gray-600">
            Tente ajustar os filtros ou buscar por outro termo
          </p>
        </Card>
      )}
    </div>
  );
}
