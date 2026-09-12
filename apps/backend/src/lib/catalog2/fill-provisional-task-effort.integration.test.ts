import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import crypto from "node:crypto";
import { requireTestDatabaseUrl } from "../../test-support/require-test-database";
import { prisma } from "../prisma";
import { seedCatalog2Classifications } from "../catalog2-classifications-seed";
import { runProvisionalTaskEffortFill } from "./fill-provisional-task-effort";
import { classifyTaskEffort } from "./classify-provisional-effort";

// Reunião 10/09 ("36 produtos funcionalmente completos para teste"):
// preenchimento provisório de especialidade/tempo — idempotente, nunca
// sobrescreve dado humano/real, nunca toca [TESTE LOCAL], nunca inventa
// especialidade inexistente. Fixtures sintéticas (nunca os 36 reais).

const productIds: string[] = [];

async function mkProduct(internalName: string) {
  const slug = `t9-effort-${crypto.randomBytes(6).toString("hex")}`;
  const product = await prisma.catalog2Product.create({ data: { slug, internal_name: internalName, status: "em_preparacao" } });
  productIds.push(product.id);
  await prisma.catalog2ProductVersion.create({ data: { product_id: product.id, version_number: 1, state: "rascunho", title: internalName } });
  return product;
}

async function purgeProduct(id: string) {
  const versions = await prisma.catalog2ProductVersion.findMany({ where: { product_id: id }, select: { id: true } });
  const vids = versions.map((v) => v.id);
  if (vids.length) await prisma.catalog2Task.deleteMany({ where: { version_id: { in: vids } } }).catch(() => {});
  await prisma.catalog2ProductVersion.deleteMany({ where: { product_id: id } }).catch(() => {});
  await prisma.catalog2Product.delete({ where: { id } }).catch(() => {});
}

describe("classifyTaskEffort — regras determinísticas", () => {
  it("nunca devolve uma especialidade fora das 7 existentes", () => {
    const cases = [
      ["Edição de Vídeo", "montar o vídeo final"],
      ["SEO", "pesquisar palavras-chave"],
      ["Gestão de Tráfego Pago", "configurar eventos de conversão"],
      ["Implantação de CRM", "configurar automações"],
      ["Criação de Identidade Visual", "vetorizar o logotipo"],
      ["Criação de Site Institucional", "montar as páginas no CMS"],
      ["Copywriting", "redigir o texto"],
      ["Produto qualquer sem pista nenhuma", "fazer a coisa"],
    ];
    const known = new Set(["gestor_trafego", "desenvolvedor_web", "especialista_seo_geo", "redator", "designer", "editor_video", "especialista_automacao"]);
    for (const [product, task] of cases) {
      const r = classifyTaskEffort(product, task);
      assert.ok(known.has(r.specialty_key), `especialidade "${r.specialty_key}" não é uma das 7 existentes`);
      assert.ok(Number.isInteger(r.estimated_minutes) && r.estimated_minutes > 0, "minutos deve ser um inteiro positivo");
    }
  });

  it("tarefa sem nenhuma palavra-chave reconhecida cai no fallback redator, sempre marcada ambígua", () => {
    const r = classifyTaskEffort("Produto Genérico Sem Pista", "fazer a coisa combinada");
    assert.equal(r.specialty_key, "redator");
    assert.equal(r.ambiguous, true);
    assert.match(r.ambiguous_reason!, /fallback/i);
  });
});

