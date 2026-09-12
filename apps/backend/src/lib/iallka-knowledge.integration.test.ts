import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import fs from "node:fs";
import crypto from "node:crypto";
import { requireTestDatabaseUrl } from "../test-support/require-test-database";
import { prisma } from "../lib/prisma";
import { createProduct, newDraftVersion, publishVersion } from "../lib/catalog2-service";
import { seedCatalog2Classifications, seedCatalog2FourFForTests } from "../lib/catalog2-classifications-seed";
import { buildCatalog2KnowledgeText, buildProjectBriefingText } from "./iallka-knowledge";
import { ensureUploadDir, generateStoredFileName, uploadedFilePath } from "./file-storage";

// Base de conhecimento da IAllka (reunião 10/09): estes testes chamam as
// funções de montagem de contexto DIRETO (sem passar pela IA de verdade,
// que dependeria da API do Gemini) — provam que o texto/fontes entregues
// pra IA já vêm honestos (real × provisório × em preparação × fixture
// excluída) e que o briefing de projeto é isolado por projeto.

const catProducts: string[] = [];
const projects: string[] = [];

describe("IAllka — base de conhecimento (catálogo2 e briefing de projeto)", () => {
  before(async () => {
    requireTestDatabaseUrl();
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
    await seedCatalog2FourFForTests(prisma);
    await seedCatalog2Classifications(prisma);
  });
  after(async () => {
    for (const id of catProducts) {
      await prisma.catalog2Product.update({ where: { id }, data: { published_version_id: null } }).catch(() => {});
      await prisma.catalog2ProductVersion.deleteMany({ where: { product_id: id } });
      await prisma.catalog2Product.delete({ where: { id } }).catch(() => {});
    }
    await prisma.projectAttachment.deleteMany({ where: { project_id: { in: projects } } });
    await prisma.project.deleteMany({ where: { id: { in: projects } } });
    await prisma.$disconnect();
  });

  it("1. produto real (publicado, com preço/prazo reais) aparece no texto com [REAL], nunca 'em preparação'", async () => {
    const p = await createProduct({ internal_name: "[TESTE] Conhecimento Real" }, "system");
    catProducts.push(p.id);
    const v1 = await prisma.catalog2ProductVersion.findFirstOrThrow({ where: { product_id: p.id, version_number: 1 } });
    await prisma.catalog2ProductVersion.update({ where: { id: v1.id }, data: { summary: "Resumo real de teste.", base_commercial_deadline_days: 7 } });
    // publica direto (force) — sem tarefa real, então commercial_ready fica
    // false mesmo publicado (regra de precificação já existente); ainda
    // assim serve pra provar que o produto aparece e nunca finge "[REAL]"
    // sem tarefa que sustente o preço.
    await prisma.catalog2ProductVersion.update({ where: { id: v1.id }, data: { published_at: new Date(), state: "publicada" } });
    await prisma.catalog2Product.update({ where: { id: p.id }, data: { published_version_id: v1.id, status: "disponivel" } });

    const { text, sources } = await buildCatalog2KnowledgeText({ includeProvisional: false, clientVisibleOnly: false });
    assert.ok(text.includes("[TESTE] Conhecimento Real"));
    assert.ok(sources.some((s) => s.name === "[TESTE] Conhecimento Real"));
    // sem tarefa cadastrada, preço nunca é [REAL] fingido — fica "a definir".
    const line = text.split("\n").find((l) => l.includes("[TESTE] Conhecimento Real"))!;
    assert.ok(!line.includes("R$") || line.includes("a definir"));
  });

  it("2. fixture '[TESTE LOCAL]' nunca aparece no texto nem nas fontes", async () => {
    const fixture = await createProduct({ internal_name: "[TESTE LOCAL] Demo de Conhecimento" }, "system");
    catProducts.push(fixture.id);
    const { text, sources } = await buildCatalog2KnowledgeText({ includeProvisional: true, clientVisibleOnly: false });
    assert.ok(!text.includes("[TESTE LOCAL]"));
    assert.ok(!sources.some((s) => s.name.includes("TESTE LOCAL")));
  });

  it("3. produto em preparação (nunca publicado) é marcado EM PREPARAÇÃO — nunca 'disponível para contratação'", async () => {
    const p = await createProduct({ internal_name: "[TESTE] Conhecimento Em Preparação" }, "system");
    catProducts.push(p.id);
    const { text } = await buildCatalog2KnowledgeText({ includeProvisional: false, clientVisibleOnly: false });
    const line = text.split("\n").find((l) => l.includes("[TESTE] Conhecimento Em Preparação"))!;
    assert.ok(line.includes("EM PREPARAÇÃO"));
    assert.ok(!line.includes("disponibilidade: disponível para contratação"));
  });

  it("4. preço/prazo provisório NUNCA aparece quando includeProvisional=false (Company/Agency/Partner)", async () => {
    const p = await createProduct({ internal_name: "[TESTE] Conhecimento Provisório" }, "system");
    catProducts.push(p.id);
    await prisma.catalog2ProvisionalPreview.create({ data: { product_id: p.id, price_amount: 1234, deadline_days: 9 } });

    const semProvisorio = await buildCatalog2KnowledgeText({ includeProvisional: false, clientVisibleOnly: false });
    const linhaSem = semProvisorio.text.split("\n").find((l) => l.includes("[TESTE] Conhecimento Provisório"))!;
    assert.ok(!linhaSem.includes("1234"));
    assert.ok(!linhaSem.includes("PROVISÓRIO"));

    const comProvisorio = await buildCatalog2KnowledgeText({ includeProvisional: true, clientVisibleOnly: false });
    const linhaCom = comProvisorio.text.split("\n").find((l) => l.includes("[TESTE] Conhecimento Provisório"))!;
    assert.ok(linhaCom.includes("1234"));
    assert.ok(linhaCom.includes("PROVISÓRIO"));

    await prisma.catalog2ProvisionalPreview.delete({ where: { product_id: p.id } });
  });

  it("Admin Master recebe a simulação calculada e contas comuns nunca recebem", async () => {
    const p = await createProduct({ internal_name: "[TESTE] Conhecimento Simulação Calculada" }, "system");
    catProducts.push(p.id);
    const version = await prisma.catalog2ProductVersion.findFirstOrThrow({ where: { product_id: p.id, state: "rascunho" } });
    const specialty = await prisma.catalog2Specialty.findFirstOrThrow({ where: { key: "designer" } });
    await prisma.catalog2Specialty.update({ where: { id: specialty.id }, data: { max_hourly_rate: 100 } });
    await prisma.catalog2Task.create({
      data: { version_id: version.id, key: "sim-t1", name: "Tarefa provisória", sort_order: 0, specialty_id: specialty.id, estimated_minutes: 60, effort_is_provisional: true, effort_source: "provisional_fill_v1" },
    });
    await prisma.catalog2ProductVersion.update({ where: { id: version.id }, data: { provisional_commercial_deadline_days: 4, provisional_deadline_source: "provisional_simulation_v1" } });
    await prisma.catalog2PricingSimulationSettings.upsert({
      where: { id: "default" },
      create: { id: "default", tax_percent: 6, commission_percent: 10, operational_fee_percent: 5, profit_margin_percent: 25, human_review_percent: 12, component_order_json: JSON.stringify(["tax", "commission", "operational", "margin"]), is_provisional: true },
      update: { tax_percent: 6, commission_percent: 10, operational_fee_percent: 5, profit_margin_percent: 25, human_review_percent: 12, component_order_json: JSON.stringify(["tax", "commission", "operational", "margin"]), is_provisional: true },
    });
    await prisma.catalog2PricingSimulationSpecialtyRate.upsert({
      where: { specialty_id: specialty.id },
      create: { specialty_id: specialty.id, hourly_rate: 90, is_provisional: true, source: "provisional_simulation_v1" },
      update: { hourly_rate: 90, is_provisional: true, source: "provisional_simulation_v1" },
    });
    try {
      const admin = await buildCatalog2KnowledgeText({ includeProvisional: true, clientVisibleOnly: false });
      const adminLine = admin.text.split("\n").find((l) => l.includes("[TESTE] Conhecimento Simulação Calculada"))!;
      assert.match(adminLine, /SIMULAÇÃO PROVISÓRIA PARA TESTE/);

      const common = await buildCatalog2KnowledgeText({ includeProvisional: false, clientVisibleOnly: false });
      const commonLine = common.text.split("\n").find((l) => l.includes("[TESTE] Conhecimento Simulação Calculada"))!;
      assert.ok(!commonLine.includes("SIMULAÇÃO"));
    } finally {
      await prisma.catalog2PricingSimulationSpecialtyRate.deleteMany({ where: { specialty_id: specialty.id } });
      await prisma.catalog2PricingSimulationSettings.deleteMany({ where: { id: "default" } });
    }
  });

  it("clientVisibleOnly exclui produto em preparação inteiramente (cliente comum nunca vê o que não pode contratar)", async () => {
    const p = await createProduct({ internal_name: "[TESTE] Conhecimento Cliente" }, "system");
    catProducts.push(p.id);
    const { text } = await buildCatalog2KnowledgeText({ includeProvisional: false, clientVisibleOnly: true });
    assert.ok(!text.includes("[TESTE] Conhecimento Cliente"));
  });

  it("9. briefing de projeto: só o texto do PRÓPRIO projeto é retornado, nunca de outro", async () => {
    const projA = await prisma.project.create({
      data: { title: "Projeto A — briefing", project_code: `proj-briefing-a-${crypto.randomBytes(4).toString("hex")}`, status: "draft", lifecycle: "avulso" },
    });
    const projB = await prisma.project.create({
      data: { title: "Projeto B — briefing", project_code: `proj-briefing-b-${crypto.randomBytes(4).toString("hex")}`, status: "draft", lifecycle: "avulso" },
    });
    projects.push(projA.id, projB.id);

    const dir = ensureUploadDir(`project-documents/${projA.id}`);
    const storedName = generateStoredFileName("briefing-a.txt");
    fs.writeFileSync(uploadedFilePath(`project-documents/${projA.id}`, storedName), "Conteúdo privado exclusivo do Projeto A.");
    await prisma.projectAttachment.create({
      data: { project_id: projA.id, name: "briefing-a.txt", file_name: storedName, mime_type: "text/plain" },
    });

    const briefingA = await buildProjectBriefingText(projA.id);
    assert.ok(briefingA?.text.includes("Conteúdo privado exclusivo do Projeto A."));

    const briefingB = await buildProjectBriefingText(projB.id);
    assert.equal(briefingB, null); // Projeto B não tem nenhum documento — nunca vê o de A.
  });
});
