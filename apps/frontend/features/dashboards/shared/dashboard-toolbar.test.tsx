import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChevronDown, Download, History, Pencil, Share2 } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DashboardInfoHint } from "@/features/dashboards/shared/dashboard-info-hint";
import { dashboardToolbarControlClass } from "@/features/dashboards/shared/dashboard-toolbar";

// Item 3 (reunião 09/09/2026) — os controles do cabeçalho do dashboard
// (seletor, Exportar, Histórico, Compartilhar, Editar) já eram <button> reais,
// mas não "pareciam" clicáveis: sem cursor de mão, sem anel de foco e sem
// sinal de "aberto" no menu. `dashboardToolbarControlClass()` acrescenta só
// isso, sem tocar em lógica.

beforeEach(() => cleanup());

describe("dashboardToolbarControlClass — classe de percepção de clicável", () => {
  it("(b) sempre inclui cursor de mão e anel de foco de teclado", () => {
    const c = dashboardToolbarControlClass();
    expect(c).toContain("cursor-pointer");
    expect(c).toMatch(/focus-visible:ring-2/);
    expect(c).toMatch(/focus-visible:ring-\[#7d1b6a\]/); // claro
  });

  it("usa anel branco no cabeçalho escuro do Admin (contraste)", () => {
    expect(dashboardToolbarControlClass({ theme: "dark" })).toMatch(/focus-visible:ring-white/);
  });

  it("só o gatilho de menu ganha o sinal de 'aberto' (data-[state=open]) — e não é só cor", () => {
    expect(dashboardToolbarControlClass({ menu: true })).toMatch(/data-\[state=open\]:border-\[#7d1b6a\]/);
    expect(dashboardToolbarControlClass({ menu: true })).toMatch(/data-\[state=open\]:shadow-sm/);
    expect(dashboardToolbarControlClass({ theme: "dark", menu: true })).toMatch(
      /data-\[state=open\]:(bg-white\/25|border-white)/,
    );
    // botão de ação simples não recebe o sinal de aberto
    expect(dashboardToolbarControlClass()).not.toContain("data-[state=open]");
  });
});

// ── Harness que reproduz o cabeçalho real (mesmos componentes-base) ──────────
const SELECTOR_CLS = cn(
  "group flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border",
  dashboardToolbarControlClass({ theme: "light", menu: true }),
);
const ACTION_CLS = cn(
  "flex items-center justify-center h-8 w-8 rounded-lg border",
  dashboardToolbarControlClass({ theme: "light" }),
);
const MENU_ACTION_CLS = cn(
  "flex items-center justify-center h-8 w-8 rounded-lg border",
  dashboardToolbarControlClass({ theme: "light", menu: true }),
);

type Handlers = {
  onLoadFinanceira?: () => void;
  onExportPdf?: () => void;
  onHistory?: () => void;
  onShare?: () => void;
  onEdit?: () => void;
};

function ToolbarHarness(h: Handlers) {
  const [exportOpen, setExportOpen] = React.useState(false);
  return (
    <div>
      {/* Seletor de dashboard */}
      <div className="flex items-center gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={SELECTOR_CLS}>
              <span>Meu dashboard</span>
              <ChevronDown
                data-testid="chevron"
                className="h-3 w-3 group-data-[state=open]:rotate-180"
              />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <button
              className="flex items-center gap-2 w-full text-left px-2.5 py-1.5 cursor-pointer focus-visible:outline-none focus-visible:bg-muted/60"
              onClick={h.onLoadFinanceira}
            >
              Visão Financeira
            </button>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* "i" do Item 2 — segue só no hover do próprio ícone */}
        <DashboardInfoHint
          label="Mais informações sobre os dashboards salvos"
          delayDuration={0}
        >
          conteúdo do hint dos dashboards salvos
        </DashboardInfoHint>
      </div>

      {/* Exportar */}
      <Popover open={exportOpen} onOpenChange={setExportOpen}>
        <PopoverTrigger asChild>
          <button aria-label="Exportar dashboard" className={MENU_ACTION_CLS}>
            <Download className="h-4 w-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent>
          <button onClick={() => { setExportOpen(false); h.onExportPdf?.(); }}>
            Exportar como PDF
          </button>
        </PopoverContent>
      </Popover>

      {/* Histórico */}
      <button aria-label="Histórico de dados" onClick={h.onHistory} className={ACTION_CLS}>
        <History className="h-4 w-4" />
      </button>

      {/* Compartilhar */}
      <button aria-label="Compartilhar dashboard" onClick={h.onShare} className={ACTION_CLS}>
        <Share2 className="h-4 w-4" />
      </button>

      {/* Editar (tem texto visível — nome acessível vem do texto) */}
      <button onClick={h.onEdit} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg border", dashboardToolbarControlClass({ theme: "light" }))}>
        <Pencil className="h-3.5 w-3.5" />
        <span>Editar</span>
      </button>
    </div>
  );
}

describe("Controles do cabeçalho do dashboard — clicáveis e acessíveis", () => {
  it("(a) o seletor é um botão acessível (aria-haspopup/expanded), alcançável por Tab e com estado de foco", async () => {
    const user = userEvent.setup();
    render(<ToolbarHarness />);

    const selector = screen.getByRole("button", { name: /meu dashboard/i });
    expect(selector.tagName).toBe("BUTTON");
    expect(selector.getAttribute("aria-haspopup")).toMatch(/menu/);
    expect(selector).toHaveAttribute("aria-expanded", "false");
    expect(selector.className).toContain("cursor-pointer");
    expect(selector.className).toMatch(/focus-visible:ring-2/);

    await user.tab();
    expect(selector).toHaveFocus();
  });

  it("(b) todos os controles do escopo têm cursor de mão", () => {
    render(<ToolbarHarness />);
    for (const name of [
      /meu dashboard/i,
      "Exportar dashboard",
      "Histórico de dados",
      "Compartilhar dashboard",
      "Editar",
    ]) {
      expect(screen.getByRole("button", { name }).className).toContain("cursor-pointer");
    }
  });

  it("(c) abrir o seletor expõe estado aberto (aria-expanded + data-state) e o chevron não depende só de cor", async () => {
    const user = userEvent.setup();
    const onHistory = vi.fn();
    const onEdit = vi.fn();
    render(<ToolbarHarness onHistory={onHistory} onEdit={onEdit} />);

    const selector = screen.getByRole("button", { name: /meu dashboard/i });
    await user.click(selector);

    expect(selector).toHaveAttribute("aria-expanded", "true");
    expect(selector).toHaveAttribute("data-state", "open");
    expect(await screen.findByRole("menu")).toBeInTheDocument();
    // sinal complementar de "aberto" além de cor: rotação do chevron
    expect(screen.getByTestId("chevron").getAttribute("class")).toMatch(
      /group-data-\[state=open\]:rotate-180/,
    );
    // abrir o menu não aciona nenhuma outra ação
    expect(onHistory).not.toHaveBeenCalled();
    expect(onEdit).not.toHaveBeenCalled();
  });

  it("(d) selecionar 'Visão Financeira' dentro do menu continua funcionando", async () => {
    const user = userEvent.setup();
    const onLoadFinanceira = vi.fn();
    render(<ToolbarHarness onLoadFinanceira={onLoadFinanceira} />);

    await user.click(screen.getByRole("button", { name: /meu dashboard/i }));
    const option = await screen.findByRole("button", { name: "Visão Financeira" });
    expect(option.className).toContain("cursor-pointer"); // opção também parece clicável
    await user.click(option);

    expect(onLoadFinanceira).toHaveBeenCalledTimes(1);
  });

  it("(e) Exportar continua abrindo seu menu e executando a opção", async () => {
    const user = userEvent.setup();
    const onExportPdf = vi.fn();
    render(<ToolbarHarness onExportPdf={onExportPdf} />);

    await user.click(screen.getByRole("button", { name: "Exportar dashboard" }));
    await user.click(await screen.findByRole("button", { name: "Exportar como PDF" }));
    expect(onExportPdf).toHaveBeenCalledTimes(1);
  });

  it("(f)(g) Histórico, Compartilhar e Editar continuam clicáveis", async () => {
    const user = userEvent.setup();
    const onHistory = vi.fn();
    const onShare = vi.fn();
    const onEdit = vi.fn();
    render(<ToolbarHarness onHistory={onHistory} onShare={onShare} onEdit={onEdit} />);

    await user.click(screen.getByRole("button", { name: "Histórico de dados" }));
    await user.click(screen.getByRole("button", { name: "Compartilhar dashboard" }));
    await user.click(screen.getByRole("button", { name: "Editar" }));

    expect(onHistory).toHaveBeenCalledTimes(1);
    expect(onShare).toHaveBeenCalledTimes(1);
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it("(h) todos os controles do escopo têm nome acessível", () => {
    render(<ToolbarHarness />);
    expect(screen.getByRole("button", { name: /meu dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Exportar dashboard" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Histórico de dados" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Compartilhar dashboard" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Editar" })).toBeInTheDocument();
  });

  it("(i) nenhuma mudança afeta o tooltip do Item 2: hover/abrir o seletor não abre o hint; o hint segue só no hover do 'i'", async () => {
    const user = userEvent.setup();
    render(<ToolbarHarness />);

    // hover no seletor NÃO abre o tooltip do "i" ao lado
    await user.hover(screen.getByRole("button", { name: /meu dashboard/i }));
    await user.click(screen.getByRole("button", { name: /meu dashboard/i }));
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    await user.keyboard("{Escape}"); // fecha o menu do seletor

    // hover no próprio "i" abre
    await user.hover(
      screen.getByRole("button", { name: "Mais informações sobre os dashboards salvos" }),
    );
    expect(await screen.findByRole("tooltip")).toHaveTextContent(
      "conteúdo do hint dos dashboards salvos",
    );
  });
});
