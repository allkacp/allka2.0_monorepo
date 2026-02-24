
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { PageHeader } from "@/components/page-header"
import {
  UserCheck,
  Mail,
  Phone,
  MapPin,
  Award,
  Star,
  Briefcase,
  Calendar,
  Edit,
  Camera,
  CheckCircle,
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const profileData = {
  personal: {
    name: "Maria Silva",
    email: "maria.silva@email.com",
    phone: "+55 11 98765-4321",
    location: "São Paulo, SP",
    bio: "Designer gráfica e copywriter com 5 anos de experiência. Especializada em identidade visual e conteúdo para redes sociais.",
    joinedAt: "Janeiro 2024",
    avatar: "/placeholder.svg",
  },
  stats: {
    level: "Silver",
    tasksCompleted: 45,
    rating: 4.2,
    responseTime: "2h",
    completionRate: 98,
  },
  skills: [
    { name: "Design Gráfico", level: "Avançado", certified: true },
    { name: "Copywriting", level: "Intermediário", certified: true },
    { name: "Social Media", level: "Em Progresso", certified: false },
  ],
  portfolio: [
    { id: 1, title: "Logo Design - TechStart", image: "/placeholder.svg", category: "Design" },
    { id: 2, title: "Banner E-commerce", image: "/placeholder.svg", category: "Design" },
    { id: 3, title: "Landing Page Copy", image: "/placeholder.svg", category: "Copywriting" },
  ],
}

export default function PerfilPage() {
  return (
    <div className="container mx-auto px-0 py-0">
      <PageHeader
        title="Meu Perfil"
        description="Gerencie suas informações e portfólio"
        actions={
          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
            <UserCheck className="h-4 w-4 mr-1" />
            Perfil Verificado
          </Badge>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col items-center">
                <div className="relative">
                  <Avatar className="h-32 w-32">
                    <AvatarImage src={profileData.personal.avatar || "/placeholder.svg"} />
                    <AvatarFallback className="bg-blue-600 text-white text-3xl">MS</AvatarFallback>
                  </Avatar>
                  <Button
                    size="sm"
                    className="absolute bottom-0 right-0 rounded-full h-10 w-10 p-0 bg-blue-600 hover:bg-blue-700"
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                </div>

                <h2 className="text-xl font-bold text-gray-900 mt-4">{profileData.personal.name}</h2>
                <Badge className="bg-gray-500 text-white mt-2">Nível {profileData.stats.level}</Badge>

                <div className="w-full mt-6 space-y-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="h-4 w-4" />
                    <span>{profileData.personal.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="h-4 w-4" />
                    <span>{profileData.personal.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="h-4 w-4" />
                    <span>{profileData.personal.location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="h-4 w-4" />
                    <span>Membro desde {profileData.personal.joinedAt}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Star className="h-5 w-5 mr-2 text-yellow-500" />
                Estatísticas
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Tarefas Completadas</span>
                  <span className="text-lg font-semibold text-gray-900">{profileData.stats.tasksCompleted}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Avaliação Média</span>
                  <span className="text-lg font-semibold text-yellow-600">⭐ {profileData.stats.rating}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Tempo de Resposta</span>
                  <span className="text-lg font-semibold text-green-600">{profileData.stats.responseTime}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Taxa de Conclusão</span>
                  <span className="text-lg font-semibold text-blue-600">{profileData.stats.completionRate}%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Tabs defaultValue="info" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="info">Informações</TabsTrigger>
              <TabsTrigger value="skills">Habilidades</TabsTrigger>
              <TabsTrigger value="portfolio">Portfólio</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="mt-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">Informações Pessoais</h3>
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name">Nome Completo</Label>
                      <Input id="name" defaultValue={profileData.personal.name} />
                    </div>

                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" defaultValue={profileData.personal.email} />
                    </div>

                    <div>
                      <Label htmlFor="phone">Telefone</Label>
                      <Input id="phone" defaultValue={profileData.personal.phone} />
                    </div>

                    <div>
                      <Label htmlFor="location">Localização</Label>
                      <Input id="location" defaultValue={profileData.personal.location} />
                    </div>

                    <div>
                      <Label htmlFor="bio">Biografia</Label>
                      <Textarea id="bio" rows={4} defaultValue={profileData.personal.bio} />
                    </div>

                    <Button className="w-full bg-blue-600 hover:bg-blue-700">Salvar Alterações</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="skills" className="mt-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <Award className="h-5 w-5 mr-2 text-purple-600" />
                      Minhas Habilidades
                    </h3>
                    <Button variant="outline" size="sm">
                      Adicionar Habilidade
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {profileData.skills.map((skill, index) => (
                      <div key={index} className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-gray-900">{skill.name}</h4>
                            {skill.certified && (
                              <Badge className="bg-green-500 text-white">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Certificado
                              </Badge>
                            )}
                          </div>
                          <Badge variant="outline">{skill.level}</Badge>
                        </div>
                        {!skill.certified && (
                          <p className="text-sm text-gray-600">Complete o curso na Allkademy para obter certificação</p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="portfolio" className="mt-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <Briefcase className="h-5 w-5 mr-2 text-blue-600" />
                      Meu Portfólio
                    </h3>
                    <Button variant="outline" size="sm">
                      Adicionar Trabalho
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {profileData.portfolio.map((item) => (
                      <div key={item.id} className="group relative overflow-hidden rounded-lg border border-gray-200">
                        <img
                          src={item.image || "/placeholder.svg"}
                          alt={item.title}
                          className="w-full h-48 object-cover transition-transform group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-4">
                          <div>
                            <Badge className="bg-blue-500 text-white mb-2">{item.category}</Badge>
                            <h4 className="text-white font-semibold">{item.title}</h4>
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
      </div>
    </div>
  )
}
