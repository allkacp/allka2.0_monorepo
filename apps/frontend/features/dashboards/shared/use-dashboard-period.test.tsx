import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  useGlobalDashboardPeriod,
  readSavedGlobalDashboardPeriod,
  resolveWidgetPeriod,
  type GlobalDashboardPeriod,
  type WidgetPeriodOverride,
} from "@/features/dashboards/shared/use-dashboard-period";

// Correção pós-QA do Item 1 (reunião 09/09/2026). Duas falhas confirmadas no
// dashboard Admin:
//   (1) trocar o Período global mudava a pílula, mas os widgets globais não
//       recarregavam depois de um F5 — ficavam presos no período padrão;
//   (2) o período escolhido não sobrevivia ao F5 (voltava pra "Últimos 30
//       dias").
// Causa comum: dois efeitos que corriam entre si — um lia o localStorage
// TARDE (useEffect []), o outro GRAVAVA o valor padrão na montagem
// (useEffect [globalPeriod]) antes da leitura aplicar, e o React.StrictMode
// (ligado em dev) descartava o setState da 1ª montagem.
// Estes testes exercem o hook real usado pelos 5 dashboards e um harness que
// reproduz o mesmo padrão de efeito de fetch dos widgets globais.

const PORTALS = ["admin", "company", "agency", "partner", "leader"] as const;

beforeEach(() => {
  try {
    localStorage.clear();
  } catch {
    /* noop */
  }
});

afterEach(() => {
  cleanup();
});

// ── Harness: período global + um "widget global" que segue exatamente o
//    mesmo padrão de efeito dos dashboards (deps [period], guarda `cancelled`).
function computeRange(p: GlobalDashboardPeriod): { from: string; to: string } {
  if (p.type === "custom" && p.from && p.to) {
    return { from: p.from.toISOString().slice(0, 10), to: p.to.toISOString().slice(0, 10) };
  }
  if (p.type === "last_7_days") return { from: "2026-09-02", to: "2026-09-09" };
  return { from: "2026-08-10", to: "2026-09-09" }; // last_30_days / default
}

type FetchWidgets = (range: { from: string; to: string }) => Promise<string>;

function GlobalWidgetHarness({
  portal = "admin",
  fetchWidgets,
  widgetOverrides = [],
}: {
  portal?: (typeof PORTALS)[number];
  fetchWidgets: FetchWidgets;
  widgetOverrides?: WidgetPeriodOverride[];
}) {
  const [period, setPeriod] = useGlobalDashboardPeriod<string>(portal);
  const [data, setData] = React.useState<string | null>(null);

  // Widget que SEGUE o período global (sem override próprio).
  const globalWidget = resolveWidgetPeriod(widgetOverrides, period, "w-global");
  // Widget com período PRÓPRIO (override mode="custom") — não pode receber o global.
  const ownWidget = resolveWidgetPeriod(widgetOverrides, period, "w-own");

  React.useEffect(() => {
    let cancelled = false;
    fetchWidgets(computeRange(period)).then((res) => {
      if (!cancelled) setData(res);
    });
    return () => {
      cancelled = true;
    };
  }, [period, fetchWidgets]);

  return (
    <div>
      <span data-testid="label">{period.label}</span>
      <span data-testid="type">{period.type}</span>
      <span data-testid="data">{data ?? "loading"}</span>
      <span data-testid="global-widget-custom">{String(globalWidget.isCustom)}</span>
      <span data-testid="own-widget-label">{ownWidget.label}</span>
      <span data-testid="own-widget-custom">{String(ownWidget.isCustom)}</span>
      <button
        onClick={() =>
          setPeriod({
            type: "last_7_days",
            from: new Date("2026-09-02T00:00:00Z"),
            to: new Date("2026-09-09T00:00:00Z"),
            label: "Últimos 7 dias",
          })
        }
      >
        7 dias
      </button>
      <button
        onClick={() =>
          setPeriod({
            type: "custom",
            from: new Date("2026-01-01T00:00:00Z"),
            to: new Date("2026-01-31T00:00:00Z"),
            label: "01/01/2026 - 31/01/2026",
          })
        }
      >
        personalizado
      </button>
    </div>
  );
}

