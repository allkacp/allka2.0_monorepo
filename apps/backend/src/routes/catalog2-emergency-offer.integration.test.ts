import assert from "node:assert/strict";
import crypto from "node:crypto";
import { after, before, describe, it } from "node:test";
import { prisma } from "../lib/prisma";
import { respondEmergencyOffer, sweepEmergencyOffers } from "../lib/catalog2-emergency-offer";
import { api, mkAdmin, mkCompanyUser, startServer, stopServer } from "../test-support/universal-helpers";

// R21-11 (reunião 21/10): entrega rápida pós-compra — o profissional aceita (prazo comprime) ou recusa (nada muda, valor cancelado).
let ADMIN: Awaited<ReturnType<typeof mkAdmin>>;
let CO: Awaited<ReturnType<typeof mkCompanyUser>>;
const HOUR = 3_600_000;

async function pendingTask(opts: { invoiceStatus?: string; respostaAte?: Date } = {}) {
  const code = `EO-${crypto.randomBytes(4).toString("hex")}`;
  const project = await prisma.project.create({ data: { title: `Projeto ${code}`, project_code: code, status: "in-progress" } });
  const product = await prisma.product.create({ data: { name: `Produto ${code}`, category: "teste" } });
  const pp = await prisma.projectProduct.create({ data: { project_id: project.id, product_id: product.id, product_name_snapshot: product.name, product_category_snapshot: product.category } });
  const due = new Date(Date.now() + 100 * HOUR);
  const invoice = await prisma.invoice.create({ data: { project_id: project.id, amount: 150, status: opts.invoiceStatus ?? "pending", description: "Taxa de entrega emergencial" } });
  const task = await prisma.projectTask.create({
    data: {
      project_id: project.id, project_product_id: pp.id, product_id: product.id, name_snapshot: product.name, title: `Tarefa ${code}`, status: "EM_EXECUCAO", due_date: due,
      emergencial_solicitada_em: new Date(), emergencial_solicitada_por: CO.user.id, emergencial_reducao_percentual: 50, emergencial_invoice_id: invoice.id,
      emergencial_status: "aguardando_aceite", emergencial_resposta_ate: opts.respostaAte ?? new Date(Date.now() + 24 * HOUR), emergencial_valor: 150,
    },
  });
  return { task, invoice, due };
}

describe("Entrega rápida com aceite do profissional (R21-11)", () => {
  before(async () => { await startServer(); ADMIN = await mkAdmin(); CO = await mkCompanyUser("EO"); });
  after(async () => { await stopServer(); });

  it("EO01. ACEITAR comprime o prazo pela redução e mantém a fatura", async () => {
    const { task, invoice, due } = await pendingTask();
    const r = await respondEmergencyOffer(prisma, task.id, true, "executor");
    assert.equal(r.status, "aceita");
    const t = await prisma.projectTask.findUniqueOrThrow({ where: { id: task.id } });
    assert.equal(t.emergencial_status, "aceita");
    const restante = (t.due_date!.getTime() - Date.now()) / HOUR;
    assert.ok(restante < (due.getTime() - Date.now()) / HOUR * 0.6 && restante > 40, `prazo comprimido ~50% (restou ${restante.toFixed(1)} h)`);
    assert.equal((await prisma.invoice.findUniqueOrThrow({ where: { id: invoice.id } })).status, "pending");
  });

  it("EO02. RECUSAR não muda o prazo, cancela a fatura pendente e libera novo pedido", async () => {
    const { task, invoice, due } = await pendingTask();
    const r = await respondEmergencyOffer(prisma, task.id, false, "executor");
    assert.equal(r.status, "recusada");
    assert.equal(r.cobranca, "cancelada");
    const t = await prisma.projectTask.findUniqueOrThrow({ where: { id: task.id } });
    assert.equal(t.due_date!.getTime(), due.getTime());
    assert.equal(t.emergencial_solicitada_em, null, "o cliente pode pedir de novo");
    assert.equal((await prisma.invoice.findUniqueOrThrow({ where: { id: invoice.id } })).status, "cancelled");
  });

  it("EO03. RECUSAR com a fatura JÁ PAGA não mexe no dinheiro: marca ESTORNO PENDENTE e avisa o admin", async () => {
    const { task, invoice } = await pendingTask({ invoiceStatus: "paid" });
    const r = await respondEmergencyOffer(prisma, task.id, false, "executor");
    assert.equal(r.cobranca, "estorno_pendente");
    const inv = await prisma.invoice.findUniqueOrThrow({ where: { id: invoice.id } });
    assert.equal(inv.status, "paid");
    assert.match(inv.description ?? "", /ESTORNO PENDENTE/);
    assert.ok(await prisma.systemAlert.findFirst({ where: { type: "estorno_entrega_emergencial", entity_id: task.id } }));
  });

  it("EO04. sem resposta no prazo, a varredura trata como recusa; quem ainda está no prazo não é tocado", async () => {
    const vencida = await pendingTask({ respostaAte: new Date(Date.now() - HOUR) });
    const noPrazo = await pendingTask();
    const n = await sweepEmergencyOffers(prisma);
    assert.ok(n >= 1);
    assert.equal((await prisma.projectTask.findUniqueOrThrow({ where: { id: vencida.task.id } })).emergencial_status, "expirada");
    assert.equal((await prisma.projectTask.findUniqueOrThrow({ where: { id: noPrazo.task.id } })).emergencial_status, "aguardando_aceite");
  });

  it("EO05. responder duas vezes é recusado; a rota exige o profissional/líder/admin", async () => {
    const { task } = await pendingTask();
    const semPermissao = await api(`/api/project-tasks/${task.id}/emergencial/responder`, { method: "POST", token: CO.token, body: { aceitar: true } });
    assert.ok([403, 404].includes(semPermissao.status), `cliente não responde (veio ${semPermissao.status})`);
    const ok = await api(`/api/project-tasks/${task.id}/emergencial/responder`, { method: "POST", token: ADMIN.token, body: { aceitar: false } });
    assert.equal(ok.status, 200, JSON.stringify(ok.json));
    const de_novo = await api(`/api/project-tasks/${task.id}/emergencial/responder`, { method: "POST", token: ADMIN.token, body: { aceitar: true } });
    assert.equal(de_novo.status, 409);
  });
});
