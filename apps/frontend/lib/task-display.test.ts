import { describe, expect, it } from "vitest";
import { NO_LEADER_LABEL, formatTaskCode, taskClientName, taskConsultantName, taskDisplayCode, taskLeaderName } from "@/lib/task-display";

// 01/11 (teste do Codex no proj_956, tarefa T015718): o detalhe mostrava o consultor
// "Teste" como LÍDER e CONSULTOR / LÍDER, CLIENTE "—" apesar do cliente salvo no projeto
// e o código interno do modelo ("tarefa-127") no lugar do código da tarefa.
describe("apresentação da tarefa de execução", () => {
  const project = { consultant: "Teste", consultant_user: { name: "Teste" }, client: null, client_record: { name: "Teste cliente" } };

  it("consultor vem do projeto e nunca vira Líder; sem Líder atribuído a tela diz isso", () => {
    expect(taskConsultantName(project)).toBe("Teste");
    expect(taskLeaderName({ lider_responsavel: null })).toBeNull();
    expect(NO_LEADER_LABEL).toBe("Sem líder atribuído");
    expect(taskLeaderName({ lider_responsavel: { name: "Líder da Área" } })).toBe("Líder da Área");
  });

  it("cliente: cadastro escolhido no projeto quando não há cliente legado; o legado continua valendo", () => {
    expect(taskClientName(project)).toBe("Teste cliente");
    expect(taskClientName({ client: { name: "Empresa legada" }, client_record: { name: "Outro" } })).toBe("Empresa legada");
    expect(taskClientName({ client: null, client_record: null })).toBeNull();
  });

  it("consultor sem usuário vinculado (projeto antigo) usa o texto gravado", () => {
    expect(taskConsultantName({ consultant: "Consultor antigo" })).toBe("Consultor antigo");
    expect(taskConsultantName({})).toBeNull();
  });

  it("código: o da tarefa (mesmo formato da lista), nunca a referência interna do modelo quando a tarefa tem código", () => {
    expect(formatTaskCode("T015718")).toBe("tar15718");
    expect(taskDisplayCode({ task_code: "T015718", code_snapshot: "tarefa-127" })).toBe("tar15718");
    expect(taskDisplayCode({ task_code: null, code_snapshot: "tarefa-127" })).toBe("tarefa-127");
    expect(taskDisplayCode({ task_code: null, code_snapshot: null })).toBeNull();
  });
});
