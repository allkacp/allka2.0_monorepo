"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowUpDown,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  Clock as ClockIcon,
  Eye,
  Layers,
  ListChecks,
  Loader2,
  Lock,
  MoreVertical,
  Package,
  Pencil,
  Plus,
  Search,
  Filter,
  EyeOff,
  Settings2,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { EmbeddedSlideScreen } from "@/components/embedded-slide-screen";
import { PinToTrayButton } from "@/components/pin-to-tray-button";
import { ProductViewModeToggle } from "@/components/product-view-mode-toggle";
import { ItemsPerPageSelect } from "@/components/items-per-page-select";
import { Catalog2Thumbnail } from "@/components/catalog2-thumbnail";
import { ProvisionalBadge } from "@/components/provisional-badge";
import {
  STANDARD_SHELL_PANEL_CLASS,
  STANDARD_SHELL_TABLE_CARD_CLASS,
  StandardPageBanner,
} from "@/components/standard-page-shell";
import {
  usePersistedViewMode,
  viewModeGridClass,
} from "@/lib/use-persisted-view-mode";
import {
  CATALOG2_STATUS_LABEL,
  CATALOG2_STATUS_TONE,
} from "@/lib/catalog2-status";
import {
  provisionalPrice,
  provisionalTaskCount,
} from "@/lib/catalog2-provisional";
import {
  catalog2CategoryTone,
  catalog2EditorialImage,
} from "@/lib/catalog2-editorial";
import { ProductEditor } from "@/app/admin/produtos/novo-catalogo/product-editor";
import { Catalog2ProductDetail } from "@/components/catalog2-product-detail";
import { Catalog2PricingMemoryPopover } from "@/components/catalog2-pricing-memory-popover";
import { useIsAdminMaster } from "@/hooks/use-is-admin-master";
import { StandardModalDialog } from "@/components/standard-modal-dialog";

// Cadastro de Produtos — administração exclusiva dos produtos catalog2
// (reunião 2026-09, consolidação "catálogo2 como cadastro definitivo"; e
// reparo 2026-09 seguinte, que recuperou o layout administrativo aprovado
// — abas de filtro rápido, banner padrão e tabela — perdido quando esta
// rota foi trocada pela tela então chamada "Preparação de Produtos").
// Só Admin Master (o backend reaplica em /api/admin/catalog2/*). Não mostra
// os 162 produtos antigos — esses continuam no banco (projetos antigos que
// os referenciam não quebram), só saíram das telas de cadastro/catálogo/
// contratação. O construtor (ProductEditor) abre aqui mesmo, dentro do
// container padrão (EmbeddedSlideScreen), nunca como área separada.
//
// Anteriormente esta era a rota /admin/produtos/novo-catalogo ("Preparação
// de Produtos"); aquela rota agora só redireciona pra cá (ver
// novo-catalogo/page.tsx), preservando o produto selecionado via ?produto=.

// Rótulo/cor de status — módulo compartilhado com /admin/catalogo-produtos
// (reunião 2026-09-14, Item 2): ver apps/frontend/lib/catalog2-status.ts.
const STATUS_LABEL: Record<string, string> = CATALOG2_STATUS_LABEL;
const STATUS_TONE: Record<string, string> = CATALOG2_STATUS_TONE;

// Estados de preparo e pendências da importação dos 36 (bloco 4/6).
const REVIEW_STATE_LABEL: Record<string, string> = {
  importado: "Importado",
  content_review_pending: "Revisar conteúdo",
  classification_decision_pending: "Decidir classificação",
  price_pending: "Definir preço",
  deadline_pending: "Definir prazo comercial",
  portfolio_pending: "Falta portfólio",
  task_effort_fields_pending: "Definir especialidade/horas das tarefas",
  rose_review_pending: "Revisão da Rose pendente",
  ready_for_final_review: "Pronto p/ revisão final",
  ready_for_publication: "Pronto p/ publicação",
};
const PENDENCY_LABEL: Record<string, string> = {
  content_review_pending: "conteúdo",
  classification_decision_pending: "classificação",
  price_pending: "preço",
  deadline_pending: "prazo comercial",
  portfolio_pending: "portfólio",
  task_effort_fields_pending: "especialidade/horas das tarefas",
  rose_review_pending: "revisão Rose",
};

const PRODUCT_COLUMNS = [
  { key: "number", label: "ID", width: 64, min: 40, align: "center" },
  { key: "image", label: "Img", width: 58, min: 42, align: "left" },
  { key: "product", label: "Produto", width: 310, min: 90, align: "left" },
  { key: "category", label: "Categoria", width: 145, min: 70, align: "left" },
  { key: "tasks", label: "Tarefas", width: 150, min: 70, align: "left" },
  { key: "price", label: "Preço", width: 145, min: 70, align: "right" },
  {
    key: "pendencies",
    label: "Pendências",
    width: 130,
    min: 70,
    align: "left",
  },
  { key: "status", label: "Status", width: 125, min: 65, align: "left" },
  { key: "actions", label: "Ações", width: 110, min: 64, align: "center" },
] as const;
type ProductColumnKey = (typeof PRODUCT_COLUMNS)[number]["key"];
// Colunas que ordenam ao clicar no cabeçalho (o valor é o "sort" enviado ao
// backend; a variante decrescente é o mesmo valor + "_desc"). Img, Tarefas,
// Pendências e Ações não ordenam: não há coluna no banco para isso.
const SORTABLE_COLUMNS: Partial<Record<ProductColumnKey, string>> = {
  number: "sequence_number",
  product: "name",
  category: "category",
  price: "price",
  status: "status",
};
const PRODUCT_LIST_PREFERENCES_KEY = "allka:admin-products-list-preferences";

function defaultProductColumnWidths() {
  return Object.fromEntries(
    PRODUCT_COLUMNS.map((column) => [column.key, column.width]),
  ) as Record<ProductColumnKey, number>;
}

