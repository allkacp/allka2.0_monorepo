import type { DbClient } from "./project-scope";
import { isAdminUser, resolveProjectNewScope } from "./project-scope";

export type ContactOwner = { kind: "agency" | "company"; id: string };
export class ProjectContactError extends Error {
  status = 422;
}
export async function contactOwnerForUser(db: DbClient, user: { id: string; role: string; account_type: string }, query: { agency_id?: string; company_id?: string } = {}): Promise<ContactOwner> {
  let owner: ContactOwner | null = null;
  if (isAdminUser(user)) {
    if (!!query.agency_id === !!query.company_id) throw new ProjectContactError("Selecione uma empresa para consultar seus cadastros.");
    owner = query.agency_id ? { kind: "agency", id: query.agency_id } : { kind: "company", id: query.company_id! };
  } else {
    const scope = await resolveProjectNewScope(db, user.id, user.account_type);
    if (scope.kind === "agency") owner = { kind: "agency", id: scope.agencyId };
    if (scope.kind === "company") owner = { kind: "company", id: scope.companyId };
  }
  if (!owner) throw new ProjectContactError("Sua conta não tem uma empresa vinculada para este cadastro.");
  const record = owner.kind === "agency" ? await db.agency.findUnique({ where: { id: owner.id }, select: { id: true } }) : await db.company.findUnique({ where: { id: owner.id }, select: { id: true, type: true } });
  if (!record || ("type" in record && ["nomad", "nomade"].includes(String(record.type)))) throw new ProjectContactError("Empresa não habilitada para este cadastro.");
  return owner;
}
export function consultantWhere(owner: ContactOwner) {
  return { [owner.kind === "agency" ? "agency_id" : "company_id"]: owner.id, role: owner.kind === "agency" ? "agency_consultant" : "company_consultant", is_active: true, status: "ativo" };
}
export function clientWhere(owner: ContactOwner) {
  return { status: "active", links: { some: { [owner.kind === "agency" ? "agency_id" : "company_id"]: owner.id, status: "active" } } };
}
export async function registeredProjectContacts(db: DbClient, owner: ContactOwner, consultantId?: string | null, clientId?: string | null) {
  if (!consultantId || !clientId) throw new ProjectContactError("Cadastre e selecione um consultor responsável e um cliente vinculados à empresa.");
  const [consultant, client] = await Promise.all([
    db.user.findFirst({ where: { ...consultantWhere(owner), id: consultantId }, select: { id: true, name: true, email: true } }),
    db.client.findFirst({ where: { ...clientWhere(owner), id: clientId }, select: { id: true } }),
  ]);
  if (!consultant) throw new ProjectContactError("Selecione um consultor ativo cadastrado nesta empresa.");
  if (!client) throw new ProjectContactError("Selecione um cliente ativo vinculado a esta empresa.");
  return { consultant_user_id: consultant.id, client_record_id: client.id, consultant: consultant.name, consultant_email: consultant.email, registered_contacts_required: true };
}
