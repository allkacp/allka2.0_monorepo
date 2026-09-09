import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  GlobalPeriodControl,
  type DashboardPeriodOption,
} from "@/features/dashboards/shared/global-period-control";

// Item 1 (reunião 09/09/2026) — o filtro de período do dashboard era um selo
// decorativo "GLOBAL" solto + um rótulo "Período:" separado, e só o hover
// explicava que ele controla a visão inteira. Este arquivo prova o novo
// comportamento no ponto real: o componente compartilhado GlobalPeriodControl,
// usado por todos os 5 dashboards (Admin, Agency, Company, Leader, Partner).

const OPTIONS: DashboardPeriodOption[] = [
  { type: "today", label: "Hoje" },
  { type: "last_7_days", label: "Últimos 7 dias" },
  { type: "last_30_days", label: "Últimos 30 dias" },
  { type: "this_month", label: "Este mês" },
  { type: "custom", label: "Intervalo personalizado" },
];

type HarnessProps = {
  initialLabel?: string;
  initialType?: string;
  onSelectPreset?: (type: string, label: string) => void;
  onSelectLast90Days?: () => void;
  onApplyCustom?: () => void;
  variant?: "light" | "dark";
};

function Harness({
  initialLabel = "Últimos 30 dias",
  initialType = "last_30_days",
  onSelectPreset = () => {},
  onSelectLast90Days = () => {},
  onApplyCustom = () => {},
  variant = "light",
}: HarnessProps) {
  const [open, setOpen] = React.useState(false);
  const [label, setLabel] = React.useState(initialLabel);
  const [type, setType] = React.useState(initialType);
  const [customFrom, setCustomFrom] = React.useState<Date>();
  const [customTo, setCustomTo] = React.useState<Date>();

  return (
    <>
      {/* espelha o dashboard real: trocar o período atualiza o estado que
          alimenta os widgets — aqui, um texto observável. */}
      <output data-testid="effective-period">{label}</output>
      <GlobalPeriodControl
        variant={variant}
        periodLabel={label}
        periodType={type}
        open={open}
        onOpenChange={setOpen}
        options={OPTIONS}
        onSelectPreset={(t, l) => {
          setType(t);
          setLabel(l);
          setOpen(false);
          onSelectPreset(t, l);
        }}
        onSelectLast90Days={() => {
          setType("custom");
          setLabel("Últimos 90 dias");
          setOpen(false);
          onSelectLast90Days();
        }}
        customFrom={customFrom}
        customTo={customTo}
        onCustomFromChange={setCustomFrom}
        onCustomToChange={setCustomTo}
        onApplyCustom={() => {
          if (customFrom && customTo) {
            setLabel(
              `${customFrom.toLocaleDateString("pt-BR")} - ${customTo.toLocaleDateString("pt-BR")}`,
            );
            setOpen(false);
          }
          onApplyCustom();
        }}
      />
    </>
  );
}

