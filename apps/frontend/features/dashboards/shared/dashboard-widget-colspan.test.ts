import { describe, it, expect, beforeEach } from "vitest";
import {
  DEFAULT_WIDGET_COL_SPAN,
  normalizeWidgetColSpan,
  normalizeWidgetsColSpan,
  serializeWidgetConfig,
} from "@/features/dashboards/shared/dashboard-widget-colspan";
import { getDashboardStorageKey } from "@/lib/dashboard-storage-scope";

// Bug de persistência de largura (colSpan): o Salvar do editor gravava a
// config COM colSpan; o salvamento automático do dashboard gravava a MESMA
// config SEM colSpan. Uma largura salva era sobrescrita pelo auto-save
// seguinte e voltava ao valor antigo no F5. Agora todo caminho de gravação
// passa por serializeWidgetConfig e todo carregamento por
// normalizeWidgetsColSpan.

type W = {
  id: string;
  type: string;
  visible: boolean;
  order: number;
  customTitle?: string;
  colSpan?: number;
};

const wide = (over: Partial<W> = {}): W => ({
  id: "metrics-1",
  type: "metrics",
  visible: true,
  order: 0,
  colSpan: 2,
  ...over,
});

/** Widget típico, com colSpan opcional controlável (default: ausente). */
const mkW = (over: Partial<W> = {}): W => ({
  id: "a",
  type: "metrics",
  visible: true,
  order: 0,
  ...over,
});

describe("normalizeWidgetColSpan", () => {
  it("preenche o padrão quando colSpan está ausente", () => {
    const w = normalizeWidgetColSpan(mkW());
    expect(w.colSpan).toBe(DEFAULT_WIDGET_COL_SPAN);
    expect(DEFAULT_WIDGET_COL_SPAN).toBe(1);
  });

  it("mantém 2 e 3", () => {
    expect(normalizeWidgetColSpan(wide({ colSpan: 2 })).colSpan).toBe(2);
    expect(normalizeWidgetColSpan(wide({ colSpan: 3 })).colSpan).toBe(3);
  });

  it("normaliza valores inválidos para o padrão", () => {
    for (const bad of [0, 4, 5, -1, "2", null, undefined, NaN]) {
      expect(normalizeWidgetColSpan(mkW({ colSpan: bad as never })).colSpan).toBe(1);
    }
  });

  it("não mexe em id/type/visible/order/customTitle", () => {
    const src = { id: "x", type: "revenue", visible: false, order: 7, customTitle: "Receita", colSpan: 3 };
    const out = normalizeWidgetColSpan(src);
    expect(out).toEqual(src);
  });

  it("devolve o MESMO objeto quando já está correto (evita re-render à toa)", () => {
    const src = wide({ colSpan: 2 });
    expect(normalizeWidgetColSpan(src)).toBe(src);
  });
});

describe("normalizeWidgetsColSpan", () => {
  it("normaliza cada item e preserva ordem/visibilidade/título", () => {
    const list: W[] = [
      { id: "a", type: "metrics", visible: true, order: 0 }, // sem colSpan
      { id: "b", type: "tasks", visible: false, order: 1, colSpan: 2, customTitle: "T" },
      { id: "c", type: "alerts", visible: true, order: 2, colSpan: 9 as never }, // inválido
    ];
    const out = normalizeWidgetsColSpan(list);
    expect(out.map((w) => w.colSpan)).toEqual([1, 2, 1]);
    expect(out.map((w) => w.id)).toEqual(["a", "b", "c"]);
    expect(out.map((w) => w.order)).toEqual([0, 1, 2]);
    expect(out[1].visible).toBe(false);
    expect(out[1].customTitle).toBe("T");
  });

  it("devolve o MESMO array quando nada muda", () => {
    const list = [wide({ id: "a", colSpan: 1 }), wide({ id: "b", colSpan: 3 })];
    expect(normalizeWidgetsColSpan(list)).toBe(list);
  });
});

describe("serializeWidgetConfig — formato único persistido", () => {
  it("SEMPRE inclui colSpan (era isso que o auto-save omitia)", () => {
    const out = serializeWidgetConfig([
      { id: "a", type: "metrics", visible: true, order: 0 }, // sem colSpan
      { id: "b", type: "tasks", visible: true, order: 1, colSpan: 2 },
      { id: "c", type: "alerts", visible: true, order: 2, colSpan: 3 },
    ]);
    expect(out.every((w) => w.colSpan === 1 || w.colSpan === 2 || w.colSpan === 3)).toBe(true);
    expect(out.map((w) => w.colSpan)).toEqual([1, 2, 3]);
  });

  it("mantém exatamente os campos de config (id/type/visible/order/customTitle) + colSpan", () => {
    const [w] = serializeWidgetConfig([
      { id: "a", type: "metrics", visible: false, order: 4, customTitle: "X", colSpan: 2 },
    ]);
    expect(Object.keys(w).sort()).toEqual(
      ["colSpan", "customTitle", "id", "order", "type", "visible"].sort(),
    );
    expect(w).toMatchObject({ id: "a", type: "metrics", visible: false, order: 4, customTitle: "X", colSpan: 2 });
  });

  it("é idempotente (auto-save reaplicado não perde nem muda largura)", () => {
    const src: W[] = [wide({ id: "a", colSpan: 3 }), wide({ id: "b", colSpan: 1 }), { id: "c", type: "t", visible: true, order: 2 }];
    const once = serializeWidgetConfig(src);
    const twice = serializeWidgetConfig(once);
    expect(twice).toEqual(once);
  });
});

