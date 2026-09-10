"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Boxes, Loader2, Lock, Search, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { ProductEditor } from "@/app/admin/produtos/novo-catalogo/product-editor";

// Preparação de Produtos — área administrativa dos produtos finais da
// plataforma (catalog2) antes da publicação. NÃO é um segundo catálogo.
// Só Admin Master (o backend reaplica). Não mostra os 162 produtos antigos.
// Rota /admin/produtos/novo-catalogo mantida por ora (deep links).

const STATUS_LABEL: Record<string, string> = {
  em_preparacao: "Em preparação",
  disponivel: "Disponível",
  temporariamente_inativo: "Suspenso",
  arquivado: "Arquivado",
};
// Pequenos acentos de status — chips sólidos legíveis nos dois temas.
const STATUS_TONE: Record<string, string> = {
  em_preparacao: "bg-muted text-muted-foreground",
  disponivel: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  temporariamente_inativo: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  arquivado: "bg-muted text-muted-foreground",
};

// Estados de preparo e pendências da importação dos 36 (bloco 4/6).
const REVIEW_STATE_LABEL: Record<string, string> = {
  importado: "Importado",
  content_review_pending: "Revisar conteúdo",
  classification_decision_pending: "Decidir classificação",
  price_pending: "Definir preço",
  deadline_pending: "Definir prazo comercial",
  portfolio_pending: "Falta portfólio",
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
  rose_review_pending: "revisão Rose",
};

