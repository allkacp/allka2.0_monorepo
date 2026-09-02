import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { AddressInfo } from "node:net";
import crypto from "node:crypto";
import fs from "fs";
import jwt from "jsonwebtoken";
import { requireTestDatabaseUrl } from "../test-support/require-test-database";
import app from "../app";
import { prisma } from "../lib/prisma";
import { config } from "../config";
import { uploadedFilePath } from "../lib/file-storage";

// Defesa contra alucinação (bloco 2/4, sprint 2026-09) — relato de "possível
// alucinação" + prévia de contexto ("Visualizar contexto que a IA
// utilizará"). Cobre 401/403/404, idempotência de criação e fechamento,
// isolamento entre contas, concorrência otimista nas transições
// administrativas, e o snapshot imutável mesmo após editar a memória.

let baseUrl = "";
let server: import("node:http").Server;

function tokenFor(u: { id: string; email: string; role: string; account_type: string }) {
  return jwt.sign({ id: u.id, email: u.email, role: u.role, account_type: u.account_type }, config.JWT_SECRET, { expiresIn: "1h" });
}

async function api(path: string, options: { method?: string; token?: string; body?: unknown } = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? "GET",
    headers: { "content-type": "application/json", ...(options.token ? { authorization: `Bearer ${options.token}` } : {}) },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

async function uploadFile(path: string, token: string, buffer: Buffer, filename: string) {
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(buffer)]), filename);
  const res = await fetch(`${baseUrl}${path}`, { method: "POST", headers: { authorization: `Bearer ${token}` }, body: form });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

const userIds: string[] = [];
const profileIds: string[] = [];
const companyIds: string[] = [];
const projectIds: string[] = [];

async function mkUser(overrides: Partial<{ role: string; account_type: string; company_id: string | null; admin_profile_id: string | null }> = {}) {
  const id = `hr-${crypto.randomBytes(6).toString("hex")}`;
  const user = await prisma.user.create({
    data: {
      id,
      email: `${id}@example.test`,
      password_hash: "x",
      name: `HR Test ${id}`,
      role: overrides.role ?? "company_user",
      account_type: overrides.account_type ?? "empresas",
      is_active: true,
      status: "ativo",
      company_id: overrides.company_id ?? null,
      admin_profile_id: overrides.admin_profile_id ?? null,
    },
  });
  userIds.push(user.id);
  return user;
}

async function mkProfile(isMaster: boolean) {
  const profile = await prisma.adminProfile.create({
    data: { name: `perfil-hr-${crypto.randomBytes(4).toString("hex")}`, is_master: isMaster, is_active: true },
  });
  profileIds.push(profile.id);
  return profile;
}

async function mkAdminMaster() {
  const profile = await mkProfile(true);
  return mkUser({ role: "admin", account_type: "admin", admin_profile_id: profile.id });
}

async function mkCompany() {
  const company = await prisma.company.create({ data: { name: `Empresa HR ${crypto.randomBytes(4).toString("hex")}` } });
  companyIds.push(company.id);
  return company;
}

async function mkProject(overrides: Partial<{ company_id: string | null }> = {}) {
  const code = crypto.randomBytes(4).toString("hex");
  const project = await prisma.project.create({ data: { title: `Projeto HR ${code}`, project_code: code, company_id: overrides.company_id ?? null } });
  projectIds.push(project.id);
  return project;
}

