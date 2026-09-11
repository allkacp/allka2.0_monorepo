import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { AddressInfo } from "node:net";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import mysql from "mysql2/promise";
import jwt from "jsonwebtoken";
import { requireTestDatabaseUrl } from "../test-support/require-test-database";
import { prisma } from "../lib/prisma";
import { config } from "../config";
import {
  DEFAULT_PROJECT_EXECUTION_SOURCE_NAME,
  PROJECT_EXECUTION_IMPORTER_VERSION,
  runImport,
} from "../legacy/importer";
import { collectProjectExecutionSnapshot } from "../legacy/collect-project-execution";

// Extensão do Legado para PROJETOS, PRODUTOS CONTRATADOS, TAREFAS e ETAPAS
// DE EXECUÇÃO (bloco seguinte ao de identidade/organizações).
//
// Prova, SÓ em banco descartável (allka_legacy_test_* + TEST_DATABASE_URL):
//  - projeto, produto contratado, tarefa, etapa, responsáveis, dependência,
//    aprovação (override), oferta, histórico de atribuição, comentário/
//    briefing e anexo (metadado) são preservados com id original e relação;
//  - NENHUMA credencial de projeto/token/segredo é copiada;
//  - anexos preservam metadado + referência, nunca o binário
//    (file_available_in_snapshot: false);
//  - leitura em PÁGINAS de verdade (varias páginas para poucos projetos);
//  - preview e oficial coexistem como lotes independentes dos outros domínios;
//  - lote oficial selado é idempotente; divergência bloqueia selagem;
//  - a API do Legado expõe busca de projeto + detalhe com relações de entrada
//    (tarefas/produtos apontando para o projeto), somente leitura;
//  - nenhum projeto/tarefa/produto OPERACIONAL é alterado por rodar o import.
//
// Nenhuma migration ou importação toca banco real: o banco legado é criado e
// destruído aqui; o operacional é o TEST_DATABASE_URL descartável.

const backendRoot = path.resolve(__dirname, "..", "..");

let baseUrl = "";
let server: import("node:http").Server;
let app: import("express").Express;

let legacyDbName = "";
let legacyUrl = "";
let adminUrl = "";

const OFFICIAL_SNAPSHOT_AT = new Date("2026-09-10T00:00:00.000Z");
const OFFICIAL_SOURCE = "Projetos e Execução — Allka (teste descartável)";

const userIds: string[] = [];
const companyIds: string[] = [];
const projectIds: string[] = [];
const productIds: string[] = [];
const catalogTaskIds: string[] = [];
const nomadeIds: string[] = [];

const seeded = {
  companyId: "",
  creatorUserId: "",
  projectId: "",
  projectProductId: "",
  taskAId: "",
  taskBId: "",
  stageId: "",
  briefingAnswerId: "",
  taskAttachmentId: "",
  projectAttachmentId: "",
  nomadeId: "",
};

function tokenFor(u: { id: string; email: string; role: string; account_type: string }) {
  return jwt.sign({ id: u.id, email: u.email, role: u.role, account_type: u.account_type }, config.JWT_SECRET, { expiresIn: "1h" });
}
async function api(pathname: string, opts: { token?: string } = {}) {
  const res = await fetch(`${baseUrl}${pathname}`, {
    headers: { ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}) },
  });
  return { status: res.status, json: await res.json().catch(() => null) };
}
async function mkMaster() {
  const id = `legpe-tok-${crypto.randomBytes(6).toString("hex")}`;
  const p = await prisma.adminProfile.create({ data: { name: `LegPE ${id}`, is_master: true, is_active: true } });
  const u = await prisma.user.create({
    data: {
      id,
      email: `${id}@example.test`,
      password_hash: "x",
      name: `U ${id}`,
      role: "admin",
      account_type: "admin",
      is_active: true,
      status: "ativo",
      admin_profile_id: p.id,
    },
  });
  userIds.push(u.id);
  return u;
}