export default function AdminProdutosPage() {
  const isAdminMaster = useIsAdminMaster();
  const [searchParams, setSearchParams] = useSearchParams();
  const [state, setState] = useState<
    "loading" | "ready" | "forbidden" | "error"
  >("loading");
  const [overview, setOverview] = useState<any>(null);
  const [refs, setRefs] = useState<{ pillars: any[]; categories: any[] }>({
    pillars: [],
    categories: [],
  });
  // ?produto=<id> abre o construtor direto (deep link preservado do redirect
  // de /admin/produtos/novo-catalogo e de qualquer link externo).
  const [openProductId, setOpenProductId] = useState<string | null>(() =>
    searchParams.get("produto"),
  );
  // ?ver=<id> abre o DETALHE completo (só leitura) — ação separada do
  // construtor (?produto=<id>). Ícone de olho → detalhe; ícone de lápis →
  // construtor (reparo 2026-09, "não abra o construtor quando a ação
  // escolhida for apenas visualizar").
  const [viewProductId, setViewProductId] = useState<string | null>(() =>
    searchParams.get("ver"),
  );

  const openProduct = useCallback(
    (id: string | null) => {
      setOpenProductId(id);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (id) next.set("produto", id);
          else next.delete("produto");
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const viewProduct = useCallback(
    (id: string | null) => {
      setViewProductId(id);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (id) next.set("ver", id);
          else next.delete("ver");
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  // filtros/listagem (preservados ao voltar do editor)
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [pillarId, setPillarId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [origin, setOrigin] = useState("");
  const [roseReviewed, setRoseReviewed] = useState("");
  const [reviewState, setReviewState] = useState("");
  const [pendency, setPendency] = useState("");
  // Aba rápida "Com pendências" — estado PRÓPRIO, independente de
  // `showCategoryFilters` (bug real: antes as duas abas reusavam o mesmo
  // booleano, então "Com pendências" só reabria "Categorias" e nunca
  // filtrava nada — ver teste "bug real: Com pendências").
  const [onlyPendencies, setOnlyPendencies] = useState(false);
  const [sort, setSort] = useState("name");
  const [importSummary, setImportSummary] = useState<any>(null);
  const [readiness, setReadiness] = useState<any>(null);
  const [showCategoryFilters, setShowCategoryFilters] = useState(false);
  // Lista/Grade — preferência isolada desta tela, persistida em localStorage
  // (mesma convenção do layout anterior; restaurada 2026-09).
  const [gridMode, setGridMode] = usePersistedViewMode(
    "admin-produtos",
    "list",
  );
  const [columnConfigOpen, setColumnConfigOpen] = useState(false);
  const [visibleProductColumns, setVisibleProductColumns] = useState<
    Set<ProductColumnKey>
  >(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem(PRODUCT_LIST_PREFERENCES_KEY) || "{}",
      );
      const valid = Array.isArray(saved.visible)
        ? saved.visible.filter((key: string) =>
            PRODUCT_COLUMNS.some((column) => column.key === key),
          )
        : [];
      return new Set(
        (valid.length
          ? valid
          : PRODUCT_COLUMNS.map((column) => column.key)) as ProductColumnKey[],
      );
    } catch {
      return new Set(PRODUCT_COLUMNS.map((column) => column.key));
    }
  });
  const [productColumnWidths, setProductColumnWidths] = useState<
    Record<ProductColumnKey, number>
  >(() => {
    const defaults = defaultProductColumnWidths();
    try {
      const saved = JSON.parse(
        localStorage.getItem(PRODUCT_LIST_PREFERENCES_KEY) || "{}",
      );
      for (const column of PRODUCT_COLUMNS) {
        const width = Number(saved.widths?.[column.key]);
        if (Number.isFinite(width))
          defaults[column.key] = Math.max(column.min, width);
      }
    } catch {
      // Mantém as larguras padrão quando a preferência estiver inválida.
    }
    return defaults;
  });
  const productResizeRef = useRef<{
    key: ProductColumnKey;
    startX: number;
    startWidth: number;
  } | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pageJumpValue, setPageJumpValue] = useState("");
  const [list, setList] = useState<{
    data: any[];
    total: number;
    page_size: number;
  } | null>(null);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);
  // Item 5 (reunião 2026-09-14, "Inativação programada de produtos") — a
  // prévia (projetos/propostas afetados, datas, consequências) é carregada
  // ANTES de abrir o diálogo, pra reaproveitar o ConfirmationDialog comum
  // (mesmo componente do resto da tela) já com os dados prontos.
  const [inactivationDialog, setInactivationDialog] = useState<{
    product: any;
    preview: any;
  } | null>(null);

  useEffect(() => {
    localStorage.setItem(
      PRODUCT_LIST_PREFERENCES_KEY,
      JSON.stringify({
        visible: [...visibleProductColumns],
        widths: productColumnWidths,
      }),
    );
  }, [visibleProductColumns, productColumnWidths]);

  const beginProductColumnResize = useCallback(
    (event: React.PointerEvent, key: ProductColumnKey) => {
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      productResizeRef.current = {
        key,
        startX: event.clientX,
        startWidth: productColumnWidths[key],
      };
    },
    [productColumnWidths],
  );

  const resizeProductColumn = useCallback((event: React.PointerEvent) => {
    const active = productResizeRef.current;
    if (!active) return;
    const column = PRODUCT_COLUMNS.find((item) => item.key === active.key)!;
    setProductColumnWidths((current) => ({
      ...current,
      [active.key]: Math.max(
        column.min,
        Math.round(active.startWidth + event.clientX - active.startX),
      ),
    }));
  }, []);

  const finishProductColumnResize = useCallback(() => {
    productResizeRef.current = null;
  }, []);

  const bootstrap = useCallback(async () => {
    try {
      const [ov, pil, cat, imp, rdy] = await Promise.all([
        apiClient.getCatalog2Overview(),
        apiClient.getCatalog2Pillars(),
        apiClient.getCatalog2Categories(),
        apiClient.getCatalog2ImportSummary().catch(() => null),
        apiClient.getCatalog2Readiness().catch(() => null),
      ]);
      setOverview(ov);
      setRefs({ pillars: pil.data, categories: cat.data });
      setImportSummary(imp);
      setReadiness(rdy);
      setState("ready");
    } catch (err: any) {
      if (err?.status === 404) setState("forbidden");
      else setState("error");
    }
  }, []);
  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const loadList = useCallback(async () => {
    setListLoading(true);
    try {
      const r = await apiClient.getCatalog2Products({
        q,
        status,
        pillar_id: pillarId,
        category_id: categoryId,
        origin,
        rose_reviewed: roseReviewed,
        review_state: reviewState,
        pendency,
        has_pendencies: onlyPendencies ? "true" : undefined,
        sort,
        page,
        page_size: pageSize,
      });
      setList(r);
      setListError(null);
    } catch {
      // Bug real 2026-09-11: uma falha aqui (ex.: erro 500 no backend) virava
      // silenciosamente "Nenhum produto encontrado" — indistinguível de um
      // filtro que realmente não bate com nada. O contador ("36") vem de
      // /overview, uma chamada separada que não falha junto, então a tela
      // dizia "36" com a lista vazia sem NENHUM aviso de erro. Agora o erro
      // fica visível e distinto do estado "nenhum resultado".
      setList({ data: [], total: 0, page_size: pageSize });
      setListError(
        "Não foi possível carregar a lista de produtos agora. Tente novamente.",
      );
    } finally {
      setListLoading(false);
    }
  }, [
    q,
    status,
    pillarId,
    categoryId,
    origin,
    roseReviewed,
    reviewState,
    pendency,
    onlyPendencies,
    sort,
    page,
    pageSize,
  ]);

  useEffect(() => {
    if (state !== "ready" || openProductId || viewProductId) return;
    const t = setTimeout(loadList, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [state, openProductId, viewProductId, loadList, q]);

  useEffect(
    () => setPage(1),
    [
      q,
      status,
      pillarId,
      categoryId,
      origin,
      roseReviewed,
      reviewState,
      pendency,
      onlyPendencies,
      sort,
    ],
  );

  // Bug real 2026-09-11: "contador diz 36, tabela/grade ficam vazias" —
  // acontece quando `page` fica acima do total de páginas válido (ex.: total
  // caiu de 162 para 36 produtos, ou um filtro reduziu o resultado) e a API
  // responde com `total` correto mas `data: []` (a página pedida não existe
  // mais). O contador ("36") vem de /overview, uma chamada INDEPENDENTE da
  // listagem — por isso ele continua certo mesmo com a tabela vazia. Aqui a
  // gente detecta isso a partir da resposta real da listagem e corrige
  // sozinho para a última página válida, sem precisar de F5.
  useEffect(() => {
    if (!list) return;
    const validTotalPages = Math.max(1, Math.ceil(list.total / list.page_size));
    if (list.data.length === 0 && list.total > 0 && page > validTotalPages) {
      setPage(validTotalPages);
    }
  }, [list, page]);

  async function rowAction(fn: () => Promise<any>, ok: string) {
    setMsg(null);
    try {
      await fn();
      setMsg(ok);
      await loadList();
      await bootstrap();
    } catch (e: any) {
      setMsg(e?.message ?? "Falha.");
    }
  }

  // Item 5: busca a prévia (projetos/propostas afetados) ANTES de abrir o
  // diálogo de confirmação — sem isso o admin confirmaria "às cegas".
  async function openInactivationDialog(p: any) {
    setMsg(null);
    try {
      const preview = await apiClient.previewCatalog2ProductInactivation(p.id);
      setInactivationDialog({ product: p, preview });
    } catch (e: any) {
      setMsg(e?.message ?? "Não foi possível carregar a prévia de inativação.");
    }
  }

  async function createProduct() {
    setMsg(null);
    try {
      const name = window.prompt("Nome interno do produto:");
      if (!name) return;
      const p = await apiClient.createCatalog2Product({ internal_name: name });
      await bootstrap();
      openProduct(p.id);
    } catch (e: any) {
      setMsg(e?.message ?? "Falha ao criar.");
    }
  }

  if (state === "loading") {
    return (
      <div className={STANDARD_SHELL_PANEL_CLASS}>
        <Centered>
          <Loader2 className="h-5 w-5 animate-spin" /> Carregando…
        </Centered>
      </div>
    );
  }
  if (state === "forbidden") {
    return (
      <div className={STANDARD_SHELL_PANEL_CLASS}>
        <Centered>
          <Lock className="h-5 w-5" /> Esta área é exclusiva do Admin Master
          neste momento.
        </Centered>
      </div>
    );
  }
  if (state === "error") {
    return (
      <div className={STANDARD_SHELL_PANEL_CLASS}>
        <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
          <div className="rounded-full bg-red-50 p-4 dark:bg-red-950/40">
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-base font-semibold text-foreground">
              Erro ao carregar produtos
            </h2>
            <p className="max-w-sm text-sm text-muted-foreground">
              Não foi possível carregar o catálogo agora.
            </p>
          </div>
          <Button
            onClick={() => {
              setState("loading");
              void bootstrap();
            }}
          >
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  const totalPages = list
    ? Math.max(1, Math.ceil(list.total / list.page_size))
    : 1;
  const commitPageJump = () => {
    const target = Number(pageJumpValue);
    if (Number.isInteger(target) && target >= 1 && target <= totalPages) {
      setPage(target);
    }
    setPageJumpValue("");
  };
  const c = overview.counts;
  // /readiness traz task_count/price_amount reais (mesmos usados no painel de
  // prontidão) — indexado por id pra casar com a página atual da listagem.
  const readinessById: Record<string, any> = {};
  for (const rp of readiness?.products ?? []) readinessById[rp.id] = rp;
  const advancedFilters = [
    pillarId,
    categoryId,
    origin,
    roseReviewed,
    reviewState,
    pendency,
  ].filter(Boolean).length;

  // Abas de filtro rápido — mesma ideia do layout anterior aprovado
  // (filtram a tabela direto, sem precisar abrir "Mais filtros"), adaptadas
  // aos estados reais do catalog2 (em vez de "Ativos"/"Com tarefas" do
  // catálogo antigo, que não existem aqui).
  const quickTabs = [
    {
      key: "all",
      label: "Todos os produtos",
      icon: Package,
      count: c.final_imported_products ?? c.imported_products ?? 0,
      active: status === "" && !onlyPendencies && !showCategoryFilters,
      onClick: () => {
        setStatus("");
        setOnlyPendencies(false);
        setShowCategoryFilters(false);
      },
    },
    {
      // Reunião 2026-09-14 (Item 2): renomeado de "Publicados" para "Ativos"
      // — status "disponivel" é o único status contratável, distinto de
      // "tem versão publicada" (pré-lançamento/pausado/esgotado também
      // exigem versão publicada, mas não são "Ativo"). Contagem vem de
      // products_by_status (grupo real por status), não mais de
      // products_published (que conta qualquer versão publicada).
      key: "active",
      label: "Ativos",
      icon: CheckCircle2,
      count: overview.products_by_status?.disponivel ?? 0,
      active: status === "disponivel" && !onlyPendencies,
      onClick: () => {
        setStatus("disponivel");
        setOnlyPendencies(false);
        setShowCategoryFilters(false);
      },
    },
    {
      key: "preparing",
      label: "Em preparação",
      icon: ClockIcon,
      count: c.products_in_preparation ?? 0,
      active: status === "em_preparacao" && !onlyPendencies,
      onClick: () => {
        setStatus("em_preparacao");
        setOnlyPendencies(false);
        setShowCategoryFilters(false);
      },
    },
    {
      // Bug real corrigido (reparo 2026-09): esta aba reusava o mesmo estado
      // de "Categorias" e nunca filtrava nada — cada aba agora tem estado
      // próprio e independente.
      key: "pendencies",
      label: "Com pendências",
      icon: ListChecks,
      count: c.products_with_pendencies ?? 0,
      active: onlyPendencies,
      onClick: () => {
        setOnlyPendencies(true);
        setStatus("");
        setShowCategoryFilters(false);
      },
    },
    {
      key: "categories",
      label: "Categorias",
      icon: Layers,
      count: refs.categories.length,
      active: showCategoryFilters,
      onClick: () => {
        setShowCategoryFilters((v) => !v);
        setOnlyPendencies(false);
      },
    },
  ] as const;

  return (
    <div
      className={`${STANDARD_SHELL_PANEL_CLASS} !border-violet-200/80 !bg-violet-100/70 dark:!border-violet-900/60 dark:!bg-violet-950/40`}
    >
      <div className="relative flex h-full min-h-[70vh] flex-col">
        <div className="shrink-0 -mb-[11px]">
          <StandardPageBanner
            icon={Package}
            title="Cadastro de Produtos"
            description="Cadastre, edite e organize os produtos e serviços da plataforma (catalog2)"
            contentClassName="lg:h-[65px]"
            actions={
              <>
                <TooltipProvider delayDuration={400}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        data-tour-id="catalog2-admin-create"
                        onClick={() =>
                          setConfirm({
                            title: "Criar produto",
                            message:
                              "Um novo produto (em preparação) com uma versão rascunho será criado.",
                            onConfirm: () => createProduct(),
                          })
                        }
                        className="flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-white/70 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/20"
                      >
                        <Plus className="h-3.5 w-3.5 shrink-0" />
                        Novo Produto
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" sideOffset={6}>
                      Criar novo produto catalog2
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <a
                  href="/admin/catalog2?preview=1"
                  className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg border border-white/70 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/20"
                >
                  Pré-visualizar como cliente
                </a>
                <PinToTrayButton
                  id="page-produtos"
                  label="Cadastro de Produtos"
                  icon={Package}
                  path="/admin/produtos"
                />
              </>
            }
          />
        </div>

        <div
          className="flex-1 min-h-0 overflow-y-auto"
          data-tour-id="catalog2-admin-header"
        >
          <div className="space-y-[5px]">
            {/* Uma única faixa: os números são os próprios filtros, sem repetir
                os mesmos estados em um segundo painel. */}
            <div className="mb-1 hidden overflow-hidden rounded-xl border border-slate-200/70 bg-white shadow-sm dark:border-slate-700/60 dark:bg-slate-900">
              <div className="flex flex-wrap items-center">
                {quickTabs.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={tab.onClick}
                    className={`relative flex h-10 items-center gap-1.5 border-r border-slate-100 px-2.5 text-xs font-semibold transition-colors dark:border-slate-800 sm:px-3 ${
                      tab.active
                        ? tab.key === "active"
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
                          : tab.key === "preparing"
                            ? "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300"
                            : tab.key === "pendencies"
                              ? "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300"
                              : tab.key === "categories"
                                ? "bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-300"
                                : "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300"
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-200"
                    }`}
                  >
                    <tab.icon className="h-3.5 w-3.5" />
                    {tab.label}
                    <span
                      className={`ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold ${tab.active ? "bg-white/80 text-current shadow-sm dark:bg-slate-900/60" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"}`}
                    >
                      {tab.count}
                    </span>
                    <span
                      className={`absolute inset-x-0 bottom-0 h-0.5 origin-left transition-transform ${tab.key === "active" ? "bg-emerald-500" : tab.key === "preparing" ? "bg-amber-500" : tab.key === "pendencies" ? "bg-rose-500" : tab.key === "categories" ? "bg-violet-500" : "bg-blue-500"} ${tab.active ? "scale-x-100" : "scale-x-0"}`}
                    />
                  </button>
                ))}
                <div className="ml-auto flex h-10 items-center gap-2 px-2 text-right sm:px-3">
                  <TooltipProvider delayDuration={300}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-600 dark:hover:bg-slate-800">
                          <ClockIcon className="h-3.5 w-3.5" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent className="text-xs">
                        Última atualização:{" "}
                        {overview.import?.last_applied_at
                          ? new Date(
                              overview.import.last_applied_at,
                            ).toLocaleString("pt-BR", {
                              dateStyle: "short",
                              timeStyle: "short",
                            })
                          : "Agora"}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <button
                    type="button"
                    aria-label="Atualizar produtos"
                    onClick={() => {
                      void bootstrap();
                      void loadList();
                    }}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800 dark:border-slate-700 dark:hover:bg-slate-800"
                  >
                    <ArrowUpDown className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>

            <div className={`mt-[5px] ${STANDARD_SHELL_TABLE_CARD_CLASS}`}>
              {/* Row 1 — busca + filtros + ordenar */}
              <div className="flex flex-wrap items-center gap-2 border-b border-slate-200/70 bg-slate-50/60 px-3 py-2 dark:border-slate-700/60 dark:bg-slate-900/30 xl:flex-nowrap">
                <div className="relative min-w-[150px] flex-1 xl:max-w-[260px]">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Buscar por nome ou slug"
                    aria-label="Buscar produtos"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    className="h-9 w-full rounded-lg border-slate-200 bg-white pl-9 text-sm dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
                <div className="flex shrink-0 items-center overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
                  {quickTabs.map((tab) => (
                    <TooltipProvider key={tab.key} delayDuration={300}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={tab.onClick}
                            aria-label={tab.label}
                            className={`relative flex h-9 items-center gap-1 border-r border-slate-100 px-2 text-[11px] font-semibold transition-colors last:border-r-0 dark:border-slate-700 sm:px-2.5 ${
                              tab.active
                                ? tab.key === "active"
                                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
                                  : tab.key === "preparing"
                                    ? "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300"
                                    : tab.key === "pendencies"
                                      ? "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300"
                                      : tab.key === "categories"
                                        ? "bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-300"
                                        : "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300"
                                : "text-slate-500 hover:bg-slate-50 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
                            }`}
                          >
                            <tab.icon className="h-3.5 w-3.5" />
                            <span
                              className={`flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold ${tab.active ? "bg-white/80 text-current shadow-sm dark:bg-slate-900/60" : "bg-slate-100 text-slate-500 dark:bg-slate-700"}`}
                            >
                              {tab.count}
                            </span>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="text-xs">
                          {tab.label}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ))}
                </div>
                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={() => setShowCategoryFilters((v) => !v)}
                        variant="outline"
                        size="icon"
                        aria-label="Filtros avançados"
                        className={`relative h-9 w-9 rounded-lg transition-all hover:border-transparent hover:bg-gradient-to-r hover:from-[#101b4c] hover:via-[#4b1c83] hover:to-[#bf087f] hover:text-white ${advancedFilters > 0 ? "border-[#9a1683] bg-[#f9edfa] text-[#8a1477] dark:border-[#9a1683] dark:bg-[#48143f] dark:text-[#f5a9e6]" : "border-slate-200 text-[#8a1477] dark:border-slate-700 dark:text-[#e694d1]"}`}
                      >
                        <Filter className="h-4 w-4" />
                        {advancedFilters > 0 && (
                          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white">
                            {advancedFilters}
                          </span>
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="text-xs">
                      Filtros avançados
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <DropdownMenu>
                  <TooltipProvider delayDuration={300}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            size="icon"
                            aria-label="Ordenar produtos"
                            className="h-9 w-9 rounded-lg border-slate-200 text-[#8a1477] transition-all hover:border-transparent hover:bg-gradient-to-r hover:from-[#101b4c] hover:via-[#4b1c83] hover:to-[#bf087f] hover:text-white dark:border-slate-700 dark:text-[#e694d1]"
                          >
                            <ArrowUpDown className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                      </TooltipTrigger>
                      <TooltipContent className="text-xs">
                        Ordenar produtos
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={() => setSort("name")}>
                      Nome A–Z
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSort("name_desc")}>
                      Nome Z–A
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSort("updated")}>
                      Alterado recentemente
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSort("created")}>
                      Criado recentemente
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setColumnConfigOpen(true)}
                        aria-label="Configurar colunas"
                        className="relative h-9 w-9 rounded-lg border-slate-200 text-[#8a1477] transition-all hover:border-transparent hover:bg-gradient-to-r hover:from-[#101b4c] hover:via-[#4b1c83] hover:to-[#bf087f] hover:text-white dark:border-slate-700 dark:text-[#e694d1]"
                      >
                        <Settings2 className="h-4 w-4" />
                        {PRODUCT_COLUMNS.length - visibleProductColumns.size >
                          0 && (
                          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-500 px-1 text-[9px] font-bold text-white">
                            {PRODUCT_COLUMNS.length -
                              visibleProductColumns.size}
                          </span>
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="text-xs">
                      Configurar colunas
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <span className="hidden shrink-0 whitespace-nowrap text-xs text-slate-400 lg:inline">
                  {list
                    ? `${list.total} ${list.total === 1 ? "item" : "itens"}`
                    : ""}
                </span>
                <ProductViewModeToggle
                  value={gridMode}
                  onChange={setGridMode}
                />
                <div className="ml-auto hidden items-center gap-2 border-l border-slate-200 pl-2 xl:flex dark:border-slate-700">
                  <ItemsPerPageSelect
                    value={pageSize.toString()}
                    onValueChange={(value) => {
                      setPageSize(Number(value));
                      setPage(1);
                    }}
                  />
                  {totalPages > 1 && (
                    <PaginationControls
                      page={page}
                      totalPages={totalPages}
                      onChange={setPage}
                    />
                  )}
                  <div className="flex items-center gap-1 border-l border-slate-200 pl-2 dark:border-slate-700">
                    <input
                      type="number"
                      min={1}
                      max={totalPages}
                      value={pageJumpValue}
                      onChange={(event) => setPageJumpValue(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") commitPageJump();
                      }}
                      placeholder="Pág."
                      aria-label="Ir para a página"
                      className="h-9 w-14 rounded-lg border border-slate-200 bg-white text-center text-xs text-slate-600 outline-none focus-visible:ring-2 focus-visible:ring-[#8a1477]/40 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    />
                    <button
                      type="button"
                      onClick={commitPageJump}
                      disabled={!pageJumpValue}
                      className="h-9 rounded-lg border border-slate-200 px-2 text-xs font-semibold text-[#8a1477] transition-colors hover:border-transparent hover:bg-gradient-to-r hover:from-[#101b4c] hover:via-[#4b1c83] hover:to-[#bf087f] hover:text-white disabled:pointer-events-none disabled:opacity-40 dark:border-slate-700"
                    >
                      Ir
                    </button>
                  </div>
                </div>
              </div>

              {showCategoryFilters && (
                <div className="flex flex-wrap gap-2 border-b border-slate-200/70 p-3 dark:border-slate-700/60">
                  <label className="sr-only" htmlFor="f-status">
                    Status
                  </label>
                  <select
                    id="f-status"
                    className={SELECT_CLS}
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="">Todos os status</option>
                    {Object.entries(STATUS_LABEL).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                  <label className="sr-only" htmlFor="f-pillar">
                    Pilar
                  </label>
                  <select
                    id="f-pillar"
                    className={SELECT_CLS}
                    value={pillarId}
                    onChange={(e) => setPillarId(e.target.value)}
                  >
                    <option value="">Todos os pilares</option>
                    {refs.pillars.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <label className="sr-only" htmlFor="f-cat">
                    Categoria
                  </label>
                  <select
                    id="f-cat"
                    className={SELECT_CLS}
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                  >
                    <option value="">Todas as categorias</option>
                    {refs.categories.map((c2) => (
                      <option key={c2.id} value={c2.id}>
                        {c2.name}
                      </option>
                    ))}
                  </select>
                  <label className="sr-only" htmlFor="f-origin">
                    Origem
                  </label>
                  <select
                    id="f-origin"
                    className={SELECT_CLS}
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                  >
                    <option value="">Toda origem</option>
                    <option value="existente">Só existentes</option>
                    <option value="novo">Só novos</option>
                    <option value="reativado">Só reativados</option>
                  </select>
                  <label className="sr-only" htmlFor="f-rose">
                    Revisão da Rose
                  </label>
                  <select
                    id="f-rose"
                    className={SELECT_CLS}
                    value={roseReviewed}
                    onChange={(e) => setRoseReviewed(e.target.value)}
                  >
                    <option value="">Revisão da Rose (todas)</option>
                    <option value="true">Revisado pela Rose</option>
                    <option value="false">Sem revisão da Rose</option>
                  </select>
                  <label className="sr-only" htmlFor="f-review">
                    Estado de preparo
                  </label>
                  <select
                    id="f-review"
                    className={SELECT_CLS}
                    value={reviewState}
                    onChange={(e) => setReviewState(e.target.value)}
                  >
                    <option value="">Estado de preparo (todos)</option>
                    {Object.entries(REVIEW_STATE_LABEL).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                  <label className="sr-only" htmlFor="f-pend">
                    Tipo de pendência
                  </label>
                  <select
                    id="f-pend"
                    className={SELECT_CLS}
                    value={pendency}
                    onChange={(e) => setPendency(e.target.value)}
                  >
                    <option value="">Tipo de pendência (todas)</option>
                    {Object.entries(PENDENCY_LABEL).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Row — paginação (espelhada no rodapé) */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 bg-white px-3 py-2 xl:hidden dark:border-slate-700/60 dark:bg-slate-900/30">
                <ItemsPerPageSelect
                  value={pageSize.toString()}
                  onValueChange={(value) => {
                    setPageSize(Number(value));
                    setPage(1);
                  }}
                  variant="bottom"
                />
                {totalPages > 1 && (
                  <PaginationControls
                    page={page}
                    totalPages={totalPages}
                    onChange={setPage}
                  />
                )}
              </div>

              {msg && (
                <p className="px-4 py-2 text-sm text-blue-600 dark:text-blue-400">
                  {msg}
                </p>
              )}

              {listLoading ? (
                <Centered>
                  <Loader2 className="h-5 w-5 animate-spin" /> Carregando…
                </Centered>
              ) : listError ? (
                <div className="flex flex-col items-center justify-center px-4 py-20">
                  <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-red-50 shadow-sm dark:bg-red-950/30">
                    <AlertTriangle className="h-9 w-9 text-red-500" />
                  </div>
                  <h3 className="mb-1.5 text-base font-semibold">
                    Erro ao carregar a lista de produtos
                  </h3>
                  <p className="mb-6 max-w-md text-center text-sm leading-relaxed text-muted-foreground">
                    {listError}
                  </p>
                  <Button onClick={() => void loadList()}>
                    Tentar novamente
                  </Button>
                </div>
              ) : !list || list.data.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-4 py-20">
                  <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-linear-to-br from-blue-100 to-purple-100 shadow-sm">
                    <Package className="h-9 w-9 text-blue-500" />
                  </div>
                  <h3 className="mb-1.5 text-base font-semibold">
                    Nenhum produto encontrado
                  </h3>
                  <p className="mb-6 max-w-md text-center text-sm leading-relaxed text-muted-foreground">
                    {overview.is_empty
                      ? overview.empty_message
                      : "Tente ajustar os filtros ou a busca para encontrar o que procura."}
                  </p>
                </div>
              ) : gridMode === "list" ? (
                <div className="allka-table-scroll-body overflow-auto">
                  <table
                    className="tabela-cartao w-full table-fixed text-xs"
                    style={{
                      minWidth: PRODUCT_COLUMNS.filter((column) =>
                        visibleProductColumns.has(column.key),
                      ).reduce(
                        (total, column) =>
                          total + productColumnWidths[column.key],
                        0,
                      ),
                    }}
                  >
                    <colgroup>
                      {PRODUCT_COLUMNS.map((column) => (
                        <col
                          key={column.key}
                          style={{
                            width: productColumnWidths[column.key],
                            visibility: visibleProductColumns.has(column.key)
                              ? "visible"
                              : "collapse",
                          }}
                        />
                      ))}
                    </colgroup>
                    <thead>
                      <tr className="border-b border-slate-200/60 bg-slate-50/60 dark:border-slate-700/60 dark:bg-slate-900/30">
                        {PRODUCT_COLUMNS.map((column) => (
                          <th
                            key={column.key}
                            className="relative px-2 py-3.5 text-[11px] font-bold uppercase tracking-[0.04em] text-[#365A91] dark:text-slate-400"
                            style={{
                              textAlign: column.align,
                              visibility: visibleProductColumns.has(column.key)
                                ? "visible"
                                : "collapse",
                            }}
                          >
                            {SORTABLE_COLUMNS[column.key] ? (
                              (() => {
                                const base = SORTABLE_COLUMNS[column.key]!;
                                const active = sort === base || sort === `${base}_desc`;
                                const desc = sort === `${base}_desc`;
                                return (
                                  <button
                                    type="button"
                                    onClick={() => setSort(active && !desc ? `${base}_desc` : base)}
                                    title={`Ordenar por ${column.label}`}
                                    className={`group flex w-full items-center gap-1 truncate uppercase transition-colors hover:text-violet-700 dark:hover:text-violet-300 ${column.align === "right" ? "justify-end" : column.align === "center" ? "justify-center" : "justify-start"} ${active ? "text-violet-700 dark:text-violet-300" : ""}`}
                                  >
                                    <span className="truncate">{column.label}</span>
                                    {active ? (
                                      desc ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronUp className="h-3.5 w-3.5 shrink-0" />
                                    ) : (
                                      <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-slate-300 group-hover:text-slate-400" />
                                    )}
                                  </button>
                                );
                              })()
                            ) : (
                              <span className="block truncate">
                                {column.label}
                              </span>
                            )}
                            <div
                              role="separator"
                              aria-orientation="vertical"
                              aria-label={`Redimensionar coluna ${column.label}`}
                              onPointerDown={(event) =>
                                beginProductColumnResize(event, column.key)
                              }
                              onPointerMove={resizeProductColumn}
                              onPointerUp={finishProductColumnResize}
                              onPointerCancel={finishProductColumnResize}
                              className="absolute -right-0.5 top-1/2 z-20 h-7 w-1.5 -translate-y-1/2 cursor-col-resize touch-none rounded-full bg-slate-200/90 opacity-70 transition-all hover:w-2 hover:bg-fuchsia-400 hover:opacity-100"
                            />
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {list.data.map((p) => {
                        const pend: string[] = p.pendencies ?? [];
                        const rp = readinessById[p.id];
                        const realTaskCount: number | undefined =
                          rp?.task_count;
                        const realPrice: number | null | undefined =
                          rp?.price_amount;
                        const simulatedPrice: number | null | undefined =
                          rp?.pricing_simulation?.price_amount;
                        // Fonte ÚNICA de provisório: a camada do backend
                        // (Catalog2ProvisionalPreview, via p.provisional_preview). O
                        // hash local (lib/catalog2-provisional.ts) só entra se o
                        // produto não tiver nenhum preview provisório gravado.
                        const pv = p.provisional_preview;
                        const taskProv = pv
                          ? {
                              value: pv.included_items_count,
                              label: "Estrutura provisória — completar",
                            }
                          : provisionalTaskCount(p.id);
                        const priceProv =
                          pv?.price_amount != null
                            ? {
                                value: pv.price_amount,
                                label: "Preço provisório — revisar.",
                                is_provisional: true as const,
                              }
                            : provisionalPrice(p.id);
                        return (
                          <tr
                            key={p.id}
                            className="group h-12 odd:bg-slate-200/80 even:bg-slate-300/60 transition-colors hover:bg-violet-200/60 dark:odd:bg-slate-950 dark:even:bg-slate-900/70 dark:hover:bg-slate-800/70"
                          >
                            <td className="px-2 py-1 text-center">
                              <span className="text-sm font-bold text-[#31578F] dark:text-slate-300">
                                {p.sequence_number != null ? String(p.sequence_number).padStart(2, "0") : "—"}
                              </span>
                            </td>
                            <td className="px-2 py-1">
                              <Catalog2Thumbnail
                                productId={p.id}
                                imagePath={catalog2EditorialImage(
                                  p.category?.name,
                                  p.internal_name,
                                )}
                                size="sm"
                                showBadge={false}
                              />
                            </td>
                            <td className="px-2 py-1">
                              <div className="min-w-0">
                                <button
                                  className="block w-full truncate whitespace-nowrap text-left text-[13px] font-semibold leading-tight hover:underline"
                                  onClick={() => viewProduct(p.id)}
                                  title={p.internal_name}
                                >
                                  {p.internal_name}
                                </button>
                              </div>
                            </td>
                            <td className="px-2 py-1">
                              <Badge
                                className={`whitespace-nowrap border-0 shadow-none ring-1 ${catalog2CategoryTone(p.category?.name)}`}
                              >
                                {p.category?.name ?? "Sem categoria"}
                              </Badge>
                            </td>
                            <td className="px-2 py-1">
                              <div className="flex items-center gap-1 whitespace-nowrap text-[11px] text-slate-600 dark:text-slate-300">
                                {realTaskCount != null && realTaskCount > 0 ? (
                                  <span>{realTaskCount} tarefa(s)</span>
                                ) : (
                                  <>
                                    <span className="text-slate-400">
                                      {taskProv.value} tarefa(s)
                                    </span>
                                    <ProvisionalBadge
                                      label={
                                        taskProv.label +
                                        " Pendência real de tarefas continua registrada."
                                      }
                                    />
                                  </>
                                )}
                                {rp?.functional_for_test && (
                                  <ProvisionalBadge label="Especialidade e tempo provisórios para teste — funcional para teste, pendente de revisão. Nunca usado para aprovar preço comercial ou publicação." />
                                )}
                              </div>
                            </td>
                            <td className="px-2 py-1 text-right">
                              {realPrice != null ? (
                                <div className="flex items-center justify-end gap-1">
                                  <span className="text-[13px] font-bold text-emerald-600 dark:text-emerald-400">
                                    R$ {realPrice.toFixed(2)}
                                  </span>
                                  <Catalog2PricingMemoryPopover
                                    productId={p.id}
                                    isAdminMaster={isAdminMaster}
                                  />
                                </div>
                              ) : simulatedPrice != null ? (
                                <div className="flex items-center justify-end gap-1">
                                  <span className="text-[13px] font-semibold text-violet-600 dark:text-violet-300">
                                    R$ {simulatedPrice.toFixed(2)}
                                  </span>
                                  <ProvisionalBadge label="Preço final simulado para teste. Não autoriza publicação, cotação ou contratação." />
                                  <Catalog2PricingMemoryPopover
                                    productId={p.id}
                                    isAdminMaster={isAdminMaster}
                                  />
                                </div>
                              ) : (
                                <div className="flex items-center justify-end gap-1">
                                  <span className="text-[13px] font-semibold text-slate-400">
                                    R$ {priceProv.value.toFixed(2)}
                                  </span>
                                  <ProvisionalBadge
                                    label={
                                      priceProv.label +
                                      " Não é comercialmente válido — nunca usado em cotação, checkout ou publicação."
                                    }
                                  />
                                  <Catalog2PricingMemoryPopover
                                    productId={p.id}
                                    isAdminMaster={isAdminMaster}
                                    provisionalPriceAmount={priceProv.value}
                                  />
                                </div>
                              )}
                            </td>
                            <td className="px-2 py-1">
                              {pend.length === 0 &&
                              !!p.rose_reviewed !== false &&
                              !p.human_edited ? (
                                <span className="whitespace-nowrap text-[11px] text-muted-foreground">
                                  Sem pendências
                                </span>
                              ) : (
                                <Badge className="whitespace-nowrap bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                                  {pend.length +
                                    (p.rose_reviewed ? 0 : 1) +
                                    (p.human_edited ? 1 : 0)}{" "}
                                  pendência(s)
                                </Badge>
                              )}
                            </td>
                            <td className="px-2 py-1">
                              <div className="flex items-center gap-1.5 whitespace-nowrap">
                                <Badge
                                  className={
                                    STATUS_TONE[p.status] ??
                                    "bg-muted text-muted-foreground"
                                  }
                                >
                                  {STATUS_LABEL[p.status] ?? p.status}
                                </Badge>
                              </div>
                            </td>
                            <td className="px-2 py-1">
                              <div className="flex items-center justify-center gap-1 whitespace-nowrap">
                                <TooltipProvider delayDuration={400}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        onClick={() => viewProduct(p.id)}
                                        aria-label="Ver detalhe completo"
                                        className="flex h-[26px] w-[26px] items-center justify-center rounded-[8px] border border-[#e8edf5] bg-white text-slate-500 shadow-[0_4px_10px_rgba(15,23,42,0.06)] transition-all hover:-translate-y-px hover:border-transparent hover:bg-slate-800 hover:text-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                                      >
                                        <Eye className="h-3.5 w-3.5" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent className="text-xs font-medium">
                                      Ver detalhe completo
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                <TooltipProvider delayDuration={400}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        onClick={() => openProduct(p.id)}
                                        aria-label={
                                          p.has_draft
                                            ? "Continuar configuração"
                                            : "Abrir/editar produto"
                                        }
                                        className="flex h-[26px] w-[26px] items-center justify-center rounded-[8px] border border-[#e8edf5] bg-white text-[#6E2C96] shadow-[0_4px_10px_rgba(15,23,42,0.06)] transition-all hover:-translate-y-px hover:border-transparent hover:bg-gradient-to-br hover:from-[#2558FF] hover:via-[#6E2C96] hover:to-[#D92293] hover:text-white hover:shadow-[0_8px_18px_rgba(15,23,42,0.18)] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500"
                                      >
                                        <Pencil className="h-3.5 w-3.5" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent className="text-xs font-medium">
                                      {p.has_draft
                                        ? "Continuar configuração"
                                        : "Abrir/editar produto"}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                <ProductRowActionsMenu
                                  p={p}
                                  rowAction={rowAction}
                                  setConfirm={setConfirm}
                                  onScheduleInactivation={
                                    openInactivationDialog
                                  }
                                />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className={`p-4 ${viewModeGridClass(gridMode)}`}>
                  {list.data.map((p) => {
                    const pend: string[] = p.pendencies ?? [];
                    const isCompact = gridMode === 4 || gridMode === 5;
                    const rp = readinessById[p.id];
                    const realPrice: number | null | undefined =
                      rp?.price_amount;
                    const simulatedPrice: number | null | undefined =
                      rp?.pricing_simulation?.price_amount;
                    const previewPrice =
                      p.provisional_preview?.price_amount ??
                      provisionalPrice(p.id).value;
                    const categoryName = p.category?.name ?? "Sem categoria";
                    return (
                      <Card
                        key={p.id}
                        className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.08)] transition-all duration-200 hover:-translate-y-1 hover:border-violet-200 hover:shadow-[0_18px_38px_rgba(76,29,149,0.17)] dark:border-slate-700/60 dark:bg-slate-900"
                      >
                        <button
                          type="button"
                          onClick={() => viewProduct(p.id)}
                          className={`relative flex w-full shrink-0 items-center justify-center overflow-hidden ${isCompact ? "h-24" : "h-36"}`}
                        >
                          <img
                            src={catalog2EditorialImage(
                              categoryName,
                              p.internal_name,
                            )}
                            alt=""
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.035]"
                          />
                          <div className="absolute inset-0 bg-linear-to-t from-slate-950/20 via-transparent to-transparent" />
                          <Badge
                            className={`absolute left-3 top-3 border-0 px-2.5 py-1 text-[10px] font-bold shadow-sm ${STATUS_TONE[p.status] ?? "bg-white/90 text-slate-700"}`}
                          >
                            {p.is_new
                              ? "Novo"
                              : (STATUS_LABEL[p.status] ?? p.status)}
                          </Badge>
                        </button>
                        <div
                          className={`flex flex-1 flex-col ${isCompact ? "gap-1.5 p-3" : "gap-2 p-3.5"}`}
                        >
                          <div className="flex min-w-0 items-center justify-between gap-2">
                            <Badge
                              className={`max-w-[60%] truncate border-0 px-2 py-0.5 text-[10px] font-semibold shadow-none ring-1 ${catalog2CategoryTone(categoryName)}`}
                            >
                              {categoryName}
                            </Badge>
                            <span
                              className={`shrink-0 font-bold tracking-tight text-emerald-600 ${isCompact ? "text-base" : "text-lg"}`}
                            >
                              R${" "}
                              {(
                                realPrice ??
                                simulatedPrice ??
                                previewPrice
                              ).toFixed(2)}
                            </span>
                          </div>
                          <TooltipProvider delayDuration={120}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  className="truncate text-left text-[13px] font-bold leading-tight text-slate-900 hover:text-violet-700 hover:underline dark:text-white"
                                  onClick={() => viewProduct(p.id)}
                                >
                                  {p.internal_name}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent
                                side="top"
                                className="max-w-xs text-xs font-medium"
                              >
                                {p.internal_name}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          {!isCompact && (
                            <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                              {pend.length
                                ? `${pend.length} pendência(s) para revisar`
                                : "Produto pronto para continuar a configuração"}
                            </p>
                          )}
                          <div className="mt-auto flex items-center gap-2 pt-1.5">
                            <TooltipProvider delayDuration={400}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 w-9 rounded-lg border-slate-200 bg-slate-50 px-0 text-slate-700 shadow-sm hover:bg-slate-100"
                                    onClick={() => viewProduct(p.id)}
                                    aria-label="Ver detalhe completo"
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent className="text-xs font-medium">
                                  Ver detalhe completo
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider delayDuration={400}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    className="h-8 flex-1 rounded-lg bg-linear-to-r from-[#4a2cff] via-[#7b2cdb] to-[#d92293] text-xs font-semibold shadow-[0_6px_16px_rgba(123,44,219,0.25)] hover:from-[#3b22d9] hover:to-[#bd177e]"
                                    onClick={() => openProduct(p.id)}
                                    aria-label={
                                      p.has_draft
                                        ? "Continuar configuração"
                                        : "Abrir/editar produto"
                                    }
                                  >
                                    <Pencil className="h-3.5 w-3.5" /> Abrir
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent className="text-xs font-medium">
                                  {p.has_draft
                                    ? "Continuar configuração"
                                    : "Abrir/editar produto"}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <ProductRowActionsMenu
                              p={p}
                              rowAction={rowAction}
                              setConfirm={setConfirm}
                              onScheduleInactivation={openInactivationDialog}
                            />
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}

              {list && list.data.length > 0 && (
                <div className="flex items-center justify-between gap-3 border-t border-slate-200/70 px-4 py-2.5 dark:border-slate-700/60">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {list.total} produto{list.total === 1 ? "" : "s"}
                  </span>
                  {totalPages > 1 && (
                    <PaginationControls
                      page={page}
                      totalPages={totalPages}
                      onChange={setPage}
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <StandardModalDialog
          open={columnConfigOpen}
          onClose={() => setColumnConfigOpen(false)}
          title="Configurar colunas"
          subtitle="Escolha as colunas exibidas e preserve o seu layout"
        >
          <div className="flex-1 overflow-y-auto p-2">
            {PRODUCT_COLUMNS.map((column) => (
              <label
                key={column.key}
                className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors ${visibleProductColumns.has(column.key) ? "bg-blue-50 dark:bg-blue-900/20" : "hover:bg-slate-50 dark:hover:bg-slate-800"}`}
              >
                <input
                  type="checkbox"
                  checked={visibleProductColumns.has(column.key)}
                  onChange={() =>
                    setVisibleProductColumns((current) => {
                      const next = new Set(current);
                      next.has(column.key)
                        ? next.delete(column.key)
                        : next.add(column.key);
                      return next;
                    })
                  }
                  className="h-4 w-4 accent-blue-600"
                />
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {column.label}
                </span>
                {!visibleProductColumns.has(column.key) && (
                  <EyeOff className="ml-auto h-3.5 w-3.5 text-slate-400" />
                )}
              </label>
            ))}
            <div className="mt-2 flex items-center justify-between border-t border-slate-100 px-3 pt-3 dark:border-slate-700">
              <button
                type="button"
                onClick={() => {
                  setVisibleProductColumns(
                    new Set(PRODUCT_COLUMNS.map((column) => column.key)),
                  );
                  setProductColumnWidths(defaultProductColumnWidths());
                }}
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-800"
              >
                Restaurar padrão
              </button>
              <span className="text-[10px] text-slate-400">
                {visibleProductColumns.size} de {PRODUCT_COLUMNS.length}
              </span>
            </div>
          </div>
        </StandardModalDialog>

        {confirm && (
          <ConfirmationDialog
            open
            onClose={() => setConfirm(null)}
            title={confirm.title}
            message={confirm.message}
            confirmText="Confirmar"
            destructive={false}
            onConfirm={() => {
              confirm.onConfirm();
              setConfirm(null);
            }}
          />
        )}

        {inactivationDialog && (
          <ConfirmationDialog
            open
            onClose={() => setInactivationDialog(null)}
            title="Programar inativação"
            message="A partir da confirmação, os responsáveis afetados são notificados imediatamente. Propostas já vigentes continuam válidas até a data efetiva; nenhuma cotação nova pode mais ser gerada a partir de agora."
            targetName={inactivationDialog.product.internal_name}
            targetDetail={`Aviso: hoje · Inativação programada para: ${new Date(inactivationDialog.preview.effective_date).toLocaleDateString("pt-BR")}`}
            consequences={[
              `${inactivationDialog.preview.affected_projects.length} projeto(s)/pedido(s) em andamento afetado(s).`,
              `${inactivationDialog.preview.affected_quotes.length} proposta(s) (pré-cotação) vigente(s) afetada(s).`,
              ...inactivationDialog.preview.consequences,
            ]}
            confirmText="Confirmar agendamento"
            destructive={false}
            attention
            onConfirm={async () => {
              await apiClient.scheduleCatalog2ProductInactivation(
                inactivationDialog.product.id,
              );
              setMsg("Inativação programada — responsáveis notificados.");
              await loadList();
              await bootstrap();
            }}
          />
        )}

        {/* O construtor abre AQUI DENTRO — container padrão, cabeçalho padrão,
            fechar/fixar na bandeja — nunca como área separada ("Novo
            Catálogo"/"Preparação de Produtos"). Reunião 2026-09. */}
        <EmbeddedSlideScreen
          open={!!openProductId}
          onClose={() => {
            openProduct(null);
            void loadList();
            void bootstrap();
          }}
          title="Editor de produto"
          pin={
            openProductId
              ? {
                  id: `catalog2-produto-${openProductId}`,
                  label: "Editor de produto",
                  icon: Package,
                  path: `/admin/produtos?produto=${openProductId}`,
                }
              : undefined
          }
        >
          {openProductId && (
            <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/80 px-4 py-5 sm:px-8 dark:bg-slate-950/40">
              {(() => {
                const rp = readinessById[openProductId];
                const hasProvisional =
                  rp && (!(rp.task_count > 0) || rp.price_amount == null);
                return hasProvisional ? (
                  <div className="mx-auto mb-5 flex max-w-6xl items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-200">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                      Este produto tem campos provisórios (preço, prazo e/ou
                      tarefas de demonstração) — veja o resumo completo no
                      Catálogo de Produtos administrativo antes de publicar.
                    </span>
                  </div>
                ) : null;
              })()}
              <ProductEditor
                productId={openProductId}
                onBack={() => {
                  openProduct(null);
                  void loadList();
                  void bootstrap();
                }}
              />
            </div>
          )}
        </EmbeddedSlideScreen>

        {/* Detalhe comercial completo (só leitura) — ação do ícone de olho,
            SEPARADA do construtor. Mesma convenção de container/bandeja. */}
        <EmbeddedSlideScreen
          open={!!viewProductId}
          onClose={() => viewProduct(null)}
          title="Detalhe do produto"
          pin={
            viewProductId
              ? {
                  id: `catalog2-detalhe-${viewProductId}`,
                  label: "Detalhe do produto",
                  icon: Eye,
                  path: `/admin/produtos?ver=${viewProductId}`,
                }
              : undefined
          }
        >
          {viewProductId && (
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              <Catalog2ProductDetail
                productId={viewProductId}
                onBack={() => viewProduct(null)}
                onOpenEditor={() => {
                  const id = viewProductId;
                  viewProduct(null);
                  openProduct(id);
                }}
                isAdminMaster={isAdminMaster}
              />
            </div>
          )}
        </EmbeddedSlideScreen>
      </div>
    </div>
  );
}

// Select padrão — superfície sólida, borda e texto por token (contraste alto
// nos dois temas).
const SELECT_CLS =
  "rounded-md border bg-background px-2 py-1.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

// Paginação numerada — mesmo desenho do layout anterior aprovado (setas +
// números + salto direto de página), sem o campo de "ir para" (dispensável
// no volume atual de produtos catalog2).
function PaginationControls({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
}) {
  const pages = getPageNumbers(page, totalPages);
  return (
    <div className="flex flex-shrink-0 items-center gap-1">
      <button
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page === 1}
        title="Página anterior"
        className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:pointer-events-none disabled:opacity-30 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </button>
      {pages.map((p, i) =>
        p === "..." ? (
          <span key={i} className="px-0.5 text-xs text-slate-300">
            ·
          </span>
        ) : (
          <button
            key={i}
            onClick={() => onChange(Number(p))}
            className={`flex h-9 w-9 items-center justify-center rounded-lg text-xs font-bold transition-colors ${p === page ? "text-white shadow-[0_6px_14px_rgba(110,44,150,0.25)]" : "text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"}`}
            style={
              p === page
                ? {
                    background:
                      "linear-gradient(135deg, #111A4D 0%, #6E2C96 55%, #D92293 100%)",
                  }
                : undefined
            }
          >
            {p}
          </button>
        ),
      )}
      <button
        onClick={() => onChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        title="Próxima página"
        className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:pointer-events-none disabled:opacity-30 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
function getPageNumbers(page: number, totalPages: number): (number | "...")[] {
  if (totalPages <= 7)
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  const out: (number | "...")[] = [1];
  if (page > 3) out.push("...");
  for (
    let p = Math.max(2, page - 1);
    p <= Math.min(totalPages - 1, page + 1);
    p++
  )
    out.push(p);
  if (page < totalPages - 2) out.push("...");
  out.push(totalPages);
  return out;
}

// Indicador — sem card colorido; célula neutra dentro de um painel único.
// Ações secundárias por produto — compartilhado entre Lista e Grade (só
// muda o gatilho visual ao redor). Nunca inclui "Excluir": catalog2 não tem
// exclusão — arquivar é o equivalente real, já usado aqui.
function ProductRowActionsMenu({
  p,
  rowAction,
  setConfirm,
  onScheduleInactivation,
}: {
  p: any;
  rowAction: (fn: () => Promise<any>, ok: string) => void;
  setConfirm: (
    c: { title: string; message: string; onConfirm: () => void } | null,
  ) => void;
  onScheduleInactivation: (p: any) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex h-[26px] w-[26px] items-center justify-center rounded-[8px] border border-[#e8edf5] bg-white text-slate-500 shadow-[0_4px_10px_rgba(15,23,42,0.06)] transition-all hover:-translate-y-px hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
          <MoreVertical className="h-3.5 w-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {p.published_version_number && !p.has_draft && (
          <DropdownMenuItem
            onClick={() =>
              rowAction(
                () => apiClient.newCatalog2Version(p.id),
                "Nova versão rascunho criada.",
              )
            }
          >
            Nova versão
          </DropdownMenuItem>
        )}
        {p.status === "em_preparacao" && !!p.published_version_number && (
          <DropdownMenuItem
            onClick={() =>
              rowAction(
                () =>
                  apiClient.setCatalog2ProductStatus(p.id, "pre_lancamento"),
                "Produto em pré-lançamento.",
              )
            }
          >
            Colocar em pré-lançamento
          </DropdownMenuItem>
        )}
        {(p.status === "em_preparacao" || p.status === "pre_lancamento") &&
          !!p.published_version_number && (
            <DropdownMenuItem
              onClick={() =>
                rowAction(
                  () => apiClient.setCatalog2ProductStatus(p.id, "disponivel"),
                  "Produto ativado.",
                )
              }
            >
              Ativar
            </DropdownMenuItem>
          )}
        {p.status === "disponivel" && (
          <>
            <DropdownMenuItem
              onClick={() =>
                rowAction(
                  () =>
                    apiClient.setCatalog2ProductStatus(
                      p.id,
                      "temporariamente_inativo",
                    ),
                  "Oferta pausada.",
                )
              }
            >
              Pausar
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                rowAction(
                  () =>
                    apiClient.setCatalog2ProductStatus(
                      p.id,
                      "esgotado_temporariamente",
                    ),
                  "Produto marcado como esgotado temporariamente.",
                )
              }
            >
              Marcar como esgotado
            </DropdownMenuItem>
          </>
        )}
        {(p.status === "temporariamente_inativo" ||
          p.status === "esgotado_temporariamente") && (
          <DropdownMenuItem
            onClick={() =>
              rowAction(
                () => apiClient.setCatalog2ProductStatus(p.id, "disponivel"),
                "Oferta reativada.",
              )
            }
          >
            Reativar
          </DropdownMenuItem>
        )}
        {p.status !== "arquivado" && (
          <DropdownMenuItem
            className="text-red-600"
            onClick={() =>
              setConfirm({
                title: "Arquivar produto?",
                message:
                  'O produto sai do catálogo. O histórico é preservado; nada é apagado. Só funciona se não houver projeto/proposta ativo vinculado — se houver, use "Programar inativação" abaixo.',
                onConfirm: () =>
                  rowAction(
                    () => apiClient.archiveCatalog2Product(p.id),
                    "Produto arquivado.",
                  ),
              })
            }
          >
            Arquivar (direto)
          </DropdownMenuItem>
        )}
        {/* Item 5 (reunião 2026-09-14): quando há vínculo ativo, o caminho
            é agendar (aviso + 30 dias), não arquivar direto. */}
        {p.status !== "arquivado" && !p.inactivation_scheduled_at && (
          <DropdownMenuItem
            className="text-amber-700 dark:text-amber-400"
            onClick={() => onScheduleInactivation(p)}
          >
            Programar inativação (30 dias)
          </DropdownMenuItem>
        )}
        {p.inactivation_scheduled_at && (
          <DropdownMenuItem
            onClick={() =>
              setConfirm({
                title: "Cancelar inativação programada?",
                message:
                  "O agendamento é desfeito e o produto volta a ficar contratável normalmente. Um novo agendamento, se feito depois, contará um novo prazo de 30 dias.",
                onConfirm: () =>
                  rowAction(
                    () => apiClient.cancelCatalog2ProductInactivation(p.id),
                    "Inativação programada cancelada.",
                  ),
              })
            }
          >
            Cancelar inativação programada
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SummaryCell({ k, v }: { k: string; v: number | string }) {
  return (
    <div className="rounded border bg-background px-2 py-1">
      <div className="font-semibold text-foreground">{v}</div>
      <div className="text-[10px] text-muted-foreground">{k}</div>
    </div>
  );
}
function ReadinessPanel({ readiness }: { readiness: any }) {
  const [open, setOpen] = useState(false);
  return (
    <details className="rounded-lg border">
      <summary className="flex cursor-pointer select-none flex-wrap items-center justify-between gap-2 px-3 py-2">
        <h2 className="text-sm font-semibold text-foreground">
          Prontidão para o catálogo do cliente
        </h2>
        <span className="text-xs text-muted-foreground">
          {readiness.ready_for_client}/{readiness.total} prontos ·{" "}
          {readiness.client_visible_now} visíveis agora ·{" "}
          {readiness.with_blockers} com bloqueador
        </span>
      </summary>
      <div className="space-y-2 border-t p-3">
        <p className="text-[11px] text-muted-foreground">{readiness.note}</p>
        <button
          className="text-xs font-medium text-foreground underline"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? "Ocultar detalhamento" : "Ver detalhamento por produto"}
        </button>
        {open && (
          <div className="max-h-80 overflow-y-auto rounded border">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-muted text-muted-foreground">
                <tr>
                  <th className="p-1.5">#</th>
                  <th className="p-1.5">Produto</th>
                  <th className="p-1.5">Bloqueadores</th>
                  <th className="p-1.5">Pendências</th>
                </tr>
              </thead>
              <tbody>
                {readiness.products.map((p: any) => (
                  <tr key={p.id} className="border-t">
                    <td className="p-1.5 text-muted-foreground">
                      {p.source_index ?? "—"}
                    </td>
                    <td className="p-1.5 text-foreground">{p.name}</td>
                    <td className="p-1.5">
                      {p.blockers.length === 0 ? (
                        <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                          nenhum
                        </Badge>
                      ) : (
                        p.blockers.map((b: string) => (
                          <Badge
                            key={b}
                            className="mr-1 bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200"
                          >
                            {b}
                          </Badge>
                        ))
                      )}
                    </td>
                    <td className="p-1.5">
                      {p.pendings.map((b: string) => (
                        <Badge
                          key={b}
                          className="mr-1 bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
                        >
                          {b}
                        </Badge>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </details>
  );
}
function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
      {children}
    </div>
  );
}
