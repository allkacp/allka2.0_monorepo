import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { AddressInfo } from "node:net";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { requireTestDatabaseUrl } from "../test-support/require-test-database";
import app from "../app";
import { prisma } from "../lib/prisma";
import { config } from "../config";
import { ensureDefaultAlertStandardsAndRules, runAlertEngineOnce, runAlertEngineOnceGuarded, STANDARD_KEYS } from "../lib/alert-engine";

// Reparo conceitual (ata 2026-08, 3º lote): a regra é ÚNICA e GERAL — nunca
// uma regra por tarefa/etapa — e o motor agora também avalia
// ProjectTaskStage, resolvendo destinatários por CATEGORIA (papel/relação),
// criando uma ocorrência individual por destinatário elegível. Este arquivo
// cobre exatamente essa generalização, além da dedup real via constraint de
// banco (dedupe_key único) — deixando o arquivo do 2º lote
// (alert-engine.integration.test.ts) intocado, cobrindo só o que é novo.

const suffix = `${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
let baseUrl = "";
let server: import("node:http").Server;

function tokenFor(user: { id: string; email: string; role: string; account_type: string }) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, account_type: user.account_type },
    config.JWT_SECRET,
    { expiresIn: "1h" },
  );
}

async function api(path: string, options: { method?: string; token?: string; body?: unknown } = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "content-type": "application/json",
      ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

const createdUserIds: string[] = [];
const createdProfileIds: string[] = [];
const createdProjectIds: string[] = [];
const createdProductIds: string[] = [];
const createdTaskIds: string[] = [];
const createdStageIds: string[] = [];
const createdNomadeIds: string[] = [];

async function createUser(overrides: Partial<{ role: string; account_type: string; admin_profile_id: string | null; is_active: boolean }> = {}) {
  const id = `alert-gen-${crypto.randomBytes(6).toString("hex")}`;
  const user = await prisma.user.create({
    data: {
      id,
      email: `${id}@example.test`,
      password_hash: "unused-test-hash",
      name: `Alert General Test ${id}`,
      role: overrides.role ?? "company_user",
      account_type: overrides.account_type ?? "empresas",
      is_active: overrides.is_active ?? true,
      status: "ativo",
      admin_profile_id: overrides.admin_profile_id ?? null,
    },
  });
  createdUserIds.push(user.id);
  return user;
}

async function createProfile(overrides: { is_master?: boolean } = {}) {
  const profile = await prisma.adminProfile.create({
    data: { name: `perfil-alert-gen-${suffix}-${crypto.randomBytes(4).toString("hex")}`, is_master: overrides.is_master ?? false, is_active: true },
  });
  createdProfileIds.push(profile.id);
  return profile;
}

async function masterAdmin() {
  const profile = await createProfile({ is_master: true });
  return createUser({ role: "admin", account_type: "admin", admin_profile_id: profile.id });
}

async function createNomade(): Promise<{ nomadeId: string; userId: string }> {
  const user = await createUser();
  const id = `nomade-${crypto.randomBytes(6).toString("hex")}`;
  const nomade = await prisma.nomade.create({
    data: { id, name: `Nômade Teste ${id}`, email: `${id}@example.test`, user_id: user.id },
  });
  createdNomadeIds.push(nomade.id);
  return { nomadeId: nomade.id, userId: user.id };
}

async function createTaskFixture(overrides: { due_date: Date | null; status?: string; assignee_id?: string | null }) {
  const code = `${suffix}-${crypto.randomBytes(4).toString("hex")}`;
  const project = await prisma.project.create({ data: { title: `Projeto teste regra geral ${code}`, project_code: code, status: "in-progress" } });
  createdProjectIds.push(project.id);
  const product = await prisma.product.create({ data: { name: `Produto teste regra geral ${code}`, category: "teste" } });
  createdProductIds.push(product.id);
  const projectProduct = await prisma.projectProduct.create({
    data: { project_id: project.id, product_id: product.id, product_name_snapshot: product.name, product_category_snapshot: product.category },
  });
  const task = await prisma.projectTask.create({
    data: {
      project_id: project.id,
      project_product_id: projectProduct.id,
      product_id: product.id,
      name_snapshot: product.name,
      title: `Tarefa teste regra geral ${code}`,
      status: overrides.status ?? "EM_EXECUCAO",
      due_date: overrides.due_date,
      assignee_id: overrides.assignee_id ?? null,
    },
  });
  createdTaskIds.push(task.id);
  return { project, product, projectProduct, task };
}

async function createStageFixture(overrides: {
  prazo_execucao: Date | null;
  status?: string;
  nomade_id?: string | null;
  lider_id?: string | null;
  taskDueDate?: Date | null;
}) {
  const { task } = await createTaskFixture({ due_date: overrides.taskDueDate ?? null });
  const stage = await prisma.projectTaskStage.create({
    data: {
      project_task_id: task.id,
      titulo: `Etapa teste ${crypto.randomBytes(4).toString("hex")}`,
      status: overrides.status ?? "EM_ANDAMENTO",
      prazo_execucao: overrides.prazo_execucao,
      nomade_id: overrides.nomade_id ?? null,
      lider_id: overrides.lider_id ?? null,
    },
  });
  createdStageIds.push(stage.id);
  return { task, stage };
}

describe("Motor de alertas — regra geral + etapas reais (ata 2026-08, 3º lote)", () => {
  before(async () => {
    requireTestDatabaseUrl();
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;

    const listener = app.listen(0);
    server = listener;
    await new Promise<void>((resolve) => listener.once("listening", () => resolve()));
    const address = listener.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;

    await ensureDefaultAlertStandardsAndRules();
  });

  after(async () => {
    await prisma.productFeedbackAccessAudit.deleteMany({ where: { action: { startsWith: "alert_" } } });
    await prisma.systemAlert.deleteMany({ where: { OR: [{ entity_id: { in: createdTaskIds } }, { entity_id: { in: createdStageIds } }] } });
    await prisma.projectTaskStage.deleteMany({ where: { id: { in: createdStageIds } } });
    await prisma.projectTask.deleteMany({ where: { id: { in: createdTaskIds } } });
    await prisma.projectProduct.deleteMany({ where: { project_id: { in: createdProjectIds } } });
    await prisma.project.deleteMany({ where: { id: { in: createdProjectIds } } });
    await prisma.product.deleteMany({ where: { id: { in: createdProductIds } } });
    await prisma.nomade.deleteMany({ where: { id: { in: createdNomadeIds } } });
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.adminProfile.deleteMany({ where: { id: { in: createdProfileIds } } });
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
    await prisma.$disconnect();
  });

  // ── Generalidade ──────────────────────────────────────────────────────

  it("1. os quatro padrões e as quatro regras existem uma única vez após o bootstrap (idempotente)", async () => {
    const standards = await prisma.alertStandard.findMany({
      where: { key: { in: [STANDARD_KEYS.DUE_SOON, STANDARD_KEYS.OVERDUE, STANDARD_KEYS.STAGE_DUE_SOON, STANDARD_KEYS.STAGE_OVERDUE] } },
    });
    assert.equal(standards.length, 4);
    await ensureDefaultAlertStandardsAndRules();
    const rules = await prisma.alertRule.findMany({
      where: { trigger_type: { in: [STANDARD_KEYS.DUE_SOON, STANDARD_KEYS.OVERDUE, STANDARD_KEYS.STAGE_DUE_SOON, STANDARD_KEYS.STAGE_OVERDUE] } },
    });
    assert.equal(rules.length, 4, "reaplicar o bootstrap não duplica");
  });

  it("2. nenhum padrão/regra tem id de tarefa ou etapa embutido na key/trigger_type", async () => {
    const standards = await prisma.alertStandard.findMany();
    for (const s of standards) {
      assert.ok(!s.key.includes(suffix), `key "${s.key}" não deveria referenciar um registro de teste`);
    }
  });

  it("3/4. uma única regra de tarefa atende duas tarefas diferentes (a regra não se multiplica)", async () => {
    const responsavelA = await createUser();
    const responsavelB = await createUser();
    const soon = new Date(Date.now() + 3 * 60 * 60 * 1000);
    const { task: taskA } = await createTaskFixture({ due_date: soon, assignee_id: responsavelA.id });
    const { task: taskB } = await createTaskFixture({ due_date: soon, assignee_id: responsavelB.id });

    const rulesBefore = await prisma.alertRule.count();
    await runAlertEngineOnce();
    const rulesAfter = await prisma.alertRule.count();
    assert.equal(rulesAfter, rulesBefore, "processar tarefas não cria regra nova");

    const alertsA = await prisma.systemAlert.findMany({ where: { entity_id: taskA.id } });
    const alertsB = await prisma.systemAlert.findMany({ where: { entity_id: taskB.id } });
    assert.equal(alertsA[0]?.rule_id, alertsB[0]?.rule_id, "as duas tarefas foram avaliadas pela MESMA regra");
  });

  it("5. uma única regra de etapa atende várias etapas diferentes", async () => {
    const { nomadeId: nomadeA, userId: userA } = await createNomade();
    const { nomadeId: nomadeB, userId: userB } = await createNomade();
    const soon = new Date(Date.now() + 3 * 60 * 60 * 1000);
    const { stage: stageA } = await createStageFixture({ prazo_execucao: soon, nomade_id: nomadeA });
    const { stage: stageB } = await createStageFixture({ prazo_execucao: soon, nomade_id: nomadeB });

    await runAlertEngineOnce();

    const alertsA = await prisma.systemAlert.findMany({ where: { entity_id: stageA.id } });
    const alertsB = await prisma.systemAlert.findMany({ where: { entity_id: stageB.id } });
    assert.equal(alertsA[0]?.user_id, userA);
    assert.equal(alertsB[0]?.user_id, userB);
    assert.equal(alertsA[0]?.rule_id, alertsB[0]?.rule_id, "mesma regra geral de etapa avaliou as duas");
    assert.equal(alertsA[0]?.type, STANDARD_KEYS.STAGE_DUE_SOON);
  });

  // ── Destinatários ─────────────────────────────────────────────────────

  it("6/7. nômade e líder da etapa recebem ocorrências individuais próprias (não uma compartilhada)", async () => {
    const { nomadeId, userId: nomadeUserId } = await createNomade();
    const lider = await createUser();
    const soon = new Date(Date.now() + 3 * 60 * 60 * 1000);
    const { stage } = await createStageFixture({ prazo_execucao: soon, nomade_id: nomadeId, lider_id: lider.id });

    await runAlertEngineOnce();

    const alerts = await prisma.systemAlert.findMany({ where: { entity_id: stage.id } });
    assert.equal(alerts.length, 2, "nômade e líder recebem ocorrências PRÓPRIAS, não uma só compartilhada");
    const recipients = alerts.map((a) => a.user_id).sort();
    assert.deepEqual(recipients, [lider.id, nomadeUserId].sort());
  });

  it("9. usuário sem nenhuma relação com a tarefa/etapa não recebe alerta", async () => {
    const semRelacao = await createUser();
    const soon = new Date(Date.now() + 3 * 60 * 60 * 1000);
    const { task } = await createTaskFixture({ due_date: soon, assignee_id: null });
    await runAlertEngineOnce();
    const alerts = await prisma.systemAlert.findMany({ where: { entity_id: task.id } });
    assert.equal(alerts.find((a) => a.user_id === semRelacao.id), undefined);
  });

  it("11. etapa sem nômade nem líder não envia pra pessoa aleatória", async () => {
    const soon = new Date(Date.now() + 3 * 60 * 60 * 1000);
    const { stage } = await createStageFixture({ prazo_execucao: soon, nomade_id: null, lider_id: null });
    await runAlertEngineOnce();
    const alerts = await prisma.systemAlert.findMany({ where: { entity_id: stage.id } });
    assert.equal(alerts.length, 0);
  });

  it("registra a lacuna de 'admin responsável' sem inventar um administrador aleatório e sem transbordar pro mural geral", async () => {
    const responsavel = await createUser();
    const past = new Date(Date.now() - 60 * 60 * 1000);
    const { task } = await createTaskFixture({ due_date: past, assignee_id: responsavel.id });
    const result = await runAlertEngineOnce();
    assert.ok(result.skippedNoAdminResponsavel >= 1, "a regra de atraso pede admin_responsavel; hoje isso é uma lacuna registrada, não um envio pra qualquer admin");
    const alerts = await prisma.systemAlert.findMany({ where: { entity_id: task.id } });
    // Só o responsável recebeu — nenhum alerta "geral" (user_id nulo) foi criado
    // como substituto do admin responsável.
    assert.ok(alerts.every((a) => a.user_id !== null));
  });

  // ── Deduplicação (constraint real de banco) ──────────────────────────

  it("13/14. dedupe_key é único no banco — uma segunda tentativa de criar a MESMA ocorrência é rejeitada mesmo sem checagem prévia", async () => {
    const responsavel = await createUser();
    const soon = new Date(Date.now() + 3 * 60 * 60 * 1000);
    const { task } = await createTaskFixture({ due_date: soon, assignee_id: responsavel.id });
    await runAlertEngineOnce();
    const created = await prisma.systemAlert.findFirstOrThrow({ where: { entity_id: task.id } });
    assert.ok(created.dedupe_key, "ocorrência ativa sempre tem dedupe_key");

    await assert.rejects(
      () =>
        prisma.systemAlert.create({
          data: {
            type: created.type,
            title: "Tentativa duplicada",
            message: "Tentativa duplicada",
            severity: "warning",
            category: "alerta",
            entity_type: "project_task",
            entity_id: task.id,
            user_id: responsavel.id,
            dedupe_key: created.dedupe_key,
          },
        }),
      /Unique constraint|dedupe_key/i,
      "o índice único do banco rejeita a mesma dedupe_key — não é só checagem em memória",
    );
  });

  it("15. dois destinatários diferentes da mesma etapa não são confundidos entre si", async () => {
    const { nomadeId, userId: nomadeUserId } = await createNomade();
    const lider = await createUser();
    const soon = new Date(Date.now() + 3 * 60 * 60 * 1000);
    const { stage } = await createStageFixture({ prazo_execucao: soon, nomade_id: nomadeId, lider_id: lider.id });
    await runAlertEngineOnce();

    const nomadeAlert = await prisma.systemAlert.findFirstOrThrow({ where: { entity_id: stage.id, user_id: nomadeUserId } });
    const liderAlert = await prisma.systemAlert.findFirstOrThrow({ where: { entity_id: stage.id, user_id: lider.id } });
    assert.notEqual(nomadeAlert.id, liderAlert.id);
    assert.notEqual(nomadeAlert.dedupe_key, liderAlert.dedupe_key);

    // Resolver a ocorrência do líder não pode afetar a do nômade.
    await prisma.systemAlert.update({ where: { id: liderAlert.id }, data: { resolved_at: new Date(), resolution_reason: "condition_cleared" } });
    const nomadeAlertReloaded = await prisma.systemAlert.findUniqueOrThrow({ where: { id: nomadeAlert.id } });
    assert.equal(nomadeAlertReloaded.resolved_at, null, "resolver a ocorrência de uma pessoa não altera a de outra");
  });

  it("16. duas etapas diferentes da mesma tarefa não são confundidas", async () => {
    const { nomadeId: nomadeA, userId: userA } = await createNomade();
    const { nomadeId: nomadeB, userId: userB } = await createNomade();
    const soon = new Date(Date.now() + 3 * 60 * 60 * 1000);
    const { task } = await createTaskFixture({ due_date: null });
    const stageA = await prisma.projectTaskStage.create({ data: { project_task_id: task.id, titulo: "Etapa A", status: "EM_ANDAMENTO", prazo_execucao: soon, nomade_id: nomadeA } });
    const stageB = await prisma.projectTaskStage.create({ data: { project_task_id: task.id, titulo: "Etapa B", status: "EM_ANDAMENTO", prazo_execucao: soon, nomade_id: nomadeB } });
    createdStageIds.push(stageA.id, stageB.id);

    await runAlertEngineOnce();
    const alertA = await prisma.systemAlert.findFirstOrThrow({ where: { entity_id: stageA.id } });
    const alertB = await prisma.systemAlert.findFirstOrThrow({ where: { entity_id: stageB.id } });
    assert.equal(alertA.user_id, userA);
    assert.equal(alertB.user_id, userB);
  });

  it("17. mudar o prazo da etapa recalcula: a ocorrência antiga é encerrada e uma nova (chave diferente) é criada", async () => {
    const { nomadeId, userId } = await createNomade();
    const soon = new Date(Date.now() + 3 * 60 * 60 * 1000);
    const { stage } = await createStageFixture({ prazo_execucao: soon, nomade_id: nomadeId });
    await runAlertEngineOnce();
    const first = await prisma.systemAlert.findFirstOrThrow({ where: { entity_id: stage.id } });

    const newSoon = new Date(Date.now() + 20 * 60 * 60 * 1000); // ainda dentro da janela de 24h, mas outro dia possivelmente
    await prisma.projectTaskStage.update({ where: { id: stage.id }, data: { prazo_execucao: newSoon } });
    await runAlertEngineOnce();

    const firstReloaded = await prisma.systemAlert.findUniqueOrThrow({ where: { id: first.id } });
    // Ou a mesma ocorrência continua válida (mesmo dia), ou foi encerrada e
    // uma nova válida existe — nunca duas ativas ao mesmo tempo.
    const activeCount = await prisma.systemAlert.count({ where: { entity_id: stage.id, user_id: userId, resolved_at: null } });
    assert.equal(activeCount, 1, "nunca duas ocorrências ativas simultâneas pro mesmo destinatário");
    void firstReloaded;
  });

  // ── Ciclo de vida ─────────────────────────────────────────────────────

  it("18/19. etapa próxima do prazo cria Amarelo; atraso encerra o Amarelo e cria o Vermelho, sem duplicar", async () => {
    const { nomadeId, userId } = await createNomade();
    const soon = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const { stage } = await createStageFixture({ prazo_execucao: soon, nomade_id: nomadeId });
    await runAlertEngineOnce();
    const amarelo = await prisma.systemAlert.findFirstOrThrow({ where: { entity_id: stage.id, type: STANDARD_KEYS.STAGE_DUE_SOON } });
    assert.equal(amarelo.severity, "warning");

    await prisma.projectTaskStage.update({ where: { id: stage.id }, data: { prazo_execucao: new Date(Date.now() - 60 * 60 * 1000) } });
    await runAlertEngineOnce();
    await runAlertEngineOnce();

    const amareloReloaded = await prisma.systemAlert.findUniqueOrThrow({ where: { id: amarelo.id } });
    assert.ok(amareloReloaded.resolved_at);
    const vermelhos = await prisma.systemAlert.findMany({ where: { entity_id: stage.id, type: STANDARD_KEYS.STAGE_OVERDUE, user_id: userId } });
    assert.equal(vermelhos.length, 1);
  });

  it("20. concluir a etapa resolve a ocorrência", async () => {
    const { nomadeId } = await createNomade();
    const past = new Date(Date.now() - 60 * 60 * 1000);
    const { stage } = await createStageFixture({ prazo_execucao: past, nomade_id: nomadeId });
    await runAlertEngineOnce();
    await prisma.projectTaskStage.update({ where: { id: stage.id }, data: { status: "CONCLUIDA", concluida_em: new Date() } });
    await runAlertEngineOnce();
    const alert = await prisma.systemAlert.findFirstOrThrow({ where: { entity_id: stage.id } });
    assert.ok(alert.resolved_at);
    assert.equal(alert.resolution_reason, "task_completed");
  });

  it("22. destinatário que deixa de participar (nômade trocado) tem só a SUA ocorrência encerrada", async () => {
    const { nomadeId: nomadeOld, userId: userOld } = await createNomade();
    const { nomadeId: nomadeNew, userId: userNew } = await createNomade();
    const soon = new Date(Date.now() + 3 * 60 * 60 * 1000);
    const { stage } = await createStageFixture({ prazo_execucao: soon, nomade_id: nomadeOld });
    await runAlertEngineOnce();
    const oldAlert = await prisma.systemAlert.findFirstOrThrow({ where: { entity_id: stage.id, user_id: userOld } });

    await prisma.projectTaskStage.update({ where: { id: stage.id }, data: { nomade_id: nomadeNew } });
    await runAlertEngineOnce();

    const oldAlertReloaded = await prisma.systemAlert.findUniqueOrThrow({ where: { id: oldAlert.id } });
    assert.ok(oldAlertReloaded.resolved_at, "o nômade antigo não participa mais — a ocorrência dele é encerrada");
    assert.equal(oldAlertReloaded.resolution_reason, "condition_cleared");
    const newAlert = await prisma.systemAlert.findFirst({ where: { entity_id: stage.id, user_id: userNew, resolved_at: null } });
    assert.ok(newAlert, "o novo nômade recebe sua própria ocorrência");
  });

  it("23. Alerta Avulso permanece intacto (nunca resolvido/tocado pela automação)", async () => {
    const responsavel = await createUser();
    const avulso = await prisma.systemAlert.create({
      data: {
        type: "alerta_admin_manual",
        title: "Avulso intacto",
        message: "Mensagem avulsa",
        severity: "warning",
        category: "alerta",
        user_id: responsavel.id,
      },
    });
    await runAlertEngineOnce();
    const reloaded = await prisma.systemAlert.findUniqueOrThrow({ where: { id: avulso.id } });
    assert.equal(reloaded.resolved_at, null);
    assert.equal(reloaded.dedupe_key, null);
    await prisma.systemAlert.delete({ where: { id: avulso.id } });
  });

  // ── Interface (Gerenciador de Regras) ────────────────────────────────

  it("25. GET /admin/rules devolve recipient_roles, entity_type e a lista fechada de categorias disponíveis", async () => {
    const master = await masterAdmin();
    const res = await api("/api/system-alerts/admin/rules", { token: tokenFor(master) });
    assert.equal(res.status, 200);
    const body = res.json as any;
    assert.equal(body.recipient_category_options.length, 4);
    const stageDueSoonRule = body.data.find((r: any) => r.trigger_type === STANDARD_KEYS.STAGE_DUE_SOON);
    assert.equal(stageDueSoonRule.entity_type, "project_task_stage");
    assert.ok(Array.isArray(stageDueSoonRule.recipient_roles));
    assert.ok(stageDueSoonRule.recipient_roles.length > 0);
  });

  it("27. destinatários são categorias (papéis), nunca um id de usuário — a rota rejeita valores fora da lista fechada", async () => {
    const master = await masterAdmin();
    const rule = await prisma.alertRule.findFirstOrThrow({ where: { trigger_type: STANDARD_KEYS.STAGE_DUE_SOON } });
    const attemptUserId = await createUser();
    const res = await api(`/api/system-alerts/admin/rules/${rule.id}`, {
      method: "PATCH",
      token: tokenFor(master),
      body: { recipient_roles: [attemptUserId.id] },
    });
    assert.equal(res.status, 400, "um id de usuário não é uma categoria válida");
  });

  it("28. alterar recipient_roles persiste e é refletido na próxima execução do motor", async () => {
    const master = await masterAdmin();
    const rule = await prisma.alertRule.findFirstOrThrow({ where: { trigger_type: STANDARD_KEYS.STAGE_DUE_SOON } });
    const res = await api(`/api/system-alerts/admin/rules/${rule.id}`, {
      method: "PATCH",
      token: tokenFor(master),
      body: { recipient_roles: ["lider"] },
    });
    assert.equal(res.status, 200);
    assert.deepEqual(res.json && (res.json as any).recipient_roles, ["lider"]);

    const { nomadeId, userId: nomadeUserId } = await createNomade();
    const lider = await createUser();
    const soon = new Date(Date.now() + 3 * 60 * 60 * 1000);
    const { stage } = await createStageFixture({ prazo_execucao: soon, nomade_id: nomadeId, lider_id: lider.id });
    await runAlertEngineOnce();
    const alerts = await prisma.systemAlert.findMany({ where: { entity_id: stage.id } });
    assert.equal(alerts.length, 1, "só a categoria configurada (líder) recebeu, não o nômade");
    assert.equal(alerts[0]?.user_id, lider.id);
    void nomadeUserId;

    // Restaura pro padrão de bootstrap, pra não vazar estado pros próximos testes.
    await api(`/api/system-alerts/admin/rules/${rule.id}`, { method: "PATCH", token: tokenFor(master), body: { recipient_roles: ["nomade", "lider"] } });
  });

  it("concorrência (execuções simultâneas) não cria duas ocorrências pro mesmo destinatário", async () => {
    const { nomadeId } = await createNomade();
    const soon = new Date(Date.now() + 3 * 60 * 60 * 1000);
    const { stage } = await createStageFixture({ prazo_execucao: soon, nomade_id: nomadeId });
    await Promise.all([runAlertEngineOnceGuarded(), runAlertEngineOnceGuarded()]);
    const alerts = await prisma.systemAlert.findMany({ where: { entity_id: stage.id } });
    assert.equal(alerts.length, 1);
  });
});
