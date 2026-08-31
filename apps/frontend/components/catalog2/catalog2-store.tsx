"use client";

// Loja do novo catálogo para o CLIENTE (sprint de produtos, bloco 5/6).
// Implementação ÚNICA, compartilhada pelos portais elegíveis (admin preview,
// company, agency). Lista + detalhe + configurador + cotação + cesta. Preço e
// prazo vêm SEMPRE do backend. Filtros e o produto aberto ficam na URL.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft, Loader2, Search, ShoppingCart, X, Info, AlertTriangle, Trash2,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ConfirmationDialog } from "@/components/confirmation-dialog";

type Portal = "admin" | "company" | "agency";

function money(v: number | null | undefined, currency = "BRL") {
  if (v == null) return "A definir";
  return `${currency} ${Number(v).toFixed(2)}`;
}

export function Catalog2Store({ portal }: { portal: Portal }) {
  const [sp, setSp] = useSearchParams();
  const slug = sp.get("produto");
  const preview = portal === "admin" && sp.get("preview") === "1";

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
      <div className="mx-auto max-w-3xl p-6 text-sm text-neutral-500">
        Seu perfil não tem acesso ao novo catálogo neste momento.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl p-4 md:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">Novo catálogo</h1>
          {preview && (
            <p className="mt-0.5 inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
              <Info className="h-3.5 w-3.5" /> Pré-visualização como cliente — rascunhos visíveis, sem cotação válida.
            </p>
          )}
        </div>
        <Button size="sm" variant="outline" onClick={() => { setCartOpen(true); void loadCart(); }}>
          <ShoppingCart className="h-4 w-4" /> Cesta{cart.count > 0 ? ` (${cart.count})` : ""}
        </Button>
      </div>

      {slug ? (
        <ProductDetail
          slug={slug}
          preview={preview}
          onBack={() => setParam("produto", null)}
          onCartChanged={loadCart}
        />
      ) : (
        <CatalogList refs={refs} sp={sp} setParam={setParam} setParams={setParams} onOpen={(s) => setParam("produto", s)} />
      )}

      {cartOpen && (
        <CartDrawer
          portal={portal}
          cart={cart}
          onClose={() => setCartOpen(false)}
          onChanged={loadCart}
          onOpenProduct={(s) => { setCartOpen(false); setParam("produto", s); }}
        />
      )}
    </div>
  );
}

