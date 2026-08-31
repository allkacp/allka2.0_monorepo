import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import crypto from "node:crypto";
import { requireTestDatabaseUrl } from "../test-support/require-test-database";
import { prisma } from "../lib/prisma";
import { selecionarNomadeParaTarefa } from "./selecionar-nomade";

// Reparo "duplicidade de Tarefa aguardando nômade" (ata 2026-08, 6º lote):
// selecionarNomadeParaTarefa roda uma vez por ETAPA que precisa de executor
// (ver stage-engine.ts, atribuirExecutorDaEtapa), então uma tarefa com
// várias etapas de nômade sem candidato disponível ao mesmo tempo chamava
// isto várias vezes seguidas pro MESMO taskId — cada chamada criava um
// SystemAlert "Tarefa aguardando nômade" novo, idêntico. A categoria usada
// aqui (única por teste, nunca cadastrada em NomadeHabilidade) garante
// deliberadamente "nenhum candidato encontrado", pra exercitar o branch que
// cria o alerta.

const createdProjectIds: string[] = [];
const createdProductIds: string[] = [];
const createdTaskIds: string[] = [];
const createdAlertIds: string[] = [];

async function createTaskWithoutEligibleNomad() {
  const code = `dedupe-${crypto.randomBytes(4).toString("hex")}`;
  const project = await prisma.project.create({
    data: { title: `Projeto teste dedupe ${code}`, project_code: `proj_${code}`, status: "in-progress" },
  });
  createdProjectIds.push(project.id);
  const product = await prisma.product.create({
    // Categoria única e nunca cadastrada em NomadeHabilidade — garante
    // "nenhum candidato encontrado" de forma determinística.
    data: { name: `Produto teste dedupe ${code}`, category: `categoria-inexistente-${code}` },
  });
  createdProductIds.push(product.id);
  const projectProduct = await prisma.projectProduct.create({
    data: {
      project_id: project.id,
      product_id: product.id,
      product_name_snapshot: product.name,
      product_category_snapshot: product.category,
    },
  });
  const task = await prisma.projectTask.create({
    data: {
      project_id: project.id,
      project_product_id: projectProduct.id,
      product_id: product.id,
      name_snapshot: product.name,
      title: `Tarefa teste dedupe ${code}`,
      status: "LIBERADA_PARA_EXECUCAO",
      category_snapshot: product.category,
    },
  });
  createdTaskIds.push(task.id);
  return task;
}

describe("selecionarNomadeParaTarefa — dedupe de 'Tarefa aguardando nômade' (ata 2026-08, 6º lote)", () => {
  before(async () => {
    requireTestDatabaseUrl();
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
  });

  after(async () => {
    await prisma.systemAlert.deleteMany({ where: { id: { in: createdAlertIds } } });
    await prisma.taskAssignmentHistory.deleteMany({ where: { project_task_id: { in: createdTaskIds } } });
    await prisma.projectTask.deleteMany({ where: { id: { in: createdTaskIds } } });
    await prisma.projectProduct.deleteMany({ where: { project_id: { in: createdProjectIds } } });
    await prisma.project.deleteMany({ where: { id: { in: createdProjectIds } } });
    await prisma.product.deleteMany({ where: { id: { in: createdProductIds } } });
    await prisma.$disconnect();
  });

  it("1. sem candidato disponível -> cria exatamente 1 SystemAlert ativo", async () => {
    const task = await createTaskWithoutEligibleNomad();
    const result = await selecionarNomadeParaTarefa(task.id);
    assert.equal(result.status, "sem_nomade_disponivel");

    const alerts = await prisma.systemAlert.findMany({
      where: { type: "nomade_nao_encontrado", entity_type: "project_task", entity_id: task.id },
    });
    createdAlertIds.push(...alerts.map((a) => a.id));
    assert.equal(alerts.length, 1);
  });

  it("2. chamado duas vezes seguidas pro MESMO taskId (simula duas etapas disparando ao mesmo tempo) -> continua só 1 alerta ativo, nunca duplica", async () => {
    const task = await createTaskWithoutEligibleNomad();

    await selecionarNomadeParaTarefa(task.id);
    await selecionarNomadeParaTarefa(task.id);

    const alerts = await prisma.systemAlert.findMany({
      where: { type: "nomade_nao_encontrado", entity_type: "project_task", entity_id: task.id },
    });
    createdAlertIds.push(...alerts.map((a) => a.id));
    assert.equal(alerts.length, 1, "duas chamadas seguidas não podem criar dois alertas idênticos");
    assert.equal(alerts[0].is_archived, false);
  });

  it("3. se o alerta anterior já foi arquivado, uma nova chamada cria um novo (nunca fica travado sem alerta ativo)", async () => {
    const task = await createTaskWithoutEligibleNomad();

    await selecionarNomadeParaTarefa(task.id);
    const [first] = await prisma.systemAlert.findMany({
      where: { type: "nomade_nao_encontrado", entity_type: "project_task", entity_id: task.id },
    });
    createdAlertIds.push(first.id);
    await prisma.systemAlert.update({ where: { id: first.id }, data: { is_archived: true, archived_at: new Date() } });

    await selecionarNomadeParaTarefa(task.id);
    const alerts = await prisma.systemAlert.findMany({
      where: { type: "nomade_nao_encontrado", entity_type: "project_task", entity_id: task.id },
    });
    createdAlertIds.push(...alerts.map((a) => a.id));
    const active = alerts.filter((a) => !a.is_archived);
    assert.equal(active.length, 1, "precisa ter exatamente 1 alerta ativo depois de um novo ciclo de falha");
    // Histórico nunca é apagado — o arquivado de antes continua existindo.
    assert.equal(alerts.length, 2);
  });
});
