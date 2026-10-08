// D-2 (reunião 07/10): depois que o cliente APROVA a proposta de um produto "sob consulta", a EQUIPE clica em "Gerar contratação":
// nasce uma cotação travada no valor aprovado (vale 7 dias), que o cliente paga no checkout normal; o projeto e as tarefas nascem
// do fluxo de sempre e as respostas do questionário viram o briefing das tarefas. (No futuro isto será automático.)
import { createHash } from "crypto";
import { prisma } from "./prisma";
import { notifyUser } from "./catalog2-commercial-flow";

export const CONTRACT_VALID_DAYS = 7;

export class ContractingError extends Error {
  constructor(message: string, public httpStatus = 422, public code = "contracting_invalid") { super(message); }
}

const safeArray = (s: string | null): Array<Record<string, unknown>> => { try { const v = s ? JSON.parse(s) : []; return Array.isArray(v) ? v : []; } catch { return []; } };

export async function generateContractFromRequest(requestId: string, adminUserId: string) {
  const r = await prisma.catalog2CommercialRequest.findUnique({ where: { id: requestId } });
  if (!r) throw new ContractingError("Solicitação não encontrada.", 404, "not_found");
  if (r.status !== "aprovado") throw new ContractingError("Só dá para gerar a contratação depois que o cliente APROVA a proposta.", 409, "not_approved");
  if (r.proposed_price == null || r.proposed_price <= 0) throw new ContractingError("A proposta aprovada não tem um valor válido.", 422, "no_price");
  if (!r.account_kind || !r.account_id || !["company", "agency"].includes(r.account_kind)) throw new ContractingError("O pedido não está ligado a uma empresa ou agência.", 422, "no_account");
  if (r.converted_project_id) throw new ContractingError("Este pedido já virou um projeto.", 409, "already_contracted");

  const existing = await prisma.catalog2Quote.findUnique({ where: { commercial_request_id: r.id } });
  if (existing?.status === "convertida") throw new ContractingError("A cotação deste pedido já foi paga e convertida.", 409, "already_contracted");

  const validUntil = new Date(Date.now() + CONTRACT_VALID_DAYS * 86400000);
  let sel: { selection?: unknown; period?: unknown } = {};
  try { sel = JSON.parse(r.selection_json) ?? {}; } catch { sel = {}; }
  const selection = (sel.selection && typeof sel.selection === "object") ? sel.selection : {};

  const quote = existing
    ? await prisma.catalog2Quote.update({ where: { id: existing.id }, data: { status: "valida", valid_until: validUntil, commercial_price: r.proposed_price, commercial_deadline_days: r.proposed_deadline_days != null ? Math.ceil(r.proposed_deadline_days) : null } })
    : await prisma.catalog2Quote.create({
        data: {
          account_kind: r.account_kind, account_id: r.account_id, user_id: r.requested_by_user_id,
          product_id: r.product_id, version_id: r.version_id,
          selection_json: JSON.stringify(selection),
          quantity: Number((selection as { quantity?: number }).quantity ?? 1) || 1,
          commercial_price: r.proposed_price,
          commercial_deadline_days: r.proposed_deadline_days != null ? Math.ceil(r.proposed_deadline_days) : null,
          config_checksum: createHash("sha256").update(`commercial-request:${r.id}`).digest("hex"),
          pricing_snapshot_json: JSON.stringify({ negotiated: true, commercial_request_id: r.id, approved_price: r.proposed_price, approved_deadline_days: r.proposed_deadline_days }),
          status: "valida", valid_until: validUntil, is_preview: false, commercial_request_id: r.id,
        },
      });

  const history = safeArray(r.history_json);
  await prisma.catalog2CommercialRequest.update({
    where: { id: r.id },
    data: { history_json: JSON.stringify([...history, { at: new Date().toISOString(), by_user_id: adminUserId, status_before: r.status, status_after: r.status, changes: [existing ? "contract_renewed" : "contract_generated"], quote_id: quote.id }]) },
  });
  await notifyUser(r.requested_by_user_id, "Sua contratação está pronta para pagar", `A equipe gerou a contratação com o valor aprovado. Ela vale por ${CONTRACT_VALID_DAYS} dias: finalize o pagamento no catálogo.`, r.id);
  return { quote_id: quote.id, valid_until: validUntil, renewed: !!existing };
}