/** Escreve um período no localStorage do jeito real: montando o hook e
 * chamando o setter (dispara o efeito de persistência), depois desmontando. */
async function persistPeriodViaHook(
  portal: (typeof PORTALS)[number],
  next: GlobalDashboardPeriod,
) {
  function Writer() {
    const [, setPeriod] = useGlobalDashboardPeriod<string>(portal);
    React.useEffect(() => {
      setPeriod(next);
    }, [setPeriod]);
    return null;
  }
  const view = render(<Writer />);
  await act(async () => {
    await Promise.resolve();
  });
  view.unmount();
}

describe("useGlobalDashboardPeriod — persistência e hidratação", () => {
  it("(d) restaura o período salvo após remontar (F5): a pílula volta com o último escolhido", async () => {
    const user = userEvent.setup();
    const fetchWidgets = vi.fn((r) => Promise.resolve(`w:${r.from}..${r.to}`));

    const first = render(<GlobalWidgetHarness portal="admin" fetchWidgets={fetchWidgets} />);
    expect(screen.getByTestId("label")).toHaveTextContent("Últimos 30 dias");

    await user.click(screen.getByRole("button", { name: "7 dias" }));
    expect(screen.getByTestId("label")).toHaveTextContent("Últimos 7 dias");
    await act(async () => {
      await Promise.resolve();
    });

    first.unmount();

    // "F5" — nova montagem
    render(<GlobalWidgetHarness portal="admin" fetchWidgets={fetchWidgets} />);
    expect(screen.getByTestId("label")).toHaveTextContent("Últimos 7 dias");
    expect(screen.getByTestId("type")).toHaveTextContent("last_7_days");
  });

  it("(e) o valor padrão nunca sobrescreve a escolha salva durante a hidratação — nem sob StrictMode, nem no 1º render", async () => {
    await persistPeriodViaHook("admin", {
      type: "last_7_days",
      from: new Date("2026-09-02T00:00:00Z"),
      to: new Date("2026-09-09T00:00:00Z"),
      label: "Últimos 7 dias",
    });

    // localStorage já tem "Últimos 7 dias". Uma nova montagem NÃO pode gravar
    // "Últimos 30 dias" por cima, e o 1º render já tem que vir com o salvo
    // (sem "piscar" pro padrão).
    const setItemSpy = vi.spyOn(localStorage, "setItem");
    const rendered: string[] = [];
    function FirstRenderProbe() {
      const [p] = useGlobalDashboardPeriod<string>("admin");
      rendered.push(p.label);
      return <span data-testid="label">{p.label}</span>;
    }

    render(
      <React.StrictMode>
        <FirstRenderProbe />
      </React.StrictMode>,
    );
    await act(async () => {
      await Promise.resolve();
    });

    expect(rendered[0]).toBe("Últimos 7 dias");
    expect(rendered).not.toContain("Últimos 30 dias");
    expect(screen.getByTestId("label")).toHaveTextContent("Últimos 7 dias");

    // nenhuma gravação trocou o valor de volta pro padrão
    const wroteDefault = setItemSpy.mock.calls.some(
      ([, value]) => typeof value === "string" && value.includes("last_30_days"),
    );
    expect(wroteDefault).toBe(false);
    expect(readSavedGlobalDashboardPeriod("admin")?.type).toBe("last_7_days");
    setItemSpy.mockRestore();
  });

  it("(f) Admin, Company, Agency, Partner e Leader usam chaves isoladas por perfil", async () => {
    await persistPeriodViaHook("admin", {
      type: "last_7_days",
      label: "Últimos 7 dias",
    });
    await persistPeriodViaHook("company", {
      type: "this_month",
      label: "Este mês",
    });
    await persistPeriodViaHook("agency", {
      type: "custom",
      from: new Date("2026-06-11T00:00:00Z"),
      to: new Date("2026-09-09T00:00:00Z"),
      label: "Últimos 90 dias",
    });

    expect(readSavedGlobalDashboardPeriod("admin")?.label).toBe("Últimos 7 dias");
    expect(readSavedGlobalDashboardPeriod("company")?.label).toBe("Este mês");
    expect(readSavedGlobalDashboardPeriod("agency")?.label).toBe("Últimos 90 dias");
    // perfis que nunca gravaram continuam no padrão — nunca herdam de outro
    expect(readSavedGlobalDashboardPeriod("partner")).toBeNull();
    expect(readSavedGlobalDashboardPeriod("leader")).toBeNull();

    for (const portal of PORTALS) {
      cleanup();
      const fetchWidgets = vi.fn((r) => Promise.resolve(`w:${r.from}`));
      render(<GlobalWidgetHarness portal={portal} fetchWidgets={fetchWidgets} />);
      const expected =
        portal === "admin"
          ? "Últimos 7 dias"
          : portal === "company"
            ? "Este mês"
            : portal === "agency"
              ? "Últimos 90 dias"
              : "Últimos 30 dias";
      expect(screen.getByTestId("label")).toHaveTextContent(expected);
    }
  });
});

