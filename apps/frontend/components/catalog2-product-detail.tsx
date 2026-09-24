"use client";

// Detalhe COMPLETO do produto catalog2 — reparo 2026-09 ("restaurar o
// detalhe completo do produto, preços e imagens"). Reproduz a ESTRUTURA
// VISUAL do componente publicado em produção (f14e783 —
// product-contract-view.tsx): cabeçalho degradê com voltar/nome/copiar
// link/categoria/opções/código/status/descrição/destaques, abas
// Detalhes/Portfólio/Nômades, painel de opções e contratação.
//
// ÚNICO componente de detalhe de produto do catalog2 — achado do usuário
// 2026-09-23: "a do admin em catálogo de produtos era a certa... replica
// para a anterior e faz replicado para todas". Usado por:
//   - Admin › Cadastro de Produtos (dataSource="admin", canBuy=false — só
//     leitura, com a camada provisória Catalog2ProvisionalPreview);
//   - Admin › Catálogo de Produtos (dataSource="admin", canBuy=false);
//   - Company/Agency/Partner (dataSource="client", canBuy=true — compra
//     real: adicionar à cesta / gerar pré-cotação);
//   - Líder (dataSource="client", canBuy=false — vê tudo, nunca compra).
// dataSource="client" NUNCA usa a camada provisória (cliente real nunca vê
// dado provisório — regra confirmada pelo usuário antes).
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  Circle,
  Layers,
  CalendarClock,
  Repeat2,
  Info,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  FileText,
  Images,
  Users,
  Zap,
  GripVertical,
  ShoppingCart,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { CopyLinkButton } from "@/components/copy-link-button";
import { fmtBRL, Section, PortfolioGallery } from "@/components/product-detail-shared";
import { Catalog2DetailHeader } from "@/components/catalog2-detail-header";
import { ProvisionalBadge } from "@/components/provisional-badge";
import { useIallkaContext } from "@/contexts/iallka-context";
import { AdminCheckoutModal } from "@/components/catalog2/admin-checkout-modal";

type TabId = "detalhes" | "portfolio" | "nomades";

const DETAIL_PANEL_STORAGE_KEY = "allka:catalog2-detail-right-fraction-v1";
const DEFAULT_RIGHT_FRACTION = 0.58;
const MIN_RIGHT_FRACTION = 0.42;
const MAX_RIGHT_FRACTION = 0.68;
const PERIOD_LABEL: Record<string, string> = { mensal: "Mensal", trimestral: "Trimestral", semestral: "Semestral", anual: "Anual" };

function clampRightFraction(value: number) {
  return Math.min(MAX_RIGHT_FRACTION, Math.max(MIN_RIGHT_FRACTION, value));
}

function money(v: number | null | undefined, currency = "BRL") {
  if (v == null) return "A definir";
  return `${currency} ${Number(v).toFixed(2)}`;
}

interface RealOption {
  id: string;
  key: string;
  variation_id: string;
  variation_name: string;
  selection_type: string | null;
  name: string;
  price: number | null;
  deadline_days: number | null;
  modality: null;
  features: string[];
  is_provisional: false;
}
interface ProvisionalOption {
  id: string;
  name: string;
  price: number;
  deadline_days: number;
  modality: string;
  features: string[];
  is_provisional: true;
}

