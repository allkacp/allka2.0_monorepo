import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import crypto from "node:crypto";
import { requireTestDatabaseUrl } from "../../test-support/require-test-database";
import { prisma } from "../prisma";
import { runTasksImport } from "./import-tasks-from-steps-text";

// Reunião 10/09 ("tarefas e etapas dos 36 produtos reais"): fonte real é o
// texto livre `cardapio_ia_steps_text` já preservado por produto na
// importação original — nunca uma nova planilha. Este teste cobre o
// comportamento do importador de tarefas isoladamente (produtos sintéticos,
// nunca os 36 de verdade), rodado standalone (schema de teste descartável).

const productIds: string[] = [];

async function purgeProduct(id: string) {
  const versions = await prisma.catalog2ProductVersion.findMany({ where: { product_id: id }, select: { id: true } });
  const vids = versions.map((v) => v.id);
  if (vids.length) {
    await prisma.catalog2TaskDependency.deleteMany({ where: { task: { version_id: { in: vids } } } }).catch(() => {});
    await prisma.catalog2TaskStep.deleteMany({ where: { task: { version_id: { in: vids } } } }).catch(() => {});
    await prisma.catalog2Task.deleteMany({ where: { version_id: { in: vids } } }).catch(() => {});
  }
  const origin = await prisma.catalog2ProductImportOrigin.findUnique({ where: { product_id: id } }).catch(() => null);
  if (origin) await prisma.catalog2ProductImportOrigin.delete({ where: { id: origin.id } }).catch(() => {});
  await prisma.catalog2ProductVersion.deleteMany({ where: { product_id: id } }).catch(() => {});
  await prisma.catalog2Product.delete({ where: { id } }).catch(() => {});
}

async function mkProduct(opts: {
  internalName: string;
  stepsText?: string | null;
  pendencies: string[];
  originTextsExtra?: Record<string, unknown>;
  humanEditedAt?: Date | null;
}) {
  const slug = `t-${crypto.randomBytes(6).toString("hex")}`;
  const product = await prisma.catalog2Product.create({
    data: { slug, internal_name: opts.internalName, status: "em_preparacao" },
  });
  productIds.push(product.id);
  await prisma.catalog2ProductVersion.create({
    data: { product_id: product.id, version_number: 1, state: "rascunho", title: opts.internalName },
  });
  const originTexts: Record<string, unknown> = { ...opts.originTextsExtra };
  if (opts.stepsText !== undefined) originTexts.cardapio_ia_steps_text = opts.stepsText;
  await prisma.catalog2ProductImportOrigin.create({
    data: {
      product_id: product.id,
      source_key: `t9:${slug}`,
      source_index: 1,
      source_name: opts.internalName,
      review_state: opts.pendencies[0] ?? "ready_for_final_review",
      pendencies_json: JSON.stringify(opts.pendencies),
      last_import_checksum: "chk",
      original_texts_json: JSON.stringify(originTexts),
      human_edited_at: opts.humanEditedAt ?? null,
    },
  });
  return product;
}

