import { describe, expect, it } from "vitest";
import { blockInfo, blockStatus, firstIssue, stepIssues, type StepFormLike } from "./step-completeness";

const full: StepFormLike = {
  name: "Configurar a conta", description: "Cria a conta e liga o pixel", execution_mode: "humano", specialty_id: "sp1", estimated_hours: "2",
  ai_specialty_id: "", ai_estimated_hours: "", completion_criteria: "Conta ativa", executor_kind: "nomad", leader_mode: "auto", leader_user_id: "",
  qual_on: true, qualifier_kind: "leader", specialist_user_id: "", approval_hours: "", rework_hours: "", executor_accept_hours: "", ai_free_changes: "", ops: {},
};

describe("Etapa · o que falta para CONCLUIR", () => {
  it("percentual por unidade extra aponta o bloco e campo corretos, sem exigir regra ausente", () => {
    expect(stepIssues({ ...full, ops: {} })).toEqual([]);
    expect(stepIssues({ ...full, ops: { multiple_units: { deadline_extra_percent: 20 } } })).toEqual([]);
    expect(stepIssues({ ...full, ops: { multiple_units: { deadline_extra_percent: -1 } } })).toEqual([expect.objectContaining({ block: 2, field: "quantity_deadline" })]);
  });
  it("etapa completa não tem pendência", () => { expect(stepIssues(full)).toEqual([]); });

  it("etapa completamente vazia lista tudo, cada item no seu bloco e com o campo certo", () => {
    const empty: StepFormLike = { ...full, name: "", description: "", specialty_id: "", estimated_hours: "", completion_criteria: "" };
    const list = stepIssues(empty);
    expect(list.map((i) => [i.block, i.field])).toEqual([[1, "name"], [1, "description"], [2, "specialty"], [2, "hours"], [3, "completion_criteria"]]);
    expect(list[0].message).toBe("Informe o nome da etapa.");
    expect(firstIssue(list)).toMatchObject({ block: 1, field: "name" });
  });

  it("a especialidade da tarefa vale quando a etapa não tem a sua", () => {
    expect(stepIssues({ ...full, specialty_id: "" }, { taskSpecialtyId: "sp-tarefa" })).toEqual([]);
    expect(stepIssues({ ...full, specialty_id: "" }).map((i) => i.field)).toEqual(["specialty"]);
  });

  it("humano ou IA exige as duas opções (especialidade e horas)", () => {
    const h = { ...full, execution_mode: "hibrido" };
    expect(stepIssues(h).map((i) => i.field)).toEqual(["ai_specialty", "ai_hours"]);
    expect(stepIssues({ ...h, ai_specialty_id: "ia1", ai_estimated_hours: "1" })).toEqual([]);
  });

  it("líder específico sem líder, pessoa que qualifica sem pessoa e prazos inválidos", () => {
    const f = { ...full, executor_kind: "leader", leader_mode: "specific", qualifier_kind: "person" };
    expect(stepIssues(f).map((i) => i.field)).toEqual(["leader", "qualifier_person"]);
    const s = stepIssues({ ...full, approval_hours: "0", rework_hours: "2.5", executor_accept_hours: "x", ai_free_changes: "101" }, { stageExecution: true, acceptHoursApplies: true });
    expect(s.map((i) => i.field)).toEqual(["approval_hours", "rework_hours", "accept_hours", "ai_free_changes"]);
    expect(stepIssues({ ...full, approval_hours: "0" })).toEqual([]); // fora da execução por etapa não se cobra
  });

  it("acessos incompletos entram no bloco 6 com o nome do acesso", () => {
    const l = stepIssues(full, { accessIssues: [{ field: "access:a1", message: "O acesso “Google Ads” está incompleto: condição incompleta." }] });
    expect(l).toEqual([{ block: 6, field: "access:a1", message: "O acesso “Google Ads” está incompleto: condição incompleta." }]);
  });

  it("entregáveis incompletos entram no bloco 5 com o nome do entregável", () => {
    const l = stepIssues(full, { deliverableIssues: [{ field: "deliverable:d1", message: "O entregável “Plano” está incompleto: informe o nome do entregável." }] });
    expect(l).toEqual([{ block: 5, field: "deliverable:d1", message: "O entregável “Plano” está incompleto: informe o nome do entregável." }]);
  });

  it("aprovação do cliente (só em tarefa por etapa): por entregável exige ao menos um entregável que exija aprovação; etapa interna não pode ter aprovação", () => {
    const stage = { stageExecution: true };
    const byDeliv = { ...full, ops: { client_approval: { mode: "deliverables" } } };
    expect(stepIssues(byDeliv, { ...stage, approvableDeliverables: 0 }).map((i) => [i.block, i.field])).toEqual([[3, "approval_deliverables"]]);
    expect(stepIssues(byDeliv, { ...stage, approvableDeliverables: 1 })).toEqual([]);
    expect(stepIssues({ ...full, internal_step: true, ops: { client_approval: { mode: "step" } } }, stage).map((i) => i.field)).toEqual(["approval_mode"]);
    expect(stepIssues({ ...full, internal_step: true, ops: { client_approval: { mode: "none" } } }, stage)).toEqual([]);
    // fora da execução por etapa a aprovação não é cobrada aqui
    expect(stepIssues(byDeliv, { approvableDeliverables: 0 })).toEqual([]);
  });

  it("situação REAL do bloco: não se aplica, opcional, completo e incompleto com a quantidade de pendências", () => {
    const iss = stepIssues(full, { deliverableIssues: [{ field: "a", message: "x" }, { field: "b", message: "y" }] });
    expect(blockInfo(5, iss, false)).toEqual({ status: "incomplete", count: 2 });
    expect(blockInfo(5, iss, true)).toEqual({ status: "error", count: 2 });
    expect(blockInfo(5, [], false, { applies: false })).toEqual({ status: "na", count: 0 });
    expect(blockInfo(5, [], false, { hasContent: false })).toEqual({ status: "optional", count: 0 });
    expect(blockInfo(6, [], false, { applies: true })).toEqual({ status: "complete", count: 0 });
    // não se aplica vence até as pendências guardadas (bloco desativado corretamente)
    expect(blockInfo(6, stepIssues(full, { accessIssues: [{ field: "z", message: "z" }] }), false, { applies: false }).status).toBe("na");
  });

  it("situação do bloco: completo, incompleto, com erro (depois de tentar concluir) e opcional (bloco 4 vazio)", () => {
    const issues = stepIssues({ ...full, name: "" });
    expect(blockStatus(1, issues, false, true)).toBe("incomplete");
    expect(blockStatus(1, issues, true, true)).toBe("error");
    expect(blockStatus(2, issues, true, true)).toBe("complete");
    expect(blockStatus(4, [], false, false)).toBe("optional");
    expect(blockStatus(4, [], false, true)).toBe("complete");
  });
});