describe("GlobalPeriodControl — Período global do dashboard", () => {
  it("(a) mostra o rótulo 'Período global' e a frase de apoio, sem depender de hover", () => {
    render(<Harness />);

    // rótulo sempre visível (não é tooltip)
    expect(screen.getByText("Período global")).toBeInTheDocument();
    // frase de apoio curta, também sempre no DOM
    const hint = screen.getByText("aplica-se a todo o painel");
    expect(hint).toBeInTheDocument();

    // o termo antigo e confuso saiu de cena
    expect(screen.queryByText("GLOBAL")).not.toBeInTheDocument();
    expect(screen.queryByText("Período:")).not.toBeInTheDocument();
  });

  it("(b) exibe o período selecionado atual no gatilho", () => {
    render(<Harness initialLabel="Últimos 30 dias" />);

    const trigger = screen.getByRole("button", {
      name: /per[ií]odo global: últimos 30 dias/i,
    });
    expect(trigger).toHaveTextContent("Últimos 30 dias");
    expect(screen.getByTestId("effective-period")).toHaveTextContent("Últimos 30 dias");
  });

  it("(e) o gatilho é um botão acessível, com rótulo e descrição explícitos, operável por teclado", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const trigger = screen.getByRole("button", { name: /per[ií]odo global/i });
    expect(trigger.tagName).toBe("BUTTON");
    expect(trigger).toHaveAttribute("type", "button");

    // a descrição de apoio está associada por aria-describedby
    const describedby = trigger.getAttribute("aria-describedby");
    expect(describedby).toBeTruthy();
    expect(document.getElementById(describedby!)).toHaveTextContent(
      "aplica-se a todo o painel",
    );

    // foco por teclado e abertura pelo teclado
    await user.tab();
    expect(trigger).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(await screen.findByText("Últimos 7 dias")).toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  it("(c)(d) abrir e escolher outro período dispara a seleção e atualiza o estado", async () => {
    const user = userEvent.setup();
    const onSelectPreset = vi.fn();
    render(<Harness onSelectPreset={onSelectPreset} />);

    await user.click(screen.getByRole("button", { name: /per[ií]odo global/i }));

    await user.click(await screen.findByText("Últimos 7 dias"));

    expect(onSelectPreset).toHaveBeenCalledWith("last_7_days", "Últimos 7 dias");
    // o estado efetivo que alimenta os widgets acompanhou a troca
    expect(screen.getByTestId("effective-period")).toHaveTextContent("Últimos 7 dias");
    // e o gatilho reflete o novo período
    expect(
      screen.getByRole("button", { name: /per[ií]odo global: últimos 7 dias/i }),
    ).toBeInTheDocument();
  });

  it("(f) preserva o comportamento anterior: 'Últimos 90 dias', intervalo personalizado e opção 'custom' fora da lista de presets", async () => {
    const user = userEvent.setup();
    const onSelectLast90Days = vi.fn();
    const onApplyCustom = vi.fn();
    render(
      <Harness onSelectLast90Days={onSelectLast90Days} onApplyCustom={onApplyCustom} />,
    );

    await user.click(screen.getByRole("button", { name: /per[ií]odo global/i }));
    expect(await screen.findByText("Últimos 90 dias")).toBeInTheDocument();

    // a entrada sintética "custom" nunca vira um preset clicável
    expect(screen.queryByText("Intervalo personalizado")).not.toBeInTheDocument();

    // atalho "Últimos 90 dias" continua existindo e chamando o handler do dashboard
    await user.click(screen.getByText("Últimos 90 dias"));
    expect(onSelectLast90Days).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("effective-period")).toHaveTextContent("Últimos 90 dias");

    // intervalo personalizado: "Aplicar" só habilita com as duas datas
    await user.click(screen.getByRole("button", { name: /per[ií]odo global/i }));
    const apply = await screen.findByRole("button", { name: "Aplicar" });
    expect(apply).toBeDisabled();

    await user.type(
      screen.getByLabelText("Data inicial do período global"),
      "2026-01-01",
    );
    await user.type(
      screen.getByLabelText("Data final do período global"),
      "2026-01-31",
    );
    expect(apply).toBeEnabled();
    await user.click(apply);
    expect(onApplyCustom).toHaveBeenCalledTimes(1);
  });

  it("suporta a variante escura do Painel Administrativo sem mudar o texto", () => {
    render(<Harness variant="dark" />);
    expect(screen.getByText("Período global")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /per[ií]odo global: últimos 30 dias/i }),
    ).toBeInTheDocument();
  });

  // Item 2 (reunião 09/09/2026) — garantir que NÃO voltou tooltip no
  // componente inteiro: passar o mouse pelo rótulo / pela frase de apoio /
  // pelo container não pode abrir nenhum tooltip.
  it("(i) não tem tooltip no componente inteiro — hover no rótulo/frase/container não abre nada", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.hover(screen.getByText("Período global"));
    await user.hover(screen.getByText("aplica-se a todo o painel"));
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });
});
