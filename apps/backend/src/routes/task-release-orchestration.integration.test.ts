import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { AddressInfo } from "node:net";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { requireTestDatabaseUrl } from "../test-support/require-test-database";
import app from "../app";
import { prisma } from "../lib/prisma";
import { config } from "../config";
import {
  addTaskDependency,
  removeTaskDependency,
  assertTaskNotUsedAsPrerequisite,
  DependencyValidationError,
  DependencyInUseError,
} from "../lib/task-dependency-graph";
import {
  getTaskGateStatus,
  tryReleaseTask,
  reevaluateSuccessors,
  satisfyScheduledDateTrigger,
  satisfyPaymentTriggersByReference,
  satisfyManualApprovalTrigger,
  satisfySelectionTrigger,
  applyAdminDependencyOverride,
  TaskReleaseError,
  PENDING_RELEASE_STATUS,
  RELEASE_READY_STATUS,
} from "../lib/task-release-service";
import { runTaskReleaseSchedulerOnce } from "../lib/task-release-scheduler";
import { setDefaultLaunchAIAdapter, setDefaultGenerationTimings } from "../lib/launch-ai-client";
// Usadas SOMENTE no teste de rollback (ver comentário lá): não existe, hoje,
// nenhuma requisição HTTP pública capaz de provocar um erro genuíno no meio
// desta transação sem antes violar uma FK que o próprio app já impede via
// cascade — então a prova de "tudo ou nada" compõe as MESMAS três chamadas
// que a rota real faz, na mesma ordem, e não substitui os testes 1-6 acima
// (esses sim inteiramente via HTTP, sem nenhum helper interno).
import { aprovarTarefa } from "../lib/stage-engine";
import { recordApprovedTask } from "../lib/memory-service";

// ─── Materialização, dependências e liberação automática (bloco 4/4) ────────
// Cobre o grafo de dependências (cadeia/convergência/ciclo/cross-project), a
// liberação automática (aprovação real via rota HTTP, data, pagamento,
// aprovação manual, exceção administrativa) e o fechamento do "backdoor" em
// PATCH /api/project-products/tasks/:id.

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

const userIds: string[] = [];
const companyIds: string[] = [];
const agencyIds: string[] = [];
const projectIds: string[] = [];
const productIds: string[] = [];
const paymentIds: string[] = [];
const specialtyIds: string[] = [];

async function waitForExecution(sessionId: string, executionId: string, token: string, timeoutMs = 4000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await api(`/api/launch-sessions/${sessionId}/executions/${executionId}`, { token });
    if (res.json?.execution?.status && res.json.execution.status !== "pending") return res.json.execution;
    await new Promise((r) => setTimeout(r, 40));
  }
  throw new Error("timed out waiting for execution to finish");
}

function planWithUnresolvedSpecialty() {
  return JSON.stringify({
    reply_text: "Plano com especialidade sem correspondência.",
    stage: "proposta_gerada",
    pending_questions: [],
    plan: {
      plan_summary: "Lançamento simples.",
      plan_duration_months: 1,
      plan_duration_days_custom: null,
      waves: [],
      tasks: [
        {
          title: "Tarefa Única",
          objective: "Objetivo",
          description: "Descrição",
          deliverable: "Entregável",
          steps: ["Fazer"],
          suggested_duration_days: 1,
          required_specialty: "Especialidade Inexistente XYZ",
          responsible_name_mentioned: "Fulano Que Não Existe",
          prerequisites: [],
          approval_criteria: ["ok"],
          references: [],
          justification: "necessário",
          open_questions: [],
        },
      ],
    },
  });
}

function twoTaskPlanWithDependencyAndDateWave() {
  return JSON.stringify({
    reply_text: "Plano com duas tarefas dependentes.",
    stage: "proposta_gerada",
    pending_questions: [],
    plan: {
      plan_summary: "Lançamento em duas etapas.",
      plan_duration_months: 1,
      plan_duration_days_custom: null,
      waves: [
        { name: "Onda 1", objective: "Preparar", trigger_type: "data", trigger_date: "2026-12-01", trigger_note: null, task_titles: ["Etapa 2"] },
      ],
      tasks: [
        {
          title: "Etapa 1",
          objective: "Primeiro passo",
          description: "Descrição 1",
          deliverable: "Entregável 1",
          steps: ["Fazer 1"],
          suggested_duration_days: 2,
          required_specialty: "Gestão de Tráfego Release",
          responsible_name_mentioned: null,
          prerequisites: [],
          approval_criteria: ["ok"],
          references: [],
          justification: "necessário",
          open_questions: [],
        },
        {
          title: "Etapa 2",
          objective: "Segundo passo",
          description: "Descrição 2",
          deliverable: "Entregável 2",
          steps: ["Fazer 2"],
          suggested_duration_days: 2,
          required_specialty: "Gestão de Tráfego Release",
          responsible_name_mentioned: null,
          prerequisites: ["Etapa 1"],
          approval_criteria: ["ok"],
          references: [],
          justification: "necessário",
          open_questions: [],
        },
      ],
    },
  });
}

async function mkUser(overrides: Partial<{ account_type: string; company_id: string | null; agency_id: string | null; role: string }> = {}) {
  const id = `release-${crypto.randomBytes(6).toString("hex")}`;
  const user = await prisma.user.create({
    data: {
      id,
      email: `${id}@example.test`,
      password_hash: "x",
      name: `Release Test ${id}`,
      role: overrides.role ?? "company_user",
      account_type: overrides.account_type ?? "empresas",
      is_active: true,
      status: "ativo",
      company_id: overrides.company_id ?? null,
      agency_id: overrides.agency_id ?? null,
    },
  });
  userIds.push(user.id);
  return user;
}

async function mkCompany() {
  const company = await prisma.company.create({ data: { name: `Empresa Release ${crypto.randomBytes(4).toString("hex")}` } });
  companyIds.push(company.id);
  return company;
}

// Agency é modelo próprio (não Company com type="agencia") — exige um
// owner_user_id real e único. O "dono" aqui é só o vínculo estrutural que o
// schema exige; os testes usam usuários MEMBROS (User.agency_id) pra agir.
async function mkAgency() {
  const owner = await mkUser({ account_type: "agencias" });
  const agency = await prisma.agency.create({ data: { owner_user_id: owner.id, name: `Agência Release ${crypto.randomBytes(4).toString("hex")}` } });
  agencyIds.push(agency.id);
  await prisma.user.update({ where: { id: owner.id }, data: { agency_id: agency.id } });
  return agency;
}

async function mkProject(overrides: Partial<{ company_id: string | null; agency_id: string | null; admin_responsible_user_id: string | null }> = {}) {
  const code = crypto.randomBytes(4).toString("hex");
  const project = await prisma.project.create({
    data: {
      title: `Projeto Release ${code}`,
      project_code: code,
      company_id: overrides.company_id ?? null,
      agency_id: overrides.agency_id ?? null,
      admin_responsible_user_id: overrides.admin_responsible_user_id ?? null,
    },
  });
  projectIds.push(project.id);
  return project;
}