export function Catalog2ProductDetail({
  productId,
  onBack,
  onOpenEditor,
  isAdminMaster = false,
  dataSource = "admin",
  canBuy = false,
  preview = false,
  onCartChanged,
  shareBasePath,
  cartCount,
  onOpenCart,
}: {
  productId: string;
  onBack: () => void;
  onOpenEditor?: () => void;
  isAdminMaster?: boolean;
  /** "admin" (padrão) = preview administrativo com camada provisória, só
   * leitura. "client" = dado 100% real, nunca provisório — usado por
   * company/agency/partner/líder. */
  dataSource?: "admin" | "client";
  /** Só faz sentido com dataSource="client". Company/Agency/Partner=true,
   * Líder=false (vê tudo, nunca compra). Admin nunca compra por aqui ainda
   * (decisão adiada pelo usuário — comprar em nome de empresa é outro
   * fluxo, pelo projeto da empresa). */
  canBuy?: boolean;
  /** dataSource="client": mostra rascunho/incompleto (Admin Master e Líder
   * já têm isso sempre no backend via always_sees_all_products). */
  preview?: boolean;
  onCartChanged?: () => void;
  /** Base da URL do link direto (ex.: "/company/catalogo-produtos"). Sem
   * isso, "Copiar link" não aparece. */
  shareBasePath?: string;
  /** Quantidade de itens na cesta — mostra o botão "Ir para a cesta" abaixo
   * de "Contratar" quando informado (achado do usuário 2026-09-23: precisa
   * de um jeito de ver a cesta sem sair da tela do produto). */
  cartCount?: number;
  onOpenCart?: () => void;
}) {
  const isClient = dataSource === "client";

  const [showAdminCheckout, setShowAdminCheckout] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Distingue "produto não existe" (404 — repetir a chamada nunca vai
  // funcionar) de uma falha real/transitória da API (vale oferecer retry).
  const [notFound, setNotFound] = useState(false);
  const [data, setData] = useState<any | null>(null);
  const [clientProduct, setClientProduct] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("detalhes");
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [expandedOptionId, setExpandedOptionId] = useState<string | null>(null);
  const [selectedOptionKeys, setSelectedOptionKeys] = useState<string[]>([]);
  const [selectedAddonKeys, setSelectedAddonKeys] = useState<string[]>([]);
  const [selectionSimulation, setSelectionSimulation] = useState<any | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const [isWideLayout, setIsWideLayout] = useState(false);
  const [isDraggingDivider, setIsDraggingDivider] = useState(false);
  const [rightFraction, setRightFraction] = useState(() => {
    if (typeof window === "undefined") return DEFAULT_RIGHT_FRACTION;
    const saved = Number(window.localStorage.getItem(DETAIL_PANEL_STORAGE_KEY));
    return Number.isFinite(saved) && saved >= MIN_RIGHT_FRACTION && saved <= MAX_RIGHT_FRACTION
      ? saved
      : DEFAULT_RIGHT_FRACTION;
  });

  // ── Estado da configuração REAL (só dataSource="client") ─────────────
  const [sel, setSel] = useState<any>({ variation_option_keys: [], addon_keys: [], quantity: 1, delivery_groups: [1], answers: {} });
  const [quantityText, setQuantityText] = useState("1");
  const [period, setPeriod] = useState<string | null>(null);
  const [config, setConfig] = useState<any | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const addLockRef = useRef(false);

  useEffect(() => {
    const update = () => setIsWideLayout(window.innerWidth >= 1024);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    if (!isDraggingDivider) return;
    const move = (event: MouseEvent) => {
      const rect = bodyRef.current?.getBoundingClientRect();
      if (!rect?.width) return;
      const next = clampRightFraction((rect.right - event.clientX) / rect.width);
      setRightFraction(next);
    };
    const stop = () => setIsDraggingDivider(false);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", stop);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", stop);
    };
  }, [isDraggingDivider]);

  useEffect(() => {
    window.localStorage.setItem(DETAIL_PANEL_STORAGE_KEY, String(rightFraction));
  }, [rightFraction]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setNotFound(false);
    const req = isClient
      ? apiClient.getClientCatalog2Product(productId, preview)
      : apiClient.getCatalog2ProductDetailPreview(productId);
    req
      .then((res: any) => {
        if (cancelled) return;
        if (isClient) {
          setClientProduct(res);
          setSel({
            variation_option_keys: res.default_selection?.variation_option_keys ?? [],
            addon_keys: res.default_selection?.addon_keys ?? [],
            quantity: res.default_selection?.quantity ?? 1,
            delivery_groups: res.default_selection?.delivery_groups ?? [res.default_selection?.quantity ?? 1],
            answers: {},
          });
          setQuantityText(String(res.default_selection?.quantity ?? 1));
        } else {
          setData(res);
        }
      })
      .catch((e: any) => {
        if (cancelled) return;
        if (e?.status === 404) {
          setNotFound(true);
          setError(e?.message || "Produto não encontrado.");
        } else {
          setError(e?.message || "Não foi possível carregar o detalhe do produto.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [productId, retryToken, isClient, preview]);

  // Recalcula preço/prazo reais no backend a cada mudança de seleção
  // (dataSource="client" — nunca cosmético, sempre o preço que vai pra
  // cotação/cesta de verdade).
  useEffect(() => {
    if (!isClient || !clientProduct) return;
    let cancelled = false;
    setCalculating(true);
    apiClient
      .configureClientCatalog2(productId, sel, preview, period)
      .then((c: any) => {
        if (!cancelled) setConfig(c);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setCalculating(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isClient, clientProduct, sel, period, productId, preview]);

  const product = data?.product;
  const readiness = data?.readiness;
  const provisional = readiness?.provisional ?? null;

  // Contexto pra Aura (Item 9, reunião 2026-09-14, "Atualizar o contexto da
  // Aura") — nome já visível na própria tela + id real do produto
  // (revalidado/reautorizado no servidor, nunca confiado só por estar
  // aqui). Some ao sair da tela.
  const { setScreenContext: setIallkaScreenContext } = useIallkaContext();
  const screenName = isClient ? clientProduct?.name : product?.internal_name;
  useEffect(() => {
    setIallkaScreenContext({
      label: "Catálogo de Produtos",
      openItemName: screenName,
      productId,
    });
    return () => setIallkaScreenContext(null);
  }, [screenName, productId, setIallkaScreenContext]);

  const targetVersion = useMemo(() => {
    if (isClient || !product?.versions?.length) return null;
    const published = product.versions.find((v: any) => v.id === product.published_version_id);
    return published ?? product.versions.find((v: any) => v.state === "rascunho") ?? product.versions[0];
  }, [isClient, product]);

  // ── Opções: ADMIN (real+provisório, preview) ──────────────────────────
  const realOptions: RealOption[] = useMemo(() => {
    if (isClient) return [];
    const vars = targetVersion?.variations ?? [];
    const opts: RealOption[] = [];
    for (const v of vars) {
      for (const o of v.options ?? []) {
        opts.push({
          id: o.id, key: o.key, variation_id: v.id, variation_name: v.name, selection_type: v.selection_type,
          name: o.label,
          price: readiness?.price_amount ?? null,
          deadline_days: readiness?.deadline_days ?? null,
          modality: null, features: [], is_provisional: false,
        });
      }
    }
    return opts;
  }, [isClient, targetVersion, readiness]);

  const provisionalOptions: ProvisionalOption[] = useMemo(() => {
    if (isClient || realOptions.length > 0 || !provisional?.options) return [];
    return provisional.options.map((o: any, i: number) => ({
      id: `provisional-${i}`, name: o.name, price: o.price, deadline_days: o.deadline_days,
      modality: o.modality, features: o.features ?? [], is_provisional: true as const,
    }));
  }, [isClient, realOptions, provisional]);

  const hasRealOptions = realOptions.length > 0;
  const adminOptions = hasRealOptions ? realOptions : provisionalOptions;
  const selectedOption = adminOptions.find((o) => o.id === selectedOptionId || (!o.is_provisional && selectedOptionKeys.includes((o as RealOption).key))) ?? null;

  useEffect(() => {
    if (isClient || !targetVersion) return;
    const defaults = (targetVersion.variations ?? []).flatMap((variation: any) => {
      const option = variation.options?.find((item: any) => item.is_default) ?? variation.options?.[0];
      return option?.key ? [option.key] : [];
    });
    setSelectedOptionKeys(defaults);
    setSelectedAddonKeys((targetVersion.addons ?? []).filter((addon: any) => addon.is_default_selected).map((addon: any) => addon.key));
  }, [isClient, targetVersion?.id]);

  useEffect(() => {
    if (isClient || !targetVersion?.id || !hasRealOptions) {
      setSelectionSimulation(null);
      return;
    }
    let cancelled = false;
    apiClient.simulateCatalog2(targetVersion.id, {
      variation_option_keys: selectedOptionKeys, addon_keys: selectedAddonKeys, quantity: 1, answers: {},
    }).then((result: any) => {
      if (!cancelled) setSelectionSimulation(result.pricing_simulation ?? result.pricing ?? null);
    }).catch(() => { if (!cancelled) setSelectionSimulation(null); });
    return () => { cancelled = true; };
  }, [isClient, targetVersion?.id, hasRealOptions, selectedOptionKeys, selectedAddonKeys]);

  // ── Opções: CLIENT (real, achatadas por variação — mesma linha visual) ─
  const clientOptionRows = useMemo(() => {
    if (!isClient || !clientProduct) return [];
    const rows: { key: string; variationKey: string; variationName: string; label: string; selectionType: string | null; isRequired: boolean }[] = [];
    for (const va of clientProduct.variations ?? []) {
      for (const o of va.options ?? []) {
        rows.push({ key: o.key, variationKey: va.key, variationName: va.name, label: o.label, selectionType: va.selection_type, isRequired: va.is_required });
      }
    }
    return rows;
  }, [isClient, clientProduct]);

  function pickClientOption(variationKey: string, optionKey: string, selectionType: string | null) {
    const optKeysOfVar = clientOptionRows.filter((r) => r.variationKey === variationKey).map((r) => r.key);
    setSel((s: any) => ({
      ...s,
      variation_option_keys: selectionType === "multiple"
        ? (s.variation_option_keys.includes(optionKey) ? s.variation_option_keys.filter((k: string) => k !== optionKey) : [...s.variation_option_keys, optionKey])
        : [...s.variation_option_keys.filter((k: string) => !optKeysOfVar.includes(k)), optionKey],
    }));
  }
  function toggleClientAddon(key: string, on: boolean) {
    setSel((s: any) => ({ ...s, addon_keys: on ? [...s.addon_keys, key] : s.addon_keys.filter((k: string) => k !== key) }));
  }
  function setClientQuantity(next: number) {
    setSel((s: any) => ({ ...s, quantity: next, delivery_groups: [next] }));
  }
  function setDeliveryGroup(index: number, rawValue: string) {
    const value = Number(rawValue);
    setSel((s: any) => ({ ...s, delivery_groups: (s.delivery_groups ?? [s.quantity]).map((g: number, i: number) => (i === index ? value : g)) }));
  }
  function useSeparateProfessionals() {
    setSel((s: any) => { const q = s.quantity ?? 1; return { ...s, delivery_groups: q > 1 ? [1, q - 1] : [1] }; });
  }
  function addDeliveryGroup() {
    setSel((s: any) => {
      const groups = [...(s.delivery_groups ?? [s.quantity])];
      const last = groups.length - 1;
      if (groups[last] <= 1) return s;
      groups[last] -= 1; groups.push(1);
      return { ...s, delivery_groups: groups };
    });
  }
  function removeDeliveryGroup(index: number) {
    setSel((s: any) => {
      const groups = [...(s.delivery_groups ?? [s.quantity])];
      if (groups.length <= 1) return s;
      const removed = groups.splice(index, 1)[0];
      groups[groups.length - 1] += removed;
      return { ...s, delivery_groups: groups };
    });
  }
  async function addToCart() {
    if (addLockRef.current || busy) return;
    addLockRef.current = true;
    setBusy(true); setMsg(null);
    try {
      const r: any = await apiClient.addClientCatalog2CartItem(productId, sel, period);
      setMsg(r.already_in_cart ? "Já está na cesta." : "Adicionado à cesta.");
      await onCartChanged?.();
    } catch (e: any) {
      setMsg(e?.message ?? "Não foi possível adicionar.");
    } finally {
      setBusy(false);
      setTimeout(() => (addLockRef.current = false), 600);
    }
  }
  async function generateQuote() {
    if (busy) return;
    setBusy(true); setMsg(null);
    try {
      const q: any = await apiClient.createClientCatalog2Quote(productId, sel, period);
      setMsg(`Pré-cotação ${q.status} gerada — ${money(q.commercial_price, q.currency)} · ${q.commercial_deadline_days ?? "?"} dia(s). Válida até ${new Date(q.valid_until).toLocaleDateString("pt-BR")}.`);
    } catch (e: any) {
      setMsg(e?.message ?? "Não foi possível gerar a cotação.");
    } finally {
      setBusy(false);
    }
  }

  const selectedCalculatedPrice = selectionSimulation?.lines?.commercial_final_price?.amount ?? selectionSimulation?.lines?.final_price?.amount ?? null;
  const clientPricing = config?.pricing ?? clientProduct?.pricing;
  const clientPeriodPricing = period ? config?.period_pricing : null;
  const clientSelErrors: string[] = config?.selection_errors ?? [];
  const canQuote = !!config?.can_generate_quote;

  const displayPrice = isClient
    ? (clientPricing?.commercial_price ?? clientProduct?.starting_price ?? null)
    : (selectedCalculatedPrice ?? selectedOption?.price ?? readiness?.price_amount ?? readiness?.pricing_simulation?.price_amount ?? provisional?.price_amount ?? null);
  const selectedCalculatedDeadline = selectionSimulation?.deadline?.commercial_deadline_days ?? selectionSimulation?.estimated_deadline_days ?? null;
  const displayDeadline = isClient
    ? (clientPricing?.commercial_deadline_days ?? clientProduct?.commercial_deadline_days ?? null)
    : (selectedCalculatedDeadline ?? selectedOption?.deadline_days ?? readiness?.deadline_days ?? readiness?.pricing_simulation?.deadline_days ?? provisional?.deadline_days ?? null);
  const deadlineIsProvisional = !isClient && !readiness?.deadline_days && displayDeadline != null;
  const modality = !isClient ? (provisional?.modality ?? null) : null;

  // Link curto e legível — dataSource="client" usa o ID numérico
  // (sequence_number), nunca o slug completo (achado do usuário
  // 2026-09-23: "o ID em número... não o nome completo do produto"). Admin
  // continua com o esquema p<n> de sempre (rota própria, ver
  // catalogProductShortCode em app/admin/catalogo-produtos/page.tsx).
  const shareCode = isClient
    ? (clientProduct?.sequence_number ?? clientProduct?.slug)
    : (product?.sequence_number ?? productId.slice(-8).toLowerCase());
  const shareProductUrl = shareBasePath && shareCode != null
    ? `${typeof window === "undefined" ? "" : window.location.origin}${shareBasePath}/${shareCode}`
    : (!isClient
      ? (typeof window === "undefined" ? `/admin/catalogo-produtos/${shareCode}` : `${window.location.origin}/admin/catalogo-produtos/${shareCode}`)
      : null);

  const tasks = !isClient ? (targetVersion?.tasks ?? []) : [];
  const hasRealTasks = tasks.length > 0;
  const includedItems = isClient
    ? (clientProduct?.included_items ?? []).map((it: any) => ({ title: it.title, description: it.description, real: true, effort_is_provisional: false }))
    : hasRealTasks
      ? tasks.map((t: any) => ({ title: t.name, description: t.description, real: true, effort_is_provisional: !!t.effort_is_provisional }))
      : (provisional?.included_items ?? []).map((it: any) => ({ ...it, real: false, effort_is_provisional: false }));

  const highlights: { text: string; real: boolean }[] = !isClient ? (provisional?.highlights?.map((h: string) => ({ text: h, real: false })) ?? []) : [];

  const imagePath = isClient ? (clientProduct?.image_path ?? null) : (provisional?.image_path ?? null);
  const portfolioImages: string[] = !isClient ? (provisional?.portfolio_refs ?? []) : [];

  const specialties = useMemo(() => {
    if (isClient) return clientProduct?.specialties ?? [];
    const names = new Set<string>();
    for (const t of tasks) if (t.specialty?.name) names.add(t.specialty.name);
    return Array.from(names);
  }, [isClient, clientProduct, tasks]);

  // `readiness.ready_for_client`/`blockers` (computeProductReadiness no
  // backend) é o sinal ÚNICO e autoritativo de "produto realmente
  // incompleto" — achado do usuário 2026-09-23: produto #37 tinha
  // ready_for_client=true e blockers=[] (de verdade pronto), mas a UI
  // mostrava "em preparação" por causa de uma heurística própria do
  // frontend que exigia imagePath (nunca existe — não há upload de imagem
  // real pra produto do catálogo, só a camada opcional de demo/preview).
  const isGenuinelyIncomplete = !isClient && !!readiness && readiness.ready_for_client === false;

  // Admin Master contrata EM NOME de empresa/agência (achado do usuário
  // 2026-09-23: "como administrador eu posso conseguir contratar... vincular
  // a uma agência, dar de brinde, descontar da carteira, gerar link de
  // pagamento") — só quando o produto está de verdade pronto, nunca em
  // preview/rascunho. Admin comum (não-master) continua sem poder comprar.
  const adminCanCheckout = !isClient && isAdminMaster && !isGenuinelyIncomplete;

  // Bloqueio de contratação — admin-preview sem ser Master, ou produto ainda
  // incompleto: nunca chama createQuote/addToCart. Client sem canBuy
  // (líder): visualização.
  const blockedReason = !isClient
    ? (isGenuinelyIncomplete
      ? "Produto em preparação. Dados provisórios precisam ser revisados antes da contratação."
      : (adminCanCheckout ? null : "Você está vendo como administrador — a contratação acontece pelo perfil da empresa/agência, não por aqui."))
    : (!canBuy
      ? "Seu perfil tem acesso de visualização ao catálogo completo, sem contratação."
      : (!clientProduct?.can_configure ? "Seu perfil pode visualizar, mas não configurar este produto." : null));
  const contractBlockedReason: string | null = isClient && !clientProduct?.is_preview ? (clientProduct?.contract_blocked_reason ?? null) : null;

  // Nômades: só quem NÃO compra (admin/líder) — quem contrata
  // (company/agency/partner) nunca precisa saber qual especialidade
  // executa. Portfólio sempre disponível (honesto: vazio quando não há
  // imagem real ainda, nunca inventado).
  const showNomadesTab = !isClient || !canBuy;
  const tabs: { id: TabId; label: string; icon: any }[] = [
    { id: "detalhes", label: "Detalhes", icon: FileText },
    { id: "portfolio", label: "Portfólio", icon: Images },
    ...(showNomadesTab ? [{ id: "nomades" as const, label: "Nômades", icon: Users }] : []),
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-24 text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Carregando detalhe do produto…</div>
    );
  }
  if (error || (!isClient && !product) || (isClient && !clientProduct)) {
    const canRetry = !!error && !notFound;
    return (
      <div className="flex flex-col items-center justify-center h-full py-24 gap-3 text-center px-6">
        <AlertTriangle className="h-8 w-8 text-amber-500" />
        <p className="text-sm text-muted-foreground">{error || "Produto não encontrado."}</p>
        <div className="flex items-center gap-2">
          {canRetry && (
            <Button variant="outline" onClick={() => setRetryToken((n) => n + 1)}>Tentar novamente</Button>
          )}
          <Button variant={canRetry ? "ghost" : "outline"} onClick={onBack}>Voltar</Button>
        </div>
      </div>
    );
  }

  // Nome COMERCIAL sempre em primeiro lugar — mesmo nome que
  // company/agency/líder veem (achado do usuário 2026-09-23: "o admin tem
  // que ver o mesmo nome... senão como é que eu vou identificar por
  // nome"). `internal_name` (com prefixo "[TESTE LOCAL]"/rascunho) só como
  // informação extra pro admin, nunca no lugar do nome comercial.
  const title = isClient ? clientProduct.name : (targetVersion?.title || product.internal_name);
  const showInternalNameBadge = !isClient && product.internal_name !== title;
  const categoryName = isClient ? (clientProduct.category?.name ?? clientProduct.pillar?.name ?? "Sem categoria") : (product.category?.name || "Sem categoria");
  const statusValue = isClient ? clientProduct.status : product.status;
  const optionsCount = isClient ? clientOptionRows.length : adminOptions.length;
  const optionsAreProvisional = !isClient && !hasRealOptions;
  const code = isClient ? undefined : product.slug;
  const hasProvisionalFields = isGenuinelyIncomplete;
  const canBuyReal = isClient && canBuy && !!clientProduct.can_configure;

  return (
    <div className="h-full min-h-0 flex flex-col overflow-hidden">
      {/* ── Cabeçalho institucional ─────────────────────────────────── */}
      <Catalog2DetailHeader
        onBack={onBack}
        productId={isClient ? clientProduct.id : product.id}
        imagePath={imagePath}
        title={title}
        categoryName={categoryName}
        optionsCount={optionsCount}
        optionsAreProvisional={optionsAreProvisional}
        code={code}
        deadlineDays={displayDeadline}
        deadlineIsProvisional={deadlineIsProvisional}
        statusLabel={statusValue === "disponivel" ? "Disponível" : "Em preparação"}
        extraBadges={
          <>
            {modality && (
              <span className="inline-flex items-center gap-1 text-[9px] font-medium px-1.5 py-[2px] rounded-full bg-white/12 border border-white/20 text-white/90">
                <Repeat2 className="h-2.5 w-2.5" />
                {modality} <span className="opacity-70">(provisório)</span>
              </span>
            )}
            {showInternalNameBadge && (
              <span title="Nome interno (só admin) — o cliente nunca vê este nome." className="inline-flex items-center gap-1 text-[9px] font-medium px-1.5 py-[2px] rounded-full bg-white/12 border border-white/20 text-white/90">
                interno: {product.internal_name}
              </span>
            )}
          </>
        }
        rightSlot={
          <>
            {onOpenEditor && <button type="button" onClick={onOpenEditor} className="hidden 2xl:inline-flex text-[11px] font-semibold text-white/80 hover:text-white underline underline-offset-2">Abrir no construtor</button>}
            {shareProductUrl && <CopyLinkButton url={shareProductUrl} />}
            <span className="hidden sm:block h-7 w-px bg-white/20" />
            <div className="hidden sm:block text-right">
              <p className="text-lg font-extrabold leading-none text-white">{displayPrice != null ? fmtBRL(displayPrice) : "A definir"}</p>
              {displayDeadline != null && <p className="mt-1 text-[10px] font-medium text-white/70">Prazo de entrega: {displayDeadline} dias</p>}
            </div>
            <div className="flex flex-col items-stretch gap-1.5">
              <Button
                type="button"
                disabled={!canBuyReal && !adminCanCheckout || clientSelErrors.length > 0 || (isClient && !!contractBlockedReason)}
                onClick={canBuyReal ? addToCart : (adminCanCheckout ? () => setShowAdminCheckout(true) : undefined)}
                className="h-9 rounded-lg border-0 bg-gradient-to-r from-violet-600 to-pink-600 px-5 text-sm font-bold text-white opacity-100 hover:from-violet-600 hover:to-pink-600 disabled:opacity-60"
                title={adminCanCheckout ? "Contratar em nome de empresa/agência" : (blockedReason ?? contractBlockedReason ?? "")}
              >
                <ShoppingCart className="mr-1.5 h-4 w-4" /> Contratar
              </Button>
              {/* Ir para a cesta — achado do usuário 2026-09-23: precisa dar
                  pra ver o que já está na cesta sem sair da tela do
                  produto, não só o "Adicionar à cesta" que só soma. */}
              {isClient && canBuy && onOpenCart && (
                <button
                  type="button"
                  onClick={onOpenCart}
                  className="inline-flex h-7 items-center justify-center gap-1.5 rounded-md border border-white/25 bg-white/10 px-3 text-[11px] font-semibold text-white hover:bg-white/20 transition-colors"
                >
                  <ShoppingCart className="h-3 w-3" />
                  Ir para a cesta{cartCount != null && cartCount > 0 ? ` (${cartCount})` : ""}
                </button>
              )}
            </div>
          </>
        }
      />

      {hasProvisionalFields && (
        <div className="shrink-0 mb-2 flex items-start gap-1.5 rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-950/20 px-2 py-1.5 text-[11px] text-amber-800 dark:text-amber-300">
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>Este produto ainda tem campos provisórios (marcados ao longo da tela). Nenhum valor provisório entra em cotação, cesta ou checkout.</span>
        </div>
      )}
      {isClient && clientProduct.is_preview && (
        <div className="shrink-0 mb-2 flex items-start gap-1.5 rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-950/20 px-2 py-1.5 text-[11px] text-amber-800 dark:text-amber-300">
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>{clientProduct.preview_notice}{clientProduct.pendencies?.length > 0 && <> Pendências: {clientProduct.pendencies.join(", ")}.</>}</span>
        </div>
      )}
      {isClient && !clientProduct.is_preview && contractBlockedReason && (
        <div className="shrink-0 mb-2 flex items-start gap-1.5 rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-950/20 px-2 py-1.5 text-[11px] text-amber-800 dark:text-amber-300">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>Contratação bloqueada: {contractBlockedReason}.</span>
        </div>
      )}

      {/* ── Corpo: abas + opções ────────────────────────────────────── */}
      <div ref={bodyRef} className="flex flex-1 min-h-0 overflow-hidden flex-col lg:flex-row rounded-2xl border border-border/60 bg-background shadow-sm">
        <div className="flex flex-col min-h-0 order-2 lg:order-1 min-w-0 flex-1 bg-background">
          <div role="tablist" aria-label="Seções do produto" className="shrink-0 flex border-b border-border/50 overflow-x-auto">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={activeTab === id}
                onClick={() => setActiveTab(id)}
                className={cn(
                  "flex items-center gap-1.5 px-5 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap",
                  activeTab === id ? "border-blue-500 text-blue-600 dark:text-blue-400" : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>

          <ScrollArea className="flex-1 min-h-0">
            {activeTab === "portfolio" ? (
              <div role="tabpanel" className="px-6 py-4">
                <PortfolioGallery images={portfolioImages} productName={title} coverImage={imagePath ?? undefined} />
                {portfolioImages.length > 0 && (
                  <p className="mt-3 text-[11px] text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                    <AlertTriangle className="h-3 w-3" />
                    Portfólio provisório — referência de visualização, não representa entregas definitivas deste produto.
                  </p>
                )}
              </div>
            ) : activeTab === "nomades" ? (
              <div role="tabpanel" className="px-6 py-4 space-y-4">
                <Section icon={Users} title="Nômades — especialidades e elegibilidade" color="text-indigo-600" bg="bg-indigo-100 dark:bg-indigo-900/40">
                  {specialties.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {specialties.map((s: string) => (
                        <span key={s} className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700">
                          {s}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Especialidades necessárias: a definir (produto ainda sem tarefas cadastradas).</p>
                  )}
                  {!isClient && <p className="text-xs text-muted-foreground mt-3">Quantidade de profissionais elegíveis: a definir — este produto ainda não tem regra de elegibilidade vinculada no catalog2.</p>}
                </Section>
              </div>
            ) : (
              <div role="tabpanel" className="px-6 py-4 space-y-6">
                {(isClient ? clientProduct.description : (targetVersion?.summary || targetVersion?.full_description)) && (
                  <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 dark:border-blue-900/40 dark:bg-blue-950/20">
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{title}</p>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{isClient ? clientProduct.description : (targetVersion.full_description || targetVersion.summary)}</p>
                  </div>
                )}
                {!isClient && adminOptions.length > 0 && (
                  <div className={cn("rounded-xl border p-3", selectedOption ? "border-purple-200 dark:border-purple-900/50 bg-purple-50/50 dark:bg-purple-950/20" : "border-dashed border-border/70 bg-muted/30")}>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Zap className={cn("h-3.5 w-3.5", selectedOption ? "text-purple-600" : "text-muted-foreground")} />
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {selectedOption ? "Sua seleção" : "Selecione uma opção ao lado"}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {selectedOption ? `${selectedOption.name} — apenas para conferência visual, nenhuma seleção aqui altera cotação, cesta ou checkout.` : "Escolha uma opção no painel ao lado para ver os diferenciais dela aqui."}
                    </p>
                  </div>
                )}

                <Section icon={Layers} title="O que está incluído" color="text-blue-600" bg="bg-blue-100 dark:bg-blue-900/40">
                  {includedItems.length > 0 ? (
                    <div className="space-y-2.5">
                      {includedItems.map((item: any, i: number) => (
                        <div key={i} className="flex items-start gap-3 rounded-xl border border-border/60 p-3.5 bg-muted/20">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold">{item.title}</p>
                              {!item.real && <ProvisionalBadge label="Item provisório — completar com tarefas reais no construtor." />}
                              {item.real && item.effort_is_provisional && (
                                <ProvisionalBadge label="Especialidade e tempo provisórios para teste — revisão humana pendente. Nunca usado para aprovar preço comercial." />
                              )}
                            </div>
                            {item.description && <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.description}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Nenhuma tarefa cadastrada ainda.</p>
                  )}
                </Section>

                {!isClient && readiness?.step_count > 0 && (
                  <Section icon={CalendarClock} title="Detalhamento das entregas" color="text-blue-600" bg="bg-blue-100 dark:bg-blue-900/40">
                    <p className="text-sm text-muted-foreground">{readiness.step_count} etapa(s) cadastrada(s) nas tarefas deste produto (ver detalhamento completo no construtor).</p>
                  </Section>
                )}

                {highlights.length > 0 && (
                  <Section icon={Zap} title="Principais destaques" color="text-violet-600" bg="bg-violet-100 dark:bg-violet-900/40">
                    <div className="grid gap-2 sm:grid-cols-2">
                      {highlights.map((highlight, index) => (
                        <div key={index} className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-xs">
                          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                          <span>{highlight.text}</span>
                        </div>
                      ))}
                    </div>
                  </Section>
                )}
              </div>
            )}
          </ScrollArea>
        </div>

        {isWideLayout && (
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Redimensionar colunas de detalhes e opções"
            aria-valuenow={Math.round(rightFraction * 100)}
            tabIndex={0}
            onMouseDown={(event) => { event.preventDefault(); setIsDraggingDivider(true); }}
            onDoubleClick={() => setRightFraction(DEFAULT_RIGHT_FRACTION)}
            onKeyDown={(event) => {
              if (event.key === "ArrowLeft") setRightFraction((v) => clampRightFraction(v + 0.02));
              if (event.key === "ArrowRight") setRightFraction((v) => clampRightFraction(v - 0.02));
              if (event.key === "Enter") setRightFraction(DEFAULT_RIGHT_FRACTION);
            }}
            className={cn("order-2 hidden lg:flex w-2.5 shrink-0 cursor-col-resize items-center justify-center border-x border-border/50 bg-muted/40 hover:bg-purple-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500", isDraggingDivider && "bg-purple-300")}
            title="Arraste para ajustar as colunas; duplo clique restaura"
          >
            <GripVertical className="h-4 w-4 text-purple-500" />
          </div>
        )}

        {/* ── Painel de opções e contratação ─────────────────────────── */}
        <div
          className="shrink-0 order-1 lg:order-3 w-full flex flex-col bg-slate-50/60 dark:bg-slate-900/20 min-h-0"
          style={isWideLayout ? { flex: `0 0 ${rightFraction * 100}%`, width: `${rightFraction * 100}%`, minWidth: 360 } : undefined}
        >
          <div className="shrink-0 border-b border-border/50 bg-background px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold">Configure sua contratação</h2>
              {hasProvisionalFields && <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[9px] font-semibold text-amber-700">Dados provisórios - revise antes de contratar</span>}
              {calculating && <span className="flex items-center gap-1 text-[10px] text-blue-600"><Loader2 className="h-3 w-3 animate-spin" /> Atualizando…</span>}
            </div>
            <div className="mt-2 flex items-center gap-2 text-[10px] font-semibold text-muted-foreground">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-violet-600 text-white">1</span><span className="text-violet-700">Configuração</span><span className="h-px flex-1 bg-border" />
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted">2</span><span>Revisão</span><span className="h-px flex-1 bg-border" />
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted">3</span><span>Contratação</span>
            </div>
          </div>
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-3 space-y-2">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Opções</h2>
                {!isClient && !hasRealOptions && adminOptions.length > 0 && <span className="text-[10px] text-amber-600 font-semibold">provisórias</span>}
              </div>

              {!isClient && adminOptions.length === 0 && <p className="text-xs text-muted-foreground px-1">Nenhuma opção cadastrada ainda.</p>}
              {isClient && clientOptionRows.length === 0 && <p className="text-xs text-muted-foreground px-1">Nenhuma opção cadastrada ainda.</p>}

              {!isClient && adminOptions.map((o) => {
                const isSel = o.is_provisional ? selectedOptionId === o.id : selectedOptionKeys.includes((o as RealOption).key);
                const isExpanded = expandedOptionId === o.id;
                return (
                  <div key={o.id} className={cn("rounded-xl border-2 transition-all bg-background overflow-hidden", isSel ? "border-emerald-500 shadow-sm ring-2 ring-emerald-100 dark:ring-emerald-900/40" : "border-slate-200 dark:border-slate-700 hover:border-purple-300")}>
                    <button type="button" onClick={() => {
                      setSelectedOptionId(isSel ? null : o.id);
                      if (!o.is_provisional) {
                        const real = o as RealOption;
                        const siblingKeys = realOptions.filter((item) => item.variation_id === real.variation_id).map((item) => item.key);
                        setSelectedOptionKeys((current) => [...current.filter((key) => !siblingKeys.includes(key)), real.key]);
                      }
                    }} className="w-full text-left px-3 py-2.5 flex items-start gap-2.5">
                      {isSel ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" /> : <Circle className="h-4 w-4 text-slate-300 dark:text-slate-600 shrink-0 mt-0.5" />}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            {!o.is_provisional && <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">{(o as RealOption).variation_name}</p>}
                            <p className="text-xs font-bold leading-tight truncate">{o.name}</p>
                          </div>
                          <span className={cn("text-sm font-extrabold shrink-0 leading-tight", isSel ? "text-emerald-600" : "text-foreground")}>
                            {o.price != null ? fmtBRL(o.price) : "—"}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {o.deadline_days != null && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                              <CalendarClock className="h-2 w-2" />
                              {o.deadline_days} dias
                            </span>
                          )}
                          {o.modality && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                              <Repeat2 className="h-2 w-2" />
                              {o.modality}
                            </span>
                          )}
                          {!o.is_provisional ? null : (
                            <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700">
                              provisória
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                    {o.features.length > 0 && (
                      <>
                        <button type="button" aria-expanded={isExpanded} onClick={(e) => { e.stopPropagation(); setExpandedOptionId(isExpanded ? null : o.id); }} className="w-full flex items-center justify-center gap-1 text-[10px] font-semibold text-blue-600 dark:text-blue-400 border-t border-border/40 px-3 py-1.5 hover:bg-muted/40 transition-colors">
                          {isExpanded ? "Ocultar detalhes" : "Ver detalhes"}
                          {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </button>
                        {isExpanded && (
                          <div className="px-3 pb-3 pt-2 border-t border-border/40 bg-muted/10 space-y-1">
                            {o.features.map((f, i) => (
                              <div key={i} className="flex items-start gap-1.5 text-[11px] text-muted-foreground leading-snug">
                                <ChevronRight className="h-3 w-3 shrink-0 mt-0.5" />
                                {f}
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}

              {isClient && clientOptionRows.map((o) => {
                const isSel = sel.variation_option_keys.includes(o.key);
                return (
                  <button
                    key={o.key}
                    type="button"
                    onClick={() => pickClientOption(o.variationKey, o.key, o.selectionType)}
                    className={cn("w-full rounded-xl border-2 transition-all bg-background overflow-hidden text-left px-3 py-2.5 flex items-start gap-2.5", isSel ? "border-emerald-500 shadow-sm ring-2 ring-emerald-100 dark:ring-emerald-900/40" : "border-slate-200 dark:border-slate-700 hover:border-purple-300")}
                  >
                    {isSel ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" /> : <Circle className="h-4 w-4 text-slate-300 dark:text-slate-600 shrink-0 mt-0.5" />}
                    <div className="min-w-0 flex-1">
                      <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">{o.variationName}{o.isRequired && <span className="text-red-500"> *</span>}</p>
                      <p className="text-xs font-bold leading-tight truncate">{o.label}</p>
                    </div>
                  </button>
                );
              })}

              {!isClient && (targetVersion?.addons ?? []).length > 0 && (
                <div className="mt-4 space-y-2 border-t border-border/60 pt-3">
                  <div className="flex items-center justify-between px-1">
                    <h2 className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Adicionais</h2>
                    <span className="text-[10px] text-amber-600">valores provisórios quando indicado</span>
                  </div>
                  {(targetVersion.addons ?? []).filter((addon: any) => addon.is_active !== false).map((addon: any) => {
                    const checked = selectedAddonKeys.includes(addon.key);
                    return (
                      <label key={addon.id} className={cn("flex cursor-pointer items-start gap-2 rounded-xl border bg-background px-3 py-2.5 transition-colors", checked ? "border-purple-400 bg-purple-50/50 dark:bg-purple-950/20" : "border-border/70 hover:border-purple-300")}>
                        <input type="checkbox" className="mt-0.5" checked={checked} onChange={(event) => setSelectedAddonKeys((current) => event.target.checked ? [...current, addon.key] : current.filter((key) => key !== addon.key))} />
                        <span className="min-w-0 flex-1">
                          <span className="block text-xs font-bold">{addon.name}</span>
                          {addon.description && <span className="mt-0.5 block text-[11px] text-muted-foreground">{addon.description}</span>}
                        </span>
                        {addon.base_cost != null && <span className="text-xs font-semibold">+ {fmtBRL(addon.base_cost)}</span>}
                      </label>
                    );
                  })}
                </div>
              )}

              {isClient && (clientProduct.addons ?? []).length > 0 && (
                <div className="mt-4 space-y-2 border-t border-border/60 pt-3">
                  <h2 className="px-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Adicionais (opcionais)</h2>
                  {clientProduct.addons.map((addon: any) => {
                    const checked = sel.addon_keys.includes(addon.key);
                    return (
                      <label key={addon.key} className={cn("flex cursor-pointer items-start gap-2 rounded-xl border bg-background px-3 py-2.5 transition-colors", checked ? "border-purple-400 bg-purple-50/50 dark:bg-purple-950/20" : "border-border/70 hover:border-purple-300")}>
                        <input type="checkbox" className="mt-0.5" checked={checked} onChange={(e) => toggleClientAddon(addon.key, e.target.checked)} />
                        <span className="min-w-0 flex-1">
                          <span className="block text-xs font-bold">{addon.name}</span>
                          {addon.description && <span className="mt-0.5 block text-[11px] text-muted-foreground">{addon.description}</span>}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}

              {/* ── Quantidade, distribuição e período — só compra real ── */}
              {isClient && (
                <div className="mt-4 space-y-3 border-t border-border/60 pt-3">
                  {(clientProduct.required_info ?? []).length > 0 && (
                    <div className="space-y-2 rounded-xl border border-border/70 bg-background p-3">
                      <h2 className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Informações necessárias</h2>
                      {clientProduct.required_info.map((label: string, i: number) => (
                        <label key={i} className="block text-sm">
                          <span className="mb-0.5 block text-xs text-muted-foreground">{label}</span>
                          <Input value={sel.answers[label] ?? ""} onChange={(e) => setSel((s: any) => ({ ...s, answers: { ...s.answers, [label]: e.target.value } }))} />
                        </label>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-background p-3 text-sm">
                    <span className="font-bold text-xs uppercase tracking-wide text-muted-foreground">Quantidade</span>
                    <Input
                      type="number" min={1} className="w-24"
                      value={quantityText}
                      onChange={(e) => {
                        const value = e.target.value;
                        setQuantityText(value);
                        const next = Number(value);
                        if (Number.isInteger(next) && next >= 1) setClientQuantity(next);
                      }}
                      onBlur={() => {
                        const next = Number(quantityText);
                        setQuantityText(String(Number.isInteger(next) && next >= 1 ? next : sel.quantity));
                      }}
                    />
                    <span className="text-xs text-muted-foreground">Unidades do mesmo serviço.</span>
                  </div>

                  <div className="space-y-2 rounded-xl border border-border/70 bg-background p-3">
                    <h2 className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Distribuição para os profissionais</h2>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className={cn("rounded-lg border-2 px-3 py-1.5 text-xs font-semibold", (sel.delivery_groups ?? []).length === 1 ? "border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-300" : "border-slate-200 hover:border-violet-300 dark:border-slate-700")} onClick={() => setSel((s: any) => ({ ...s, delivery_groups: [s.quantity] }))}>
                        Mesmo profissional
                      </button>
                      <button type="button" disabled={sel.quantity <= 1} className={cn("rounded-lg border-2 px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50", (sel.delivery_groups ?? []).length > 1 ? "border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-300" : "border-slate-200 hover:border-violet-300 dark:border-slate-700")} onClick={useSeparateProfessionals}>
                        Profissionais diferentes
                      </button>
                    </div>
                    {(sel.delivery_groups ?? []).length > 1 && (
                      <div className="space-y-2 pt-1">
                        {(sel.delivery_groups ?? []).map((group: number, index: number) => (
                          <div key={index} className="flex items-center gap-2 text-xs">
                            <span className="w-14 text-muted-foreground">Tarefa {index + 1}</span>
                            <Input type="number" min={1} className="w-16 h-8" value={Number.isFinite(group) ? String(group) : ""} onChange={(e) => setDeliveryGroup(index, e.target.value)} />
                            <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => removeDeliveryGroup(index)}>Remover</Button>
                          </div>
                        ))}
                        <Button type="button" size="sm" variant="outline" className="h-7 text-xs" disabled={(sel.delivery_groups ?? []).every((g: number) => g <= 1)} onClick={addDeliveryGroup}>Adicionar tarefa</Button>
                      </div>
                    )}
                  </div>

                  {(clientProduct.available_periods ?? []).length > 0 && (
                    <div className="space-y-2 rounded-xl border border-border/70 bg-background p-3">
                      <h2 className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Modalidade de contratação</h2>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" className={cn("rounded-lg border-2 px-3 py-1.5 text-xs font-semibold", !period ? "border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-300" : "border-slate-200 hover:border-violet-300 dark:border-slate-700")} onClick={() => setPeriod(null)}>Avulso</button>
                        {clientProduct.available_periods.map((pp: any) => (
                          <button key={pp.period} type="button" className={cn("rounded-lg border-2 px-3 py-1.5 text-xs font-semibold", period === pp.period ? "border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-300" : "border-slate-200 hover:border-violet-300 dark:border-slate-700")} onClick={() => setPeriod(pp.period)}>
                            {PERIOD_LABEL[pp.period] ?? pp.period} {pp.discount_percent > 0 ? `(−${pp.discount_percent}%)` : ""}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5 rounded-xl border border-border/70 bg-background p-3 text-xs">
                    {!period ? (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Prazo · Preço comercial</span>
                        <span className="font-bold text-sm">{displayDeadline != null ? `${displayDeadline}d` : "a definir"} · {money(clientPricing?.commercial_price, clientPricing?.currency)}</span>
                      </div>
                    ) : !clientPeriodPricing?.available ? (
                      <p className="text-amber-600 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{(clientPeriodPricing?.quote_blockers ?? ["carregando…"]).join("; ")}</p>
                    ) : (
                      <>
                        <div className="flex items-center justify-between"><span className="text-muted-foreground">Total a pagar (antecipado)</span><span className="font-bold text-sm">{money(clientPeriodPricing.total_price, clientPeriodPricing.currency)}</span></div>
                        <div className="flex items-center justify-between text-muted-foreground"><span>Desconto do período</span><span>{clientPeriodPricing.discount_percent}%</span></div>
                      </>
                    )}
                    {(clientPricing?.notices ?? []).map((n: string, i: number) => <p key={i} className="text-amber-600 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{n}</p>)}
                    {clientSelErrors.map((er, i) => <p key={i} className="text-red-600">{er}</p>)}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="shrink-0 p-3 border-t border-border/50 space-y-2">
            {isClient && canBuy ? (
              <>
                <Button type="button" className="w-full gap-2 rounded-xl border-0 bg-gradient-to-r from-[#4a2cff] via-[#7b2cdb] to-[#d92293] text-white" disabled={busy || !clientProduct.can_configure || clientSelErrors.length > 0 || !!contractBlockedReason} onClick={addToCart} title={contractBlockedReason ?? ""}>
                  <ShoppingCart className="h-4 w-4" /> Adicionar à cesta
                </Button>
                <Button type="button" variant="outline" className="w-full" disabled={busy || !canQuote} onClick={generateQuote} title={canQuote ? "" : (config?.quote_blockers ?? []).join("; ")}>
                  Gerar pré-cotação
                </Button>
                {/* Achado do usuário 2026-09-23: botão confuso sem
                    explicação — diferença real pra "Adicionar à cesta". */}
                <p className="text-[11px] leading-snug text-muted-foreground">
                  Gera um documento de preço/prazo válido por 72h pra compartilhar ou negociar — não reserva nem contrata nada. Pra comprar de verdade, use "Adicionar à cesta".
                </p>
                {!canQuote && (config?.quote_blockers ?? []).length > 0 && <p className="text-[11px] text-muted-foreground">Sem cotação válida: {(config.quote_blockers ?? []).join("; ")}.</p>}
                {msg && <p className="text-xs text-blue-600">{msg}</p>}
              </>
            ) : adminCanCheckout ? (
              <>
                <Button type="button" className="w-full gap-2 rounded-xl border-0 bg-gradient-to-r from-[#4a2cff] via-[#7b2cdb] to-[#d92293] text-white" onClick={() => setShowAdminCheckout(true)}>
                  <ShoppingCart className="h-4 w-4" /> Contratar em nome de empresa/agência
                </Button>
                <p className="text-[11px] leading-snug text-muted-foreground">
                  Você está vendo como administrador — escolha a empresa/agência, o projeto e a forma de acerto (carteira, brinde ou link de pagamento) na próxima etapa.
                </p>
              </>
            ) : (
              <>
                <Button type="button" disabled className="w-full gap-2 rounded-xl bg-gradient-to-r from-slate-950 via-indigo-950 to-fuchsia-700 text-white" title={blockedReason ?? ""}>
                  <ShoppingCart className="h-4 w-4" />
                  {!isClient && selectedOption ? "Opção selecionada — contratação bloqueada" : "Selecione uma opção"}
                </Button>
                <p className="text-[11px] text-amber-700 dark:text-amber-400 flex items-start gap-1.5">
                  <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                  {blockedReason}
                </p>
              </>
            )}
          </div>
        </div>
      </div>
      {adminCanCheckout && (
        <AdminCheckoutModal
          open={showAdminCheckout}
          onClose={() => setShowAdminCheckout(false)}
          productId={productId}
          selection={{
            variation_option_keys: selectedOptionKeys,
            addon_keys: selectedAddonKeys,
            quantity: 1,
            delivery_groups: [1],
            answers: {},
          }}
          period={null}
        />
      )}
    </div>
  );
}
