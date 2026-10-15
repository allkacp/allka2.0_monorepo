import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AccessesSummary, summarizeAccesses } from "./catalog2-connections-ui";

const version = {
  tasks: [
    { key: "t1", name: "Briefing", steps: [{ key: "e1", name: "Reunião", ops: { access_scope: "some", access_keys: ["ads"] } }, { key: "e2", name: "Plano", ops: { access_scope: "some", access_keys: ["ads"] } }, { key: "e3", name: "Entrega", ops: null }] },
  ],
  connection_requirements: [
    { key: "ads", label: "Google Ads", connection_type: { name: "Google Ads" }, when_task_key: "t1", when_step_key: "e1", shared_with_steps: true, dependents: [{ task_key: "t1", step_key: "e1" }] },
    { key: "crm", label: null, connection_type: { name: "CRM" }, when_task_key: "t1", when_step_key: "e3", shared_with_steps: false, dependents: [{ task_key: "t1", step_key: "e3" }] },
    { key: "site", label: "Site", connection_type: { name: "Site" }, when_task_key: "t1", when_step_key: null, dependents: [{ task_key: "t1", step_key: "" }] },
  ],
};

describe("resumo dos acessos necessários", () => {
  it("diz onde cada acesso foi pedido, em quais etapas é usado e se está disponível para as outras", () => {
    const [ads, crm, site] = summarizeAccesses(version);
    expect(ads.origin).toMatch(/Etapa “Reunião”/);
    expect(ads.users).toEqual(["Reunião", "Plano"]);
    expect(ads.shared).toBe(true);
    expect(crm.users).toEqual(["Entrega"]);
    expect(crm.shared).toBe(false);
    expect(site.origin).toBe("Produto inteiro");
    expect(site.wholeProduct).toBe(true);
  });
  it("resumo POR ACESSO: o nome do acesso e as etapas em que está liberado (a que cadastrou + as que usam)", () => {
    render(<AccessesSummary version={version} />);
    const items = screen.getAllByTestId("summary-access").map((n) => n.textContent ?? "");
    expect(items).toHaveLength(2); // só o que vem das etapas
    expect(items[0]).toMatch(/Google Ads/);
    expect(items[0]).toMatch(/Liberado em\s*Etapa 1, Etapa 2/); // cadastrado na 1 e usado na 2
    expect(items[1]).toMatch(/CRM/);
    expect(items[1]).toMatch(/Liberado em\s*Etapa 3/); // só uma etapa
    expect(items[1]).not.toMatch(/Etapa 1|Etapa 2/);
    // o acesso antigo (sem etapa) NÃO entra no quadro das etapas: fica num aviso à parte
    expect(screen.getByTestId("summary-legacy").textContent).toMatch(/Site/);
    expect(screen.getByTestId("summary-legacy").textContent).toMatch(/não vêm de nenhuma etapa/);
    expect(screen.queryByRole("button", { name: /remover|excluir|salvar/i })).toBeNull(); // somente leitura: sem botão de remover (só "Ver detalhes")
  });
  it("com permissão, o acesso antigo pode ser removido (com confirmação)", () => {
    const act = vi.fn(async (fn: () => Promise<any>) => fn());
    const del = vi.fn(async () => ({}));
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const v = { ...version, connection_requirements: version.connection_requirements.map((r: any) => ({ ...r, id: `id-${r.key}` })) };
    render(<AccessesSummary version={v} act={act} readOnly={false} />);
    fireEvent.click(screen.getByLabelText("Remover o acesso antigo Site"));
    expect(act).toHaveBeenCalledTimes(1);
    void del;
  });
  it("sem acessos, explica onde cadastrar", () => {
    render(<AccessesSummary version={{ tasks: [], connection_requirements: [] }} />);
    expect(screen.getByTestId("accesses-summary-empty").textContent).toMatch(/dentro de cada etapa/);
  });
});
