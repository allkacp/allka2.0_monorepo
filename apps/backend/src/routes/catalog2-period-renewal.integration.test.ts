import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import crypto from "node:crypto";
import { requireTestDatabaseUrl } from "../test-support/require-test-database";
import { prisma } from "../lib/prisma";
import { periodRenewalStage, renewalMessage, runPeriodRenewalOnce } from "../lib/catalog2-period-renewal";

// Fim do período pago antecipado: antes não acontecia nada. Agora: aviso 30 dias antes e aviso de encerrado, uma vez só.
const suffix = `${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
const DAY = 86_400_000;
const projectIds: string[] = [];
const productIds: string[] = [];
const userIds: string[] = [];

async function contract(endsInDays: number, months = 6, period = "semestral") {
  const code = `proj_ren_${suffix}_${crypto.randomBytes(2).toString("hex")}`;
  const buyer = await prisma.user.create({ data: { id: `ren-${crypto.randomBytes(5).toString("hex")}`, email: `ren-${crypto.randomBytes(5).toString("hex")}@example.test`, password_hash: "x", name: "Cliente", role: "company_user", account_type: "empresas", is_active: true } });
  userIds.push(buyer.id);
  const project = await prisma.project.create({ data: { title: `Projeto ${code}`, project_code: code, status: "in-progress", created_by_user_id: buyer.id } });
  projectIds.push(project.id);
  const product = await prisma.product.create({ data: { name: `Produto ${code}`, category: "teste" } });
  productIds.push(product.id);
  const pp = await prisma.projectProduct.create({
    data: { project_id: project.id, product_id: product.id, product_name_snapshot: "Gestão de tráfego", product_category_snapshot: "teste", catalog2_period: period, catalog2_period_months: months, catalog2_period_ends_at: new Date(Date.now() + endsInDays * DAY) },
  });
  return { project, pp, buyer };
}

describe("Fim do período pago antecipado", () => {
  before(() => { requireTestDatabaseUrl(); });
  after(async () => {
    await prisma.systemAlert.deleteMany({ where: { entity_id: { in: projectIds } } }).catch(() => {});
    for (const id of projectIds) await prisma.project.delete({ where: { id } }).catch(() => {});
    for (const id of productIds) await prisma.product.delete({ where: { id } }).catch(() => {});
    for (const id of userIds) await prisma.user.delete({ where: { id } }).catch(() => {});
    await prisma.$disconnect();
  });

  it("periodRenewalStage: longe do fim = nenhum; faltando até 30 dias = aviso; depois do fim = encerrado", () => {
    const now = new Date("2026-10-25T12:00:00Z");
    assert.equal(periodRenewalStage(now, new Date(now.getTime() + 90 * DAY)), "nenhum");
    assert.equal(periodRenewalStage(now, new Date(now.getTime() + 30 * DAY)), "aviso");
    assert.equal(periodRenewalStage(now, new Date(now.getTime() + 1 * DAY)), "aviso");
    assert.equal(periodRenewalStage(now, new Date(now.getTime() - 1000)), "encerrado");
    assert.equal(periodRenewalStage(now, null), "nenhum");
  });

  it("mensagens em português simples, com a data de fim", () => {
    const now = new Date("2026-10-25T12:00:00Z");
    const end = new Date("2026-11-14T12:00:00Z");
    const a = renewalMessage("aviso", "Gestão de tráfego", "semestral", end, now);
    assert.match(a.title, /termina em 20 dias/);
    assert.match(a.message, /14\/11\/2026/);
    assert.match(a.message, /não é cobrado outra vez/);
    assert.match(renewalMessage("encerrado", "Gestão de tráfego", "semestral", end, now).title, /encerrado/);
  });

  it("o worker avisa 30 dias antes (admin + quem contratou), avisa o encerramento, não avisa contrato longe do fim e NUNCA duplica", async () => {
    const perto = await contract(20);
    const longe = await contract(120);
    const vencido = await contract(-2, 12, "anual");
    const r1 = await runPeriodRenewalOnce();
    assert.ok(r1.avisos >= 1 && r1.encerrados >= 1);
    const alertasPerto = await prisma.systemAlert.findMany({ where: { entity_id: perto.project.id } });
    assert.equal(alertasPerto.length, 2); // administração (geral) + quem contratou
    assert.ok(alertasPerto.every((a) => a.type === "periodo_renovacao_aviso"));
    assert.ok(alertasPerto.some((a) => a.user_id === perto.buyer.id));
    assert.equal(await prisma.systemAlert.count({ where: { entity_id: longe.project.id } }), 0);
    const alertasVencido = await prisma.systemAlert.findMany({ where: { entity_id: vencido.project.id } });
    assert.ok(alertasVencido.length >= 2 && alertasVencido.every((a) => a.type === "periodo_encerrado" && a.severity === "error"));
    // segunda passada: nada novo
    const antes = await prisma.systemAlert.count({ where: { entity_id: { in: [perto.project.id, vencido.project.id] } } });
    await runPeriodRenewalOnce();
    assert.equal(await prisma.systemAlert.count({ where: { entity_id: { in: [perto.project.id, vencido.project.id] } } }), antes);
  });

  it("contrato mensal (1 mês, assinatura) não entra: ele tem a própria cobrança mês a mês", async () => {
    const mensal = await contract(5, 1, "mensal");
    await runPeriodRenewalOnce();
    assert.equal(await prisma.systemAlert.count({ where: { entity_id: mensal.project.id } }), 0);
  });
});