describe("runProvisionalTaskEffortFill — idempotência e regras de preservação", () => {
  before(async () => {
    requireTestDatabaseUrl();
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
    await seedCatalog2Classifications(prisma);
  });
  after(async () => {
    for (const id of productIds.splice(0)) await purgeProduct(id);
  });

  it("preenche tarefa vazia com especialidade existente + minutos plausíveis, marcando provisório", async () => {
    const p = await mkProduct("Edição de Vídeo (Cortes e Animação)");
    const v = await prisma.catalog2ProductVersion.findFirstOrThrow({ where: { product_id: p.id } });
    const task = await prisma.catalog2Task.create({ data: { version_id: v.id, key: "t1", name: "montar o vídeo final", sort_order: 0 } });

    const r = await runProvisionalTaskEffortFill({ mode: "apply" });
    const line = r.lines.find((l) => l.product_name === p.internal_name)!;
    assert.equal(line.outcome, "filled");
    assert.equal(line.specialty_key, "editor_video");
    assert.ok(line.estimated_minutes! > 0);

    const after1 = await prisma.catalog2Task.findUniqueOrThrow({ where: { id: task.id } });
    assert.ok(after1.specialty_id);
    assert.ok(after1.estimated_minutes! > 0);
    assert.equal(after1.effort_is_provisional, true);
    assert.equal(after1.effort_source, "provisional_fill_v1");
    assert.match(after1.effort_provisional_reason ?? "", /PROVISORIAMENTE para teste/);
  });

  it("segunda execução é idempotente: não duplica tarefa nem altera o valor já preenchido", async () => {
    const p = await mkProduct("SEO — Otimização para Buscadores (teste)");
    const v = await prisma.catalog2ProductVersion.findFirstOrThrow({ where: { product_id: p.id } });
    const task = await prisma.catalog2Task.create({ data: { version_id: v.id, key: "t1", name: "pesquisar palavras-chave", sort_order: 0 } });

    const first = await runProvisionalTaskEffortFill({ mode: "apply" });
    const firstLine = first.lines.find((l) => l.product_name === p.internal_name)!;
    assert.equal(firstLine.outcome, "filled");
    const afterFirst = await prisma.catalog2Task.findUniqueOrThrow({ where: { id: task.id } });

    const second = await runProvisionalTaskEffortFill({ mode: "apply" });
    const secondLine = second.lines.find((l) => l.product_name === p.internal_name)!;
    assert.equal(secondLine.outcome, "skipped_has_value");

    const afterSecond = await prisma.catalog2Task.findUniqueOrThrow({ where: { id: task.id } });
    assert.equal(afterSecond.specialty_id, afterFirst.specialty_id);
    assert.equal(afterSecond.estimated_minutes, afterFirst.estimated_minutes);
    assert.equal(afterSecond.updated_at.getTime(), afterFirst.updated_at.getTime(), "não deve nem re-gravar (updated_at inalterado)");
  });

  it("nunca sobrescreve tarefa marcada effort_source=human_reviewed, mesmo estando com valores diferentes do que a regra geraria", async () => {
    const p = await mkProduct("Criação de Site Institucional (teste humano)");
    const v = await prisma.catalog2ProductVersion.findFirstOrThrow({ where: { product_id: p.id } });
    const spec = await prisma.catalog2Specialty.findFirstOrThrow({ where: { key: "desenvolvedor_web" } });
    const task = await prisma.catalog2Task.create({
      data: { version_id: v.id, key: "t1", name: "montar as páginas no CMS", sort_order: 0, specialty_id: spec.id, estimated_minutes: 999, effort_is_provisional: false, effort_source: "human_reviewed" },
    });

    await runProvisionalTaskEffortFill({ mode: "apply" });
    const after1 = await prisma.catalog2Task.findUniqueOrThrow({ where: { id: task.id } });
    assert.equal(after1.estimated_minutes, 999, "valor humano preservado intacto");
    assert.equal(after1.effort_source, "human_reviewed");
    assert.equal(after1.effort_is_provisional, false);

    const line = (await runProvisionalTaskEffortFill({ mode: "dry_run" })).lines.find((l) => l.product_name === p.internal_name)!;
    assert.equal(line.outcome, "skipped_human_reviewed");
  });

  it("nunca cria/altera nada da fixture [TESTE LOCAL]", async () => {
    const p = await mkProduct("[TESTE LOCAL] Produto Demonstrativo Efeito");
    const v = await prisma.catalog2ProductVersion.findFirstOrThrow({ where: { product_id: p.id } });
    const task = await prisma.catalog2Task.create({ data: { version_id: v.id, key: "t1", name: "montar o vídeo final", sort_order: 0 } });

    const r = await runProvisionalTaskEffortFill({ mode: "apply" });
    assert.ok(!r.lines.some((l) => l.product_name === p.internal_name), "fixture [TESTE LOCAL] não deve aparecer no relatório");

    const after1 = await prisma.catalog2Task.findUniqueOrThrow({ where: { id: task.id } });
    assert.equal(after1.specialty_id, null);
    assert.equal(after1.estimated_minutes, null);
  });

  it("dry-run nunca grava", async () => {
    const p = await mkProduct("Criação de Identidade Visual (dry-run)");
    const v = await prisma.catalog2ProductVersion.findFirstOrThrow({ where: { product_id: p.id } });
    const task = await prisma.catalog2Task.create({ data: { version_id: v.id, key: "t1", name: "vetorizar o logotipo escolhido", sort_order: 0 } });

    const r = await runProvisionalTaskEffortFill({ mode: "dry_run" });
    const line = r.lines.find((l) => l.product_name === p.internal_name)!;
    assert.equal(line.outcome, "filled"); // simulado no relatório...

    const after1 = await prisma.catalog2Task.findUniqueOrThrow({ where: { id: task.id } });
    assert.equal(after1.specialty_id, null, "...mas nada foi de fato gravado");
    assert.equal(after1.estimated_minutes, null);
  });
});