describe("Defesa contra alucinação — relato + prévia de contexto (bloco 2/4)", () => {
  before(async () => {
    requireTestDatabaseUrl();
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
    const listener = app.listen(0);
    server = listener;
    await new Promise<void>((resolve) => listener.once("listening", () => resolve()));
    const address = listener.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  after(async () => {
    await prisma.hallucinationReportEvent.deleteMany({ where: { report: { project_id: { in: projectIds } } } });
    await prisma.hallucinationReportFile.deleteMany({ where: { report: { project_id: { in: projectIds } } } });
    await prisma.hallucinationReport.deleteMany({ where: { project_id: { in: projectIds } } });
    await prisma.aIContextSnapshot.deleteMany({ where: { project_id: { in: projectIds } } });
    await prisma.memory.deleteMany({ where: { scope_id: { in: [...projectIds, ...companyIds] } } });
    await prisma.project.deleteMany({ where: { id: { in: projectIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.adminProfile.deleteMany({ where: { id: { in: profileIds } } });
    await prisma.company.deleteMany({ where: { id: { in: companyIds } } });
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  });

  it("401 sem token ao criar relato", async () => {
    const project = await mkProject();
    const res = await api("/api/hallucination-reports", { method: "POST", token: undefined, body: { project_id: project.id, description: "x", category: "outro", impact: "baixo" } });
    assert.equal(res.status, 401);
  });

  it("404 (não 403) quando o usuário não tem visibilidade nenhuma do projeto", async () => {
    const companyA = await mkCompany();
    const companyB = await mkCompany();
    const project = await mkProject({ company_id: companyA.id });
    const outsider = await mkUser({ company_id: companyB.id });

    const res = await api("/api/hallucination-reports", {
      method: "POST",
      token: tokenFor(outsider),
      body: { project_id: project.id, description: "Resposta estranha", category: "outro", impact: "baixo" },
    });
    assert.equal(res.status, 404);
  });

  it("cria relato; clique duplo (mesmo create_client_action_id) nunca duplica", async () => {
    const company = await mkCompany();
    const project = await mkProject({ company_id: company.id });
    const reporter = await mkUser({ company_id: company.id });
    const clientActionId = crypto.randomUUID();
    const body = { project_id: project.id, description: "A IA inventou um prazo que não existe", category: "dado_inventado", impact: "alto", create_client_action_id: clientActionId };

    const first = await api("/api/hallucination-reports", { method: "POST", token: tokenFor(reporter), body });
    assert.equal(first.status, 201);
    const second = await api("/api/hallucination-reports", { method: "POST", token: tokenFor(reporter), body });
    assert.equal(second.status, 200);
    assert.equal(second.json.report.id, first.json.report.id);

    const count = await prisma.hallucinationReport.count({ where: { create_client_action_id: clientActionId } });
    assert.equal(count, 1);
  });

  it("isolamento: Company dona do projeto vê os relatos; conta sem vínculo não vê nenhum (404 no detalhe)", async () => {
    const companyA = await mkCompany();
    const companyB = await mkCompany();
    const project = await mkProject({ company_id: companyA.id });
    const reporter = await mkUser({ company_id: companyA.id });
    const owner = await mkUser({ company_id: companyA.id });
    const outsider = await mkUser({ company_id: companyB.id });

    const created = await api("/api/hallucination-reports", {
      method: "POST",
      token: tokenFor(reporter),
      body: { project_id: project.id, description: "Relato de teste isolamento", category: "outro", impact: "baixo", create_client_action_id: crypto.randomUUID() },
    });
    const reportId = created.json.report.id;

    const listOwner = await api(`/api/hallucination-reports?project_id=${project.id}`, { token: tokenFor(owner) });
    assert.equal(listOwner.status, 200);
    assert.ok(listOwner.json.data.some((r: any) => r.id === reportId));

    const detailOutsider = await api(`/api/hallucination-reports/${reportId}`, { token: tokenFor(outsider) });
    assert.equal(detailOutsider.status, 404);

    const detailReporter = await api(`/api/hallucination-reports/${reportId}`, { token: tokenFor(reporter) });
    assert.equal(detailReporter.status, 200);
  });

  it("transições administrativas exigem Admin Master (403 para usuário comum)", async () => {
    const company = await mkCompany();
    const project = await mkProject({ company_id: company.id });
    const reporter = await mkUser({ company_id: company.id });
    const created = await api("/api/hallucination-reports", {
      method: "POST",
      token: tokenFor(reporter),
      body: { project_id: project.id, description: "Teste 403 admin", category: "outro", impact: "baixo", create_client_action_id: crypto.randomUUID() },
    });
    const reportId = created.json.report.id;

    const res = await api(`/api/hallucination-reports/${reportId}/assume`, { method: "POST", token: tokenFor(reporter), body: {} });
    assert.equal(res.status, 403);
  });

  it("fluxo administrativo completo: assumir → marcar origem → diagnosticar → resolver (com concorrência)", async () => {
    const company = await mkCompany();
    const project = await mkProject({ company_id: company.id });
    const reporter = await mkUser({ company_id: company.id });
    const admin = await mkAdminMaster();

    const created = await api("/api/hallucination-reports", {
      method: "POST",
      token: tokenFor(reporter),
      body: { project_id: project.id, description: "Fluxo completo", category: "instrucao_ignorada", impact: "medio", create_client_action_id: crypto.randomUUID() },
    });
    const reportId = created.json.report.id;
    let updatedAt: string = created.json.report.updated_at;

    const assumed = await api(`/api/hallucination-reports/${reportId}/assume`, { method: "POST", token: tokenFor(admin), body: { updated_at: updatedAt } });
    assert.equal(assumed.status, 200);
    assert.equal(assumed.json.report.status, "em_analise");
    updatedAt = assumed.json.report.updated_at;

    // concorrência: reenviar um updated_at JÁ ANTIGO (imita duas abas) → 409
    const staleAttempt = await api(`/api/hallucination-reports/${reportId}/suspected-origin`, {
      method: "POST",
      token: tokenFor(admin),
      body: { layer: "project", updated_at: created.json.report.updated_at },
    });
    assert.equal(staleAttempt.status, 409);

    const origin = await api(`/api/hallucination-reports/${reportId}/suspected-origin`, { method: "POST", token: tokenFor(admin), body: { layer: "project", updated_at: updatedAt } });
    assert.equal(origin.status, 200);
    assert.equal(origin.json.report.suspected_origin_layer, "project");
    updatedAt = origin.json.report.updated_at;

    const diag = await api(`/api/hallucination-reports/${reportId}/diagnosis`, { method: "POST", token: tokenFor(admin), body: { note: "Instrução do projeto realmente conflitava.", updated_at: updatedAt } });
    assert.equal(diag.status, 200);
    updatedAt = diag.json.report.updated_at;

    const clientActionId = crypto.randomUUID();
    const closed = await api(`/api/hallucination-reports/${reportId}/close`, {
      method: "POST",
      token: tokenFor(admin),
      body: { outcome: "resolvido", justification: "Instrução corrigida na memória do projeto.", client_action_id: clientActionId, updated_at: updatedAt },
    });
    assert.equal(closed.status, 201);
    assert.equal(closed.json.report.status, "resolvido");

    // fechamento repetido com o MESMO client_action_id devolve o estado atual, sem duplicar
    const closedAgain = await api(`/api/hallucination-reports/${reportId}/close`, {
      method: "POST",
      token: tokenFor(admin),
      body: { outcome: "resolvido", justification: "Instrução corrigida na memória do projeto.", client_action_id: clientActionId, updated_at: updatedAt },
    });
    assert.equal(closedAgain.status, 200);
    assert.equal(closedAgain.json.duplicate, true);

    // tentar fechar de novo com um client_action_id DIFERENTE → 409 (já encerrado)
    const closedDifferentAction = await api(`/api/hallucination-reports/${reportId}/close`, {
      method: "POST",
      token: tokenFor(admin),
      body: { outcome: "descartado", justification: "Outra tentativa", client_action_id: crypto.randomUUID(), updated_at: updatedAt },
    });
    assert.equal(closedDifferentAction.status, 409);
    assert.equal(closedDifferentAction.json.already_closed, true);

    const history = await api(`/api/hallucination-reports/${reportId}/history`, { token: tokenFor(admin) });
    const eventTypes = (history.json.history as any[]).map((e) => e.event_type);
    assert.ok(["created", "assumed_analysis", "marked_suspected_origin", "diagnosis_recorded", "resolved"].every((t) => eventTypes.includes(t)));
  });

  it("prévia de contexto: 404 sem visibilidade; idempotente por createClientActionId; snapshot preservado após editar a memória", async () => {
    const company = await mkCompany();
    const project = await mkProject({ company_id: company.id });
    const owner = await mkUser({ company_id: company.id });
    const outsider = await mkUser({ company_id: (await mkCompany()).id });

    const blocked = await api(`/api/memory-context/${project.id}/preview`, { method: "POST", token: tokenFor(outsider), body: { createClientActionId: crypto.randomUUID() } });
    assert.equal(blocked.status, 404);

    const clientActionId = crypto.randomUUID();
    const first = await api(`/api/memory-context/${project.id}/preview`, { method: "POST", token: tokenFor(owner), body: { createClientActionId: clientActionId } });
    assert.equal(first.status, 201);
    const snapshotId = first.json.snapshot_id;

    const retry = await api(`/api/memory-context/${project.id}/preview`, { method: "POST", token: tokenFor(owner), body: { createClientActionId: clientActionId } });
    assert.equal(retry.status, 200);
    assert.equal(retry.json.snapshot_id, snapshotId);
    assert.equal(await prisma.aIContextSnapshot.count({ where: { create_client_action_id: clientActionId } }), 1);

    // edita a memória do projeto DEPOIS do snapshot já existir
    await api(`/api/memory/project/${project.id}`, { method: "PATCH", token: tokenFor(owner), body: { section: "summary", value: "Resumo alterado depois do snapshot", updatedAt: null } });

    // o snapshot antigo continua intacto (imutável) mesmo com a memória já diferente
    const oldSnapshot = await api(`/api/memory-context/${project.id}/snapshots/${snapshotId}`, { token: tokenFor(owner) });
    assert.equal(oldSnapshot.status, 200);
    assert.ok(!oldSnapshot.json.text.includes("Resumo alterado depois do snapshot"));

    // uma NOVA prévia já reflete a mudança
    const newPreview = await api(`/api/memory-context/${project.id}/preview`, { method: "POST", token: tokenFor(owner), body: { createClientActionId: crypto.randomUUID() } });
    assert.ok(newPreview.json.text.includes("Resumo alterado depois do snapshot"));
    assert.notEqual(newPreview.json.checksum, first.json.checksum);
  });

  it("acabamento do bloco 2: anexos do relato funcionam e são protegidos (autorizado baixa; outra conta recebe 404; remover só arquiva)", async () => {
    const company = await mkCompany();
    const project = await mkProject({ company_id: company.id });
    const reporter = await mkUser({ company_id: company.id });
    const outsider = await mkUser({ company_id: (await mkCompany()).id });

    const created = await api("/api/hallucination-reports", {
      method: "POST",
      token: tokenFor(reporter),
      body: { project_id: project.id, description: "Relato com anexo", category: "outro", impact: "baixo", create_client_action_id: crypto.randomUUID() },
    });
    const reportId = created.json.report.id;

    const upload = await uploadFile(`/api/hallucination-reports/${reportId}/files`, tokenFor(reporter), Buffer.from("print da conversa"), "evidencia.txt");
    assert.equal(upload.status, 201);
    const fileId = upload.json.file.id;
    const storedName = upload.json.file.file_name;
    const diskPath = uploadedFilePath(`hallucination-reports/${reportId}`, storedName);
    assert.ok(fs.existsSync(diskPath));

    // upload por quem não tem acesso ao relato → 404 (nunca revela existência)
    const blockedUpload = await uploadFile(`/api/hallucination-reports/${reportId}/files`, tokenFor(outsider), Buffer.from("x"), "x.txt");
    assert.equal(blockedUpload.status, 404);

    const okDownload = await api(`/api/hallucination-reports/${reportId}/files/${fileId}/download`, { token: tokenFor(reporter) });
    assert.equal(okDownload.status, 200);

    const blockedDownload = await api(`/api/hallucination-reports/${reportId}/files/${fileId}/download`, { token: tokenFor(outsider) });
    assert.equal(blockedDownload.status, 404);

    // remover só arquiva — o binário continua no disco, some da listagem viva
    const del = await api(`/api/hallucination-reports/${reportId}/files/${fileId}`, { method: "DELETE", token: tokenFor(reporter) });
    assert.equal(del.status, 200);
    assert.ok(fs.existsSync(diskPath));

    const detail = await api(`/api/hallucination-reports/${reportId}`, { token: tokenFor(reporter) });
    assert.equal(detail.json.report.files.some((f: any) => f.id === fileId), false);
  });
});
