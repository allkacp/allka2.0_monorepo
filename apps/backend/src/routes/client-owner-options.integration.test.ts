import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { AddressInfo } from "node:net";
import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import app from "../app";
import { prisma } from "../lib/prisma";
import { config } from "../config";
import { requireTestDatabaseUrl } from "../test-support/require-test-database";

let server: ReturnType<typeof app.listen>, base: string, admin: string, agencyToken: string, companyToken: string, nomadToken: string;
let agencyId: string, partnerAgencyId: string, partnerId: string, companyId: string, nomadCompanyId: string, clientId: string;
const users: string[] = [];
const prefix = `busca-${randomUUID().slice(0, 8)}`;
async function makeUser(role: string, account_type: string) {
  const id = randomUUID(); users.push(id);
  const u = await prisma.user.create({ data: { id, name: "Teste", email: `${id}@example.test`, password_hash: "not-a-login", role, account_type, status: "ativo", is_active: true } });
  return { u, token: jwt.sign({ id: u.id, email: u.email, role, account_type }, config.JWT_SECRET, { expiresIn: "1h" }) };
}
async function api(path: string, token = admin, method = "GET", body?: unknown) {
  const response = await fetch(`${base}/api/client-records${path}`, { method, headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  return { status: response.status, body: await response.json() };
}
describe("Clientes — busca de empresa e persistência do vínculo", () => {
  before(async () => {
    requireTestDatabaseUrl();
    admin = (await makeUser("admin", "admin")).token;
    const a = await makeUser("agency", "agencias"); agencyToken = a.token;
    const p = await makeUser("agency", "agencias");
    companyToken = (await makeUser("company", "empresas")).token;
    nomadToken = (await makeUser("nomad", "nomades")).token;
    agencyId = (await prisma.agency.create({ data: { owner_user_id: a.u.id, name: `${prefix} Agência normal` } })).id;
    partnerAgencyId = (await prisma.agency.create({ data: { owner_user_id: p.u.id, name: `${prefix} Agência especial` } })).id;
    partnerId = (await prisma.partnerProfile.create({ data: { agency_id: partnerAgencyId, status: "active" } })).id;
    companyId = (await prisma.company.create({ data: { name: `${prefix} Loja`, type: "empresa" } })).id;
    nomadCompanyId = (await prisma.company.create({ data: { name: `${prefix} Nômade`, type: "nomade" } })).id;
    clientId = (await prisma.client.create({ data: { name: "Cliente teste" } })).id;
    server = app.listen(0); await new Promise<void>(resolve => server.once("listening", resolve));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  after(async () => {
    await prisma.client.deleteMany({ where: { id: clientId } });
    await prisma.company.deleteMany({ where: { id: { in: [companyId, nomadCompanyId] } } });
    await prisma.partnerProfile.deleteMany({ where: { id: partnerId } });
    await prisma.agency.deleteMany({ where: { id: { in: [agencyId, partnerAgencyId] } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
    await new Promise<void>(resolve => server.close(() => resolve())); await prisma.$disconnect();
  });
  it("busca nomes reais, identifica Partner sem duplicá-la e exclui Nômade", async () => {
    const result = await api(`/owner-options?q=${encodeURIComponent(prefix)}`);
    assert.equal(result.status, 200); assert.equal(result.body.data.length, 3);
    assert.equal(result.body.data.find((x: any) => x.id === partnerAgencyId).category, "Agência Partner");
    assert.equal(result.body.data.find((x: any) => x.id === agencyId).category, "Agência");
    assert.equal(result.body.data.find((x: any) => x.id === companyId).category, "Company");
    assert.ok(!result.body.data.some((x: any) => x.id === nomadCompanyId || x.id === partnerId));
    assert.equal((await prisma.clientLink.count({ where: { client_id: clientId } })), 0);
  });
  it("refina o nome digitado e não permite busca de outras empresas fora do Admin", async () => {
    assert.equal((await api(`/owner-options?q=${encodeURIComponent(prefix + " Loja")}`)).body.data.length, 1);
    for (const token of [agencyToken, companyToken, nomadToken]) assert.equal((await api("/owner-options?q=a", token)).status, 403);
    assert.equal((await api(`/owner-options?q=${"a".repeat(101)}`)).status, 400);
  });
  it("salva empresa escolhida e devolve o mesmo nome/categoria ao reabrir", async () => {
    for (const [field, id, category] of [["agency_id", partnerAgencyId, "Agência Partner"], ["company_id", companyId, "Company"], ["agency_id", agencyId, "Agência"], ["partner_id", partnerId, "Agência Partner"]]) {
      const saved = await api(`/${clientId}/link`, admin, "PUT", { [field]: id }); assert.equal(saved.status, 200);
      const read = await api(`/${clientId}`); assert.equal(read.body.links.length, 1);
      assert.equal(read.body.links[0][field], id); assert.equal(read.body.links[0].owner.category, category);
      assert.ok(read.body.links[0].owner.name.startsWith(prefix));
    }
  });
  it("rejeita nômade, ID inexistente, vínculo múltiplo e alteração por outra conta sem apagar o anterior", async () => {
    const before = await prisma.clientLink.findMany({ where: { client_id: clientId } });
    for (const body of [{ company_id: nomadCompanyId }, { agency_id: "inexistente" }, { nomad_id: "n1" }, { company_id: companyId, agency_id: agencyId }]) {
      assert.equal((await api(`/${clientId}/link`, admin, "PUT", body)).status, 400);
      assert.deepEqual(await prisma.clientLink.findMany({ where: { client_id: clientId } }), before);
    }
    assert.equal((await api(`/${clientId}/link`, agencyToken, "PUT", { agency_id: agencyId })).status, 403);
    assert.equal((await api("/", admin, "POST", { name: "Inválido", company_id: nomadCompanyId })).status, 400);
  });
  it("remover é explícito e não altera o cadastro do cliente", async () => {
    const before = await prisma.client.findUnique({ where: { id: clientId } });
    assert.equal((await api(`/${clientId}/link`, admin, "PUT", {})).status, 200);
    assert.equal((await api(`/${clientId}`)).body.links.length, 0);
    assert.deepEqual(await prisma.client.findUnique({ where: { id: clientId } }), before);
  });
});