// ── Lista ─────────────────────────────────────────────────────────────
function CatalogList({ refs, sp, setParam, setParams, onOpen }: any) {
  const [data, setData] = useState<{ data: any[]; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const q = sp.get("q") ?? "";
  const pillar = sp.get("pilar") ?? "";
  const category = sp.get("categoria") ?? "";
  const fourF = sp.get("4f") ?? "";
  const sort = sp.get("ordem") ?? "name";
  const page = Number(sp.get("pagina") ?? "1") || 1;

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => {
      apiClient
        .getClientCatalog2Products({ q, pillar_id: pillar, category_id: category, four_f_id: fourF, sort, page, page_size: 12 })
        .then(setData)
        .catch(() => setData({ data: [], total: 0 }))
        .finally(() => setLoading(false));
    }, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [q, pillar, category, fourF, sort, page]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / 12)) : 1;
  const anyFilter = q || pillar || category || fourF || sort !== "name";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-neutral-400" />
          <Input className="pl-8" placeholder="Buscar produto" value={q} onChange={(e) => setParams({ q: e.target.value, pagina: null })} />
        </div>
        <select className="rounded border border-neutral-300 bg-transparent px-2 py-1.5 text-sm dark:border-neutral-700" value={pillar} onChange={(e) => setParams({ pilar: e.target.value, pagina: null })}>
          <option value="">Todos os pilares</option>
          {refs.pillars.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select className="rounded border border-neutral-300 bg-transparent px-2 py-1.5 text-sm dark:border-neutral-700" value={category} onChange={(e) => setParams({ categoria: e.target.value, pagina: null })}>
          <option value="">Todas as categorias</option>
          {refs.categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="rounded border border-neutral-300 bg-transparent px-2 py-1.5 text-sm dark:border-neutral-700" value={fourF} onChange={(e) => setParams({ "4f": e.target.value, pagina: null })}>
          <option value="">Todos os 4F</option>
          {refs.four_f.map((f: any) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
        <select className="rounded border border-neutral-300 bg-transparent px-2 py-1.5 text-sm dark:border-neutral-700" value={sort} onChange={(e) => setParam("ordem", e.target.value)}>
          <option value="name">Nome A–Z</option>
          <option value="name_desc">Nome Z–A</option>
          <option value="recent">Atualizados recentemente</option>
        </select>
        {anyFilter && (
          <Button size="sm" variant="ghost" onClick={() => setParams({ q: null, pilar: null, categoria: null, "4f": null, ordem: null, pagina: null })}>
            Limpar filtros
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-neutral-500"><Loader2 className="h-5 w-5 animate-spin" /> Carregando…</div>
      ) : !data || data.data.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 p-10 text-center text-sm text-neutral-500 dark:border-neutral-700">
          Nenhum produto disponível com esses filtros.
        </div>
      ) : (
        <>
          <ul className="grid gap-3 sm:grid-cols-2">
            {data.data.map((p: any) => (
              <li key={p.id}>
                <button
                  className="flex h-full w-full flex-col rounded-lg border border-neutral-200 p-4 text-left transition hover:border-neutral-400 dark:border-neutral-800"
                  onClick={() => onOpen(p.slug)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium">{p.name}</span>
                    {p.is_new && <Badge className="bg-emerald-100 text-emerald-700">Novo</Badge>}
                  </div>
                  {p.short_description && <p className="mt-1 line-clamp-2 text-xs text-neutral-500">{p.short_description}</p>}
                  <div className="mt-2 flex flex-wrap gap-1 text-[11px] text-neutral-500">
                    {p.pillar?.name && <span className="rounded bg-neutral-100 px-1.5 py-0.5 dark:bg-neutral-800">{p.pillar.name}</span>}
                    {p.category?.name && <span className="rounded bg-neutral-100 px-1.5 py-0.5 dark:bg-neutral-800">{p.category.name}</span>}
                    {(p.four_f ?? []).map((f: any) => <span key={f.key} className="rounded bg-neutral-100 px-1.5 py-0.5 dark:bg-neutral-800">{f.name}</span>)}
                  </div>
                  <div className="mt-auto flex items-center justify-between pt-3 text-sm">
                    <span className="text-neutral-500">
                      {p.commercial_deadline_days != null ? `${p.commercial_deadline_days} dia(s)` : "prazo a definir"}
                      {(p.has_variations || p.has_addons) && <span className="ml-1 text-xs">· opções</span>}
                    </span>
                    <span className="font-semibold">a partir de {money(p.starting_price, p.currency)}</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between text-sm">
            <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setParam("pagina", String(page - 1))}>Anterior</Button>
            <span className="text-neutral-500">Página {page} de {totalPages} · {data.total} produto(s)</span>
            <Button size="sm" variant="ghost" disabled={page >= totalPages} onClick={() => setParam("pagina", String(page + 1))}>Próxima</Button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Detalhe + configurador ────────────────────────────────────────────
function ProductDetail({ slug, preview, onBack, onCartChanged }: any) {
  const [product, setProduct] = useState<any>(null);
  const [state, setState] = useState<"loading" | "ready" | "notfound">("loading");
  const [sel, setSel] = useState<any>({ variation_option_keys: [], addon_keys: [], quantity: 1, answers: {} });
  const [config, setConfig] = useState<any>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const addLockRef = useRef(false);

  useEffect(() => {
    setState("loading");
    apiClient
      .getClientCatalog2Product(slug, preview)
      .then((p: any) => {
        setProduct(p);
        setSel({
          variation_option_keys: p.default_selection?.variation_option_keys ?? [],
          addon_keys: p.default_selection?.addon_keys ?? [],
          quantity: p.default_selection?.quantity ?? 1,
          answers: {},
        });
        setState("ready");
      })
      .catch((e: any) => setState(e?.status === 404 ? "notfound" : "notfound"));
  }, [slug, preview]);

  // Recalcula no backend a cada mudança da seleção.
  useEffect(() => {
    if (state !== "ready" || !product) return;
    const body = JSON.stringify(sel);
    let alive = true;
    apiClient
      .configureClientCatalog2(slug, JSON.parse(body), preview)
      .then((c: any) => { if (alive) setConfig(c); })
      .catch(() => {});
    return () => { alive = false; };
  }, [sel, state, product, slug, preview]);

  if (state === "loading") return <div className="flex items-center gap-2 py-16 text-sm text-neutral-500"><Loader2 className="h-5 w-5 animate-spin" /> Carregando…</div>;
  if (state === "notfound") return (
    <div className="space-y-3">
      <Button size="sm" variant="ghost" onClick={onBack}><ArrowLeft className="h-4 w-4" /> Voltar ao catálogo</Button>
      <p className="text-sm text-neutral-500">Produto não encontrado ou indisponível.</p>
    </div>
  );

  const p = product;
  const pricing = config?.pricing ?? p.pricing;
  const selErrors: string[] = config?.selection_errors ?? [];
  const canQuote = !!config?.can_generate_quote;

  function pickOption(variationKey: string, optionKey: string, optKeysOfVar: string[]) {
    setSel((s: any) => ({
      ...s,
      variation_option_keys: [...s.variation_option_keys.filter((k: string) => !optKeysOfVar.includes(k)), optionKey],
    }));
  }
  function toggleAddon(k: string, on: boolean) {
    setSel((s: any) => ({ ...s, addon_keys: on ? [...s.addon_keys, k] : s.addon_keys.filter((x: string) => x !== k) }));
  }

  async function addToCart() {
    if (addLockRef.current || busy) return;
    addLockRef.current = true;
    setBusy(true);
    setMsg(null);
    try {
      const r: any = await apiClient.addClientCatalog2CartItem(slug, sel);
      setMsg(r.already_in_cart ? "Já está na cesta." : "Adicionado à cesta.");
      await onCartChanged();
    } catch (e: any) {
      setMsg(e?.message ?? "Não foi possível adicionar.");
    } finally {
      setBusy(false);
      setTimeout(() => (addLockRef.current = false), 600);
    }
  }

  async function generateQuote() {
    if (busy) return;
    setBusy(true);
    setMsg(null);
    try {
      const q: any = await apiClient.createClientCatalog2Quote(slug, sel);
      setMsg(`Pré-cotação ${q.status} gerada — ${money(q.commercial_price, q.currency)} · ${q.commercial_deadline_days ?? "?"} dia(s). Válida até ${new Date(q.valid_until).toLocaleDateString("pt-BR")}.`);
    } catch (e: any) {
      setMsg(e?.message ?? "Não foi possível gerar a cotação.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Button size="sm" variant="ghost" onClick={onBack}><ArrowLeft className="h-4 w-4" /> Voltar ao catálogo</Button>

      <header className="space-y-1">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">{p.name}</h2>
        <div className="flex flex-wrap gap-1 text-[11px] text-neutral-500">
          {p.pillar?.name && <span className="rounded bg-neutral-100 px-1.5 py-0.5 dark:bg-neutral-800">{p.pillar.name}</span>}
          {p.category?.name && <span className="rounded bg-neutral-100 px-1.5 py-0.5 dark:bg-neutral-800">{p.category.name}</span>}
          {(p.four_f ?? []).map((f: any) => <span key={f.key} className="rounded bg-neutral-100 px-1.5 py-0.5 dark:bg-neutral-800">{f.name}</span>)}
        </div>
      </header>

      {p.is_preview && (
        <p className="rounded bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-950/30">
          {p.preview_notice}
          {p.pendencies?.length > 0 && <> Pendências: {p.pendencies.join(", ")}.</>}
        </p>
      )}

      <div className="grid gap-5 md:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {p.description && <DescriptionBlock text={p.description} />}

          {p.variations.map((va: any) => {
            const optKeys = va.options.map((o: any) => o.key);
            const chosen = sel.variation_option_keys.find((k: string) => optKeys.includes(k)) ?? "";
            return (
              <fieldset key={va.key} className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
                <legend className="px-1 text-sm font-medium">
                  {va.name} {va.is_required && <span className="text-red-500">*</span>}
                </legend>
                {va.notes && <p className="mb-1 text-xs text-neutral-500">{va.notes}</p>}
                <div className="flex flex-wrap gap-2">
                  {va.options.map((o: any) => (
                    <button
                      key={o.key}
                      className={`rounded border px-3 py-1.5 text-sm ${chosen === o.key ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900" : "border-neutral-300 dark:border-neutral-700"}`}
                      onClick={() => pickOption(va.key, o.key, optKeys)}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </fieldset>
            );
          })}

          {p.addons.length > 0 && (
            <fieldset className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
              <legend className="px-1 text-sm font-medium">Adicionais (opcionais)</legend>
              <div className="space-y-1.5">
                {p.addons.map((a: any) => (
                  <label key={a.key} className="flex items-start gap-2 text-sm">
                    <input type="checkbox" className="mt-0.5" checked={sel.addon_keys.includes(a.key)} onChange={(e) => toggleAddon(a.key, e.target.checked)} />
                    <span>
                      <span className="font-medium">{a.name}</span>
                      {a.description && <span className="block text-xs text-neutral-500">{a.description}</span>}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {p.required_info.length > 0 && (
            <fieldset className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
              <legend className="px-1 text-sm font-medium">Informações necessárias</legend>
              <div className="space-y-2">
                {p.required_info.map((label: string, i: number) => (
                  <label key={i} className="block text-sm">
                    <span className="mb-0.5 block text-xs text-neutral-600 dark:text-neutral-300">{label}</span>
                    <Input
                      value={sel.answers[label] ?? ""}
                      onChange={(e) => setSel((s: any) => ({ ...s, answers: { ...s.answers, [label]: e.target.value } }))}
                    />
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          <label className="flex items-center gap-2 text-sm">
            Quantidade
            <Input
              type="number"
              min={1}
              className="w-24"
              value={sel.quantity}
              onChange={(e) => setSel((s: any) => ({ ...s, quantity: Math.max(1, Number(e.target.value) || 1) }))}
            />
          </label>
        </div>

        {/* Painel de preço/prazo — recalculado no backend */}
        <aside className="h-fit space-y-2 rounded-lg border border-neutral-200 p-4 text-sm dark:border-neutral-800">
          <div className="flex items-center justify-between">
            <span className="text-neutral-500">Prazo comercial</span>
            <span className="font-medium">
              {pricing?.commercial_deadline_pending || pricing?.commercial_deadline_days == null
                ? "a definir"
                : `${pricing.commercial_deadline_days} dia(s)`}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-neutral-500">Preço comercial</span>
            <span className="text-lg font-semibold">{money(pricing?.commercial_price, pricing?.currency)}</span>
          </div>
          {config?.deliverables?.length > 0 && (
            <div className="pt-1">
              <div className="text-xs font-medium text-neutral-500">Entregáveis</div>
              <ul className="list-inside list-disc text-xs text-neutral-600 dark:text-neutral-300">
                {config.deliverables.map((d: string, i: number) => <li key={i}>{d}</li>)}
              </ul>
            </div>
          )}
          {(pricing?.notices ?? []).map((n: string, i: number) => (
            <p key={i} className="text-xs text-amber-600"><AlertTriangle className="mr-1 inline h-3 w-3" />{n}</p>
          ))}
          {selErrors.map((er, i) => <p key={i} className="text-xs text-red-600">{er}</p>)}

          {!p.can_configure && !p.is_preview && (
            <p className="text-xs text-neutral-500">Seu perfil pode visualizar, mas não configurar este produto.</p>
          )}

          {p.can_configure && (
            <div className="space-y-2 pt-2">
              <Button size="sm" className="w-full" disabled={busy || selErrors.length > 0} onClick={addToCart}>
                <ShoppingCart className="h-4 w-4" /> Adicionar à cesta
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                disabled={busy || !canQuote}
                onClick={generateQuote}
                title={canQuote ? "" : (config?.quote_blockers ?? []).join("; ")}
              >
                Gerar pré-cotação
              </Button>
              {!canQuote && (config?.quote_blockers ?? []).length > 0 && (
                <p className="text-[11px] text-neutral-500">Sem cotação válida: {(config.quote_blockers ?? []).join("; ")}.</p>
              )}
            </div>
          )}
          {msg && <p className="pt-1 text-xs text-blue-600">{msg}</p>}
        </aside>
      </div>
    </div>
  );
}

function DescriptionBlock({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const long = text.length > 260;
  return (
    <div className="rounded-lg border border-neutral-200 p-3 text-sm text-neutral-600 dark:border-neutral-800 dark:text-neutral-300">
      <p className={open || !long ? "" : "line-clamp-3"}>{text}</p>
      {long && (
        <button className="mt-1 text-xs font-medium text-blue-600" onClick={() => setOpen((o) => !o)}>
          {open ? "Ver menos" : "Ver mais"}
        </button>
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
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div className="flex h-full w-full max-w-md flex-col bg-white p-4 shadow-xl dark:bg-neutral-900" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold">Cesta do catálogo{cart.count > 0 ? ` (${cart.count})` : ""}</h3>
          <button onClick={onClose}><X className="h-5 w-5" /></button>
        </div>

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
                  qtd {it.quantity} · {it.pricing ? money(it.pricing.commercial_price, it.pricing.currency) : "recalcular"}
                  {!it.current && <span className="ml-1 text-amber-600">(nova versão publicada — revise)</span>}
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-3 space-y-2 border-t border-neutral-200 pt-3 dark:border-neutral-800">
          {cart.items.length > 0 && (
            <Button
              size="sm"
              className="w-full"
              disabled={cart.needs_revalidation}
              onClick={() => navigate(`/${portal}/catalog2/checkout`)}
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
      </div>

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
    </div>
  );
}
