import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import jwt from "jsonwebtoken";
import app from "../app";
import { prisma } from "../lib/prisma";
import { config } from "../config";
import { requireTestDatabaseUrl } from "../test-support/require-test-database";
import { getProductDetail, validateVersionForPublish } from "../lib/catalog2-service";
import { specificAssigneeImpact, unavailableSpecificAssignments } from "../lib/specific-assignee-impact";
import { abrirEtapa } from "../lib/stage-engine";

const uid = () => `assignee-${randomUUID()}`;
const users: string[] = [], products: string[] = [], projects: string[] = [];
let server: ReturnType<typeof app.listen>, base: string, adminToken: string;
async function user(role = "lider") {
  const id = uid();
  const u = await prisma.user.create({ data: { id, email: `${id}@example.test`, name: `Teste ${role}`, password_hash: "not-a-login-password", role, account_type: role === "admin" ? "admin" : "lider", status: "ativo", is_active: true } });
  users.push(id); return u;
}
async function fixture(mode: "specific" | "auto" = "specific", personRole = "lider") {
  const person = await user(personRole);
  const p = await prisma.catalog2Product.create({ data: { slug: uid(), internal_name: "Matriz preservada" } }); products.push(p.id);
  const v = await prisma.catalog2ProductVersion.create({ data: { product_id: p.id, version_number: 1, title: "Produto nominal", state: "publicada" } });
  await prisma.catalog2Product.update({ where: { id: p.id }, data: { published_version_id: v.id } });
  const t = await prisma.catalog2Task.create({ data: { version_id: v.id, key: "main", name: "Tarefa matriz", requires_qualification: true, qualifier_user_id: mode === "specific" ? person.id : null } });
  const s = await prisma.catalog2TaskStep.create({ data: { task_id: t.id, key: "step", name: "Etapa matriz", executor_kind: "leader", leader_mode: mode, leader_user_id: person.id } });
  return { person, p, v, t, s };
}
async function request(id: string, method: string, body?: unknown, token = adminToken) {
  const response = await fetch(`${base}/api/users/${id}`, { method, headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, ...(body ? { body: JSON.stringify(body) } : {}) });
  return { status: response.status, body: await response.json().catch(() => null) };
}
describe("Responsável específico — aviso, confirmação e matriz preservada", () => {
  before(async () => {
    requireTestDatabaseUrl();
    const admin = await user("admin");
    adminToken = jwt.sign({ id: admin.id, email: admin.email, role: admin.role, account_type: admin.account_type }, config.JWT_SECRET, { expiresIn: "1h" });
    server = app.listen(0); await new Promise<void>(resolve => server.once("listening", resolve));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  after(async () => {
    await prisma.project.deleteMany({ where: { id: { in: projects } } });
    await prisma.catalog2Product.updateMany({ where: { id: { in: products } }, data: { published_version_id: null } });
    await prisma.catalog2ProductVersion.deleteMany({ where: { product_id: { in: products } } });
    await prisma.catalog2Product.deleteMany({ where: { id: { in: products } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
    await new Promise<void>((resolve, reject) => server.close(e => e ? reject(e) : resolve())); await prisma.$disconnect();
  });
  it("inativar exige confirmação; cancelar não altera nada; confirmar sinaliza e reativar resolve", async () => {
    const f = await fixture();
    const beforeStep = await prisma.catalog2TaskStep.findUniqueOrThrow({ where: { id: f.s.id } });
    const first = await request(f.person.id, "PUT", { status: "inativo" });
    assert.equal(first.status, 409); assert.equal(first.body.code, "specific_assignee_confirmation_required");
    assert.equal(first.body.impact.matrices.length, 2);
    assert.equal(first.body.impact.matrices[0].product_name, "Matriz preservada");
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: f.person.id } })).is_active, true);
    const confirmed = await request(f.person.id, "PUT", { status: "inativo", assignment_confirmation: first.body.impact.token });
    assert.equal(confirmed.status, 200);
    assert.deepEqual(await prisma.catalog2TaskStep.findUniqueOrThrow({ where: { id: f.s.id } }), beforeStep);
    const detail = await getProductDetail(f.p.id); assert.equal(detail.assignment_issues.length, 2);
    assert.ok((await validateVersionForPublish(f.v.id)).issues.some(i => /Líder específico indisponível/.test(i)));
    assert.equal((await request(f.person.id, "PUT", { status: "ativo" })).status, 200);
    assert.equal((await getProductDetail(f.p.id)).assignment_issues.length, 0);
  });
  it("excluir requer aceite do impacto e mantém referência nominal como pendência, sem rodízio", async () => {
    const f = await fixture();
    const first = await request(f.person.id, "DELETE", { reason: "Teste de exclusão nominal" }); assert.equal(first.status, 409);
    assert.equal((await request(f.person.id, "DELETE", { assignment_confirmation: "0".repeat(64) })).status, 409);
    assert.equal((await request(f.person.id, "DELETE", { assignment_confirmation: first.body.impact.token })).status, 204);
    const step = await prisma.catalog2TaskStep.findUniqueOrThrow({ where: { id: f.s.id } });
    assert.equal(step.leader_mode, "specific"); assert.equal(step.leader_user_id, f.person.id);
    assert.equal((await getProductDetail(f.p.id)).assignment_issues.length, 2);
  });
  it("qualquer líder/rodízio ignora ID residual de um modo antigo", async () => {
    const f = await fixture("auto");
    assert.equal((await specificAssigneeImpact(prisma, f.person.id, "delete")).has_impact, false);
    assert.equal((await request(f.person.id, "DELETE")).status, 204);
    assert.equal((await getProductDetail(f.p.id)).assignment_issues.length, 0);
  });
  it("qualificador específico pode ser nômade; pool de nômades não é indicação nominal", async () => {
    const f = await fixture("auto", "nomad");
    await prisma.catalog2TaskStep.update({ where: { id: f.s.id }, data: { executor_kind: "nomad", requires_specialist_qualification: true, specialist_user_id: f.person.id, qualifier_kind: "person" } });
    const impact = await specificAssigneeImpact(prisma, f.person.id, "deactivate"); assert.equal(impact.matrices.length, 1); assert.equal(impact.matrices[0].label, "Especialista específico");
    assert.equal((await request(f.person.id, "PUT", { is_active: false, assignment_confirmation: impact.token })).status, 200);
    assert.equal((await getProductDetail(f.p.id)).assignment_issues.length, 1);
    await prisma.catalog2TaskStep.update({ where: { id: f.s.id }, data: { qualifier_kind: "nomad_pool" } });
    assert.equal((await getProductDetail(f.p.id)).assignment_issues.length, 0);
    assert.equal((await specificAssigneeImpact(prisma, f.person.id, "delete")).has_impact, false);
  });
  it("um vínculo novo invalida a confirmação anterior", async () => {
    const f = await fixture(); const impact = await specificAssigneeImpact(prisma, f.person.id, "delete");
    await prisma.catalog2TaskStep.create({ data: { task_id: f.t.id, key: "new", name: "Outra etapa", executor_kind: "leader", leader_mode: "specific", leader_user_id: f.person.id } });
    const stale = await request(f.person.id, "DELETE", { assignment_confirmation: impact.token });
    assert.equal(stale.status, 409); assert.notEqual(stale.body.impact.token, impact.token);
    assert.ok(await prisma.user.findUnique({ where: { id: f.person.id } }));
  });
  it("não altera snapshots contratados e impede iniciar com líder indisponível", async () => {
    const f = await fixture();
    const project = await prisma.project.create({ data: { title: "Contratação preservada", project_code: uid() } }); projects.push(project.id);
    const pp = await prisma.projectProduct.create({ data: { project_id: project.id, product_name_snapshot: "Produto anterior", product_category_snapshot: "Teste", product_price_snapshot: 123 } });
    const task = await prisma.projectTask.create({ data: { project_id: project.id, project_product_id: pp.id, title: "Execução própria", name_snapshot: "Snapshot original", status: "PARA_LANCAMENTO", stage_execution: "stage" } });
    const stage = await prisma.projectTaskStage.create({ data: { project_task_id: task.id, titulo: "Etapa contratada", executor_type: "leader", lider_id: f.person.id, config_snapshot: '{"version":1}' } });
    const impact = await specificAssigneeImpact(prisma, f.person.id, "deactivate"); assert.ok(impact.stages.some(s => s.id === stage.id));
    assert.equal((await request(f.person.id, "PUT", { is_active: false, assignment_confirmation: impact.token })).status, 200);
    assert.deepEqual(await prisma.projectTaskStage.findUniqueOrThrow({ where: { id: stage.id } }), stage);
    await assert.rejects(() => abrirEtapa(prisma, stage.id), /líder indicado.*indisponível/);
    assert.equal((await prisma.projectTaskStage.findUniqueOrThrow({ where: { id: stage.id } })).status, "PENDENTE");
  });
  it("usuário sem permissão não recebe lista de vínculos", async () => {
    const f = await fixture(), outsider = await user("company_user");
    const token = jwt.sign({ id: outsider.id, email: outsider.email, role: outsider.role, account_type: outsider.account_type }, config.JWT_SECRET);
    const response = await request(f.person.id, "DELETE", undefined, token); assert.equal(response.status, 403); assert.equal(response.body.impact, undefined);
  });
});