describe("useGlobalDashboardPeriod — troca de período recarrega os widgets globais", () => {
  it("(a) escolher 'Últimos 7 dias' dispara o fetch dos widgets globais com o intervalo novo e atualiza os dados", async () => {
    const user = userEvent.setup();
    const fetchWidgets = vi.fn((r) => Promise.resolve(`widgets@${r.from}..${r.to}`));

    render(<GlobalWidgetHarness portal="admin" fetchWidgets={fetchWidgets} />);
    await act(async () => {
      await Promise.resolve();
    });
    // no 1º carregamento (padrão), buscou a janela de 30 dias
    expect(fetchWidgets).toHaveBeenLastCalledWith({ from: "2026-08-10", to: "2026-09-09" });
    expect(screen.getByTestId("data")).toHaveTextContent("widgets@2026-08-10..2026-09-09");

    await user.click(screen.getByRole("button", { name: "7 dias" }));
    await act(async () => {
      await Promise.resolve();
    });

    expect(fetchWidgets).toHaveBeenLastCalledWith({ from: "2026-09-02", to: "2026-09-09" });
    expect(screen.getByTestId("data")).toHaveTextContent("widgets@2026-09-02..2026-09-09");
  });

  it("(g) o intervalo personalizado também dispara o fetch com as datas escolhidas e persiste", async () => {
    const user = userEvent.setup();
    const fetchWidgets = vi.fn((r) => Promise.resolve(`widgets@${r.from}..${r.to}`));

    const view = render(<GlobalWidgetHarness portal="company" fetchWidgets={fetchWidgets} />);
    await user.click(screen.getByRole("button", { name: "personalizado" }));
    await act(async () => {
      await Promise.resolve();
    });

    expect(fetchWidgets).toHaveBeenLastCalledWith({ from: "2026-01-01", to: "2026-01-31" });
    expect(screen.getByTestId("data")).toHaveTextContent("widgets@2026-01-01..2026-01-31");

    view.unmount();
    render(<GlobalWidgetHarness portal="company" fetchWidgets={fetchWidgets} />);
    expect(screen.getByTestId("label")).toHaveTextContent("01/01/2026 - 31/01/2026");
    expect(readSavedGlobalDashboardPeriod("company")?.type).toBe("custom");
  });

  it("(a+e) após 'F5' os widgets globais já buscam o período salvo no 1º fetch — não a janela padrão", async () => {
    await persistPeriodViaHook("admin", {
      type: "last_7_days",
      from: new Date("2026-09-02T00:00:00Z"),
      to: new Date("2026-09-09T00:00:00Z"),
      label: "Últimos 7 dias",
    });

    const fetchWidgets = vi.fn((r) => Promise.resolve(`widgets@${r.from}`));
    render(<GlobalWidgetHarness portal="admin" fetchWidgets={fetchWidgets} />);
    await act(async () => {
      await Promise.resolve();
    });

    // o PRIMEIRO fetch já usa a janela de 7 dias — nada de 30 dias
    expect(fetchWidgets).toHaveBeenCalledTimes(1);
    expect(fetchWidgets).toHaveBeenCalledWith({ from: "2026-09-02", to: "2026-09-09" });
  });

  it("(c) uma resposta antiga (período anterior) não sobrescreve a resposta do período mais recente", async () => {
    const user = userEvent.setup();
    const resolvers: Record<string, (v: string) => void> = {};
    const fetchWidgets = vi.fn(
      (r) =>
        new Promise<string>((resolve) => {
          resolvers[r.from] = resolve;
        }),
    );

    render(<GlobalWidgetHarness portal="admin" fetchWidgets={fetchWidgets} />);
    // fetch do período padrão (30d) está pendente
    await user.click(screen.getByRole("button", { name: "7 dias" }));
    // agora o fetch de 7d também está pendente

    // resolve o NOVO (7d) primeiro
    await act(async () => {
      resolvers["2026-09-02"]("NOVO-7d");
      await Promise.resolve();
    });
    expect(screen.getByTestId("data")).toHaveTextContent("NOVO-7d");

    // resolve o ANTIGO (30d) DEPOIS — não pode sobrescrever
    await act(async () => {
      resolvers["2026-08-10"]("ANTIGO-30d");
      await Promise.resolve();
    });
    expect(screen.getByTestId("data")).toHaveTextContent("NOVO-7d");
  });
});

