import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import type { AddressInfo } from "node:net";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { requireTestDatabaseUrl } from "../test-support/require-test-database";
import app from "../app";
import { prisma } from "../lib/prisma";
import { config } from "../config";
import { setDefaultLaunchAIAdapter, setDefaultGenerationTimings, type LaunchAIAdapter } from "../lib/launch-ai-client";

// IA de Lançamento / Plano Tático (bloco 3/4) — testes de integração HTTP
// completos usando um ADAPTER MOCK do provedor (nunca rede/credencial
// real). Cobre: geração assíncrona real (pending → succeeded/failed/
// timeout/cancelled), idempotência, concorrência, permissões, isolamento,
// versionamento/edição humana, aprovação e vínculo com o relato de
// possível alucinação.

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

async function waitForExecution(sessionId: string, executionId: string, token: string, timeoutMs = 4000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await api(`/api/launch-sessions/${sessionId}/executions/${executionId}`, { token });
    if (res.json?.execution?.status && res.json.execution.status !== "pending") return res.json.execution;
    await new Promise((r) => setTimeout(r, 40));
  }
  throw new Error("timed out waiting for execution to finish");
}

function validPlanResponse(overrides: Partial<{ specialty: string; responsibleId: string | null }> = {}) {
  return JSON.stringify({
    reply_text: "Aqui está o plano tático proposto.",
    stage: "proposta_gerada",
    pending_questions: [],
    plan: {
      plan_summary: "Lançamento em duas ondas.",
      plan_duration_months: 2,
      plan_duration_days_custom: null,
      waves: [
        { name: "Onda 1", objective: "Preparar base", trigger_type: "data", trigger_date: "2026-10-01", trigger_note: null, task_titles: ["Configurar ambiente"] },
      ],
      tasks: [
        {
          title: "Configurar ambiente",
          objective: "Deixar tudo pronto",
          description: "Configurar contas e acessos necessários.",
          deliverable: "Ambiente configurado",
          steps: ["Criar contas", "Validar acessos"],
          suggested_duration_days: 3,
          required_specialty: overrides.specialty ?? "Gestão de Tráfego",
          responsible_user_id: overrides.responsibleId ?? null,
          prerequisites: [],
          approval_criteria: ["Acessos validados pelo time"],
          references: [],
          justification: "Necessário para iniciar o lançamento conforme conversa.",
          open_questions: [],
        },
      ],
    },
  });
}

const userIds: string[] = [];
const companyIds: string[] = [];
const projectIds: string[] = [];
const specialtyIds: string[] = [];

async function mkUser(overrides: Partial<{ account_type: string; company_id: string | null }> = {}) {
  const id = `launch-${crypto.randomBytes(6).toString("hex")}`;
  const user = await prisma.user.create({
    data: {
      id,
      email: `${id}@example.test`,
      password_hash: "x",
      name: `Launch Test ${id}`,
      role: "company_user",
      account_type: overrides.account_type ?? "empresas",
      is_active: true,
      status: "ativo",
      company_id: overrides.company_id ?? null,
    },
  });
  userIds.push(user.id);
  return user;
}

async function mkCompany() {
  const company = await prisma.company.create({ data: { name: `Empresa Launch ${crypto.randomBytes(4).toString("hex")}` } });
  companyIds.push(company.id);
  return company;
}

async function mkProject(overrides: Partial<{ company_id: string | null }> = {}) {
  const code = crypto.randomBytes(4).toString("hex");
  const project = await prisma.project.create({ data: { title: `Projeto Launch ${code}`, project_code: code, company_id: overrides.company_id ?? null } });
  projectIds.push(project.id);
  return project;
}

async function mkSpecialty(name: string) {
  const specialty = await prisma.specialty.create({ data: { name, category: "Cat", is_active: true } });
  specialtyIds.push(specialty.id);
  return specialty;
}