export default function AdminNovoCatalogoPage() {
  const [state, setState] = useState<"loading" | "ready" | "forbidden" | "error">("loading");
  const [overview, setOverview] = useState<any>(null);
  const [refs, setRefs] = useState<{ pillars: any[]; categories: any[] }>({ pillars: [], categories: [] });
  const [openProductId, setOpenProductId] = useState<string | null>(null);

  // filtros/listagem (preservados ao voltar do editor)
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [pillarId, setPillarId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [origin, setOrigin] = useState("");
  const [roseReviewed, setRoseReviewed] = useState("");
  const [reviewState, setReviewState] = useState("");
  const [pendency, setPendency] = useState("");
  const [sort, setSort] = useState("name");
  const [importSummary, setImportSummary] = useState<any>(null);
  const [readiness, setReadiness] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [list, setList] = useState<{ data: any[]; total: number; page_size: number } | null>(null);
  const [listLoading, setListLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

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
  useEffect(() => { void bootstrap(); }, [bootstrap]);

  const loadList = useCallback(async () => {
    setListLoading(true);
    try {
      const r = await apiClient.getCatalog2Products({
        q, status, pillar_id: pillarId, category_id: categoryId,
        origin, rose_reviewed: roseReviewed, review_state: reviewState, pendency,
        sort, page, page_size: 15,
      });
      setList(r);
    } catch {
      setList({ data: [], total: 0, page_size: 15 });
    } finally {
      setListLoading(false);
    }
  }, [q, status, pillarId, categoryId, origin, roseReviewed, reviewState, pendency, sort, page]);

  useEffect(() => {
    if (state !== "ready" || openProductId) return;
    const t = setTimeout(loadList, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [state, openProductId, loadList, q]);

  useEffect(() => setPage(1), [q, status, pillarId, categoryId, origin, roseReviewed, reviewState, pendency, sort]);

  async function rowAction(fn: () => Promise<any>, ok: string) {
    setMsg(null);
    try { await fn(); setMsg(ok); await loadList(); await bootstrap(); }
    catch (e: any) { setMsg(e?.message ?? "Falha."); }
  }

  if (state === "loading") return <Shell><Centered><Loader2 className="h-5 w-5 animate-spin" /> Carregando…</Centered></Shell>;
  if (state === "forbidden") return <Shell><Centered><Lock className="h-5 w-5" /> Esta área é exclusiva do Admin Master neste momento.</Centered></Shell>;
  if (state === "error") return <Shell><Centered>Não foi possível carregar.</Centered></Shell>;

  if (openProductId) {
    return (
      <Shell>
        <ProductEditor productId={openProductId} onBack={() => { setOpenProductId(null); void loadList(); void bootstrap(); }} />
      </Shell>
    );
  }

  const totalPages = list ? Math.max(1, Math.ceil(list.total / list.page_size)) : 1;
  const c = overview.counts;
  const advancedFilters = [pillarId, categoryId, origin, roseReviewed, reviewState, pendency].filter(Boolean).length;

  return (
    <Shell>
      <div className="space-y-5">
        <header className="flex flex-wrap items-start justify-between gap-3" data-tour-id="catalog2-admin-header">
          <div className="space-y-1">
            <h1 className="flex items-center gap-2 text-xl font-semibold text-foreground">
              <Boxes className="h-5 w-5" /> Preparação de Produtos
            </h1>
            <p className="text-sm text-muted-foreground">
              Preparação dos produtos finais da plataforma antes da publicação — cadastro de tarefas, etapas, prazos e
              preço. Não é um segundo catálogo.
            </p>
          </div>
          <a
            href="/admin/catalog2?preview=1"
            className="inline-flex items-center gap-1 rounded-md border bg-background px-3 py-1.5 text-sm text-foreground hover:bg-muted"
          >
            Pré-visualizar como cliente
          </a>
        </header>

        {/* Resumo de status ÚNICO. Fundo neutro sólido, sem repetir o estado
            nos cards/blocos abaixo. */}
        <p className="rounded-lg bg-muted px-3 py-2 text-sm text-foreground">
          Estes são os produtos finais da plataforma, ainda <strong>em preparação</strong>. Para publicar cada um:
          tarefas, etapas, prazos, precificação e revisão final. O catálogo operacional atual, com 162 produtos, não é
          afetado — ainda há projetos ativos ligados a ele.
        </p>

        {/* Todos os números vêm de `overview.counts` (contagem real das tabelas
            catalog2). O produto de demonstração ("[TESTE LOCAL] …") não entra
            nas contagens de avanço dos produtos finais importados. */}
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-3">
            <Stat k="Importados (finais)" v={c.final_imported_products ?? c.imported_products ?? 0}
              hint={`não conta os 162 operacionais${c.test_local_products ? ` · + ${c.test_local_products} de demonstração, fora da contagem` : ""}`} />
            <Stat k="Em preparação" v={c.products_in_preparation ?? 0} />
            <Stat k="Publicados" v={c.products_published ?? 0} tone={(c.products_published ?? 0) > 0 ? "ok" : undefined} />
            <Stat k="Tarefas (nos importados)" v={c.tasks_in_final_imported ?? 0} hint={`${c.tasks ?? 0} no catálogo todo`} />
            <Stat k="Etapas (nos importados)" v={c.steps_in_final_imported ?? 0} hint={`${c.steps ?? 0} no catálogo todo`} />
            <Stat k="Com pendências" v={c.products_with_pendencies ?? 0} tone={(c.products_with_pendencies ?? 0) > 0 ? "warn" : undefined} />
          </div>
          <details className="rounded-lg border">
            <summary className="cursor-pointer select-none px-3 py-2 text-xs font-medium text-muted-foreground">
              Estrutura do catálogo
            </summary>
            <div className="grid grid-cols-2 gap-px overflow-hidden border-t bg-border sm:grid-cols-3">
              <Stat k="Produtos (total)" v={c.products} hint="importados + demonstração" />
              <Stat k="Pilares" v={c.pillars} />
              <Stat k="Classificações 4F" v={c.four_f} />
              <Stat k="Categorias" v={c.categories} />
              <Stat k="Especialidades" v={c.specialties} />
              <Stat k="Versões em rascunho" v={c.draft_versions} />
            </div>
          </details>
        </div>

        {importSummary?.has_import && (
          <details className="rounded-lg border">
            <summary className="flex cursor-pointer select-none flex-wrap items-center justify-between gap-2 px-3 py-2">
              <h2 className="text-sm font-semibold text-foreground">Importação de produtos definitivos</h2>
              <span className="text-xs text-muted-foreground">
                {/* Números vêm da importação real (importSummary), nunca de "36" fixo. */}
                {importSummary.count_matches_expected
                  ? `✓ ${importSummary.total_imported}/${importSummary.expected ?? importSummary.total_imported} importados`
                  : `⚠ ${importSummary.total_imported}/${importSummary.expected ?? importSummary.total_imported} importados`}
                {" · "}{importSummary.published_count} publicado(s)
              </span>
            </summary>
            <div className="space-y-2 border-t p-3 text-muted-foreground">
              <p className="text-xs">
                {overview.import?.message ??
                  `${overview.counts.final_imported_products ?? importSummary.total_imported} produto(s) importado(s) para preparação. Aguardando tarefas, prazos, precificação e revisão para publicação.`}
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                <SummaryCell k="Revisados pela Rose" v={`${importSummary.rose_reviewed} / ${importSummary.total_imported}`} />
                <SummaryCell k="Sem revisão da Rose" v={importSummary.not_rose_reviewed} />
                <SummaryCell k="Decisões pendentes" v={importSummary.decisions_pending} />
                <SummaryCell k="Editados por humano" v={importSummary.human_edited} />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(importSummary.by_pendency ?? {}).map(([k, n]) => (
                  <button
                    key={k}
                    className={`rounded-full border px-2 py-0.5 text-[11px] ${pendency === k ? "border-foreground bg-muted text-foreground" : "text-muted-foreground hover:bg-muted"}`}
                    onClick={() => setPendency((cur) => (cur === k ? "" : k))}
                  >
                    {PENDENCY_LABEL[k] ?? k}: {n as number}
                  </button>
                ))}
              </div>
              <p className="text-[11px]">
                Fonte principal <code>{importSummary.last_batch?.source_main?.name}</code> · checksum{" "}
                <code>{String(importSummary.last_batch?.source_main?.checksum ?? "").slice(0, 12)}…</code> · regra{" "}
                {importSummary.last_batch?.rule_version} · lote {importSummary.last_batch?.status}. Os 162 produtos
                operacionais seguem intactos.
              </p>
            </div>
          </details>
        )}

        {readiness && <ReadinessPanel readiness={readiness} />}

        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-8" placeholder="Buscar por nome ou slug" aria-label="Buscar produtos" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <label className="sr-only" htmlFor="f-status">Situação</label>
            <select id="f-status" className={SELECT_CLS} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Todas as situações</option>
              {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <label className="sr-only" htmlFor="f-sort">Ordenar</label>
            <select id="f-sort" className={SELECT_CLS} value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="name">Nome A–Z</option>
              <option value="name_desc">Nome Z–A</option>
              <option value="updated">Alterado recentemente</option>
              <option value="created">Criado recentemente</option>
            </select>
            <Button data-tour-id="catalog2-admin-create" size="sm" onClick={() => setConfirm({ title: "Criar produto", message: "Um novo produto (em preparação) com uma versão rascunho será criado.", onConfirm: () => createProduct() })}>
              <Plus className="h-4 w-4" /> Criar produto
            </Button>
          </div>

          <details className="rounded-lg border">
            <summary className="cursor-pointer select-none px-3 py-2 text-xs font-medium text-muted-foreground">
              Mais filtros{advancedFilters > 0 ? ` (${advancedFilters} ativo${advancedFilters > 1 ? "s" : ""})` : ""}
            </summary>
            <div className="flex flex-wrap gap-2 border-t p-3">
              <label className="sr-only" htmlFor="f-pillar">Pilar</label>
              <select id="f-pillar" className={SELECT_CLS} value={pillarId} onChange={(e) => setPillarId(e.target.value)}>
                <option value="">Todos os pilares</option>{refs.pillars.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <label className="sr-only" htmlFor="f-cat">Categoria</label>
              <select id="f-cat" className={SELECT_CLS} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">Todas as categorias</option>{refs.categories.map((c2) => <option key={c2.id} value={c2.id}>{c2.name}</option>)}
              </select>
              <label className="sr-only" htmlFor="f-origin">Origem</label>
              <select id="f-origin" className={SELECT_CLS} value={origin} onChange={(e) => setOrigin(e.target.value)}>
                <option value="">Toda origem</option>
                <option value="existente">Só existentes</option>
                <option value="novo">Só novos</option>
                <option value="reativado">Só reativados</option>
              </select>
              <label className="sr-only" htmlFor="f-rose">Revisão da Rose</label>
              <select id="f-rose" className={SELECT_CLS} value={roseReviewed} onChange={(e) => setRoseReviewed(e.target.value)}>
                <option value="">Revisão da Rose (todas)</option>
                <option value="true">Revisado pela Rose</option>
                <option value="false">Sem revisão da Rose</option>
              </select>
              <label className="sr-only" htmlFor="f-review">Estado de preparo</label>
              <select id="f-review" className={SELECT_CLS} value={reviewState} onChange={(e) => setReviewState(e.target.value)}>
                <option value="">Estado de preparo (todos)</option>
                {Object.entries(REVIEW_STATE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <label className="sr-only" htmlFor="f-pend">Tipo de pendência</label>
              <select id="f-pend" className={SELECT_CLS} value={pendency} onChange={(e) => setPendency(e.target.value)}>
                <option value="">Tipo de pendência (todas)</option>
                {Object.entries(PENDENCY_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </details>
        </div>

        {msg && <p className="text-sm text-blue-600 dark:text-blue-400">{msg}</p>}

        {listLoading ? (
          <Centered><Loader2 className="h-5 w-5 animate-spin" /> Carregando…</Centered>
        ) : !list || list.data.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            {overview.is_empty ? overview.empty_message : "Nenhum produto com esses filtros."}
          </div>
        ) : (
          <>
            <ul className="divide-y rounded-lg border">
              {list.data.map((p) => {
              const readyLabel = p.imported
                ? (p.review_state === "ready_for_final_review"
                    ? "Pronto p/ revisão final"
                    : (REVIEW_STATE_LABEL[p.review_state] ?? "Em preparação"))
                : null;
              const pend: string[] = p.pendencies ?? [];
              const tech = [
                `slug ${p.slug}`,
                p.source_index ? `origem #${p.source_index}` : null,
                p.origin || null,
                p.published_version_number ? `v${p.published_version_number} publicada` : "sem versão publicada",
                p.has_draft ? "rascunho aberto" : null,
                p.published_at ? `publicado ${new Date(p.published_at).toLocaleDateString("pt-BR")}` : null,
                `alterado ${new Date(p.updated_at).toLocaleDateString("pt-BR")}`,
              ].filter(Boolean).join(" · ");
              return (
                <li key={p.id} className="px-3 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <button className="text-left font-medium hover:underline" onClick={() => setOpenProductId(p.id)}>
                        {p.internal_name}
                      </button>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {p.category?.name ?? "sem categoria"} · {p.pillar?.name ?? "sem pilar"}
                        {readyLabel ? ` · ${readyLabel}` : ""}
                        {p.imported ? ` · ${pend.length} pendência(s)` : ""}
                      </div>
                      {p.imported && (pend.length > 0 || !p.rose_reviewed || p.human_edited) && (
                        <div className="mt-1 flex flex-wrap items-center gap-1">
                          {!p.rose_reviewed && <Badge className="bg-muted text-muted-foreground">Rose pendente</Badge>}
                          {pend.slice(0, 4).map((pk: string) => (
                            <Badge key={pk} className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">{PENDENCY_LABEL[pk] ?? pk}</Badge>
                          ))}
                          {pend.length > 4 && <span className="text-[11px] text-muted-foreground">+{pend.length - 4}</span>}
                          {p.human_edited && <Badge className="bg-muted text-muted-foreground">editado por humano</Badge>}
                        </div>
                      )}
                      <RowTechDetails text={tech} />
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <div className="flex items-center gap-1.5">
                        {p.is_new && <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">Novo</Badge>}
                        <Badge className={STATUS_TONE[p.status] ?? "bg-muted text-muted-foreground"}>{STATUS_LABEL[p.status] ?? p.status}</Badge>
                        <Button size="sm" onClick={() => setOpenProductId(p.id)}>
                          {p.has_draft ? "Continuar configuração" : "Abrir"}
                        </Button>
                      </div>
                      <div className="flex flex-wrap items-center justify-end gap-1">
                        {p.published_version_number && !p.has_draft && (
                          <Button size="sm" variant="ghost" onClick={() => rowAction(() => apiClient.newCatalog2Version(p.id), "Nova versão rascunho criada.")}>Nova versão</Button>
                        )}
                        {p.status === "disponivel" && (
                          <Button size="sm" variant="ghost" onClick={() => rowAction(() => apiClient.setCatalog2ProductStatus(p.id, "temporariamente_inativo"), "Oferta suspensa.")}>Suspender</Button>
                        )}
                        {p.status === "temporariamente_inativo" && (
                          <Button size="sm" variant="ghost" onClick={() => rowAction(() => apiClient.setCatalog2ProductStatus(p.id, "disponivel"), "Oferta reativada.")}>Ativar</Button>
                        )}
                        {p.status !== "arquivado" && (
                          <Button size="sm" variant="ghost" className="text-red-600" onClick={() => setConfirm({ title: "Arquivar produto?", message: "O produto sai do catálogo. O histórico é preservado; nada é apagado.", onConfirm: () => rowAction(() => apiClient.archiveCatalog2Product(p.id), "Produto arquivado.") })}>Arquivar</Button>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
            <div className="flex items-center justify-between text-sm">
              <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage((n) => n - 1)}><ChevronLeft className="h-4 w-4" /> Anterior</Button>
              <span className="text-muted-foreground">Página {page} de {totalPages} · {list.total} produto(s)</span>
              <Button size="sm" variant="ghost" disabled={page >= totalPages} onClick={() => setPage((n) => n + 1)}>Próxima <ChevronRight className="h-4 w-4" /></Button>
            </div>
          </>
        )}

        {confirm && (
          <ConfirmationDialog
            open
            onClose={() => setConfirm(null)}
            title={confirm.title}
            message={confirm.message}
            confirmText="Confirmar"
            destructive={false}
            onConfirm={() => { confirm.onConfirm(); setConfirm(null); }}
          />
        )}
      </div>
    </Shell>
  );

  async function createProduct() {
    setMsg(null);
    try {
      const name = window.prompt("Nome interno do produto:");
      if (!name) return;
      const p = await apiClient.createCatalog2Product({ internal_name: name });
      await bootstrap();
      setOpenProductId(p.id);
    } catch (e: any) {
      setMsg(e?.message ?? "Falha ao criar.");
    }
  }
}

// Superfície padrão da plataforma: painel sólido (bg-card) ocupando a largura
// útil do <main>, sem max-w e sem transparências que deixem o fundo do shell
// interferir na leitura.
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-4 text-card-foreground shadow-sm sm:p-6">
      {children}
    </div>
  );
}

// Select padrão — superfície sólida, borda e texto por token (contraste alto
// nos dois temas).
const SELECT_CLS =
  "rounded-md border bg-background px-2 py-1.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

// Detalhe técnico da linha (slug, origem, versões, datas) — fora da leitura
// principal, atrás de um botão acessível por teclado.
function RowTechDetails({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-1 text-[11px] text-muted-foreground">
      <button type="button" aria-expanded={open} className="underline decoration-dotted" onClick={() => setOpen((o) => !o)}>
        Detalhes técnicos
      </button>
      {open && <div className="mt-0.5">{text}</div>}
    </div>
  );
}

// Indicador — sem card colorido; célula neutra dentro de um painel único.
// Um acento pequeno de status (ok/warn) só quando faz sentido.
function Stat({ k, v, hint, tone }: { k: string; v: number | string; hint?: string; tone?: "ok" | "warn" }) {
  const toneCls =
    tone === "ok" ? "text-emerald-700 dark:text-emerald-300"
      : tone === "warn" ? "text-amber-700 dark:text-amber-300"
        : "text-foreground";
  return (
    <div className="bg-card p-3">
      <div className={`text-lg font-semibold ${toneCls}`}>{v}</div>
      <div className="text-xs text-muted-foreground">{k}</div>
      {hint && <div className="text-[10px] text-muted-foreground/80">{hint}</div>}
    </div>
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
        <h2 className="text-sm font-semibold text-foreground">Prontidão para o catálogo do cliente</h2>
        <span className="text-xs text-muted-foreground">
          {readiness.ready_for_client}/{readiness.total} prontos · {readiness.client_visible_now} visíveis agora ·{" "}
          {readiness.with_blockers} com bloqueador
        </span>
      </summary>
      <div className="space-y-2 border-t p-3">
        <p className="text-[11px] text-muted-foreground">{readiness.note}</p>
        <button className="text-xs font-medium text-foreground underline" onClick={() => setOpen((o) => !o)}>
          {open ? "Ocultar detalhamento" : "Ver detalhamento por produto"}
        </button>
        {open && (
          <div className="max-h-80 overflow-y-auto rounded border">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-muted text-muted-foreground">
                <tr>
                  <th className="p-1.5">#</th><th className="p-1.5">Produto</th>
                  <th className="p-1.5">Bloqueadores</th><th className="p-1.5">Pendências</th>
                </tr>
              </thead>
              <tbody>
                {readiness.products.map((p: any) => (
                  <tr key={p.id} className="border-t">
                    <td className="p-1.5 text-muted-foreground">{p.source_index ?? "—"}</td>
                    <td className="p-1.5 text-foreground">{p.name}</td>
                    <td className="p-1.5">
                      {p.blockers.length === 0
                        ? <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">nenhum</Badge>
                        : p.blockers.map((b: string) => <Badge key={b} className="mr-1 bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200">{b}</Badge>)}
                    </td>
                    <td className="p-1.5">
                      {p.pendings.map((b: string) => <Badge key={b} className="mr-1 bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">{b}</Badge>)}
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
  return <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">{children}</div>;
}
