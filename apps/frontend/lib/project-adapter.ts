// Adapts the API response shape to the frontend mock shape used by admin/projetos and projects-management-tab.

export interface FrontendProject {
  id: string | number;
  seq?: number | null;
  hasOwner?: boolean;
  ownerType?: "agency" | "company" | "partner" | null;
  ownerName?: string | null;
  name: string;
  description: string;
  client: string;
  clientCNPJ: string;
  agency: string;
  companyType: string;
  consultant: string;
  consultantEmail: string;
  type: string;
  status: string;
  progress: number;
  budget: number;
  spent: number;
  createdDate: string;
  createdAt: string; // raw ISO timestamp for tooltip
  startDate: string;
  deadline: string;
  team: number;
  nomades: string[];
  bitrixSync: boolean;
  portfolioPermission: boolean;
  overdue: boolean;
  value: number;
  fromLead: boolean;
  tasks: number;
  isActive: boolean;
  lifecycle: string;
  billingConfig?: { billingDay: number; billingStartDate: string };
  companyId: string | number;
  teamMembers?: { name: string; role: string }[];
}

function formatDateBR(dateStr?: string | null): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return "";
  }
}

function formatDateISO(dateStr?: string | null): string {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toISOString().split("T")[0];
  } catch {
    return "";
  }
}

function parseNomades(raw?: string | null): string[] {
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
}

export function adaptApiProject(api: any): FrontendProject {
  const activeStatuses = [
    "draft",
    "negotiation",
    "awaiting-payment",
    "planning",
    "in-progress",
  ];

  const ownerType: "agency" | "company" | "partner" | null = api.agency
    ? "agency"
    : api.client?.referred_by_partner_id
      ? "partner"
      : api.client_id
        ? "company"
        : null;

  const ownerName: string | null = api.agency
    ? api.agency
    : api.client?.referred_by_partner?.user?.name ?? api.client?.name ?? null;

  return {
    id: api.id,
    seq: api._seq ?? null,
    hasOwner: api._hasOwner ?? true,
    ownerType,
    ownerName,
    name: api.title || "",
    description: api.description || "",
    client: api.client?.name || "",
    clientCNPJ: api.client?.cnpj || "",
    agency: api.agency || "",
    companyType: api.company_type || "company",
    consultant: api.consultant || "",
    consultantEmail: api.consultant_email || "",
    type: api.type || "",
    status: api.status || "draft",
    progress: api.progress ?? 0,
    budget: api.budget ?? api.value ?? 0,
    spent: api.spent ?? 0,
    createdDate: formatDateBR(api.created_at),
    createdAt: api.created_at || "",
    startDate: formatDateISO(api.start_date),
    deadline: formatDateISO(api.end_date),
    team: api.team_size ?? 0,
    nomades: parseNomades(api.nomades),
    bitrixSync: api.bitrix_sync ?? false,
    portfolioPermission: api.portfolio_permission ?? false,
    overdue: api.overdue ?? false,
    value: api.value ?? 0,
    fromLead: api.from_lead ?? false,
    tasks: api._count?.project_tasks ?? 0,
    isActive: activeStatuses.includes(api.status),
    lifecycle: api.lifecycle || "avulso",
    billingConfig:
      api.billing_day != null
        ? {
            billingDay: api.billing_day,
            billingStartDate: api.billing_start_date || "",
          }
        : undefined,
    companyId: api.client_id || "",
    teamMembers: api.teamMembers || [],
  };
}

export function adaptProjectToApi(
  project: Partial<FrontendProject>,
): Record<string, any> {
  const data: Record<string, any> = {};

  if (project.name !== undefined) data.title = project.name;
  if (project.status !== undefined) data.status = project.status;
  if (project.lifecycle !== undefined) data.lifecycle = project.lifecycle;
  if (project.type !== undefined) data.type = project.type;
  if (project.value !== undefined) data.value = project.value;
  if (project.budget !== undefined) data.budget = project.budget;
  if (project.spent !== undefined) data.spent = project.spent;
  if (project.progress !== undefined) data.progress = project.progress;
  if (project.agency !== undefined) data.agency = project.agency;
  if (project.companyType !== undefined)
    data.company_type = project.companyType;
  if (project.consultant !== undefined) data.consultant = project.consultant;
  if (project.consultantEmail !== undefined)
    data.consultant_email = project.consultantEmail;
  if (project.team !== undefined) data.team_size = project.team;
  if (project.nomades !== undefined)
    data.nomades = JSON.stringify(project.nomades);
  if (project.bitrixSync !== undefined) data.bitrix_sync = project.bitrixSync;
  if (project.portfolioPermission !== undefined)
    data.portfolio_permission = project.portfolioPermission;
  if (project.overdue !== undefined) data.overdue = project.overdue;
  if (project.fromLead !== undefined) data.from_lead = project.fromLead;
  if (project.billingConfig !== undefined) {
    data.billing_day = project.billingConfig?.billingDay;
    data.billing_start_date = project.billingConfig?.billingStartDate;
  }
  if (project.startDate)
    data.start_date = new Date(project.startDate).toISOString();
  if (project.deadline)
    data.end_date = new Date(project.deadline).toISOString();
  if (project.companyId !== undefined)
    data.client_id = String(project.companyId);

  return data;
}
