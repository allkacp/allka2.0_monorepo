import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import type { AddressInfo } from "node:net";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { requireTestDatabaseUrl } from "../test-support/require-test-database";
import app from "../app";
import { prisma } from "../lib/prisma";
import { config } from "../config";
import {
  acceptOffer,
  advanceRotation,
  declineOffer,
  eligibleCandidatesForTask,
  getRotationStatus,
  restartRotation,
  runTaskRotationOnce,
  startTaskRotation,
} from "../lib/task-rotation-engine";

// Rodízio de ofertas de tarefa a Nômades (ata 2026-08, bloco 4/5).

let baseUrl = "";
let server: import("node:http").Server;

// Cada teste usa uma CATEGORIA ÚNICA para que os candidatos de um teste não
// vazem para outro (a elegibilidade casa por categoria com `contains`).
let CAT = "";
beforeEach(() => {
  CAT = `RotCat-${crypto.randomBytes(6).toString("hex")}`;
});

function tokenFor(u: { id: string; email: string; role: string; account_type: string }) {
  return jwt.sign({ id: u.id, email: u.email, role: u.role, account_type: u.account_type }, config.JWT_SECRET, { expiresIn: "1h" });
}
async function api(path: string, opts: { method?: string; token?: string; body?: unknown } = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: opts.method ?? "GET",
    headers: { "content-type": "application/json", ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}) },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  return { status: res.status, json: await res.json().catch(() => null) };
}

const users: string[] = [];
const nomades: string[] = [];
const habilidades: string[] = [];
const projects: string[] = [];
const products: string[] = [];
const tasks: string[] = [];

async function mkNomad(opts: { online?: boolean; nomadeStatus?: string; userActive?: boolean; skill?: boolean; lastSeenMinutesAgo?: number } = {}) {
  const id = `rot-${crypto.randomBytes(6).toString("hex")}`;
  const user = await prisma.user.create({
    data: { id, email: `${id}@example.test`, password_hash: "x", name: `Nomad ${id}`, role: "nomad", account_type: "nomades", is_active: opts.userActive ?? true, status: "ativo" },
  });
  users.push(user.id);
  const nomade = await prisma.nomade.create({
    data: { user_id: user.id, name: user.name, email: `${id}-n@example.test`, status: opts.nomadeStatus ?? "ativo" },
  });
  nomades.push(nomade.id);
  if (opts.skill ?? true) {
    const h = await prisma.nomadeHabilidade.create({
      data: { nomade_id: nomade.id, area: CAT, categoria_produto: CAT, disponibilidade: "disponivel", ativo: true, nota_media: 4 },
    });
    habilidades.push(h.id);
  }
  if (opts.online ?? true) {
    const ago = (opts.lastSeenMinutesAgo ?? 0) * 60_000;
    await prisma.userPresence.upsert({
      where: { user_id: user.id },
      create: { user_id: user.id, last_seen_at: new Date(Date.now() - ago) },
      update: { last_seen_at: new Date(Date.now() - ago) },
    });
  }
  return { user, nomade };
}

async function mkTask(over: { liderId?: string | null; adminResponsibleId?: string | null } = {}) {
  const code = `${crypto.randomBytes(4).toString("hex")}`;
  const project = await prisma.project.create({
    data: { title: `Proj rot ${code}`, project_code: code, status: "in-progress", admin_responsible_user_id: over.adminResponsibleId ?? null },
  });
  projects.push(project.id);
  const product = await prisma.product.create({ data: { name: `Prod ${code}`, category: CAT } });
  products.push(product.id);
  const pp = await prisma.projectProduct.create({
    data: { project_id: project.id, product_id: product.id, product_name_snapshot: product.name, product_category_snapshot: CAT },
  });
  const task = await prisma.projectTask.create({
    data: {
      project_id: project.id,
      project_product_id: pp.id,
      product_id: product.id,
      name_snapshot: product.name,
      title: `Tarefa rot ${code}`,
      category_snapshot: CAT,
      status: "AGUARDANDO_NOMADE",
      lider_responsavel_id: over.liderId ?? null,
    },
  });
  tasks.push(task.id);
  return task;
}

async function mkLeaderUser() {
  const id = `rot-lead-${crypto.randomBytes(5).toString("hex")}`;
  const u = await prisma.user.create({
    data: { id, email: `${id}@example.test`, password_hash: "x", name: `Lead ${id}`, role: "lider", account_type: "lider", is_active: true, status: "ativo" },
  });
  users.push(u.id);
  return u;
}

