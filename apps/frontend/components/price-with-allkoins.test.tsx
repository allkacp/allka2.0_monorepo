import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AkBoth, AllkoinsAmount, Money, PriceWithAllkoins, fmtPriceBRL } from "./price-with-allkoins";

// Os valores mostram os DOIS: Allkoin e real, "AK$ 10,00 (R$ 10,00)". Preço de produto aparece em R$ e o mouse mostra os dois; saldo aparece em AK$.
describe("valores em Allkoins + reais", () => {
  it("formata em reais", () => {
    expect(fmtPriceBRL(10)).toMatch(/^R\$\s10,00$/);
    expect(fmtPriceBRL(1234.5)).toMatch(/^R\$\s1\.234,50$/);
  });

  it("preço de produto: mostra R$ e, ao passar o mouse, 'AK$ … (R$ …)'", async () => {
    const user = userEvent.setup();
    render(<PriceWithAllkoins value={10} />);
    const price = screen.getByTestId("price-with-allkoins");
    expect(price.textContent).toMatch(/^R\$\s10,00$/);
    await user.hover(price);
    const tips = await screen.findAllByText(/AK\$\s10,00 \(R\$\s10,00\)/);
    expect(tips.length).toBeGreaterThan(0);
  });

  it("saldo curto: mostra AK$ e, no mouse, os dois valores", async () => {
    const user = userEvent.setup();
    render(<AllkoinsAmount value={1000} />);
    const amount = screen.getByTestId("allkoins-amount");
    expect(amount.textContent).toMatch(/^AK\$\s1\.000,00$/);
    await user.hover(amount);
    expect((await screen.findAllByText(/AK\$\s1\.000,00 \(R\$\s1\.000,00\)/)).length).toBeGreaterThan(0);
  });

  it("AkBoth já mostra os dois, com o real entre parênteses", () => {
    render(<AkBoth value={366.07} />);
    expect(screen.getByTestId("ak-both").textContent).toMatch(/^AK\$\s366,07 \(R\$\s366,07\)$/);
  });

  it("sem valor não inventa preço", () => {
    render(<><Money value={null} /><Money value={undefined} fallback="—" /></>);
    expect(screen.getByText("A definir")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.queryByTestId("price-with-allkoins")).not.toBeInTheDocument();
  });
});
