// @ts-nocheck
import { useState } from "react"
import { useParams } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { useAccountType } from "@/contexts/account-type-context"
import { calculatePrice } from "@/lib/pricing"
import {
  Star,
  Clock,
  Users,
  CheckCircle,
  Plus,
  Minus,
  ShoppingCart,
  Play,
  FileText,
  Award,
  TrendingUp,
} from "lucide-react"

// Mock product data - in real app, this would come from API
const mockProduct = {
  id: "1",
  name: "Campanha de Marketing Digital Completa",
  shortDescription: "Estratégia completa de marketing digital para aumentar sua presença online",
  basePrice: 2500,
  category: "Marketing Digital",
  complexity: "Intermediário",
  tags: ["SEO", "Social Media", "Google Ads", "Analytics"],
  rating: 4.8,
  reviewCount: 127,
  completedProjects: 89,
  averageDeliveryTime: "7-10 dias",

  // Content by client type
  content: {
    company: {
      title: "Transforme sua Presença Digital",
      description:
        "Nossa campanha completa de marketing digital foi desenvolvida especificamente para empresas que buscam resultados mensuráveis e crescimento sustentável.",
      benefits: [
        "Aumento de 300% no tráfego orgânico",
        "ROI médio de 450% em campanhas pagas",
        "Gestão completa de redes sociais",
        "Relatórios executivos mensais",
      ],
      videoUrl: "/videos/company-demo.mp4",
      images: ["/images/company-case1.jpg", "/images/company-case2.jpg"],
    },
    agency: {
      title: "Solução White Label para Agências",
      description:
        "Ofereça campanhas de marketing digital premium aos seus clientes com nossa solução completa e personalizável.",
      benefits: [
        "Material white label incluído",
        "Suporte técnico dedicado",
        "Treinamento da equipe",
        "Margem de lucro de até 60%",
      ],
      videoUrl: "/videos/agency-demo.mp4",
      images: ["/images/agency-case1.jpg", "/images/agency-case2.jpg"],
    },
  },

  // Product levels by client type
  levels: {
    company: [
      {
        name: "Essencial",
        description: "Ideal para empresas iniciando no digital",
        price: 1500,
        features: ["SEO básico", "2 redes sociais", "Relatório mensal"],
        complexity: "Básico",
      },
      {
        name: "Profissional",
        description: "Para empresas que querem crescer",
        price: 2500,
        features: ["SEO avançado", "4 redes sociais", "Google Ads", "Relatórios semanais"],
        complexity: "Intermediário",
        popular: true,
      },
      {
        name: "Enterprise",
        description: "Solução completa para grandes empresas",
        price: 4500,
        features: ["SEO premium", "Todas as redes", "Múltiplas campanhas", "Suporte 24/7"],
        complexity: "Avançado",
      },
    ],
    agency: [
      {
        name: "Starter",
        description: "Para agências começando",
        price: 1200,
        features: ["White label básico", "Suporte email", "2 campanhas/mês"],
        complexity: "Básico",
      },
      {
        name: "Growth",
        description: "Para agências em crescimento",
        price: 2000,
        features: ["White label completo", "Suporte prioritário", "5 campanhas/mês"],
        complexity: "Intermediário",
        popular: true,
      },
      {
        name: "Scale",
        description: "Para agências estabelecidas",
        price: 3500,
        features: ["White label premium", "Account manager", "Campanhas ilimitadas"],
        complexity: "Avançado",
      },
    ],
  },

  // Complementary products
  addOns: [
    {
      id: "analytics",
      name: "Dashboard Analytics Avançado",
      price: 500,
      description: "Relatórios em tempo real com métricas personalizadas",
    },
    {
      id: "copywriting",
      name: "Copywriting Premium",
      price: 800,
      description: "Textos persuasivos criados por especialistas",
    },
    {
      id: "design",
      name: "Design Gráfico Personalizado",
      price: 600,
      description: "Peças visuais exclusivas para suas campanhas",
    },
  ],
}