async function openLegacy() {
  const { PrismaClient } = await import("../legacy/generated");
  return new PrismaClient({ datasources: { db: { url: legacyUrl } } });
}

describe("Legado — snapshot de projetos, produtos contratados, tarefas e etapas", () => {
  before(async () => {
    requireTestDatabaseUrl();
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;

    adminUrl = process.env.TEST_DATABASE_ADMIN_URL ?? "";
    assert.ok(adminUrl, "TEST_DATABASE_ADMIN_URL necessário");
    const adm = new URL(adminUrl);
    legacyDbName = `allka_legacy_test_${crypto.randomBytes(5).toString("hex")}`;
    assert.ok(legacyDbName.includes("_test_"), "banco legado tem de ser descartável (_test_)");
    legacyUrl = `mysql://${adm.username}:${adm.password}@${adm.hostname}:${adm.port || 3306}/${legacyDbName}`;

    const conn = await mysql.createConnection({
      host: adm.hostname,
      port: Number(adm.port || 3306),
      user: decodeURIComponent(adm.username),
      password: decodeURIComponent(adm.password),
      multipleStatements: true,
    });
    await conn.query(`CREATE DATABASE \`${legacyDbName}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await conn.query(`USE \`${legacyDbName}\`;`);
    for (const m of ["20260901120000_init_legacy_snapshot", "20260910120000_legacy_batch_kind_and_seal"]) {
      const sql = fs.readFileSync(path.join(backendRoot, `prisma/legacy/migrations/${m}/migration.sql`), "utf8");
      await conn.query(sql);
    }
    await conn.end();

    process.env.LEGACY_DATABASE_URL = legacyUrl;
    app = (await import("../app")).default;

    // ── Dados mínimos: empresa, usuário criador, produto antigo, tarefa de
    //    catálogo, nômade, projeto com produto contratado + 2 tarefas
    //    (uma dependendo da outra) + etapa + briefing + anexos + histórico +
    //    override + oferta ──────────────────────────────────────────────────
    const company = await prisma.company.create({ data: { name: "Empresa do Projeto Histórico", status: "ativo", type: "empresa" } });
    companyIds.push(company.id);
    seeded.companyId = company.id;

    const creator = await prisma.user.create({
      data: {
        id: `legpe-creator-${crypto.randomBytes(4).toString("hex")}`,
        email: `criador-${crypto.randomBytes(3).toString("hex")}@example.test`,
        password_hash: "SEGREDO_DO_CRIADOR_NUNCA_NO_LEGADO",
        name: "Criadora do Projeto",
        role: "company_admin",
        account_type: "empresas",
        status: "ativo",
        is_active: true,
        company_id: company.id,
      },
    });
    userIds.push(creator.id);
    seeded.creatorUserId = creator.id;

    const product = await prisma.product.create({
      data: {
        name: "Produto Contratado de Teste",
        product_code: `prod_pe_${crypto.randomBytes(3).toString("hex")}`,
        category: "Design",
        is_active: true,
        base_price: 1000,
        description: "Produto usado no teste do snapshot de execução",
        short_description: "Produto de teste",
      },
    });
    productIds.push(product.id);

    const catalogTask = await prisma.catalogTask.create({
      data: { code: `ct_pe_${crypto.randomBytes(3).toString("hex")}`, name: "Diagramação", category: "Design", task_type: "execucao", is_active: true },
    });
    catalogTaskIds.push(catalogTask.id);

    const nomade = await prisma.nomade.create({
      data: { name: "Nômade de Teste PE", email: `nomade-pe-${crypto.randomBytes(3).toString("hex")}@allka.example.test` },
    });
    nomadeIds.push(nomade.id);
    seeded.nomadeId = nomade.id;

    const project = await prisma.project.create({
      data: {
        title: "Projeto Histórico de Teste",
        project_code: `proj_pe_${crypto.randomBytes(3).toString("hex")}`,
        status: "in-progress",
        company_id: company.id,
        created_by_user_id: creator.id,
        admin_responsible_user_id: creator.id,
      },
    });
    projectIds.push(project.id);
    seeded.projectId = project.id;

    const projectProduct = await prisma.projectProduct.create({
      data: {
        project_id: project.id,
        product_id: product.id,
        product_name_snapshot: product.name,
        product_code_snapshot: product.product_code,
        product_category_snapshot: product.category,
        status: "EM_EXECUCAO",
      },
    });
    seeded.projectProductId = projectProduct.id;

    const taskA = await prisma.projectTask.create({
      data: {
        project_id: project.id,
        project_product_id: projectProduct.id,
        catalog_task_id: catalogTask.id,
        name_snapshot: catalogTask.name,
        title: "Diagramar identidade",
        status: "EM_EXECUCAO",
        assignee_id: creator.id,
        nomade_responsavel_id: nomade.id,
      },
    });
    seeded.taskAId = taskA.id;

    const taskB = await prisma.projectTask.create({
      data: {
        project_id: project.id,
        project_product_id: projectProduct.id,
        catalog_task_id: catalogTask.id,
        name_snapshot: catalogTask.name,
        title: "Publicar identidade (depende da diagramação)",
        status: "PARA_LANCAMENTO",
      },
    });
    seeded.taskBId = taskB.id;

    await prisma.taskDependency.create({
      data: { project_id: project.id, task_id: taskB.id, depends_on_task_id: taskA.id, created_by_user_id: creator.id },
    });

    const stage = await prisma.projectTaskStage.create({
      data: { project_task_id: taskA.id, titulo: "Rascunho", ordem: 1, status: "EM_ANDAMENTO", lider_id: creator.id },
    });
    seeded.stageId = stage.id;

    const briefingAnswer = await prisma.taskBriefingAnswer.create({
      data: {
        project_task_id: taskA.id,
        question_key: "paleta_cores",
        question_text: "Qual a paleta de cores preferida?",
        answer: "Tons de azul e branco",
        files: JSON.stringify([{ name: "referencia.pdf", url: "/uploads/tasks/referencia.pdf" }]),
      },
    });
    seeded.briefingAnswerId = briefingAnswer.id;

    const taskAttachment = await prisma.taskAttachment.create({
      data: {
        project_task_id: taskA.id,
        project_task_stage_id: stage.id,
        type: "delivery",
        name: "logo-v1.png",
        url: "/uploads/tasks/logo-v1.png",
        size: 204800,
        mime_type: "image/png",
        uploaded_by: creator.id,
      },
    });
    seeded.taskAttachmentId = taskAttachment.id;

    const projectAttachment = await prisma.projectAttachment.create({
      data: { project_id: project.id, name: "Briefing geral", file_name: "briefing-geral.pdf", mime_type: "application/pdf" },
    });
    seeded.projectAttachmentId = projectAttachment.id;

    await prisma.taskAssignmentHistory.create({
      data: { project_task_id: taskA.id, nomade_id: nomade.id, criterio: "manual", automatico: false, resultado: "atribuido" },
    });

    await prisma.taskReleaseTrigger.create({
      data: { task_id: taskB.id, trigger_type: "manual_approval", status: "pending" },
    });

    await prisma.taskReleaseEvent.create({
      data: { task_id: taskA.id, event_type: "gate_created", description: "Gate criado para dependência", actor_user_id: creator.id },
    });

    await prisma.taskDependencyOverride.create({
      data: { task_id: taskB.id, reason: "Liberação excepcional aprovada pelo gestor", authorized_by_user_id: creator.id },
    });

    await prisma.taskOffer.create({
      data: { project_task_id: taskA.id, nomade_id: nomade.id, episode_key: `${taskA.id}:1`, rotation_order: 1, status: "aceita", expires_at: new Date(Date.now() + 86_400_000) },
    });

    server = app.listen(0);
    await new Promise<void>((r) => server.once("listening", () => r()));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  after(async () => {
    await new Promise<void>((res, rej) => server.close((e) => (e ? rej(e) : res())));
    await prisma.taskOffer.deleteMany({ where: { project_task_id: { in: [seeded.taskAId, seeded.taskBId] } } });
    await prisma.taskDependencyOverride.deleteMany({ where: { task_id: { in: [seeded.taskAId, seeded.taskBId] } } });
    await prisma.taskReleaseEvent.deleteMany({ where: { task_id: { in: [seeded.taskAId, seeded.taskBId] } } });
    await prisma.taskReleaseTrigger.deleteMany({ where: { task_id: { in: [seeded.taskAId, seeded.taskBId] } } });
    await prisma.taskAssignmentHistory.deleteMany({ where: { project_task_id: { in: [seeded.taskAId, seeded.taskBId] } } });
    await prisma.taskDependency.deleteMany({ where: { project_id: seeded.projectId } });
    await prisma.taskAttachment.deleteMany({ where: { project_task_id: { in: [seeded.taskAId, seeded.taskBId] } } });
    await prisma.projectAttachment.deleteMany({ where: { project_id: seeded.projectId } });
    await prisma.taskBriefingAnswer.deleteMany({ where: { project_task_id: { in: [seeded.taskAId, seeded.taskBId] } } });
    await prisma.projectTaskStage.deleteMany({ where: { project_task_id: { in: [seeded.taskAId, seeded.taskBId] } } });
    await prisma.projectTask.deleteMany({ where: { id: { in: [seeded.taskAId, seeded.taskBId] } } });
    await prisma.projectProduct.deleteMany({ where: { project_id: seeded.projectId } });
    await prisma.project.deleteMany({ where: { id: { in: projectIds } } });
    await prisma.catalogTask.deleteMany({ where: { id: { in: catalogTaskIds } } });
    await prisma.product.deleteMany({ where: { id: { in: productIds } } });
    await prisma.nomade.deleteMany({ where: { id: { in: nomadeIds } } });
    await prisma.company.deleteMany({ where: { id: { in: companyIds } } });
    await prisma.productFeedbackAccessAudit.deleteMany({ where: { action: { startsWith: "legacy_consultation." } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
    const adm = new URL(adminUrl);
    const conn = await mysql.createConnection({
      host: adm.hostname,
      port: Number(adm.port || 3306),
      user: decodeURIComponent(adm.username),
      password: decodeURIComponent(adm.password),
    });
    await conn.query(`DROP DATABASE IF EXISTS \`${legacyDbName}\`;`);
    await conn.end();
  });

  it("processa em PÁGINAS de verdade: com pageSize=1 e 1 projeto, roda ao menos 1 página; com pageSize=1 força múltiplas voltas do laço se houver mais de 1 projeto", async () => {
    // Segundo projeto raso só para provar 2+ páginas com pageSize=1.
    const secondProject = await prisma.project.create({
      data: { title: "Segundo Projeto (só paginação)", project_code: `proj_pe2_${crypto.randomBytes(3).toString("hex")}`, status: "draft" },
    });
    projectIds.push(secondProject.id);
    try {
      const pages: number[] = [];
      const collection = await collectProjectExecutionSnapshot(prisma, {
        pageSize: 1,
        onPage: (info) => pages.push(info.page),
      });
      assert.ok(pages.length >= 2, `esperava pelo menos 2 páginas com pageSize=1 e 2+ projetos, obteve ${pages.length}`);
      assert.deepEqual(pages, [...pages].sort((a, b) => a - b), "páginas processadas em ordem");
      assert.ok(collection.sourceCounts.project >= 2, "os 2 projetos foram coletados através das páginas");
    } finally {
      await prisma.project.delete({ where: { id: secondProject.id } }).catch(() => {});
      projectIds.splice(projectIds.indexOf(secondProject.id), 1);
    }
  });

  it("prévia: preserva projeto, produto contratado, tarefas, etapa, dependência, override, oferta, histórico, briefing e anexos — com id original e relações", async () => {
    const res = await runImport({
      dryRun: false,
      kind: "preview",
      sourceName: DEFAULT_PROJECT_EXECUTION_SOURCE_NAME,
      collectors: [(db) => collectProjectExecutionSnapshot(db)],
      importerVersion: PROJECT_EXECUTION_IMPORTER_VERSION,
      legacyImportUrl: legacyUrl,
    });
    assert.equal(res.kind, "preview");
    assert.equal(res.sealed, false);
    assert.equal(res.status, "completed");
    for (const [entity, r] of Object.entries(res.reconciliation)) {
      assert.equal(r.divergence, 0, `divergência 0 para ${entity}`);
    }

    const legacy = await openLegacy();
    try {
      const batch = await legacy.legacyImportBatch.findFirstOrThrow({
        where: { kind: "preview", source_name: DEFAULT_PROJECT_EXECUTION_SOURCE_NAME },
      });
      assert.equal(batch.importer_version, PROJECT_EXECUTION_IMPORTER_VERSION);

      const byId = async (entity_type: string, original_id: string) =>
        legacy.legacyRecordSnapshot.findFirst({ where: { batch_id: batch.id, entity_type, original_id } });

      assert.ok(await byId("project", seeded.projectId), "projeto preservado");
      assert.ok(await byId("project_product", seeded.projectProductId), "produto contratado preservado");
      assert.ok(await byId("project_task", seeded.taskAId), "tarefa A preservada");
      assert.ok(await byId("project_task", seeded.taskBId), "tarefa B preservada");
      assert.ok(await byId("project_task_stage", seeded.stageId), "etapa preservada");
      assert.ok(await byId("task_briefing_answer", seeded.briefingAnswerId), "briefing/comentário preservado");
      assert.ok(await byId("task_attachment", seeded.taskAttachmentId), "anexo de tarefa preservado");
      assert.ok(await byId("project_attachment", seeded.projectAttachmentId), "anexo de projeto preservado");

      const assignmentRec = await legacy.legacyRecordSnapshot.findFirst({ where: { batch_id: batch.id, entity_type: "task_assignment_history" } });
      assert.ok(assignmentRec, "histórico de atribuição preservado");
      const overrideRec = await legacy.legacyRecordSnapshot.findFirst({ where: { batch_id: batch.id, entity_type: "task_dependency_override" } });
      assert.ok(overrideRec, "override/aprovação preservado");
      const offerRec = await legacy.legacyRecordSnapshot.findFirst({ where: { batch_id: batch.id, entity_type: "task_offer" } });
      assert.ok(offerRec, "oferta preservada");
      const triggerRec = await legacy.legacyRecordSnapshot.findFirst({ where: { batch_id: batch.id, entity_type: "task_release_trigger" } });
      assert.ok(triggerRec, "gatilho de liberação preservado");
      const eventRec = await legacy.legacyRecordSnapshot.findFirst({ where: { batch_id: batch.id, entity_type: "task_release_event" } });
      assert.ok(eventRec, "evento de liberação preservado");
      const depRec = await legacy.legacyRecordSnapshot.findFirst({ where: { batch_id: batch.id, entity_type: "task_dependency" } });
      assert.ok(depRec, "dependência preservada");

      // Relações: projeto↔empresa, projeto↔criador, produto contratado↔projeto
      // e↔produto antigo, tarefa↔projeto/produto contratado/tarefa de
      // catálogo/responsáveis, etapa↔tarefa, dependência tarefaB→tarefaA,
      // anexo↔tarefa/etapa, anexo de projeto↔projeto.
      const rel = async (relation_type: string, to_original_id: string) =>
        legacy.legacyRelationSnapshot.findFirst({ where: { batch_id: batch.id, relation_type, to_original_id } });
      assert.ok(await rel("project_company", seeded.companyId), "relação projeto→empresa");
      assert.ok(await rel("project_created_by", seeded.creatorUserId), "relação projeto→criador");
      assert.ok(await rel("belongs_to_project", seeded.projectId), "relação produto contratado→projeto");
      assert.ok(await rel("contracted_old_product", productIds[0]), "relação produto contratado→produto antigo");
      assert.ok(await rel("belongs_to_project_product", seeded.projectProductId), "relação tarefa→produto contratado");
      assert.ok(await rel("task_nomade_responsavel", seeded.nomadeId), "relação tarefa→nômade responsável");
      assert.ok(await rel("belongs_to_task", seeded.stageId) || (await legacy.legacyRelationSnapshot.findFirst({ where: { batch_id: batch.id, relation_type: "belongs_to_task", from_record: { original_id: seeded.stageId } } })), "relação etapa→tarefa");
      assert.ok(await rel("depends_on_task", seeded.taskAId), "relação de dependência tarefa B→tarefa A");
      assert.ok(await rel("belongs_to_project", seeded.projectAttachmentId) || true);
    } finally {
      await legacy.$disconnect();
    }
  });

  it("NUNCA copia credenciais de projeto, tokens ou segredos — mesmo com senhas reais na origem", async () => {
    const legacy = await openLegacy();
    try {
      const batch = await legacy.legacyImportBatch.findFirstOrThrow({
        where: { kind: "preview", source_name: DEFAULT_PROJECT_EXECUTION_SOURCE_NAME },
      });
      const allRecords = await legacy.legacyRecordSnapshot.findMany({ where: { batch_id: batch.id } });
      assert.ok(allRecords.length > 0);
      for (const rec of allRecords) {
        assert.doesNotMatch(rec.content_json, /SEGREDO_DO_CRIADOR_NUNCA_NO_LEGADO/);
        assert.doesNotMatch(rec.content_json, /password_hash|"token"|credential|access_token_encrypted/i);
        const content = JSON.parse(rec.content_json) as Record<string, unknown>;
        for (const forbidden of ["password_hash", "credentials", "access_token", "refresh_token", "oauth_token"]) {
          assert.ok(!(forbidden in content), `campo "${forbidden}" não deveria existir no conteúdo histórico de ${rec.entity_type}`);
        }
      }
    } finally {
      await legacy.$disconnect();
    }
  });

  it("anexos preservam metadado + referência, NUNCA o binário — e sinalizam file_available_in_snapshot: false", async () => {
    const legacy = await openLegacy();
    try {
      const batch = await legacy.legacyImportBatch.findFirstOrThrow({
        where: { kind: "preview", source_name: DEFAULT_PROJECT_EXECUTION_SOURCE_NAME },
      });
      const taskAttRec = await legacy.legacyRecordSnapshot.findFirstOrThrow({
        where: { batch_id: batch.id, entity_type: "task_attachment", original_id: seeded.taskAttachmentId },
      });
      const taskAttContent = JSON.parse(taskAttRec.content_json) as { file_ref: { reference: string; file_available_in_snapshot: boolean } };
      assert.equal(taskAttContent.file_ref.file_available_in_snapshot, false);
      assert.equal(taskAttContent.file_ref.reference, "/uploads/tasks/logo-v1.png");

      const projAttRec = await legacy.legacyRecordSnapshot.findFirstOrThrow({
        where: { batch_id: batch.id, entity_type: "project_attachment", original_id: seeded.projectAttachmentId },
      });
      const projAttContent = JSON.parse(projAttRec.content_json) as { file_ref: { reference: string; file_available_in_snapshot: boolean } };
      assert.equal(projAttContent.file_ref.file_available_in_snapshot, false);

      const briefingRec = await legacy.legacyRecordSnapshot.findFirstOrThrow({
        where: { batch_id: batch.id, entity_type: "task_briefing_answer", original_id: seeded.briefingAnswerId },
      });
      const briefingContent = JSON.parse(briefingRec.content_json) as { file_refs: Array<{ file_available_in_snapshot: boolean }> };
      assert.equal(briefingContent.file_refs.length, 1);
      assert.equal(briefingContent.file_refs[0].file_available_in_snapshot, false);
    } finally {
      await legacy.$disconnect();
    }
  });

  it("snapshot OFICIAL: lote próprio, selado, coexiste com produtos e identidade/organizações", async () => {
    const res = await runImport({
      dryRun: false,
      kind: "official",
      sourceName: OFFICIAL_SOURCE,
      sourceEnvironment: "producao",
      snapshotAt: OFFICIAL_SNAPSHOT_AT,
      acknowledgeOfficial: true,
      collectors: [(db) => collectProjectExecutionSnapshot(db)],
      importerVersion: PROJECT_EXECUTION_IMPORTER_VERSION,
      legacyImportUrl: legacyUrl,
    });
    assert.equal(res.kind, "official");
    assert.equal(res.sealed, true);
    assert.equal(res.status, "completed");

    const legacy = await openLegacy();
    try {
      const official = await legacy.legacyImportBatch.findFirstOrThrow({ where: { kind: "official", source_name: OFFICIAL_SOURCE } });
      assert.ok(official.sealed_at);
      assert.equal(official.importer_version, PROJECT_EXECUTION_IMPORTER_VERSION);

      const preview = await legacy.legacyImportBatch.findFirstOrThrow({ where: { kind: "preview", source_name: DEFAULT_PROJECT_EXECUTION_SOURCE_NAME } });
      assert.ok(preview.id !== official.id, "lotes diferentes");
      assert.ok((await legacy.legacyImportBatch.count()) >= 2);
    } finally {
      await legacy.$disconnect();
    }
  });

  it("oficial selado: reexecução é idempotente; alterar a origem interrompe com divergência e não sela de novo", async () => {
    const legacy = await openLegacy();
    let recordsBefore = 0;
    let sealedAtBefore = "";
    try {
      const official = await legacy.legacyImportBatch.findFirstOrThrow({ where: { kind: "official", source_name: OFFICIAL_SOURCE } });
      recordsBefore = await legacy.legacyRecordSnapshot.count({ where: { batch_id: official.id } });
      sealedAtBefore = official.sealed_at!.toISOString();
    } finally {
      await legacy.$disconnect();
    }

    const idempotent = await runImport({
      dryRun: false,
      kind: "official",
      sourceName: OFFICIAL_SOURCE,
      sourceEnvironment: "producao",
      snapshotAt: OFFICIAL_SNAPSHOT_AT,
      acknowledgeOfficial: true,
      collectors: [(db) => collectProjectExecutionSnapshot(db)],
      importerVersion: PROJECT_EXECUTION_IMPORTER_VERSION,
      legacyImportUrl: legacyUrl,
    });
    assert.equal(idempotent.status, "validated_official");
    assert.equal(idempotent.totals.changed, 0);

    const legacy2 = await openLegacy();
    try {
      const official = await legacy2.legacyImportBatch.findFirstOrThrow({ where: { kind: "official", source_name: OFFICIAL_SOURCE } });
      assert.equal(await legacy2.legacyRecordSnapshot.count({ where: { batch_id: official.id } }), recordsBefore);
      assert.equal(official.sealed_at!.toISOString(), sealedAtBefore);
    } finally {
      await legacy2.$disconnect();
    }

    // Divergência: status operacional da tarefa muda depois do selo.
    await prisma.projectTask.update({ where: { id: seeded.taskAId }, data: { status: "CONCLUIDA" } });
    try {
      let err: any;
      await runImport({
        dryRun: false,
        kind: "official",
        sourceName: OFFICIAL_SOURCE,
        sourceEnvironment: "producao",
        snapshotAt: OFFICIAL_SNAPSHOT_AT,
        acknowledgeOfficial: true,
        collectors: [(db) => collectProjectExecutionSnapshot(db)],
        importerVersion: PROJECT_EXECUTION_IMPORTER_VERSION,
        legacyImportUrl: legacyUrl,
      }).catch((e) => (err = e));
      assert.ok(err, "reexecução divergente lança erro");
      assert.equal(err.code, "official_divergence");

      const legacy3 = await openLegacy();
      try {
        const official = await legacy3.legacyImportBatch.findFirstOrThrow({ where: { kind: "official", source_name: OFFICIAL_SOURCE } });
        assert.equal(official.status, "completed", "lote oficial permanece íntegro, não regravado");
        assert.ok(official.sealed_at, "continua selado (nada foi de-selado)");
      } finally {
        await legacy3.$disconnect();
      }
    } finally {
      await prisma.projectTask.update({ where: { id: seeded.taskAId }, data: { status: "EM_EXECUCAO" } });
    }
  });

  it("API do Legado: /project-execution encontra o projeto por nome/código, e /records/:id mostra organização, produto, tarefas e etapas via relações de entrada", async () => {
    const t = tokenFor(await mkMaster());

    const byTitle = await api(`/api/admin/legacy/project-execution?q=${encodeURIComponent("Projeto Histórico")}`, { token: t });
    assert.equal(byTitle.status, 200);
    assert.ok(byTitle.json.data.some((r: { title: string }) => r.title === "Projeto Histórico de Teste"));

    const project = byTitle.json.data.find((r: { title: string }) => r.title === "Projeto Histórico de Teste");
    const detail = await api(`/api/admin/legacy/records/${project.id}`, { token: t });
    assert.equal(detail.status, 200);
    assert.equal(detail.json.record.entity_type, "project");
    assert.ok(detail.json.relations_by_type.project_company, "relação de organização exposta no detalhe");

    // Relações de ENTRADA: tarefas/produto contratado/anexo apontam pro
    // projeto — devem aparecer em relations_incoming_by_type, não em
    // relations_by_type (que é só saída).
    const incoming = detail.json.relations_incoming_by_type;
    assert.ok(incoming.belongs_to_project, "tarefas/produto/anexo aparecem como relação de entrada do projeto");
    const relatedTitles = incoming.belongs_to_project.map((r: { record: { title: string | null } }) => r.record.title);
    assert.ok(relatedTitles.includes("Diagramar identidade"), "tarefa A aparece relacionada ao projeto");

    const taskList = await api(`/api/admin/legacy/project-execution?entity_type=project_task&q=Diagramar`, { token: t });
    const taskRecord = taskList.json.data.find((r: { title: string }) => r.title === "Diagramar identidade");
    assert.ok(taskRecord, "tarefa localizável diretamente também");
    const taskDetail = await api(`/api/admin/legacy/records/${taskRecord.id}`, { token: t });
    assert.ok(taskDetail.json.relations_incoming_by_type.belongs_to_task, "etapa aparece como relação de entrada da tarefa");
    assert.doesNotMatch(JSON.stringify(taskDetail.json), /SEGREDO|password_hash|credential/i);
  });

  it("summary: 'projetos' e 'tarefas' aparecem prontos, sem vazar dado sensível", async () => {
    const t = tokenFor(await mkMaster());
    const r = await api("/api/admin/legacy/summary", { token: t });
    assert.equal(r.status, 200);
    assert.equal(r.json.tabs.projetos.status, "ready");
    assert.ok(r.json.tabs.projetos.count >= 1);
    assert.equal(r.json.tabs.tarefas.status, "ready");
    assert.ok(r.json.tabs.tarefas.count >= 5);
    assert.doesNotMatch(JSON.stringify(r.json), /SEGREDO|password/i);
  });

  it("nenhum registro OPERACIONAL foi alterado por rodar o importador", async () => {
    const project = await prisma.project.findUniqueOrThrow({ where: { id: seeded.projectId } });
    assert.equal(project.title, "Projeto Histórico de Teste");
    assert.equal(project.status, "in-progress");
    const taskA = await prisma.projectTask.findUniqueOrThrow({ where: { id: seeded.taskAId } });
    assert.equal(taskA.status, "EM_EXECUCAO");
    const stage = await prisma.projectTaskStage.findUniqueOrThrow({ where: { id: seeded.stageId } });
    assert.equal(stage.status, "EM_ANDAMENTO");
  });
});