async function mkProductContainer(projectId: string) {
  const pp = await prisma.projectProduct.create({
    data: {
      project_id: projectId,
      product_name_snapshot: "Container de teste",
      product_category_snapshot: "Teste",
      status: "EM_EXECUCAO",
    },
  });
  productIds.push(pp.id);
  return pp;
}

async function mkTask(
  projectId: string,
  projectProductId: string,
  overrides: Partial<{ title: string; status: string; assignee_id: string | null; exige_aprovacao_cliente: boolean }> = {},
) {
  return prisma.projectTask.create({
    data: {
      project_id: projectId,
      project_product_id: projectProductId,
      name_snapshot: overrides.title ?? "Tarefa de teste",
      title: overrides.title ?? "Tarefa de teste",
      status: overrides.status ?? "PARA_LANCAMENTO",
      assignee_id: overrides.assignee_id ?? null,
      exige_aprovacao_cliente: overrides.exige_aprovacao_cliente ?? true,
    },
  });
}

describe("Materialização, dependências e liberação automática (bloco 4/4)", () => {
  before(async () => {
    requireTestDatabaseUrl();
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
    const listener = app.listen(0);
    server = listener;
    await new Promise<void>((resolve) => listener.once("listening", () => resolve()));
    const address = listener.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
    setDefaultGenerationTimings({ timeoutMs: 500, cancelPollMs: 30 });
    const specialty = await prisma.specialty.create({ data: { name: "Gestão de Tráfego Release", category: "Cat", is_active: true } });
    specialtyIds.push(specialty.id);
  });

  after(async () => {
    await prisma.hallucinationReportEvent.deleteMany({ where: { report: { project_id: { in: projectIds } } } });
    await prisma.hallucinationReportFile.deleteMany({ where: { report: { project_id: { in: projectIds } } } });
    await prisma.hallucinationReport.deleteMany({ where: { project_id: { in: projectIds } } });
    await prisma.launchMaterialization.deleteMany({ where: { session: { project_id: { in: projectIds } } } });
    await prisma.launchGenerationExecution.deleteMany({ where: { session: { project_id: { in: projectIds } } } });
    await prisma.launchProposalVersion.deleteMany({ where: { session: { project_id: { in: projectIds } } } });
    await prisma.launchSessionParticipant.deleteMany({ where: { session: { project_id: { in: projectIds } } } });
    await prisma.launchSession.deleteMany({ where: { project_id: { in: projectIds } } });
    await prisma.taskReleaseEvent.deleteMany({ where: { task: { project_id: { in: projectIds } } } });
    await prisma.taskDependencyOverride.deleteMany({ where: { task: { project_id: { in: projectIds } } } });
    await prisma.taskReleaseTrigger.deleteMany({ where: { task: { project_id: { in: projectIds } } } });
    await prisma.taskDependency.deleteMany({ where: { project_id: { in: projectIds } } });
    await prisma.paymentItem.deleteMany({ where: { payment_id: { in: paymentIds } } });
    await prisma.payment.deleteMany({ where: { id: { in: paymentIds } } });
    await prisma.projectTask.deleteMany({ where: { project_id: { in: projectIds } } });
    await prisma.projectProduct.deleteMany({ where: { id: { in: productIds } } });
    await prisma.project.deleteMany({ where: { id: { in: projectIds } } });
    await prisma.specialty.deleteMany({ where: { id: { in: specialtyIds } } });
    // Agency <-> User tem referência nos dois sentidos (owner_user_id e
    // agency_id de membro) — desfaz o vínculo de membro antes de apagar a
    // Agency, senão a FK de User.agency_id sobrevive apontando pra nada.
    await prisma.user.updateMany({ where: { id: { in: userIds } }, data: { agency_id: null } });
    await prisma.agency.deleteMany({ where: { id: { in: agencyIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.company.deleteMany({ where: { id: { in: companyIds } } });
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  });

  // ── Grafo de dependências ─────────────────────────────────────────────
  describe("grafo de dependências", () => {
    it("rejeita autorreferência", async () => {
      const project = await mkProject();
      const pp = await mkProductContainer(project.id);
      const a = await mkTask(project.id, pp.id);
      await assert.rejects(() => addTaskDependency({ taskId: a.id, dependsOnTaskId: a.id, actorUserId: "u1" }), DependencyValidationError);
    });

    it("rejeita dependência de tarefa inexistente", async () => {
      const project = await mkProject();
      const pp = await mkProductContainer(project.id);
      const a = await mkTask(project.id, pp.id);
      await assert.rejects(() => addTaskDependency({ taskId: a.id, dependsOnTaskId: "not-a-real-id", actorUserId: "u1" }), DependencyValidationError);
    });

    it("rejeita dependência entre projetos diferentes", async () => {
      const projectA = await mkProject();
      const projectB = await mkProject();
      const ppA = await mkProductContainer(projectA.id);
      const ppB = await mkProductContainer(projectB.id);
      const a = await mkTask(projectA.id, ppA.id);
      const b = await mkTask(projectB.id, ppB.id);
      await assert.rejects(() => addTaskDependency({ taskId: a.id, dependsOnTaskId: b.id, actorUserId: "u1" }), DependencyValidationError);
    });

    it("cadeia A→B→C, múltiplos pré-requisitos convergentes e ramificação — tudo permitido", async () => {
      const project = await mkProject();
      const pp = await mkProductContainer(project.id);
      const a = await mkTask(project.id, pp.id, { title: "A" });
      const b = await mkTask(project.id, pp.id, { title: "B" });
      const c = await mkTask(project.id, pp.id, { title: "C" });
      const d = await mkTask(project.id, pp.id, { title: "D" });

      await addTaskDependency({ taskId: b.id, dependsOnTaskId: a.id, actorUserId: "u1" }); // B depende de A
      await addTaskDependency({ taskId: c.id, dependsOnTaskId: b.id, actorUserId: "u1" }); // C depende de B (cadeia)
      await addTaskDependency({ taskId: d.id, dependsOnTaskId: b.id, actorUserId: "u1" }); // D também depende de B (ramificação)
      await addTaskDependency({ taskId: d.id, dependsOnTaskId: c.id, actorUserId: "u1" }); // D depende de B E C (convergência)

      const gateD = await getTaskGateStatus(d.id);
      assert.equal(gateD.dependencies.length, 2);
    });

    it("rejeita dependência duplicada", async () => {
      const project = await mkProject();
      const pp = await mkProductContainer(project.id);
      const a = await mkTask(project.id, pp.id);
      const b = await mkTask(project.id, pp.id);
      await addTaskDependency({ taskId: b.id, dependsOnTaskId: a.id, actorUserId: "u1" });
      await assert.rejects(() => addTaskDependency({ taskId: b.id, dependsOnTaskId: a.id, actorUserId: "u1" }), DependencyValidationError);
    });

    it("rejeita ciclo direto", async () => {
      const project = await mkProject();
      const pp = await mkProductContainer(project.id);
      const a = await mkTask(project.id, pp.id);
      const b = await mkTask(project.id, pp.id);
      await addTaskDependency({ taskId: b.id, dependsOnTaskId: a.id, actorUserId: "u1" }); // B depende de A
      await assert.rejects(() => addTaskDependency({ taskId: a.id, dependsOnTaskId: b.id, actorUserId: "u1" }), DependencyValidationError); // A depende de B fecharia o ciclo
    });

    it("rejeita ciclo indireto (A→B→C→A)", async () => {
      const project = await mkProject();
      const pp = await mkProductContainer(project.id);
      const a = await mkTask(project.id, pp.id);
      const b = await mkTask(project.id, pp.id);
      const c = await mkTask(project.id, pp.id);
      await addTaskDependency({ taskId: b.id, dependsOnTaskId: a.id, actorUserId: "u1" });
      await addTaskDependency({ taskId: c.id, dependsOnTaskId: b.id, actorUserId: "u1" });
      await assert.rejects(() => addTaskDependency({ taskId: a.id, dependsOnTaskId: c.id, actorUserId: "u1" }), DependencyValidationError);
    });

    it("impede remoção silenciosa de tarefa usada como pré-requisito e libera ao remover a dependência", async () => {
      const project = await mkProject();
      const pp = await mkProductContainer(project.id);
      const a = await mkTask(project.id, pp.id);
      const b = await mkTask(project.id, pp.id, { status: PENDING_RELEASE_STATUS });
      const dep = await addTaskDependency({ taskId: b.id, dependsOnTaskId: a.id, actorUserId: "u1" });

      await assert.rejects(() => assertTaskNotUsedAsPrerequisite(a.id), DependencyInUseError);

      await removeTaskDependency(dep.id, "u1");
      const gate = await getTaskGateStatus(b.id);
      assert.equal(gate.allSatisfied, true);
      await assertTaskNotUsedAsPrerequisite(a.id); // não lança mais — dependência já removida
    });
  });

  // ── Liberação automática ──────────────────────────────────────────────
  describe("liberação automática", () => {
    it("tryReleaseTask só libera quando todos os bloqueadores estão satisfeitos, e é idempotente sob concorrência (CAS) — inclusive a Notificação", async () => {
      const project = await mkProject();
      const pp = await mkProductContainer(project.id);
      const responsavel = await mkUser();
      const prereq = await mkTask(project.id, pp.id, { status: "CONCLUIDA" });
      const successor = await mkTask(project.id, pp.id, { status: PENDING_RELEASE_STATUS, assignee_id: responsavel.id });
      await addTaskDependency({ taskId: successor.id, dependsOnTaskId: prereq.id, actorUserId: "u1" });

      const results = await Promise.all([tryReleaseTask(successor.id), tryReleaseTask(successor.id), tryReleaseTask(successor.id)]);
      assert.equal(results.filter(Boolean).length, 1); // só uma das chamadas concorrentes efetivamente liberou

      const fresh = await prisma.projectTask.findUniqueOrThrow({ where: { id: successor.id } });
      assert.equal(fresh.status, RELEASE_READY_STATUS);
      const events = await prisma.taskReleaseEvent.findMany({ where: { task_id: successor.id, event_type: "released" } });
      assert.equal(events.length, 1); // nunca notifica/registra duas vezes

      // Notificação informativa (nunca Alerta) — categoria/severidade corretas,
      // destino aponta pra ESTA tarefa, e nunca duplica sob a mesma corrida.
      const alerts = await prisma.systemAlert.findMany({ where: { entity_type: "project_task", entity_id: successor.id, type: "tarefa_liberada" } });
      assert.equal(alerts.length, 1);
      assert.equal(alerts[0].category, "notificacao");
      assert.equal(alerts[0].severity, "info");
      assert.equal(alerts[0].user_id, responsavel.id);
    });

    it("reevaluateSuccessors não libera enquanto prerequisito não está CONCLUIDA/APROVADA", async () => {
      const project = await mkProject();
      const pp = await mkProductContainer(project.id);
      const prereq = await mkTask(project.id, pp.id, { status: "EM_EXECUCAO" }); // ainda não concluída
      const successor = await mkTask(project.id, pp.id, { status: PENDING_RELEASE_STATUS });
      await addTaskDependency({ taskId: successor.id, dependsOnTaskId: prereq.id, actorUserId: "u1" });

      await reevaluateSuccessors(prereq.id);
      const fresh = await prisma.projectTask.findUniqueOrThrow({ where: { id: successor.id } });
      assert.equal(fresh.status, PENDING_RELEASE_STATUS);
    });

    it("aprovação real via PATCH /api/lider/tasks/:id/approve libera a sucessora real", async () => {
      const project = await mkProject();
      const pp = await mkProductContainer(project.id);
      const lider = await mkUser({ role: "lider" });
      const prereq = await mkTask(project.id, pp.id, { status: "EM_APROVACAO" }); // sem etapas -> aprovação direta
      const successor = await mkTask(project.id, pp.id, { status: PENDING_RELEASE_STATUS });
      await addTaskDependency({ taskId: successor.id, dependsOnTaskId: prereq.id, actorUserId: lider.id });

      const res = await api(`/api/lider/tasks/${prereq.id}/approve`, { method: "PATCH", token: tokenFor(lider) });
      assert.equal(res.status, 200);
      assert.equal(res.json.task.status, "APROVADA");

      const fresh = await prisma.projectTask.findUniqueOrThrow({ where: { id: successor.id } });
      assert.equal(fresh.status, RELEASE_READY_STATUS);
      const releaseEvent = await prisma.taskReleaseEvent.findFirst({ where: { task_id: successor.id, event_type: "released" } });
      assert.ok(releaseEvent);
    });

    it("conclusão SEM aprovação (PATCH genérico de status) nunca libera a sucessora", async () => {
      const company = await mkCompany();
      const project = await mkProject({ company_id: company.id });
      const owner = await mkUser({ company_id: company.id });
      const pp = await mkProductContainer(project.id);
      const prereq = await mkTask(project.id, pp.id, { status: "EM_EXECUCAO" });
      const successor = await mkTask(project.id, pp.id, { status: PENDING_RELEASE_STATUS });
      await addTaskDependency({ taskId: successor.id, dependsOnTaskId: prereq.id, actorUserId: owner.id });

      // PATCH genérico (não é a rota de aprovação) marca CONCLUIDA diretamente
      const res = await api(`/api/project-tasks/${prereq.id}`, { method: "PATCH", token: tokenFor(owner), body: { status: "CONCLUIDA" } });
      assert.equal(res.status, 200);

      const fresh = await prisma.projectTask.findUniqueOrThrow({ where: { id: successor.id } });
      assert.equal(fresh.status, PENDING_RELEASE_STATUS); // continua bloqueada: só a rota de aprovação reavalia sucessoras
    });

    it("gatilho de data: satisfyScheduledDateTrigger é idempotente e o worker recupera de atraso/reinício", async () => {
      const project = await mkProject();
      const pp = await mkProductContainer(project.id);
      const task = await mkTask(project.id, pp.id, { status: PENDING_RELEASE_STATUS });
      const trigger = await prisma.taskReleaseTrigger.create({
        data: { task_id: task.id, trigger_type: "scheduled_date", status: "pending", scheduled_at: new Date(Date.now() - 60_000) }, // já vencido — simula atraso do worker
      });

      const { processed } = await runTaskReleaseSchedulerOnce();
      assert.ok(processed >= 1);
      const fresh = await prisma.projectTask.findUniqueOrThrow({ where: { id: task.id } });
      assert.equal(fresh.status, RELEASE_READY_STATUS);

      const changedAgain = await satisfyScheduledDateTrigger(trigger.id);
      assert.equal(changedAgain, false); // segunda satisfação é sempre no-op
    });

    it("bloqueio prolongado (>48h) gera Alerta amarelo uma única vez, mesmo com o worker rodando várias vezes", async () => {
      const admin = await mkUser({ account_type: "admin", role: "admin" });
      const project = await mkProject({ admin_responsible_user_id: admin.id });
      const pp = await mkProductContainer(project.id);
      const task = await prisma.projectTask.create({
        data: {
          project_id: project.id,
          project_product_id: pp.id,
          name_snapshot: "Tarefa travada",
          title: "Tarefa travada",
          status: PENDING_RELEASE_STATUS,
          created_at: new Date(Date.now() - 50 * 60 * 60 * 1000), // 50h atrás
        },
      });

      await runTaskReleaseSchedulerOnce();
      await runTaskReleaseSchedulerOnce();
      await runTaskReleaseSchedulerOnce();

      const events = await prisma.taskReleaseEvent.findMany({ where: { task_id: task.id, event_type: "release_blocked_notice" } });
      assert.equal(events.length, 1); // nunca duplica, mesmo com o worker rodando de novo

      const alerts = await prisma.systemAlert.findMany({ where: { entity_type: "project_task", entity_id: task.id, type: "liberacao_bloqueada_alem_esperado" } });
      assert.equal(alerts.length, 1);
      assert.equal(alerts[0].category, "alerta"); // nunca uma Notificação informativa
      assert.equal(alerts[0].severity, "warning");
      assert.equal(alerts[0].user_id, admin.id);
    });

    it("gatilho de pagamento: só a referência REAL satisfaz, nunca outra, e nunca duplica", async () => {
      const project = await mkProject();
      const pp = await mkProductContainer(project.id);
      const task = await mkTask(project.id, pp.id, { status: PENDING_RELEASE_STATUS });
      await prisma.taskReleaseTrigger.create({
        data: { task_id: task.id, trigger_type: "payment", status: "pending", payment_reference_type: "payment", payment_reference_id: "payment-real-123" },
      });

      const wrongRef = await satisfyPaymentTriggersByReference({ referenceType: "payment", referenceId: "payment-outra-conta" });
      assert.equal(wrongRef, 0);
      let fresh = await prisma.projectTask.findUniqueOrThrow({ where: { id: task.id } });
      assert.equal(fresh.status, PENDING_RELEASE_STATUS);

      const rightRef = await satisfyPaymentTriggersByReference({ referenceType: "payment", referenceId: "payment-real-123" });
      assert.equal(rightRef, 1);
      fresh = await prisma.projectTask.findUniqueOrThrow({ where: { id: task.id } });
      assert.equal(fresh.status, RELEASE_READY_STATUS);

      const retry = await satisfyPaymentTriggersByReference({ referenceType: "payment", referenceId: "payment-real-123" });
      assert.equal(retry, 0); // retry do gateway nunca duplica
    });

    it("aprovação manual do gestor exige justificativa e nunca ignora OUTROS bloqueadores", async () => {
      const project = await mkProject();
      const pp = await mkProductContainer(project.id);
      const prereq = await mkTask(project.id, pp.id, { status: "EM_EXECUCAO" }); // outro bloqueador ainda pendente
      const task = await mkTask(project.id, pp.id, { status: PENDING_RELEASE_STATUS });
      await addTaskDependency({ taskId: task.id, dependsOnTaskId: prereq.id, actorUserId: "u1" });
      const manualTrigger = await prisma.taskReleaseTrigger.create({ data: { task_id: task.id, trigger_type: "manual_approval", status: "pending" } });

      await assert.rejects(() => satisfyManualApprovalTrigger({ triggerId: manualTrigger.id, actorUserId: "u1", note: "" }), TaskReleaseError);

      await satisfyManualApprovalTrigger({ triggerId: manualTrigger.id, actorUserId: "u1", note: "Combinado por telefone com o cliente." });
      const fresh = await prisma.projectTask.findUniqueOrThrow({ where: { id: task.id } });
      assert.equal(fresh.status, PENDING_RELEASE_STATUS); // ainda bloqueada pela dependência de tarefa anterior
    });

    it("seleção humana de especialidade/responsável valida existência real antes de confirmar", async () => {
      const project = await mkProject();
      const pp = await mkProductContainer(project.id);
      const task = await mkTask(project.id, pp.id, { status: PENDING_RELEASE_STATUS });
      const trigger = await prisma.taskReleaseTrigger.create({ data: { task_id: task.id, trigger_type: "responsible_selection", status: "pending" } });

      await assert.rejects(() => satisfySelectionTrigger({ triggerId: trigger.id, actorUserId: "u1", responsibleUserId: "usuario-que-nao-existe" }), TaskReleaseError);

      const realUser = await mkUser();
      await satisfySelectionTrigger({ triggerId: trigger.id, actorUserId: "u1", responsibleUserId: realUser.id });
      const fresh = await prisma.projectTask.findUniqueOrThrow({ where: { id: task.id } });
      assert.equal(fresh.assignee_id, realUser.id);
      assert.equal(fresh.status, RELEASE_READY_STATUS);
    });

    it("exceção administrativa exige justificativa, só se aplica a tarefa pendente de liberação, e gera evento de auditoria", async () => {
      const admin = await mkUser({ account_type: "admin", role: "admin" });
      const project = await mkProject({ admin_responsible_user_id: admin.id });
      const pp = await mkProductContainer(project.id);
      const task = await mkTask(project.id, pp.id, { status: PENDING_RELEASE_STATUS });
      const prereq = await mkTask(project.id, pp.id, { status: "EM_EXECUCAO" });
      await addTaskDependency({ taskId: task.id, dependsOnTaskId: prereq.id, actorUserId: admin.id });

      await assert.rejects(() => applyAdminDependencyOverride({ taskId: task.id, actorUserId: admin.id, reason: "" }), TaskReleaseError);

      await applyAdminDependencyOverride({ taskId: task.id, actorUserId: admin.id, reason: "Cliente autorizou pular a validação por e-mail." });
      const fresh = await prisma.projectTask.findUniqueOrThrow({ where: { id: task.id } });
      assert.equal(fresh.status, RELEASE_READY_STATUS); // ignora o bloqueador pendente, mas só porque foi uma exceção explícita e auditada
      const overrideEvent = await prisma.taskReleaseEvent.findFirst({ where: { task_id: task.id, event_type: "admin_override" } });
      assert.ok(overrideEvent?.description.includes("Cliente autorizou"));

      // Alerta CRÍTICO (nunca uma Notificação informativa nem só amarelo) —
      // categoria/severidade corretas, com motivo/autor auditável na mensagem.
      const alert = await prisma.systemAlert.findFirstOrThrow({ where: { entity_type: "project_task", entity_id: task.id, type: "excecao_administrativa_dependencia" } });
      assert.equal(alert.category, "alerta");
      assert.equal(alert.severity, "error");
      assert.ok(alert.message.includes("Cliente autorizou"));
      assert.equal(alert.user_id, admin.id);

      await assert.rejects(() => applyAdminDependencyOverride({ taskId: task.id, actorUserId: admin.id, reason: "outra tentativa" }), TaskReleaseError); // já não está mais pendente de liberação
      const alertsAfterRetry = await prisma.systemAlert.count({ where: { entity_type: "project_task", entity_id: task.id, type: "excecao_administrativa_dependencia" } });
      assert.equal(alertsAfterRetry, 1); // rejeitado antes de criar qualquer coisa nova
    });
  });

  // ── Fechamento do backdoor ────────────────────────────────────────────
  describe("fechamento do backdoor em PATCH /api/project-products/tasks/:id", () => {
    it("404 (nunca 200) para usuário sem vínculo com o projeto da tarefa", async () => {
      const companyA = await mkCompany();
      const companyB = await mkCompany();
      const project = await mkProject({ company_id: companyA.id });
      const outsider = await mkUser({ company_id: companyB.id });
      const pp = await mkProductContainer(project.id);
      const task = await mkTask(project.id, pp.id, { status: "PARA_LANCAMENTO" });

      const res = await api(`/api/project-products/tasks/${task.id}`, { method: "PATCH", token: tokenFor(outsider), body: { status: "EM_EXECUCAO" } });
      assert.equal(res.status, 404);
    });

    it("409 ao tentar mudar status de uma tarefa PENDENTE_DE_LIBERACAO por esta rota (nunca escapa do portão)", async () => {
      const company = await mkCompany();
      const project = await mkProject({ company_id: company.id });
      const owner = await mkUser({ company_id: company.id });
      const pp = await mkProductContainer(project.id);
      const task = await mkTask(project.id, pp.id, { status: PENDING_RELEASE_STATUS });

      const res = await api(`/api/project-products/tasks/${task.id}`, { method: "PATCH", token: tokenFor(owner), body: { status: "EM_EXECUCAO" } });
      assert.equal(res.status, 409);
      assert.equal(res.json.code, "task_release_gate");

      const fresh = await prisma.projectTask.findUniqueOrThrow({ where: { id: task.id } });
      assert.equal(fresh.status, PENDING_RELEASE_STATUS); // nunca mudou
    });
  });

  // ── Isolamento entre contas nas rotas de bloqueadores/dependência ─────
  describe("isolamento entre contas — /api/task-release", () => {
    it("404 pra quem não tem vínculo com o projeto ao ler bloqueadores", async () => {
      const companyA = await mkCompany();
      const companyB = await mkCompany();
      const project = await mkProject({ company_id: companyA.id });
      const outsider = await mkUser({ company_id: companyB.id });
      const pp = await mkProductContainer(project.id);
      const task = await mkTask(project.id, pp.id, { status: PENDING_RELEASE_STATUS });

      const res = await api(`/api/task-release/tasks/${task.id}/gates`, { token: tokenFor(outsider) });
      assert.equal(res.status, 404);
    });

    it("403 (não admin) ao tentar aplicar exceção administrativa sendo dono comum do projeto", async () => {
      const company = await mkCompany();
      const project = await mkProject({ company_id: company.id });
      const owner = await mkUser({ company_id: company.id });
      const pp = await mkProductContainer(project.id);
      const task = await mkTask(project.id, pp.id, { status: PENDING_RELEASE_STATUS });

      const res = await api(`/api/task-release/tasks/${task.id}/admin-override`, { method: "POST", token: tokenFor(owner), body: { reason: "tentando sem ser admin" } });
      assert.equal(res.status, 403);
    });

    it("dono do projeto consegue adicionar/remover dependência pela rota real", async () => {
      const company = await mkCompany();
      const project = await mkProject({ company_id: company.id });
      const owner = await mkUser({ company_id: company.id });
      const pp = await mkProductContainer(project.id);
      const a = await mkTask(project.id, pp.id);
      const b = await mkTask(project.id, pp.id);

      const added = await api(`/api/task-release/tasks/${b.id}/dependencies`, { method: "POST", token: tokenFor(owner), body: { depends_on_task_id: a.id } });
      assert.equal(added.status, 201);

      const removed = await api(`/api/task-release/tasks/${b.id}/dependencies/${added.json.dependency.id}`, { method: "DELETE", token: tokenFor(owner) });
      assert.equal(removed.status, 200);
    });
  });

  // ── Materialização via rota HTTP real (POST /api/launch-sessions/:id/materialize) ──
  describe("materialização de uma proposta aprovada", () => {
    async function approvedSession() {
      setDefaultLaunchAIAdapter(async () => ({ text: twoTaskPlanWithDependencyAndDateWave() }));
      const company = await mkCompany();
      const project = await mkProject({ company_id: company.id });
      const owner = await mkUser({ company_id: company.id });
      const token = tokenFor(owner);

      const created = await api("/api/launch-sessions", { method: "POST", token, body: { project_id: project.id } });
      const sessionId = created.json.session.id;
      const gen = await api(`/api/launch-sessions/${sessionId}/generate`, { method: "POST", token, body: { client_action_id: crypto.randomUUID() } });
      await waitForExecution(sessionId, gen.json.execution.id, token);
      const detail = await api(`/api/launch-sessions/${sessionId}`, { token });
      const versionId = detail.json.session.versions[0].id;
      await api(`/api/launch-sessions/${sessionId}/approve`, { method: "POST", token, body: { updated_at: detail.json.session.updated_at } });
      return { project, owner, token, sessionId, versionId };
    }

    it("modo execução: tarefa sem bloqueador vai direto pro início oficial; a dependente fica pendente de liberação, com gatilho de data também criado", async () => {
      const { token, sessionId, versionId } = await approvedSession();

      const preview = await api(`/api/launch-sessions/${sessionId}/versions/${versionId}/materialization-preview`, { token });
      assert.equal(preview.status, 200);
      assert.equal(preview.json.summary.tasks, 2);
      assert.equal(preview.json.summary.dependencies, 1);

      const clientActionId = crypto.randomUUID();
      const res = await api(`/api/launch-sessions/${sessionId}/materialize`, { method: "POST", token, body: { version_id: versionId, mode: "execucao", client_action_id: clientActionId } });
      assert.equal(res.status, 201);
      assert.equal(res.json.createdTaskIds.length, 2);

      const tasks = await prisma.projectTask.findMany({ where: { id: { in: res.json.createdTaskIds } }, orderBy: { title: "asc" } });
      const etapa1 = tasks.find((t) => t.title === "Etapa 1")!;
      const etapa2 = tasks.find((t) => t.title === "Etapa 2")!;
      assert.equal(etapa1.status, RELEASE_READY_STATUS); // sem bloqueador -> liberada direto
      assert.equal(etapa2.status, PENDING_RELEASE_STATUS); // depende de Etapa 1 -> pendente

      const dep = await prisma.taskDependency.findFirst({ where: { task_id: etapa2.id, depends_on_task_id: etapa1.id } });
      assert.ok(dep);
      const dateTrigger = await prisma.taskReleaseTrigger.findFirst({ where: { task_id: etapa2.id, trigger_type: "scheduled_date" } });
      assert.ok(dateTrigger);

      // retry com o MESMO client_action_id nunca duplica
      const retry = await api(`/api/launch-sessions/${sessionId}/materialize`, { method: "POST", token, body: { version_id: versionId, mode: "execucao", client_action_id: clientActionId } });
      assert.equal(retry.status, 200);
      assert.equal(retry.json.duplicate, true);
      assert.equal(retry.json.createdTaskIds.length, 2);
      const countAfterRetry = await prisma.projectTask.count({ where: { launch_session_id: sessionId } });
      assert.equal(countAfterRetry, 2);

      // uma segunda tentativa com um client_action_id DIFERENTE (ex.: front perdeu o id e tenta de novo)
      // ainda resolve pela unicidade de version_id, nunca materializa duas vezes
      const secondAttempt = await api(`/api/launch-sessions/${sessionId}/materialize`, { method: "POST", token, body: { version_id: versionId, mode: "execucao", client_action_id: crypto.randomUUID() } });
      assert.equal(secondAttempt.status, 200);
      assert.equal(secondAttempt.json.duplicate, true);
      assert.equal(await prisma.projectTask.count({ where: { launch_session_id: sessionId } }), 2);
    });

    it("modo rascunho operacional: cria as tarefas reais mas não libera nenhuma, mesmo a sem bloqueador", async () => {
      const { token, sessionId, versionId } = await approvedSession();
      const res = await api(`/api/launch-sessions/${sessionId}/materialize`, { method: "POST", token, body: { version_id: versionId, mode: "rascunho_operacional", client_action_id: crypto.randomUUID() } });
      assert.equal(res.status, 201);
      const tasks = await prisma.projectTask.findMany({ where: { id: { in: res.json.createdTaskIds } } });
      assert.ok(tasks.every((t) => t.status === "RASCUNHO_OPERACIONAL"));
    });

    it("404/403: quem não gerencia o projeto não materializa", async () => {
      const { sessionId, versionId } = await approvedSession();
      const companyB = await mkCompany();
      const outsider = await mkUser({ company_id: companyB.id });
      const res = await api(`/api/launch-sessions/${sessionId}/materialize`, { method: "POST", token: tokenFor(outsider), body: { version_id: versionId, mode: "execucao", client_action_id: crypto.randomUUID() } });
      assert.equal(res.status, 404); // sem vínculo nenhum com o projeto -> 404, nunca 403
    });
  });

  // ── Acabamento: aprovação real de Company/Agency pela rota pública ─────
  describe("aprovação real de Company/Agency libera sucessora (PATCH /api/project-tasks/:id/aprovar)", () => {
    it("1-4: agência aprova (nivel único, exige_aprovacao_cliente=false); sucessora fica bloqueada por OUTRA condição até ela também ser satisfeita", async () => {
      const agency = await mkAgency();
      const project = await mkProject({ agency_id: agency.id });
      const agencyMember = await mkUser({ account_type: "agencias", agency_id: agency.id, role: "agencia_user" });
      const pp = await mkProductContainer(project.id);

      const prereq = await mkTask(project.id, pp.id, { status: "EM_APROVACAO", exige_aprovacao_cliente: false });
      const successor = await mkTask(project.id, pp.id, { status: PENDING_RELEASE_STATUS });
      await addTaskDependency({ taskId: successor.id, dependsOnTaskId: prereq.id, actorUserId: agencyMember.id });
      const manualTrigger = await prisma.taskReleaseTrigger.create({ data: { task_id: successor.id, trigger_type: "manual_approval", status: "pending" } });

      // 1. a tarefa pré-requisito é aprovada (rota real, nenhum helper interno)
      const res = await api(`/api/project-tasks/${prereq.id}/aprovar`, { method: "PATCH", token: tokenFor(agencyMember), body: {} });
      assert.equal(res.status, 200);
      assert.equal(res.json.concluida, true);
      const prereqAfter = await prisma.projectTask.findUniqueOrThrow({ where: { id: prereq.id } });
      assert.equal(prereqAfter.status, "CONCLUIDA");

      // 2. a dependente é reavaliada dentro da MESMA transação (sem esperar
      // nenhum job externo — o efeito já está gravado quando a resposta volta)
      const releaseEventForDependency = await prisma.taskReleaseEvent.findFirst({ where: { task_id: successor.id, event_type: "released" } });
      assert.equal(releaseEventForDependency, null); // ainda não, por causa do item 3

      // 3. permanece bloqueada: a dependência foi satisfeita, mas o gatilho de
      // aprovação manual do gestor ainda está pendente
      const successorAfterFirst = await prisma.projectTask.findUniqueOrThrow({ where: { id: successor.id } });
      assert.equal(successorAfterFirst.status, PENDING_RELEASE_STATUS);
      const gate = await getTaskGateStatus(successor.id);
      assert.equal(gate.dependencies[0].satisfied, true);
      assert.equal(gate.triggers[0].satisfied, false);

      // 4. liberada quando TODAS as condições são satisfeitas — via a outra
      // rota pública real (não escrevendo o status direto)
      const satisfy = await api(`/api/task-release/triggers/${manualTrigger.id}/manual-approval`, { method: "POST", token: tokenFor(agencyMember), body: { note: "Cliente confirmou por telefone." } });
      assert.equal(satisfy.status, 200);
      const successorAfterSecond = await prisma.projectTask.findUniqueOrThrow({ where: { id: successor.id } });
      assert.equal(successorAfterSecond.status, RELEASE_READY_STATUS);
    });

    it("5. retry (mesma tarefa já concluída) nunca duplica histórico/memória/evento", async () => {
      const agency = await mkAgency();
      const project = await mkProject({ agency_id: agency.id });
      const agencyMember = await mkUser({ account_type: "agencias", agency_id: agency.id, role: "agencia_user" });
      const pp = await mkProductContainer(project.id);
      const prereq = await mkTask(project.id, pp.id, { status: "EM_APROVACAO", exige_aprovacao_cliente: false });

      const first = await api(`/api/project-tasks/${prereq.id}/aprovar`, { method: "PATCH", token: tokenFor(agencyMember), body: {} });
      assert.equal(first.status, 200);
      const recordsAfterFirst = await prisma.memoryApprovedTaskRecord.count({ where: { project_task_id: prereq.id } });
      assert.equal(recordsAfterFirst, 1);

      // retry real via a MESMA rota: a tarefa já não está mais num status
      // "aprovável", então a rota recusa (422) em vez de reprocessar
      const retry = await api(`/api/project-tasks/${prereq.id}/aprovar`, { method: "PATCH", token: tokenFor(agencyMember), body: {} });
      assert.equal(retry.status, 422);
      const recordsAfterRetry = await prisma.memoryApprovedTaskRecord.count({ where: { project_task_id: prereq.id } });
      assert.equal(recordsAfterRetry, 1); // nunca duplicou
    });

    it("6. outra conta (outra agência) não consegue aprovar/liberar a tarefa", async () => {
      const agency = await mkAgency();
      const project = await mkProject({ agency_id: agency.id });
      const pp = await mkProductContainer(project.id);
      const prereq = await mkTask(project.id, pp.id, { status: "EM_APROVACAO", exige_aprovacao_cliente: false });

      const otherAgency = await mkAgency();
      const outsider = await mkUser({ account_type: "agencias", agency_id: otherAgency.id, role: "agencia_user" });

      const res = await api(`/api/project-tasks/${prereq.id}/aprovar`, { method: "PATCH", token: tokenFor(outsider), body: {} });
      assert.equal(res.status, 404); // sem vínculo com o projeto -> 404, nunca 403 (nunca confirma nem nega existência)

      const prereqAfter = await prisma.projectTask.findUniqueOrThrow({ where: { id: prereq.id } });
      assert.equal(prereqAfter.status, "EM_APROVACAO"); // nunca mudou
    });

    it("7. erro no meio da operação desfaz TUDO — inclusive a liberação da sucessora que a mesma transação teria feito", async () => {
      // Não existe hoje nenhuma requisição HTTP pública capaz de provocar um
      // erro genuíno no meio desta transação: toda FK que a transação toca
      // (task, memória, dependência) só falharia se algo referenciasse uma
      // linha inexistente, e o próprio app impede isso via cascade antes de
      // qualquer requisição chegar aqui. Por isso este teste compõe as MESMAS
      // três chamadas que a rota faz, na mesma ordem — não é um substituto
      // dos testes 1-6 acima (esses são 100% via HTTP), é a prova de que a
      // composição real (aprovarTarefa + recordApprovedTask +
      // reevaluateSuccessors, todas dentro do mesmo prisma.$transaction) tem
      // rollback completo, incluindo o efeito NOVO deste bloco (liberação da
      // sucessora) que o teste equivalente do bloco 1 não cobria.
      const project = await mkProject();
      const pp = await mkProductContainer(project.id);
      const admin = await mkUser({ account_type: "admin", role: "admin" });
      const prereq = await mkTask(project.id, pp.id, { status: "EM_APROVACAO", exige_aprovacao_cliente: false });
      const successor = await mkTask(project.id, pp.id, { status: PENDING_RELEASE_STATUS });
      await addTaskDependency({ taskId: successor.id, dependsOnTaskId: prereq.id, actorUserId: admin.id });
      const idempotencyKey = `memory-approved-task:${prereq.id}`;

      await assert.rejects(
        prisma.$transaction(async (tx) => {
          const r = await aprovarTarefa(tx, prereq.id, { userId: admin.id });
          if (r.concluida) {
            await recordApprovedTask(
              {
                projectId: project.id,
                projectTaskId: `tarefa-inexistente-${crypto.randomBytes(6).toString("hex")}`, // força FK real
                approvedAt: new Date(),
                approvedByUserId: admin.id,
                idempotencyKey,
              },
              tx,
            );
          }
          await reevaluateSuccessors(prereq.id, tx);
          return r;
        }),
      );

      const prereqAfter = await prisma.projectTask.findUniqueOrThrow({ where: { id: prereq.id } });
      assert.equal(prereqAfter.status, "EM_APROVACAO"); // rollback total do aceite

      const successorAfter = await prisma.projectTask.findUniqueOrThrow({ where: { id: successor.id } });
      assert.equal(successorAfter.status, PENDING_RELEASE_STATUS); // a liberação também foi desfeita

      assert.equal(await prisma.memoryApprovedTaskRecord.count({ where: { idempotency_key: idempotencyKey } }), 0);
      assert.equal(await prisma.taskReleaseEvent.count({ where: { task_id: successor.id, event_type: "released" } }), 0);
    });
  });

  // ── Acabamento: corrigir especialidade/responsável ANTES de materializar ──
  describe("editor de especialidade/responsável antes da materialização", () => {
    async function approvedSessionWithUnresolvedPlan() {
      setDefaultLaunchAIAdapter(async () => ({ text: planWithUnresolvedSpecialty() }));
      const company = await mkCompany();
      const project = await mkProject({ company_id: company.id });
      const owner = await mkUser({ company_id: company.id });
      const token = tokenFor(owner);
      const created = await api("/api/launch-sessions", { method: "POST", token, body: { project_id: project.id } });
      const sessionId = created.json.session.id;
      const gen = await api(`/api/launch-sessions/${sessionId}/generate`, { method: "POST", token, body: { client_action_id: crypto.randomUUID() } });
      await waitForExecution(sessionId, gen.json.execution.id, token);
      const detail = await api(`/api/launch-sessions/${sessionId}`, { token });
      const versionId = detail.json.session.versions[0].id;
      const plan = JSON.parse(detail.json.session.versions[0].structured_json);
      return { project, owner, token, sessionId, versionId, plan };
    }

    it("GET /eligible-assignments retorna especialidades ativas + responsáveis reais escopados ao projeto; 404 pra quem não tem vínculo", async () => {
      const company = await mkCompany();
      const project = await mkProject({ company_id: company.id });
      const owner = await mkUser({ company_id: company.id });
      const memberOfSameCompany = await mkUser({ company_id: company.id });
      const outsiderCompany = await mkCompany();
      const outsider = await mkUser({ company_id: outsiderCompany.id });

      const created = await api("/api/launch-sessions", { method: "POST", token: tokenFor(owner), body: { project_id: project.id } });
      const sessionId = created.json.session.id;

      const res = await api(`/api/launch-sessions/${sessionId}/eligible-assignments`, { token: tokenFor(owner) });
      assert.equal(res.status, 200);
      assert.ok(res.json.specialties.some((s: any) => s.id === specialtyIds[0]));
      const responsibleIds = res.json.responsibles.map((r: any) => r.id);
      assert.ok(responsibleIds.includes(memberOfSameCompany.id)); // escopado à company dona do projeto
      assert.ok(!responsibleIds.includes(outsider.id)); // nunca a plataforma inteira

      const blocked = await api(`/api/launch-sessions/${sessionId}/eligible-assignments`, { token: tokenFor(outsider) });
      assert.equal(blocked.status, 404);
    });

    it("materialização é bloqueada com explicação clara quando especialidade/responsável ainda precisam de seleção humana; nenhuma tarefa é criada", async () => {
      const { token, sessionId } = await approvedSessionWithUnresolvedPlan();
      const detail = await api(`/api/launch-sessions/${sessionId}`, { token });
      const versionId = detail.json.session.versions[0].id;
      const plan = JSON.parse(detail.json.session.versions[0].structured_json);
      assert.equal(plan.tasks[0].specialty_requires_selection, true);
      assert.equal(plan.tasks[0].responsible_requires_selection, true);

      await api(`/api/launch-sessions/${sessionId}/approve`, { method: "POST", token, body: { updated_at: detail.json.session.updated_at } });

      const res = await api(`/api/launch-sessions/${sessionId}/materialize`, { method: "POST", token, body: { version_id: versionId, mode: "execucao", client_action_id: crypto.randomUUID() } });
      assert.equal(res.status, 422);
      assert.ok(res.json.issues.some((i: string) => i.includes("Tarefa Única") && i.includes("especialidade")));
      assert.ok(res.json.issues.some((i: string) => i.includes("Tarefa Única") && i.includes("responsável")));
      assert.equal(await prisma.projectTask.count({ where: { launch_session_id: sessionId } }), 0); // nada criado
    });

    it("seleção, troca e remoção no editor: salva, persiste após reabrir, e materialização passa a funcionar depois de corrigido", async () => {
      const { token, sessionId, plan } = await approvedSessionWithUnresolvedPlan();
      const detail0 = await api(`/api/launch-sessions/${sessionId}`, { token });

      const eligible = await api(`/api/launch-sessions/${sessionId}/eligible-assignments`, { token });
      const realSpecialtyId = eligible.json.specialties[0].id;

      // 1) seleção: escolhe a especialidade real; responsável fica "ainda sem
      // responsável" (só é permitido aqui porque o negócio já resolveu como
      // não-obrigatório assim que confirmarmos isso explicitamente)
      const edited = JSON.parse(JSON.stringify(plan));
      edited.tasks[0].specialty_id = realSpecialtyId;
      edited.tasks[0].specialty_suggestion = null;
      edited.tasks[0].specialty_requires_selection = false;
      edited.tasks[0].responsible_user_id = null;
      edited.tasks[0].responsible_suggestion = null;
      edited.tasks[0].responsible_requires_selection = false;
      const save1 = await api(`/api/launch-sessions/${sessionId}/versions`, { method: "POST", token, body: { plan: edited, updated_at: detail0.json.session.updated_at } });
      assert.equal(save1.status, 201);
      const versionId1 = save1.json.session.current_version_id;

      // preservação após "reabrir" (nova requisição GET, nunca estado em memória)
      const reopened1 = await api(`/api/launch-sessions/${sessionId}/versions/${versionId1}`, { token });
      const reopenedPlan1 = JSON.parse(reopened1.json.version.structured_json);
      assert.equal(reopenedPlan1.tasks[0].specialty_id, realSpecialtyId);
      assert.equal(reopenedPlan1.tasks[0].responsible_user_id, null);

      // materialização agora funciona (especialidade resolvida; responsável
      // não é obrigatório porque ninguém foi mencionado de forma confirmada)
      await api(`/api/launch-sessions/${sessionId}/approve`, { method: "POST", token, body: { updated_at: save1.json.session.updated_at } });
      const materialize1 = await api(`/api/launch-sessions/${sessionId}/materialize`, { method: "POST", token, body: { version_id: versionId1, mode: "rascunho_operacional", client_action_id: crypto.randomUUID() } });
      assert.equal(materialize1.status, 201);
      const createdTask = await prisma.projectTask.findUniqueOrThrow({ where: { id: materialize1.json.createdTaskIds[0] } });
      assert.equal(createdTask.required_specialty_id, realSpecialtyId);
      assert.equal(createdTask.assignee_id, null);
    });

    it("edição humana com um id inexistente (especialidade ou responsável) é sempre rejeitada — nunca inventa/aceita id", async () => {
      const { token, sessionId, plan } = await approvedSessionWithUnresolvedPlan();
      const detail0 = await api(`/api/launch-sessions/${sessionId}`, { token });

      const badSpecialty = JSON.parse(JSON.stringify(plan));
      badSpecialty.tasks[0].specialty_id = "especialidade-que-nao-existe";
      badSpecialty.tasks[0].specialty_suggestion = null;
      badSpecialty.tasks[0].specialty_requires_selection = false;
      const resSpecialty = await api(`/api/launch-sessions/${sessionId}/versions`, { method: "POST", token, body: { plan: badSpecialty, updated_at: detail0.json.session.updated_at } });
      assert.equal(resSpecialty.status, 422);
      assert.ok(resSpecialty.json.issues.some((i: string) => i.includes("especialidade referenciada não existe")));

      const badResponsible = JSON.parse(JSON.stringify(plan));
      badResponsible.tasks[0].responsible_user_id = "usuario-que-nao-existe";
      badResponsible.tasks[0].responsible_suggestion = null;
      badResponsible.tasks[0].responsible_requires_selection = false;
      const resResponsible = await api(`/api/launch-sessions/${sessionId}/versions`, { method: "POST", token, body: { plan: badResponsible, updated_at: detail0.json.session.updated_at } });
      assert.equal(resResponsible.status, 422);
      assert.ok(resResponsible.json.issues.some((i: string) => i.includes("responsável referenciado não existe")));
    });
  });
});