// ── Round-trips de persistência (localStorage falso via vitest.setup) ───────

function roundTrip(json: string): W[] {
  return normalizeWidgetsColSpan(JSON.parse(json) as W[]);
}

describe("round-trip — largura sobrevive", () => {
  it("Salvar do editor: config gravada volta com a mesma largura", () => {
    const saved = [wide({ id: "a", colSpan: 2 }), wide({ id: "b", type: "tasks", order: 1, colSpan: 3 })];
    const restored = roundTrip(JSON.stringify(serializeWidgetConfig(saved)));
    expect(restored.map((w) => w.colSpan)).toEqual([2, 3]);
  });

  it("salvamento automático: reaplicar o serialize NÃO zera a largura", () => {
    const loaded = normalizeWidgetsColSpan([
      { id: "a", type: "metrics", visible: true, order: 0, colSpan: 2 },
    ]);
    // simula o useEffect de auto-save disparado por outra config do dashboard
    const autoSaved = JSON.stringify(serializeWidgetConfig(loaded));
    expect(roundTrip(autoSaved)[0].colSpan).toBe(2);
  });

  it("cenário combinado: Salvar → auto-save posterior → recarregar mantém a largura", () => {
    // 1) editor.finalize() → largura escolhida
    const finalized: W[] = [wide({ id: "a", colSpan: 3 }), wide({ id: "b", type: "tasks", order: 1, colSpan: 1 })];
    // 2) Salvar grava o formato único
    const configAfterSave = JSON.stringify(serializeWidgetConfig(finalized));
    // 3) setWidgets(finalized) dispara o auto-save, que regrava a MESMA
    //    fonte (o estado widgets, que agora tem colSpan)
    const stateWidgets = roundTrip(configAfterSave);
    const configAfterAutoSave = JSON.stringify(serializeWidgetConfig(stateWidgets));
    // 4) F5 — carrega a última config gravada
    const afterReload = roundTrip(configAfterAutoSave);

    expect(JSON.parse(configAfterSave)).toEqual(JSON.parse(configAfterAutoSave)); // auto-save não divergiu
    expect(afterReload.map((w) => w.colSpan)).toEqual([3, 1]);
  });

  it("compatibilidade: config ANTIGA sem colSpan carrega com o padrão e não quebra", () => {
    const legacy = '[{"id":"a","type":"metrics","visible":true,"order":0},{"id":"b","type":"tasks","visible":true,"order":1}]';
    const loaded = roundTrip(legacy);
    expect(loaded).toHaveLength(2);
    expect(loaded.every((w) => w.colSpan === 1)).toBe(true);
    // ordem/visibilidade intactas
    expect(loaded.map((w) => [w.id, w.visible, w.order])).toEqual([
      ["a", true, 0],
      ["b", true, 1],
    ]);
  });
});

// ── Cobertura dos 5 portais (mesma chave e mesmo formato para cada) ────────

describe("por portal — Admin/Company/Agency/Leader/Partner", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("allka_user", JSON.stringify({ id: "user-1" }));
  });

  for (const portal of ["admin", "company", "agency", "leader", "partner"] as const) {
    it(`${portal}: grava serializeWidgetConfig e recarrega mantendo colSpan`, () => {
      const key = getDashboardStorageKey("dashboard-widget-config", portal);

      const editorSaved: W[] = [
        { id: "metrics-1", type: "metrics", visible: true, order: 0, colSpan: 3 },
        { id: "tasks-1", type: "tasks", visible: false, order: 1, colSpan: 2, customTitle: "Fila" },
        { id: "alerts-1", type: "alerts", visible: true, order: 2 }, // sem colSpan → padrão
      ];

      // Salvar do editor
      localStorage.setItem(key, JSON.stringify(serializeWidgetConfig(editorSaved)));
      // Auto-save posterior (mesma fonte, já normalizada em memória)
      const stateWidgets = normalizeWidgetsColSpan(
        JSON.parse(localStorage.getItem(key)!) as W[],
      );
      localStorage.setItem(key, JSON.stringify(serializeWidgetConfig(stateWidgets)));

      // F5
      const reloaded = normalizeWidgetsColSpan(JSON.parse(localStorage.getItem(key)!) as W[]);
      expect(reloaded.map((w) => w.colSpan)).toEqual([3, 2, 1]);
      expect(reloaded.map((w) => w.order)).toEqual([0, 1, 2]);
      expect(reloaded[1].visible).toBe(false);
      expect(reloaded[1].customTitle).toBe("Fila");
    });
  }
});
