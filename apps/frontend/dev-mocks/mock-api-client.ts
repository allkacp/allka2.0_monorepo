/**
 * Mock API Client — same public interface as the real ApiClient in lib/api-client.ts.
 * Operates entirely in-browser.
 * Core collections are persisted to localStorage so Agency preview survives F5.
 */
import {
  mockCompanies,
  mockUsers,
  mockProjects,
  mockTasks,
  buildDashboardStats,
  mockRecentActivities,
  mockClients,
  mockNomades,
  mockNomadeLevels,
  mockPartnerLevels,
  mockCampaigns,
  mockProducts,
  mockInvoices,
  mockWithdrawals,
  mockFinancialStats,
  mockSpecialties,
  mockTerms,
  mockTermAcceptances,
  mockCourses,
  mockEnrollments,
  type MockCompany,
  type MockUser,
  type MockApiProject,
  type MockApiTask,
  type MockClient,
  type MockNomade,
  type MockNomadeLevel,
  type MockPartnerLevel,
  type MockCampaign,
  type MockProduct,
  type MockInvoice,
  type MockWithdrawal,
  type MockTerm,
  type MockTermAcceptance,
  type MockCourse,
  type MockEnrollment,
} from "./data";

const STORAGE_KEYS = {
  projects: "allka_mock_projects",
  tasks: "allka_mock_tasks",
};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeStorage(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function nextNumericId(items: Array<{ id: string }>, min = 100) {
  const maxExisting = items.reduce((max, item) => {
    const parsed = Number.parseInt(String(item.id), 10);
    return Number.isFinite(parsed) && parsed > max ? parsed : max;
  }, min - 1);
  return Math.max(min, maxExisting + 1);
}

function persistProjectState() {
  writeStorage(STORAGE_KEYS.projects, projects);
  writeStorage(STORAGE_KEYS.tasks, tasks);
}

// Deep-clone initial data so we can mutate in memory without affecting the source arrays
const companies: MockCompany[] = clone(mockCompanies);
const users: MockUser[] = clone(mockUsers);
const clients: MockClient[] = clone(mockClients);
const nomades: MockNomade[] = clone(mockNomades);
const nomadeLevels: MockNomadeLevel[] = clone(mockNomadeLevels);
const partnerLevels: MockPartnerLevel[] = clone(mockPartnerLevels);
let nextPartnerLevelId = 100;
const campaigns: MockCampaign[] = clone(mockCampaigns);
const products: MockProduct[] = clone(mockProducts);
const invoices: MockInvoice[] = clone(mockInvoices);
const payments: any[] = [];
const withdrawals: MockWithdrawal[] = clone(mockWithdrawals);
const terms: MockTerm[] = clone(mockTerms);
const termAcceptances: MockTermAcceptance[] = clone(mockTermAcceptances);
const courses: MockCourse[] = clone(mockCourses);
const enrollments: MockEnrollment[] = clone(mockEnrollments);

const projects: MockApiProject[] = readStorage<MockApiProject[]>(
  STORAGE_KEYS.projects,
  clone(mockProjects),
);
const tasks: MockApiTask[] = readStorage<MockApiTask[]>(
  STORAGE_KEYS.tasks,
  clone(mockTasks),
);

let nextCompanyId = 100;
let nextUserId = 100;
let nextProjectId = nextNumericId(projects);
let nextTaskId = nextNumericId(tasks);
let nextClientId = 100;
let nextNomadeId = 100;
let nextCampaignId = 100;
let nextProductId = 100;
let nextInvoiceId = 100;
let nextPaymentId = 100;
let nextWithdrawalId = 100;
let nextTermId = 100;
let nextCourseId = 100;
let nextEnrollmentId = 100;
let nextSpecialtyId = 100;

/** Simulate network latency (ms) */
const delay = (ms = 120) => new Promise((r) => setTimeout(r, ms));

function now() {
  return new Date().toISOString();
}

function initialsFromName(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

function buildProvisionalTaskTemplates(product: any) {
  const productName = product?.name || "Produto";
  const baseCategory = product?.category || "Geral";
  return [
    {
      id: `${product?.id || "TMP"}-T01`,
      code: `${product?.id || "TMP"}-T01`,
      name: `Estrutura provisória — ${productName}`,
      title: `Estrutura provisória — ${productName}`,
      description: `Modelo provisório automático para o produto ${productName}. Ajuste este fluxo depois.`,
      taskCategory: baseCategory,
      sort_order: 1,
      priority: "medium",
      steps: [
        {
          id: "S01",
          code: "S01",
          name: "Receber briefing",
          description: "Confirmar escopo, objetivo e prazo.",
          order: 1,
        },
        {
          id: "S02",
          code: "S02",
          name: "Organizar insumos",
          description: "Reunir acessos, materiais e referências.",
          order: 2,
        },
        {
          id: "S03",
          code: "S03",
          name: "Executar entrega principal",
          description: "Produzir a entrega base do produto.",
          order: 3,
        },
        {
          id: "S04",
          code: "S04",
          name: "Revisar internamente",
          description: "Checar qualidade, consistência e ajustes.",
          order: 4,
        },
        {
          id: "S05",
          code: "S05",
          name: "Enviar para aprovação",
          description:
            "Apresentar a versão provisória ao cliente ou à agência.",
          order: 5,
        },
        {
          id: "S06",
          code: "S06",
          name: "Ajustar e finalizar",
          description: "Aplicar correções finais e registrar a entrega.",
          order: 6,
        },
      ],
    },
  ];
}

function asProjectProductSnapshot(product: any, projectId: string) {
  return {
    id: `pp-${projectId}-${product.id}`,
    project_id: projectId,
    product_id: product.id,
    name: product.name,
    price: Number(product.base_price ?? product.price ?? 0),
    quantity: Number(product.quantity ?? 1),
    category: product.category || "outros",
    recurrence_snapshot: product.recurrence ?? null,
  };
}

function getProductTaskTemplates(product: any) {
  return Array.isArray(product?.tasks) && product.tasks.length > 0
    ? product.tasks
    : buildProvisionalTaskTemplates(product);
}

function buildTaskStagesFromTemplate(template: any, productName: string) {
  const steps = Array.isArray(template?.steps) && template.steps.length > 0
    ? template.steps
    : buildProvisionalTaskTemplates({ id: template?.id || "TMP", name: productName, category: template?.taskCategory || "Geral" })[0].steps;

  return steps.map((step: any, index: number) => ({
    id: `${template?.id || template?.code || "stage"}-${index + 1}`,
    catalog_step_ref: step.id || step.code || `S${String(index + 1).padStart(2, "0")}`,
    titulo: step.name || step.title || step.titulo || `Etapa ${index + 1}`,
    descricao: step.description || step.descricao || null,
    ordem: step.order || index + 1,
    status: index === 0 ? "PENDENTE" : "BLOQUEADA",
    obrigatoria: step.mandatory !== undefined ? !!step.mandatory : true,
    depende_da_etapa_anterior: index > 0,
    briefing_necessario: !!step.requires_briefing,
    checklist_snapshot: Array.isArray(step.checklist) ? step.checklist : [],
  }));
}

function buildMockProjectProduct(project: any, product: any, linkedAt?: string) {
  const taskTemplates = getProductTaskTemplates(product);
  const taskLinks = taskTemplates.map((template: any, index: number) => ({
    id: `tpl-${product.id}-${index + 1}`,
    product_id: product.id,
    sort_order: template.sort_order ?? index + 1,
    phase: template.phase ?? null,
    is_mandatory: true,
    catalog_task: {
      id: template.id ?? `${product.id}-T${String(index + 1).padStart(2, "0")}`,
      code: template.code ?? `${product.id}-T${String(index + 1).padStart(2, "0")}`,
      name: template.name ?? template.title ?? `Etapa ${index + 1}`,
      description: template.description || null,
      category: template.taskCategory || product.category || "Geral",
      checklist: template.checklist ?? null,
      steps: template.steps ?? null,
      briefing_questions: template.briefing_questions ?? null,
      default_priority: template.priority ?? "medium",
    },
  }));

  const linkedTasks = tasks.filter(
    (task) =>
      task.project_id === String(project.id) &&
      String(task.product_id || "") === String(product.id),
  );

  const tasksForProduct = linkedTasks.length
    ? linkedTasks.map((task, index) => ({
        id: task.id,
        title: task.title,
        description: task.description,
        status:
          task.status === "completed"
            ? "CONCLUIDA"
            : task.status === "in_progress"
              ? "EM_EXECUCAO"
              : task.status === "review"
                ? "EM_REVISAO"
                : "PARA_LANCAMENTO",
        due_date: task.due_date,
        lancamento_expires_at: null,
        task_code: task.task_code || `T-${task.id}`,
        stages: Array.isArray((task as any).stages) ? (task as any).stages : [],
        sort_order: index + 1,
      }))
    : taskLinks.map((link, index) => ({
        id: `task-${project.id}-${product.id}-${index + 1}`,
        title: link.catalog_task.name,
        description: link.catalog_task.description,
        status: index === 0 ? "EM_EXECUCAO" : "PARA_LANCAMENTO",
        due_date: linkedAt || null,
        lancamento_expires_at: null,
        task_code: link.catalog_task.code,
        stages: buildTaskStagesFromTemplate(link.catalog_task, product.name),
        sort_order: index + 1,
      }));

  return {
    id: `pp-${project.id}-${product.id}`,
    project_id: String(project.id),
    product_id: String(product.id),
    created_at: linkedAt || now(),
    due_date: project.end_date || null,
    status: project.status || "draft",
    product: {
      id: product.id,
      name: product.name,
      category: product.category,
      task_links: taskLinks,
    },
    tasks: tasksForProduct,
  };
}

function serializeCatalogTaskField(value: any) {
  if (value === undefined || value === null) return null;
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function estimateCatalogTaskHours(task: any) {
  if (Number.isFinite(Number(task?.estimated_hours))) {
    return Number(task.estimated_hours);
  }
  if (Number.isFinite(Number(task?.calculatedCost))) {
    return Number(task.calculatedCost);
  }
  const steps = Array.isArray(task?.steps) ? task.steps : [];
  return steps.reduce((total: number, step: any) => {
    const hours = Number(step?.estimatedHours ?? step?.estimated_hours ?? 0);
    return total + (Number.isFinite(hours) ? hours : 0);
  }, 0);
}

function normalizeCatalogTask(task: any, product?: any) {
  const id = String(
    task?.id ?? task?.code ?? `CT-${Math.random().toString(36).slice(2, 8)}`,
  );
  const nowValue = now();
  return {
    ...task,
    id,
    code: task?.code || id,
    name: task?.name || task?.title || "Modelo de tarefa",
    category: task?.category || task?.taskCategory || product?.category || "Geral",
    subcategory: task?.subcategory ?? null,
    task_type: task?.task_type || task?.type || "execution",
    description: task?.description || null,
    objective: task?.objective || null,
    default_deadline_days: task?.default_deadline_days ?? null,
    default_priority: task?.default_priority || task?.priority || "medium",
    complexity: task?.complexity || product?.complexity || "basic",
    estimated_hours: estimateCatalogTaskHours(task),
    responsible_type: task?.responsible_type ?? null,
    requires_access: Boolean(task?.requiresAccess ?? task?.requires_access),
    requires_briefing: Boolean(task?.requiresBriefing ?? task?.requires_briefing),
    requires_files: Boolean(task?.requiresFiles ?? task?.requires_files),
    steps: serializeCatalogTaskField(task?.steps),
    checklist: serializeCatalogTaskField(task?.checklist),
    briefing_questions: serializeCatalogTaskField(
      task?.briefing_questions ?? task?.questionnaire,
    ),
    required_files: serializeCatalogTaskField(task?.required_files),
    execution_rules: serializeCatalogTaskField(
      task?.execution_rules ?? task?.executionRules,
    ),
    conclusion_rules: serializeCatalogTaskField(
      task?.conclusion_rules ?? task?.conclusionRules,
    ),
    internal_guidance: serializeCatalogTaskField(task?.internal_guidance),
    notes: task?.notes ?? null,
    status: task?.status || (task?.is_active === false ? "inativa" : "ativa"),
    is_active: task?.is_active ?? true,
    created_at: task?.created_at || product?.created_at || nowValue,
    updated_at: task?.updated_at || product?.updated_at || nowValue,
    created_by: task?.created_by || "mock",
  };
}

function buildCatalogTaskLink(task: any, product: any, index: number) {
  return {
    id: `ctl-${task.id}-${product.id}`,
    product_id: product.id,
    catalog_task_id: task.id,
    sort_order: index + 1,
    is_mandatory: true,
    phase: null,
    notes: null,
    product: {
      id: product.id,
      name: product.name,
      category: product.category,
    },
  };
}

function buildCatalogTaskSeed() {
  const taskMap = new Map<string, any>();
  const links: any[] = [];

  (mockProducts as any[]).forEach((product) => {
    let metadata: any = null;
    try {
      metadata =
        typeof product?.metadata === "string"
          ? JSON.parse(product.metadata)
          : product?.metadata || null;
    } catch {
      metadata = null;
    }

    const productTasks = Array.isArray(metadata?.tasks)
      ? metadata.tasks
      : Array.isArray(product?.tasks)
        ? product.tasks
        : [];

    productTasks.forEach((task: any, index: number) => {
      const normalized = normalizeCatalogTask(task, product);
      const existing = taskMap.get(normalized.id);
      taskMap.set(normalized.id, existing ? { ...existing, ...normalized } : normalized);
      links.push(buildCatalogTaskLink(taskMap.get(normalized.id), product, index));
    });
  });

  return {
    tasks: Array.from(taskMap.values()),
    links,
  };
}

const catalogTaskSeed = buildCatalogTaskSeed();
const catalogTasks: any[] = catalogTaskSeed.tasks;
const catalogTaskLinks: any[] = catalogTaskSeed.links;
let nextCatalogTaskId = catalogTasks.length + 1;
let nextCatalogTaskLinkId = catalogTaskLinks.length + 1;

function summarizeCatalogTask(task: any) {
  if (!task) return null;
  return {
    id: task.id,
    code: task.code,
    name: task.name,
    category: task.category,
    subcategory: task.subcategory,
    task_type: task.task_type,
    description: task.description,
    status: task.status,
    is_active: task.is_active,
    created_at: task.created_at,
    updated_at: task.updated_at,
  };
}

function materializeCatalogTaskLink(link: any, includeCatalogTask = false) {
  const task = catalogTasks.find((item) => item.id === String(link.catalog_task_id));
  const product = link.product || {
    id: link.product_id,
    name: `Produto ${link.product_id}`,
    category: null,
  };
  const materialized: any = {
    ...link,
    product,
  };
  if (includeCatalogTask) {
    materialized.catalog_task = summarizeCatalogTask(task);
  }
  return materialized;
}

function materializeCatalogTask(task: any) {
  const productLinks = catalogTaskLinks
    .filter((link) => String(link.catalog_task_id) === String(task.id))
    .map((link) => materializeCatalogTaskLink(link, false));

  return {
    ...task,
    product_links: productLinks,
    _count: { product_links: productLinks.length },
  };
}

function materializeCatalogTaskDetail(task: any) {
  const productLinks = catalogTaskLinks
    .filter((link) => String(link.catalog_task_id) === String(task.id))
    .map((link) => materializeCatalogTaskLink(link, true));

  return {
    ...task,
    product_links: productLinks,
    _count: { product_links: productLinks.length },
  };
}

function findCatalogTaskIndex(id: string) {
  return catalogTasks.findIndex((task) => String(task.id) === String(id));
}

function findCatalogTaskById(id: string) {
  return catalogTasks.find((task) => String(task.id) === String(id));
}

function findCatalogTaskLinkIndex(productId: string, catalogTaskId: string) {
  return catalogTaskLinks.findIndex(
    (link) =>
      String(link.product_id) === String(productId) &&
      String(link.catalog_task_id) === String(catalogTaskId),
  );
}

class MockApiClient {
  // ─── Auth ───────────────────────────────────────────────────────────────
  private _currentUser: any = null;

  private mapOperationalTask(task: MockApiTask) {
    const project = projects.find((p) => p.id === task.project_id) || null;
    const client = project
      ? clients.find((c) => c.id === String(project.client_id)) || null
      : null;
    const agencyUser = users.find((u) => u.role === "agency_admin") || null;
    const nomadeUser = task.assigned_to
      ? users.find((u) => u.id === task.assigned_to) || null
      : null;

    return {
      id: task.id,
      project_id: task.project_id,
      project_product_id: `pp-${task.id}`,
      product_id: `prod-${task.id}`,
      catalog_task_id: null,
      task_code: `T-${task.id}`,
      code_snapshot: `T-${task.id}`,
      name_snapshot: task.title,
      category_snapshot: project?.type || "Geral",
      title: task.title,
      description: task.description || null,
      status:
        task.status === "completed"
          ? "CONCLUIDA"
          : task.status === "in_progress"
            ? "EM_EXECUCAO"
            : task.status === "cancelled"
              ? "CANCELADA"
              : task.status === "review"
                ? "EM_REVISAO"
                : "PARA_LANCAMENTO",
      priority:
        task.priority === "urgent"
          ? "urgent"
          : task.priority === "high"
            ? "high"
            : task.priority === "low"
              ? "low"
              : "medium",
      assignee_id: task.assigned_to,
      responsavel_agencia_id: agencyUser?.id || null,
      nomade_responsavel_id: nomadeUser?.id || null,
      due_date: task.due_date,
      start_date: task.created_at?.split("T")[0] || null,
      completed_at: task.status === "completed" ? task.updated_at : null,
      data_lancamento: null,
      data_liberacao_execucao: null,
      data_inicio_execucao: null,
      data_conclusao: task.status === "completed" ? task.updated_at : null,
      sort_order: Number(task.id),
      fase: project?.status || null,
      observations: task.description || null,
      checklist_snapshot: [],
      steps_snapshot: [],
      briefing_snapshot: [],
      created_at: task.created_at,
      updated_at: task.updated_at,
      responsavel_agencia: agencyUser
        ? { id: agencyUser.id, name: agencyUser.name, email: agencyUser.email }
        : null,
      nomade_responsavel: nomadeUser
        ? { id: nomadeUser.id, name: nomadeUser.name, email: nomadeUser.email }
        : null,
      project: {
        id: project?.id || task.project_id,
        title: project?.title || "Projeto",
        status: project?.status || "draft",
        type: project?.type || "",
        consultant: project?.consultant || null,
        client: client
          ? {
              id: client.id,
              name: client.name,
              logo: client.logo || undefined,
              cnpj: client.cnpj || undefined,
            }
          : null,
      },
      project_product: {
        id: `pp-${task.id}`,
        product_name_snapshot: task.title,
        product_code_snapshot: `T-${task.id}`,
        product_category_snapshot: project?.type || "Geral",
        status: task.status,
      },
      catalog_task: null,
      _count: { stages: 0, briefing_answers: 0, attachments: 0 },
    };
  }

  setToken(token: string) {
    try {
      localStorage.setItem("allka_token", token);
    } catch {}
  }
  clearToken() {
    try {
      localStorage.removeItem("allka_token");
    } catch {}
    this._currentUser = null;
  }

  async login(email: string, _password: string) {
    await delay();
    const found = users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase(),
    );
    if (!found) throw new Error("Usuário não encontrado.");
    // Accept the dev master password or the auto-login token
    if (
      _password !== "123@321" &&
      _password !== "123456" &&
      !_password.startsWith("dev-")
    ) {
      throw new Error("Email ou senha incorretos.");
    }
    this._currentUser = found;
    const token = `mock-jwt-${this._currentUser.id}`;
    this.setToken(token);
    return { token, user: this._currentUser };
  }

  async logout() {
    await delay();
    this.clearToken();
    return { message: "Logged out" };
  }

  async getCurrentUser() {
    await delay();
    if (this._currentUser) return this._currentUser;
    // Fallback: try to find by stored token
    try {
      const token = localStorage.getItem("allka_token");
      if (token) {
        const id = token.replace("mock-jwt-", "");
        const found = users.find((u) => u.id === id);
        if (found) {
          this._currentUser = found;
          return found;
        }
      }
    } catch {}
    // Last resort
    return users[0];
  }

  async getPartnerMe() {
    await delay();
    const user = (await this.getCurrentUser()) as any;
    return {
      profile: {
        id: `partner-${user.id}`,
        userId: user.id,
        name: user.name,
        email: user.email,
        avatarInitials: initialsFromName(user.name || "P"),
        balance: 0,
        totalEarned: 0,
        totalWithdrawn: 0,
        status: "active",
        createdAt: now(),
        level: "bronze",
      },
      stats: {
        clicks: 0,
        conversions: 0,
        abandonment: 0,
        conversionRate: 0,
        contractedProjects: 0,
        commissionsEarned: 0,
        period: "Atual",
      },
      commissions: [],
      withdrawals: [],
      projects: [],
      ledAgencies: [],
    };
  }

  async getPartnerCommissions() {
    await delay();
    return [];
  }

  // ─── Companies (clients) ───────────────────────────────────────────────
  async getCompanies(filters?: Record<string, any>) {
    await delay();
    let result = [...companies];
    if (filters?.search) {
      const q = String(filters.search).toLowerCase();
      result = result.filter((c) => c.name.toLowerCase().includes(q));
    }
    return { data: result, total: result.length, page: 1, limit: 1000 };
  }

  async getCompany(id: string) {
    await delay();
    return companies.find((c) => c.id === String(id)) || null;
  }

  async createCompany(data: any) {
    await delay();
    const company: MockCompany = {
      id: String(nextCompanyId++),
      name: data.name || "",
      cnpj: data.cnpj || null,
      email: data.email || null,
      phone: data.phone || null,
      status: data.status || "active",
      segment: data.segment || null,
      address: data.address || null,
      description: data.description || null,
      logo: data.logo || null,
      website: data.website || null,
      created_at: now(),
      updated_at: now(),
    };
    companies.push(company);
    return company;
  }

  async updateCompany(id: string, data: any) {
    await delay();
    const idx = companies.findIndex((c) => c.id === String(id));
    if (idx === -1) throw new Error("Company not found");
    companies[idx] = { ...companies[idx], ...data, updated_at: now() };
    return companies[idx];
  }

  async deleteCompany(id: string) {
    await delay();
    const idx = companies.findIndex((c) => c.id === String(id));
    if (idx !== -1) companies.splice(idx, 1);
    return { message: "Deleted" };
  }

  // ─── Clients (alias — the real API uses /clients for both) ─────────────
  async getClients() {
    return this.getCompanies();
  }
  async getClient(id: number) {
    return this.getCompany(String(id));
  }
  async createClient(data: any) {
    return this.createCompany(data);
  }
  async updateClient(id: number, data: any) {
    return this.updateCompany(String(id), data);
  }

  // ─── Chat ───────────────────────────────────────────────────────────────
  async getConversations() {
    await delay();
    return [];
  }
  async deleteClient(id: number) {
    return this.deleteCompany(String(id));
  }

  // ─── Users ─────────────────────────────────────────────────────────────
  async getUsers(filters?: Record<string, any>) {
    await delay();
    let result = [...users];
    if (filters?.search) {
      const q = String(filters.search).toLowerCase();
      result = result.filter(
        (u) =>
          u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
      );
    }
    if (filters?.company_id) {
      result = result.filter(
        (u) =>
          u.company_id != null &&
          String(u.company_id) === String(filters.company_id),
      );
    }
    if (filters?.account_type) {
      const requested = String(filters.account_type).toLowerCase();
      const aliases: Record<string, string[]> = {
        empresas: ["empresas", "company", "empresa"],
        agencias: ["agencias", "agency", "agencia"],
        nomades: ["nomades", "nomad", "nomade"],
      };
      const accepted = aliases[requested] ?? [requested];
      result = result.filter((u) =>
        accepted.includes(String(u.account_type || "").toLowerCase()),
      );
    }
    return { data: result, total: result.length, page: 1, limit: 1000 };
  }

  async getUser(id: string) {
    await delay();
    return users.find((u) => u.id === String(id)) || null;
  }

  async createUser(data: any) {
    await delay();
    const user: MockUser = {
      id: String(nextUserId++),
      name: data.name || "",
      email: data.email || "",
      role: data.role || "user",
      account_type: data.account_type || "empresa",
      is_active: true,
      avatar: null,
      phone: data.phone || null,
      created_at: now(),
      updated_at: now(),
    };
    users.push(user);
    return user;
  }

  async updateUser(id: string, data: any) {
    await delay();
    const idx = users.findIndex((u) => u.id === String(id));
    if (idx === -1) throw new Error("User not found");
    users[idx] = { ...users[idx], ...data, updated_at: now() };
    return users[idx];
  }

  async deleteUser(id: string) {
    await delay();
    const idx = users.findIndex((u) => u.id === String(id));
    if (idx !== -1) users.splice(idx, 1);
    return { message: "Deleted" };
  }

  // ─── Catalog Tasks (Cadastro de Tarefas) ────────────────────────────────
  async getCatalogTasks(filters?: Record<string, any>) {
    await delay();
    const page = Math.max(1, Number(filters?.page ?? 1) || 1);
    const limit = Math.max(1, Number(filters?.limit ?? 1000) || 1000);
    let result = catalogTasks.map((task) => materializeCatalogTask(task));

    if (filters?.search) {
      const q = String(filters.search).toLowerCase();
      result = result.filter(
        (task) =>
          task.name?.toLowerCase().includes(q) ||
          task.code?.toLowerCase().includes(q) ||
          task.category?.toLowerCase().includes(q) ||
          task.description?.toLowerCase().includes(q) ||
          (task.product_links || []).some(
            (link: any) =>
              link.product?.name?.toLowerCase().includes(q) ||
              String(link.product?.id || "").toLowerCase().includes(q),
          ),
      );
    }

    if (filters?.category) {
      result = result.filter(
        (task) => String(task.category) === String(filters.category),
      );
    }

    if (filters?.status) {
      result = result.filter(
        (task) => String(task.status) === String(filters.status),
      );
    }

    if (filters?.is_active !== undefined) {
      const expected =
        String(filters.is_active) === "true" || filters.is_active === true;
      result = result.filter((task) => Boolean(task.is_active) === expected);
    }

    result = result.sort((a, b) =>
      String(b.created_at).localeCompare(String(a.created_at)),
    );
    const total = result.length;
    const start = (page - 1) * limit;

    return {
      data: result.slice(start, start + limit),
      total,
      page,
      limit,
    };
  }

  async getCatalogTask(id: string) {
    await delay();
    const task = findCatalogTaskById(String(id));
    return task ? materializeCatalogTaskDetail(task) : null;
  }

  async createCatalogTask(data: any) {
    await delay();
    const nextId = String(nextCatalogTaskId++);
    const task = normalizeCatalogTask({
      ...data,
      id: data?.id || `ct-${nextId}`,
      code: data?.code || `CT-${String(nextCatalogTaskId).padStart(3, "0")}`,
      created_at: now(),
      updated_at: now(),
      created_by: data?.created_by || "mock",
    });
    catalogTasks.unshift(task);
    return materializeCatalogTaskDetail(task);
  }

  async updateCatalogTask(id: string, data: any) {
    await delay();
    const idx = findCatalogTaskIndex(String(id));
    if (idx === -1) throw new Error("CatalogTask not found");
    catalogTasks[idx] = normalizeCatalogTask(
      {
        ...catalogTasks[idx],
        ...data,
        updated_at: now(),
      },
      undefined,
    );
    return materializeCatalogTaskDetail(catalogTasks[idx]);
  }

  async updateCatalogTaskStatus(id: string, status: string, is_active?: boolean) {
    await delay();
    const idx = findCatalogTaskIndex(String(id));
    if (idx === -1) throw new Error("CatalogTask not found");
    catalogTasks[idx] = normalizeCatalogTask(
      {
        ...catalogTasks[idx],
        status,
        is_active: is_active ?? status === "ativa",
        updated_at: now(),
      },
      undefined,
    );
    return materializeCatalogTaskDetail(catalogTasks[idx]);
  }

  async deleteCatalogTask(id: string) {
    await delay();
    const idx = findCatalogTaskIndex(String(id));
    if (idx !== -1) catalogTasks.splice(idx, 1);
    for (let i = catalogTaskLinks.length - 1; i >= 0; i -= 1) {
      if (String(catalogTaskLinks[i].catalog_task_id) === String(id)) {
        catalogTaskLinks.splice(i, 1);
      }
    }
    return { ok: true };
  }

  async getCatalogTasksByProduct(productId: string) {
    await delay();
    return catalogTaskLinks
      .filter((link) => String(link.product_id) === String(productId))
      .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
      .map((link) => materializeCatalogTaskLink(link, true));
  }

  async linkCatalogTaskToProduct(data: {
    product_id: string;
    catalog_task_id: string;
    sort_order?: number;
    is_mandatory?: boolean;
    phase?: string;
    notes?: string;
  }) {
    await delay();
    const task = findCatalogTaskById(String(data.catalog_task_id));
    if (!task) throw new Error("CatalogTask not found");

    const product = products.find((item) => String(item.id) === String(data.product_id));
    if (!product) throw new Error("Product not found");

    const payload = {
      id: `ctl-${nextCatalogTaskLinkId++}`,
      product_id: String(data.product_id),
      catalog_task_id: String(data.catalog_task_id),
      sort_order: data.sort_order ?? 0,
      is_mandatory: data.is_mandatory ?? true,
      phase: data.phase ?? null,
      notes: data.notes ?? null,
      product: {
        id: product.id,
        name: product.name,
        category: product.category,
      },
    };

    const existingIdx = findCatalogTaskLinkIndex(
      payload.product_id,
      payload.catalog_task_id,
    );
    if (existingIdx !== -1) {
      catalogTaskLinks[existingIdx] = {
        ...catalogTaskLinks[existingIdx],
        ...payload,
      };
      return materializeCatalogTaskLink(catalogTaskLinks[existingIdx], true);
    }

    catalogTaskLinks.push(payload);
    return materializeCatalogTaskLink(payload, true);
  }

  async unlinkCatalogTask(linkId: string) {
    await delay();
    const idx = catalogTaskLinks.findIndex((link) => String(link.id) === String(linkId));
    if (idx !== -1) catalogTaskLinks.splice(idx, 1);
    return { ok: true };
  }

  // ─── Projects ──────────────────────────────────────────────────────────
  async getProjects(filters?: Record<string, any>) {
    await delay();
    let result = [...projects];
    const currentUser = (await this.getCurrentUser()) as any;
    const loggedAgencyName =
      currentUser?.agency_name || currentUser?.agency?.name || null;

    if (loggedAgencyName) {
      result = result.filter((p) => String(p.agency || "") === String(loggedAgencyName));
    }
    if (filters?.client_id) {
      result = result.filter(
        (p) => String(p.client_id) === String(filters.client_id),
      );
    }
    if (filters?.status) {
      result = result.filter((p) => p.status === filters.status);
    }
    return { data: result, total: result.length, page: 1, limit: 1000 };
  }

  async getProject(id: string | number) {
    await delay();
    return projects.find((p) => p.id === String(id)) || null;
  }

  async createProject(data: any) {
    await delay();
    const currentUser = (await this.getCurrentUser()) as any;
    const agencyName =
      currentUser?.agency_name || currentUser?.agency?.name || null;
    const projectId = String(nextProjectId++);
    const incomingProducts = Array.isArray(data?.products) ? data.products : [];
    const linkedProducts = incomingProducts.map((product: any, index: number) => ({
      id: product.id || `${projectId}-${index + 1}`,
      product_id: product.product_id || product.id || `${projectId}-${index + 1}`,
      name: product.name || product.product_name || "Produto",
      price: Number(product.price ?? product.finalPrice ?? 0),
      quantity: Number(product.quantity ?? product.qty ?? 1),
      category: product.category || "outros",
      project_id: projectId,
      recurrence_snapshot: product.recurrence_snapshot ?? data.lifecycle ?? "avulso",
    }));
    const project: MockApiProject = {
      id: projectId,
      title: data.title || data.name || "",
      description: data.description || "",
      client_id: data.client_id || "1",
      client: {
        name: data.client_name || "Nova Empresa",
        cnpj: data.client_cnpj || "",
      },
      agency: agencyName || data.agency || "",
      company_type: data.company_type || "company",
      consultant: data.consultant || "",
      consultant_email: data.consultant_email || "",
      type: data.type || "",
      status: data.status || "draft",
      progress: 0,
      budget: data.budget || data.value || 0,
      value: data.value || data.budget || 0,
      spent: 0,
      start_date: data.start_date || "",
      end_date: data.end_date || "",
      team_size: data.team_size || 0,
      nomades: data.nomades || "[]",
      bitrix_sync: false,
      portfolio_permission: false,
      overdue: false,
      from_lead: false,
      lifecycle: data.lifecycle || "avulso",
      billing_day: data.billing_day || null,
      billing_start_date: data.billing_start_date || null,
      _count: { task_executions: 0 },
      products: linkedProducts,
      created_at: now(),
      updated_at: now(),
    };
    project._count = { task_executions: linkedProducts.length };
    projects.push(project);
    persistProjectState();
    return project;
  }

  async getProjectProducts(filters?: Record<string, any>) {
    await delay();

    let result = projects.flatMap((project) => {
      const projectProducts = project.products || [];
      return projectProducts.map((product) =>
        buildMockProjectProduct(project, product, (product as any).created_at),
      );
    });

    if (filters?.project_id) {
      result = result.filter(
        (item) => String(item.project_id) === String(filters.project_id),
      );
    }

    if (filters?.product_id) {
      result = result.filter(
        (item) => String(item.product_id) === String(filters.product_id),
      );
    }

    return { data: result, total: result.length, page: 1, limit: 1000 };
  }

  async updateProject(id: string | number, data: any) {
    await delay();
    const idx = projects.findIndex((p) => p.id === String(id));
    if (idx === -1) throw new Error("Project not found");
    projects[idx] = { ...projects[idx], ...data, updated_at: now() };
    persistProjectState();
    return projects[idx];
  }

  async deleteProject(id: string | number) {
    await delay();
    const idx = projects.findIndex((p) => p.id === String(id));
    if (idx !== -1) {
      const projectId = String(id);
      projects.splice(idx, 1);
      for (let i = tasks.length - 1; i >= 0; i -= 1) {
        if (String(tasks[i].project_id) === projectId) tasks.splice(i, 1);
      }
      persistProjectState();
    }
    return { message: "Deleted" };
  }

  async linkProductToProject(data: {
    project_id: string;
    product_id: string;
    variation_id?: string;
    recurrence_snapshot?: "avulso" | "mensal";
    preco_final_cliente_snapshot?: number;
    comissao_snapshot?: number;
    pagador_snapshot?: "AGENCIA" | "CLIENTE";
    start_date?: string;
    expected_end_date?: string;
  }) {
    await delay();

    const project = projects.find((p) => p.id === String(data.project_id));
    if (!project) throw new Error("Project not found");

    const product = products.find((p) => p.id === String(data.product_id));
    if (!product) throw new Error("Product not found");

    const projectProducts = (project as any).products || [];
    const existing = projectProducts.find(
      (item: any) =>
        String(item.product_id || item.id) === String(data.product_id),
    );

    const projectProduct =
      existing || {
        ...asProjectProductSnapshot(product, String(project.id)),
        price: Number(
          data.preco_final_cliente_snapshot ?? product.base_price ?? 0,
        ),
        created_at: now(),
        due_date: data.expected_end_date || null,
      };

    if (!existing) {
      (project as any).products = [
        ...projectProducts,
        {
          ...projectProduct,
          product_id: product.id,
        },
      ];
    }

    const taskTemplates = getProductTaskTemplates(product);
    const templatesToCreate =
      taskTemplates.length > 0
        ? taskTemplates
        : [
            {
              id: `${product.id}-T01`,
              name: `${product.name} - Etapa 1`,
              description:
                product.short_description || product.description || "",
              sort_order: 1,
            },
          ];

    templatesToCreate.forEach((template: any, index: number) => {
      const taskTitle =
        template.name || template.title || `${product.name} - Etapa ${index + 1}`;
      const existingTask = tasks.find(
        (task) =>
          task.project_id === String(data.project_id) &&
          task.title === taskTitle,
      );

      if (existingTask) return;

      tasks.push({
        id: String(nextTaskId++),
        title: taskTitle,
        description:
          template.description ||
          product.short_description ||
          product.description ||
          "",
        project_id: String(data.project_id),
        product_id: product.id,
        project_product_id: projectProduct.id,
        task_code: template.id || `${product.id}-T${String(index + 1).padStart(2, "0")}`,
        assigned_to: null,
        status: index === 0 ? "in_progress" : "pending",
        priority: template.priority || "medium",
        due_date: data.expected_end_date || null,
        created_by: "1",
        created_at: now(),
        updated_at: now(),
        stages: buildTaskStagesFromTemplate(template, product.name),
      });
    });

    project.status = project.status === "draft" ? "planning" : project.status;
    project.updated_at = now();
    persistProjectState();

    return {
      id: projectProduct.id,
      project_product: projectProduct,
      project_id: String(data.project_id),
      product_id: String(data.product_id),
    };
  }

  async getProjectTasks(projectId: string | number) {
    await delay();
    return tasks
      .filter((t) => t.project_id === String(projectId))
      .map((t) => this.mapOperationalTask(t));
  }

  async getProjectTaskStages(id: string | number) {
    await delay();
    const task = tasks.find((t) => t.id === String(id));
    if (!task) return { data: [], total: 0 };
    const stages = Array.isArray((task as any).stages) ? (task as any).stages : [];
    return { data: stages, total: stages.length };
  }

  async getProjectLog(_id: string | number) {
    await delay();
    return { data: [], total: 0, page: 1, limit: 1000 };
  }

  async getOperationalTasks(filters?: Record<string, any>) {
    await delay();
    let result = [...tasks];
    if (filters?.project_id) {
      result = result.filter(
        (t) => t.project_id === String(filters.project_id),
      );
    }
    if (filters?.status) {
      result = result.filter((t) => t.status === filters.status);
    }
    return { data: result.map((t) => this.mapOperationalTask(t)), total: result.length, page: 1, limit: 1000 };
  }

  // ─── Tasks ─────────────────────────────────────────────────────────────
  async getTasks(filters?: Record<string, any>) {
    await delay();
    let result = [...tasks];
    if (filters?.project_id) {
      result = result.filter(
        (t) => t.project_id === String(filters.project_id),
      );
    }
    if (filters?.status) {
      result = result.filter((t) => t.status === filters.status);
    }
    return { data: result, total: result.length, page: 1, limit: 1000 };
  }

  async getTask(id: string | number) {
    await delay();
    return tasks.find((t) => t.id === String(id)) || null;
  }

  async createTask(data: any) {
    await delay();
    const task: MockApiTask = {
      id: String(nextTaskId++),
      title: data.title || "",
      description: data.description || "",
      project_id: String(data.project_id || 1),
      assigned_to: data.assigned_to || null,
      status: data.status || "pending",
      priority: data.priority || "medium",
      due_date: data.due_date || null,
      created_by: "11",
      created_at: now(),
      updated_at: now(),
    };
    tasks.push(task);
    persistProjectState();
    return task;
  }

  async updateTask(id: string | number, data: any) {
    await delay();
    const idx = tasks.findIndex((t) => t.id === String(id));
    if (idx === -1) throw new Error("Task not found");
    tasks[idx] = { ...tasks[idx], ...data, updated_at: now() };
    persistProjectState();
    return tasks[idx];
  }

  async updateProjectTask(id: string | number, data: any) {
    return this.updateTask(id, data);
  }

  async launchProjectTask(id: string | number) {
    return this.updateTask(id, { status: "in_progress" });
  }

  async releaseProjectTask(id: string | number) {
    return this.updateTask(id, { status: "in_progress" });
  }

  async deleteTask(id: string | number) {
    await delay();
    const idx = tasks.findIndex((t) => t.id === String(id));
    if (idx !== -1) {
      tasks.splice(idx, 1);
      persistProjectState();
    }
    return { message: "Deleted" };
  }

  async updateTaskStatus(id: string | number, status: string) {
    return this.updateTask(id, { status });
  }

  // ─── Dashboard ─────────────────────────────────────────────────────────
  async getDashboardStats() {
    await delay();
    return buildDashboardStats(companies, projects, tasks, users);
  }

  async getRecentActivities() {
    await delay();
    return mockRecentActivities;
  }

  async getRevenue(_from?: string, _to?: string) {
    await delay();
    return {
      total: 270800, creditPlan: 114000, recurring: 97600, oneTime: 59200,
      projected: 297880, growth: 0, totalGrowth: 0,
      creditPlanGrowth: 0, recurringGrowth: 0, oneTimeGrowth: 0,
    };
  }

  async getDashboardWidgets(_from: Date, _to: Date) {
    await delay();
    return {
      revenue: { total: 270800, growth: 0, creditPlan: 114000, recurring: 97600, oneTime: 59200, projected: 297880 },
      mrr: { value: 270800, growth: 0, trendData: [189560, 211224, 227472, 243720, 259968, 270800] },
      churn: { rate: 0, inactiveAccounts: 0, cancelledProjects: 0, revenueChurn: 0, revenueChurnRate: 0 },
      averageTicket: { general: 1213, growth: 5, perProject: 2840, trendData: [980, 1050, 1100, 1180, 1210, 1213] },
      ltv: { value: 14556, agencies: 0, leadPremium: 0, nomades: 0, hist0to1k: 0, hist1kto5k: 0, hist5kto15k: 0, hist15kplus: 0 },
      activeProjects: { total: 26, inProgress: 12, delivered: 8, pending: 6, growth: 0 },
      tasks: { total: 93, done: 45, inProgress: 30, pending: 18, completionRate: 48 },
      accountsReceivable: { total: 270800, creditPlans: 0, postPaid: 270800, others: 0, received: 270800, growth: 0 },
      nomads: { total: 15, active: 15, newThisMonth: 2, growth: 0, avgRating: 0 },
      partnerProgram: { activePartners: 0, totalReferrals: 0, conversionRate: 0, partnerRevenue: 0 },
      statusOverview: { active: 40, trial: 5, suspended: 2, cancelled: 3, total: 50 },
      creditPlans: { active: 0, totalValue: 0, avgValue: 0, overdue: 0 },
      platformActivities: { logins: 0, projectsCreated: 26, tasksCompleted: 45, messagesExchanged: 0 },
    };
  }

  async getMyTasks() {
    await delay();
    return tasks.filter((t) => t.status !== "completed").slice(0, 5);
  }

  // ─── Project Clients ────────────────────────────────────────────────────
  async getProjectClients(filters?: Record<string, any>) {
    await delay();
    let result = [...clients];
    if (filters?.search) {
      const q = String(filters.search).toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          (c.cnpj || "").includes(q) ||
          (c.cpf || "").includes(q),
      );
    }
    if (filters?.company_id) {
      result = result.filter(
        (c) => String(c.company_id) === String(filters.company_id),
      );
    }
    if (filters?.status) {
      result = result.filter((c) => c.status === filters.status);
    }
    return { data: result, total: result.length, page: 1, limit: 1000 };
  }

  async getProjectClient(id: string) {
    await delay();
    return clients.find((c) => c.id === String(id)) || null;
  }

  async createProjectClient(data: any) {
    await delay();
    // Duplicate check
    if (data.cnpj && clients.some((c) => c.cnpj === data.cnpj)) {
      throw new Error(`Já existe um cliente com o CNPJ ${data.cnpj}`);
    }
    if (data.cpf && clients.some((c) => c.cpf === data.cpf)) {
      throw new Error(`Já existe um cliente com o CPF ${data.cpf}`);
    }
    if (data.email && clients.some((c) => c.email === data.email)) {
      throw new Error(`Já existe um cliente com o e-mail ${data.email}`);
    }
    const client: MockClient = {
      id: String(nextClientId++),
      name: data.name || "",
      type: data.type || "pj",
      cnpj: data.cnpj || null,
      cpf: data.cpf || null,
      email: data.email || "",
      phone: data.phone || null,
      status: data.status || "active",
      company_id: data.company_id || null,
      company_name: data.company_name || null,
      projects_count: 0,
      address: data.address || null,
      city: data.city || null,
      state: data.state || null,
      notes: data.notes || null,
      created_at: now(),
      updated_at: now(),
    };
    clients.push(client);
    return client;
  }

  async updateProjectClient(id: string, data: any) {
    await delay();
    const idx = clients.findIndex((c) => c.id === String(id));
    if (idx === -1) throw new Error("Cliente não encontrado");
    // Duplicate check (exclude self)
    if (
      data.cnpj &&
      clients.some((c) => c.id !== String(id) && c.cnpj === data.cnpj)
    ) {
      throw new Error(`Já existe um cliente com o CNPJ ${data.cnpj}`);
    }
    if (
      data.cpf &&
      clients.some((c) => c.id !== String(id) && c.cpf === data.cpf)
    ) {
      throw new Error(`Já existe um cliente com o CPF ${data.cpf}`);
    }
    if (
      data.email &&
      clients.some((c) => c.id !== String(id) && c.email === data.email)
    ) {
      throw new Error(`Já existe um cliente com o e-mail ${data.email}`);
    }
    clients[idx] = { ...clients[idx], ...data, updated_at: now() };
    return clients[idx];
  }

  async deleteProjectClient(id: string) {
    await delay();
    const idx = clients.findIndex((c) => c.id === String(id));
    if (idx !== -1) clients.splice(idx, 1);
    return { message: "Deleted" };
  }

  // ─── Nomades ────────────────────────────────────────────────────────────
  async getNomades(filters?: Record<string, any>) {
    await delay();
    let result = [...nomades];
    if (filters?.search) {
      const q = String(filters.search).toLowerCase();
      result = result.filter(
        (n) =>
          n.name.toLowerCase().includes(q) || n.email.toLowerCase().includes(q),
      );
    }
    if (filters?.status)
      result = result.filter((n) => n.status === filters.status);
    if (filters?.level_id)
      result = result.filter((n) => n.level_id === String(filters.level_id));
    return { data: result, total: result.length, page: 1, limit: 1000 };
  }

  async getNomade(id: string) {
    await delay();
    return nomades.find((n) => n.id === String(id)) || null;
  }

  async createNomade(data: any) {
    await delay();
    const nomade: MockNomade = {
      id: String(nextNomadeId++),
      name: data.name || "",
      email: data.email || "",
      phone: data.phone || null,
      cpf: data.cpf || null,
      status: data.status || "pending",
      level_id: null,
      level_name: null,
      score: 0,
      avatar: null,
      city: data.city || null,
      state: data.state || null,
      bio: data.bio || null,
      specialties: data.specialties || [],
      projects_count: 0,
      rating: 0,
      created_at: now(),
      updated_at: now(),
    };
    nomades.push(nomade);
    return nomade;
  }

  async updateNomade(id: string, data: any) {
    await delay();
    const idx = nomades.findIndex((n) => n.id === String(id));
    if (idx === -1) throw new Error("Nômade não encontrado");
    nomades[idx] = { ...nomades[idx], ...data, updated_at: now() };
    return nomades[idx];
  }

  async deleteNomade(id: string) {
    await delay();
    const idx = nomades.findIndex((n) => n.id === String(id));
    if (idx !== -1) nomades.splice(idx, 1);
    return { message: "Deleted" };
  }

  // ─── Nomade Levels ──────────────────────────────────────────────────────
  async getNomadeLevels() {
    await delay();
    return [...nomadeLevels];
  }

  // ─── Partner Levels ─────────────────────────────────────────────────────
  async getLevels() {
    await delay();
    return [...partnerLevels].sort(
      (a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
    );
  }

  async createLevel(data: any) {
    await delay();
    const level = {
      id: `pl-${nextPartnerLevelId++}`,
      name: data.name || "",
      description: data.description || "",
      icon: data.icon || "⭐",
      color: data.color || "#6B7280",
      gradient: data.gradient || "from-slate-400 to-slate-600",
      min_mrr: data.min_mrr ?? 0,
      max_mrr: data.max_mrr ?? null,
      led_agencies_min: data.led_agencies_min ?? 0,
      led_agencies_mrr_min: data.led_agencies_mrr_min ?? 0,
      premium_project_limit: data.premium_project_limit ?? null,
      commission_rate: data.commission_rate ?? 0,
      extra_discount: data.extra_discount ?? 0,
      receives_leads_premium: data.receives_leads_premium ?? false,
      requires_partner: data.requires_partner ?? false,
      level_up_bonus_credits: data.level_up_bonus_credits ?? 0,
      benefits: Array.isArray(data.benefits) ? data.benefits : [],
      sort_order: data.sort_order ?? partnerLevels.length + 1,
    };
    partnerLevels.push(level);
    return level;
  }

  async updateLevel(id: string, data: any) {
    await delay();
    const idx = partnerLevels.findIndex((l: any) => l.id === String(id));
    if (idx === -1) throw new Error("Nível não encontrado");
    partnerLevels[idx] = { ...partnerLevels[idx], ...data };
    return partnerLevels[idx];
  }

  async deleteLevel(id: string) {
    await delay();
    const idx = partnerLevels.findIndex((l: any) => l.id === String(id));
    if (idx !== -1) partnerLevels.splice(idx, 1);
    return { message: "Deleted" };
  }

  async createNomadeLevel(data: any) {
    await delay();
    const level = {
      id: String(nextNomadeId++),
      name: data.name || "",
      min_score: data.min_score ?? 0,
      max_score: data.max_score ?? null,
      description: data.description || null,
      benefits: data.benefits || null,
      color: data.color || "#6B7280",
    };
    nomadeLevels.push(level);
    return level;
  }

  async updateNomadeLevel(id: string, data: any) {
    await delay();
    const idx = nomadeLevels.findIndex((l) => l.id === String(id));
    if (idx === -1) throw new Error("Nível não encontrado");
    nomadeLevels[idx] = { ...nomadeLevels[idx], ...data };
    return nomadeLevels[idx];
  }

  async deleteNomadeLevel(id: string) {
    await delay();
    const idx = nomadeLevels.findIndex((l) => l.id === String(id));
    if (idx !== -1) nomadeLevels.splice(idx, 1);
    return { message: "Deleted" };
  }

  // ─── Campaigns ──────────────────────────────────────────────────────────
  async getCampaigns(filters?: Record<string, any>) {
    await delay();
    let result = [...campaigns];
    if (filters?.search) {
      const q = String(filters.search).toLowerCase();
      result = result.filter((c) => c.name.toLowerCase().includes(q));
    }
    if (filters?.status)
      result = result.filter((c) => c.status === filters.status);
    if (filters?.type) result = result.filter((c) => c.type === filters.type);
    return { data: result, total: result.length, page: 1, limit: 1000 };
  }

  async getCampaign(id: string) {
    await delay();
    return campaigns.find((c) => c.id === String(id)) || null;
  }

  async createCampaign(data: any) {
    await delay();
    const campaign: MockCampaign = {
      id: String(nextCampaignId++),
      name: data.name || "",
      description: data.description || null,
      type: data.type || "coupon",
      status: data.status || "active",
      code: data.code || null,
      discount_value: data.discount_value ?? null,
      discount_type: data.discount_type || null,
      max_uses: data.max_uses ?? null,
      current_uses: 0,
      start_date: data.start_date || null,
      end_date: data.end_date || null,
      nomade_id: data.nomade_id || null,
      nomade_name: data.nomade_name || null,
      created_at: now(),
      updated_at: now(),
    };
    campaigns.push(campaign);
    return campaign;
  }

  async updateCampaign(id: string, data: any) {
    await delay();
    const idx = campaigns.findIndex((c) => c.id === String(id));
    if (idx === -1) throw new Error("Campanha não encontrada");
    campaigns[idx] = { ...campaigns[idx], ...data, updated_at: now() };
    return campaigns[idx];
  }

  async deleteCampaign(id: string) {
    await delay();
    const idx = campaigns.findIndex((c) => c.id === String(id));
    if (idx !== -1) campaigns.splice(idx, 1);
    return { message: "Deleted" };
  }

  // ─── Products / Catalog ─────────────────────────────────────────────────
  async getProducts(filters?: Record<string, any>) {
    await delay();
    let result = [...products];
    if (filters?.search) {
      const q = String(filters.search).toLowerCase();
      result = result.filter((p) => p.name.toLowerCase().includes(q));
    }
    if (filters?.category)
      result = result.filter((p) => p.category === filters.category);
    if (filters?.status)
      result = result.filter((p) => p.status === filters.status);
    if (filters?.is_active !== undefined)
      result = result.filter(
        (p) =>
          p.is_active ===
          (filters.is_active === "true" || filters.is_active === true),
      );
    const enriched = result.map((product) => ({
      ...product,
      tasks: getProductTaskTemplates(product),
    }));
    return { data: enriched, total: enriched.length, page: 1, limit: 1000 };
  }

  async getProduct(id: string) {
    await delay();
    const product = products.find((p) => p.id === String(id)) || null;
    if (!product) return null;
    return {
      ...product,
      tasks: getProductTaskTemplates(product),
    };
  }

  async createProduct(data: any) {
    await delay();
    // data vem de frontendToBackendProduct — usa os campos BackendProduct
    const product: MockProduct = {
      id: String(nextProductId++),
      name: data.name || "",
      description: data.description || null,
      short_description: data.short_description || null,
      category: data.category || "outros",
      tags: data.tags || null,
      base_price: data.base_price ?? 0,
      complexity: data.complexity || "basic",
      visibility: data.visibility || null,
      image: data.image || null,
      demonstrations: data.demonstrations || null,
      completion_time: data.completion_time || null,
      metadata: data.metadata || null,
      is_active: data.is_active ?? true,
      created_at: now(),
      updated_at: now(),
      variations: data.variations || [],
      addons: data.addons || [],
      // legado
      status: data.is_active ? "active" : "draft",
    };
    (product as any).tasks = Array.isArray(data.tasks) && data.tasks.length > 0
      ? data.tasks
      : buildProvisionalTaskTemplates(product);
    products.push(product);
    return product;
  }

  async updateProduct(id: string, data: any) {
    await delay();
    const idx = products.findIndex((p) => p.id === String(id));
    if (idx === -1) throw new Error("Produto não encontrado");
    products[idx] = { ...products[idx], ...data, updated_at: now() };
    return products[idx];
  }

  async deleteProduct(id: string) {
    await delay();
    const idx = products.findIndex((p) => p.id === String(id));
    if (idx !== -1) products.splice(idx, 1);
    return { message: "Deleted" };
  }

  // ─── Financial — Invoices ────────────────────────────────────────────────
  async getInvoices(filters?: Record<string, any>) {
    await delay();
    let result = [...invoices];
    if (filters?.status)
      result = result.filter((i) => i.status === filters.status);
    if (filters?.company_id)
      result = result.filter(
        (i) => String(i.company_id) === String(filters.company_id),
      );
    return { data: result, total: result.length, page: 1, limit: 1000 };
  }

  async fakeSandboxCheckout(data: {
    project_id: string;
    amount: number;
    card_last_digits?: string;
    card_holder?: string;
    notes?: string;
  }) {
    await delay();

    if (!data?.project_id || data.amount == null || Number.isNaN(Number(data.amount))) {
      throw new Error("project_id e amount são obrigatórios");
    }

    const project = projects.find((p) => p.id === String(data.project_id));
    if (!project) throw new Error("Projeto não encontrado");

    const payment = {
      id: String(nextPaymentId++),
      project_id: String(data.project_id),
      amount: Number(data.amount),
      payment_method: "CARTAO_TESTE",
      status: "PAGO",
      gateway: "FAKE_SANDBOX",
      fake_transaction_id: `FAKE_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 8)
        .toUpperCase()}`,
      card_last_digits: data.card_last_digits ?? "4242",
      card_holder: data.card_holder ?? "Vinicius Guardia",
      notes: data.notes ?? "Pagamento de teste simulado — ambiente sandbox",
      paid_at: now(),
      created_at: now(),
      updated_at: now(),
    };

    payments.push(payment);

    const projectIndex = projects.findIndex((p) => p.id === project.id);
    if (projectIndex !== -1) {
      projects[projectIndex] = {
        ...projects[projectIndex],
        status: "in-progress",
        updated_at: now(),
      };
    }

    const projectTaskList = tasks.filter((task) => task.project_id === String(data.project_id));

    return {
      success: true,
      payment,
      project: projects.find((p) => p.id === String(data.project_id)) || project,
      projectId: String(data.project_id),
      paymentId: payment.id,
      checkoutId: payment.id,
      paymentStatus: payment.status,
      project_status: "in-progress",
      produtosProcessadosNaCompra: projectTaskList.length,
      tarefasCriadasAgora: 0,
      tarefasIgnoradasAgora: projectTaskList.length,
      totalTarefasProjeto: projectTaskList.length,
      produtosSemModelo: [],
      message: projectTaskList.length > 0
        ? "Pagamento aprovado. Tarefas já existentes para este projeto."
        : "Pagamento aprovado. Nenhuma tarefa foi gerada no ambiente mock.",
    };
  }

  async getPayments(filters?: Record<string, any>) {
    await delay();
    let result = [...payments];
    if (filters?.project_id) {
      result = result.filter((p) => String(p.project_id) === String(filters.project_id));
    }
    return { data: result, total: result.length, page: 1, limit: 1000 };
  }

  async getPayment(id: string | number) {
    await delay();
    const payment = payments.find((p) => String(p.id) === String(id)) || null;
    if (!payment) {
      throw new Error("Pagamento não encontrado");
    }
    const project = projects.find((p) => String(p.id) === String(payment.project_id)) || null;
    return {
      ...payment,
      project,
      project_id: payment.project_id,
    };
  }

  async getInvoice(id: string) {
    await delay();
    return invoices.find((i) => i.id === String(id)) || null;
  }

  async createInvoice(data: any) {
    await delay();
    const num = String(nextInvoiceId++).padStart(3, "0");
    const invoice: MockInvoice = {
      id: String(nextInvoiceId),
      number: `NF-${new Date().getFullYear()}-${num}`,
      project_id: data.project_id || null,
      project_name: data.project_name || null,
      company_id: data.company_id || null,
      company_name: data.company_name || null,
      amount: data.amount ?? 0,
      status: data.status || "pending",
      due_date: data.due_date || now(),
      paid_at: null,
      description: data.description || null,
      created_at: now(),
      updated_at: now(),
    };
    invoices.push(invoice);
    return invoice;
  }

  async updateInvoice(id: string, data: any) {
    await delay();
    const idx = invoices.findIndex((i) => i.id === String(id));
    if (idx === -1) throw new Error("Fatura não encontrada");
    invoices[idx] = { ...invoices[idx], ...data, updated_at: now() };
    return invoices[idx];
  }

  async getFinancialStats() {
    await delay();
    return { ...mockFinancialStats };
  }

  // ─── Financial — Withdrawals ─────────────────────────────────────────────
  async getWithdrawals(filters?: Record<string, any>) {
    await delay();
    let result = [...withdrawals];
    if (filters?.status)
      result = result.filter((w) => w.status === filters.status);
    if (filters?.nomade_id)
      result = result.filter((w) => w.nomade_id === String(filters.nomade_id));
    return { data: result, total: result.length, page: 1, limit: 1000 };
  }

  async updateWithdrawal(id: string, data: any) {
    await delay();
    const idx = withdrawals.findIndex((w) => w.id === String(id));
    if (idx === -1) throw new Error("Saque não encontrado");
    withdrawals[idx] = { ...withdrawals[idx], ...data };
    return withdrawals[idx];
  }

  async requestWithdrawal(data: any) {
    await delay();
    const withdrawal: MockWithdrawal = {
      id: String(nextWithdrawalId++),
      nomade_id: data.nomade_id || "1",
      nomade_name: data.nomade_name || "Nômade",
      amount: data.amount ?? 0,
      status: "pending",
      bank_name: data.bank_name || null,
      bank_agency: data.bank_agency || null,
      bank_account: data.bank_account || null,
      pix_key: data.pix_key || null,
      requested_at: now(),
      processed_at: null,
      notes: data.notes || null,
    };
    withdrawals.push(withdrawal);
    return withdrawal;
  }

  // ─── Specialties ────────────────────────────────────────────────────────
  async getSpecialties(filters?: Record<string, any>) {
    await delay();
    const all = JSON.parse(JSON.stringify(mockSpecialties));
    if (filters?.active_only) return all.filter((s: any) => s.is_active);
    return all;
  }

  async createSpecialty(data: any) {
    await delay();
    const specialty = {
      id: String(nextSpecialtyId++),
      name: data.name || "",
      category: data.category || "Outros",
      description: data.description || null,
      is_active: data.is_active ?? true,
      nomades_count: 0,
      created_at: now(),
      updated_at: now(),
    };
    return specialty;
  }

  async updateSpecialty(id: string, data: any) {
    await delay();
    const found = mockSpecialties.find((s) => s.id === String(id));
    if (!found) throw new Error("Especialidade não encontrada");
    return { ...found, ...data, updated_at: now() };
  }

  // ─── Terms ──────────────────────────────────────────────────────────────
  async getTerms(filters?: Record<string, any>) {
    await delay();
    let result = [...terms];
    if (filters?.type) result = result.filter((t) => t.type === filters.type);
    if (filters?.active_only) result = result.filter((t) => t.is_active);
    return { data: result, total: result.length };
  }

  async getTerm(id: string) {
    await delay();
    return terms.find((t) => t.id === String(id)) || null;
  }

  async createTerm(data: any) {
    await delay();
    const term: MockTerm = {
      id: String(nextTermId++),
      title: data.title || "",
      type: data.type || "uso",
      version: data.version || "1.0.0",
      content: data.content || "",
      is_active: data.is_active ?? false,
      required: data.required ?? true,
      published_at: data.is_active ? now() : null,
      created_at: now(),
      updated_at: now(),
    };
    terms.push(term);
    return term;
  }

  async updateTerm(id: string, data: any) {
    await delay();
    const idx = terms.findIndex((t) => t.id === String(id));
    if (idx === -1) throw new Error("Termo não encontrado");
    terms[idx] = { ...terms[idx], ...data, updated_at: now() };
    return terms[idx];
  }

  async deleteTerm(id: string) {
    await delay();
    const idx = terms.findIndex((t) => t.id === String(id));
    if (idx !== -1) terms.splice(idx, 1);
    return { message: "Deleted" };
  }

  async checkTerms(userId: string) {
    await delay();
    const activeTerms = terms.filter((t) => t.is_active && t.required);
    const accepted = termAcceptances.filter(
      (a) => a.user_id === String(userId),
    );
    const pending = activeTerms.filter(
      (t) => !accepted.some((a) => a.term_id === t.id),
    );
    return { pending_terms: pending, all_accepted: pending.length === 0 };
  }

  async acceptTerm(termId: string, userId: string) {
    await delay();
    const term = terms.find((t) => t.id === String(termId));
    if (!term) throw new Error("Termo não encontrado");
    const acceptance: MockTermAcceptance = {
      id: String(Date.now()),
      term_id: termId,
      term_title: term.title,
      term_version: term.version,
      user_id: String(userId),
      user_name: "Usuário Mock",
      user_email: "user@mock.com",
      accepted_at: now(),
      ip_address: null,
    };
    termAcceptances.push(acceptance);
    return acceptance;
  }

  async getTermAcceptances(filters?: Record<string, any>) {
    await delay();
    let result = [...termAcceptances];
    if (filters?.term_id)
      result = result.filter((a) => a.term_id === String(filters.term_id));
    if (filters?.user_id)
      result = result.filter((a) => a.user_id === String(filters.user_id));
    return { data: result, total: result.length };
  }

  // ─── Allkademy — Courses ─────────────────────────────────────────────────
  async getCourses(filters?: Record<string, any>) {
    await delay();
    let result = [...courses];
    if (filters?.search) {
      const q = String(filters.search).toLowerCase();
      result = result.filter((c) => c.title.toLowerCase().includes(q));
    }
    if (filters?.status)
      result = result.filter((c) => c.status === filters.status);
    if (filters?.category)
      result = result.filter((c) => c.category === filters.category);
    return { data: result, total: result.length, page: 1, limit: 1000 };
  }

  async getCourse(id: string) {
    await delay();
    return courses.find((c) => c.id === String(id)) || null;
  }

  async createCourse(data: any) {
    await delay();
    const course: MockCourse = {
      id: String(nextCourseId++),
      title: data.title || "",
      description: data.description || null,
      thumbnail: data.thumbnail || null,
      instructor_name: data.instructor_name || "Allka",
      category: data.category || "Outros",
      status: data.status || "draft",
      level: data.level || "beginner",
      duration_hours: data.duration_hours ?? 0,
      price: data.price ?? 0,
      is_free: data.is_free ?? false,
      enrollments_count: 0,
      rating: 0,
      modules: data.modules || [],
      created_at: now(),
      updated_at: now(),
    };
    courses.push(course);
    return course;
  }

  async updateCourse(id: string, data: any) {
    await delay();
    const idx = courses.findIndex((c) => c.id === String(id));
    if (idx === -1) throw new Error("Curso não encontrado");
    courses[idx] = { ...courses[idx], ...data, updated_at: now() };
    return courses[idx];
  }

  async deleteCourse(id: string) {
    await delay();
    const idx = courses.findIndex((c) => c.id === String(id));
    if (idx !== -1) courses.splice(idx, 1);
    return { message: "Deleted" };
  }

  async getMyEnrollments(userId?: string) {
    await delay();
    const uid = String(userId || "1");
    return enrollments.filter((e) => e.user_id === uid);
  }

  async enrollCourse(courseId: string, userId: string) {
    await delay();
    const course = courses.find((c) => c.id === String(courseId));
    if (!course) throw new Error("Curso não encontrado");
    const alreadyEnrolled = enrollments.find(
      (e) => e.course_id === String(courseId) && e.user_id === String(userId),
    );
    if (alreadyEnrolled) return alreadyEnrolled;
    const totalLessons = course.modules.reduce(
      (sum, m) => sum + m.lessons.length,
      0,
    );
    const enrollment: MockEnrollment = {
      id: String(nextEnrollmentId++),
      course_id: String(courseId),
      course_title: course.title,
      user_id: String(userId),
      progress_percent: 0,
      completed_lessons: 0,
      total_lessons: totalLessons,
      enrolled_at: now(),
      completed_at: null,
    };
    enrollments.push(enrollment);
    course.enrollments_count++;
    return enrollment;
  }

  // ─── Agencies ────────────────────────────────────────────────────────────
  async getAgencies(filters?: Record<string, any>) {
    await delay();
    // Agencies share the companies dataset filtered by segment
    let result = [...companies].filter(
      (c) => c.segment === "Agência" || c.segment === "Agency",
    );
    if (!result.length) result = companies.slice(0, 3); // fallback to first 3
    if (filters?.search) {
      const q = String(filters.search).toLowerCase();
      result = result.filter((c) => c.name.toLowerCase().includes(q));
    }
    return { data: result, total: result.length, page: 1, limit: 1000 };
  }

  // ─── Partners ────────────────────────────────────────────────────────────
  async getPartners(filters?: Record<string, any>) {
    await delay();
    let result = [...companies];
    if (filters?.search) {
      const q = String(filters.search).toLowerCase();
      result = result.filter((c) => c.name.toLowerCase().includes(q));
    }
    return { data: result.slice(0, 5), total: 5, page: 1, limit: 1000 };
  }

  // ─── Coupons (alias of campaigns filtered by type) ───────────────────────
  async getCoupons(filters?: Record<string, any>) {
    return this.getCampaigns({ ...filters, type: "coupon" });
  }
}

export const mockApiClient = new MockApiClient();
