// @ts-nocheck
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { useAccountType } from "@/contexts/account-type-context"
import { PageHeader } from "@/components/page-header"
import {
  BookOpen,
  Play,
  Clock,
  Users,
  Star,
  Search,
  Filter,
  Award,
  Target,
  Lock,
  CheckCircle,
  PlayCircle,
  Wallet,
} from "lucide-react"
import type { Course, CourseCategory, CourseEnrollment, LearningPath } from "@/types/allkademy"

export default function AllkademyPage() {
  const { accountType, accountSubType } = useAccountType()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [courses, setCourses] = useState<Course[]>([])
  const [enrollments, setEnrollments] = useState<CourseEnrollment[]>([])
  const [categories, setCategories] = useState<CourseCategory[]>([])
  const [learningPaths, setLearningPaths] = useState<LearningPath[]>([])
  const [loading, setLoading] = useState(true)

  // Mock data - replace with API calls
  useEffect(() => {
    const mockCategories: CourseCategory[] = [
      { id: 1, name: "Plataforma Allka", description: "Como usar a plataforma", icon: "🚀", color: "blue" },
      { id: 2, name: "Marketing Digital", description: "Estratégias e táticas", icon: "📈", color: "green" },
      { id: 3, name: "Gestão de Projetos", description: "Metodologias e ferramentas", icon: "📋", color: "purple" },
      { id: 4, name: "Vendas", description: "Técnicas de vendas", icon: "💰", color: "orange" },
      { id: 5, name: "Liderança", description: "Desenvolvimento de liderança", icon: "👑", color: "red" },
    ]

    const mockCourses: Course[] = [
      {
        id: 1,
        title: "Introdução à Plataforma Allka",
        description: "Aprenda os fundamentos da plataforma e como maximizar seus resultados",
        thumbnail_url: "/allka-platform-tutorial.jpg",
        category: mockCategories[0],
        level: "beginner",
        duration_minutes: 120,
        price: 0,
        is_free: true,
        access_requirements: [],
        instructor: {
          name: "Equipe Allka",
          avatar_url: "/instructor-avatar.png",
          bio: "Especialistas da plataforma Allka",
        },
        status: "published",
        created_at: "2024-01-15",
        updated_at: "2024-01-15",
        modules: [],
        stats: {
          total_enrollments: 1250,
          completion_rate: 85,
          average_rating: 4.8,
          total_reviews: 156,
        },
      },
      {
        id: 2,
        title: "Marketing Digital Avançado",
        description: "Estratégias avançadas de marketing digital para agências",
        thumbnail_url: "/digital-marketing-course.png",
        category: mockCategories[1],
        level: "advanced",
        duration_minutes: 480,
        price: 299,
        is_free: false,
        access_requirements: [
          { type: "account_type", value: "agencias", description: "Disponível apenas para agências" },
        ],
        instructor: {
          name: "Carlos Marketing",
          avatar_url: "/marketing-instructor.jpg",
          bio: "15 anos de experiência em marketing digital",
        },
        status: "published",
        created_at: "2024-01-10",
        updated_at: "2024-01-10",
        modules: [],
        stats: {
          total_enrollments: 450,
          completion_rate: 72,
          average_rating: 4.6,
          total_reviews: 89,
        },
      },
      {
        id: 3,
        title: "Gestão de Projetos Premium",
        description: "Metodologias avançadas para gestão de projetos premium",
        thumbnail_url: "/project-management-course.png",
        category: mockCategories[2],
        level: "intermediate",
        duration_minutes: 360,
        price: 199,
        is_free: false,
        access_requirements: [
          { type: "account_level", value: "premium", description: "Disponível para contas premium" },
        ],
        instructor: {
          name: "Ana Projetos",
          avatar_url: "/project-manager-instructor.jpg",
          bio: "Especialista em gestão de projetos digitais",
        },
        status: "published",
        created_at: "2024-01-05",
        updated_at: "2024-01-05",
        modules: [],
        stats: {
          total_enrollments: 320,
          completion_rate: 78,
          average_rating: 4.7,
          total_reviews: 67,
        },
      },
    ]

    const mockEnrollments: CourseEnrollment[] = [
      {
        id: 1,
        user_id: 1,
        course_id: 1,
        enrolled_at: "2024-01-20",
        progress: 65,
        current_lesson_id: 3,
        payment_status: "free",
        lesson_progress: [],
        quiz_attempts: [],
      },
    ]

    const mockLearningPaths: LearningPath[] = [
      {
        id: 1,
        title: "Jornada do Nômade",
        description: "Trilha completa para nômades iniciantes",
        thumbnail_url: "/nomad-learning-path.jpg",
        courses: [mockCourses[0]],
        estimated_duration: 600,
        level: "beginner",
        access_requirements: [{ type: "account_type", value: "nomades", description: "Disponível para nômades" }],
        created_at: "2024-01-01",
      },
    ]

    setCategories(mockCategories)
    setCourses(mockCourses)
    setEnrollments(mockEnrollments)
    setLearningPaths(mockLearningPaths)
    setLoading(false)
  }, [])

  const filteredCourses = courses.filter((course) => {
    const matchesSearch =
      course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === "all" || course.category.id.toString() === selectedCategory

    // Check access requirements
    const hasAccess =
      course.access_requirements.length === 0 ||
      course.access_requirements.some((req) => {
        if (req.type === "account_type") return req.value === accountType
        if (req.type === "account_level") return true // Simplified check
        return true
      })

    return matchesSearch && matchesCategory && hasAccess
  })

  const canAccessCourse = (course: Course) => {
    if (course.access_requirements.length === 0) return true

    return course.access_requirements.every((req) => {
      if (req.type === "account_type") return req.value === accountType
      if (req.type === "account_level") return true // Simplified check
      return true
    })
  }

  const isEnrolled = (courseId: number) => {
    return enrollments.some((enrollment) => enrollment.course_id === courseId)
  }

  const getEnrollmentProgress = (courseId: number) => {
    const enrollment = enrollments.find((e) => e.course_id === courseId)
    return enrollment?.progress || 0
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-0 py-0">
      <PageHeader
        title="Allkademy"
        description="Centro de conhecimento e desenvolvimento profissional"
        actions={
          <div className="flex items-center space-x-4">
            <Badge variant="outline" className="px-3 py-1">
              <Wallet className="h-4 w-4 mr-1" />
              Créditos: R$ 1.250,00
            </Badge>
            <Button variant="outline">
              <Award className="h-4 w-4 mr-2" />
              Meus Certificados
            </Button>
          </div>
        }
      />

      <Tabs defaultValue="courses" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="courses">Cursos</TabsTrigger>
          <TabsTrigger value="my-learning">Meu Aprendizado</TabsTrigger>
          <TabsTrigger value="paths">Trilhas</TabsTrigger>
          <TabsTrigger value="certificates">Certificados</TabsTrigger>
        </TabsList>

        <TabsContent value="courses" className="space-y-6">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar cursos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todas as categorias</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id.toString()}>
                    {category.name}
                  </option>
                ))}
              </select>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filtros
              </Button>
            </div>
          </div>

          {/* Categories */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {categories.map((category) => (
              <Card
                key={category.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedCategory === category.id.toString() ? "ring-2 ring-blue-500" : ""
                }`}
                onClick={() => setSelectedCategory(category.id.toString())}
              >
                <CardContent className="p-4 text-center">
                  <div className="text-2xl mb-2">{category.icon}</div>
                  <h3 className="font-medium text-sm">{category.name}</h3>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Courses Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => (
              <Card key={course.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="relative">
                  <img
                    src={course.thumbnail_url || "/placeholder.svg"}
                    alt={course.title}
                    className="w-full h-48 object-cover"
                  />
                  <div className="absolute top-2 left-2">
                    <Badge variant={course.is_free ? "secondary" : "default"}>
                      {course.is_free ? "Gratuito" : `R$ ${course.price}`}
                    </Badge>
                  </div>
                  <div className="absolute top-2 right-2">
                    <Badge variant="outline" className="bg-white/90">
                      <Clock className="h-3 w-3 mr-1" />
                      {Math.floor(course.duration_minutes / 60)}h {course.duration_minutes % 60}m
                    </Badge>
                  </div>
                  {!canAccessCourse(course) && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Lock className="h-8 w-8 text-white" />
                    </div>
                  )}
                </div>

                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg line-clamp-2">{course.title}</CardTitle>
                      <CardDescription className="line-clamp-2 mt-1">{course.description}</CardDescription>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4 text-sm text-gray-500 mt-2">
                    <div className="flex items-center">
                      <Users className="h-4 w-4 mr-1" />
                      {course.stats.total_enrollments}
                    </div>
                    <div className="flex items-center">
                      <Star className="h-4 w-4 mr-1 fill-yellow-400 text-yellow-400" />
                      {course.stats.average_rating}
                    </div>
                    <Badge variant="outline" size="sm">
                      {course.level === "beginner"
                        ? "Iniciante"
                        : course.level === "intermediate"
                          ? "Intermediário"
                          : "Avançado"}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="flex items-center space-x-2 mb-3">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={course.instructor.avatar_url || "/placeholder.svg"} />
                      <AvatarFallback className="text-xs">
                        {course.instructor.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-gray-600">{course.instructor.name}</span>
                  </div>

                  {isEnrolled(course.id) ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Progresso</span>
                        <span>{getEnrollmentProgress(course.id)}%</span>
                      </div>
                      <Progress value={getEnrollmentProgress(course.id)} className="h-2" />
                      <Button className="w-full" size="sm">
                        <PlayCircle className="h-4 w-4 mr-2" />
                        Continuar
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {canAccessCourse(course) ? (
                        <Button className="w-full" size="sm">
                          {course.is_free ? (
                            <>
                              <Play className="h-4 w-4 mr-2" />
                              Começar Grátis
                            </>
                          ) : (
                            <>
                              <Wallet className="h-4 w-4 mr-2" />
                              Comprar - R$ {course.price}
                            </>
                          )}
                        </Button>
                      ) : (
                        <Button disabled className="w-full" size="sm">
                          <Lock className="h-4 w-4 mr-2" />
                          Acesso Restrito
                        </Button>
                      )}
                      {course.access_requirements.length > 0 && (
                        <p className="text-xs text-gray-500 text-center">{course.access_requirements[0].description}</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="my-learning" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cursos em Andamento</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">3</div>
                <p className="text-xs text-muted-foreground">+2 desde o mês passado</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cursos Concluídos</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">12</div>
                <p className="text-xs text-muted-foreground">85% de taxa de conclusão</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Horas de Estudo</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">48h</div>
                <p className="text-xs text-muted-foreground">Este mês</p>
              </CardContent>
            </Card>
          </div>

          {/* Enrolled Courses */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Cursos em Andamento</h3>
            {enrollments.map((enrollment) => {
              const course = courses.find((c) => c.id === enrollment.course_id)
              if (!course) return null

              return (
                <Card key={enrollment.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4">
                      <img
                        src={course.thumbnail_url || "/placeholder.svg"}
                        alt={course.title}
                        className="w-20 h-20 rounded-lg object-cover"
                      />
                      <div className="flex-1">
                        <h4 className="font-semibold text-lg">{course.title}</h4>
                        <p className="text-gray-600 text-sm mb-2">{course.description}</p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span>Progresso: {enrollment.progress}%</span>
                            <span>•</span>
                            <span>
                              {Math.floor(course.duration_minutes / 60)}h {course.duration_minutes % 60}m
                            </span>
                          </div>
                          <Button size="sm">
                            <PlayCircle className="h-4 w-4 mr-2" />
                            Continuar
                          </Button>
                        </div>
                        <Progress value={enrollment.progress} className="mt-2 h-2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="paths" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {learningPaths.map((path) => (
              <Card key={path.id} className="overflow-hidden">
                <img
                  src={path.thumbnail_url || "/placeholder.svg"}
                  alt={path.title}
                  className="w-full h-48 object-cover"
                />
                <CardHeader>
                  <CardTitle>{path.title}</CardTitle>
                  <CardDescription>{path.description}</CardDescription>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <div className="flex items-center">
                      <BookOpen className="h-4 w-4 mr-1" />
                      {path.courses.length} cursos
                    </div>
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      {Math.floor(path.estimated_duration / 60)}h
                    </div>
                    <Badge variant="outline" size="sm">
                      {path.level === "beginner"
                        ? "Iniciante"
                        : path.level === "intermediate"
                          ? "Intermediário"
                          : "Avançado"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button className="w-full">
                    <Target className="h-4 w-4 mr-2" />
                    Iniciar Trilha
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="certificates" className="space-y-6">
          <div className="text-center py-12">
            <Award className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum certificado ainda</h3>
            <p className="text-gray-600 mb-6">Complete seus primeiros cursos para ganhar certificados</p>
            <Button>
              <BookOpen className="h-4 w-4 mr-2" />
              Explorar Cursos
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
