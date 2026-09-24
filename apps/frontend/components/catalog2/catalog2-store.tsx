"use client";

// Loja do novo catálogo para o CLIENTE (sprint de produtos, bloco 5/6).
// Implementação ÚNICA, compartilhada pelos portais elegíveis (admin preview,
// company, agency). Lista + detalhe + configurador + cotação + cesta. Preço e
// prazo vêm SEMPRE do backend. Filtros e o produto aberto ficam na URL.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  Loader2, Search, ShoppingCart, Store, X, AlertTriangle, Trash2,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { HeaderSlideScreen } from "@/components/header-slide-screen";
import { catalog2StatusLabel, catalog2StatusTone } from "@/lib/catalog2-status";
import { STANDARD_SHELL_PANEL_CLASS, StandardPageBanner } from "@/components/standard-page-shell";
import { Catalog2ProductCard } from "@/components/catalog2-product-card";
import { Catalog2ProductListRow, Catalog2ProductListHeader } from "@/components/catalog2-product-list-row";
import { Catalog2BrowseToolbar, type Catalog2CategoryTab } from "@/components/catalog2-browse-toolbar";
import { Catalog2ProductDetail } from "@/components/catalog2-product-detail";
import { ProductViewModeToggle } from "@/components/product-view-mode-toggle";
import { usePersistedViewMode, viewModeGridClass } from "@/lib/use-persisted-view-mode";

type Portal = "admin" | "company" | "agency" | "leader";

// Rota base de cada portal — usada para montar o link direto/compartilhável
// do produto (/base/:slug), o mesmo padrão que o admin já usa em
// catalogo-produtos/:produtoId. Achado do usuário 2026-09-23: precisa dar
// pra copiar e mandar o link direto de um produto, não só ?produto=.
const PORTAL_BASE_PATH: Record<Portal, string> = {
  admin: "/admin/catalog2",
  company: "/company/catalogo-produtos",
  agency: "/agency/catalogo-produtos",
  leader: "/leader/catalogo-produtos",
};

function money(v: number | null | undefined, currency = "BRL") {
  if (v == null) return "A definir";
  return `${currency} ${Number(v).toFixed(2)}`;
}

// Item 6 (reunião 2026-09-14, "Modalidades de contratação por período").
const PERIOD_LABEL: Record<string, string> = { mensal: "Mensal", trimestral: "Trimestral", semestral: "Semestral", anual: "Anual" };

