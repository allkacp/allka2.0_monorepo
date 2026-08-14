import { config } from "../config";
import { signRequest } from "./roadmap-hmac";
import { CONTRACT_API_PREFIX } from "./roadmap-integration-contract";

/**
 * Outgoing signed HTTP client for calling the Roadmap's integration API
 * server-to-server. Never called from a browser request handler directly —
 * only from routes/product-feedback.ts, which derives identity from the
 * authenticated Allka session first (see lib/product-feedback-access-decision.ts).
 */

// Redundant with config.ts's own startup-time refinement (which already
// refuses to boot with PRODUCT_FEEDBACK_ENABLED=true and an incomplete or
// invalid config) — kept here too, on purpose, so this specific function
// stays correct on its own even if config.ts's validation is ever
// refactored or weakened without someone noticing the coupling.
export function isRoadmapTechnicallyConfigured(): boolean {
  return Boolean(
    config.PRODUCT_FEEDBACK_ENABLED &&
      config.PRODUCT_FEEDBACK_ENVIRONMENT &&
      config.ROADMAP_API_URL &&
      /^https?:\/\/.+/.test(config.ROADMAP_API_URL) &&
      config.ROADMAP_HMAC_KEY_ID &&
      config.ROADMAP_HMAC_KEY_ID.trim().length > 0 &&
      config.ROADMAP_HMAC_SECRET &&
      Buffer.byteLength(config.ROADMAP_HMAC_SECRET, "utf8") >= 32,
  );
}

export type RoadmapClientErrorCode =
  | "NOT_CONFIGURED"
  | "TIMEOUT"
  | "NETWORK_ERROR"
  | "UPSTREAM_ERROR";

export class RoadmapClientError extends Error {
  code: RoadmapClientErrorCode;
  status?: number;
  upstreamCode?: string;

  constructor(
    code: RoadmapClientErrorCode,
    message: string,
    extra?: { status?: number; upstreamCode?: string },
  ) {
    super(message);
    this.name = "RoadmapClientError";
    this.code = code;
    this.status = extra?.status;
    this.upstreamCode = extra?.upstreamCode;
  }
}

