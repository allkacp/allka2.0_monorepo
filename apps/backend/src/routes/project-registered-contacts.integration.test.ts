import assert from "node:assert/strict";
import { before, after, it } from "node:test";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import type { AddressInfo } from "node:net";
import app from "../app";
import { prisma } from "../lib/prisma";
import { config } from "../config";
import { requireTestDatabaseUrl } from "../test-support/require-test-database";
let server: import("node:http").Server, base = "", token = "", foreignToken = "";
let agencyId = "", foreignAgencyId = "", consultantId = "", foreignConsultantId = "", clientId = "", foreignClientId = "", projectId = "";
const suffix = crypto.randomBytes(5).toString("hex");
const auth = (user: any) => jwt.sign({ id: user.id, role: user.role, account_type: user.account_type, email: user.email }, config.JWT_SECRET, { expiresIn: "1h" });
async function request(path: string, method = "GET", body?: any, bearer = token) {
  const response = await fetch(base + path, { method, headers: { authorization: `Bearer ${bearer}`, "content-type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}) });
  return { status: response.status, data: await response.json() as any };
}
before(async () => {
  requireTestDatabaseUrl();
  for (let index = 0; index < 2; index++) {
    const owner = await prisma.user.create({ data: { name: `Owner ${index}`, email: `owner-${index}-${suffix}@example.test`, password_hash: "unused", role: "agency_admin", account_type: "agencias" } });
    const agency = await prisma.agency.create({ data: { owner_user_id: owner.id, name: `Agency ${index} ${suffix}` } });
    await prisma.user.update({ where: { id: owner.id }, data: { agency_id: agency.id } });
    const consultant = await prisma.user.create({ data: { name: index ? "Consultor outra empresa" : "Consultor registrado", email: `consultant-${index}-${suffix}@example.test`, password_hash: "unused", role: "agency_consultant", account_type: "agencias", agency_id: agency.id } });
    const client = await prisma.client.create({ data: { name: `Cliente ${index}`, links: { create: { agency_id: agency.id } } } });
    if (!index) { token = auth(owner); agencyId = agency.id; consultantId = consultant.id; clientId = client.id; }
    else { foreignToken = auth(owner); foreignAgencyId = agency.id; foreignConsultantId = consultant.id; foreignClientId = client.id; }
  }
  server = app.listen(0); await new Promise<void>(resolve => server.once("listening", resolve)); base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(async () => { if (server) await new Promise<void>(resolve => server.close(() => resolve())); await prisma.$disconnect(); });
it("busca somente consultores ativos da própria empresa, ignorando agência forjada", async () => {
  const result = await request(`/api/projects/contact-options?kind=consultant&agency_id=${foreignAgencyId}`);
  assert.equal(result.status, 200); assert.deepEqual(result.data.data.map((item: any) => item.id), [consultantId]);
  assert.equal(result.data.owner.id, agencyId);
});
it("busca incremental de clientes não expõe vínculo de outra empresa", async () => {
  const result = await request("/api/projects/contact-options?kind=client&search=Cliente");
  assert.equal(result.status, 200); assert.deepEqual(result.data.data.map((item: any) => item.id), [clientId]);
  const none = await request("/api/projects/contact-options?kind=client&search=Inexistente");
  assert.deepEqual(none.data.data, []);
});
it("projeto com cadastros obrigatórios recusa nomes livres sem IDs", async () => {
  const result = await request("/api/projects", "POST", { title: `Sem cadastros ${suffix}`, registered_contacts_required: true, consultant: "Digitado", consultant_email: "digitado@example.test" });
  assert.equal(result.status, 422);
});
it("IDs reais são persistidos e nome/e-mail vêm do usuário, não do navegador", async () => {
  const result = await request("/api/projects", "POST", { title: `Com cadastros ${suffix}`, registered_contacts_required: true, consultant_user_id: consultantId, client_record_id: clientId, consultant: "Forjado", consultant_email: "forjado@example.test" });
  assert.equal(result.status, 201); projectId = result.data.id;
  assert.equal(result.data.consultant_user_id, consultantId); assert.equal(result.data.client_record_id, clientId);
  assert.equal(result.data.consultant, "Consultor registrado"); assert.notEqual(result.data.consultant_email, "forjado@example.test");
  const detail = await request(`/api/projects/${projectId}`); assert.equal(detail.data.client_record.id, clientId);
});
it("consultor ou cliente de outra empresa são recusados, sem criar projeto", async () => {
  const beforeCount = await prisma.project.count();
  for (const ids of [{ consultant_user_id: foreignConsultantId, client_record_id: clientId }, { consultant_user_id: consultantId, client_record_id: foreignClientId }]) {
    const result = await request("/api/projects", "POST", { title: `Vinculo invalido ${suffix}`, registered_contacts_required: true, ...ids });
    assert.equal(result.status, 422);
  }
  assert.equal(await prisma.project.count(), beforeCount);
});
it("editar não pode limpar IDs ou desligar a obrigatoriedade", async () => {
  const result = await request(`/api/projects/${projectId}`, "PUT", { consultant_user_id: null, registered_contacts_required: false });
  assert.equal(result.status, 422);
  const stored = await prisma.project.findUniqueOrThrow({ where: { id: projectId } });
  assert.equal(stored.consultant_user_id, consultantId); assert.equal(stored.registered_contacts_required, true);
});
it("consultor inativo é excluído da busca e rejeitado ao salvar", async () => {
  await prisma.user.update({ where: { id: consultantId }, data: { is_active: false, status: "inativo" } });
  const options = await request("/api/projects/contact-options?kind=consultant"); assert.deepEqual(options.data.data, []);
  const save = await request("/api/projects", "POST", { title: `Inativo ${suffix}`, registered_contacts_required: true, consultant_user_id: consultantId, client_record_id: clientId });
  assert.equal(save.status, 422);
  await prisma.user.update({ where: { id: consultantId }, data: { is_active: true, status: "ativo" } });
});
it("nome duplicado devolve motivo identificável e não cria outro projeto", async () => {
  const project = await prisma.project.findUniqueOrThrow({ where: { id: projectId } });
  const before = await prisma.project.count();
  const check = await request(`/api/projects/check-name?title=${encodeURIComponent(project.title)}`);
  assert.equal(check.data.exists, true);
  const duplicate = await request("/api/projects", "POST", { title: project.title, registered_contacts_required: true, consultant_user_id: consultantId, client_record_id: clientId });
  assert.equal(duplicate.status, 409);
  assert.equal(duplicate.data.code, "duplicate_project_name");
  assert.equal(await prisma.project.count(), before);
});
it("agência cadastra consultor no próprio vínculo, mas não promove a administrador", async () => {
  const created = await request("/api/agency/users", "POST", { name: "Novo consultor", email: `new-${suffix}@example.test`, password: "TestOnly123!", role: "agency_consultant", agency_id: foreignAgencyId });
  assert.equal(created.status, 201); assert.equal(created.data.role, "agency_consultant"); assert.equal(created.data.agency_id, agencyId);
  const rejected = await request("/api/agency/users", "POST", { name: "Não admin", email: `noadmin-${suffix}@example.test`, password: "TestOnly123!", role: "agency_admin" });
  assert.equal(rejected.status, 400);
  const foreign = await request(`/api/projects/${projectId}`, "GET", undefined, foreignToken); assert.equal(foreign.status, 403);
});
it("cliente com vínculo inativo não aparece e não pode entrar no projeto", async () => {
  await prisma.clientLink.updateMany({ where: { client_id: clientId, agency_id: agencyId }, data: { status: "inactive" } });
  const options = await request("/api/projects/contact-options?kind=client"); assert.deepEqual(options.data.data, []);
  const save = await request("/api/projects", "POST", { title: `Cliente inativo ${suffix}`, registered_contacts_required: true, consultant_user_id: consultantId, client_record_id: clientId });
  assert.equal(save.status, 422);
  await prisma.clientLink.updateMany({ where: { client_id: clientId, agency_id: agencyId }, data: { status: "active" } });
});
it("Company usa seus próprios usuários consultores e clientes sem confundir com Agency", async () => {
  const owner = await prisma.user.create({ data: { name: "Owner Company", email: `company-owner-${suffix}@example.test`, password_hash: "unused", role: "company_admin", account_type: "empresas" } });
  const company = await prisma.company.create({ data: { name: `Company ${suffix}`, owner_user_id: owner.id } });
  await prisma.user.update({ where: { id: owner.id }, data: { company_id: company.id } });
  const bearer = auth(owner);
  const consultant = await request("/api/company/users", "POST", { name: "Consultor Company", email: `company-consultant-${suffix}@example.test`, password: "TestOnly123!", role: "company_consultant", company_id: agencyId }, bearer);
  assert.equal(consultant.status, 201); assert.equal(consultant.data.company_id, company.id);
  const client = await prisma.client.create({ data: { name: "Cliente Company", links: { create: { company_id: company.id } } } });
  const created = await request("/api/projects", "POST", { title: `Projeto Company ${suffix}`, registered_contacts_required: true, consultant_user_id: consultant.data.id, client_record_id: client.id }, bearer);
  assert.equal(created.status, 201); assert.equal(created.data.company_id, company.id);
  const options = await request("/api/projects/contact-options?kind=consultant", "GET", undefined, bearer);
  assert.deepEqual(options.data.data.map((item: any) => item.id), [consultant.data.id]);
});
