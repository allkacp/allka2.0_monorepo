// Mock tasks — shape matches API Task response
export interface MockApiTask {
  id: string;
  title: string;
  description: string;
  project_id: string;
  product_id?: string;
  project_product_id?: string;
  task_code?: string;
  assigned_to: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  stages?: Array<{
    id: string;
    catalog_step_ref: string;
    titulo: string;
    descricao: string | null;
    ordem: number;
    status: string;
    obrigatoria: boolean;
    depende_da_etapa_anterior: boolean;
    briefing_necessario: boolean;
    checklist_snapshot?: string[];
  }>;
}

export const mockTasks: MockApiTask[] = [
  {
    id: "1",
    title: "Pesquisa de mercado e benchmarking",
    description:
      "Levantar referências visuais e análise de concorrentes diretos",
    project_id: "1",
    assigned_to: "2",
    status: "completed",
    priority: "high",
    due_date: "2025-09-20",
    created_by: "11",
    created_at: "2025-09-01T10:00:00Z",
    updated_at: "2025-09-18T15:00:00Z",
  },
  {
    id: "2",
    title: "Criação do moodboard",
    description:
      "Montar painel de inspiração visual com cores, tipografia e estilo",
    project_id: "1",
    assigned_to: "2",
    status: "completed",
    priority: "medium",
    due_date: "2025-09-30",
    created_by: "11",
    created_at: "2025-09-05T09:00:00Z",
    updated_at: "2025-09-28T16:00:00Z",
  },
  {
    id: "3",
    title: "Design do logotipo",
    description: "Criar 3 opções de logotipo alinhadas ao moodboard aprovado",
    project_id: "1",
    assigned_to: "5",
    status: "completed",
    priority: "high",
    due_date: "2025-10-20",
    created_by: "11",
    created_at: "2025-10-01T08:00:00Z",
    updated_at: "2025-10-19T14:00:00Z",
  },
  {
    id: "4",
    title: "Post Instagram — Café da Semana",
    description: "Criar arte e copy para o post semanal de café destaque",
    project_id: "2",
    assigned_to: "7",
    status: "in_progress",
    priority: "medium",
    due_date: "2026-04-18",
    created_by: "11",
    created_at: "2026-04-14T08:00:00Z",
    updated_at: "2026-04-14T08:00:00Z",
  },
  {
    id: "5",
    title: "Stories — Bastidores da Torra",
    description: "Sequência de 5 stories mostrando processo de torra",
    project_id: "2",
    assigned_to: "7",
    status: "pending",
    priority: "low",
    due_date: "2026-04-20",
    created_by: "11",
    created_at: "2026-04-14T09:00:00Z",
    updated_at: "2026-04-14T09:00:00Z",
  },
  {
    id: "6",
    title: "Wireframe da landing page",
    description: "Wireframe de alta fidelidade para desktop e mobile",
    project_id: "3",
    assigned_to: "2",
    status: "in_progress",
    priority: "high",
    due_date: "2026-05-01",
    created_by: "11",
    created_at: "2026-04-10T10:00:00Z",
    updated_at: "2026-04-13T11:00:00Z",
  },
  {
    id: "7",
    title: "Briefing e planejamento da campanha",
    description: "Definir público-alvo, canais, mensagens-chave e cronograma",
    project_id: "4",
    assigned_to: null,
    status: "pending",
    priority: "urgent",
    due_date: "2026-08-15",
    created_by: "11",
    created_at: "2026-03-25T14:00:00Z",
    updated_at: "2026-03-25T14:00:00Z",
  },
  {
    id: "8",
    title: "Roteiro do vídeo",
    description: "Escrever roteiro e storyboard para vídeo de 3 minutos",
    project_id: "5",
    assigned_to: "5",
    status: "completed",
    priority: "high",
    due_date: "2026-03-20",
    created_by: "11",
    created_at: "2026-03-01T08:00:00Z",
    updated_at: "2026-03-18T17:00:00Z",
  },
  {
    id: "9",
    title: "Gravação — dia 1",
    description: "Gravação de cenas internas no escritório",
    project_id: "5",
    assigned_to: "5",
    status: "in_progress",
    priority: "high",
    due_date: "2026-04-25",
    created_by: "11",
    created_at: "2026-03-20T09:00:00Z",
    updated_at: "2026-04-12T10:00:00Z",
  },
  {
    id: "10",
    title: "Template de email — Abril",
    description: "Criar template responsivo para campanha de abril",
    project_id: "6",
    assigned_to: "7",
    status: "completed",
    priority: "medium",
    due_date: "2026-04-05",
    created_by: "11",
    created_at: "2026-03-28T10:00:00Z",
    updated_at: "2026-04-04T14:00:00Z",
  },
  {
    id: "11",
    title: "Artigo — Tendências de Marketing 2026",
    description: "Artigo de 1500 palavras para blog corporativo",
    project_id: "8",
    assigned_to: "2",
    status: "in_progress",
    priority: "medium",
    due_date: "2026-04-22",
    created_by: "11",
    created_at: "2026-04-08T08:00:00Z",
    updated_at: "2026-04-14T09:00:00Z",
  },
  {
    id: "12",
    title: "Infográfico — Dados de Consumo",
    description: "Infográfico visual com dados de consumo do Q1 2026",
    project_id: "8",
    assigned_to: "5",
    status: "pending",
    priority: "low",
    due_date: "2026-04-28",
    created_by: "11",
    created_at: "2026-04-10T11:00:00Z",
    updated_at: "2026-04-10T11:00:00Z",
  },
  {
    id: "13",
    title: "Revisão de UX — Fluxo de cadastro",
    description:
      "Revisar e melhorar o fluxo de cadastro de parceiros no portal",
    project_id: "9",
    assigned_to: "5",
    status: "pending",
    priority: "high",
    due_date: "2026-05-10",
    created_by: "11",
    created_at: "2026-03-15T14:00:00Z",
    updated_at: "2026-04-01T11:00:00Z",
  },
  {
    id: "14",
    title: "Manual de marca — versão digital",
    description: "Compilar brand book digital com especificações técnicas",
    project_id: "10",
    assigned_to: "2",
    status: "in_progress",
    priority: "medium",
    due_date: "2026-05-30",
    created_by: "11",
    created_at: "2026-04-01T08:00:00Z",
    updated_at: "2026-04-14T13:00:00Z",
  },
  {
    id: "15",
    title: "Paleta de cores e tipografia",
    description: "Definir paleta de cores principal e tipografia corporativa",
    project_id: "10",
    assigned_to: "7",
    status: "completed",
    priority: "high",
    due_date: "2026-03-15",
    created_by: "11",
    created_at: "2026-02-15T09:00:00Z",
    updated_at: "2026-03-14T16:00:00Z",
  },
];