async function signedFetch(input: {
  method: "GET" | "POST";
  pathname: string;
  query?: Record<string, string>;
  body?: unknown;
  // Overrides the default (base) signing credentials — used only by
  // startRoadmapSso() below, which signs with the purpose-separated SSO
  // pair instead of the one used for ticket creation/lookup.
  credentials?: { keyId: string; secret: string };
}): Promise<{ status: number; json: any }> {
  if (!isRoadmapTechnicallyConfigured()) {
    throw new RoadmapClientError("NOT_CONFIGURED", "Integração com a Roadmap não configurada.");
  }

  const baseUrl = config.ROADMAP_API_URL!.replace(/\/$/, "");
  const rawQuery = input.query ? new URLSearchParams(input.query).toString() : "";
  const bodyString = input.body !== undefined ? JSON.stringify(input.body) : undefined;

  const { headers } = signRequest({
    method: input.method,
    pathname: input.pathname,
    rawQuery,
    body: bodyString,
    keyId: input.credentials?.keyId ?? config.ROADMAP_HMAC_KEY_ID!,
    secret: input.credentials?.secret ?? config.ROADMAP_HMAC_SECRET!,
  });

  const url = `${baseUrl}${input.pathname}${rawQuery ? `?${rawQuery}` : ""}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.ROADMAP_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: input.method,
      headers: {
        ...headers,
        ...(bodyString !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: bodyString,
      signal: controller.signal,
    });
    const json = await response.json().catch(() => null);
    return { status: response.status, json };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new RoadmapClientError("TIMEOUT", "Tempo esgotado ao chamar a Roadmap.");
    }
    throw new RoadmapClientError(
      "NETWORK_ERROR",
      error instanceof Error ? error.message : "Falha de rede ao chamar a Roadmap.",
    );
  } finally {
    clearTimeout(timeout);
  }
}

export type RoadmapIdentity = {
  externalUserId: string;
  displayName?: string;
  userCode?: string;
  externalWorkspaceContext?: {
    companyId?: string;
    agencyId?: string;
    portal?: string;
  };
};

export type RoadmapCreateWorkItemInput = {
  idempotencyKey: string;
  correlationId: string;
  type: "PROBLEM" | "IDEA" | "IMPROVEMENT";
  title: string;
  description: string;
  identity: RoadmapIdentity;
  page: {
    pathname: string;
    pageTitle?: string;
    environment: "production" | "qa" | "local";
    frontendVersion?: string;
  };
  steps?: string;
  expectedResult?: string;
  actualResult?: string;
  impact?: string;
};

export async function createRoadmapWorkItem(
  input: RoadmapCreateWorkItemInput,
): Promise<{ protocol: string }> {
  const { status, json } = await signedFetch({
    method: "POST",
    pathname: `${CONTRACT_API_PREFIX}/allka/work-items`,
    body: input,
  });
  if (status === 200 || status === 201) {
    return { protocol: json.protocol };
  }
  throw new RoadmapClientError("UPSTREAM_ERROR", json?.message ?? "Erro ao criar chamado na Roadmap.", {
    status,
    upstreamCode: json?.code,
  });
}

function identityToQuery(identity: RoadmapIdentity): Record<string, string> {
  const query: Record<string, string> = { externalUserId: identity.externalUserId };
  if (identity.displayName) query.displayName = identity.displayName;
  if (identity.userCode) query.userCode = identity.userCode;
  if (identity.externalWorkspaceContext?.companyId) query.companyId = identity.externalWorkspaceContext.companyId;
  if (identity.externalWorkspaceContext?.agencyId) query.agencyId = identity.externalWorkspaceContext.agencyId;
  if (identity.externalWorkspaceContext?.portal) query.portal = identity.externalWorkspaceContext.portal;
  return query;
}

export type RoadmapPublicWorkItem = {
  protocol: string;
  type: "PROBLEM" | "IDEA" | "IMPROVEMENT";
  title: string;
  status: "RECEIVED" | "IN_PROGRESS" | "IN_VALIDATION" | "RESOLVED" | "REOPENED" | "CANCELLED";
  updatedAt: string;
  solutionSummary: string | null;
  release: { version: string; name: string } | null;
  validated: boolean;
  publicComments: Array<{ author: string; content: string; createdAt: string }>;
};

export async function listRoadmapWorkItems(
  identity: RoadmapIdentity,
  options?: { updatedSince?: string; cursor?: string; limit?: number },
): Promise<{ items: RoadmapPublicWorkItem[]; nextCursor: string | null }> {
  const query = identityToQuery(identity);
  if (options?.updatedSince) query.updatedSince = options.updatedSince;
  if (options?.cursor) query.cursor = options.cursor;
  if (options?.limit) query.limit = String(options.limit);

  const { status, json } = await signedFetch({
    method: "GET",
    pathname: `${CONTRACT_API_PREFIX}/allka/work-items`,
    query,
  });
  if (status === 200) {
    return { items: json.items ?? [], nextCursor: json.nextCursor ?? null };
  }
  // UNKNOWN_EXTERNAL_USER on the list endpoint just means "no tickets yet" —
  // a legitimate empty state, not something to surface as an error.
  if (status === 404 && json?.code === "UNKNOWN_EXTERNAL_USER") {
    return { items: [], nextCursor: null };
  }
  throw new RoadmapClientError("UPSTREAM_ERROR", json?.message ?? "Erro ao listar chamados na Roadmap.", {
    status,
    upstreamCode: json?.code,
  });
}

// One-click SSO handoff for Allka staff who already have a matching Roadmap
// account (OWNER/ADMIN/DEVELOPER/QA_REVIEWER). Never creates or promotes a
// Roadmap account — the Roadmap side looks the email up and refuses if it
// doesn't already exist with an eligible role. See
// docs/integration-contract-v1.md "SSO handoff" section.
export async function startRoadmapSso(email: string): Promise<{ ssoToken: string }> {
  const { status, json } = await signedFetch({
    method: "POST",
    pathname: `${CONTRACT_API_PREFIX}/allka/sso/tickets`,
    body: { email },
    // Purpose-separated from ticket creation/lookup — falls back to the
    // base ROADMAP_HMAC_* pair whenever the dedicated SSO secret isn't
    // configured yet (see config.ts).
    credentials: {
      keyId: config.ROADMAP_SSO_HMAC_KEY_ID || config.ROADMAP_HMAC_KEY_ID!,
      secret: config.ROADMAP_SSO_HMAC_SECRET || config.ROADMAP_HMAC_SECRET!,
    },
  });
  if (status === 200 && json?.ok) {
    return { ssoToken: json.ssoToken };
  }
  throw new RoadmapClientError(
    "UPSTREAM_ERROR",
    json?.message ?? "Não foi possível iniciar o acesso único à Roadmap.",
    { status, upstreamCode: json?.code },
  );
}

export async function getRoadmapWorkItem(
  protocol: string,
  identity: RoadmapIdentity,
): Promise<RoadmapPublicWorkItem | null> {
  const { status, json } = await signedFetch({
    method: "GET",
    pathname: `${CONTRACT_API_PREFIX}/allka/work-items/${encodeURIComponent(protocol)}`,
    query: identityToQuery(identity),
  });
  if (status === 200) {
    return json.item;
  }
  if (status === 404) {
    return null;
  }
  throw new RoadmapClientError("UPSTREAM_ERROR", json?.message ?? "Erro ao buscar chamado na Roadmap.", {
    status,
    upstreamCode: json?.code,
  });
}
