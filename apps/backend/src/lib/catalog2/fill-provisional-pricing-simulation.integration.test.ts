import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import crypto from "node:crypto";
import { requireTestDatabaseUrl } from "../../test-support/require-test-database";
import { prisma } from "../prisma";
import { seedCatalog2Classifications } from "../catalog2-classifications-seed";
import { runProvisionalPricingSimulationFill, PROVISIONAL_DEADLINE_BUFFER_DAYS, PROVISIONAL_DEADLINE_MIN_DAYS } from "./fill-provisional-pricing-simulation";
import { WORKDAY_MINUTES } from "../catalog2-pricing";

// Reunião 10/09 ("precificação dos 36 produtos funcional para teste"):
// preenchimento provisório da estrutura de SIMULAÇÃO — idempotente, nunca
// sobrescreve prazo real/tarefa humana revisada, nunca toca [TESTE LOCAL].

const productIds: string[] = [];

async function mkProduct(internalName: string) {
  const slug = `t10-simfill-${crypto.randomBytes(6).toString("hex")}`;
  const product = await prisma.catalog2Product.create({ data: { slug, internal_name: internalName, status: "em_preparacao" } });
  productIds.push(product.id);
  const version = await prisma.catalog2ProductVersion.create({ data: { product_id: product.id, version_number: 1, state: "rascunho", title: internalName } });
  return { product, version };
}

async function purgeProduct(id: string) {
  const versions = await prisma.catalog2ProductVersion.findMany({ where: { product_id: id }, select: { id: true } });
  const vids = versions.map((v) => v.id);
  if (vids.length) await prisma.catalog2Task.deleteMany({ where: { version_id: { in: vids } } }).catch(() => {});
  await prisma.catalog2ProductVersion.deleteMany({ where: { product_id: id } }).catch(() => {});
  await prisma.catalog2Product.delete({ where: { id } }).catch(() => {});
}

