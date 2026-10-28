import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { FloatingToolsRail, FloatingToolSlot } from "./floating-tools-rail";
afterEach(cleanup);
function Scene({ upper = false, help = true }: { upper?: boolean; help?: boolean }) {
  return <FloatingToolsRail>
    {upper && <FloatingToolSlot className="hidden xl:block" order={0} fallbackTop={125}><button>Bandeja</button></FloatingToolSlot>}
    {help && <FloatingToolSlot className="hidden lg:block" order={3} fallbackTop={245}><button>Ajuda</button></FloatingToolSlot>}
    <FloatingToolSlot className="hidden lg:block" order={4} fallbackTop={285}><button>Alertas</button></FloatingToolSlot>
  </FloatingToolsRail>;
}
describe("Trilho flutuante sem lacunas de posições fixas", () => {
  it("só reserva espaço para gatilhos montados", () => {
    render(<Scene />);
    const rail = screen.getByTestId("floating-tools-rail");
    expect(rail).toHaveClass("flex-col", "gap-1", "top-[125px]");
    expect(rail.children).toHaveLength(2);
    expect(rail.firstElementChild).toHaveTextContent("Ajuda");
    expect((rail.firstElementChild as HTMLElement).style.top).toBe("");
    expect((rail.lastElementChild as HTMLElement).style.order).toBe("4");
  });
  it("remover um item elimina seu espaço; adicionar preserva a ordem flex", () => {
    const view = render(<Scene upper />);
    const rail = screen.getByTestId("floating-tools-rail"); expect(rail.children).toHaveLength(3);
    view.rerender(<Scene help={false} />);
    expect(rail.children).toHaveLength(1); expect(rail.firstElementChild).toHaveTextContent("Alertas");
  });
});
