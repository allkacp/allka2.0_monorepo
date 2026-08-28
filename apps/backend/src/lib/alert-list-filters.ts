import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { zonedTimeToUtc } from "./timezone";

// ── Filtros + paginação da lista de alertas (ata 2026-08, bloco 2/5) ──────
// Compartilhado por GET /api/system-alerts (feed pessoal + Notificações) e
// GET /api/system-alerts/monitoring. Tudo opera NO SERVIDOR, ANTES da
// paginação — o cliente nunca recebe milhares de linhas pra filtrar no
// navegador.

// Fuso da plataforma para interpretar datas "só dia" (YYYY-MM-DD) do
// filtro. Datas com horário completo (ISO com offset) são usadas como
// vieram. Brasil — mesma referência dos Alertas Programados.
export const PLATFORM_TIME_ZONE = "America/Sao_Paulo";

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

const dateInput = z
  .string()
  .trim()
  .refine(
    (v) => DATE_ONLY_RE.test(v) || !Number.isNaN(Date.parse(v)),
    "Data inválida — use YYYY-MM-DD ou uma data ISO completa",
  );

/**
 * "situacao" do alerta — combinação derivada dos campos reais, nunca um
 * enum físico novo:
 *   ativo      → não arquivado, não resolvido (manual/automático), não expirado
 *   resolvido  → manual_resolved_at OU automatic_resolved_at preenchido
 *   arquivado  → is_archived = true
 *   dispensado → is_read = true, não arquivado, não resolvido (o "dispensar"
 *                da Central marca como lido)
 *   expirado   → resolution_reason = "expired" (motor legado/expiração)
 */
export const ALERT_SITUACOES = ["ativo", "resolvido", "arquivado", "dispensado", "expirado"] as const;
export type AlertSituacao = (typeof ALERT_SITUACOES)[number];

/**
 * "origem" do alerta:
 *   automatico → rule_id preenchido (motor de regra/padrão)
 *   manual     → created_by_user_id preenchido (Avulso criado por pessoa)
 *   programado → schedule_id preenchido (Alerta Programado)
 */
export const ALERT_ORIGENS = ["automatico", "manual", "programado"] as const;
export type AlertOrigem = (typeof ALERT_ORIGENS)[number];

export const alertListQuerySchema = z.object({
  // Texto: título OU mensagem (case-insensitive, contains).
  q: z.string().trim().min(1).max(200).optional(),
  severity: z.enum(["info", "warning", "error"]).optional(),
  category: z.enum(["notificacao", "alerta"]).optional(),
  type: z.string().trim().min(1).max(120).optional(),
  entity_type: z.string().trim().min(1).max(60).optional(),
  entity_id: z.string().trim().min(1).max(60).optional(),
  situacao: z.enum(ALERT_SITUACOES).optional(),
  origem: z.enum(ALERT_ORIGENS).optional(),
  date_from: dateInput.optional(),
  date_to: dateInput.optional(),
  // Destinatário — só honrado no Monitoramento (a rota valida o escopo).
  recipient_user_id: z.string().trim().min(1).max(60).optional(),

  // ── Compatibilidade retroativa: limit/offset continuam aceitos ─────────
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
  // ── Paginação nova (preferida): page/page_size ────────────────────────
  page: z.coerce.number().int().min(1).optional(),
  page_size: z.coerce.number().int().min(1).max(200).optional(),

  // Compat: alguns clientes antigos mandam is_read / is_archived / resolved
  // soltos. Continuam funcionando junto de `situacao` (AND).
  is_read: z
    .string()
    .optional()
    .transform((v) => (v === "true" ? true : v === "false" ? false : undefined)),
  is_archived: z.enum(["true", "false", "all"]).optional(),
  resolved: z.enum(["true", "false"]).optional(),
});

export type AlertListQuery = z.infer<typeof alertListQuerySchema>;

