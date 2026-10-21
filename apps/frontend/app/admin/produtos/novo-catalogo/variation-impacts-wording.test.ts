import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (f: string) => readFileSync(join(__dirname, f), "utf8");

// R21-10 (reunião 21/10): nos impactos das variações a linguagem é de ETAPA, não de tarefa.
describe("Impactos da opção de variação: nomenclatura de etapa", () => {
  const editor = read("product-editor.tsx");
  const adjust = read("option-step-adjust-ui.tsx");

  it("o resumo dos impactos fala em Etapas (não em Tarefas)", () => {
    expect(editor).toContain('<Item icon={ListChecks} label="Etapas" value={s.tasks} />');
    expect(editor).not.toContain('label="Tarefas" value={s.tasks}');
  });

  it("horas extras: 'Geral, sem etapa específica' no lugar de 'Tarefa inteira'", () => {
    expect(adjust).toContain("Geral, sem etapa específica");
    expect(adjust).not.toContain("Tarefa inteira");
    expect(adjust).not.toContain("tarefa inteira)");
    expect(adjust).toContain("Cadastre as etapas do produto");
  });

  it("a lista de impactos de opções e adicionais não oferece incluir/remover TAREFA (só etapa)", () => {
    expect(editor).toContain('EFFECT_TYPES.filter(([v]) => v !== "add_task" && v !== "remove_task")');
    expect(editor).toContain("preço, prazo, etapas e entregáveis conforme os impactos configurados");
  });
});
