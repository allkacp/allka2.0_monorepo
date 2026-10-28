import { prisma } from "./prisma";

// ─── FIM DO PERÍODO PAGO ANTECIPADO (25/10) ─────────────────────────────────────────────────────────────────────────
// Quem contrata um período longo (bimestral, trimestral, semestral ou anual) paga tudo na contratação e as tarefas abrem mês a mês
// (ver registerFollowUpDeliveryCycles). Antes desta peça, quando o período acabava NADA acontecia: nenhum aviso, nenhum registro — o contrato só
// parava de gerar tarefas em silêncio. Agora:
//   • faltando AVISO_DIAS (30) dias: aviso "seu plano termina em X — renove" para quem contratou e para a administração;
//   • no dia em que o período termina: aviso "período encerrado — contrate de novo para continuar".
// A RENOVAÇÃO em si é uma nova contratação do mesmo produto (novo pagamento, novo período, com o desconto vigente): o sistema não cobra
// sozinho um período já pago. Tudo é idempotente (dedupe_key única): rodar o worker de novo nunca duplica aviso.

export const AVISO_DIAS = 30;
const DAY_MS = 86_400_000;

export type PeriodRenewalStage = "nenhum" | "aviso" | "encerrado";

/** Em que ponto está um período pago antecipado. Função pura. */
export function periodRenewalStage(now: Date, endsAt: Date | null | undefined, avisoDias = AVISO_DIAS): PeriodRenewalStage {
  if (!endsAt) return "nenhum";
  if (now.getTime() >= endsAt.getTime()) return "encerrado";
  if (endsAt.getTime() - now.getTime() <= avisoDias * DAY_MS) return "aviso";
  return "nenhum";
}

const fmt = (d: Date) => d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
const daysLeft = (now: Date, end: Date) => Math.max(0, Math.ceil((end.getTime() - now.getTime()) / DAY_MS));

export function renewalMessage(stage: Exclude<PeriodRenewalStage, "nenhum">, productName: string, periodLabel: string, endsAt: Date, now: Date) {
  if (stage === "aviso") {
    const n = daysLeft(now, endsAt);
    return {
      title: `Seu plano ${periodLabel} de “${productName}” termina em ${n} dia${n === 1 ? "" : "s"}`,
      message: `O período pago de “${productName}” (${periodLabel}) termina em ${fmt(endsAt)}. Para continuar recebendo as entregas, contrate de novo antes dessa data. O período já pago não é cobrado outra vez.`,
    };
  }
  return {
    title: `Plano ${periodLabel} de “${productName}” encerrado`,
    message: `O período pago de “${productName}” (${periodLabel}) terminou em ${fmt(endsAt)} e as novas entregas mensais pararam. Contrate de novo para retomar.`,
  };
}

/** Um passo do worker: cria os avisos que faltam (uma vez por contrato, por tipo e por destinatário). */
export async function runPeriodRenewalOnce(now = new Date()): Promise<{ avisos: number; encerrados: number }> {
  const out = { avisos: 0, encerrados: 0 };
  const rows = await prisma.projectProduct.findMany({
    where: { catalog2_period_months: { gt: 1 }, catalog2_period_ends_at: { not: null, lte: new Date(now.getTime() + AVISO_DIAS * DAY_MS) } },
    select: {
      id: true, project_id: true, catalog2_period: true, catalog2_period_ends_at: true, product_name_snapshot: true,
      project: { select: { created_by_user_id: true, admin_responsible_user_id: true, project_code: true } },
    },
    take: 500,
  });
  const LABEL: Record<string, string> = { bimestral: "bimestral", trimestral: "trimestral", semestral: "semestral", anual: "anual" };
  for (const pp of rows) {
    const endsAt = pp.catalog2_period_ends_at!;
    const stage = periodRenewalStage(now, endsAt);
    if (stage === "nenhum") continue;
    const periodLabel = LABEL[pp.catalog2_period ?? ""] ?? (pp.catalog2_period ?? "");
    const { title, message } = renewalMessage(stage, pp.product_name_snapshot ?? "produto", periodLabel, endsAt, now);
    const seq = /^proj_(\d+)$/.exec(pp.project?.project_code ?? "")?.[1];
    // Quem recebe: o administrador (alerta geral), quem contratou e o responsável da conta.
    const users = Array.from(new Set([pp.project?.created_by_user_id, pp.project?.admin_responsible_user_id].filter((u): u is string => !!u)));
    const recipients: (string | null)[] = [null, ...users];
    const data = recipients.map((u) => ({
      type: stage === "aviso" ? "periodo_renovacao_aviso" : "periodo_encerrado",
      title, message, severity: stage === "aviso" ? "warning" : "error", category: "alerta",
      entity_type: "project", entity_id: pp.project_id, user_id: u,
      action_url: seq ? `/admin/projetos/${seq}` : null,
      dedupe_key: `period-renewal:${stage}:${pp.id}:${u ?? "admin"}`,
    }));
    const created = await prisma.systemAlert.createMany({ data, skipDuplicates: true });
    if (created.count > 0) out[stage === "aviso" ? "avisos" : "encerrados"] += 1;
  }
  return out;
}

let running = false;
export async function runPeriodRenewalGuarded(): Promise<void> {
  if (running) return;
  running = true;
  try {
    await runPeriodRenewalOnce();
  } catch (err) {
    console.error("[period-renewal] erro no worker", err);
  } finally {
    running = false;
  }
}