function dayBoundaryUtc(value: string, edge: "start" | "end"): Date {
  if (DATE_ONLY_RE.test(value)) {
    const [y, m, d] = value.split("-").map(Number);
    return edge === "start"
      ? zonedTimeToUtc(y, m, d, 0, 0, PLATFORM_TIME_ZONE)
      : new Date(zonedTimeToUtc(y, m, d, 23, 59, PLATFORM_TIME_ZONE).getTime() + 59_999);
  }
  return new Date(value);
}

export interface ResolvedPagination {
  skip: number;
  take: number;
  page: number;
  pageSize: number;
}

export function resolvePagination(q: AlertListQuery): ResolvedPagination {
  // page/page_size tem prioridade; senão limit/offset; senão default 50.
  if (q.page !== undefined || q.page_size !== undefined) {
    const pageSize = q.page_size ?? 50;
    const page = q.page ?? 1;
    return { skip: (page - 1) * pageSize, take: pageSize, page, pageSize };
  }
  const take = q.limit ?? 50;
  const skip = q.offset ?? 0;
  return { skip, take, page: Math.floor(skip / take) + 1, pageSize: take };
}

/**
 * Constrói o `where` de FILTROS (sem escopo — o escopo é aplicado com AND
 * pela rota). Datas "só dia" viram os limites do dia no fuso da plataforma.
 */
export function buildAlertFilterWhere(q: AlertListQuery): Prisma.SystemAlertWhereInput {
  const and: Prisma.SystemAlertWhereInput[] = [];

  if (q.q) {
    and.push({
      OR: [
        { title: { contains: q.q } },
        { message: { contains: q.q } },
      ],
    });
  }
  if (q.severity) and.push({ severity: q.severity });
  if (q.category) and.push({ category: q.category });
  if (q.type) and.push({ type: q.type });
  if (q.entity_type) and.push({ entity_type: q.entity_type });
  if (q.entity_id) and.push({ entity_id: q.entity_id });
  if (q.recipient_user_id) and.push({ user_id: q.recipient_user_id });

  if (q.date_from || q.date_to) {
    const createdAt: Prisma.DateTimeFilter = {};
    if (q.date_from) createdAt.gte = dayBoundaryUtc(q.date_from, "start");
    if (q.date_to) createdAt.lte = dayBoundaryUtc(q.date_to, "end");
    and.push({ created_at: createdAt });
  }

  // origem
  if (q.origem === "automatico") and.push({ rule_id: { not: null } });
  else if (q.origem === "manual") and.push({ created_by_user_id: { not: null } });
  else if (q.origem === "programado") and.push({ schedule_id: { not: null } });

  // situacao (derivada)
  if (q.situacao === "ativo") {
    and.push({ is_archived: false, manual_resolved_at: null, automatic_resolved_at: null, resolved_at: null });
  } else if (q.situacao === "resolvido") {
    and.push({ OR: [{ manual_resolved_at: { not: null } }, { automatic_resolved_at: { not: null } }] });
  } else if (q.situacao === "arquivado") {
    and.push({ is_archived: true });
  } else if (q.situacao === "dispensado") {
    and.push({ is_read: true, is_archived: false, manual_resolved_at: null, automatic_resolved_at: null });
  } else if (q.situacao === "expirado") {
    and.push({ resolution_reason: "expired" });
  }

  // compat solto (aplicado junto de `situacao`)
  if (q.is_read !== undefined) and.push({ is_read: q.is_read });
  if (q.is_archived === "true") and.push({ is_archived: true });
  else if (q.is_archived === "false") and.push({ is_archived: false });
  if (q.resolved === "true") {
    and.push({ OR: [{ manual_resolved_at: { not: null } }, { automatic_resolved_at: { not: null } }] });
  } else if (q.resolved === "false") {
    and.push({ manual_resolved_at: null, automatic_resolved_at: null });
  }

  return and.length ? { AND: and } : {};
}
