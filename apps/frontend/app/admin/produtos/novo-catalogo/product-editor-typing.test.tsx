import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";

const version = {
  id: "v1", state: "rascunho", version_number: 1, title: "Produto", summary: "", full_description: "Texto", change_summary: "",
  tasks: [], variations: [], addons: [], conditions: [], included_items: [], excluded_items: [], updated_at: "2026-10-15T10:00:00Z", is_published_current: false,
};
const product: any = { id: "p1", internal_name: "Produto", status: "em_preparacao", published_version_id: null, versions: [version], pillar: null, category: null, four_f: [], header: {}, task_structure: "multiple" };

vi.mock("@/lib/api-client", () => {
  const handler: ProxyHandler<object> = {
    get: (_t, name: string) => {
      if (name === "getCatalog2Product") return async () => JSON.parse(JSON.stringify(product));
      if (name === "newCatalog2Version") return async () => {
        product.versions = [...product.versions, { ...product.versions[0], id: "v2", state: "rascunho", version_number: 2, is_published_current: false, updated_at: "2026-10-15T11:00:00Z" }];
        return { version_id: "v2", version_number: 2 };
      };
      return async () => ({ data: [], items: [], versions: [] });
    },
  };
  return { apiClient: new Proxy({}, handler) };
});
vi.mock("@/contexts/iallka-context", () => ({ useIallkaContext: () => ({ setScreenContext: () => {} }) }));
vi.mock("@/contexts/open-screens-context", () => ({ usePinEntry: () => ({ pinned: false, toggle: () => {} }) }));
vi.mock("@/hooks/useAppFrameMetrics", () => ({ useAppFrameMetrics: () => ({ top: 0, left: 0, width: 1000, height: 800 }) }));
vi.mock("@/lib/use-work-calendar", () => ({ useWorkCalendar: () => ({}), fmtBusinessMinutes: () => "", businessDaysOf: () => 0 }));

import { ProductEditor } from "./product-editor";

describe("digitar na descrição", () => {
  beforeEach(() => { window.sessionStorage.clear(); cleanup(); });
  it("o primeiro caractere digitado aparece (sem precisar digitar duas vezes)", async () => {
    render(<ProductEditor productId="p1" onBack={() => {}} />);
    await waitFor(() => expect(screen.getByText("Editar")).toBeTruthy(), { timeout: 5000 });
    fireEvent.click(screen.getByText("Editar"));
    if (!screen.queryByLabelText("Descrição")) fireEvent.click(await screen.findByText("Descrição completa"));
    const box = (await screen.findByLabelText("Descrição")) as HTMLTextAreaElement;
    await waitFor(() => expect(box.disabled).toBe(false));
    box.focus();
    fireEvent.change(box, { target: { value: "Texto." } });
    const after1 = screen.getByLabelText("Descrição") as HTMLTextAreaElement;
    expect(after1.value).toBe("Texto.");
    expect(document.activeElement).toBe(after1);
    fireEvent.change(after1, { target: { value: "Texto.!" } });
    expect((screen.getByLabelText("Descrição") as HTMLTextAreaElement).value).toBe("Texto.!");
  });

  it("a partir da versão publicada: Editar cria o rascunho e o primeiro caractere também aparece", async () => {
    product.versions = [{ ...version, state: "publicada", is_published_current: true }];
    product.published_version_id = "v1";
    render(<ProductEditor productId="p1" onBack={() => {}} />);
    await waitFor(() => expect(screen.getByText("Editar")).toBeTruthy(), { timeout: 5000 });
    fireEvent.click(screen.getByText("Editar"));
    if (!screen.queryByLabelText("Descrição")) fireEvent.click(await screen.findByText("Descrição completa"));
    await waitFor(() => expect((screen.getByLabelText("Descrição") as HTMLTextAreaElement).disabled).toBe(false), { timeout: 5000 });
    const box = screen.getByLabelText("Descrição") as HTMLTextAreaElement;
    box.focus();
    fireEvent.change(box, { target: { value: "Texto." } });
    await new Promise((r) => setTimeout(r, 400));
    expect((screen.getByLabelText("Descrição") as HTMLTextAreaElement).value).toBe("Texto.");
    expect(document.activeElement).toBe(screen.getByLabelText("Descrição"));
  });
});
