import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import crypto from "node:crypto";
import { requireTestDatabaseUrl } from "../test-support/require-test-database";
import { prisma } from "../lib/prisma";
import { avancarCiclosOnce, CycleError, decidirCiclo, entregarCiclo, etapaPodeFechar, listarCiclos, materializarCiclosDaEtapa, planCycles } from "../lib/stage-cycles";

// Etapa em ciclos (23/10): ciclos nascem quando a etapa inicia; cada ciclo abre na data certa COM OU SEM aprovação do anterior;
// entrega → cliente aprova em prazo curto; reprovação vira orientação do ciclo seguinte (o anterior não reabre);
// sem resposta encerra o ciclo; a etapa só fecha quando todos os ciclos terminam.

const suffix = `${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
const DAY = 86_400_000;
const createdProjectIds: string[] = [];
const createdProductIds: string[] = [];

const cfg = (items: { from_day: number; to_day: number; approval_window_days: number }[]) => JSON.stringify({ cycles: items, client_approval_mode: "none" });

async function fixture(startedDaysAgo: number, items: { from_day: number; to_day: number; approval_window_days: number }[]) {
  const code = `cyc-${suffix}-${crypto.randomBytes(2).toString("hex")}`;
  const project = await prisma.project.create({ data: { title: `Projeto ${code}`, project_code: code, status: "in-progress" } });
  createdProjectIds.push(project.id);
  const product = await prisma.product.create({ data: { name: `Produto ${code}`, category: "teste" } });
  createdProductIds.push(product.id);
  const pp = await prisma.projectProduct.create({ data: { project_id: project.id, product_id: product.id, product_name_snapshot: product.name, product_category_snapshot: product.category } });
  const task = await prisma.projectTask.create({ data: { project_id: project.id, project_product_id: pp.id, product_id: product.id, name_snapshot: product.name, title: `Tarefa ${code}`, status: "EM_EXECUCAO" } });
  const stage = await prisma.projectTaskStage.create({
    data: { project_task_id: task.id, titulo: "Gestão de campanhas", ordem: 1, obrigatoria: true, status: "EM_ANDAMENTO", iniciada_em: new Date(Date.now() - startedDaysAgo * DAY), config_snapshot: cfg(items) },
  });
  return { project, task, stage };
}

const WEEKS = [
  { from_day: 1, to_day: 7, approval_window_days: 2 },
  { from_day: 8, to_day: 14, approval_window_days: 2 },
  { from_day: 15, to_day: 21, approval_window_days: 2 },
];

describe("Etapa em ciclos (motor)", () => {
  before(() => { requireTestDatabaseUrl(); });
  after(async () => {
    for (const id of createdProjectIds) await prisma.project.delete({ where: { id } }).catch(() => {});
    for (const id of createdProductIds) await prisma.product.delete({ where: { id } }).catch(() => {});
    await prisma.$disconnect();
  });

  it("planCycles: o ciclo 1 começa quando a etapa começa; os outros à 00h do dia certo; o último termina no fim do dia", () => {
    const start = new Date(2026, 9, 1, 14, 30);
    const plan = planCycles(start, WEEKS);
    assert.equal(plan[0].starts_at.getTime(), start.getTime());
    assert.equal(plan[1].starts_at.getTime(), new Date(2026, 9, 8, 0, 0).getTime());
    assert.equal(plan[2].ends_at.getTime(), new Date(2026, 9, 22, 0, 0).getTime() - 1);
  });

  it("os ciclos nascem quando a etapa já iniciou, abrem na data certa e o seguinte abre mesmo sem aprovação do anterior", async () => {
    const { stage } = await fixture(9, WEEKS); // etapa começou há 9 dias → ciclos 1 e 2 já chegaram
    const r = await avancarCiclosOnce();
    assert.ok(r.materializadas >= 3);
    const list = await listarCiclos(prisma, stage.id);
    assert.deepEqual(list.map((c) => c.status), ["em_andamento", "em_andamento", "agendado"]);
    assert.equal(list[0].atrasado, true); // a 1ª semana já acabou e não foi entregue — e a 2ª começou do mesmo jeito
    assert.equal((await materializarCiclosDaEtapa(prisma, stage.id)), 0); // idempotente
  });

  it("entregar → aguardando aprovação com prazo em dias úteis; ciclo que ainda não começou não entrega", async () => {
    const { stage } = await fixture(9, WEEKS);
    await avancarCiclosOnce();
    const [c1, , c3] = await listarCiclos(prisma, stage.id);
    await assert.rejects(() => entregarCiclo(prisma, c3.id), (e) => e instanceof CycleError && /ainda não começou/.test(e.message));
    const d = await entregarCiclo(prisma, c1.id, { nota: "Relatório da 1ª semana" });
    assert.equal(d.status, "aguardando_aprovacao");
    assert.ok(d.approval_due_at && d.approval_due_at > new Date());
    await assert.rejects(() => entregarCiclo(prisma, c1.id), (e) => e instanceof CycleError);
  });

  it("reprovar exige comentário; o comentário vira orientação do próximo ciclo e o reprovado NÃO reabre", async () => {
    const { stage } = await fixture(9, WEEKS);
    await avancarCiclosOnce();
    const [c1, c2] = await listarCiclos(prisma, stage.id);
    await entregarCiclo(prisma, c1.id);
    await assert.rejects(() => decidirCiclo(prisma, c1.id, { decisao: "reprovar" }), (e) => e instanceof CycleError && e.httpStatus === 422);
    const r = await decidirCiclo(prisma, c1.id, { decisao: "reprovar", comentario: "Faltou o custo por lead", userId: "u1" });
    assert.equal(r.ciclo.status, "reprovado");
    assert.equal(r.orientacaoVaiPara?.cycle_index, 2);
    const after = await listarCiclos(prisma, stage.id);
    assert.match(after[1].guidance_from_previous ?? "", /Ciclo 1 \(reprovado\): Faltou o custo por lead/);
    assert.equal(after[0].status, "reprovado");
    assert.equal(after[1].id, c2.id);
    await assert.rejects(() => entregarCiclo(prisma, c1.id), (e) => e instanceof CycleError); // não reabre
  });

  it("aprovar encerra o ciclo; cliente que não responde no prazo → 'sem resposta' e a etapa segue", async () => {
    const { stage } = await fixture(9, WEEKS);
    await avancarCiclosOnce();
    const [c1, c2] = await listarCiclos(prisma, stage.id);
    await entregarCiclo(prisma, c1.id);
    const ok = await decidirCiclo(prisma, c1.id, { decisao: "aprovar" });
    assert.equal(ok.ciclo.status, "aprovado");
    await entregarCiclo(prisma, c2.id);
    await prisma.projectTaskStageCycle.update({ where: { id: c2.id }, data: { approval_due_at: new Date(Date.now() - 60_000) } });
    const r = await avancarCiclosOnce();
    assert.ok(r.sem_resposta >= 1);
    assert.equal((await listarCiclos(prisma, stage.id))[1].status, "sem_resposta");
  });

  it("a etapa só fecha quando todos os ciclos terminam e o último período acabou", async () => {
    const { stage } = await fixture(30, WEEKS); // 30 dias atrás: os 3 períodos já acabaram
    await avancarCiclosOnce();
    let list = await listarCiclos(prisma, stage.id);
    assert.deepEqual(list.map((c) => c.status), ["em_andamento", "em_andamento", "em_andamento"]);
    assert.equal(etapaPodeFechar(list, new Date()), false);
    for (const c of list) { await entregarCiclo(prisma, c.id); await decidirCiclo(prisma, c.id, { decisao: "aprovar" }); }
    list = await listarCiclos(prisma, stage.id);
    assert.equal(etapaPodeFechar(list, new Date()), true);
    assert.equal(etapaPodeFechar(list, new Date(Date.now() - 40 * DAY)), false); // antes do fim do último período
    const r = await avancarCiclosOnce();
    assert.ok(r.etapas_fechadas >= 1);
    const fresh = await prisma.projectTaskStage.findUniqueOrThrow({ where: { id: stage.id } });
    assert.equal(fresh.status, "CONCLUIDA");
  });
});
