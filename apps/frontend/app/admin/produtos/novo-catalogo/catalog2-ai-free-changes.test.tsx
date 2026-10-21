import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AiFreeChangesCard, collectAiFreeStages, parseFreeChanges } from "./catalog2-ai-free-changes";

const version = {
  tasks: [
    { id: "t2", name: "Anúncios", sort_order: 2, steps: [{ id: "s3", name: "Revisão", sort_order: 1, ai_free_changes: 1 }] },
    { id: "t1", name: "Briefing", sort_order: 1, steps: [
      { id: "s2", name: "Aprovação", sort_order: 2, ai_free_changes: null },
      { id: "s1", name: "Criação", sort_order: 1, ai_free_changes: 3 },
    ] },
  ],
};

describe("alterações por IA grátis: soma e detalhamento por etapa (P-11)", () => {
  it("valida o número: vazio = sem cota, inteiro 0..100", () => {
    expect(parseFreeChanges("")).toEqual({ ok: true, value: null });
    expect(parseFreeChanges(" 3 ")).toEqual({ ok: true, value: 3 });
    expect(parseFreeChanges("0")).toEqual({ ok: true, value: 0 });
    expect(parseFreeChanges("1,5").ok).toBe(false);
    expect(parseFreeChanges("101").ok).toBe(false);
  });
  it("junta só as etapas com cota, na ordem de tarefas e etapas", () => {
    expect(collectAiFreeStages(version).map((r) => [r.step, r.task, r.value])).toEqual([["Criação", "Briefing", 3], ["Revisão", "Anúncios", 1]]);
  });
  it("mostra a soma e o detalhamento de cada etapa, sem campo editável", () => {
    render(<AiFreeChangesCard version={version} />);
    expect(screen.getByTestId("ai-free-total").textContent).toBe("4");
    const items = screen.getByTestId("ai-free-breakdown").textContent ?? "";
    expect(items).toContain("Criação (Briefing): 3 alterações por IA");
    expect(items).toContain("Revisão (Anúncios): 1 alteração por IA");
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.queryByRole("spinbutton")).toBeNull();
  });
  it("sem nenhuma etapa com cota explica que vale a regra global", () => {
    render(<AiFreeChangesCard version={{ tasks: [] }} />);
    expect(screen.getByTestId("ai-free-total").textContent).toBe("—");
    expect(screen.getByText(/regra global/)).toBeTruthy();
  });
  it("R21-01: alerta vermelho lista as etapas sem o campo; some quando todas têm", () => {
    render(<AiFreeChangesCard version={version} />);
    expect(screen.getByTestId("ai-free-missing").textContent).toContain("Aprovação (Briefing)");
  });
  it("R21-01: sem alerta quando todas as etapas têm cota (inclusive 0)", () => {
    render(<AiFreeChangesCard version={{ tasks: [{ id: "t", name: "T", steps: [{ id: "a", name: "A", ai_free_changes: 0 }] }] }} />);
    expect(screen.queryByTestId("ai-free-missing")).toBeNull();
  });
});
