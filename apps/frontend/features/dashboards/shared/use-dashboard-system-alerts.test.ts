import { describe, expect, it } from "vitest";
import { mapSystemAlerts } from "./use-dashboard-system-alerts";

// Os dashboards mostravam alertas inventados ("Fatura #201", "Pico de tráfego +45%"). Agora só aparece o que veio do servidor.
describe("mapSystemAlerts — alertas reais dos dashboards", () => {
  const now = new Date("2026-10-10T12:00:00Z");

  it("sem alertas reais: listas vazias (nada inventado)", () => {
    expect(mapSystemAlerts([], now)).toEqual({ alerts: [], log: [] });
    expect(mapSystemAlerts(undefined as any, now)).toEqual({ alerts: [], log: [] });
  });

  it("converte severidade em prioridade e mostra só os não lidos nos alertas", () => {
    const r = mapSystemAlerts([
      { id: "a", title: "Entrega atrasada", message: "Tarefa X passou do prazo", severity: "critical", is_read: false, created_at: "2026-10-10T11:30:00Z" },
      { id: "b", title: "Fatura vence", message: "Vence em 3 dias", severity: "warning", is_read: false, created_at: "2026-10-10T08:00:00Z" },
      { id: "c", title: "Já vista", message: "ok", severity: "info", is_read: true, created_at: "2026-10-08T12:00:00Z" },
    ], now);
    expect(r.alerts.map((a) => [a.id, a.priority, a.type])).toEqual([["a", "high", "warning"], ["b", "medium", "warning"]]);
    expect(r.alerts[0].description).toBe("Tarefa X passou do prazo");
    expect(r.log.length).toBe(3); // o registro mostra todos, lidos ou não
    expect(r.log[0].time).toBe("30 min atrás");
    expect(r.log[1].time).toBe("4 h atrás");
    expect(r.log[2].time).toBe("2 d atrás");
  });

  it("linha incompleta não quebra a tela", () => {
    const r = mapSystemAlerts([{}, null as any], now);
    expect(r.alerts.length).toBe(1);
    expect(r.alerts[0].title).toBe("Alerta");
  });
});