describe("runTasksImport — tarefas/etapas a partir do texto de etapas preservado", () => {
  before(() => requireTestDatabaseUrl());
  after(async () => {
    for (const id of productIds.splice(0)) await purgeProduct(id);
  });

  it("cria uma Catalog2Task por segmento do texto, em ordem, sem inventar especialidade/horas", async () => {
    const p = await mkProduct({
      internalName: "Produto com etapas reais",
      stepsText: "Passo um; Passo dois; Passo três",
      pendencies: ["content_review_pending", "price_pending"],
    });

    const r = await runTasksImport({ mode: "apply" });
    const line = r.lines.find((l) => l.product_id === p.id)!;
    assert.equal(line.outcome, "created");
    assert.equal(line.tasks_created, 3);

    const version = await prisma.catalog2ProductVersion.findFirstOrThrow({ where: { product_id: p.id } });
    const tasks = await prisma.catalog2Task.findMany({ where: { version_id: version.id }, orderBy: { sort_order: "asc" } });
    assert.equal(tasks.length, 3);
    assert.deepEqual(tasks.map((t) => t.name), ["Passo um", "Passo dois", "Passo três"]);
    assert.deepEqual(tasks.map((t) => t.sort_order), [0, 1, 2]);
    for (const t of tasks) {
      assert.equal(t.specialty_id, null);
      assert.equal(t.estimated_minutes, null);
    }

    // content_review_pending caiu (só existia por causa do texto de etapas,
    // sem variations_raw/addons_raw), e a pendência de esforço apareceu.
    const origin = await prisma.catalog2ProductImportOrigin.findUniqueOrThrow({ where: { product_id: p.id } });
    const pend = JSON.parse(origin.pendencies_json!);
    assert.ok(!pend.includes("content_review_pending"));
    assert.ok(pend.includes("task_effort_fields_pending"));
    assert.ok(pend.includes("price_pending")); // pendência não relacionada é preservada
  });

  it("mantém content_review_pending quando há variations_raw/addons_raw não resolvido (motivo real, não relacionado a tarefas)", async () => {
    const p = await mkProduct({
      internalName: "Produto com variação ambígua",
      stepsText: "Único passo",
      pendencies: ["content_review_pending"],
      originTextsExtra: { variations_raw: "texto de variação não estruturável" },
    });
    await runTasksImport({ mode: "apply" });
    const origin = await prisma.catalog2ProductImportOrigin.findUniqueOrThrow({ where: { product_id: p.id } });
    const pend = JSON.parse(origin.pendencies_json!);
    assert.ok(pend.includes("content_review_pending"), "não deve remover pendência de outro motivo real");
    assert.ok(pend.includes("task_effort_fields_pending"));
  });

  it("nunca sobrescreve pendências de um produto com edição humana já registrada (mas ainda cria as tarefas)", async () => {
    const p = await mkProduct({
      internalName: "Produto já revisado por humano",
      stepsText: "Passo A; Passo B",
      pendencies: ["content_review_pending"],
      humanEditedAt: new Date(),
    });
    const r = await runTasksImport({ mode: "apply" });
    const line = r.lines.find((l) => l.product_id === p.id)!;
    assert.equal(line.tasks_created, 2);
    assert.equal(line.content_pendency_cleared, false);
    assert.equal(line.effort_pendency_added, false);
    assert.equal(line.pendencies_untouched_reason, "edição humana já registrada — pendências preservadas");

    const origin = await prisma.catalog2ProductImportOrigin.findUniqueOrThrow({ where: { product_id: p.id } });
    assert.deepEqual(JSON.parse(origin.pendencies_json!), ["content_review_pending"]);
  });

  it("produto sem texto de etapas na fonte: nenhuma tarefa inventada, pendência não mexida", async () => {
    const p = await mkProduct({
      internalName: "Produto sem etapas na fonte",
      stepsText: null,
      pendencies: ["content_review_pending"],
    });
    const r = await runTasksImport({ mode: "apply" });
    const line = r.lines.find((l) => l.product_id === p.id)!;
    assert.equal(line.outcome, "no_source_text");
    assert.equal(line.tasks_created, 0);

    const version = await prisma.catalog2ProductVersion.findFirstOrThrow({ where: { product_id: p.id } });
    const tasks = await prisma.catalog2Task.findMany({ where: { version_id: version.id } });
    assert.equal(tasks.length, 0);
  });

  it("nunca cria tarefas para a fixture [TESTE LOCAL] (excluída do escopo dos produtos reais)", async () => {
    const p = await mkProduct({
      internalName: "[TESTE LOCAL] Produto Demonstrativo XYZ",
      stepsText: "Não deveria virar tarefa nunca",
      pendencies: [],
    });
    const r = await runTasksImport({ mode: "apply" });
    assert.ok(!r.lines.some((l) => l.product_id === p.id), "fixture de teste local não deve aparecer no relatório");

    const version = await prisma.catalog2ProductVersion.findFirstOrThrow({ where: { product_id: p.id } });
    const tasks = await prisma.catalog2Task.findMany({ where: { version_id: version.id } });
    assert.equal(tasks.length, 0);
  });

  it("idempotente: rodar apply duas vezes não duplica tarefas nem gera novas linhas 'created'", async () => {
    const p = await mkProduct({
      internalName: "Produto para idempotência",
      stepsText: "Único passo idempotente",
      pendencies: [],
    });
    const first = await runTasksImport({ mode: "apply" });
    const firstLine = first.lines.find((l) => l.product_id === p.id)!;
    assert.equal(firstLine.tasks_created, 1);

    const second = await runTasksImport({ mode: "apply" });
    const secondLine = second.lines.find((l) => l.product_id === p.id)!;
    assert.equal(secondLine.outcome, "already_present");
    assert.equal(secondLine.tasks_created, 0);
    assert.equal(secondLine.tasks_already_existing, 1);

    const version = await prisma.catalog2ProductVersion.findFirstOrThrow({ where: { product_id: p.id } });
    const tasks = await prisma.catalog2Task.findMany({ where: { version_id: version.id } });
    assert.equal(tasks.length, 1, "não pode duplicar a tarefa na segunda execução");
  });

  it("dry-run nunca grava (nem tarefa, nem pendência)", async () => {
    const p = await mkProduct({
      internalName: "Produto dry-run",
      stepsText: "Passo único dry-run",
      pendencies: ["content_review_pending"],
    });
    const r = await runTasksImport({ mode: "dry_run" });
    const line = r.lines.find((l) => l.product_id === p.id)!;
    assert.equal(line.tasks_created, 1); // simulado no relatório...

    const version = await prisma.catalog2ProductVersion.findFirstOrThrow({ where: { product_id: p.id } });
    const tasks = await prisma.catalog2Task.findMany({ where: { version_id: version.id } });
    assert.equal(tasks.length, 0, "...mas nada foi de fato gravado"); // nunca grava

    const origin = await prisma.catalog2ProductImportOrigin.findUniqueOrThrow({ where: { product_id: p.id } });
    assert.deepEqual(JSON.parse(origin.pendencies_json!), ["content_review_pending"]);
  });
});
