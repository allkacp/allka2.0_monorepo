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
import { recordApprovedTask } from "../lib/memory-service";
import { aprovarTarefa } from "../lib/stage-engine";

// Fundação da Memória Hierárquica (Bloco 1/4, sprint 2026-09) — cobre os
// itens de teste proporcional pedidos: isolamento entre contas, 401/403/404,
// permissão por vínculo real, criar/editar/arquivar, concorrência otimista
// (409), conteúdo imutável do histórico, upload + acesso autorizado, e
// idempotência do registro de tarefa aprovada.

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
  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}` },
    body: form,
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

const userIds: string[] = [];
const companyIds: string[] = [];
const agencyIds: string[] = [];
const projectIds: string[] = [];
const productIds: string[] = [];

async function mkUser(overrides: Partial<{ role: string; account_type: string; company_id: string | null; agency_id: string | null }> = {}) {
  const id = `mem-${crypto.randomBytes(6).toString("hex")}`;
  const user = await prisma.user.create({
    data: {
      id,
      email: `${id}@example.test`,
      password_hash: "unused-test-hash",
      name: `Memory Test ${id}`,
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

async function mkAdmin() {
  return mkUser({ role: "admin", account_type: "admin" });
}

async function mkCompany() {
  const company = await prisma.company.create({ data: { name: `Empresa Memória ${crypto.randomBytes(4).toString("hex")}` } });
  companyIds.push(company.id);
  return company;
}

async function mkAgency() {
  const owner = await mkUser({ account_type: "agencias" });
  const agency = await prisma.agency.create({ data: { name: `Agência Memória ${crypto.randomBytes(4).toString("hex")}`, owner_user_id: owner.id } });
  agencyIds.push(agency.id);
  return agency;
}

async function mkProject(overrides: Partial<{ company_id: string | null; agency_id: string | null }> = {}) {
  const code = crypto.randomBytes(4).toString("hex");
  const project = await prisma.project.create({
    data: {
      title: `Projeto Memória ${code}`,
      project_code: code,
      company_id: overrides.company_id ?? null,
      agency_id: overrides.agency_id ?? null,
    },
  });
  projectIds.push(project.id);
  return project;
}

async function mkProjectTask(projectId: string, overrides: Partial<{ status: string; exige_aprovacao_cliente: boolean }> = {}) {
  const code = crypto.randomBytes(4).toString("hex");
  const product = await prisma.product.create({ data: { name: `Produto Memória ${code}`, category: "Cat" } });
  productIds.push(product.id);
  const pp = await prisma.projectProduct.create({
    data: { project_id: projectId, product_id: product.id, product_name_snapshot: product.name, product_category_snapshot: "Cat" },
  });
  const task = await prisma.projectTask.create({
    data: {
      project_id: projectId,
      project_product_id: pp.id,
      product_id: product.id,
      name_snapshot: product.name,
      title: `Tarefa Memória ${code}`,
      category_snapshot: "Cat",
      status: overrides.status ?? "AGUARDANDO_NOMADE",
      exige_aprovacao_cliente: overrides.exige_aprovacao_cliente ?? false,
    },
  });
  return task;
}

describe("Fundação da Memória Hierárquica (Bloco 1/4)", () => {
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
    try {
      await prisma.memory.deleteMany({ where: { scope_id: { in: [...projectIds, ...companyIds, ...agencyIds] } } });
      await prisma.projectTask.deleteMany({ where: { project_id: { in: projectIds } } });
      await prisma.projectProduct.deleteMany({ where: { project_id: { in: projectIds } } });
      await prisma.product.deleteMany({ where: { id: { in: productIds } } });
      await prisma.project.deleteMany({ where: { id: { in: projectIds } } });
      await prisma.agency.deleteMany({ where: { id: { in: agencyIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      await prisma.company.deleteMany({ where: { id: { in: companyIds } } });
    } finally {
      await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
    }
  });

  it("401 sem token", async () => {
    const project = await mkProject();
    const res = await api(`/api/memory/project/${project.id}`);
    assert.equal(res.status, 401);
  });

  it("404 quando o escopo não existe (nunca 403, pra não confirmar/negar existência)", async () => {
    const admin = await mkAdmin();
    const res = await api(`/api/memory/project/${crypto.randomBytes(12).toString("hex")}`, { token: tokenFor(admin) });
    assert.equal(res.status, 404);
  });

  it("404 (não 403) quando o usuário não tem vínculo algum com o projeto", async () => {
    const companyA = await mkCompany();
    const companyB = await mkCompany();
    const project = await mkProject({ company_id: companyA.id });
    const outsider = await mkUser({ account_type: "empresas", company_id: companyB.id });

    const res = await api(`/api/memory/project/${project.id}`, { token: tokenFor(outsider) });
    assert.equal(res.status, 404);
  });

  it("isolamento entre duas contas: Company B nunca vê a memória do projeto da Company A", async () => {
    const companyA = await mkCompany();
    const companyB = await mkCompany();
    const project = await mkProject({ company_id: companyA.id });
    const userA = await mkUser({ account_type: "empresas", company_id: companyA.id });
    const userB = await mkUser({ account_type: "empresas", company_id: companyB.id });

    const edit = await api(`/api/memory/project/${project.id}`, {
      method: "PATCH",
      token: tokenFor(userA),
      body: { section: "summary", value: "Resumo da Company A", updatedAt: null },
    });
    assert.equal(edit.status, 200);

    const blocked = await api(`/api/memory/project/${project.id}`, { token: tokenFor(userB) });
    assert.equal(blocked.status, 404);
  });

  it("visível mas sem permissão de editar → 403 (Líder/Nômade nunca ganham edição automática)", async () => {
    const project = await mkProject();
    const leader = await mkUser({ role: "lider", account_type: "lider" });

    const view = await api(`/api/memory/project/${project.id}`, { token: tokenFor(leader) });
    assert.equal(view.status, 200); // visibilidade ampla pré-existente do escopo "open"

    const edit = await api(`/api/memory/project/${project.id}`, {
      method: "PATCH",
      token: tokenFor(leader),
      body: { section: "summary", value: "Tentativa de líder", updatedAt: null },
    });
    assert.equal(edit.status, 403);
  });

  it("Company dona do projeto (vinculado por company_id) cria e edita a memória", async () => {
    const company = await mkCompany();
    const project = await mkProject({ company_id: company.id });
    const user = await mkUser({ account_type: "empresas", company_id: company.id });

    const created = await api(`/api/memory/project/${project.id}`, {
      method: "PATCH",
      token: tokenFor(user),
      body: { section: "positive_instructions", value: "Sempre usar tom formal", updatedAt: null },
    });
    assert.equal(created.status, 200);
    assert.equal(created.json.memory.positive_instructions, "Sempre usar tom formal");

    const got = await api(`/api/memory/project/${project.id}`, { token: tokenFor(user) });
    assert.equal(got.status, 200);
    assert.equal(got.json.memory.positive_instructions, "Sempre usar tom formal");
    assert.equal(got.json.can_edit, true);
  });

  it("Agência dona do projeto (vinculada por agency_id) edita; outra agência não vê", async () => {
    const agencyA = await mkAgency();
    const agencyB = await mkAgency();
    const project = await mkProject({ agency_id: agencyA.id });
    const memberA = await mkUser({ account_type: "agencias", agency_id: agencyA.id });
    const memberB = await mkUser({ account_type: "agencias", agency_id: agencyB.id });

    const edit = await api(`/api/memory/project/${project.id}`, {
      method: "PATCH",
      token: tokenFor(memberA),
      body: { section: "negative_instructions", value: "Nunca prometer prazo sem checar o time", updatedAt: null },
    });
    assert.equal(edit.status, 200);

    const blocked = await api(`/api/memory/project/${project.id}`, { token: tokenFor(memberB) });
    assert.equal(blocked.status, 404);
  });

  it("memória de Company: só o usuário da própria Company edita; usuário sem vínculo não descobre a existência", async () => {
    const company = await mkCompany();
    const owner = await mkUser({ account_type: "empresas", company_id: company.id });
    const outsider = await mkUser({ account_type: "empresas", company_id: (await mkCompany()).id });

    const edit = await api(`/api/memory/company/${company.id}`, {
      method: "PATCH",
      token: tokenFor(owner),
      body: { section: "summary", value: "Preferências gerais da empresa", updatedAt: null },
    });
    assert.equal(edit.status, 200);

    const blocked = await api(`/api/memory/company/${company.id}`, { token: tokenFor(outsider) });
    assert.equal(blocked.status, 404);
  });

  it("concorrência otimista: updated_at desatualizado nunca sobrescreve silenciosamente (409)", async () => {
    const admin = await mkAdmin();
    const project = await mkProject();

    const first = await api(`/api/memory/project/${project.id}`, {
      method: "PATCH",
      token: tokenFor(admin),
      body: { section: "summary", value: "Versão 1", updatedAt: null },
    });
    assert.equal(first.status, 200);
    const staleUpdatedAt = first.json.memory.updated_at;

    const second = await api(`/api/memory/project/${project.id}`, {
      method: "PATCH",
      token: tokenFor(admin),
      body: { section: "summary", value: "Versão 2", updatedAt: staleUpdatedAt },
    });
    assert.equal(second.status, 200);

    // Terceira escrita reutilizando o updated_at JÁ ANTIGO (imita duas abas
    // abertas): deve ser recusada com 409, e o valor gravado da 2ª escrita
    // precisa permanecer intacto.
    const conflicting = await api(`/api/memory/project/${project.id}`, {
      method: "PATCH",
      token: tokenFor(admin),
      body: { section: "summary", value: "Versão perdida (não pode vencer)", updatedAt: staleUpdatedAt },
    });
    assert.equal(conflicting.status, 409);
    assert.equal(conflicting.json.code, "memory_stale");

    const final = await api(`/api/memory/project/${project.id}`, { token: tokenFor(admin) });
    assert.equal(final.json.memory.summary, "Versão 2");
  });

  it("histórico imutável: guarda seção/ação/autor/valor antes-depois, nunca segredo/binário, ordem mais recente primeiro", async () => {
    const admin = await mkAdmin();
    const project = await mkProject();

    await api(`/api/memory/project/${project.id}`, {
      method: "PATCH",
      token: tokenFor(admin),
      body: { section: "positive_instructions", value: "Primeira instrução", updatedAt: null },
    });
    const afterFirst = await api(`/api/memory/project/${project.id}`, { token: tokenFor(admin) });
    await api(`/api/memory/project/${project.id}`, {
      method: "PATCH",
      token: tokenFor(admin),
      body: { section: "positive_instructions", value: "Instrução corrigida", updatedAt: afterFirst.json.memory.updated_at },
    });

    const history = await api(`/api/memory/project/${project.id}/history`, { token: tokenFor(admin) });
    assert.equal(history.status, 200);
    const events = history.json.history as any[];
    assert.ok(events.length >= 2);
    // desc: o evento mais recente ("updated" da segunda edição) vem primeiro
    const [latest] = events;
    assert.equal(latest.action, "updated");
    assert.equal(latest.section, "positive_instructions");
    assert.equal(latest.actor_user_id, admin.id);
    assert.equal(JSON.parse(latest.after_json).value, "Instrução corrigida");
    assert.equal(JSON.parse(latest.before_json).value, "Primeira instrução");
    for (const ev of events) {
      const raw = JSON.stringify(ev);
      assert.ok(!raw.toLowerCase().includes("password"));
      assert.ok(!raw.toLowerCase().includes("token"));
    }
  });

  it("upload de arquivo: autorizado baixa, sem vínculo recebe 404; remover só arquiva (nunca apaga do disco)", async () => {
    const company = await mkCompany();
    const project = await mkProject({ company_id: company.id });
    const owner = await mkUser({ account_type: "empresas", company_id: company.id });
    const outsider = await mkUser({ account_type: "empresas", company_id: (await mkCompany()).id });

    const upload = await uploadFile(`/api/memory/project/${project.id}/files`, tokenFor(owner), Buffer.from("conteudo de teste"), "nota.txt");
    assert.equal(upload.status, 201);
    const fileId = upload.json.file.id;
    const storedName = upload.json.file.file_name;
    const diskPath = uploadedFilePath(`memory/project/${project.id}`, storedName);
    assert.ok(fs.existsSync(diskPath));

    const download = await api(`/api/memory/project/${project.id}/files/${fileId}/download`, { token: tokenFor(owner) });
    assert.equal(download.status, 200);

    const blockedDownload = await api(`/api/memory/project/${project.id}/files/${fileId}/download`, { token: tokenFor(outsider) });
    assert.equal(blockedDownload.status, 404);

    const del = await api(`/api/memory/project/${project.id}/files/${fileId}`, { method: "DELETE", token: tokenFor(owner) });
    assert.equal(del.status, 200);

    // arquivamento lógico: some da listagem viva, mas o binário continua no disco
    const afterDelete = await api(`/api/memory/project/${project.id}`, { token: tokenFor(owner) });
    assert.equal(afterDelete.json.memory.files.some((f: any) => f.id === fileId), false);
    assert.ok(fs.existsSync(diskPath));
  });

  it("idempotência do registro de tarefa aprovada: retry/duplo-clique nunca duplica", async () => {
    const project = await mkProject();
    const task = await mkProjectTask(project.id);
    const admin = await mkAdmin();
    const idempotencyKey = `memory-approved-task:${task.id}`;

    const first = await recordApprovedTask({
      projectId: project.id,
      projectTaskId: task.id,
      approvedAt: new Date(),
      approvedByUserId: admin.id,
      idempotencyKey,
    });
    const second = await recordApprovedTask({
      projectId: project.id,
      projectTaskId: task.id,
      approvedAt: new Date(),
      approvedByUserId: admin.id,
      idempotencyKey,
    });

    assert.equal(first.id, second.id);
    const count = await prisma.memoryApprovedTaskRecord.count({ where: { idempotency_key: idempotencyKey } });
    assert.equal(count, 1);

    const history = await api(`/api/memory/project/${project.id}/history`, { token: tokenFor(admin) });
    const approvalEvents = (history.json.history as any[]).filter((e) => e.action === "approved_task_added");
    assert.equal(approvalEvents.length, 1);
  });

  it("fim a fim: aprovar de verdade pela rota real grava aceite e memória juntos, com origem task_approval", async () => {
    const project = await mkProject();
    const task = await mkProjectTask(project.id, { status: "EM_APROVACAO", exige_aprovacao_cliente: false });
    const admin = await mkAdmin();

    const res = await api(`/api/project-tasks/${task.id}/aprovar`, { method: "PATCH", token: tokenFor(admin), body: {} });
    assert.equal(res.status, 200);
    assert.equal(res.json.concluida, true);

    const dbTask = await prisma.projectTask.findUniqueOrThrow({ where: { id: task.id } });
    assert.equal(dbTask.status, "CONCLUIDA");

    const records = await prisma.memoryApprovedTaskRecord.findMany({ where: { project_task_id: task.id } });
    assert.equal(records.length, 1);

    const history = await api(`/api/memory/project/${project.id}/history`, { token: tokenFor(admin) });
    const approvalEvents = (history.json.history as any[]).filter((e) => e.action === "approved_task_added");
    assert.equal(approvalEvents.length, 1);
    assert.equal(approvalEvents[0].origin, "task_approval");
  });

  it("registro confiável: falha no passo de memória desfaz o aceite inteiro (mesma transação); retry recupera sem duplicar e a tarefa nunca fica presa aprovada-sem-memória", async () => {
    const project = await mkProject();
    const task = await mkProjectTask(project.id, { status: "EM_APROVACAO", exige_aprovacao_cliente: false });
    const admin = await mkAdmin();
    const idempotencyKey = `memory-approved-task:${task.id}`;

    // Passo 1 — falha simulada APÓS o aceite ser computado, ainda dentro da
    // mesma transação: aponta o registro de memória pra uma tarefa que não
    // existe (violação de FK real, não um mock) pra forçar um erro genuíno
    // no meio do fluxo. Isso precisa desfazer TUDO, inclusive o status já
    // calculado pelo aceite — nunca deixar a tarefa "aprovada" sem a
    // memória correspondente.
    await assert.rejects(
      prisma.$transaction(async (tx) => {
        const r = await aprovarTarefa(tx, task.id, { userId: admin.id });
        await recordApprovedTask(
          {
            projectId: project.id,
            projectTaskId: `tarefa-inexistente-${crypto.randomBytes(6).toString("hex")}`,
            approvedAt: new Date(),
            approvedByUserId: admin.id,
            idempotencyKey,
          },
          tx,
        );
        return r;
      }),
    );

    const afterFailure = await prisma.projectTask.findUniqueOrThrow({ where: { id: task.id } });
    assert.equal(afterFailure.status, "EM_APROVACAO"); // rollback total — nunca fica "aprovada sem memória"
    assert.equal(await prisma.memoryApprovedTaskRecord.count({ where: { idempotency_key: idempotencyKey } }), 0);

    // Passo 2 — retry de verdade (a mesma tarefa, sem o defeito injetado):
    // recupera exatamente o que faltou, sem duplicar nada.
    const retry = await prisma.$transaction(async (tx) => {
      const r = await aprovarTarefa(tx, task.id, { userId: admin.id });
      if (r.concluida) {
        await recordApprovedTask(
          { projectId: project.id, projectTaskId: task.id, approvedAt: new Date(), approvedByUserId: admin.id, idempotencyKey },
          tx,
        );
      }
      return r;
    });
    assert.equal(retry.concluida, true);

    const afterRetry = await prisma.projectTask.findUniqueOrThrow({ where: { id: task.id } });
    assert.equal(afterRetry.status, "CONCLUIDA");

    const records = await prisma.memoryApprovedTaskRecord.findMany({ where: { idempotency_key: idempotencyKey } });
    assert.equal(records.length, 1); // nenhuma duplicação apesar da tentativa anterior

    const historyEvents = await prisma.memoryHistoryEvent.findMany({ where: { action: "approved_task_added" } });
    const ours = historyEvents.filter((e) => e.after_json?.includes(task.id));
    assert.equal(ours.length, 1);
    assert.equal(ours[0].origin, "task_approval");
  });
});
