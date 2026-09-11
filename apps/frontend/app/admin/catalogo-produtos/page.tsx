"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Store,
  Loader2,
  Lock,
  Package,
  Search,
  ArrowUpDown,
  ChevronDown,
  Layers,
  ListChecks,
  X,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  STANDARD_SHELL_PANEL_CLASS,
  StandardPageBanner,
} from "@/components/standard-page-shell";
import { PinToTrayButton } from "@/components/pin-to-tray-button";
import { EmbeddedSlideScreen } from "@/components/embedded-slide-screen";

// Catálogo de Produtos — visão de APRESENTAÇÃO e conferência comercial dos
// produtos catalog2 (reunião 2026-09, consolidação "catálogo2 como cadastro
// definitivo"; e reparo seguinte, que recuperou a apresentação visual de
// catálogo — grade de cards, busca, categorias — perdida quando esta rota
// tinha sido trocada por uma tabela administrativa simplificada. Referência
// de layout: product-catalog-view.tsx, adaptado para dados catalog2 —
// nunca importado diretamente aqui, porque aquele componente é
// old-catalog/basket e compartilhado com telas de clientes que este reparo
// não deve arriscar).
//
// Só Admin Master (o backend reaplica em /api/admin/catalog2/* — mesma
// origem de dados do Cadastro de Produtos, /admin/produtos). Nunca mostra
// os 162 produtos antigos. Sem cesta/contratação (isso já existe em
// /company|agency/catalog2) e sem qualquer ação de escrita — o Cadastro de
// Produtos é quem edita; aqui é só leitura/conferência.
//
// Campos ausentes mostram mensagem honesta (nunca inventam preço/prazo/
// tarefa/imagem) — os textos de preço/prazo vêm do próprio backend
// (/readiness), que já não finge preço "R$ 0,00" quando não há tarefa.

const STATUS_LABEL: Record<string, string> = {
  em_preparacao: "Em preparação",
  disponivel: "Disponível",
  temporariamente_inativo: "Suspenso",
  arquivado: "Arquivado",
};
const STATUS_TONE: Record<string, string> = {
  em_preparacao: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  disponivel: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  temporariamente_inativo: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  arquivado: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
};
const PENDENCY_LABEL: Record<string, string> = {
  conteudo: "conteúdo", classificacao: "classificação", variacoes: "variações",
  adicionais: "adicionais", tarefas: "tarefas", etapas: "etapas", preco: "preço",
  prazo: "prazo", portfolio: "portfólio", revisao_rose: "revisão", publicacao: "publicação",
};

interface ReadinessProduct {
  id: string;
  name: string;
  is_test_local: boolean;
  status: string;
  published: boolean;
  task_count: number;
  step_count: number;
  items: Record<string, { level: string; note: string }>;
  blockers: string[];
  pendings: string[];
}
interface ListProduct {
  id: string;
  category: { id: string; name: string } | null;
  summary: string | null;
  published_version_number: number | null;
  is_new?: boolean;
  updated_at?: string;
}
type Merged = ReadinessProduct & { list?: ListProduct };

const SORTS = {
  name: { label: "Nome A–Z", fn: (a: Merged, b: Merged) => a.name.localeCompare(b.name) },
  name_desc: { label: "Nome Z–A", fn: (a: Merged, b: Merged) => b.name.localeCompare(a.name) },
  updated: {
    label: "Alterado recentemente",
    fn: (a: Merged, b: Merged) => new Date(b.list?.updated_at ?? 0).getTime() - new Date(a.list?.updated_at ?? 0).getTime(),
  },
} as const;