describe("runProvisionalPricingSimulationFill — idempotência e regras de preservação", () => {
  before(async () => {
    requireTestDatabaseUrl();
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
    await seedCatalog2Classifications(prisma);
    await prisma.catalog2PricingSimulationSettings.deleteMany({ where: { id: "default" } });
  });
  after(async () => {
    for (const id of productIds.splice(0)) await purgeProduct(id);
    await prisma.catalog2PricingSimulationSettings.deleteMany({ where: { id: "default" } });
  });

  it("cria Catalog2PricingSimulationSettings uma vez; segunda execução preserva (não sobrescreve)", async () => {
    const r1 = await runProvisionalPricingSimulationFill({ mode: "apply" });
    assert.equal(r1.settings_outcome, "created");
    const seeded = await prisma.catalog2PricingSimulationSettings.findUniqueOrThrow({ where: { id: "default" } });
    assert.equal(seeded.is_provisional, true);
    assert.equal(seeded.source, "provisional_simulation_v1");

    // ajuste manual hipotético — nunca deve ser apagado pela 2ª execução
    await prisma.catalog2PricingSimulationSettings.update({ where: { id: "default" }, data: { profit_margin_percent: 41 } });
    const r2 = await runProvisionalPricingSimulationFill({ mode: "apply" });
    assert.equal(r2.settings_outcome, "already_exists");
    const after1 = await prisma.catalog2PricingSimulationSettings.findUniqueOrThrow({ where: { id: "default" } });
    assert.equal(after1.profit_margin_percent, 41, "valor ajustado manualmente preservado");
  });

  it("preenche prazo provisório determinístico = esforço humano (dias) + buffer, com piso mínimo", async () => {
    const { version } = await mkProduct("Produto Simulação A");
    const spec = await prisma.catalog2Specialty.findFirstOrThrow({ where: { key: "designer" } });
    await prisma.catalog2Task.create({ data: { version_id: version.id, key: "t1", name: "Tarefa 1", sort_order: 0, specialty_id: spec.id, estimated_minutes: WORKDAY_MINUTES * 2 } });

    const r = await runProvisionalPricingSimulationFill({ mode: "apply" });
    const line = r.deadline_lines.find((l) => l.version_id === version.id)!;
    assert.equal(line.outcome, "filled");
    assert.equal(line.provisional_commercial_deadline_days, 2 + PROVISIONAL_DEADLINE_BUFFER_DAYS);

    const after1 = await prisma.catalog2ProductVersion.findUniqueOrThrow({ where: { id: version.id } });
    assert.equal(after1.provisional_commercial_deadline_days, 2 + PROVISIONAL_DEADLINE_BUFFER_DAYS);
    assert.match(after1.provisional_deadline_reason ?? "", /PROVISÓRIO/);
  });

  it("produto sem nenhuma tarefa ainda usa o piso mínimo — nunca fica sem prazo simulável", async () => {
    const { version } = await mkProduct("Produto Simulação Vazio");
    const r = await runProvisionalPricingSimulationFill({ mode: "apply" });
    const line = r.deadline_lines.find((l) => l.version_id === version.id)!;
    assert.equal(line.provisional_commercial_deadline_days, PROVISIONAL_DEADLINE_MIN_DAYS);
  });

  it("nunca sobrescreve prazo REAL já definido, mesmo rodando de novo", async () => {
    const { version } = await mkProduct("Produto Com Prazo Real");
    await prisma.catalog2ProductVersion.update({ where: { id: version.id }, data: { base_commercial_deadline_days: 15 } });
    const r = await runProvisionalPricingSimulationFill({ mode: "apply" });
    const line = r.deadline_lines.find((l) => l.version_id === version.id)!;
    assert.equal(line.outcome, "skipped_has_real");
    const after1 = await prisma.catalog2ProductVersion.findUniqueOrThrow({ where: { id: version.id } });
    assert.equal(after1.provisional_commercial_deadline_days, null, "nunca preenche provisório quando o real existe");
    assert.equal(after1.base_commercial_deadline_days, 15);
  });

  it("segunda execução é idempotente: não altera prazo provisório já preenchido", async () => {
    const { version } = await mkProduct("Produto Simulação Idempotente");
    await runProvisionalPricingSimulationFill({ mode: "apply" });
    const afterFirst = await prisma.catalog2ProductVersion.findUniqueOrThrow({ where: { id: version.id } });
    const r2 = await runProvisionalPricingSimulationFill({ mode: "apply" });
    const line2 = r2.deadline_lines.find((l) => l.version_id === version.id)!;
    assert.equal(line2.outcome, "skipped_already_provisional");
    const afterSecond = await prisma.catalog2ProductVersion.findUniqueOrThrow({ where: { id: version.id } });
    assert.equal(afterSecond.provisional_commercial_deadline_days, afterFirst.provisional_commercial_deadline_days);
    assert.equal(afterSecond.updated_at.getTime(), afterFirst.updated_at.getTime());
  });

  it("backfilla effort_ambiguous só nas tarefas preenchidas pelo classificador (provisional_fill_v1), preservando human_reviewed", async () => {
    const { product, version } = await mkProduct("Edição de Vídeo (Cortes e Animação)");
    const specVideo = await prisma.catalog2Specialty.findFirstOrThrow({ where: { key: "editor_video" } });
    const specWeb = await prisma.catalog2Specialty.findFirstOrThrow({ where: { key: "desenvolvedor_web" } });
    // tarefa preenchida pelo classificador provisório — texto ambíguo (bate em mais de uma regra)
    const ambiguousTask = await prisma.catalog2Task.create({
      data: { version_id: version.id, key: "t1", name: "montar o vídeo final", sort_order: 0, specialty_id: specVideo.id, estimated_minutes: 90, effort_is_provisional: true, effort_source: "provisional_fill_v1" },
    });
    // tarefa human_reviewed — nunca deve ser tocada
    const humanTask = await prisma.catalog2Task.create({
      data: { version_id: version.id, key: "t2", name: "qualquer coisa", sort_order: 1, specialty_id: specWeb.id, estimated_minutes: 999, effort_is_provisional: false, effort_source: "human_reviewed", effort_ambiguous: true, effort_ambiguous_reason: "não deve mudar" },
    });
    // tarefa ainda não preenchida (missing) — nunca deve ser tocada
    const missingTask = await prisma.catalog2Task.create({ data: { version_id: version.id, key: "t3", name: "tarefa sem preenchimento", sort_order: 2 } });

    const r = await runProvisionalPricingSimulationFill({ mode: "apply" });
    const lines = r.ambiguous_lines.filter((l) => l.product_name === product.internal_name);
    assert.equal(lines.find((l) => l.task_key === "t1")!.outcome, "updated");
    assert.equal(lines.find((l) => l.task_key === "t2")!.outcome, "skipped_human_reviewed");
    assert.equal(lines.find((l) => l.task_key === "t3")!.outcome, "skipped_not_provisional_fill");

    const afterAmbiguous = await prisma.catalog2Task.findUniqueOrThrow({ where: { id: ambiguousTask.id } });
    assert.equal(afterAmbiguous.specialty_id, specVideo.id, "specialty_id nunca é tocado pelo backfill de ambiguidade");
    assert.equal(afterAmbiguous.estimated_minutes, 90);

    const afterHuman = await prisma.catalog2Task.findUniqueOrThrow({ where: { id: humanTask.id } });
    assert.equal(afterHuman.effort_ambiguous, true);
    assert.equal(afterHuman.effort_ambiguous_reason, "não deve mudar", "human_reviewed nunca é sobrescrito");

    const afterMissing = await prisma.catalog2Task.findUniqueOrThrow({ where: { id: missingTask.id } });
    assert.equal(afterMissing.effort_ambiguous, false);
    assert.equal(afterMissing.effort_ambiguous_reason, null);
  });

  it("nunca cria/altera nada da fixture [TESTE LOCAL]", async () => {
    const { product, version } = await mkProduct("[TESTE LOCAL] Produto Demonstrativo Simulação");
    await prisma.catalog2Task.create({ data: { version_id: version.id, key: "t1", name: "montar o vídeo final", sort_order: 0, effort_source: "provisional_fill_v1", estimated_minutes: 90 } });

    const r = await runProvisionalPricingSimulationFill({ mode: "apply" });
    assert.ok(!r.deadline_lines.some((l) => l.product_name === product.internal_name));
    assert.ok(!r.ambiguous_lines.some((l) => l.product_name === product.internal_name));

    const after1 = await prisma.catalog2ProductVersion.findUniqueOrThrow({ where: { id: version.id } });
    assert.equal(after1.provisional_commercial_deadline_days, null);
  });

  it("dry-run nunca grava", async () => {
    await prisma.catalog2PricingSimulationSettings.deleteMany({ where: { id: "default" } });
    const { version } = await mkProduct("Produto Simulação Dry-Run");
    const spec = await prisma.catalog2Specialty.findFirstOrThrow({ where: { key: "designer" } });
    await prisma.catalog2Task.create({ data: { version_id: version.id, key: "t1", name: "Tarefa 1", sort_order: 0, specialty_id: spec.id, estimated_minutes: 60, effort_source: "provisional_fill_v1" } });

    const r = await runProvisionalPricingSimulationFill({ mode: "dry_run" });
    assert.equal(r.settings_outcome, "created"); // reportado como se fosse criar...
    const settings = await prisma.catalog2PricingSimulationSettings.findUnique({ where: { id: "default" } });
    assert.equal(settings, null, "...mas nada foi de fato gravado");

    const after1 = await prisma.catalog2ProductVersion.findUniqueOrThrow({ where: { id: version.id } });
    assert.equal(after1.provisional_commercial_deadline_days, null);
  });
});
