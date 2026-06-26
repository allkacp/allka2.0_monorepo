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

  async getDRE(_params?: { from?: string; to?: string }) {
    await delay();
    const stored = this._ensureExpenses();
    const paidExp = stored.filter((e: any) => ["paga", "pendente", "atrasada"].includes(e.status));
    const byCategory: Record<string, { amount: number; count: number }> = {};
    for (const e of paidExp) {
      if (!byCategory[e.category]) byCategory[e.category] = { amount: 0, count: 0 };
      byCategory[e.category].amount += e.amount || 0;
      byCategory[e.category].count += 1;
    }
    const receita = invoices.filter((i: any) => i.status === "paid").reduce((s: number, i: any) => s + (i.amount || 0), 0);
    const custosDiretos = 0; // no CMV in mock (no executed withdrawals)
    const lucroBruto = receita - custosDiretos;
    const despesas = paidExp.reduce((s: number, e: any) => s + (e.amount || 0), 0);
    const lucroOperacional = lucroBruto - despesas;
    return {
      receita,
      custosDiretos,
      lucroBruto,
      margemBruta: receita > 0 ? Math.round((lucroBruto / receita) * 10000) / 100 : 0,
      despesasOperacionais: despesas,
      lucroOperacional,
      margemOperacional: receita > 0 ? Math.round((lucroOperacional / receita) * 10000) / 100 : 0,
      despesasPorCategoria: Object.entries(byCategory)
        .sort((a, b) => b[1].amount - a[1].amount)
        .map(([category, { amount, count }]) => ({ category, amount, count })),
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

  async getBillingStats(_params?: { from?: string; to?: string }) {
    await delay();
    const paid   = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + (i.amount || 0), 0);
    const pending = invoices.filter((i) => i.status === "pending").reduce((s, i) => s + (i.amount || 0), 0);
    const overdue  = invoices.filter((i) => i.status === "overdue").reduce((s, i) => s + (i.amount || 0), 0);
    const paidCount = invoices.filter((i) => i.status === "paid").length;
    return {
      totalRevenue: paid + pending + overdue,
      invoiceCount: invoices.length,
      avgTicket: paidCount > 0 ? Math.round(paid / paidCount) : 0,
      byStatus: [
        { status: "paid",      count: paidCount, amount: paid },
        { status: "pending",   count: invoices.filter(i => i.status === "pending").length, amount: pending },
        { status: "overdue",   count: invoices.filter(i => i.status === "overdue").length, amount: overdue },
        { status: "cancelled", count: invoices.filter(i => i.status === "cancelled").length, amount: 0 },
      ],
    };
  }

  // ─── Expenses (Despesas Operacionais) ──────────────────────────────────────

  private static _getDefaultExpenses(): any[] {
    return [
      { id: "exp_001", name: "AWS — EC2 + RDS",              category: "Infraestrutura",         type: "fixa",     recurrence: "mensal", status: "paga",     amount: 3200,  due_date: "2026-06-05", paid_at: "2026-06-04T14:00:00Z", payment_method: "Cartão corporativo",  department: "Tech",       competence_month: "2026-06", description: "Servidores de produção e banco de dados",          notes: "",                                    is_recurring_base: true,  created_at: "2026-06-01T00:00:00Z", updated_at: "2026-06-04T00:00:00Z" },
      { id: "exp_002", name: "Cloudflare Pro",                category: "Infraestrutura",         type: "fixa",     recurrence: "mensal", status: "paga",     amount: 210,   due_date: "2026-06-05", paid_at: "2026-06-04T14:00:00Z", payment_method: "Cartão corporativo",  department: "Tech",       competence_month: "2026-06", description: "CDN + proteção DDoS",                               notes: "",                                    is_recurring_base: true,  created_at: "2026-06-01T00:00:00Z", updated_at: "2026-06-04T00:00:00Z" },
      { id: "exp_003", name: "Vercel Pro Team",               category: "Infraestrutura",         type: "fixa",     recurrence: "mensal", status: "paga",     amount: 280,   due_date: "2026-06-01", paid_at: "2026-06-01T08:00:00Z", payment_method: "Cartão corporativo",  department: "Tech",       competence_month: "2026-06", description: "Deploy frontend + edge functions",                  notes: "",                                    is_recurring_base: true,  created_at: "2026-06-01T00:00:00Z", updated_at: "2026-06-01T00:00:00Z" },
      { id: "exp_004", name: "Domínio allka.com.vc",          category: "Infraestrutura",         type: "fixa",     recurrence: "anual",  status: "paga",     amount: 89,    due_date: "2026-01-15", paid_at: "2026-01-15T09:00:00Z", payment_method: "Cartão corporativo",  department: "Tech",       competence_month: "2026-01", description: "Renovação de domínio",                               notes: "",                                    is_recurring_base: true,  created_at: "2026-01-15T00:00:00Z", updated_at: "2026-01-15T00:00:00Z" },
      { id: "exp_005", name: "Slack Business+",               category: "Ferramentas e Sistemas", type: "fixa",     recurrence: "mensal", status: "paga",     amount: 480,   due_date: "2026-06-10", paid_at: "2026-06-10T10:00:00Z", payment_method: "Cartão corporativo",  department: "Geral",      competence_month: "2026-06", description: "Comunicação interna — 20 usuários",                 notes: "",                                    is_recurring_base: true,  created_at: "2026-06-01T00:00:00Z", updated_at: "2026-06-10T00:00:00Z" },
      { id: "exp_006", name: "Figma Organization",            category: "Ferramentas e Sistemas", type: "fixa",     recurrence: "mensal", status: "paga",     amount: 640,   due_date: "2026-06-10", paid_at: "2026-06-09T15:00:00Z", payment_method: "Cartão corporativo",  department: "Produto",    competence_month: "2026-06", description: "Design tools — time de produto",                    notes: "",                                    is_recurring_base: true,  created_at: "2026-06-01T00:00:00Z", updated_at: "2026-06-09T00:00:00Z" },
      { id: "exp_007", name: "Google Workspace Business",     category: "Ferramentas e Sistemas", type: "fixa",     recurrence: "mensal", status: "paga",     amount: 350,   due_date: "2026-06-01", paid_at: "2026-06-01T08:00:00Z", payment_method: "Cartão corporativo",  department: "Geral",      competence_month: "2026-06", description: "Gmail + Drive + Meet — 15 contas",                  notes: "",                                    is_recurring_base: true,  created_at: "2026-06-01T00:00:00Z", updated_at: "2026-06-01T00:00:00Z" },
      { id: "exp_008", name: "RD Station Marketing",          category: "Ferramentas e Sistemas", type: "fixa",     recurrence: "mensal", status: "paga",     amount: 890,   due_date: "2026-06-01", paid_at: "2026-06-01T08:00:00Z", payment_method: "Cartão corporativo",  department: "Marketing",  competence_month: "2026-06", description: "CRM e automação de marketing",                      notes: "",                                    is_recurring_base: true,  created_at: "2026-06-01T00:00:00Z", updated_at: "2026-06-01T00:00:00Z" },
      { id: "exp_009", name: "Folha de pagamento — Jun",      category: "Pessoas",                type: "fixa",     recurrence: "mensal", status: "paga",     amount: 42000, due_date: "2026-06-30", paid_at: "2026-06-28T18:00:00Z", payment_method: "Transferência",       department: "RH",         competence_month: "2026-06", description: "CLT: 3 devs + 1 designer + 1 PM",                   notes: "",                                    is_recurring_base: true,  created_at: "2026-06-01T00:00:00Z", updated_at: "2026-06-28T00:00:00Z" },
      { id: "exp_010", name: "INSS + FGTS — Junho",           category: "Impostos e Taxas",       type: "fixa",     recurrence: "mensal", status: "pendente", amount: 9800,  due_date: "2026-07-07", paid_at: null,                   payment_method: "DARF/GFIP",           department: "RH",         competence_month: "2026-06", description: "Encargos trabalhistas sobre folha",                  notes: "",                                    is_recurring_base: true,  created_at: "2026-06-01T00:00:00Z", updated_at: "2026-06-01T00:00:00Z" },
      { id: "exp_011", name: "Simples Nacional — Maio",       category: "Impostos e Taxas",       type: "fixa",     recurrence: "mensal", status: "paga",     amount: 4500,  due_date: "2026-06-20", paid_at: "2026-06-19T10:00:00Z", payment_method: "DAS",                 department: "Financeiro", competence_month: "2026-05", description: "DAS — apuração maio/2026",                           notes: "",                                    is_recurring_base: true,  created_at: "2026-05-01T00:00:00Z", updated_at: "2026-06-19T00:00:00Z" },
      { id: "exp_012", name: "Aluguel — Escritório SP",       category: "Administrativo",         type: "fixa",     recurrence: "mensal", status: "paga",     amount: 6800,  due_date: "2026-06-10", paid_at: "2026-06-08T09:00:00Z", payment_method: "Transferência",       department: "Admin",      competence_month: "2026-06", description: "Sala comercial Av. Paulista — andar 14",             notes: "",                                    is_recurring_base: true,  created_at: "2026-06-01T00:00:00Z", updated_at: "2026-06-08T00:00:00Z" },
      { id: "exp_013", name: "Internet Fibra + VPN",          category: "Administrativo",         type: "fixa",     recurrence: "mensal", status: "paga",     amount: 890,   due_date: "2026-06-15", paid_at: "2026-06-14T11:00:00Z", payment_method: "Débito automático",   department: "Tech",       competence_month: "2026-06", description: "700 Mbps + FortiGate VPN License",                   notes: "",                                    is_recurring_base: false, created_at: "2026-06-01T00:00:00Z", updated_at: "2026-06-14T00:00:00Z" },
      { id: "exp_014", name: "Assessoria Jurídica",           category: "Jurídico/Contábil",      type: "fixa",     recurrence: "mensal", status: "pendente", amount: 3500,  due_date: "2026-06-30", paid_at: null,                   payment_method: "Transferência",       department: "Jurídico",   competence_month: "2026-06", description: "Contrato mensal — Escritório Alves & Dias",          notes: "",                                    is_recurring_base: true,  created_at: "2026-06-01T00:00:00Z", updated_at: "2026-06-01T00:00:00Z" },
      { id: "exp_015", name: "Contabilidade Digital",         category: "Jurídico/Contábil",      type: "fixa",     recurrence: "mensal", status: "paga",     amount: 1200,  due_date: "2026-06-05", paid_at: "2026-06-03T09:00:00Z", payment_method: "Transferência",       department: "Financeiro", competence_month: "2026-06", description: "Guias + obrigações acessórias",                      notes: "",                                    is_recurring_base: true,  created_at: "2026-06-01T00:00:00Z", updated_at: "2026-06-03T00:00:00Z" },
      { id: "exp_016", name: "Campanha Google Ads — Mai",     category: "Marketing",              type: "variável", recurrence: "única",  status: "paga",     amount: 5200,  due_date: "2026-06-10", paid_at: "2026-06-08T14:00:00Z", payment_method: "Cartão corporativo",  department: "Marketing",  competence_month: "2026-05", description: "Aquisição de leads — produto B2B",                   notes: "",                                    is_recurring_base: false, created_at: "2026-05-01T00:00:00Z", updated_at: "2026-06-08T00:00:00Z" },
      { id: "exp_017", name: "Evento — AllkaCon 2026",        category: "Marketing",              type: "variável", recurrence: "única",  status: "pendente", amount: 12000, due_date: "2026-07-15", paid_at: null,                   payment_method: "Transferência",       department: "Marketing",  competence_month: "2026-07", description: "Venue + catering + material gráfico",                notes: "",                                    is_recurring_base: false, created_at: "2026-06-10T00:00:00Z", updated_at: "2026-06-10T00:00:00Z" },
      { id: "exp_018", name: "Consultoria UX — sprint",       category: "Operacional",            type: "variável", recurrence: "única",  status: "paga",     amount: 8500,  due_date: "2026-05-31", paid_at: "2026-05-30T10:00:00Z", payment_method: "Transferência",       department: "Produto",    competence_month: "2026-05", description: "Sprint de redesign do onboarding",                   notes: "",                                    is_recurring_base: false, created_at: "2026-05-01T00:00:00Z", updated_at: "2026-05-30T00:00:00Z" },
      { id: "exp_019", name: "Seguro Equipamentos TI",        category: "Administrativo",         type: "fixa",     recurrence: "mensal", status: "atrasada", amount: 420,   due_date: "2026-05-30", paid_at: null,                   payment_method: "Débito automático",   department: "Admin",      competence_month: "2026-05", description: "Apólice notebooks + servidores locais",              notes: "Pagamento atrasado — contatar seguradora", is_recurring_base: false, created_at: "2026-05-01T00:00:00Z", updated_at: "2026-05-01T00:00:00Z" },
      { id: "exp_020", name: "Aluguel impressora",            category: "Administrativo",         type: "fixa",     recurrence: "mensal", status: "atrasada", amount: 320,   due_date: "2026-05-30", paid_at: null,                   payment_method: "Débito automático",   department: "Admin",      competence_month: "2026-05", description: "Contrato Ricoh",                                     notes: "Pagamento em atraso desde 30/05",      is_recurring_base: false, created_at: "2026-05-01T00:00:00Z", updated_at: "2026-05-01T00:00:00Z" },
    ];
  }

  private _ensureExpenses(): any[] {
    if (!localStorage.getItem("mock_expenses")) {
      localStorage.setItem("mock_expenses", JSON.stringify(MockApiClient._getDefaultExpenses()));
    }
    return JSON.parse(localStorage.getItem("mock_expenses")!) as any[];
  }

  async getExpenses(filters?: Record<string, any>) {
    await delay();
    const stored = this._ensureExpenses();
    let result = [...stored];
    if (filters?.status)     result = result.filter(e => e.status     === filters.status);
    if (filters?.category)   result = result.filter(e => e.category   === filters.category);
    if (filters?.type)       result = result.filter(e => e.type       === filters.type);
    if (filters?.recurrence) result = result.filter(e => e.recurrence === filters.recurrence);
    if (filters?.competence) result = result.filter(e => e.competence_month === filters.competence);
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(e =>
        e.name?.toLowerCase().includes(q) ||
        e.description?.toLowerCase().includes(q) ||
        e.category?.toLowerCase().includes(q)
      );
    }
    const page  = Number(filters?.page  ?? 1);
    const limit = Number(filters?.limit ?? 20);
    const skip  = (page - 1) * limit;
    return { data: result.slice(skip, skip + limit), total: result.length, page, limit };
  }

  async getExpense(id: string) {
    await delay();
    const stored = this._ensureExpenses();
    const found = stored.find(e => String(e.id) === String(id));
    if (!found) throw new Error("Despesa não encontrada");
    return found;
  }

  async createExpense(data: any) {
    await delay();
    const stored = this._ensureExpenses();
    const expense = { id: `exp_${Date.now()}`, ...data, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    stored.push(expense);
    localStorage.setItem("mock_expenses", JSON.stringify(stored));
    return expense;
  }

  async updateExpense(id: string, data: any) {
    await delay();
    const stored = this._ensureExpenses();
    const idx = stored.findIndex(e => String(e.id) === String(id));
    if (idx >= 0) { stored[idx] = { ...stored[idx], ...data, updated_at: new Date().toISOString() }; }
    localStorage.setItem("mock_expenses", JSON.stringify(stored));
    return stored[idx];
  }

  async deleteExpense(id: string) {
    await delay();
    const stored = this._ensureExpenses();
    const filtered = stored.filter(e => String(e.id) !== String(id));
    localStorage.setItem("mock_expenses", JSON.stringify(filtered));
    return {};
  }

  async getExpenseStats(_params?: Record<string, any>) {
    await delay();
    const stored = this._ensureExpenses();
    const sum = (arr: any[], pred: (e: any) => boolean) => arr.filter(pred).reduce((s, e) => s + (e.amount || 0), 0);
    return {
      total:     sum(stored, () => true),
      count:     stored.length,
      paid:      sum(stored, e => e.status === "paga"),
      pending:   sum(stored, e => e.status === "pendente"),
      overdue:   sum(stored, e => e.status === "atrasada"),
      projected: sum(stored, e => e.status === "prevista"),
      fixed:     sum(stored, e => e.type   === "fixa"),
      variable:  sum(stored, e => e.type   === "variável"),
      byStatus:  ["prevista","pendente","paga","atrasada","cancelada"].map(s => ({ status: s, amount: sum(stored, e => e.status === s), count: stored.filter(e => e.status === s).length })),
      byType:    ["fixa","variável"].map(t => ({ type: t, amount: sum(stored, e => e.type === t), count: stored.filter(e => e.type === t).length })),
      byCategory: [...new Set(stored.map(e => e.category))].map(c => ({ category: c, amount: sum(stored, e => e.category === c), count: stored.filter(e => e.category === c).length })),
    };
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

    // Fluxo Allkoin: crédito (pagamento recebido) + débito (projeto ativado)
    const clientId = (project as any).client_id;
    if (clientId) {
      const paidAmt = Number(data.amount);
      this._addLedgerEntry("company", String(clientId), "payment", "credit", paidAmt,
        `Pagamento aprovado — ${(project as any).title || data.project_id}`,
        `pay_credit_${payment.id}`, "payment", payment.id);
      this._addLedgerEntry("company", String(clientId), "payment", "debit", paidAmt,
        `Débito projeto — ${(project as any).title || data.project_id}`,
        `pay_debit_${payment.id}`, "project", String(data.project_id));
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
    const previous = invoices[idx];
    invoices[idx] = { ...previous, ...data, updated_at: now() };

    // Crédito na carteira da empresa na transição para "paid"
    if (previous.status !== "paid" && data.status === "paid") {
      const companyId = (previous as any).company_id || (previous as any).client_id;
      if (companyId) {
        const desc = (previous as any).invoice_number
          ? `Fatura #${(previous as any).invoice_number} paga`
          : `Fatura ${id} paga`;
        this._addLedgerEntry("company", String(companyId), "payment", "credit",
          (previous as any).amount || 0, desc, `inv_credit_${id}`, "invoice", id);
      }
    }

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
    const previous = withdrawals[idx];
    withdrawals[idx] = { ...previous, ...data };

    // Débito na carteira do nômade na transição para "pagamento_efetuado"
    if ((previous.status as string) !== "pagamento_efetuado" && data.status === "pagamento_efetuado") {
      const nomadeId = previous.nomade_id;
      if (nomadeId) {
        this._addLedgerEntry("nomad", String(nomadeId), "withdrawal", "debit",
          previous.amount || 0,
          `Saque efetuado — solicitação ${id}`,
          `wd_debit_${id}`, "withdrawal", id);
      }
    }

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

  // ─── Wallets & Ledger ─────────────────────────────────────────────────────

  // Gera saldo determinístico a partir de uma string seed (sem Math.random)
  private static _seedBal(seed: string, min: number, max: number): number {
    const h = Math.abs(seed.split("").reduce((a, c) => ((a * 31 + c.charCodeAt(0)) | 0), 5381));
    return Math.round(min + (h % (max - min)));
  }

  // Constrói a lista completa de carteiras a partir das entidades mock
  private static _buildWallets(): any[] {
    const now = "2026-06-13T00:00:00Z";
    const b = MockApiClient._seedBal;
    return [
      // ── Plataforma ────────────────────────────────────────────────────────
      { id: "w_platform", owner_type: "platform", owner_id: "platform", owner_name: "Allka Plataforma", owner_email: "admin@allka.com.vc", owner_cnpj: "", balance: 287500, blocked_balance: 2000, currency: "BRL", status: "active", created_at: "2024-01-01T00:00:00Z", updated_at: now },

      // ── Agências (entidades sem coleção dedicada no mock) ─────────────────
      { id: "w_a1", owner_type: "agency", owner_id: "ag1", owner_name: "Digital Agency BR",    owner_email: "admin@digitalagency.com",      owner_cnpj: "98.765.432/0001-10", balance: 42300, blocked_balance: 500, currency: "BRL", status: "active",    created_at: "2025-02-01T00:00:00Z", updated_at: now },
      { id: "w_a2", owner_type: "agency", owner_id: "ag2", owner_name: "Agência Criativa SP",  owner_email: "financeiro@agcriativa.com.br", owner_cnpj: "22.111.333/0001-55", balance: 18700, blocked_balance: 0,   currency: "BRL", status: "active",    created_at: "2025-06-01T00:00:00Z", updated_at: now },
      { id: "w_a3", owner_type: "agency", owner_id: "ag3", owner_name: "Mídia & Tráfego Hub",  owner_email: "ops@midiatrafego.com",         owner_cnpj: "44.222.666/0001-88", balance: 0,     blocked_balance: 0,   currency: "BRL", status: "suspended", created_at: "2025-03-15T00:00:00Z", updated_at: now },

      // ── Empresas — todas do mockCompanies ─────────────────────────────────
      ...mockCompanies.map((c) => ({
        id:              `wc${c.id}`,
        owner_type:      "company",
        owner_id:        c.id,
        owner_name:      c.name,
        owner_email:     c.email  ?? "",
        owner_cnpj:      c.cnpj   ?? "",
        balance:         c.status === "inactive" ? 0 : b(c.id + c.name, 4000, 160000),
        blocked_balance: c.id === "3" ? 1200 : c.id === "5" ? 800 : 0,
        currency:        "BRL",
        status:          c.status === "inactive" ? "suspended" : "active",
        created_at:      c.created_at,
        updated_at:      now,
      })),

      // ── Nômades — todos do mockNomades ────────────────────────────────────
      ...mockNomades.map((n) => ({
        id:              `wn${n.id}`,
        owner_type:      "nomad",
        owner_id:        n.id,
        owner_name:      n.name,
        owner_email:     n.email,
        owner_cnpj:      "",
        balance:         n.status === "active" ? b(n.id + n.name, 300, 22000) : 0,
        blocked_balance: 0,
        currency:        "BRL",
        status:          n.status === "suspended" ? "suspended" : "active",
        created_at:      n.created_at,
        updated_at:      now,
      })),
    ];
  }

  private _wallets: any[] = MockApiClient._buildWallets();

  private _ledger: Record<string, any[]> = {
    "w_platform": [
      { id: "l501", wallet_id: "w_platform", type: "payment",    direction: "credit", amount: 45000, balance_before: 242500, balance_after: 287500, description: "Receita consolidada — Junho",  category: "Receita",  status: "confirmed", reference_type: null, reference_id: null, created_by: "system", created_at: "2026-06-10T23:59:00Z" },
      { id: "l502", wallet_id: "w_platform", type: "fee",        direction: "debit",  amount: 12000, balance_before: 254500, balance_after: 242500, description: "Repasse nômades — Mai",        category: "Repasse",  status: "confirmed", reference_type: null, reference_id: null, created_by: "system", created_at: "2026-06-01T10:00:00Z" },
      { id: "l503", wallet_id: "w_platform", type: "payment",    direction: "credit", amount: 38000, balance_before: 216500, balance_after: 254500, description: "Receita consolidada — Maio",   category: "Receita",  status: "confirmed", reference_type: null, reference_id: null, created_by: "system", created_at: "2026-05-31T23:59:00Z" },
    ],
    "wc1": [
      { id: "l101", wallet_id: "wc1", type: "payment",    direction: "credit", amount: 5000, balance_before: 10800, balance_after: 15800, description: "Pagamento — Projeto SEO Q2",      category: "Projeto",  status: "confirmed", reference_type: "project",   reference_id: "proj-1", created_by: "admin", created_at: "2026-06-10T14:00:00Z" },
      { id: "l102", wallet_id: "wc1", type: "fee",        direction: "debit",  amount: 200,  balance_before: 15800, balance_after: 15600, description: "Taxa de serviço mensal",           category: "Fee",      status: "confirmed", reference_type: null,        reference_id: null,     created_by: "admin", created_at: "2026-06-05T10:00:00Z" },
      { id: "l103", wallet_id: "wc1", type: "adjustment", direction: "credit", amount: 1000, balance_before: 9800,  balance_after: 10800, description: "Ajuste manual — crédito bônus",   category: "Ajuste",   status: "confirmed", reference_type: null,        reference_id: null,     created_by: "admin", created_at: "2026-05-28T09:00:00Z" },
      { id: "l104", wallet_id: "wc1", type: "invoice",    direction: "credit", amount: 3500, balance_before: 6300,  balance_after: 9800,  description: "Fatura FAT-2026-003 — liquidada",  category: "Fatura",   status: "confirmed", reference_type: "invoice",   reference_id: "inv-3",  created_by: null,    created_at: "2026-05-15T16:30:00Z" },
      { id: "l105", wallet_id: "wc1", type: "refund",     direction: "credit", amount: 800,  balance_before: 5500,  balance_after: 6300,  description: "Estorno — serviço cancelado",      category: "Estorno",  status: "confirmed", reference_type: null,        reference_id: null,     created_by: "admin", created_at: "2026-04-20T11:00:00Z" },
    ],
    "w_a1": [
      { id: "l201", wallet_id: "w_a1", type: "commission", direction: "credit", amount: 12000, balance_before: 30300, balance_after: 42300, description: "Comissão — Campanha Black Friday", category: "Comissão", status: "confirmed", reference_type: "commission", reference_id: "comm-1", created_by: null,    created_at: "2026-06-08T09:00:00Z" },
      { id: "l202", wallet_id: "w_a1", type: "withdrawal", direction: "debit",  amount: 5000,  balance_before: 35300, balance_after: 30300, description: "Saque aprovado — PIX",             category: "Saque",    status: "confirmed", reference_type: "withdrawal", reference_id: "wd-1",   created_by: "admin", created_at: "2026-06-01T14:00:00Z" },
      { id: "l203", wallet_id: "w_a1", type: "block",      direction: "debit",  amount: 500,   balance_before: 35800, balance_after: 35300, description: "Bloqueio preventivo em análise",   category: "Bloqueio", status: "confirmed", reference_type: null,         reference_id: null,     created_by: "admin", created_at: "2026-05-25T10:00:00Z" },
    ],
    "wn1": [
      { id: "l301", wallet_id: "wn1", type: "credit",     direction: "credit", amount: 1200, balance_before: 2050, balance_after: 3250,  description: "Ganhos — tarefas concluídas Mai", category: "Ganhos", status: "confirmed", reference_type: "project",    reference_id: "proj-2", created_by: null,    created_at: "2026-06-03T18:00:00Z" },
      { id: "l302", wallet_id: "wn1", type: "bonus",      direction: "credit", amount: 150,  balance_before: 1900, balance_after: 2050,  description: "Bônus nível Silver",              category: "Bônus",  status: "confirmed", reference_type: null,         reference_id: null,     created_by: null,    created_at: "2026-05-31T12:00:00Z" },
      { id: "l303", wallet_id: "wn1", type: "withdrawal", direction: "debit",  amount: 500,  balance_before: 2400, balance_after: 1900,  description: "Saque solicitado — PIX",          category: "Saque",  status: "confirmed", reference_type: "withdrawal", reference_id: "wd-2",   created_by: null,    created_at: "2026-05-20T09:30:00Z" },
    ],
    "wn2": [
      { id: "l401", wallet_id: "wn2", type: "payment",    direction: "credit", amount: 3200, balance_before: 5700, balance_after: 8900,  description: "Pagamento projeto React",          category: "Projeto", status: "confirmed", reference_type: "project",    reference_id: "proj-3", created_by: null,    created_at: "2026-06-07T10:00:00Z" },
      { id: "l402", wallet_id: "wn2", type: "withdrawal", direction: "debit",  amount: 2000, balance_before: 3900, balance_after: 1900,  description: "Saque — PIX",                      category: "Saque",  status: "confirmed", reference_type: "withdrawal", reference_id: "wd-3",   created_by: null,    created_at: "2026-05-18T11:00:00Z" },
    ],
    "wn3": [
      { id: "l601", wallet_id: "wn3", type: "payment",    direction: "credit", amount: 4500, balance_before: 3100, balance_after: 7600,  description: "Projeto API Node.js — conclusão",  category: "Projeto", status: "confirmed", reference_type: "project",    reference_id: "proj-4", created_by: null,    created_at: "2026-06-09T16:00:00Z" },
      { id: "l602", wallet_id: "wn3", type: "bonus",      direction: "credit", amount: 300,  balance_before: 2800, balance_after: 3100,  description: "Bônus Expert — avaliação 5★",      category: "Bônus",  status: "confirmed", reference_type: null,         reference_id: null,     created_by: null,    created_at: "2026-05-22T10:00:00Z" },
      { id: "l603", wallet_id: "wn3", type: "withdrawal", direction: "debit",  amount: 1000, balance_before: 3800, balance_after: 2800,  description: "Saque PIX",                        category: "Saque",  status: "confirmed", reference_type: "withdrawal", reference_id: "wd-4",   created_by: null,    created_at: "2026-05-10T09:00:00Z" },
    ],
  };

  async getWallets(filters?: Record<string, any>) {
    await delay();
    let result = [...this._wallets];
    if (filters?.owner_type && filters.owner_type !== "all") result = result.filter(w => w.owner_type === filters.owner_type);
    if (filters?.status     && filters.status     !== "all") result = result.filter(w => w.status     === filters.status);
    if (filters?.search) { const q = String(filters.search).toLowerCase(); result = result.filter(w => w.owner_name.toLowerCase().includes(q) || w.owner_email.toLowerCase().includes(q)); }
    if (filters?.min_balance !== undefined) {
      const min = parseFloat(filters.min_balance);
      if (min === 0) result = result.filter(w => w.balance === 0);
      else           result = result.filter(w => w.balance > 0);
    }
    const page = parseInt(filters?.page || "1"); const limit = parseInt(filters?.limit || "10");
    const total = result.length; const start = (page - 1) * limit;
    return { data: result.slice(start, start + limit), total, page, limit };
  }

  async getWallet(id: string) {
    await delay();
    return this._wallets.find(w => w.id === id) || null;
  }

  async getWalletStats(params?: Record<string, any>) {
    await delay();
    let wallets = [...this._wallets];
    if (params?.owner_type && params.owner_type !== "all") wallets = wallets.filter(w => w.owner_type === params.owner_type);
    const walletIds = new Set(wallets.map(w => w.id));
    const totalBalance   = wallets.reduce((s, w) => s + w.balance, 0);
    const blockedBalance = wallets.reduce((s, w) => s + w.blocked_balance, 0);
    const activeCount    = wallets.filter(w => w.status === "active").length;
    const suspendedCount = wallets.filter(w => w.status === "suspended").length;
    const zeroCount      = wallets.filter(w => w.balance === 0).length;
    const allLedger: any[] = Object.entries(this._ledger)
      .filter(([id]) => walletIds.has(id))
      .flatMap(([, entries]) => entries);
    const confirmed = allLedger.filter(e => e.status === "confirmed");
    const credits   = confirmed.filter(e => e.direction === "credit").reduce((s, e) => s + e.amount, 0);
    const debits    = confirmed.filter(e => e.direction === "debit").reduce((s, e) => s + e.amount, 0);
    const sum = (pred: (e: any) => boolean) => confirmed.filter(pred).reduce((s, e) => s + e.amount, 0);
    const cnt = (pred: (e: any) => boolean) => confirmed.filter(pred).length;
    const byType = ["company","agency","nomad","partner","platform"].map(t => ({
      owner_type: t,
      balance:    wallets.filter(w => w.owner_type === t).reduce((s, w) => s + w.balance, 0),
      count:      wallets.filter(w => w.owner_type === t).length,
    })).filter(b => b.count > 0);
    return {
      totalBalance, blockedBalance, walletCount: wallets.length,
      activeCount, suspendedCount, zeroCount,
      credits, debits,
      creditCount: cnt(e => e.direction === "credit"),
      debitCount:  cnt(e => e.direction === "debit"),
      // Type breakdowns
      bonus:             sum(e => e.type === "bonus"      && e.direction === "credit"),
      bonusCount:        cnt(e => e.type === "bonus"      && e.direction === "credit"),
      withdrawals:       sum(e => e.type === "withdrawal" && e.direction === "debit"),
      withdrawalCount:   cnt(e => e.type === "withdrawal" && e.direction === "debit"),
      additionalCredit:  sum(e => e.type === "adjustment" && e.direction === "credit"),
      additionalCreditCount: cnt(e => e.type === "adjustment" && e.direction === "credit"),
      planCredits:       sum(e => e.reference_type === "invoice" && e.direction === "credit"),
      planCreditCount:   cnt(e => e.reference_type === "invoice" && e.direction === "credit"),
      recurringCredits:  sum(e => e.reference_type === "project" && e.direction === "credit"),
      recurringCreditCount: cnt(e => e.reference_type === "project" && e.direction === "credit"),
      commissions:       sum(e => e.type === "commission" && e.direction === "credit"),
      commissionCount:   cnt(e => e.type === "commission" && e.direction === "credit"),
      byType,
    };
  }

  async getWalletGlobalLedger(params?: Record<string, any>) {
    await delay();
    let allEntries: any[] = Object.entries(this._ledger).flatMap(([walletId, entries]) =>
      entries.map(e => ({
        ...e,
        wallet: this._wallets.find(w => w.id === walletId) || { id: walletId, owner_type: "unknown", owner_name: "—" },
      }))
    );
    if (params?.direction && params.direction !== "all") allEntries = allEntries.filter(e => e.direction === params.direction);
    if (params?.type      && params.type      !== "all") allEntries = allEntries.filter(e => e.type      === params.type);
    if (params?.reference_type && params.reference_type !== "all") allEntries = allEntries.filter(e => e.reference_type === params.reference_type);
    if (params?.owner_type     && params.owner_type     !== "all") allEntries = allEntries.filter(e => e.wallet?.owner_type === params.owner_type);
    allEntries.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const page  = parseInt(params?.page  || "1");
    const limit = parseInt(params?.limit || "20");
    const total = allEntries.length;
    const start = (page - 1) * limit;
    const confirmed = allEntries.filter(e => e.status === "confirmed");
    const credits = confirmed.filter(e => e.direction === "credit").reduce((s, e) => s + e.amount, 0);
    const debits  = confirmed.filter(e => e.direction === "debit").reduce((s, e) => s + e.amount, 0);
    return { data: allEntries.slice(start, start + limit), total, page, limit, summary: { credits, debits, net: credits - debits } };
  }

  async getWalletProjections(params?: Record<string, any>) {
    await delay();
    const days = parseInt(params?.days || "30");
    const now  = new Date("2026-06-13T00:00:00Z");
    const horizon = new Date(now.getTime() + days * 86_400_000);
    // Mock pending invoices due in next N days
    const pendingInvoices = [
      { id: "inv-fut-1", amount: 4800,  due_date: new Date(now.getTime() + 5  * 86400000).toISOString(), company_name: "TechStart Ltda",    description: "Plano Pro — Julho/2026",     invoice_number: "FAT-2026-071" },
      { id: "inv-fut-2", amount: 9200,  due_date: new Date(now.getTime() + 8  * 86400000).toISOString(), company_name: "Inova Digital",      description: "Plano Business — Julho",     invoice_number: "FAT-2026-072" },
      { id: "inv-fut-3", amount: 2400,  due_date: new Date(now.getTime() + 12 * 86400000).toISOString(), company_name: "Studio Visual",      description: "Projeto recorrente — ciclo", invoice_number: "FAT-2026-073" },
      { id: "inv-fut-4", amount: 15000, due_date: new Date(now.getTime() + 18 * 86400000).toISOString(), company_name: "Grupo Expansão",     description: "Plano Enterprise — Jul",     invoice_number: "FAT-2026-074" },
      { id: "inv-fut-5", amount: 3600,  due_date: new Date(now.getTime() + 22 * 86400000).toISOString(), company_name: "Soluções Rápidas",  description: "Plano Starter — Julho",      invoice_number: "FAT-2026-075" },
    ].filter(i => new Date(i.due_date) <= horizon);
    // Mock recurring projects that will generate debits
    const recurringProjects = [
      { id: "rp-1", title: "SEO Mensal — TechStart",      client_name: "TechStart Ltda",   value: 3200, status: "in-progress" },
      { id: "rp-2", title: "Social Media — Inova",        client_name: "Inova Digital",    value: 2800, status: "in-progress" },
      { id: "rp-3", title: "Dev Backend — Grupo Expansão",client_name: "Grupo Expansão",   value: 8500, status: "in-progress" },
      { id: "rp-4", title: "UX/UI Mensal — Studio",       client_name: "Studio Visual",    value: 4200, status: "in-progress" },
    ];
    const futureCredits = pendingInvoices.reduce((s, i) => s + i.amount, 0);
    const futureDebits  = recurringProjects.reduce((s, p) => s + p.value, 0);
    return { horizon: days, horizonDate: horizon.toISOString(), futureCredits, futureDebits, pendingInvoices, recurringProjects };
  }

  async getWalletLedger(id: string, params?: Record<string, any>) {
    await delay();
    let entries = [...(this._ledger[id] || [])];
    if (params?.direction && params.direction !== "all") entries = entries.filter(e => e.direction === params.direction);
    if (params?.type      && params.type      !== "all") entries = entries.filter(e => e.type      === params.type);
    const page = parseInt(params?.page || "1"); const limit = parseInt(params?.limit || "20");
    const credits = entries.filter(e => e.direction === "credit").reduce((s, e) => s + e.amount, 0);
    const debits  = entries.filter(e => e.direction === "debit").reduce((s, e) => s + e.amount, 0);
    const total = entries.length; const start = (page - 1) * limit;
    return { data: entries.slice(start, start + limit), total, page, limit, summary: { credits, debits, net: credits - debits } };
  }

  async getWalletConciliation(params?: Record<string, any>) {
    await delay();
    const BANK_IN_TYPES  = ["payment", "pix", "boleto", "card", "plan", "recharge", "additional_credit", "invoice_payment", "invoice", "squad_payment"];
    const BANK_OUT_TYPES = ["withdrawal", "transfer", "refund", "chargeback", "bank_fee", "external_payment"];

    // Collect all ledger entries enriched with wallet info
    let allEntries: any[] = Object.entries(this._ledger).flatMap(([walletId, entries]) =>
      entries.map(e => ({
        ...e,
        bank_impact: BANK_IN_TYPES.includes(e.type) && e.direction === "credit" ? "bank_in" : "bank_out",
        wallet: { ...(this._wallets.find(w => w.id === walletId) || { id: walletId, owner_type: "unknown", owner_name: "—" }) },
      }))
    );

    // Keep only confirmed bank-impact entries
    allEntries = allEntries.filter(e =>
      e.status === "confirmed" && (
        (BANK_IN_TYPES.includes(e.type)  && e.direction === "credit") ||
        (BANK_OUT_TYPES.includes(e.type) && e.direction === "debit")
      )
    );

    // Apply filters
    if (params?.owner_type && params.owner_type !== "all")
      allEntries = allEntries.filter(e => e.wallet?.owner_type === params.owner_type);
    if (params?.wallet_id)
      allEntries = allEntries.filter(e => e.wallet_id === params.wallet_id);
    if (params?.impact && params.impact !== "all")
      allEntries = allEntries.filter(e => e.bank_impact === params.impact);
    if (params?.origin && params.origin !== "all")
      allEntries = allEntries.filter(e => e.type === params.origin);
    if (params?.search) {
      const q = String(params.search).toLowerCase();
      allEntries = allEntries.filter(e => e.description?.toLowerCase().includes(q));
    }

    allEntries.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Summary (always over all matching bank entries, before pagination)
    const bankInAll  = allEntries.filter(e => e.bank_impact === "bank_in");
    const bankOutAll = allEntries.filter(e => e.bank_impact === "bank_out");
    const wdAll      = allEntries.filter(e => e.type === "withdrawal" && e.direction === "debit");
    const bankIn     = bankInAll.reduce((s, e) => s + e.amount, 0);
    const bankOut    = bankOutAll.reduce((s, e) => s + e.amount, 0);
    const walletIds  = new Set(allEntries.map(e => e.wallet_id));

    const page  = parseInt(params?.page  || "1");
    const limit = parseInt(params?.limit || "20");
    const total = allEntries.length;
    const start = (page - 1) * limit;

    return {
      data: allEntries.slice(start, start + limit),
      total, page, limit,
      summary: {
        bankIn,
        bankOut,
        netReal:             bankIn - bankOut,
        bankInCount:         bankInAll.length,
        bankOutCount:        bankOutAll.length,
        withdrawals:         wdAll.reduce((s, e) => s + e.amount, 0),
        withdrawalCount:     wdAll.length,
        realCredits:         bankIn,
        realCreditCount:     bankInAll.length,
        walletsWithMovement: walletIds.size,
      },
    };
  }

  async createWallet(data: Record<string, any>) {
    await delay();
    const wallet = { id: `w${Date.now()}`, ...data, balance: data.balance ?? 0, blocked_balance: 0, currency: "BRL", status: "active", owner_name: data.owner_name || "Nova Carteira", owner_email: "", owner_cnpj: "", created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    this._wallets.push(wallet);
    this._ledger[wallet.id] = [];
    return wallet;
  }

  async updateWallet(id: string, data: Record<string, any>) {
    await delay();
    const idx = this._wallets.findIndex(w => w.id === id);
    if (idx === -1) throw new Error("Carteira não encontrada");
    this._wallets[idx] = { ...this._wallets[idx], ...data, updated_at: new Date().toISOString() };
    return this._wallets[idx];
  }

  // ── Helpers privados de carteira ──────────────────────────────────────────
  private _findOrCreateMockWallet(ownerType: string, ownerId: string) {
    let wallet = this._wallets.find(w => w.owner_type === ownerType && w.owner_id === ownerId);
    if (!wallet) {
      wallet = {
        id: `w-${ownerType}-${ownerId}`,
        owner_type: ownerType,
        owner_id: ownerId,
        balance: 0,
        blocked_balance: 0,
        currency: "BRL",
        status: "active",
        owner_name: "—",
        owner_email: "",
        owner_cnpj: "",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      this._wallets.push(wallet);
      this._ledger[wallet.id] = [];
    }
    return wallet;
  }

  private _addLedgerEntry(
    ownerType: string,
    ownerId: string,
    type: string,
    direction: "credit" | "debit",
    amount: number,
    description: string,
    idempotencyKey: string,
    referenceType?: string,
    referenceId?: string,
  ) {
    // Idempotência: não duplicar se já registrado
    const allEntries = Object.values(this._ledger).flat() as any[];
    if (allEntries.some((e: any) => e.idempotency_key === idempotencyKey)) return;

    const wallet = this._findOrCreateMockWallet(ownerType, ownerId);
    const balanceBefore = wallet.balance;
    const balanceAfter = direction === "credit" ? balanceBefore + amount : balanceBefore - amount;
    const entry = {
      id: `l${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      wallet_id: wallet.id,
      type,
      direction,
      amount,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      description,
      idempotency_key: idempotencyKey,
      status: "confirmed",
      reference_type: referenceType ?? null,
      reference_id: referenceId ?? null,
      created_by: "system",
      created_at: new Date().toISOString(),
    };
    (this._ledger[wallet.id] = this._ledger[wallet.id] || []).unshift(entry);
    wallet.balance = balanceAfter;
  }

  async createWalletAdjustment(id: string, data: Record<string, any>) {
    await delay();
    const wallet = this._wallets.find(w => w.id === id);
    if (!wallet) throw new Error("Carteira não encontrada");
    const balanceBefore = wallet.balance;
    const balanceAfter  = data.direction === "credit" ? balanceBefore + data.amount : balanceBefore - data.amount;
    if (data.direction === "debit" && balanceAfter < 0) throw new Error("Saldo insuficiente");
    const entry = { id: `l${Date.now()}`, wallet_id: id, type: "adjustment", direction: data.direction, amount: data.amount, balance_before: balanceBefore, balance_after: balanceAfter, description: data.description, category: data.category || "Ajuste", notes: data.notes || "", status: "confirmed", reference_type: data.reference_type || null, reference_id: data.reference_id || null, created_by: "admin", created_at: new Date().toISOString() };
    (this._ledger[id] = this._ledger[id] || []).unshift(entry);
    wallet.balance = balanceAfter;
    return entry;
  }

  // ─── Squad (mock) ─────────────────────────────────────────────────────────
  private _squad: any[] = [];
  private _squadCycles: any[] = [];

  async getSquadStats() {
    await delay();
    const total = this._squad.length;
    const active = this._squad.filter(s => s.status === "active").length;
    const totalLimit = this._squad.reduce((s, c) => s + (c.credit_limit || 0), 0);
    const wallets = this._wallets.filter(w => this._squad.some(s => s.company_id === w.owner_id));
    const totalUsed = wallets.reduce((s, w) => s + Math.abs(Math.min(0, w.balance)), 0);
    return { totalSquad: total, activeSquad: active, pausedSquad: 0, cancelledSquad: total - active, delinquentSquad: 0, totalCreditLimit: totalLimit, totalCreditUsed: totalUsed, totalCreditAvailable: totalLimit - totalUsed, totalMonthlyMinimum: this._squad.reduce((s, c) => s + (c.monthly_minimum || 0), 0), openCycles: this._squadCycles.filter(c => c.status === "open").length, openInvoices: 0, overdueInvoices: 0 };
  }

  async getSquadList(params?: Record<string, any>) {
    await delay();
    const result = this._squad.map(s => {
      const company = (this as any)._clients?.find((c: any) => c.id === s.company_id) || { id: s.company_id, name: "Empresa" };
      const wallet = this._wallets.find(w => w.owner_id === s.company_id);
      const cycle = this._squadCycles.find(c => c.squad_config_id === s.id && c.status === "open");
      const balance = wallet?.balance ?? 0;
      return { ...s, company, wallet: wallet ?? null, current_cycle: cycle ?? null, balance, credit_available: Math.max(0, s.credit_limit + balance), credit_used: Math.abs(Math.min(0, balance)) };
    });
    return { data: result, total: result.length, page: 1, limit: 50 };
  }

  async getSquad(id: string) {
    await delay();
    const s = this._squad.find(x => x.id === id);
    if (!s) throw new Error("Squad não encontrado");
    const wallet = this._wallets.find(w => w.owner_id === s.company_id);
    const cycle = this._squadCycles.find(c => c.squad_config_id === id && c.status === "open");
    const balance = wallet?.balance ?? 0;
    return { ...s, wallet: wallet ?? null, current_cycle: cycle ?? null, balance, credit_available: Math.max(0, s.credit_limit + balance), credit_used: Math.abs(Math.min(0, balance)) };
  }

  async createSquad(data: Record<string, any>) {
    await delay();
    const existing = this._squad.find(s => s.company_id === data.company_id);
    if (existing) throw new Error("Esta empresa já possui configuração Squad");
    const id = `sq-${Date.now()}`;
    const config = { id, ...data, status: data.status ?? "active", started_at: data.started_at ?? new Date().toISOString(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    this._squad.push(config);
    // Criar primeiro ciclo
    const cycleId = `sqc-${Date.now()}`;
    this._squadCycles.push({ id: cycleId, squad_config_id: id, company_id: data.company_id, started_at: new Date().toISOString(), status: "open", total_consumed: 0, minimum_adjustment: 0, total_invoiced: 0 });
    // Garantir carteira
    this._findOrCreateMockWallet("company", data.company_id);
    const wallet = this._wallets.find(w => w.owner_id === data.company_id);
    return { ...config, wallet, current_cycle: this._squadCycles[this._squadCycles.length - 1], balance: wallet?.balance ?? 0, credit_available: data.credit_limit, credit_used: 0 };
  }

  async updateSquad(id: string, data: Record<string, any>) {
    await delay();
    const idx = this._squad.findIndex(s => s.id === id);
    if (idx === -1) throw new Error("Squad não encontrado");
    this._squad[idx] = { ...this._squad[idx], ...data, updated_at: new Date().toISOString() };
    return this._squad[idx];
  }

  async deleteSquad(id: string) { await delay(); }

  async getSquadCycles(id: string) {
    await delay();
    const cycles = this._squadCycles.filter(c => c.squad_config_id === id);
    return { data: cycles, total: cycles.length, page: 1, limit: 50 };
  }

  async getSquadCurrentCycle(id: string) {
    await delay();
    const squad = this._squad.find(s => s.id === id);
    const cycle = this._squadCycles.find(c => c.squad_config_id === id && c.status === "open");
    if (!cycle || !squad) return { cycle: null, ledger_entries: [] };
    const wallet = this._wallets.find(w => w.owner_id === squad.company_id);
    const entries = wallet ? (this._ledger[wallet.id] || []).filter((e: any) => e.direction === "debit") : [];
    return { cycle, ledger_entries: entries };
  }

  async closeSquadCycle(id: string) {
    await delay();
    const squad = this._squad.find(s => s.id === id);
    if (!squad) throw new Error("Squad não encontrado");
    const cycleIdx = this._squadCycles.findIndex(c => c.squad_config_id === id && c.status === "open");
    if (cycleIdx === -1) throw new Error("Nenhum ciclo aberto");
    const cycle = this._squadCycles[cycleIdx];
    const totalConsumed = cycle.total_consumed || 0;
    const minAdj = Math.max(0, squad.monthly_minimum - totalConsumed);
    const totalInvoiced = Math.max(totalConsumed, squad.monthly_minimum);
    this._squadCycles[cycleIdx] = { ...cycle, status: "invoiced", closed_at: new Date().toISOString(), total_consumed: totalConsumed, minimum_adjustment: minAdj, total_invoiced: totalInvoiced };
    const newCycle = { id: `sqc-${Date.now()}`, squad_config_id: id, company_id: squad.company_id, started_at: new Date().toISOString(), status: "open", total_consumed: 0, minimum_adjustment: 0, total_invoiced: 0 };
    this._squadCycles.push(newCycle);
    return { closed_cycle: this._squadCycles[cycleIdx], new_cycle: newCycle, summary: { total_consumed: totalConsumed, monthly_minimum: squad.monthly_minimum, minimum_adjustment: minAdj, total_invoiced: totalInvoiced } };
  }

  async paySquadInvoice(id: string, data: Record<string, any>) {
    await delay();
    const squad = this._squad.find(s => s.id === id);
    if (!squad) throw new Error("Squad não encontrado");
    const amount = data.amount || 1000;
    this._addLedgerEntry("company", squad.company_id, "payment", "credit", amount,
      `Pagamento fatura Squad`, `squad_pay_${data.invoice_id || Date.now()}`, "invoice", data.invoice_id);
    return { invoice: { id: data.invoice_id, status: "paid", amount }, message: "Pagamento registrado com sucesso" };
  }

  async squadContract(id: string, data: Record<string, any>) {
    await delay();
    const squad = this._squad.find(s => s.id === id);
    if (!squad) throw new Error("Squad não encontrado");
    if (squad.status !== "active") throw new Error(`Contratação bloqueada: Squad está ${squad.status}`);
    const wallet = this._findOrCreateMockWallet("company", squad.company_id);
    if ((wallet.balance - data.amount) < -squad.credit_limit) throw new Error("Limite Squad insuficiente para esta contratação.");
    this._addLedgerEntry("company", squad.company_id, "payment", "debit", data.amount,
      data.description || "Contratação Squad", `squad_contract_${Date.now()}`, data.reference_type || "project", data.reference_id);
    const cycleIdx = this._squadCycles.findIndex(c => c.squad_config_id === id && c.status === "open");
    if (cycleIdx !== -1) this._squadCycles[cycleIdx].total_consumed += data.amount;
    return { success: true, balance_after: wallet.balance, credit_available: Math.max(0, squad.credit_limit + wallet.balance) };
  }

  async getSystemAlerts(filters?: Record<string, any>) {
    await delay();
    return { data: [], total: 0 };
  }

  async markSystemAlertRead(id: string) {
    await delay();
    return { success: true };
  }

  async markAllSystemAlertsRead() {
    await delay();
    return { success: true };
  }

  async getAgencyAlerts() {
    await delay();
    return { data: [], total: 0 };
  }
}

export const mockApiClient = new MockApiClient();