export default function ProductDetailsPage() {
  const params = useParams()
  const { accountType, accountSubType, creditPlan } = useAccountType()
  const [selectedLevel, setSelectedLevel] = useState(1)
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([])
  const [quantity, setQuantity] = useState(1)

  // Determine client type for content
  const clientType = accountType === "empresas" ? (accountSubType === "in-house" ? "company" : "company") : "agency"

  const content = mockProduct.content[clientType]
  const levels = mockProduct.levels[clientType]
  const selectedLevelData = levels[selectedLevel]

  // Calculate pricing
  const basePrice = selectedLevelData.price
  const addOnPrice = selectedAddOns.reduce((total, addOnId) => {
    const addOn = mockProduct.addOns.find((a) => a.id === addOnId)
    return total + (addOn?.price || 0)
  }, 0)

  const subtotal = (basePrice + addOnPrice) * quantity
  const finalPrice = calculatePrice(subtotal, accountType, accountSubType, creditPlan)
  const discount = subtotal - finalPrice

  const toggleAddOn = (addOnId: string) => {
    setSelectedAddOns((prev) => (prev.includes(addOnId) ? prev.filter((id) => id !== addOnId) : [...prev, addOnId]))
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <span>Catálogo</span>
          <span>/</span>
          <span>{mockProduct.category}</span>
          <span>/</span>
          <span className="text-foreground">{mockProduct.name}</span>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">{content.title}</h1>
            <p className="text-lg text-muted-foreground mb-4">{content.description}</p>

            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-1">
                <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                <span className="font-medium">{mockProduct.rating}</span>
                <span className="text-muted-foreground">({mockProduct.reviewCount} avaliações)</span>
              </div>
              <Separator orientation="vertical" className="h-4" />
              <div className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">{mockProduct.completedProjects} projetos concluídos</span>
              </div>
              <Separator orientation="vertical" className="h-4" />
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="text-sm">Entrega em {mockProduct.averageDeliveryTime}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {mockProduct.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
              <Badge variant="outline">{selectedLevelData.complexity}</Badge>
            </div>
          </div>

          {/* Pricing Card */}
          <Card className="lg:w-80">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Configurar Projeto</span>
                {selectedLevelData.popular && <Badge className="bg-blue-600">Mais Popular</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Quantity */}
              <div className="flex items-center justify-between">
                <span className="font-medium">Quantidade:</span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-8 text-center">{quantity}</span>
                  <Button variant="outline" size="sm" onClick={() => setQuantity(quantity + 1)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Pricing */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>R$ {subtotal.toLocaleString()}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Desconto:</span>
                    <span>-R$ {discount.toLocaleString()}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span>R$ {finalPrice.toLocaleString()}</span>
                </div>
              </div>

              <Button className="w-full" size="lg">
                <ShoppingCart className="h-4 w-4 mr-2" />
                Contratar Agora
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Content Tabs */}
      <Tabs defaultValue="overview" className="mb-8">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="levels">Níveis</TabsTrigger>
          <TabsTrigger value="addons">Complementos</TabsTrigger>
          <TabsTrigger value="demo">Demonstração</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Benefícios Principais</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                {content.benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>O que está incluído</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                {selectedLevelData.features.map((feature, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <Award className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="levels" className="space-y-6">
          <div className="grid md:grid-cols-3 gap-6">
            {levels.map((level, index) => (
              <Card
                key={index}
                className={`cursor-pointer transition-all ${
                  selectedLevel === index ? "ring-2 ring-blue-600 shadow-lg" : "hover:shadow-md"
                }`}
                onClick={() => setSelectedLevel(index)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{level.name}</CardTitle>
                    {level.popular && <Badge className="bg-blue-600">Popular</Badge>}
                  </div>
                  <CardDescription>{level.description}</CardDescription>
                  <div className="text-2xl font-bold">
                    R$ {calculatePrice(level.price, accountType, accountSubType, creditPlan).toLocaleString()}
                    {level.price !== calculatePrice(level.price, accountType, accountSubType, creditPlan) && (
                      <span className="text-sm text-muted-foreground line-through ml-2">
                        R$ {level.price.toLocaleString()}
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {level.features.map((feature, featureIndex) => (
                      <div key={featureIndex} className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>
                  <Badge variant="outline" className="mt-4">
                    {level.complexity}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="addons" className="space-y-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mockProduct.addOns.map((addOn) => (
              <Card
                key={addOn.id}
                className={`cursor-pointer transition-all ${
                  selectedAddOns.includes(addOn.id) ? "ring-2 ring-blue-600 shadow-lg" : "hover:shadow-md"
                }`}
                onClick={() => toggleAddOn(addOn.id)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{addOn.name}</CardTitle>
                    {selectedAddOns.includes(addOn.id) && <CheckCircle className="h-5 w-5 text-green-600" />}
                  </div>
                  <CardDescription>{addOn.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold">
                    +R$ {calculatePrice(addOn.price, accountType, accountSubType, creditPlan).toLocaleString()}
                    {addOn.price !== calculatePrice(addOn.price, accountType, accountSubType, creditPlan) && (
                      <span className="text-sm text-muted-foreground line-through ml-2">
                        +R$ {addOn.price.toLocaleString()}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="demo" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play className="h-5 w-5" />
                  Vídeo Demonstrativo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="aspect-video bg-slate-100 rounded-lg flex items-center justify-center">
                  <Button variant="outline" size="lg">
                    <Play className="h-6 w-6 mr-2" />
                    Assistir Demonstração
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Casos de Sucesso
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Empresa de E-commerce</h4>
                  <p className="text-sm text-muted-foreground">Aumento de 400% nas vendas online em 6 meses</p>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-600">+400% ROI</span>
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <h4 className="font-medium">Startup de Tecnologia</h4>
                  <p className="text-sm text-muted-foreground">Crescimento de 250% em leads qualificados</p>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-600">+250% Leads</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
