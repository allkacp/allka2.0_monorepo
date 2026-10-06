import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { prisma } from "../lib/prisma";
import { api, mkAdmin, startServer, stopServer, uid } from "../test-support/universal-helpers";

// Reunião 2026-10-05 · produto individual tem UMA tarefa principal (o resto são etapas); só combos/compostos têm várias.
let ADMIN: Awaited<ReturnType<typeof mkAdmin>>;
const adm = (p: string, method = "GET", body?: unknown) => api(`/api/admin/catalog2${p}`, { method, token: ADMIN.token, body });

async function novoProduto(task_structure?: "single" | "multiple") {
  const r = await adm("/products", "POST", { internal_name: `Estrutura ${uid()}`, ...(task_structure ? { task_structure } : {}) });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  const versionId = r.json.versions[0].id as string;
  return { productId: r.json.id as string, versionId, detail: r.json };
}
const criarTarefa = (versionId: string, name: string, extra: Record<string, unknown> = {}) => adm(`/versions/${versionId}/tasks`, "POST", { name, client_action_id: `t-${uid()}`, ...extra });

describe("Estrutura de tarefas · produto individual × composto", () => {
  before(async () => { await startServer(); ADMIN = await mkAdmin(); });
  after(async () => { await stopServer(); });

  it("TS01. produto sem a configuração nova continua aceitando várias tarefas (compatibilidade)", async () => {
    const { versionId, detail } = await novoProduto();
    assert.equal(detail.task_structure, "multiple");
    assert.equal((await criarTarefa(versionId, `A ${uid()}`)).status, 201);
    assert.equal((await criarTarefa(versionId, `B ${uid()}`)).status, 201);
  });

  it("TS02. produto individual aceita só UMA tarefa principal; a segunda é recusada com explicação", async () => {
    const { versionId, detail } = await novoProduto("single");
    assert.equal(detail.task_structure, "single");
    const a = await criarTarefa(versionId, `Principal ${uid()}`);
    assert.equal(a.status, 201, JSON.stringify(a.json));
    const b = await criarTarefa(versionId, `Segunda ${uid()}`);
    assert.equal(b.status, 422);
    assert.equal(b.json.code, "single_task_product");
    assert.match(b.json.error, /única tarefa principal/);
    assert.equal(await prisma.catalog2Task.count({ where: { version_id: versionId } }), 1);
  });

  it("TS03. duplicar a tarefa também é bloqueado; tarefa condicional (de adicional) continua permitida", async () => {
    const { versionId } = await novoProduto("single");
    const a = await criarTarefa(versionId, `Principal ${uid()}`);
    const dup = await adm(`/tasks/${a.json.id}/duplicate`, "POST");
    assert.equal(dup.status, 422);
    const cond = await criarTarefa(versionId, `Condicional ${uid()}`, { is_conditional: true });
    assert.equal(cond.status, 201, JSON.stringify(cond.json));
  });

  it("TS04. trocar para individual exige no máximo uma tarefa; trocar para composto libera várias; fica no histórico", async () => {
    const { productId, versionId } = await novoProduto();
    await criarTarefa(versionId, `A ${uid()}`);
    await criarTarefa(versionId, `B ${uid()}`);
    const tooMany = await adm(`/products/${productId}/task-structure`, "PATCH", { task_structure: "single" });
    assert.equal(tooMany.status, 422);
    assert.equal(tooMany.json.code, "too_many_tasks_for_single");
    const one = await novoProduto();
    await criarTarefa(one.versionId, `Única ${uid()}`);
    assert.equal((await adm(`/products/${one.productId}/task-structure`, "PATCH", { task_structure: "single" })).status, 200);
    assert.equal((await criarTarefa(one.versionId, `Outra ${uid()}`)).status, 422);
    assert.equal((await adm(`/products/${one.productId}/task-structure`, "PATCH", { task_structure: "multiple" })).status, 200);
    assert.equal((await criarTarefa(one.versionId, `Outra ${uid()}`)).status, 201);
    const ev = await prisma.catalog2ProductHistoryEvent.count({ where: { product_id: one.productId, event_type: "task_structure_updated" } });
    assert.equal(ev, 2);
  });

  it("TS05. valor inválido é recusado e a prontidão pede ao menos uma etapa por tarefa", async () => {
    const { productId, versionId } = await novoProduto("single");
    assert.equal((await adm(`/products/${productId}/task-structure`, "PATCH", { task_structure: "xyz" })).status, 400);
    await criarTarefa(versionId, `Sem etapa ${uid()}`);
    const v = await adm(`/versions/${versionId}/validate`);
    assert.ok(JSON.stringify(v.json).includes("ao menos uma etapa"), JSON.stringify(v.json).slice(0, 400));
  });

  it("TS06. checklist da etapa (execução, aprovação, qualificação) é salvo e não perde o resto do guia", async () => {
    const { versionId } = await novoProduto("single");
    const t = await criarTarefa(versionId, `Principal ${uid()}`);
    const st = await adm(`/tasks/${t.json.id}/steps`, "POST", { name: `Etapa ${uid()}`, estimated_minutes: 60, client_action_id: `s-${uid()}` });
    assert.equal(st.status, 201, JSON.stringify(st.json));
    const put = await adm(`/steps/${st.json.id}`, "PUT", { ops: { instructions: "Faça assim", checklist: [{ text: "Conferir orçamento", kind: "execucao" }, { text: "Cliente aprova o destino", kind: "aprovacao" }, { text: "Líder confere o rastreamento", kind: "qualificacao", required: false }] }, scope: "product" });
    assert.equal(put.status, 200, JSON.stringify(put.json));
    const row = await prisma.catalog2TaskStep.findUniqueOrThrow({ where: { id: st.json.id } });
    const ops = row.ops as any;
    assert.equal(ops.instructions, "Faça assim");
    assert.deepEqual(ops.checklist.map((i: any) => i.kind), ["execucao", "aprovacao", "qualificacao"]);
    assert.equal(ops.checklist[2].required, false);
    const bad = await adm(`/steps/${st.json.id}`, "PUT", { ops: { checklist: [{ text: "x", kind: "invalido" }] }, scope: "product" });
    assert.equal(bad.status, 400);
  });

  it("TS07. tipo da especialidade (humano / IA / humano ou IA): padrão humano, cria e troca o tipo, recusa valor inválido", async () => {
    const key = `esp_${uid()}`;
    const humana = await adm("/specialties", "POST", { key, name: `Humana ${key}` });
    assert.equal(humana.status, 201, JSON.stringify(humana.json));
    assert.equal(humana.json.execution_kind, "humano");
    const ia = await adm("/specialties", "POST", { key: `${key}_ia`, name: `IA ${key}`, execution_kind: "ia" });
    assert.equal(ia.json.execution_kind, "ia");
    assert.equal((await adm(`/specialties/${humana.json.id}`, "PUT", { execution_kind: "hibrido" })).json.execution_kind, "hibrido");
    assert.equal((await adm("/specialties", "POST", { key: `${key}_x`, name: "X", execution_kind: "robo" })).status, 400);
    const list = await adm("/specialties");
    assert.equal(list.json.data.find((s: any) => s.id === ia.json.id).execution_kind, "ia");
    assert.ok(list.json.data.every((s: any) => ["humano", "ia", "hibrido"].includes(s.execution_kind)), "especialidades antigas continuam humanas");
  });

  it("TS08. excluir especialidade: livre quando ninguém usa; recusada (409) com explicação quando uma etapa a usa", async () => {
    const livre = await adm("/specialties", "POST", { key: `esp_${uid()}`, name: "Livre" });
    assert.equal((await adm(`/specialties/${livre.json.id}`, "DELETE")).status, 200);
    assert.equal((await adm(`/specialties/${livre.json.id}`, "DELETE")).status, 404);
    const emUso = await adm("/specialties", "POST", { key: `esp_${uid()}`, name: "Em uso", execution_kind: "ia" });
    const { versionId } = await novoProduto("single");
    const t = await criarTarefa(versionId, `Principal ${uid()}`);
    const st = await adm(`/tasks/${t.json.id}/steps`, "POST", { name: `Etapa ${uid()}`, estimated_minutes: 30, specialty_id: emUso.json.id, execution_mode: "ia", client_action_id: `s-${uid()}` });
    assert.equal(st.status, 201, JSON.stringify(st.json));
    const bloqueada = await adm(`/specialties/${emUso.json.id}`, "DELETE");
    assert.equal(bloqueada.status, 409);
    assert.equal(bloqueada.json.code, "specialty_in_use");
    assert.match(bloqueada.json.error, /1 etapa/);
    assert.equal((await adm(`/steps/${st.json.id}`, "DELETE")).status, 200);
    const modelos = await adm(`/specialties/${emUso.json.id}`, "DELETE");
    assert.equal(modelos.status, 409, "o modelo global da etapa ainda cita a especialidade");
    assert.equal(modelos.json.code, "specialty_in_models");
    assert.equal((await adm(`/specialties/${emUso.json.id}?detach_models=1`, "DELETE")).status, 200, "com confirmação explícita exclui; os modelos ficam sem especialidade");
  });

  it("TS09. IA nos campos: basta o nome do produto ou algum texto; sem nada, recusa; mínimo maior que máximo, recusa", async () => {
    const vazio = await api("/api/ai-consultor/improve-product-field", { method: "POST", token: ADMIN.token, body: { field_label: "Resumo" } });
    assert.equal(vazio.status, 422);
    assert.equal(vazio.json.code, "ai_min_words");
    const invertido = await api("/api/ai-consultor/improve-product-field", { method: "POST", token: ADMIN.token, body: { field_label: "Resumo", context: { name: "Landing Page" }, min_words: 50, max_words: 10 } });
    assert.equal(invertido.status, 422);
    assert.equal(invertido.json.code, "ai_limits_invalid");
    const invalido = await api("/api/ai-consultor/improve-product-field", { method: "POST", token: ADMIN.token, body: { field_label: "Resumo", context: { name: "Landing Page" }, min_chars: 0 } });
    assert.equal(invalido.status, 400, "limite inválido é recusado antes de chamar a IA");
  });
});
