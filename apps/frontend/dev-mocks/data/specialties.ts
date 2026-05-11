// Mock specialties — shape matches ApiSpecialty from useSpecialties hook
export interface MockSpecialty {
  id: string;
  name: string;
  category: string;
  description: string | null;
  is_active: boolean;
  nomades_count: number;
  created_at: string;
  updated_at: string;
}

export const mockSpecialties: MockSpecialty[] = [
  {
    id: "1",
    name: "UX Design",
    category: "Design",
    description: "Pesquisa de usuário, wireframes, prototipação e testes de usabilidade.",
    is_active: true,
    nomades_count: 12,
    created_at: "2024-01-10T09:00:00Z",
    updated_at: "2026-03-01T10:00:00Z",
  },
  {
    id: "2",
    name: "UI Design",
    category: "Design",
    description: "Design visual de interfaces digitais, design systems e componentes.",
    is_active: true,
    nomades_count: 15,
    created_at: "2024-01-10T09:00:00Z",
    updated_at: "2026-03-01T10:00:00Z",
  },
  {
    id: "3",
    name: "Desenvolvimento Front-end",
    category: "Tecnologia",
    description: "Implementação de interfaces web com HTML, CSS, JavaScript e frameworks modernos.",
    is_active: true,
    nomades_count: 18,
    created_at: "2024-01-15T09:00:00Z",
    updated_at: "2026-03-15T10:00:00Z",
  },
  {
    id: "4",
    name: "Desenvolvimento Back-end",
    category: "Tecnologia",
    description: "Construção de APIs, serviços e lógica de negócio no servidor.",
    is_active: true,
    nomades_count: 14,
    created_at: "2024-01-15T09:00:00Z",
    updated_at: "2026-03-15T10:00:00Z",
  },
  {
    id: "5",
    name: "Marketing Digital",
    category: "Marketing",
    description: "Estratégias digitais de aquisição e retenção de clientes.",
    is_active: true,
    nomades_count: 10,
    created_at: "2024-02-01T09:00:00Z",
    updated_at: "2026-02-20T10:00:00Z",
  },
  {
    id: "6",
    name: "Gestão de Projetos",
    category: "Gestão",
    description: "Planejamento, execução e entrega de projetos com metodologias ágeis.",
    is_active: true,
    nomades_count: 8,
    created_at: "2024-02-10T09:00:00Z",
    updated_at: "2026-02-15T10:00:00Z",
  },
  {
    id: "7",
    name: "DevOps / Cloud",
    category: "Tecnologia",
    description: "Infraestrutura, CI/CD, containers e plataformas de nuvem.",
    is_active: true,
    nomades_count: 6,
    created_at: "2024-03-01T09:00:00Z",
    updated_at: "2026-03-10T10:00:00Z",
  },
  {
    id: "8",
    name: "Copywriting",
    category: "Marketing",
    description: "Redação persuasiva para web, e-mail marketing e materiais comerciais.",
    is_active: true,
    nomades_count: 9,
    created_at: "2024-03-15T09:00:00Z",
    updated_at: "2026-02-28T10:00:00Z",
  },
  {
    id: "9",
    name: "Motion Design",
    category: "Design",
    description: "Animações, vídeos e peças em movimento para marca e campanhas.",
    is_active: true,
    nomades_count: 5,
    created_at: "2024-04-01T09:00:00Z",
    updated_at: "2026-01-20T10:00:00Z",
  },
  {
    id: "10",
    name: "Data Analytics",
    category: "Dados",
    description: "Análise de dados, dashboards, BI e insights para tomada de decisão.",
    is_active: false,
    nomades_count: 4,
    created_at: "2024-05-10T09:00:00Z",
    updated_at: "2025-12-01T10:00:00Z",
  },
];
