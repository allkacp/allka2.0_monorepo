// Public API utility for fetching share page data.
// No auth header — the token itself carries identity and scope.
import type { FilterState } from "./share-token";

const API_BASE = (import.meta as any).env?.VITE_API_URL ?? "/api";

export type ShareApiData = {
  _meta: {
    profile: string;
    periodType: string;
    from: string;
    to: string;
    isRealData: boolean;
  };
  revenue: {
    total: number;
    growth: number;
    creditPlan: number;
    recurring: number;
    oneTime: number;
    projected: number;
  };
  mrr: { value: number; growth: number; trendData: number[] };
  churn: {
    rate: number;
    inactiveAccounts: number;
    cancelledProjects: number;
    revenueChurn: number;
    revenueChurnRate: number;
  };
  averageTicket: {
    general: number;
    growth: number;
    perProject: number;
    trendData: number[];
  };
  ltv: {
    value: number;
    agencies: number;
    leadPremium: number;
    nomades: number;
    hist0to1k: number;
    hist1kto5k: number;
    hist5kto15k: number;
    hist15kplus: number;
  };
  activeProjects: {
    total: number;
    inProgress: number;
    delivered: number;
    pending: number;
    growth: number;
  };
  tasks: {
    total: number;
    done: number;
    inProgress: number;
    pending: number;
    completionRate: number;
  };
  accountsReceivable: {
    total: number;
    creditPlans: number;
    postPaid: number;
    others: number;
    received: number;
    growth: number;
  };
  nomads: {
    total: number;
    active: number;
    newThisMonth: number;
    growth: number;
    avgRating: number;
  };
  partnerProgram: {
    activePartners: number;
    totalReferrals: number;
    conversionRate: number;
    partnerRevenue: number;
  };
  statusOverview: {
    active: number;
    trial: number;
    suspended: number;
    cancelled: number;
    total: number;
  };
  creditPlans: { active: number; totalValue: number; avgValue: number; overdue: number };
  platformActivities: {
    logins: number;
    projectsCreated: number;
    tasksCompleted: number;
    messagesExchanged: number;
  };
};

export class ShareApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ShareApiError";
  }
}

export type ShareMeta = {
  status: "ok";
  target: { id: string; type: "widget" | "dashboard"; title: string };
  permission: "view" | "comment";
  pinRequired: boolean;
  profile: string;
  period: { type: string; from?: string; to?: string; label?: string } | null;
  allowFilterChanges: boolean;
  issuedAt: string;
  expiresAt: string | null;
};

/**
 * Metadados públicos do link (título, permissão, se pede PIN, período) —
 * NUNCA decodificados no cliente. Antes o token era um Base64 que qualquer
 * um podia ler/forjar no browser; agora é opaco e só o backend sabe o que
 * ele significa (ver routes/share.ts).
 */
export async function fetchShareMeta(token: string): Promise<ShareMeta> {
  const res = await fetch(`${API_BASE}/share/${token}/meta`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ShareApiError((body as any).status ?? "invalid", res.status);
  }
  return res.json();
}

/** PIN é conferido no servidor (hash), nunca comparado no cliente. */
export async function verifySharePin(
  token: string,
  pin: string,
): Promise<boolean> {
  const res = await fetch(`${API_BASE}/share/${token}/verify-pin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin }),
  });
  if (!res.ok) return false;
  const body = await res.json().catch(() => ({ valid: false }));
  return !!body.valid;
}

// Mesma paleta fechada do backend (ver COMMENT_COLORS em routes/share.ts) —
// nunca aceitar cor arbitrária vinda do usuário.
export const COMMENT_COLORS = ["default", "slate", "blue", "green", "amber", "red", "purple", "pink"] as const;
export type CommentColor = (typeof COMMENT_COLORS)[number];

export const COMMENT_SIZES = ["sm", "base", "lg"] as const;
export type CommentSize = (typeof COMMENT_SIZES)[number];

export type ShareCommentAttachment = {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
};

export type ShareComment = {
  id: string;
  content: string;
  // "plain": comentário legado, sem HTML — renderizado como texto puro
  // com a cor única de `color`. "html": HTML sanitizado no backend, com
  // cor/tamanho por trecho embutidos nas próprias classes.
  contentFormat: "plain" | "html";
  color: CommentColor;
  authorName: string | null;
  authorEmail: string;
  authorWhatsapp: string | null;
  createdAt: string;
  attachments: ShareCommentAttachment[];
  duplicate?: boolean;
};

export function attachmentUrl(token: string, attachmentId: string): string {
  return `${API_BASE}/share/${token}/comments/attachments/${attachmentId}`;
}

/**
 * Se a pessoa que abriu o link ESTIVER logada na própria plataforma Allka
 * no mesmo navegador, mandamos o JWT dela só pra esta chamada — o backend
 * usa isso pra identificar o autor real do comentário (nome/e-mail da
 * conta), nunca o que vier no corpo. Ausência de sessão = visitante
 * anônimo, tratado pelos campos authorName/authorEmail. Isto é uma exceção
 * deliberada: o resto da página de share nunca manda esse token.
 */
function sessionAuthHeader(): Record<string, string> {
  try {
    const token = localStorage.getItem("allka_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

export async function fetchShareComments(token: string): Promise<ShareComment[]> {
  const res = await fetch(`${API_BASE}/share/${token}/comments`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ShareApiError((body as any).error ?? `Erro ${res.status}`, res.status);
  }
  const body = await res.json();
  return body.comments as ShareComment[];
}

export async function postShareComment(
  token: string,
  data: {
    content: string;
    contentFormat?: "plain" | "html";
    authorName?: string;
    authorEmail?: string;
    authorWhatsapp?: string;
    color?: CommentColor;
    files?: File[];
  },
): Promise<ShareComment> {
  // multipart/form-data sempre — mesmo sem anexo, pra ter um único
  // contrato no backend (multer.array aceita 0 arquivos normalmente).
  const form = new FormData();
  form.set("content", data.content);
  form.set("contentFormat", data.contentFormat ?? "plain");
  if (data.authorName) form.set("authorName", data.authorName);
  if (data.authorEmail) form.set("authorEmail", data.authorEmail);
  if (data.authorWhatsapp) form.set("authorWhatsapp", data.authorWhatsapp);
  if (data.color) form.set("color", data.color);
  for (const file of data.files ?? []) form.append("attachments", file);

  const res = await fetch(`${API_BASE}/share/${token}/comments`, {
    method: "POST",
    headers: sessionAuthHeader(), // sem Content-Type: o browser gera o boundary do multipart
    body: form,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ShareApiError((body as any).error ?? `Erro ${res.status}`, res.status);
  }
  return res.json() as Promise<ShareComment>;
}

export async function fetchShareData(
  token: string,
  filters: FilterState,
): Promise<ShareApiData> {
  const res = await fetch(`${API_BASE}/share/data`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, filters }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ShareApiError(
      (body as any).error ?? `Erro ${res.status}`,
      res.status,
    );
  }

  return res.json() as Promise<ShareApiData>;
}