describe("IA de Lançamento / Plano Tático (bloco 3/4)", () => {
  before(async () => {
    requireTestDatabaseUrl();
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
    const listener = app.listen(0);
    server = listener;
    await new Promise<void>((resolve) => listener.once("listening", () => resolve()));
    const address = listener.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
    setDefaultGenerationTimings({ timeoutMs: 500, cancelPollMs: 30 });
    await mkSpecialty("Gestão de Tráfego");
  });

  beforeEach(() => {
    // cada teste reseta pro adapter padrão (respondendo um plano válido) —
    // testes específicos de falha/timeout/cancelamento sobrescrevem.
    setDefaultLaunchAIAdapter(async () => ({ text: validPlanResponse() }));
  });

  after(async () => {
    await prisma.hallucinationReportEvent.deleteMany({ where: { report: { project_id: { in: projectIds } } } });
    await prisma.hallucinationReportFile.deleteMany({ where: { report: { project_id: { in: projectIds } } } });
    await prisma.hallucinationReport.deleteMany({ where: { project_id: { in: projectIds } } });
    await prisma.launchGenerationExecution.deleteMany({ where: { session: { project_id: { in: projectIds } } } });
    await prisma.launchProposalVersion.deleteMany({ where: { session: { project_id: { in: projectIds } } } });
    await prisma.launchMessageFile.deleteMany({ where: { message: { session: { project_id: { in: projectIds } } } } });
    await prisma.launchMessage.deleteMany({ where: { session: { project_id: { in: projectIds } } } });
    await prisma.launchSessionParticipant.deleteMany({ where: { session: { project_id: { in: projectIds } } } });
    await prisma.launchSession.deleteMany({ where: { project_id: { in: projectIds } } });
    await prisma.aIContextSnapshot.deleteMany({ where: { project_id: { in: projectIds } } });
    await prisma.memory.deleteMany({ where: { scope_id: { in: [...projectIds, ...companyIds] } } });
    await prisma.specialty.deleteMany({ where: { id: { in: specialtyIds } } });
    await prisma.project.deleteMany({ where: { id: { in: projectIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.company.deleteMany({ where: { id: { in: companyIds } } });
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  });

  it("401 sem token", async () => {
    const project = await mkProject();
    const res = await api("/api/launch-sessions", { method: "POST", body: { project_id: project.id } });
    assert.equal(res.status, 401);
  });

  it("404 (não 403) sem visibilidade nenhuma do projeto", async () => {
    const companyA = await mkCompany();
    const companyB = await mkCompany();
    const project = await mkProject({ company_id: companyA.id });
    const outsider = await mkUser({ company_id: companyB.id });
    const res = await api("/api/launch-sessions", { method: "POST", token: tokenFor(outsider), body: { project_id: project.id } });
    assert.equal(res.status, 404);
  });

  it("isolamento: Company B nunca vê/gera na sessão da Company A", async () => {
    const companyA = await mkCompany();
    const companyB = await mkCompany();
    const project = await mkProject({ company_id: companyA.id });
    const ownerA = await mkUser({ company_id: companyA.id });
    const outsiderB = await mkUser({ company_id: companyB.id });

    const created = await api("/api/launch-sessions", { method: "POST", token: tokenFor(ownerA), body: { project_id: project.id } });
    assert.equal(created.status, 201);
    const sessionId = created.json.session.id;

    const blocked = await api(`/api/launch-sessions/${sessionId}`, { token: tokenFor(outsiderB) });
    assert.equal(blocked.status, 404);
  });

  it("fluxo completo real: criar sessão, conversar, gerar (assíncrono), versão criada, aprovar como rascunho", async () => {
    const company = await mkCompany();
    const project = await mkProject({ company_id: company.id });
    const owner = await mkUser({ company_id: company.id });
    const token = tokenFor(owner);

    const created = await api("/api/launch-sessions", { method: "POST", token, body: { project_id: project.id } });
    const sessionId = created.json.session.id;

    const msg = await api(`/api/launch-sessions/${sessionId}/messages`, { method: "POST", token, body: { content: "Precisamos lançar a campanha em outubro." } });
    assert.equal(msg.status, 201);

    const gen = await api(`/api/launch-sessions/${sessionId}/generate`, { method: "POST", token, body: { client_action_id: crypto.randomUUID() } });
    assert.equal(gen.status, 202);
    assert.equal(gen.json.execution.status, "pending");

    const finished = await waitForExecution(sessionId, gen.json.execution.id, token);
    assert.equal(finished.status, "succeeded");

    const detail = await api(`/api/launch-sessions/${sessionId}`, { token });
    assert.equal(detail.json.session.status, "proposta_gerada");
    assert.equal(detail.json.session.versions.length, 1);
    assert.equal(detail.json.session.versions[0].source, "ia_gerada");
    const plan = JSON.parse(detail.json.session.versions[0].structured_json);
    assert.equal(plan.tasks[0].title, "Configurar ambiente");
    assert.ok(detail.json.session.messages.some((m: any) => m.role === "assistant" && m.content.includes("plano tático")));

    const approve = await api(`/api/launch-sessions/${sessionId}/approve`, { method: "POST", token, body: { updated_at: detail.json.session.updated_at } });
    assert.equal(approve.status, 200);
    assert.equal(approve.json.session.status, "aprovada_como_rascunho");
    assert.equal(approve.json.session.approved_version_id, detail.json.session.versions[0].id);

    // sessão fechada nunca aceita mais geração/edição
    const blockedGen = await api(`/api/launch-sessions/${sessionId}/generate`, { method: "POST", token, body: { client_action_id: crypto.randomUUID() } });
    assert.equal(blockedGen.status, 422);
  });

  it("clique duplo (mesmo client_action_id) nunca duplica a geração", async () => {
    const company = await mkCompany();
    const project = await mkProject({ company_id: company.id });
    const owner = await mkUser({ company_id: company.id });
    const token = tokenFor(owner);
    const created = await api("/api/launch-sessions", { method: "POST", token, body: { project_id: project.id } });
    const sessionId = created.json.session.id;

    const clientActionId = crypto.randomUUID();
    const first = await api(`/api/launch-sessions/${sessionId}/generate`, { method: "POST", token, body: { client_action_id: clientActionId } });
    assert.equal(first.status, 202);
    const second = await api(`/api/launch-sessions/${sessionId}/generate`, { method: "POST", token, body: { client_action_id: clientActionId } });
    assert.equal(second.status, 200);
    assert.equal(second.json.duplicate, true);
    assert.equal(second.json.execution.id, first.json.execution.id);

    await waitForExecution(sessionId, first.json.execution.id, token);
    const count = await prisma.launchGenerationExecution.count({ where: { client_action_id: clientActionId } });
    assert.equal(count, 1);
  });

  it("concorrência: pedir geração enquanto outra já está pendente devolve 409 (nunca custo duplicado)", async () => {
    setDefaultLaunchAIAdapter(async () => {
      await new Promise((r) => setTimeout(r, 300));
      return { text: validPlanResponse() };
    });
    const company = await mkCompany();
    const project = await mkProject({ company_id: company.id });
    const owner = await mkUser({ company_id: company.id });
    const token = tokenFor(owner);
    const created = await api("/api/launch-sessions", { method: "POST", token, body: { project_id: project.id } });
    const sessionId = created.json.session.id;

    const first = await api(`/api/launch-sessions/${sessionId}/generate`, { method: "POST", token, body: { client_action_id: crypto.randomUUID() } });
    assert.equal(first.status, 202);
    const second = await api(`/api/launch-sessions/${sessionId}/generate`, { method: "POST", token, body: { client_action_id: crypto.randomUUID() } });
    assert.equal(second.status, 409);

    await waitForExecution(sessionId, first.json.execution.id, token);
  });

  it("falha do provedor: execução marcada 'failed', mensagem de erro local, nenhuma versão criada", async () => {
    setDefaultLaunchAIAdapter(async () => {
      throw new Error("simulated Gemini network failure");
    });
    const company = await mkCompany();
    const project = await mkProject({ company_id: company.id });
    const owner = await mkUser({ company_id: company.id });
    const token = tokenFor(owner);
    const created = await api("/api/launch-sessions", { method: "POST", token, body: { project_id: project.id } });
    const sessionId = created.json.session.id;

    const gen = await api(`/api/launch-sessions/${sessionId}/generate`, { method: "POST", token, body: { client_action_id: crypto.randomUUID() } });
    const finished = await waitForExecution(sessionId, gen.json.execution.id, token);
    assert.equal(finished.status, "failed");
    assert.ok(finished.error_message.includes("simulated Gemini network failure"));

    const detail = await api(`/api/launch-sessions/${sessionId}`, { token });
    assert.equal(detail.json.session.versions.length, 0);
    assert.ok(detail.json.session.messages.some((m: any) => m.status === "error"));
  });

  it("saída estruturada inválida (referência inexistente) é rejeitada — nenhuma versão criada", async () => {
    setDefaultLaunchAIAdapter(async () => ({ text: validPlanResponse({ specialty: "Especialidade Inexistente XYZ" }) }));
    const company = await mkCompany();
    const project = await mkProject({ company_id: company.id });
    const owner = await mkUser({ company_id: company.id });
    const token = tokenFor(owner);
    const created = await api("/api/launch-sessions", { method: "POST", token, body: { project_id: project.id } });
    const sessionId = created.json.session.id;

    const gen = await api(`/api/launch-sessions/${sessionId}/generate`, { method: "POST", token, body: { client_action_id: crypto.randomUUID() } });
    const finished = await waitForExecution(sessionId, gen.json.execution.id, token);
    assert.equal(finished.status, "failed");
    assert.match(finished.error_message, /especialidade referenciada não existe/);

    const detail = await api(`/api/launch-sessions/${sessionId}`, { token });
    assert.equal(detail.json.session.versions.length, 0);
  });

  it("timeout: geração que nunca responde é interrompida e marcada 'timeout'", async () => {
    setDefaultLaunchAIAdapter(async () => new Promise(() => {}));
    const company = await mkCompany();
    const project = await mkProject({ company_id: company.id });
    const owner = await mkUser({ company_id: company.id });
    const token = tokenFor(owner);
    const created = await api("/api/launch-sessions", { method: "POST", token, body: { project_id: project.id } });
    const sessionId = created.json.session.id;

    const gen = await api(`/api/launch-sessions/${sessionId}/generate`, { method: "POST", token, body: { client_action_id: crypto.randomUUID() } });
    const finished = await waitForExecution(sessionId, gen.json.execution.id, token, 2000);
    assert.equal(finished.status, "timeout");
  });

  it("cancelamento durante processamento: resultado previsível (execução 'cancelled', resposta tardia nunca aplicada)", async () => {
    let resolveLate: (v: { text: string }) => void = () => {};
    const latePromise = new Promise<{ text: string }>((resolve) => {
      resolveLate = resolve;
    });
    setDefaultLaunchAIAdapter(async () => latePromise);

    const company = await mkCompany();
    const project = await mkProject({ company_id: company.id });
    const owner = await mkUser({ company_id: company.id });
    const token = tokenFor(owner);
    const created = await api("/api/launch-sessions", { method: "POST", token, body: { project_id: project.id } });
    const sessionId = created.json.session.id;

    const gen = await api(`/api/launch-sessions/${sessionId}/generate`, { method: "POST", token, body: { client_action_id: crypto.randomUUID() } });
    const executionId = gen.json.execution.id;

    const cancel = await api(`/api/launch-sessions/${sessionId}/executions/${executionId}/cancel`, { method: "POST", token, body: {} });
    assert.equal(cancel.status, 202);

    const finished = await waitForExecution(sessionId, executionId, token);
    assert.equal(finished.status, "cancelled");

    // resposta "atrasada" chega DEPOIS do cancelamento já ter sido finalizado
    resolveLate({ text: validPlanResponse() });
    await new Promise((r) => setTimeout(r, 150));

    const detail = await api(`/api/launch-sessions/${sessionId}`, { token });
    assert.equal(detail.json.session.versions.length, 0); // nunca aplicada
    const stillCancelled = await api(`/api/launch-sessions/${sessionId}/executions/${executionId}`, { token });
    assert.equal(stillCancelled.json.execution.status, "cancelled"); // nunca sobrescrita
  });

  it("edição humana cria nova versão e concorrência otimista recusa updated_at desatualizado (409)", async () => {
    const company = await mkCompany();
    const project = await mkProject({ company_id: company.id });
    const owner = await mkUser({ company_id: company.id });
    const token = tokenFor(owner);
    const created = await api("/api/launch-sessions", { method: "POST", token, body: { project_id: project.id } });
    const sessionId = created.json.session.id;

    const gen = await api(`/api/launch-sessions/${sessionId}/generate`, { method: "POST", token, body: { client_action_id: crypto.randomUUID() } });
    await waitForExecution(sessionId, gen.json.execution.id, token);
    const afterGen = await api(`/api/launch-sessions/${sessionId}`, { token });
    const staleUpdatedAt = afterGen.json.session.updated_at;
    const plan = JSON.parse(afterGen.json.session.versions[0].structured_json);
    plan.tasks[0].suggested_duration_days = 10;

    const edit = await api(`/api/launch-sessions/${sessionId}/versions`, { method: "POST", token, body: { plan, updated_at: staleUpdatedAt } });
    assert.equal(edit.status, 201);
    assert.equal(edit.json.session.status, "em_revisao");

    // reusar o MESMO updated_at antigo de novo (imita duas abas) → 409
    const conflictingEdit = await api(`/api/launch-sessions/${sessionId}/versions`, { method: "POST", token, body: { plan, updated_at: staleUpdatedAt } });
    assert.equal(conflictingEdit.status, 409);

    const detail = await api(`/api/launch-sessions/${sessionId}`, { token });
    assert.equal(detail.json.session.versions.length, 2);
    const humanVersion = detail.json.session.versions.find((v: any) => v.source === "humano_editado");
    assert.ok(humanVersion);
    assert.equal(JSON.parse(humanVersion.structured_json).tasks[0].suggested_duration_days, 10);
  });

  it("relato de possível alucinação vinculado à execução real e ao snapshot real", async () => {
    const company = await mkCompany();
    const project = await mkProject({ company_id: company.id });
    const owner = await mkUser({ company_id: company.id });
    const token = tokenFor(owner);
    const created = await api("/api/launch-sessions", { method: "POST", token, body: { project_id: project.id } });
    const sessionId = created.json.session.id;

    const gen = await api(`/api/launch-sessions/${sessionId}/generate`, { method: "POST", token, body: { client_action_id: crypto.randomUUID() } });
    const finished = await waitForExecution(sessionId, gen.json.execution.id, token);

    const report = await api("/api/hallucination-reports", {
      method: "POST",
      token,
      body: {
        project_id: project.id,
        description: "A tarefa proposta não faz sentido com o que conversamos",
        category: "dado_inventado",
        impact: "medio",
        snapshot_id: finished.snapshot_id,
        launch_execution_id: finished.id,
        create_client_action_id: crypto.randomUUID(),
      },
    });
    assert.equal(report.status, 201);
    assert.equal(report.json.report.launch_execution_id, finished.id);
    assert.equal(report.json.report.snapshot_id, finished.snapshot_id);
  });
});
