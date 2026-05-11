// Mock Allkademy courses — shape matches ApiCourse from useAllkademy hook
export type CourseStatus = "published" | "draft" | "archived";
export type LessonType = "video" | "text" | "quiz";

export interface MockLesson {
  id: string;
  title: string;
  type: LessonType;
  duration_minutes: number | null;
  order: number;
  is_free: boolean;
}

export interface MockModule {
  id: string;
  title: string;
  order: number;
  lessons: MockLesson[];
}

export interface MockCourse {
  id: string;
  title: string;
  description: string | null;
  thumbnail: string | null;
  instructor_name: string;
  category: string;
  status: CourseStatus;
  level: "beginner" | "intermediate" | "advanced";
  duration_hours: number;
  price: number;
  is_free: boolean;
  enrollments_count: number;
  rating: number;
  modules: MockModule[];
  created_at: string;
  updated_at: string;
}

export interface MockEnrollment {
  id: string;
  course_id: string;
  course_title: string;
  user_id: string;
  progress_percent: number;
  completed_lessons: number;
  total_lessons: number;
  enrolled_at: string;
  completed_at: string | null;
}

export const mockCourses: MockCourse[] = [
  {
    id: "1",
    title: "Fundamentos da Plataforma Allka",
    description: "Aprenda a usar todos os recursos da plataforma para maximizar seus resultados.",
    thumbnail: null,
    instructor_name: "Equipe Allka",
    category: "Onboarding",
    status: "published",
    level: "beginner",
    duration_hours: 3,
    price: 0,
    is_free: true,
    enrollments_count: 87,
    rating: 4.8,
    modules: [
      {
        id: "m1",
        title: "Módulo 1 — Primeiros Passos",
        order: 1,
        lessons: [
          { id: "l1", title: "Bem-vindo à Allka", type: "video", duration_minutes: 8, order: 1, is_free: true },
          { id: "l2", title: "Configurando seu Perfil", type: "video", duration_minutes: 12, order: 2, is_free: true },
          { id: "l3", title: "Navegando pelo Painel", type: "video", duration_minutes: 10, order: 3, is_free: true },
        ],
      },
      {
        id: "m2",
        title: "Módulo 2 — Projetos e Tarefas",
        order: 2,
        lessons: [
          { id: "l4", title: "Criando seu Primeiro Projeto", type: "video", duration_minutes: 15, order: 1, is_free: false },
          { id: "l5", title: "Gerenciando Tarefas", type: "video", duration_minutes: 18, order: 2, is_free: false },
          { id: "l6", title: "Quiz — Projetos e Tarefas", type: "quiz", duration_minutes: 5, order: 3, is_free: false },
        ],
      },
    ],
    created_at: "2025-06-01T09:00:00Z",
    updated_at: "2026-03-10T10:00:00Z",
  },
  {
    id: "2",
    title: "Design Thinking para Nômades",
    description: "Metodologias de design thinking aplicadas a projetos remotos.",
    thumbnail: null,
    instructor_name: "Lucas Ferreira",
    category: "Design",
    status: "published",
    level: "intermediate",
    duration_hours: 8,
    price: 297.00,
    is_free: false,
    enrollments_count: 34,
    rating: 4.9,
    modules: [
      {
        id: "m3",
        title: "Módulo 1 — O Processo de Design Thinking",
        order: 1,
        lessons: [
          { id: "l7", title: "O que é Design Thinking?", type: "video", duration_minutes: 20, order: 1, is_free: true },
          { id: "l8", title: "Empatia e Descoberta", type: "video", duration_minutes: 30, order: 2, is_free: false },
          { id: "l9", title: "Definição do Problema", type: "text", duration_minutes: 10, order: 3, is_free: false },
        ],
      },
      {
        id: "m4",
        title: "Módulo 2 — Ideação e Prototipagem",
        order: 2,
        lessons: [
          { id: "l10", title: "Técnicas de Ideação", type: "video", duration_minutes: 25, order: 1, is_free: false },
          { id: "l11", title: "Prototipação Rápida", type: "video", duration_minutes: 35, order: 2, is_free: false },
          { id: "l12", title: "Teste com Usuários", type: "video", duration_minutes: 28, order: 3, is_free: false },
        ],
      },
    ],
    created_at: "2025-09-15T10:00:00Z",
    updated_at: "2026-02-20T11:00:00Z",
  },
  {
    id: "3",
    title: "APIs REST com Node.js e TypeScript",
    description: "Construa APIs profissionais com Express, Prisma e boas práticas de segurança.",
    thumbnail: null,
    instructor_name: "Rafael Mendes",
    category: "Desenvolvimento",
    status: "published",
    level: "advanced",
    duration_hours: 15,
    price: 497.00,
    is_free: false,
    enrollments_count: 58,
    rating: 4.7,
    modules: [
      {
        id: "m5",
        title: "Módulo 1 — Setup e Arquitetura",
        order: 1,
        lessons: [
          { id: "l13", title: "Introdução ao curso", type: "video", duration_minutes: 10, order: 1, is_free: true },
          { id: "l14", title: "Setup Node.js + TypeScript", type: "video", duration_minutes: 25, order: 2, is_free: false },
          { id: "l15", title: "Estrutura de pastas MVC", type: "video", duration_minutes: 20, order: 3, is_free: false },
        ],
      },
      {
        id: "m6",
        title: "Módulo 2 — Banco de Dados com Prisma",
        order: 2,
        lessons: [
          { id: "l16", title: "Introdução ao Prisma ORM", type: "video", duration_minutes: 30, order: 1, is_free: false },
          { id: "l17", title: "Schema e Migrações", type: "video", duration_minutes: 35, order: 2, is_free: false },
        ],
      },
    ],
    created_at: "2025-10-01T09:00:00Z",
    updated_at: "2026-03-15T10:00:00Z",
  },
  {
    id: "4",
    title: "Precificação e Proposta Comercial",
    description: "Como precificar seus serviços corretamente e criar propostas que vendem.",
    thumbnail: null,
    instructor_name: "Equipe Allka",
    category: "Negócios",
    status: "published",
    level: "beginner",
    duration_hours: 4,
    price: 197.00,
    is_free: false,
    enrollments_count: 112,
    rating: 4.6,
    modules: [
      {
        id: "m7",
        title: "Módulo 1 — Fundamentos de Precificação",
        order: 1,
        lessons: [
          { id: "l18", title: "Por que a precificação importa?", type: "video", duration_minutes: 15, order: 1, is_free: true },
          { id: "l19", title: "Modelos de precificação", type: "video", duration_minutes: 22, order: 2, is_free: false },
          { id: "l20", title: "Calculando seu custo/hora", type: "text", duration_minutes: 8, order: 3, is_free: false },
        ],
      },
    ],
    created_at: "2026-01-10T09:00:00Z",
    updated_at: "2026-03-20T10:00:00Z",
  },
  {
    id: "5",
    title: "Power BI para Freelancers",
    description: "Crie dashboards impressionantes para seus clientes com Power BI.",
    thumbnail: null,
    instructor_name: "Juliana Pinto",
    category: "Dados",
    status: "draft",
    level: "intermediate",
    duration_hours: 10,
    price: 347.00,
    is_free: false,
    enrollments_count: 0,
    rating: 0,
    modules: [
      {
        id: "m8",
        title: "Módulo 1 — Introdução ao Power BI",
        order: 1,
        lessons: [
          { id: "l21", title: "O que é Power BI e como instalar", type: "video", duration_minutes: 18, order: 1, is_free: false },
          { id: "l22", title: "Conectando fontes de dados", type: "video", duration_minutes: 25, order: 2, is_free: false },
        ],
      },
    ],
    created_at: "2026-03-01T09:00:00Z",
    updated_at: "2026-04-01T10:00:00Z",
  },
];

export const mockEnrollments: MockEnrollment[] = [
  {
    id: "1",
    course_id: "1",
    course_title: "Fundamentos da Plataforma Allka",
    user_id: "1",
    progress_percent: 100,
    completed_lessons: 6,
    total_lessons: 6,
    enrolled_at: "2025-06-05T09:00:00Z",
    completed_at: "2025-06-08T16:00:00Z",
  },
  {
    id: "2",
    course_id: "2",
    course_title: "Design Thinking para Nômades",
    user_id: "1",
    progress_percent: 50,
    completed_lessons: 3,
    total_lessons: 6,
    enrolled_at: "2025-10-20T10:00:00Z",
    completed_at: null,
  },
  {
    id: "3",
    course_id: "4",
    course_title: "Precificação e Proposta Comercial",
    user_id: "1",
    progress_percent: 33,
    completed_lessons: 1,
    total_lessons: 3,
    enrolled_at: "2026-02-01T10:00:00Z",
    completed_at: null,
  },
];
