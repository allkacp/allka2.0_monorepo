// Persistência de `colSpan` (largura) dos widgets — formato ÚNICO e
// consistente para os 5 dashboards de shape genérico (Admin, Company,
// Agency, Leader, Partner).
//
// Bug corrigido (auditoria 09/09/2026): o Salvar do editor gravava a
// config de widgets COM `colSpan`; o salvamento automático do dashboard
// (`useEffect` que reage a qualquer mudança) gravava a MESMA config SEM
// `colSpan` (`widgets.map(w => ({ id, type, visible, order, customTitle }))`).
// Dois formatos divergentes: uma largura salva pelo editor era sobrescrita
// pelo auto-save seguinte e voltava ao valor antigo no F5.
//
// Agora todo caminho de gravação passa por `serializeWidgetConfig` e todo
// caminho de leitura por `normalizeWidgetsColSpan`. Configs antigas sem
// `colSpan` continuam válidas: recebem o padrão na leitura.
//
// NÃO cobre o Nomad — o painel dele usa outro shape (`NomadeWidget`, com
// `colSpan: 1 | 2`) e persistência própria; fica intocado.

/** Largura padrão quando a config não traz `colSpan` (configs salvas antes
 * do campo existir, presets, dados legados). É a mesma largura que o render
 * já assume hoje para um widget sem `colSpan`. */
export const DEFAULT_WIDGET_COL_SPAN = 1 as const;

/** Larguras válidas do shape genérico (1, 2 ou 3 das 3 colunas). */
export type WidgetColSpan = 1 | 2 | 3;

function resolveColSpan(raw: unknown): WidgetColSpan {
  return raw === 2 || raw === 3 ? raw : DEFAULT_WIDGET_COL_SPAN;
}

/** Preenche/valida o `colSpan` de UM widget sem tocar em mais nada
 * (ordem, visibilidade, título, tipo, id). Devolve o mesmo objeto quando
 * já está correto, para não gerar re-render à toa. */
export function normalizeWidgetColSpan<T extends { colSpan?: unknown }>(widget: T): T {
  const next = resolveColSpan(widget.colSpan);
  return widget.colSpan === next ? widget : { ...widget, colSpan: next };
}

/** Aplica `normalizeWidgetColSpan` numa lista — usar em TODO ponto que
 * carrega widgets (localStorage, visão salva, template resolvido). */
export function normalizeWidgetsColSpan<T extends { colSpan?: unknown }>(widgets: T[]): T[] {
  let changed = false;
  const out = widgets.map((w) => {
    const n = normalizeWidgetColSpan(w);
    if (n !== w) changed = true;
    return n;
  });
  return changed ? out : widgets;
}

interface PersistableWidget {
  id: string;
  type: string;
  visible: boolean;
  order: number;
  customTitle?: string;
  colSpan?: unknown;
}

/** Formato ÚNICO gravado em `dashboard-widget-config` (auto-save e Salvar
 * do editor). Sempre inclui `colSpan`. Mantém exatamente os mesmos campos
 * de antes + `colSpan` — nada de ordem/visibilidade/título muda. */
export function serializeWidgetConfig(widgets: PersistableWidget[]) {
  return widgets.map((w) => ({
    id: w.id,
    type: w.type,
    visible: w.visible,
    order: w.order,
    customTitle: w.customTitle,
    colSpan: resolveColSpan(w.colSpan),
  }));
}
