"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Boxes, Loader2, Lock, Search, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { ProductEditor } from "@/app/admin/produtos/novo-catalogo/product-editor";

// Novo catálogo — CONSTRUTOR administrativo (sprint de produtos, bloco 3/6).
// Só Admin Master (o backend reaplica). Não mostra os 162 produtos antigos.

const STATUS_LABEL: Record<string, string> = {
  em_preparacao: "Em preparação",
  disponivel: "Disponível",
  temporariamente_inativo: "Suspenso",
  arquivado: "Arquivado",
};
const STATUS_TONE: Record<string, string> = {
  em_preparacao: "bg-neutral-100 text-neutral-700",
  disponivel: "bg-emerald-100 text-emerald-700",
  temporariamente_inativo: "bg-amber-100 text-amber-700",
  arquivado: "bg-neutral-200 text-neutral-500",
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

  if (state === "loading") return <Centered><Loader2 className="h-5 w-5 animate-spin" /> Carregando…</Centered>;
  if (state === "forbidden") return <Centered><Lock className="h-5 w-5" /> Esta área é exclusiva do Admin Master neste momento.</Centered>;
  if (state === "error") return <Centered>Não foi possível carregar.</Centered>;

  if (openProductId) {
    return (
      <div className="mx-auto max-w-5xl p-4 md:p-6">
        <ProductEditor productId={openProductId} onBack={() => { setOpenProductId(null); void loadList(); void bootstrap(); }} />
      </div>
    );
  }

  const totalPages = list ? Math.max(1, Math.ceil(list.total / list.page_size)) : 1;
  const c = overview.counts;

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4 md:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3" data-tour-id="catalog2-admin-header">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2 text-xl font-semibold text-neutral-900 dark:text-neutral-50">
            <Boxes className="h-5 w-5" /> Novo catálogo
          </h1>
          <p className="text-sm text-neutral-500">
            Construtor do novo catálogo (separado do catálogo operacional atual, com 162 produtos, e do Legacy). Preço e
            prazo são sempre calculados no servidor.
          </p>
        </div>
        <a
          href="/admin/catalog2?preview=1"
          className="inline-flex items-center gap-1 rounded border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          Pré-visualizar como cliente
        </a>
      </header>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Stat k="Produtos (novo catálogo)" v={c.products} hint="nunca os 162 atuais" />
        <Stat k="Pilares" v={c.pillars} />
        <Stat k="Classificações 4F" v={c.four_f} />
        <Stat k="Categorias" v={c.categories} />
        <Stat k="Especialidades" v={c.specialties} />
        <Stat k="Versões em rascunho" v={c.draft_versions} />
      </div>

      {importSummary?.has_import && (
        <section className="space-y-2 rounded-lg border border-indigo-200 bg-indigo-50/50 p-3 dark:border-indigo-900 dark:bg-indigo-950/30">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-indigo-900 dark:text-indigo-200">Importação dos 36 produtos</h2>
            <span className="text-xs text-indigo-700 dark:text-indigo-300">
              {importSummary.count_matches_expected ? "✓ 36/36 importados" : `⚠ ${importSummary.total_imported}/36 importados`}
              {" · "}nenhum publicado ({importSummary.published_count} publicados)
            </span>
          </div>
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
                className={`rounded-full border px-2 py-0.5 text-[11px] ${pendency === k ? "border-indigo-500 bg-indigo-100 text-indigo-800" : "border-indigo-200 text-indigo-700"}`}
                onClick={() => setPendency((cur) => (cur === k ? "" : k))}
              >
                {PENDENCY_LABEL[k] ?? k}: {n as number}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-indigo-700/80 dark:text-indigo-300/80">
            Fonte principal <code>{importSummary.last_batch?.source_main?.name}</code> · checksum{" "}
            <code>{String(importSummary.last_batch?.source_main?.checksum ?? "").slice(0, 12)}…</code> · regra{" "}
            {importSummary.last_batch?.rule_version} · lote {importSummary.last_batch?.status}. Os 162 produtos operacionais
            seguem intactos.
          </p>
        </section>
      )}

      {readiness && <ReadinessPanel readiness={readiness} />}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-neutral-400" />
          <Input className="pl-8" placeholder="Buscar por nome ou slug" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="rounded border border-neutral-300 bg-transparent px-2 py-1.5 text-sm dark:border-neutral-700" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Todas as situações</option>
          {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select className="rounded border border-neutral-300 bg-transparent px-2 py-1.5 text-sm dark:border-neutral-700" value={pillarId} onChange={(e) => setPillarId(e.target.value)}>
          <option value="">Todos os pilares</option>{refs.pillars.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select className="rounded border border-neutral-300 bg-transparent px-2 py-1.5 text-sm dark:border-neutral-700" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">Todas as categorias</option>{refs.categories.map((c2) => <option key={c2.id} value={c2.id}>{c2.name}</option>)}
        </select>
        <select className="rounded border border-neutral-300 bg-transparent px-2 py-1.5 text-sm dark:border-neutral-700" value={origin} onChange={(e) => setOrigin(e.target.value)}>
          <option value="">Toda origem</option>
          <option value="existente">Só existentes</option>
          <option value="novo">Só novos</option>
          <option value="reativado">Só reativados</option>
        </select>
        <select className="rounded border border-neutral-300 bg-transparent px-2 py-1.5 text-sm dark:border-neutral-700" value={roseReviewed} onChange={(e) => setRoseReviewed(e.target.value)}>
          <option value="">Revisão da Rose (todas)</option>
          <option value="true">Revisado pela Rose</option>
          <option value="false">Sem revisão da Rose</option>
        </select>
        <select className="rounded border border-neutral-300 bg-transparent px-2 py-1.5 text-sm dark:border-neutral-700" value={reviewState} onChange={(e) => setReviewState(e.target.value)}>
          <option value="">Estado de preparo (todos)</option>
          {Object.entries(REVIEW_STATE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select className="rounded border border-neutral-300 bg-transparent px-2 py-1.5 text-sm dark:border-neutral-700" value={pendency} onChange={(e) => setPendency(e.target.value)}>
          <option value="">Tipo de pendência (todas)</option>
          {Object.entries(PENDENCY_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select className="rounded border border-neutral-300 bg-transparent px-2 py-1.5 text-sm dark:border-neutral-700" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="name">Nome A–Z</option>
          <option value="name_desc">Nome Z–A</option>
          <option value="updated">Alterado recentemente</option>
          <option value="created">Criado recentemente</option>
        </select>
        <Button data-tour-id="catalog2-admin-create" size="sm" onClick={() => setConfirm({ title: "Criar produto", message: "Um novo produto (em preparação) com uma versão rascunho será criado.", onConfirm: () => createProduct() })}>
          <Plus className="h-4 w-4" /> Criar produto
        </Button>
      </div>

      {msg && <p className="text-sm text-blue-600">{msg}</p>}

      {listLoading ? (
        <Centered><Loader2 className="h-5 w-5 animate-spin" /> Carregando…</Centered>
      ) : !list || list.data.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500 dark:border-neutral-700">
          {overview.is_empty ? overview.empty_message : "Nenhum produto com esses filtros."}
        </div>
      ) : (
        <>
          <ul className="divide-y divide-neutral-100 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
            {list.data.map((p) => (
              <li key={p.id} className="px-3 py-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button className="min-w-0 text-left" onClick={() => setOpenProductId(p.id)}>
                    <div className="truncate font-medium hover:underline">
                      {p.source_index ? <span className="text-neutral-400">#{p.source_index} </span> : null}
                      {p.internal_name}
                    </div>
                    <div className="text-xs text-neutral-500">
                      {p.slug} · {p.pillar?.name ?? "sem pilar"} · {p.category?.name ?? "sem categoria"}
                      {p.origin ? ` · ${p.origin}` : ""}
                      {p.published_version_number ? ` · v${p.published_version_number} publicada` : " · sem versão publicada"}
                      {p.has_draft ? " · rascunho" : ""}
                      {p.published_at ? ` · ${new Date(p.published_at).toLocaleDateString("pt-BR")}` : ""}
                      {` · alterado ${new Date(p.updated_at).toLocaleDateString("pt-BR")}`}
                    </div>
                    {p.imported && (
                      <div className="mt-1 flex flex-wrap items-center gap-1">
                        <Badge className={p.rose_reviewed ? "bg-purple-100 text-purple-700" : "bg-neutral-100 text-neutral-600"}>
                          {p.rose_reviewed ? "Rose ✓" : "Rose pendente"}
                        </Badge>
                        {p.review_state && p.review_state !== "ready_for_final_review" && (
                          <Badge className="bg-amber-100 text-amber-700">{REVIEW_STATE_LABEL[p.review_state] ?? p.review_state}</Badge>
                        )}
                        {p.review_state === "ready_for_final_review" && (
                          <Badge className="bg-emerald-100 text-emerald-700">Pronto p/ revisão final</Badge>
                        )}
                        {(p.pendencies ?? []).map((pk: string) => (
                          <Badge key={pk} className="bg-orange-50 text-orange-700">{PENDENCY_LABEL[pk] ?? pk}</Badge>
                        ))}
                        {p.human_edited && <Badge className="bg-sky-100 text-sky-700">editado por humano</Badge>}
                      </div>
                    )}
                  </button>
                  <div className="flex items-center gap-1.5">
                    {p.is_new && <Badge className="bg-emerald-100 text-emerald-700">Novo</Badge>}
                    <Badge className={STATUS_TONE[p.status] ?? "bg-neutral-100"}>{STATUS_LABEL[p.status] ?? p.status}</Badge>
                    <Button size="sm" variant="outline" onClick={() => setOpenProductId(p.id)}>Abrir</Button>
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
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between text-sm">
            <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage((n) => n - 1)}><ChevronLeft className="h-4 w-4" /> Anterior</Button>
            <span className="text-neutral-500">Página {page} de {totalPages} · {list.total} produto(s)</span>
            <Button size="sm" variant="ghost" disabled={page >= totalPages} onClick={() => setPage((n) => n + 1)}>Próxima <ChevronRight className="h-4 w-4" /></Button>
          </div>
        </>
      )}

      <p className="rounded-lg bg-neutral-100 px-3 py-2 text-xs text-neutral-500 dark:bg-neutral-800">
        Esta tela não substitui o catálogo operacional atual. Os 162 produtos de hoje continuam intactos. Os 36 produtos
        da planilha ainda não foram importados.
      </p>

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

function Stat({ k, v, hint }: { k: string; v: number | string; hint?: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
      <div className="text-2xl font-semibold">{v}</div>
      <div className="text-xs text-neutral-500">{k}</div>
      {hint && <div className="text-[10px] text-neutral-400">{hint}</div>}
    </div>
  );
}
function SummaryCell({ k, v }: { k: string; v: number | string }) {
  return (
    <div className="rounded border border-indigo-200/60 bg-white/60 px-2 py-1 dark:border-indigo-900 dark:bg-transparent">
      <div className="font-semibold text-indigo-900 dark:text-indigo-200">{v}</div>
      <div className="text-[10px] text-indigo-700/80 dark:text-indigo-300/70">{k}</div>
    </div>
  );
}
function ReadinessPanel({ readiness }: { readiness: any }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="space-y-2 rounded-lg border border-teal-200 bg-teal-50/50 p-3 dark:border-teal-900 dark:bg-teal-950/20">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-teal-900 dark:text-teal-200">Prontidão para o catálogo do cliente</h2>
        <span className="text-xs text-teal-700 dark:text-teal-300">
          {readiness.ready_for_client}/{readiness.total} prontos · {readiness.client_visible_now} visíveis agora ·{" "}
          {readiness.with_blockers} com bloqueador
        </span>
      </div>
      <p className="text-[11px] text-teal-700/80 dark:text-teal-300/80">{readiness.note}</p>
      <button className="text-xs font-medium text-teal-700 underline" onClick={() => setOpen((o) => !o)}>
        {open ? "Ocultar detalhamento" : "Ver detalhamento por produto"}
      </button>
      {open && (
        <div className="max-h-80 overflow-y-auto rounded border border-teal-200/60 dark:border-teal-900">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-teal-50 dark:bg-teal-950/40">
              <tr>
                <th className="p-1.5">#</th><th className="p-1.5">Produto</th>
                <th className="p-1.5">Bloqueadores</th><th className="p-1.5">Pendências</th>
              </tr>
            </thead>
            <tbody>
              {readiness.products.map((p: any) => (
                <tr key={p.id} className="border-t border-teal-200/40 dark:border-teal-900/60">
                  <td className="p-1.5 text-neutral-400">{p.source_index ?? "—"}</td>
                  <td className="p-1.5">{p.name}</td>
                  <td className="p-1.5">
                    {p.blockers.length === 0
                      ? <Badge className="bg-emerald-100 text-emerald-700">nenhum</Badge>
                      : p.blockers.map((b: string) => <Badge key={b} className="mr-1 bg-red-100 text-red-700">{b}</Badge>)}
                  </td>
                  <td className="p-1.5">
                    {p.pendings.map((b: string) => <Badge key={b} className="mr-1 bg-amber-100 text-amber-700">{b}</Badge>)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center justify-center gap-2 py-12 text-sm text-neutral-500">{children}</div>;
}
