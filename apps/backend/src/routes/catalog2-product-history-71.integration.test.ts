import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { AddressInfo } from "node:net";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { requireTestDatabaseUrl } from "../test-support/require-test-database";
import app from "../app";
import { prisma } from "../lib/prisma";
import { config } from "../config";
import { seedCatalog2Classifications, seedCatalog2FourFForTests } from "../lib/catalog2-classifications-seed";
import {
  recordCatalog2ProductHistory,
  __resetCatalog2HistoryCoverageMarkerCacheForTests,
} from "../lib/catalog2-product-history";

// Item 7.1 (reunião 2026-09-14, "Fechar a integridade do histórico") —
// cobre as 5 verificações pedidas: (1) falha ao gravar o histórico reverte
// a alteração correspondente; (2) operação recusada não gera evento de
// sucesso (categoria nova: etapas); (3) data de cobertura não é retroativa
// nem muda a cada reinício; (4) categorias faltantes desta revisão (etapas,
// perguntas via rota direta, adicionais atualizados/removidos, comercial
// global/especialidade) geram eventos corretos; (5) mesclagem mantém
// paginação e ordenação estáveis, sem duplicação.

let baseUrl = "";
let server: import("node:http").Server;
const users: string[] = [];
const adminProfiles: string[] = [];
const catProducts: string[] = [];
const questionnaires: string[] = [];

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
async function mkAdmin(master: boolean) {
  const p = await prisma.adminProfile.create({ data: { name: `C11 ${master ? "M" : "C"} ${crypto.randomBytes(4).toString("hex")}`, is_master: master, is_active: true } });
  adminProfiles.push(p.id);
  const id = `c11ad-${crypto.randomBytes(5).toString("hex")}`;
  const u = await prisma.user.create({
    data: { id, email: `${id}@example.test`, password_hash: "x", name: master ? "Admin Master" : "Admin Comum", role: "admin", account_type: "admin", is_active: true, status: "ativo", admin_profile_id: p.id },
  });
  users.push(u.id);
  return { user: u, token: tokenFor(u) };
}
async function mkDraftProduct(slug: string) {
  const spec = await prisma.catalog2Specialty.findFirstOrThrow({ where: { key: "designer" } });
  const pillar = await prisma.catalog2Pillar.findFirstOrThrow({ where: { key: "redes_conteudo" } });
  const category = await prisma.catalog2Category.findFirstOrThrow({ where: { key: "design" } });
  const fourF = await prisma.catalog2FourF.findFirstOrThrow({ where: { key: "fluxo" } });
  const product = await prisma.catalog2Product.create({
    data: {
      slug, internal_name: `[TESTE LOCAL] ${slug}`, pillar_id: pillar.id, category_id: category.id, status: "em_preparacao",
      four_f: { create: [{ four_f_id: fourF.id }] },
    },
  });
  catProducts.push(product.id);
  const v = await prisma.catalog2ProductVersion.create({
    data: {
      product_id: product.id, version_number: 1, state: "rascunho",
      title: `Serviço ${slug}`, summary: "resumo", full_description: "descrição do serviço demo",
      base_commercial_deadline_days: 5,
    },
  });
  return { product, versionId: v.id, specialtyId: spec.id };
}
async function purgeProduct(id: string) {
  await prisma.catalog2ProductHistoryEvent.deleteMany({ where: { product_id: id } }).catch(() => {});
  const vs = await prisma.catalog2ProductVersion.findMany({ where: { product_id: id }, select: { id: true } });
  const vids = vs.map((x) => x.id);
  await prisma.catalog2Product.update({ where: { id }, data: { published_version_id: null } }).catch(() => {});
  await prisma.catalog2VersionEvent.deleteMany({ where: { version_id: { in: vids } } }).catch(() => {});
  await prisma.catalog2CommercialChangeEvent.deleteMany({ where: { product_id: id } }).catch(() => {});
  await prisma.catalog2TaskStep.deleteMany({ where: { task: { version_id: { in: vids } } } }).catch(() => {});
  await prisma.catalog2Addon.deleteMany({ where: { version_id: { in: vids } } }).catch(() => {});
  await prisma.catalog2Task.deleteMany({ where: { version_id: { in: vids } } }).catch(() => {});
  await prisma.catalog2ProductVersion.deleteMany({ where: { product_id: id } }).catch(() => {});
  await prisma.catalog2ProductFourF.deleteMany({ where: { product_id: id } }).catch(() => {});
  await prisma.catalog2Product.delete({ where: { id } }).catch(() => {});
}