export function Catalog2Store({ portal }: { portal: Portal }) {
  const navigate = useNavigate();
  const { produtoId } = useParams<{ produtoId?: string }>();
  const [sp, setSp] = useSearchParams();
  const basePath = PORTAL_BASE_PATH[portal];
  // Link direto/compartilhável: /base/:produtoId — ?produto= continua
  // funcionando como fallback pra não quebrar link antigo já compartilhado.
  const slug = produtoId ?? sp.get("produto");
  const openProduct = useCallback((s: string) => navigate(`${basePath}/${s}${sp.toString() ? `?${sp.toString()}` : ""}`), [navigate, basePath, sp]);
  const closeProduct = useCallback(() => navigate(`${basePath}${sp.toString() ? `?${sp.toString()}` : ""}`), [navigate, basePath, sp]);
  // Item 16.2 (reunião 2026-09-14, "Checkout demonstrativo") — corrigido:
  // antes só o portal "admin" conseguia acionar ?preview=1 aqui, mesmo já
  // existindo uma conta comercial (company/agency) autorizada via
  // CATALOG2_DEMO_PREVIEW_EMAILS (Item 16.1) que o backend aceita. A
  // autorização de verdade é sempre do backend (can_preview_drafts =
  // isMaster || e-mail exato na allowlist) — contas fora da lista recebem
  // 404 do próprio backend (`forbidden` abaixo), então repassar o parâmetro
  // aqui não abre nada que o backend já não decida sozinho.
  const preview = sp.get("preview") === "1";

  const [refs, setRefs] = useState<{ pillars: any[]; categories: any[]; four_f: any[] }>({ pillars: [], categories: [], four_f: [] });
  const [cartOpen, setCartOpen] = useState(false);
  const [cart, setCart] = useState<{ items: any[]; count: number; needs_revalidation: boolean }>({ items: [], count: 0, needs_revalidation: false });
  const [forbidden, setForbidden] = useState(false);

  const loadCart = useCallback(async () => {
    try {
      setCart(await apiClient.getClientCatalog2Cart());
    } catch (e: any) {
      if (e?.status === 404) setForbidden(true);
    }
  }, []);

  useEffect(() => {
    apiClient.getClientCatalog2Refs().then(setRefs).catch((e: any) => { if (e?.status === 404) setForbidden(true); });
    void loadCart();
  }, [loadCart]);

  // Aplica VÁRIAS mudanças de uma vez — `setSearchParams` não encadeia
  // updates funcionais como `useState`; duas chamadas seguidas se perdem.
  const setParams = useCallback((changes: Record<string, string | null>) => {
    setSp((prev) => {
      const n = new URLSearchParams(prev);
      for (const [k, v] of Object.entries(changes)) {
        if (v == null || v === "") n.delete(k);
        else n.set(k, v);
      }
      return n;
    });
  }, [setSp]);
  const setParam = useCallback((k: string, v: string | null) => setParams({ [k]: v }), [setParams]);

  if (forbidden) {
    return (
      <div className={STANDARD_SHELL_PANEL_CLASS}>
        <div className="flex h-full items-center justify-center p-6 text-sm text-slate-500">
          Seu perfil não tem acesso ao novo catálogo neste momento.
        </div>
      </div>
    );
  }

  // Líder só visualiza (never configura/contrata — ver
  // always_sees_all_products/can_configure em catalog2-client.ts) — não faz
  // sentido mostrar cesta/checkout pra quem não compra.
  const cartButton = portal !== "leader" ? (
    <Button data-tour-id="catalog2-cart-button" size="sm" variant="outline" className="bg-white" onClick={() => { setCartOpen(true); void loadCart(); }}>
      <ShoppingCart className="h-4 w-4" /> Cesta{cart.count > 0 ? ` (${cart.count})` : ""}
    </Button>
  ) : undefined;

  return (
    <div className={STANDARD_SHELL_PANEL_CLASS}>
      <div className="relative h-full min-h-0 flex flex-col overflow-hidden">
        {/* O banner "Catálogo de Produtos" some ao abrir um produto — igual
            ao admin, que substitui a tela inteira pelo "Detalhe comercial"
            (nunca os dois cabeçalhos empilhados). Achado do usuário
            2026-09-23: estava saindo com dois cabeçalhos degradê juntos. */}
        {!slug && (
          <div className="shrink-0 -mb-[11px]">
            <StandardPageBanner
              icon={Store}
              title="Catálogo de Produtos"
              description={
                preview
                  ? "Pré-visualização como cliente — rascunhos visíveis, sem cotação válida."
                  : "Soluções em design, automação e tecnologia para impulsionar o seu negócio."
              }
              contentClassName="lg:h-[65px]"
              actions={cartButton}
            />
          </div>
        )}
        {/* Sem padding extra aqui quando slug — STANDARD_SHELL_PANEL_CLASS
            (no wrapper mais externo) já dá a margem, igual ao admin
            (app/admin/catalogo-produtos/page.tsx). Empilhar os dois dobrava
            a margem — achado do usuário 2026-09-23. */}
        <div className={slug ? "flex-1 min-h-0 overflow-hidden" : "flex-1 min-h-0 overflow-y-auto p-4 md:p-6"}>
          {slug ? (
            <Catalog2ProductDetail
              productId={slug}
              dataSource="client"
              preview={preview}
              onBack={closeProduct}
              onCartChanged={loadCart}
              canBuy={portal !== "leader"}
              shareBasePath={basePath}
              cartCount={cart.count}
              onOpenCart={() => { setCartOpen(true); void loadCart(); }}
            />
          ) : (
            <CatalogList refs={refs} sp={sp} setParam={setParam} setParams={setParams} onOpen={openProduct} preview={preview} />
          )}
        </div>
      </div>

      {cartOpen && portal !== "leader" && (
        <CartDrawer
          portal={portal}
          cart={cart}
          onClose={() => setCartOpen(false)}
          onChanged={loadCart}
          onOpenProduct={(s) => { setCartOpen(false); openProduct(s); }}
        />
      )}
    </div>
  );
}

