// Único lugar que puxa Insights da Meta e grava histórico — chamado tanto
// pela rota manual ("Sincronizar agora") quanto pelo cron diário, nunca
// duplicado entre os dois.
import { prisma } from "./prisma";
import { getInsights, MetaClientError } from "./meta-ads-client";
import { decryptToken } from "./token-encryption";

function toNumber(v?: string): number | null {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function syncConnectionMetrics(
  connectionId: string,
  opts: { daysBack?: number } = {},
): Promise<{ synced: number }> {
  const daysBack = opts.daysBack ?? 30;
  const connection = await prisma.projectConnection.findUnique({ where: { id: connectionId } });
  if (!connection) throw new Error("Conexão não encontrada.");
  if (connection.provider !== "meta_ads") {
    throw new Error("Sincronização ainda só implementada para Meta Ads.");
  }

  const until = new Date();
  const since = new Date(until);
  since.setDate(since.getDate() - daysBack);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  try {
    const token = decryptToken(connection.access_token_encrypted);
    const rows = await getInsights(token, connection.external_account_id, fmt(since), fmt(until));

    for (const row of rows) {
      const date = new Date(row.date_start);
      const data = {
        impressions: toNumber(row.impressions),
        clicks: toNumber(row.clicks),
        spend: toNumber(row.spend),
        reach: toNumber(row.reach),
        ctr: toNumber(row.ctr),
        cpc: toNumber(row.cpc),
        raw: row as any,
      };
      await prisma.projectConnectionMetricDaily.upsert({
        where: { connection_id_date: { connection_id: connectionId, date } },
        create: { connection_id: connectionId, date, ...data },
        update: data,
      });
    }

    await prisma.projectConnection.update({
      where: { id: connectionId },
      data: { status: "connected", last_synced_at: new Date(), last_error: null },
    });
    return { synced: rows.length };
  } catch (err) {
    const tokenExpired = err instanceof MetaClientError && err.status === 401;
    await prisma.projectConnection.update({
      where: { id: connectionId },
      data: {
        status: tokenExpired ? "expired" : "error",
        last_error: err instanceof Error ? err.message : "Erro desconhecido ao sincronizar.",
      },
    });
    throw err;
  }
}

/** Roda uma vez por dia (ver index.ts) — janela curta de 3 dias pra
 * absorver correção tardia de atribuição do Meta, upsert idempotente por
 * [connection_id, date] então reprocessar não duplica nada. */
export async function runDailySyncForAllConnections(): Promise<void> {
  const connections = await prisma.projectConnection.findMany({
    where: { provider: "meta_ads", status: "connected" },
    select: { id: true },
  });
  for (const c of connections) {
    try {
      await syncConnectionMetrics(c.id, { daysBack: 3 });
    } catch (err) {
      console.error(`Falha ao sincronizar conexão ${c.id}:`, err instanceof Error ? err.message : err);
    }
  }
}
