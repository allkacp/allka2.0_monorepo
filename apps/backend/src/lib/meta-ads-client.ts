// Cliente cru da Graph API da Meta (Marketing API) — troca de código OAuth,
// contas de anúncio, e Insights diário. Espelha o desenho de
// lib/roadmap-client.ts (isXConfigured() + classe de erro tipada).
import { config } from "../config";

const GRAPH_API_VERSION = "v19.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

export type MetaClientErrorCode = "NOT_CONFIGURED" | "TIMEOUT" | "NETWORK_ERROR" | "UPSTREAM_ERROR";

export class MetaClientError extends Error {
  code: MetaClientErrorCode;
  status?: number;

  constructor(code: MetaClientErrorCode, message: string, status?: number) {
    super(message);
    this.name = "MetaClientError";
    this.code = code;
    this.status = status;
  }
}

export function isMetaIntegrationConfigured(): boolean {
  return Boolean(
    config.META_APP_ID &&
      config.META_APP_SECRET &&
      config.META_REDIRECT_URI &&
      /^https?:\/\/.+/.test(config.META_REDIRECT_URI) &&
      config.META_TOKEN_ENCRYPTION_KEY &&
      Buffer.from(config.META_TOKEN_ENCRYPTION_KEY, "hex").length === 32 &&
      config.META_OAUTH_STATE_SECRET &&
      config.META_OAUTH_STATE_SECRET.trim().length >= 16,
  );
}

const META_SCOPES = ["ads_read", "instagram_basic", "pages_show_list", "pages_read_engagement"].join(",");

export function buildAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: config.META_APP_ID!,
    redirect_uri: config.META_REDIRECT_URI!,
    state,
    scope: META_SCOPES,
  });
  return `https://www.facebook.com/${GRAPH_API_VERSION}/dialog/oauth?${params.toString()}`;
}

async function graphGet<T = any>(path: string, params: Record<string, string>): Promise<T> {
  const url = `${GRAPH_BASE}${path}?${new URLSearchParams(params).toString()}`;
  let response: Response;
  try {
    response = await fetch(url);
  } catch (error) {
    throw new MetaClientError("NETWORK_ERROR", error instanceof Error ? error.message : "Falha de rede ao chamar a Meta.");
  }
  const json = await response.json().catch(() => null);
  if (!response.ok) {
    throw new MetaClientError(
      "UPSTREAM_ERROR",
      json?.error?.message ?? "Erro ao chamar a Graph API da Meta.",
      response.status,
    );
  }
  return json as T;
}

export async function exchangeCodeForToken(code: string): Promise<{ access_token: string; expires_in?: number }> {
  return graphGet("/oauth/access_token", {
    client_id: config.META_APP_ID!,
    client_secret: config.META_APP_SECRET!,
    redirect_uri: config.META_REDIRECT_URI!,
    code,
  });
}

export async function exchangeForLongLivedToken(
  shortLivedToken: string,
): Promise<{ access_token: string; expires_in: number }> {
  return graphGet("/oauth/access_token", {
    grant_type: "fb_exchange_token",
    client_id: config.META_APP_ID!,
    client_secret: config.META_APP_SECRET!,
    fb_exchange_token: shortLivedToken,
  });
}

export interface MetaAdAccount {
  id: string;
  name: string;
  account_status: number;
}

export async function getAdAccounts(accessToken: string): Promise<MetaAdAccount[]> {
  const res = await graphGet<{ data: MetaAdAccount[] }>("/me/adaccounts", {
    fields: "id,name,account_status",
    access_token: accessToken,
  });
  return res.data ?? [];
}

export interface MetaInsightRow {
  date_start: string;
  impressions?: string;
  clicks?: string;
  spend?: string;
  reach?: string;
  ctr?: string;
  cpc?: string;
}

export async function getInsights(
  accessToken: string,
  adAccountId: string,
  since: string,
  until: string,
): Promise<MetaInsightRow[]> {
  const res = await graphGet<{ data: MetaInsightRow[] }>(`/${adAccountId}/insights`, {
    fields: "impressions,clicks,spend,reach,ctr,cpc",
    time_range: JSON.stringify({ since, until }),
    time_increment: "1",
    access_token: accessToken,
  });
  return res.data ?? [];
}