describe("resolveWidgetPeriod — widget com período próprio é a única exceção ao global", () => {
  const globalSeed: GlobalDashboardPeriod = {
    type: "last_7_days",
    from: new Date("2026-09-02T00:00:00Z"),
    to: new Date("2026-09-09T00:00:00Z"),
    label: "Últimos 7 dias",
  };
  const overrides: WidgetPeriodOverride[] = [
    {
      widgetId: "w-own",
      mode: "custom",
      customPeriod: {
        from: "2026-01-01",
        to: "2026-01-31",
        label: "Janeiro/2026",
        periodKey: "custom",
      },
    },
  ];

  it("(b) o widget com override mode='custom' NÃO recebe o intervalo global", () => {
    const own = resolveWidgetPeriod(overrides, globalSeed, "w-own");
    expect(own.isCustom).toBe(true);
    expect(own.label).toBe("Janeiro/2026");
    expect(own.from.toISOString().slice(0, 10)).toBe("2026-01-01");

    const follower = resolveWidgetPeriod(overrides, globalSeed, "w-follows-global");
    expect(follower.isCustom).toBe(false);
    expect(follower.label).toBe("Últimos 7 dias");
  });

  it("(b) mudar o período global afeta só quem segue o global — o widget próprio fica imune", () => {
    const newGlobal: GlobalDashboardPeriod = {
      type: "last_30_days",
      from: new Date("2026-08-10T00:00:00Z"),
      to: new Date("2026-09-09T00:00:00Z"),
      label: "Últimos 30 dias",
    };

    const ownBefore = resolveWidgetPeriod(overrides, globalSeed, "w-own");
    const ownAfter = resolveWidgetPeriod(overrides, newGlobal, "w-own");
    expect(ownAfter.from.toISOString()).toBe(ownBefore.from.toISOString());
    expect(ownAfter.label).toBe("Janeiro/2026");

    const followerAfter = resolveWidgetPeriod(overrides, newGlobal, "w-follows-global");
    expect(followerAfter.label).toBe("Últimos 30 dias");
  });

  it("(b) no harness real: trocar o período global muda o widget-global, mas não o widget com período próprio", async () => {
    const user = userEvent.setup();
    const fetchWidgets = vi.fn((r) => Promise.resolve(`w:${r.from}`));

    render(
      <GlobalWidgetHarness
        portal="admin"
        fetchWidgets={fetchWidgets}
        widgetOverrides={overrides}
      />,
    );

    expect(screen.getByTestId("own-widget-label")).toHaveTextContent("Janeiro/2026");
    expect(screen.getByTestId("own-widget-custom")).toHaveTextContent("true");
    expect(screen.getByTestId("global-widget-custom")).toHaveTextContent("false");

    await user.click(screen.getByRole("button", { name: "7 dias" }));

    // widget próprio: intacto
    expect(screen.getByTestId("own-widget-label")).toHaveTextContent("Janeiro/2026");
    // widget global: acompanhou
    expect(screen.getByTestId("label")).toHaveTextContent("Últimos 7 dias");
  });
});
