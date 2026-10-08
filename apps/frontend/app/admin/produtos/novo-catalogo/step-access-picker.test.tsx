import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { StepAccessPicker, accessPatch, scopeOf } from "./step-access-picker";

const REQS = [{ key: "g-1", label: "Google Ads" }, { key: "m-2", label: null, connection_type: { name: "Meta Business Manager" } }];

describe("acessos por etapa (P-12)", () => {
  it("padrão / todos / só os escolhidos viram o patch certo do ops da etapa", () => {
    expect(accessPatch("default", ["a"])).toEqual({ access_scope: undefined, access_keys: undefined });
    expect(accessPatch("all", ["a"])).toEqual({ access_scope: "all", access_keys: undefined });
    expect(accessPatch("some", ["a"])).toEqual({ access_scope: "some", access_keys: ["a"] });
    expect([scopeOf(null), scopeOf({ access_scope: "all" }), scopeOf({ access_scope: "some" }), scopeOf({ access_scope: "x" })]).toEqual(["default", "all", "some", "default"]);
  });
  it("no padrão não mostra lista; ao escolher 'só os que eu escolher' mostra os acessos do produto e marca/desmarca", () => {
    const onChange = vi.fn();
    const { rerender } = render(<StepAccessPicker requirements={REQS} value={null} onChange={onChange} />);
    expect(screen.queryByText("Google Ads")).toBeNull();
    fireEvent.change(screen.getByLabelText("Quais acessos esta etapa usa"), { target: { value: "some" } });
    expect(onChange).toHaveBeenLastCalledWith({ access_scope: "some", access_keys: [] });
    rerender(<StepAccessPicker requirements={REQS} value={{ access_scope: "some", access_keys: ["g-1"] }} onChange={onChange} />);
    expect(screen.getByText("Meta Business Manager")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Meta Business Manager"));
    expect(onChange).toHaveBeenLastCalledWith({ access_scope: "some", access_keys: ["g-1", "m-2"] });
    fireEvent.click(screen.getByLabelText("Google Ads"));
    expect(onChange).toHaveBeenLastCalledWith({ access_scope: "some", access_keys: [] });
  });
  it("sem acessos cadastrados avisa onde cadastrar", () => {
    render(<StepAccessPicker requirements={[]} value={{ access_scope: "some", access_keys: [] }} onChange={() => {}} />);
    expect(screen.getByText(/ainda não tem acessos cadastrados/)).toBeTruthy();
  });
});