const CLIENT_SORT_OPTIONS = [
  { key: "name", label: "Nome A–Z" },
  { key: "name_desc", label: "Nome Z–A" },
  { key: "recent", label: "Atualizados recentemente" },
];

// ── Lista ─────────────────────────────────────────────────────────────
// Mesma barra de busca/categorias/ordenação do Cadastro de Produtos do
// admin (Catalog2BrowseToolbar) — achado do usuário 2026-09-25: "é a mesma
// tela". Carrega tudo de uma vez (até 60, o máximo aceito pelo backend —
// hoje são só ~37 produtos reais + fixture) e filtra por categoria no
// cliente, igual o admin já fazia, em vez de paginar 12 em 12.
function CatalogList({ refs, sp, setParam, setParams, onOpen, preview }: any) {
  const [data, setData] = useState<{ data: any[]; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  // Referência do usuário 2026-09-25: a tela de lista (mesma do Cadastro de
  // Produtos do admin) é o layout padrão — não a grade de cards.
  const [viewMode, setViewMode] = usePersistedViewMode("client-catalogo-produtos", "list");
  const q = sp.get("q") ?? "";
  const pillar = sp.get("pilar") ?? "";
  const categoryName = sp.get("categoria") ?? "Todos";
  const fourF = sp.get("4f") ?? "";
  const sort = sp.get("ordem") ?? "name";

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => {
      apiClient
        .getClientCatalog2Products({
          q, pillar_id: pillar, four_f_id: fourF, sort, page: 1, page_size: 60,
          // Preview ("visualizar como cliente"): mostra os 36 reais mesmo
          // incompletos — o backend só relaxa isso pra Admin Master.
          ...(preview ? { preview: "1" } : {}),
        })
        .then(setData)
        .catch(() => setData({ data: [], total: 0 }))
        .finally(() => setLoading(false));
    }, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [q, pillar, fourF, sort, preview]);

  const categoryTabs: Catalog2CategoryTab[] = useMemo(() => {
    const rows = data?.data ?? [];
    const counts: Record<string, number> = {};
    for (const p of rows) {
      const name = p.category?.name ?? "Sem categoria";
      counts[name] = (counts[name] ?? 0) + 1;
    }
    return [
      { id: "Todos", label: "Todos", count: rows.length },
      ...Object.entries(counts).map(([name, count]) => ({ id: name, label: name, count })),
    ];
  }, [data]);

  const filteredRows = useMemo(() => {
    const rows = data?.data ?? [];
    if (categoryName === "Todos") return rows;
    return rows.filter((p: any) => (p.category?.name ?? "Sem categoria") === categoryName);
  }, [data, categoryName]);

  return (
    <div className="space-y-4">
      <Catalog2BrowseToolbar
        search={q}
        onSearchChange={(v) => setParams({ q: v || null })}
        sortOptions={CLIENT_SORT_OPTIONS}
        sortValue={sort}
        onSortChange={(v) => setParam("ordem", v)}
        resultCount={filteredRows.length}
        categoryTabs={categoryTabs}
        activeCategory={categoryName}
        onCategoryChange={(id) => setParam("categoria", id === "Todos" ? null : id)}
        viewModeToggle={<ProductViewModeToggle value={viewMode} onChange={setViewMode} />}
      />

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-neutral-500"><Loader2 className="h-5 w-5 animate-spin" /> Carregando…</div>
      ) : filteredRows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 p-10 text-center text-sm text-neutral-500 dark:border-neutral-700">
          Nenhum produto disponível com esses filtros.
        </div>
      ) : viewMode === "list" ? (
        // Mesmo layout de lista do Cadastro de Produtos do admin — ver
        // components/catalog2-product-list-row.tsx. showAdminColumns=false
        // esconde Tarefas/Pendências (informação interna).
        <div className="overflow-x-auto rounded-xl border border-slate-200/70 bg-white shadow-sm dark:border-slate-700/60 dark:bg-slate-900">
          <div className="min-w-[900px]">
            <Catalog2ProductListHeader />
          </div>
          <ul className="min-w-[900px] divide-y divide-slate-100 dark:divide-slate-800">
            {filteredRows.map((p: any) => (
              <Catalog2ProductListRow
                key={p.id}
                name={p.name}
                description={p.short_description}
                categoryName={p.category?.name ?? p.pillar?.name ?? "Sem categoria"}
                deadlineDays={p.commercial_deadline_days}
                price={p.starting_price}
                onOpen={() => onOpen(p.sequence_number ?? p.slug)}
                ctaLabel={(p.has_variations || p.has_addons) ? "Ver opções" : "Ver detalhes"}
                statusBadge={
                  p.is_new ? (
                    <Badge className="border-0 bg-emerald-500 px-2 py-1 text-[10px] font-bold text-white shadow-sm">Novo</Badge>
                  ) : p.is_preview && p.status !== "disponivel" ? (
                    <Badge className="border-0 bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-800 shadow-sm dark:bg-amber-900/40 dark:text-amber-200">Em preparação</Badge>
                  ) : !p.is_preview && p.status && p.status !== "disponivel" ? (
                    <Badge className={`border-0 px-2 py-1 text-[10px] font-bold shadow-sm ${catalog2StatusTone(p.status)}`}>{p.status_label ?? catalog2StatusLabel(p.status)}</Badge>
                  ) : (
                    <Badge className="border-0 bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700 shadow-none ring-1 ring-emerald-100">Disponível</Badge>
                  )
                }
              />
            ))}
          </ul>
        </div>
      ) : (
        <>
          {/* Mesmo card visual do Cadastro de Produtos do admin — ver
              components/catalog2-product-card.tsx. Mudar o visual lá
              reflete aqui e em qualquer outra tela que mostre catalog2. */}
          <div className={viewModeGridClass(viewMode)}>
            {filteredRows.map((p: any) => (
              <Catalog2ProductCard
                key={p.id}
                name={p.name}
                description={p.short_description}
                categoryName={p.category?.name ?? p.pillar?.name ?? "Sem categoria"}
                deadlineDays={p.commercial_deadline_days}
                price={p.starting_price}
                onOpen={() => onOpen(p.sequence_number ?? p.slug)}
                ctaLabel={(p.has_variations || p.has_addons) ? "Ver opções" : "Ver detalhes"}
                cornerBadgeRight={
                  p.is_new ? (
                    <Badge className="border-0 bg-emerald-500 px-2.5 py-1 text-[10px] font-bold text-white shadow-sm">Novo</Badge>
                  ) : p.is_preview && p.status !== "disponivel" ? (
                    <Badge className="border-0 bg-amber-100 px-2.5 py-1 text-[10px] font-bold text-amber-800 shadow-sm dark:bg-amber-900/40 dark:text-amber-200">Em preparação</Badge>
                  ) : !p.is_preview && p.status && p.status !== "disponivel" ? (
                    <Badge className={`border-0 px-2.5 py-1 text-[10px] font-bold shadow-sm ${catalog2StatusTone(p.status)}`}>{p.status_label ?? catalog2StatusLabel(p.status)}</Badge>
                  ) : undefined
                }
                extraTags={
                  <>
                    {p.is_preview && (p.pendencies?.length ?? 0) > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-amber-100 dark:bg-amber-900/40 dark:text-amber-200">
                        Falta: {p.pendencies.join(", ")}
                      </span>
                    )}
                    {!p.is_preview && p.unavailable_reason && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-amber-100 dark:bg-amber-900/40 dark:text-amber-200">
                        {p.unavailable_reason.charAt(0).toUpperCase() + p.unavailable_reason.slice(1)}
                      </span>
                    )}
                  </>
                }
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Cesta ─────────────────────────────────────────────────────────────
function CartDrawer({ portal, cart, onClose, onChanged, onOpenProduct }: any) {
  const navigate = useNavigate();
  const [confirmClear, setConfirmClear] = useState(false);
  const [busy, setBusy] = useState(false);

  async function remove(id: string) {
    setBusy(true);
    try { await apiClient.removeClientCatalog2CartItem(id); await onChanged(); } finally { setBusy(false); }
  }
  async function clear() {
    setBusy(true);
    try { await apiClient.clearClientCatalog2Cart(); await onChanged(); } finally { setBusy(false); setConfirmClear(false); }
  }

  return (
    <>
    {/* Mesma "Tela Slide" global usada por Notificações/Alertas — cantos
        arredondados, cabeçalho degradê, cai no mesmo retângulo do painel
        branco da página. Achado do usuário 2026-09-23: a cesta tinha
        ficado um retângulo reto colado na borda, "tem que usar o
        container" também. */}
    <HeaderSlideScreen
      open
      onClose={onClose}
      title={`Cesta do catálogo${cart.count > 0 ? ` (${cart.count})` : ""}`}
      footer={
        <div className="space-y-2">
          {cart.items.length > 0 && (
            <Button
              size="sm"
              className="w-full rounded-lg border-0 bg-gradient-to-r from-[#4a2cff] via-[#7b2cdb] to-[#d92293] text-white"
              disabled={cart.needs_revalidation}
              onClick={() => navigate(`/${portal}/catalogo-produtos/checkout`)}
            >
              Finalizar compra
            </Button>
          )}
          <Button size="sm" variant="ghost" className="w-full" onClick={onClose}>Continuar comprando</Button>
          {cart.items.length > 0 && (
            <Button size="sm" variant="ghost" className="w-full text-red-600" disabled={busy} onClick={() => setConfirmClear(true)}>
              Limpar cesta
            </Button>
          )}
          {cart.needs_revalidation && (
            <p className="flex items-center gap-1 text-[11px] text-amber-600">
              <AlertTriangle className="h-3 w-3" /> Revise os itens desatualizados antes de finalizar a compra.
            </p>
          )}
        </div>
      }
    >
      <div className="flex h-full w-full flex-col overflow-hidden bg-white p-4 dark:bg-slate-900">
        {cart.needs_revalidation && (
          <p className="mb-2 rounded bg-amber-50 px-2 py-1.5 text-xs text-amber-700">
            Alguns itens mudaram desde que foram adicionados. Revise antes de avançar.
          </p>
        )}

        {cart.items.length === 0 ? (
          <p className="py-8 text-center text-sm text-neutral-500">Sua cesta está vazia.</p>
        ) : (
          <ul className="flex-1 space-y-2 overflow-y-auto">
            {cart.items.map((it: any) => (
              <li key={it.id} className="rounded-lg border border-neutral-200 p-3 text-sm dark:border-neutral-800">
                <div className="flex items-start justify-between gap-2">
                  <button className="text-left font-medium hover:underline" onClick={() => onOpenProduct(it.slug)}>{it.name}</button>
                  <button className="text-red-500" disabled={busy} onClick={() => remove(it.id)}><Trash2 className="h-4 w-4" /></button>
                </div>
                <div className="mt-1 text-xs text-neutral-500">
                  qtd {it.quantity}
                  {it.period ? (
                    <> · {PERIOD_LABEL[it.period] ?? it.period} — {it.period_pricing?.available ? money(it.period_pricing.total_price, it.period_pricing.currency) : "período indisponível"}</>
                  ) : (
                    <> · {it.pricing ? money(it.pricing.commercial_price, it.pricing.currency) : "recalcular"}</>
                  )}
                  {!it.current && <span className="ml-1 text-amber-600">(nova versão publicada — revise)</span>}
                </div>
                {it.period && it.period_pricing?.available && it.period_pricing.months > 1 && (
                  <div className="mt-0.5 text-[11px] text-neutral-400">
                    Entrega mês a mês — {it.period_pricing.months} ciclo(s), pagamento único antecipado.
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </HeaderSlideScreen>

    {confirmClear && (
      <ConfirmationDialog
        open
        onClose={() => setConfirmClear(false)}
        title="Limpar a cesta?"
        message="Todos os itens serão removidos. Esta ação não pode ser desfeita."
        confirmText="Limpar tudo"
        destructive
        onConfirm={clear}
      />
    )}
    </>
  );
}