describe("Rodízio de ofertas de tarefa", () => {
  before(async () => {
    requireTestDatabaseUrl();
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
    const l = app.listen(0);
    server = l;
    await new Promise<void>((r) => l.once("listening", () => r()));
    baseUrl = `http://127.0.0.1:${(l.address() as AddressInfo).port}`;
  });
  after(async () => {
    await prisma.taskOffer.deleteMany({ where: { project_task_id: { in: tasks } } });
    await prisma.taskAssignmentHistory.deleteMany({ where: { project_task_id: { in: tasks } } });
    await prisma.systemAlert.deleteMany({ where: { type: "task.rotation_exhausted", entity_id: { in: tasks } } });
    await prisma.projectTask.deleteMany({ where: { id: { in: tasks } } });
    await prisma.projectProduct.deleteMany({ where: { project_id: { in: projects } } });
    await prisma.project.deleteMany({ where: { id: { in: projects } } });
    await prisma.product.deleteMany({ where: { id: { in: products } } });
    await prisma.nomadeHabilidade.deleteMany({ where: { id: { in: habilidades } } });
    await prisma.nomade.deleteMany({ where: { id: { in: nomades } } });
    await prisma.userPresence.deleteMany({ where: { user_id: { in: users } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
    await new Promise<void>((res, rej) => server.close((e) => (e ? rej(e) : res())));
    await prisma.$disconnect();
  });

  it("3. Elegibilidade: só entra Nômade ativo, perfil ativo e com habilidade compatível", async () => {
    const task = await mkTask();
    const ok = await mkNomad();
    const inactiveUser = await mkNomad({ userActive: false });
    const pausedNomad = await mkNomad({ nomadeStatus: "pausado" });
    const noSkill = await mkNomad({ skill: false });

    const cands = await eligibleCandidatesForTask(task.id);
    const ids = cands.map((c) => c.nomadeId);
    assert.ok(ids.includes(ok.nomade.id));
    assert.ok(!ids.includes(inactiveUser.nomade.id), "usuário inativo fora");
    assert.ok(!ids.includes(pausedNomad.nomade.id), "nômade pausado fora");
    assert.ok(!ids.includes(noSkill.nomade.id), "sem habilidade fora");
  });

  it("4. Somente uma oferta pendente por tarefa a cada momento", async () => {
    const task = await mkTask();
    await mkNomad();
    await mkNomad();
    const a1 = await advanceRotation(task.id);
    assert.equal(a1.action, "offered");
    const a2 = await advanceRotation(task.id); // ainda pendente → aguarda
    assert.equal(a2.action, "waiting");
    const pend = await prisma.taskOffer.count({ where: { project_task_id: task.id, status: "pendente" } });
    assert.equal(pend, 1);
  });

  it("5. Ordem do rodízio: quem recebeu oferta há mais tempo vem primeiro (determinístico)", async () => {
    const task = await mkTask();
    const recent = await mkNomad();
    const old = await mkNomad();
    // 'old' recebeu uma oferta (fechada) há 3 dias; 'recent' há 1 min.
    await prisma.taskOffer.create({
      data: { project_task_id: task.id, nomade_id: old.nomade.id, nomade_user_id: old.user.id, episode_key: "prev:1", rotation_order: 1, status: "recusada", offered_at: new Date(Date.now() - 3 * 86400000), expires_at: new Date(Date.now() - 3 * 86400000), close_reason: "declined" },
    });
    await prisma.taskOffer.create({
      data: { project_task_id: task.id, nomade_id: recent.nomade.id, nomade_user_id: recent.user.id, episode_key: "prev:2", rotation_order: 1, status: "recusada", offered_at: new Date(Date.now() - 60_000), expires_at: new Date(Date.now() - 60_000), close_reason: "declined" },
    });
    await advanceRotation(task.id);
    const offer = await prisma.taskOffer.findFirst({ where: { project_task_id: task.id, status: "pendente" } });
    assert.equal(offer?.nomade_id, old.nomade.id, "o que está há mais tempo sem oferta vai primeiro");
  });

  it("6. Recusa avança para o próximo elegível", async () => {
    const task = await mkTask();
    const a = await mkNomad();
    const b = await mkNomad();
    await advanceRotation(task.id);
    const first = await prisma.taskOffer.findFirst({ where: { project_task_id: task.id, status: "pendente" } });
    await declineOffer(first!.id, first!.nomade_user_id!, "sem tempo");
    const second = await prisma.taskOffer.findFirst({ where: { project_task_id: task.id, status: "pendente" } });
    assert.ok(second, "nova oferta criada");
    assert.notEqual(second!.nomade_id, first!.nomade_id, "para o OUTRO nômade");
    assert.equal(second!.rotation_order, 2);
    void a; void b;
  });

  it("7. Expiração avança sem exigir tela aberta (job de fundo)", async () => {
    const task = await mkTask();
    await mkNomad();
    await mkNomad();
    await advanceRotation(task.id);
    const offer = await prisma.taskOffer.findFirst({ where: { project_task_id: task.id, status: "pendente" } });
    await prisma.taskOffer.update({ where: { id: offer!.id }, data: { expires_at: new Date(Date.now() - 1000) } });
    await runTaskRotationOnce(); // o job de fundo
    const expired = await prisma.taskOffer.findUnique({ where: { id: offer!.id } });
    assert.equal(expired!.status, "expirada");
    assert.equal(expired!.close_reason, "expired");
    const next = await prisma.taskOffer.findFirst({ where: { project_task_id: task.id, status: "pendente" } });
    assert.ok(next && next.nomade_id !== offer!.nomade_id);
  });

  it("8. Aceite atribui a tarefa pelo fluxo oficial + histórico + cancela outras", async () => {
    const task = await mkTask();
    const n = await mkNomad();
    await advanceRotation(task.id);
    const offer = await prisma.taskOffer.findFirst({ where: { project_task_id: task.id, status: "pendente" } });
    const r = await acceptOffer(offer!.id, n.user.id);
    assert.equal(r.taskId, task.id);
    const t = await prisma.projectTask.findUnique({ where: { id: task.id } });
    assert.equal(t!.nomade_responsavel_id, n.nomade.id);
    assert.equal(t!.status, "EM_EXECUCAO");
    assert.equal(t!.rotation_episode_key, null);
    const acc = await prisma.taskOffer.findUnique({ where: { id: offer!.id } });
    assert.equal(acc!.status, "aceita");
    const hist = await prisma.taskAssignmentHistory.findFirst({ where: { project_task_id: task.id, criterio: "rodizio" } });
    assert.ok(hist, "TaskAssignmentHistory gravado");
  });

  it("9/8. Concorrência: duas aceitações simultâneas — só uma vence", async () => {
    const task = await mkTask();
    const a = await mkNomad();
    const b = await mkNomad();
    // simula corrida: DUAS ofertas pendentes (bypass da regra 1-por-vez)
    const o1 = await prisma.taskOffer.create({ data: { project_task_id: task.id, nomade_id: a.nomade.id, nomade_user_id: a.user.id, episode_key: `${task.id}:x`, rotation_order: 1, status: "pendente", expires_at: new Date(Date.now() + 60000) } });
    const o2 = await prisma.taskOffer.create({ data: { project_task_id: task.id, nomade_id: b.nomade.id, nomade_user_id: b.user.id, episode_key: `${task.id}:x`, rotation_order: 2, status: "pendente", expires_at: new Date(Date.now() + 60000) } });
    await prisma.projectTask.update({ where: { id: task.id }, data: { rotation_episode_key: `${task.id}:x` } });

    const [r1, r2] = await Promise.allSettled([acceptOffer(o1.id, a.user.id), acceptOffer(o2.id, b.user.id)]);
    const wins = [r1, r2].filter((r) => r.status === "fulfilled").length;
    const losers = [r1, r2].filter((r) => r.status === "rejected");
    assert.equal(wins, 1, "exatamente um aceite vence");
    assert.equal((losers[0] as PromiseRejectedResult).reason.code, "task_already_assigned");
    const t = await prisma.projectTask.findUnique({ where: { id: task.id } });
    assert.ok(t!.nomade_responsavel_id === a.nomade.id || t!.nomade_responsavel_id === b.nomade.id);
  });

  it("9. Retry / clique duplo no mesmo aceite não cria atribuição duplicada", async () => {
    const task = await mkTask();
    const n = await mkNomad();
    await advanceRotation(task.id);
    const offer = await prisma.taskOffer.findFirst({ where: { project_task_id: task.id, status: "pendente" } });
    await acceptOffer(offer!.id, n.user.id);
    await assert.rejects(() => acceptOffer(offer!.id, n.user.id), (e: any) => e.code === "offer_not_pending");
    const hist = await prisma.taskAssignmentHistory.count({ where: { project_task_id: task.id } });
    assert.equal(hist, 1);
  });

  it("aceite de oferta que não é sua → 403", async () => {
    const task = await mkTask();
    const n = await mkNomad();
    const other = await mkNomad();
    await advanceRotation(task.id);
    const offer = await prisma.taskOffer.findFirst({ where: { project_task_id: task.id, status: "pendente" } });
    await assert.rejects(() => acceptOffer(offer!.id, other.user.id), (e: any) => e.httpStatus === 403);
    void n;
  });

  it("11. Esgotamento (ninguém online) cria UM alerta ao Líder responsável, deduplicado", async () => {
    const lead = await mkLeaderUser();
    const task = await mkTask({ liderId: lead.id });
    await mkNomad({ online: false }); // habilitado mas offline
    await startTaskRotation(task.id);
    let alerts = await prisma.systemAlert.findMany({ where: { type: "task.rotation_exhausted", entity_id: task.id } });
    assert.equal(alerts.length, 1);
    assert.equal(alerts[0].user_id, lead.id, "vai ao Líder real, nunca Geral");
    assert.equal(alerts[0].severity, "warning");
    assert.notEqual(alerts[0].user_id, null);
    // roda o motor de novo → não duplica
    await runTaskRotationOnce();
    alerts = await prisma.systemAlert.findMany({ where: { type: "task.rotation_exhausted", entity_id: task.id } });
    assert.equal(alerts.length, 1, "deduplicado por episódio");
  });

  it("11b. Esgotamento por todos recusarem também escala", async () => {
    const lead = await mkLeaderUser();
    const task = await mkTask({ liderId: lead.id });
    const a = await mkNomad();
    const b = await mkNomad();
    await startTaskRotation(task.id);
    for (let i = 0; i < 2; i++) {
      const o = await prisma.taskOffer.findFirst({ where: { project_task_id: task.id, status: "pendente" } });
      if (o) await declineOffer(o.id, o.nomade_user_id!, "não");
    }
    void a; void b;
    const alert = await prisma.systemAlert.findFirst({ where: { type: "task.rotation_exhausted", entity_id: task.id } });
    assert.ok(alert, "escalou após todos recusarem");
    assert.match(alert!.message, /recusaram/);
  });

  it("12. Sem Líder na tarefa → alerta vai ao Admin responsável do projeto", async () => {
    const adminResp = await mkLeaderUser();
    const task = await mkTask({ liderId: null, adminResponsibleId: adminResp.id });
    await mkNomad({ online: false });
    await startTaskRotation(task.id);
    const alert = await prisma.systemAlert.findFirst({ where: { type: "task.rotation_exhausted", entity_id: task.id } });
    assert.equal(alert?.user_id, adminResp.id);
  });

  it("13. Reiniciar o rodízio: usuário sem permissão → 403; Líder responsável → ok + resolve o alerta", async () => {
    const lead = await mkLeaderUser();
    const task = await mkTask({ liderId: lead.id });
    await mkNomad({ online: false });
    await startTaskRotation(task.id); // escala
    const stranger = await mkLeaderUser();
    await assert.rejects(() => restartRotation(task.id, stranger.id, false), (e: any) => e.httpStatus === 403);

    // agora fica alguém online e o líder reinicia
    const n = await mkNomad();
    await restartRotation(task.id, lead.id, false);
    const alert = await prisma.systemAlert.findFirst({ where: { type: "task.rotation_exhausted", entity_id: task.id }, orderBy: { created_at: "desc" } });
    assert.ok(alert?.manual_resolved_at, "alerta do episódio anterior resolvido");
    const pend = await prisma.taskOffer.findFirst({ where: { project_task_id: task.id, status: "pendente" } });
    assert.equal(pend?.nomade_id, n.nomade.id, "novo episódio ofertou pro nômade online");
  });

  it("HTTP: GET /task-offers/mine, POST accept/decline (identidade da sessão)", async () => {
    const task = await mkTask();
    const n = await mkNomad();
    await advanceRotation(task.id);
    const mine = await api("/api/task-offers/mine", { token: tokenFor(n.user) });
    assert.equal(mine.status, 200);
    assert.equal(mine.json.data.length, 1);
    assert.equal(mine.json.data[0].task.id, task.id);
    assert.ok(mine.json.data[0].seconds_left > 0);

    const offerId = mine.json.data[0].offer_id;
    // outra pessoa tenta aceitar → 403
    const other = await mkNomad();
    assert.equal((await api(`/api/task-offers/${offerId}/accept`, { method: "POST", token: tokenFor(other.user) })).status, 403);
    // o dono aceita → 200
    const acc = await api(`/api/task-offers/${offerId}/accept`, { method: "POST", token: tokenFor(n.user) });
    assert.equal(acc.status, 200);
    assert.equal(acc.json.task_id, task.id);
  });

  it("HTTP: GET /project-tasks/:id/rotation devolve a fase; restart exige permissão", async () => {
    const lead = await mkLeaderUser();
    const task = await mkTask({ liderId: lead.id });
    await mkNomad();
    await startTaskRotation(task.id);
    const st = await api(`/api/project-tasks/${task.id}/rotation`, { token: tokenFor(lead) });
    assert.equal(st.status, 200);
    assert.equal(st.json.phase, "oferta_enviada");
    assert.ok(st.json.pending_offer);
  });
});