let MASTER_USER: Awaited<ReturnType<typeof mkAdmin>>;
let MASTER = "";

describe("Fechar a integridade do histórico (Item 7.1, reunião 2026-09-14)", () => {
  before(async () => {
    requireTestDatabaseUrl();
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
    await seedCatalog2FourFForTests(prisma);
    await seedCatalog2Classifications(prisma);
    MASTER_USER = await mkAdmin(true);
    MASTER = MASTER_USER.token;
    server = app.listen(0);
    await new Promise<void>((r) => server.once("listening", () => r()));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  after(async () => {
    await new Promise<void>((res, rej) => server.close((e) => (e ? rej(e) : res())));
    for (const id of questionnaires.splice(0)) await prisma.catalog2Questionnaire.delete({ where: { id } }).catch(() => {});
    for (const id of catProducts.splice(0)) await purgeProduct(id);
    await prisma.user.deleteMany({ where: { id: { in: users } } }).catch(() => {});
    await prisma.adminProfile.deleteMany({ where: { id: { in: adminProfiles } } }).catch(() => {});
  });

  it("1. falha ao gravar o evento de histórico reverte a alteração correspondente (mesma transação)", async () => {
    const { product } = await mkDraftProduct(`c11-${crypto.randomBytes(4).toString("hex")}`);
    await assert.rejects(
      prisma.$transaction(async (tx) => {
        await tx.catalog2Product.update({ where: { id: product.id }, data: { status: "arquivado" } });
        // versionId inexistente viola a FK do histórico — força a falha do
        // registro DENTRO da mesma transação da alteração real.
        await recordCatalog2ProductHistory(tx, {
          productId: product.id,
          versionId: "versao-inexistente-xyz",
          eventType: "status_changed",
          description: "isto nunca deveria persistir",
          actorUserId: MASTER_USER.user.id,
        });
      }),
    );
    const reloaded = await prisma.catalog2Product.findUniqueOrThrow({ where: { id: product.id } });
    assert.equal(reloaded.status, "em_preparacao", "a mudança de status deve ter sido revertida junto com a falha no histórico");
    const eventCount = await prisma.catalog2ProductHistoryEvent.count({ where: { product_id: product.id } });
    assert.equal(eventCount, 0, "nenhum evento parcial deve sobrar");
  });

  it("2. operação recusada numa categoria nova (etapa) não gera evento de sucesso", async () => {
    const { product, versionId, specialtyId } = await mkDraftProduct(`c11-${crypto.randomBytes(4).toString("hex")}`);
    const task = await api(`/api/admin/catalog2/versions/${versionId}/tasks`, {
      method: "POST", token: MASTER, body: { key: "t1", name: "Tarefa", specialty_id: specialtyId },
    });
    assert.equal(task.status, 201, JSON.stringify(task.json));

    // corpo inválido (nome vazio) -> recusado pelo schema, nunca chega a criar a etapa.
    const rejected = await api(`/api/admin/catalog2/tasks/${task.json.id}/steps`, {
      method: "POST", token: MASTER, body: { key: "s1", name: "" },
    });
    assert.equal(rejected.status, 400, JSON.stringify(rejected.json));

    const hist = await api(`/api/admin/catalog2/products/${product.id}/history`, { token: MASTER });
    assert.ok(!hist.json.data.some((e: any) => e.event_type === "step_added"), "etapa recusada não deve gerar step_added");
  });

  it("3. marco de cobertura é persistido no ambiente, não é retroativo e não muda ao 'reiniciar' o processo", async () => {
    const { product } = await mkDraftProduct(`c11-${crypto.randomBytes(4).toString("hex")}`);
    const before = Date.now();
    const r1 = await api(`/api/admin/catalog2/products/${product.id}/history`, { token: MASTER });
    assert.equal(r1.status, 200);
    const since1 = new Date(r1.json.coverage.full_coverage_since).getTime();
    assert.ok(since1 >= before - 10_000 && since1 <= Date.now() + 10_000, "marco deve refletir o instante real de execução, não uma data fixa");
    assert.notEqual(r1.json.coverage.full_coverage_since.slice(0, 10), "2026-09-14", "nunca a data da reunião");

    // simula um reinício do processo: limpa só o cache em memória — o
    // valor persistido no banco deve ser o mesmo de antes.
    __resetCatalog2HistoryCoverageMarkerCacheForTests();
    const r2 = await api(`/api/admin/catalog2/products/${product.id}/history`, { token: MASTER });
    assert.equal(r2.json.coverage.full_coverage_since, r1.json.coverage.full_coverage_since, "o marco não deve mudar entre chamadas/reinícios");
  });

  it("4a. etapas: adicionar/atualizar/remover geram eventos corretos", async () => {
    const { product, versionId, specialtyId } = await mkDraftProduct(`c11-${crypto.randomBytes(4).toString("hex")}`);
    const task = await api(`/api/admin/catalog2/versions/${versionId}/tasks`, { method: "POST", token: MASTER, body: { key: "t1", name: "Tarefa", specialty_id: specialtyId } });
    const created = await api(`/api/admin/catalog2/tasks/${task.json.id}/steps`, { method: "POST", token: MASTER, body: { key: "s1", name: "Etapa 1", estimated_minutes: 10 } });
    assert.equal(created.status, 201, JSON.stringify(created.json));
    const updated = await api(`/api/admin/catalog2/steps/${created.json.id}`, { method: "PUT", token: MASTER, body: { estimated_minutes: 20 } });
    assert.equal(updated.status, 200);
    const removed = await api(`/api/admin/catalog2/steps/${created.json.id}`, { method: "DELETE", token: MASTER });
    assert.equal(removed.status, 200);

    const hist = await api(`/api/admin/catalog2/products/${product.id}/history`, { token: MASTER });
    const types = hist.json.data.map((e: any) => e.event_type);
    assert.ok(types.includes("step_added"));
    assert.ok(types.includes("step_updated"));
    assert.ok(types.includes("step_removed"));
    const stepUpdated = hist.json.data.find((e: any) => e.event_type === "step_updated");
    assert.equal(stepUpdated.before.estimated_minutes, 10);
    assert.equal(stepUpdated.after.estimated_minutes, 20);
  });

  it("4b. adicionais: atualizar/remover (além de adicionar, já coberto no Item 7) geram eventos corretos", async () => {
    const { product, versionId } = await mkDraftProduct(`c11-${crypto.randomBytes(4).toString("hex")}`);
    const created = await api(`/api/admin/catalog2/versions/${versionId}/addons`, { method: "POST", token: MASTER, body: { key: "a1", name: "Adicional 1", base_cost: 50 } });
    assert.equal(created.status, 201, JSON.stringify(created.json));
    const updated = await api(`/api/admin/catalog2/addons/${created.json.id}`, { method: "PUT", token: MASTER, body: { base_cost: 80 } });
    assert.equal(updated.status, 200);
    const removed = await api(`/api/admin/catalog2/addons/${created.json.id}`, { method: "DELETE", token: MASTER });
    assert.equal(removed.status, 200);

    const hist = await api(`/api/admin/catalog2/products/${product.id}/history`, { token: MASTER });
    const types = hist.json.data.map((e: any) => e.event_type);
    assert.ok(types.includes("addon_added"));
    assert.ok(types.includes("addon_updated"));
    assert.ok(types.includes("addon_removed"));
    const addonUpdated = hist.json.data.find((e: any) => e.event_type === "addon_updated");
    assert.equal(addonUpdated.before.base_cost, 50);
    assert.equal(addonUpdated.after.base_cost, 80);
  });

  it("4c. perguntas editadas pelas rotas diretas (questionário usado por só 1 tarefa) geram eventos corretos", async () => {
    const { product, versionId, specialtyId } = await mkDraftProduct(`c11-${crypto.randomBytes(4).toString("hex")}`);
    const task = await api(`/api/admin/catalog2/versions/${versionId}/tasks`, { method: "POST", token: MASTER, body: { key: "t1", name: "Tarefa", specialty_id: specialtyId } });
    const qCreate = await api("/api/admin/catalog2/questionnaires", { method: "POST", token: MASTER, body: { name: "Briefing" } });
    assert.equal(qCreate.status, 201, JSON.stringify(qCreate.json));
    questionnaires.push(qCreate.json.id);
    const link = await api(`/api/admin/catalog2/tasks/${task.json.id}/questionnaire`, { method: "PUT", token: MASTER, body: { questionnaire_id: qCreate.json.id } });
    assert.equal(link.status, 200, JSON.stringify(link.json));

    const qAdd = await api(`/api/admin/catalog2/questionnaires/${qCreate.json.id}/questions`, { method: "POST", token: MASTER, body: { key: "q1", label: "Qual o objetivo?" } });
    assert.equal(qAdd.status, 201, JSON.stringify(qAdd.json));
    const qEdit = await api(`/api/admin/catalog2/questions/${qAdd.json.id}`, { method: "PUT", token: MASTER, body: { label: "Qual é o objetivo principal?" } });
    assert.equal(qEdit.status, 200, JSON.stringify(qEdit.json));
    const qDel = await api(`/api/admin/catalog2/questions/${qAdd.json.id}`, { method: "DELETE", token: MASTER });
    assert.equal(qDel.status, 200);
    const qMeta = await api(`/api/admin/catalog2/questionnaires/${qCreate.json.id}`, { method: "PUT", token: MASTER, body: { name: "Briefing revisado" } });
    assert.equal(qMeta.status, 200);

    const hist = await api(`/api/admin/catalog2/products/${product.id}/history`, { token: MASTER });
    const contentEvents = hist.json.data.filter((e: any) => e.event_type === "questionnaire_content_updated");
    // 1 (link, já do Item 7) não conta aqui — questionnaire_linked é outro
    // event_type; os 4 abaixo (pergunta add/edit/del + metadados) são os
    // que esta revisão fechou.
    assert.ok(contentEvents.length >= 4, `esperava >=4 eventos de conteúdo via rota direta, achou ${contentEvents.length}`);
  });

  it("4d. mudança comercial global (configurações) aparece no histórico de QUALQUER produto, marcada como compartilhada", async () => {
    const { product } = await mkDraftProduct(`c11-${crypto.randomBytes(4).toString("hex")}`);
    const before = await prisma.catalog2PricingSettings.findUnique({ where: { id: "default" } });
    const r = await api("/api/admin/catalog2/pricing-settings", {
      method: "PUT", token: MASTER,
      body: { tax_percent: ((before?.tax_percent ?? 6) as number) + 1 },
    });
    assert.equal(r.status, 200, JSON.stringify(r.json));

    const hist = await api(`/api/admin/catalog2/products/${product.id}/history`, { token: MASTER });
    const globalEvent = hist.json.data.find((e: any) => e.event_type === "commercial_change_global");
    assert.ok(globalEvent, "mudança comercial global deve aparecer no histórico deste produto");
    assert.equal(globalEvent.shared, true);
  });

  it("4e. mudança de valor/hora de uma especialidade aparece só nos produtos que a usam, por vínculo real", async () => {
    const { product: usesSpecialty, versionId, specialtyId } = await mkDraftProduct(`c11-${crypto.randomBytes(4).toString("hex")}`);
    await api(`/api/admin/catalog2/versions/${versionId}/tasks`, { method: "POST", token: MASTER, body: { key: "t1", name: "Tarefa", specialty_id: specialtyId } });
    const { product: doesNotUse } = await mkDraftProduct(`c11-${crypto.randomBytes(4).toString("hex")}`);

    const before = await prisma.catalog2Specialty.findUniqueOrThrow({ where: { id: specialtyId } });
    const r = await api(`/api/admin/catalog2/specialties/${specialtyId}`, {
      method: "PUT", token: MASTER, body: { max_hourly_rate: (before.max_hourly_rate ?? 50) + 10 },
    });
    assert.equal(r.status, 200, JSON.stringify(r.json));

    const histUses = await api(`/api/admin/catalog2/products/${usesSpecialty.id}/history`, { token: MASTER });
    const evUses = histUses.json.data.find((e: any) => e.event_type === "commercial_change_specialty_rate");
    assert.ok(evUses, "produto que usa a especialidade deve ver o evento");
    assert.equal(evUses.shared, true);

    const histNot = await api(`/api/admin/catalog2/products/${doesNotUse.id}/history`, { token: MASTER });
    assert.ok(!histNot.json.data.some((e: any) => e.event_type === "commercial_change_specialty_rate"), "produto que NÃO usa a especialidade não deve ver o evento");
  });

  it("5. mesclagem mantém paginação e ordenação estáveis, sem duplicação, mesmo combinando várias fontes", async () => {
    const { product, versionId, specialtyId } = await mkDraftProduct(`c11-${crypto.randomBytes(4).toString("hex")}`);
    // gera eventos de fontes diferentes intercaladas: tarefa (history),
    // status (history), comercial global (commercial_change), etc.
    const task = await api(`/api/admin/catalog2/versions/${versionId}/tasks`, { method: "POST", token: MASTER, body: { key: "t1", name: "Tarefa", specialty_id: specialtyId } });
    await api(`/api/admin/catalog2/tasks/${task.json.id}/steps`, { method: "POST", token: MASTER, body: { key: "s1", name: "Etapa 1" } });
    await api(`/api/admin/catalog2/products/${product.id}/status`, { method: "PATCH", token: MASTER, body: { status: "arquivado" } });
    const before = await prisma.catalog2PricingSettings.findUnique({ where: { id: "default" } });
    await api("/api/admin/catalog2/pricing-settings", { method: "PUT", token: MASTER, body: { tax_percent: ((before?.tax_percent ?? 6) as number) + 2 } });

    const full = await api(`/api/admin/catalog2/products/${product.id}/history?page_size=100`, { token: MASTER });
    const total = full.json.total;
    assert.ok(total >= 4, `esperava pelo menos 4 eventos combinados, achou ${total}`);

    // percorre TODAS as páginas com page_size pequeno e confirma: sem
    // duplicatas, contagem bate com o total, ordenação estritamente
    // decrescente por data (com id como desempate).
    const pageSize = 2;
    const seen = new Set<string>();
    const allInOrder: { created_at: string; id: string }[] = [];
    for (let page = 1; page <= Math.ceil(total / pageSize); page++) {
      const r = await api(`/api/admin/catalog2/products/${product.id}/history?page=${page}&page_size=${pageSize}`, { token: MASTER });
      for (const e of r.json.data) {
        assert.ok(!seen.has(e.id), `evento ${e.id} apareceu duplicado entre páginas`);
        seen.add(e.id);
        allInOrder.push(e);
      }
    }
    assert.equal(seen.size, total, "paginação completa deve cobrir exatamente o total, sem faltar nem duplicar");
    for (let i = 1; i < allInOrder.length; i++) {
      const prevTime = new Date(allInOrder[i - 1].created_at).getTime();
      const curTime = new Date(allInOrder[i].created_at).getTime();
      assert.ok(prevTime > curTime || (prevTime === curTime && allInOrder[i - 1].id.localeCompare(allInOrder[i].id) > 0), "ordenação deve ser estritamente decrescente (com id como desempate)");
    }

    // repetir a mesma consulta de novo deve devolver a MESMA ordem/total —
    // mesclagem determinística, não aleatória.
    const again = await api(`/api/admin/catalog2/products/${product.id}/history?page_size=100`, { token: MASTER });
    assert.deepEqual(again.json.data.map((e: any) => e.id), full.json.data.map((e: any) => e.id), "reexecutar a consulta deve devolver a mesma ordem");
  });
});
