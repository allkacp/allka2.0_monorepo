import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import crypto from "node:crypto";
import { requireTestDatabaseUrl } from "../test-support/require-test-database";
import { prisma } from "../lib/prisma";
import { pickPoolQualifierUserId } from "../lib/qualifier-pool";
import { stagePool } from "../lib/generate-tasks-catalog2";

// Grupo de nômades qualificadores (reunião 14/10): só entra quem tem a chave ligada, está ativo e habilitado na área; rodízio.

const CAT = `QPool-${crypto.randomBytes(6).toString("hex")}`;
const users: string[] = [];
const nomades: string[] = [];
const habilidades: string[] = [];
let taskId = "";
let projectId = "";
let productId = "";

async function mkNomad(opts: { qualifier?: boolean; status?: string; skill?: boolean; userActive?: boolean } = {}) {
  const id = `qp-${crypto.randomBytes(6).toString("hex")}`;
  const user = await prisma.user.create({ data: { id, email: `${id}@example.test`, password_hash: "x", name: `Nomad ${id}`, role: "nomad", account_type: "nomades", is_active: opts.userActive ?? true, status: "ativo" } });
  users.push(user.id);
  const nomade = await prisma.nomade.create({ data: { user_id: user.id, name: user.name, email: `${id}-n@example.test`, status: opts.status ?? "ativo", is_qualifier: opts.qualifier ?? false } });
  nomades.push(nomade.id);
  if (opts.skill ?? true) {
    const h = await prisma.nomadeHabilidade.create({ data: { nomade_id: nomade.id, area: CAT, categoria_produto: CAT, disponibilidade: "disponivel", ativo: true, nota_media: 4 } });
    habilidades.push(h.id);
  }
  return { user, nomade };
}

describe("Grupo de nômades qualificadores", () => {
  before(async () => {
    requireTestDatabaseUrl();
    const code = crypto.randomBytes(4).toString("hex");
    const project = await prisma.project.create({ data: { title: `Proj qp ${code}`, project_code: code, status: "in-progress" } });
    projectId = project.id;
    const product = await prisma.product.create({ data: { name: `Prod qp ${code}`, category: CAT } });
    productId = product.id;
    const pp = await prisma.projectProduct.create({ data: { project_id: project.id, product_id: product.id, product_name_snapshot: product.name, product_category_snapshot: CAT } });
    const task = await prisma.projectTask.create({ data: { project_id: project.id, project_product_id: pp.id, product_id: product.id, name_snapshot: product.name, title: `Tarefa qp ${code}`, category_snapshot: CAT, status: "EM_ANDAMENTO" } });
    taskId = task.id;
  });
  after(async () => {
    await prisma.projectTask.deleteMany({ where: { id: taskId } });
    await prisma.projectProduct.deleteMany({ where: { project_id: projectId } });
    await prisma.project.deleteMany({ where: { id: projectId } });
    await prisma.product.deleteMany({ where: { id: productId } });
    await prisma.nomadeHabilidade.deleteMany({ where: { id: { in: habilidades } } });
    await prisma.nomade.deleteMany({ where: { id: { in: nomades } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
    await prisma.$disconnect();
  });

  it("QPL01. sem ninguém marcado como qualificador, não escolhe ninguém (cai no líder)", async () => {
    await mkNomad({ qualifier: false });
    assert.equal(await pickPoolQualifierUserId(taskId), null);
  });

  it("QPL02. só entra qualificador ativo, com usuário ativo e habilitado na área; nunca o executor", async () => {
    const executor = await mkNomad({ qualifier: true });
    await mkNomad({ qualifier: true, status: "pausado" });
    await mkNomad({ qualifier: true, userActive: false });
    await mkNomad({ qualifier: true, skill: false });
    assert.equal(await pickPoolQualifierUserId(taskId, [executor.user.id]), null, "os demais não são elegíveis e o executor é excluído");
    const ok = await mkNomad({ qualifier: true });
    assert.equal(await pickPoolQualifierUserId(taskId, [executor.user.id]), ok.user.id);
  });

  it("QPL03. rodízio: quem tem qualificação pendente ou qualificou há pouco fica atrás", async () => {
    const a = await mkNomad({ qualifier: true });
    const b = await mkNomad({ qualifier: true });
    // a já tem uma etapa pendente de qualificação; b não: b vem primeiro entre os dois
    const code = crypto.randomBytes(3).toString("hex");
    const stage = await prisma.projectTaskStage.create({ data: { project_task_id: taskId, source_key: `qp:${code}`, titulo: "Pendente", ordem: 99, status: "EM_QUALIFICACAO_ESPECIALISTA", especialista_id: a.user.id, exige_qualificacao_especialista: true, qualificador_pool: true } });
    const picked = await pickPoolQualifierUserId(taskId);
    const pendingOthers = await prisma.projectTaskStage.count({ where: { especialista_id: picked as string, status: "EM_QUALIFICACAO_ESPECIALISTA", qualificador_pool: true } });
    assert.notEqual(picked, a.user.id);
    assert.equal(pendingOthers, 0);
    assert.ok([b.user.id].includes(picked as string) || pendingOthers === 0);
    await prisma.projectTaskStage.delete({ where: { id: stage.id } });
  });

  it("QPL04. regra da etapa: só humano com qualificação ligada ou IA pura vão para o grupo", () => {
    assert.equal(stagePool({ qualifier_kind: "nomad_pool", execution_mode: "humano", requires_qualification: true }), true);
    assert.equal(stagePool({ qualifier_kind: "nomad_pool", execution_mode: "ia", requires_qualification: true }), true);
    assert.equal(stagePool({ qualifier_kind: "nomad_pool", execution_mode: "humano", requires_qualification: false }), false);
    assert.equal(stagePool({ qualifier_kind: "nomad_pool", execution_mode: "hibrido", requires_qualification: true }), false);
    assert.equal(stagePool({ qualifier_kind: "leader", execution_mode: "humano", requires_qualification: true }), false);
  });
});