export default function AdminCatalogoProdutosPage() {
  const [state, setState] = useState<"loading" | "ready" | "forbidden" | "error">("loading");
  const [readinessProducts, setReadinessProducts] = useState<ReadinessProduct[]>([]);
  const [listById, setListById] = useState<Record<string, ListProduct>>({});
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("Todos");
  const [sort, setSort] = useState<keyof typeof SORTS>("name");
  const [openProductId, setOpenProductId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const [readiness, list, cats] = await Promise.all([
        apiClient.getCatalog2Readiness(),
        apiClient.getCatalog2Products({ page_size: 100 }),
        apiClient.getCatalog2Categories(),
      ]);
      setReadinessProducts(readiness.products ?? []);
      const byId: Record<string, ListProduct> = {};
      for (const p of list.data ?? []) byId[p.id] = p;
      setListById(byId);
      setCategories(cats.data ?? []);
      setState("ready");
    } catch (err: any) {
      if (err?.status === 404) setState("forbidden");
      else setState("error");
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const merged: Merged[] = useMemo(
    () => readinessProducts.map((p) => ({ ...p, list: listById[p.id] })),
    [readinessProducts, listById],
  );
  const real = useMemo(() => merged.filter((p) => !p.is_test_local), [merged]);
  const fixture = useMemo(() => merged.find((p) => p.is_test_local) ?? null, [merged]);

  const categoryTabs = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of real) {
      const name = p.list?.category?.name ?? "Sem categoria";
      counts[name] = (counts[name] ?? 0) + 1;
    }
    return [
      { id: "Todos", label: "Todos", count: real.length },
      ...Object.entries(counts).map(([name, count]) => ({ id: name, label: name, count })),
    ];
  }, [real]);

  const filtered = useMemo(() => {
    let rows = real;
    if (category !== "Todos") rows = rows.filter((p) => (p.list?.category?.name ?? "Sem categoria") === category);
    const q = search.trim().toLowerCase();
    if (q) rows = rows.filter((p) => p.name.toLowerCase().includes(q));
    return [...rows].sort(SORTS[sort].fn);
  }, [real, category, search, sort]);

  const openedProduct = merged.find((p) => p.id === openProductId) ?? null;

  if (state === "loading") {
    return (
      <div className={STANDARD_SHELL_PANEL_CLASS}>
        <Centered><Loader2 className="h-5 w-5 animate-spin" /> Carregando…</Centered>
      </div>
    );
  }
  if (state === "forbidden") {
    return (
      <div className={STANDARD_SHELL_PANEL_CLASS}>
        <Centered><Lock className="h-5 w-5" /> Esta área é exclusiva do Admin Master neste momento.</Centered>
      </div>
    );
  }
  if (state === "error") {
    return (
      <div className={STANDARD_SHELL_PANEL_CLASS}>
        <Centered>Não foi possível carregar.</Centered>
      </div>
    );
  }

  return (
    <div className={STANDARD_SHELL_PANEL_CLASS}>
      <div className="relative flex h-full min-h-[70vh] flex-col">
        <div className="shrink-0 -mb-[11px]">
          <StandardPageBanner
            icon={Store}
            title="Catálogo de Produtos"
            description="Visão comercial dos produtos novos (catalog2) — como serão apresentados, e o que falta para cada um."
            actions={
              <PinToTrayButton id="page-catalogo-produtos" label="Catálogo de Produtos" icon={Store} path="/admin/catalogo-produtos" />
            }
          />
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="space-y-3">
            <p className="rounded-lg bg-muted px-3 py-2 text-sm text-foreground">
              O catálogo antigo, com 162 produtos, não aparece mais aqui — ele segue no banco só para não quebrar
              projetos antigos já ligados a ele. Para editar um produto, use o Cadastro de Produtos.
            </p>

            {/* ── Toolbar: busca + ordenar (visual recuperado de product-catalog-view) ── */}
            <div className="space-y-3 rounded-xl border border-slate-100 bg-white/80 p-3 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/60">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Buscar produtos…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-9 border-slate-200 bg-white pl-9 text-sm dark:border-slate-700 dark:bg-slate-800"
                  />
                  {search && (
                    <button type="button" onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 shrink-0 gap-1.5 text-xs">
                      <ArrowUpDown className="h-3.5 w-3.5" />
                      {SORTS[sort].label}
                      <ChevronDown className="h-3 w-3 opacity-60" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {Object.entries(SORTS).map(([k, v]) => (
                      <DropdownMenuItem key={k} onClick={() => setSort(k as keyof typeof SORTS)}>{v.label}</DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <span className="hidden shrink-0 text-xs text-slate-400 sm:inline">
                  {filtered.length} {filtered.length === 1 ? "produto" : "produtos"}
                </span>
              </div>

              {/* Category pills — categorias REAIS do catalog2. */}
              <div className="flex flex-wrap gap-2">
                {categoryTabs.map(({ id, label, count }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setCategory(id)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                      category === id
                        ? "text-white shadow-sm"
                        : "border border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                    style={category === id ? { background: "linear-gradient(135deg, #1a2a6f 0%, #c81a7f 100%)" } : undefined}
                  >
                    <Layers className="h-3 w-3" />
                    {label}
                    <span className={`rounded-full px-1 py-0.5 text-[10px] leading-none ${category === id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-400"}`}>
                      {count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* ── Grade de cards ── */}
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-12 text-center">
                <Package className="mb-3 h-10 w-10 text-slate-300" />
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Nenhum produto encontrado</p>
                <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                  {search || category !== "Todos" ? "Tente ajustar a busca ou a categoria." : "Nenhum produto catalog2 cadastrado ainda."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filtered.map((p) => <ProductCard key={p.id} product={p} onOpen={() => setOpenProductId(p.id)} />)}
              </div>
            )}

            {fixture && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Package className="h-3.5 w-3.5" />
                1 produto de demonstração ("[TESTE LOCAL] …") existe para testes e fica fora desta grade — nunca é um
                produto real, e nunca aparece no catálogo do cliente.
              </p>
            )}
          </div>
        </div>

        {/* Detalhe do produto — dentro do container padrão, só leitura. */}
        <EmbeddedSlideScreen
          open={!!openedProduct}
          onClose={() => setOpenProductId(null)}
          title={openedProduct?.name ?? "Produto"}
          pin={openedProduct ? {
            id: `catalog2-catalogo-${openedProduct.id}`,
            label: openedProduct.name,
            icon: Store,
            path: "/admin/catalogo-produtos",
          } : undefined}
        >
          {openedProduct && <ProductDetail product={openedProduct} />}
        </EmbeddedSlideScreen>
      </div>
    </div>
  );
}

function ProductCard({ product: p, onOpen }: { product: Merged; onOpen: () => void }) {
  const precoNote = p.items.preco?.note ?? "Preço ainda não configurado.";
  const prazoNote = p.items.prazo?.note ?? "Prazo ainda não definido.";
  const categoryName = p.list?.category?.name ?? "Sem categoria";
  return (
    <Card className="group flex flex-col overflow-hidden border border-slate-200/70 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl dark:border-slate-700/60 dark:bg-slate-900">
      {/* Banner — sem imagem cadastrada (catalog2 ainda não tem esse campo);
          ícone + gradiente honesto, nunca uma foto inventada. */}
      <div className="relative flex h-32 shrink-0 items-center justify-center overflow-hidden bg-linear-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-slate-800 dark:via-slate-800 dark:to-slate-900">
        <div className="rounded-2xl bg-white/80 p-3 shadow-sm transition-transform duration-300 group-hover:scale-105 dark:bg-white/10">
          <Package className="h-8 w-8 text-blue-500" />
        </div>
        <div className="absolute right-2.5 top-2.5 flex items-center gap-1">
          {p.list?.is_new && <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">Novo</Badge>}
          <Badge className={STATUS_TONE[p.status] ?? "bg-muted text-muted-foreground"}>{STATUS_LABEL[p.status] ?? p.status}</Badge>
        </div>
      </div>

      <CardContent className="flex flex-1 flex-col gap-2.5 p-4">
        <div>
          <h3 className="line-clamp-2 text-base font-bold leading-snug text-slate-900 transition-colors group-hover:text-blue-600 dark:text-slate-100">
            {p.name}
          </h3>
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-400">
            {p.list?.summary || "Imagem e descrição ainda não cadastradas — produto em preparação."}
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <Layers className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate font-medium">{categoryName}</span>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <ListChecks className="h-3.5 w-3.5" />
          {p.task_count > 0 ? `${p.task_count} tarefa(s)` : "Tarefas ainda não cadastradas"}
          {p.step_count > 0 ? ` · ${p.step_count} etapa(s)` : ""}
        </div>

        <div className="mt-auto space-y-1 border-t border-slate-100 pt-2.5 dark:border-slate-800">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{precoNote}</p>
          <p className="text-[11px] text-slate-400">{prazoNote}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2 w-full border-blue-200 bg-transparent text-xs text-blue-600 hover:bg-blue-50 hover:text-blue-700"
            onClick={onOpen}
          >
            Ver detalhes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Detalhe comercial — só leitura; nenhum controle de edição aparece aqui de
// propósito (edição é função do Cadastro de Produtos).
function ProductDetail({ product: p }: { product: Merged }) {
  const precoNote = p.items.preco?.note ?? "Preço ainda não configurado.";
  const prazoNote = p.items.prazo?.note ?? "Prazo ainda não definido.";
  const categoryName = p.list?.category?.name ?? "Sem categoria";
  const pendencias = [...p.blockers, ...p.pendings];
  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-5">
      <div className="mx-auto max-w-2xl space-y-5">
        <div className="flex items-center gap-2">
          <Badge className={STATUS_TONE[p.status] ?? "bg-muted text-muted-foreground"}>{STATUS_LABEL[p.status] ?? p.status}</Badge>
          <Badge variant="outline">{categoryName}</Badge>
          {p.list?.published_version_number && <Badge variant="outline">v{p.list.published_version_number} publicada</Badge>}
        </div>

        <div className="flex h-40 items-center justify-center rounded-xl bg-linear-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-slate-800 dark:via-slate-800 dark:to-slate-900">
          <Package className="h-12 w-12 text-blue-400" />
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground">Descrição</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {p.list?.summary || "Descrição ainda não escrita — produto em preparação."}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <DetailStat label="Preço" value={precoNote} />
          <DetailStat label="Prazo" value={prazoNote} />
          <DetailStat label="Tarefas" value={p.task_count > 0 ? String(p.task_count) : "Ainda não cadastradas"} />
          <DetailStat label="Etapas" value={p.step_count > 0 ? String(p.step_count) : "Ainda não cadastradas"} />
        </div>

        <div>
          <h2 className="text-sm font-semibold text-foreground">Variações e adicionais</h2>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <span className="rounded-full border bg-background px-2.5 py-1 text-xs text-muted-foreground">
              {p.items.variacoes?.note ?? "Sem informação de variações."}
            </span>
            <span className="rounded-full border bg-background px-2.5 py-1 text-xs text-muted-foreground">
              {p.items.adicionais?.note ?? "Sem informação de adicionais."}
            </span>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-foreground">O que falta para publicar</h2>
          {pendencias.length === 0 ? (
            <p className="mt-1.5 text-xs text-emerald-700 dark:text-emerald-300">Nenhuma pendência — pronto para revisão final.</p>
          ) : (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {p.blockers.map((b) => (
                <Badge key={b} className="bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200">{PENDENCY_LABEL[b] ?? b}</Badge>
              ))}
              {p.pendings.map((b) => (
                <Badge key={b} className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">{PENDENCY_LABEL[b] ?? b}</Badge>
              ))}
            </div>
          )}
        </div>

        <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
          Esta é uma visualização comercial, só leitura. Para editar tarefas, etapas, preço ou publicar, use o
          Cadastro de Produtos.
        </p>
      </div>
    </div>
  );
}
function DetailStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-background p-2.5">
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-xs text-foreground">{value}</p>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex h-full items-center justify-center gap-2 py-12 text-sm text-muted-foreground">{children}</div>;
}
