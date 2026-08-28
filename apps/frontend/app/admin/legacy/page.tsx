"use client";

import { useCallback, useEffect, useState } from "react";
import { History, Search, Loader2, ChevronLeft, ChevronRight, Lock, X } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Consulta da Plataforma Anterior (sprint de produtos, bloco 1/6).
// SOMENTE LEITURA. Nenhum botão de editar/excluir/reativar/copiar/salvar.

const PENDING_TABS = [
  ["contas", "Contas"],
  ["compras", "Compras"],
  ["projetos", "Projetos"],
  ["tarefas", "Tarefas"],
  ["financeiro", "Financeiro"],
] as const;

const STATUS_LABEL: Record<string, string> = { ativo: "Ativo", inativo: "Inativo", arquivado: "Arquivado" };

export default function AdminConsultaLegadoPage() {
  const [summary, setSummary] = useState<any>(null);
  const [state, setState] = useState<"loading" | "ready" | "forbidden" | "not_configured" | "error">("loading");

  useEffect(() => {
    apiClient
      .getLegacySummary()
      .then((s) => {
        setSummary(s);
        setState("ready");
      })
      .catch((err: any) => {
        if (err?.status === 404) setState("forbidden");
        else if (err?.status === 503 || err?.data?.code === "legacy_not_configured") setState("not_configured");
        else setState("error");
      });
  }, []);

  if (state === "loading") {
    return <Centered><Loader2 className="h-5 w-5 animate-spin" /> Carregando…</Centered>;
  }
  if (state === "forbidden") {
    return (
      <Centered>
        <Lock className="h-5 w-5" />
        Esta área é exclusiva do Admin Master.
      </Centered>
    );
  }
  if (state === "not_configured") {
    return (
      <Centered>
        A Consulta da Plataforma Anterior não está configurada neste ambiente (banco legado ausente).
      </Centered>
    );
  }
  if (state === "error") {
    return <Centered>Não foi possível carregar a consulta. Tente novamente mais tarde.</Centered>;
  }

  const batch = summary?.batch;

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4 md:p-6">
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <h1 className="flex items-center gap-2 text-xl font-semibold text-neutral-900 dark:text-neutral-50">
            <History className="h-5 w-5" /> Legacy — Plataforma Anterior
          </h1>
          <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-[11px] font-medium text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300">
            Somente consulta
          </span>
        </div>
        <p className="text-sm text-neutral-500">
          Consulta somente leitura dos dados preservados da versão anterior da plataforma. Nenhuma alteração feita aqui
          modifica a plataforma atual.
        </p>
      </header>

      <Tabs defaultValue="resumo">
        <TabsList className="flex-wrap">
          <TabsTrigger value="resumo">Resumo</TabsTrigger>
          <TabsTrigger value="produtos">Produtos</TabsTrigger>
          {PENDING_TABS.map(([v, label]) => (
            <TabsTrigger key={v} value={v}>{label}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="resumo">
          <ResumoTab summary={summary} />
        </TabsContent>
        <TabsContent value="produtos">
          {batch ? <ProdutosTab batchId={batch.id} /> : <Empty text="Nenhuma fotografia importada ainda." />}
        </TabsContent>
        {PENDING_TABS.map(([v, label]) => (
          <TabsContent key={v} value={v}>
            <div className="mt-4 rounded-lg border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500 dark:border-neutral-700">
              {label}: <strong>Aguardando importação histórica</strong>.
              <br />
              A importação definitiva será feita quando o responsável reenviar os dados completos da plataforma anterior.
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function ResumoTab({ summary }: { summary: any }) {
  const b = summary?.batch;
  return (
    <div className="mt-4 space-y-4">
      {!b ? (
        <Empty text="Nenhuma fotografia importada ainda." />
      ) : (
        <>
          <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
            <div className="flex flex-wrap items-center gap-2">
              <strong>{b.source_name}</strong>
              {b.is_preview && <Badge className="bg-amber-100 text-amber-700">prévia local</Badge>}
              <Badge className={b.status === "completed" ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700"}>
                {b.status === "completed" ? "importação concluída" : b.status}
              </Badge>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
              <Info k="Ambiente de origem" v={b.source_environment} />
              <Info k="Data da fotografia" v={new Date(b.snapshot_at).toLocaleString("pt-BR")} />
              <Info k="Importado em" v={new Date(b.imported_at).toLocaleString("pt-BR")} />
              <Info k="Versão do importador" v={b.importer_version} />
              <Info k="Esperado / importado" v={`${b.expected_count} / ${b.imported_count}`} />
              <Info k="Checksum" v={b.checksum ? `${String(b.checksum).slice(0, 12)}…` : "—"} />
            </dl>
            {b.notes && <p className="mt-2 text-xs text-neutral-500">{b.notes}</p>}
          </div>

          <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">Quantidades reais</p>
            <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
              {Object.entries(summary.counts ?? {}).map(([k, v]) => (
                <div key={k} className="rounded bg-neutral-50 px-2 py-1 dark:bg-neutral-800">
                  {ENTITY_LABEL[k] ?? k}: <strong>{String(v)}</strong>
                </div>
              ))}
            </div>
            {summary.product_by_status && (
              <div className="mt-2 text-xs text-neutral-500">
                Produtos por situação:{" "}
                {Object.entries(summary.product_by_status).map(([k, v]) => `${STATUS_LABEL[k] ?? k}: ${v}`).join(" · ")}
              </div>
            )}
          </div>

          {b.reconciliation && Object.keys(b.reconciliation).length > 0 && (
            <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">Conferência origem × legado</p>
              <table className="w-full text-sm">
                <tbody>
                  {Object.entries(b.reconciliation).map(([k, r]: [string, any]) => (
                    <tr key={k} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800">
                      <td className="py-1">{ENTITY_LABEL[k] ?? k}</td>
                      <td className="py-1 text-right">{r.expected_source}</td>
                      <td className="py-1 text-right">{r.imported}</td>
                      <td className={`py-1 text-right ${r.divergence === 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {r.divergence === 0 ? "coerente" : `divergência ${r.divergence}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="rounded-lg bg-neutral-100 px-3 py-2 text-xs text-neutral-500 dark:bg-neutral-800">
            Nenhuma alteração feita aqui modifica a plataforma atual.
          </p>
        </>
      )}
    </div>
  );
}

const ENTITY_LABEL: Record<string, string> = {
  product: "Produtos",
  product_variation: "Variações",
  product_addon: "Adicionais",
  product_catalog_task: "Vínculos de tarefa-modelo",
  catalog_task: "Tarefas de catálogo",
  specialty: "Especialidades",
  relations: "Relações",
};

function ProdutosTab({ batchId }: { batchId: string }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [sortBy, setSortBy] = useState("title");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    apiClient
      .getLegacyProducts({ q, status, category, page, page_size: 20, sort_by: sortBy, sort_dir: sortDir })
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [q, status, category, page, sortBy, sortDir]);

  useEffect(() => {
    const t = setTimeout(load, q ? 350 : 0); // debounce só na busca
    return () => clearTimeout(t);
  }, [load, q]);

  useEffect(() => setPage(1), [q, status, category]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1;

  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-neutral-400" />
          <Input className="pl-8" placeholder="Buscar por código, nome ou descrição" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="rounded border border-neutral-300 bg-transparent px-2 py-1.5 text-sm dark:border-neutral-700" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Todas as situações</option>
          <option value="ativo">Ativo</option>
          <option value="inativo">Inativo</option>
        </select>
        <select className="rounded border border-neutral-300 bg-transparent px-2 py-1.5 text-sm dark:border-neutral-700" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">Todas as categorias</option>
          {(data?.available_categories ?? []).map((c: string) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          className="rounded border border-neutral-300 bg-transparent px-2 py-1.5 text-sm dark:border-neutral-700"
          value={`${sortBy}:${sortDir}`}
          onChange={(e) => {
            const [b, d] = e.target.value.split(":");
            setSortBy(b);
            setSortDir(d as "asc" | "desc");
          }}
        >
          <option value="title:asc">Nome A–Z</option>
          <option value="title:desc">Nome Z–A</option>
          <option value="original_code:asc">Código ↑</option>
          <option value="imported_at:desc">Importado recentemente</option>
        </select>
      </div>

      {loading ? (
        <Centered><Loader2 className="h-5 w-5 animate-spin" /> Carregando…</Centered>
      ) : error ? (
        <div className="py-8 text-center text-sm text-red-600">
          Erro ao carregar. <button className="underline" onClick={load}>Tentar de novo</button>
        </div>
      ) : !data || data.data.length === 0 ? (
        <Empty text="Nenhum produto histórico encontrado com esses filtros." />
      ) : (
        <>
          <p className="text-xs text-neutral-400">
            {data.total} produto(s) · <span className="rounded bg-neutral-100 px-1.5 py-0.5 dark:bg-neutral-800">Somente leitura</span>
          </p>
          <ul className="divide-y divide-neutral-100 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
            {data.data.map((p: any) => (
              <li key={p.id}>
                <button
                  className="flex w-full items-start justify-between gap-3 px-3 py-2.5 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                  onClick={() => setDetailId(p.id)}
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">{p.title ?? "(sem nome)"}</div>
                    <div className="text-xs text-neutral-500">
                      {p.original_code ?? "—"} · {p.search_category ?? "sem categoria"}
                      {p.sanitized && <span className="ml-1 text-amber-600">· sanitizado</span>}
                    </div>
                  </div>
                  <Badge className={p.original_status === "ativo" ? "bg-emerald-100 text-emerald-700" : "bg-neutral-100 text-neutral-600"}>
                    {STATUS_LABEL[p.original_status] ?? p.original_status ?? "—"}
                  </Badge>
                </button>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between text-sm">
            <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage((n) => n - 1)}>
              <ChevronLeft className="h-4 w-4" /> Anterior
            </Button>
            <span className="text-neutral-500">Página {page} de {totalPages}</span>
            <Button size="sm" variant="ghost" disabled={page >= totalPages} onClick={() => setPage((n) => n + 1)}>
              Próxima <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </>
      )}

      {detailId && <LegacyRecordDetail id={detailId} onClose={() => setDetailId(null)} />}
    </div>
  );
}

function LegacyRecordDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    apiClient.getLegacyRecord(id).then(setData).catch(() => setError(true));
  }, [id]);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4" role="dialog" aria-modal="true" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="absolute inset-0 bg-black/50" aria-hidden="true" />
      <div className="relative flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-neutral-900">
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-3 dark:border-neutral-800">
          <h2 className="font-semibold">Detalhe do registro histórico</h2>
          <button onClick={onClose} aria-label="Fechar" className="rounded p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4 text-sm">
          {error ? (
            <p className="text-red-600">Não foi possível carregar este registro.</p>
          ) : !data ? (
            <Centered><Loader2 className="h-5 w-5 animate-spin" /> Carregando…</Centered>
          ) : (
            <RecordBody data={data} />
          )}
        </div>
      </div>
    </div>
  );
}

function RecordBody({ data }: { data: any }) {
  const r = data.record;
  const c = r.content ?? {};
  const rel = data.relations_by_type ?? {};
  const na = <span className="text-neutral-400">Não disponível na fotografia</span>;

  return (
    <div className="space-y-4">
      <div>
        <div className="text-lg font-semibold">{r.title ?? na}</div>
        <div className="text-xs text-neutral-500">
          {r.original_code ?? "—"} · situação antiga: {STATUS_LABEL[r.original_status] ?? r.original_status ?? "—"} · id original:{" "}
          <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-800">{r.original_id}</code>
        </div>
        <div className="mt-1 text-xs text-neutral-400">
          Origem da fotografia: {data.batch?.source_name} ({data.batch?.source_environment}) ·{" "}
          {data.batch?.snapshot_at ? new Date(data.batch.snapshot_at).toLocaleString("pt-BR") : "—"}
          {r.sanitized && <span className="ml-1 text-amber-600">· {r.sanitized_fields?.length ?? 0} campo(s) sanitizado(s)</span>}
        </div>
      </div>

      <Section title="Descrição">{c.description || c.short_description || na}</Section>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        <KV k="Categoria" v={c.category} />
        <KV k="Preço base" v={c.base_price != null ? `R$ ${Number(c.base_price).toFixed(2)}` : null} />
        <KV k="Complexidade" v={c.complexity} />
        <KV k="Avaliação média" v={c.average_rating != null ? String(c.average_rating) : null} />
        <KV k="Contratações" v={c.contract_count != null ? String(c.contract_count) : null} />
        <KV k="Tempo de conclusão" v={c.completion_time} />
      </div>

      {Array.isArray(c.counts && Object.entries(c.counts)) && c.counts && (
        <Section title="Contagens">
          {Object.entries(c.counts).map(([k, v]) => `${k}: ${v}`).join(" · ")}
        </Section>
      )}

      <RelGroup title="Variações" items={rel.has_variation} />
      <RelGroup title="Adicionais" items={rel.has_addon} />
      <RelGroup title="Tarefas e etapas (modelo)" items={rel.has_catalog_task} />
      <RelGroup title="Categoria" items={rel.in_category} />

      <Section title="Imagens e portfólio">
        {c.image_ref || (c.demonstrations_refs?.length ?? 0) > 0 ? (
          <ul className="list-inside list-disc text-xs text-neutral-500">
            {c.image_ref && <li>Imagem: {c.image_ref.reference} — {c.image_ref.file_available_in_snapshot ? "disponível" : "arquivo não disponível na fotografia"}</li>}
            {(c.demonstrations_refs ?? []).map((d: any, i: number) => (
              <li key={i}>Portfólio: {d.reference} — arquivo não disponível na fotografia</li>
            ))}
          </ul>
        ) : (
          na
        )}
      </Section>

      <Section title="Datas">
        {r.dates && Object.keys(r.dates).length > 0
          ? Object.entries(r.dates).map(([k, v]) => `${k}: ${v ? new Date(String(v)).toLocaleString("pt-BR") : "—"}`).join(" · ")
          : na}
      </Section>

      <p className="rounded bg-neutral-100 px-2 py-1 text-xs text-neutral-500 dark:bg-neutral-800">Somente leitura.</p>
    </div>
  );
}

function RelGroup({ title, items }: { title: string; items?: any[] }) {
  if (!items || items.length === 0) return null;
  return (
    <Section title={`${title} (${items.length})`}>
      <ul className="list-inside list-disc text-xs">
        {items.map((it, i) => (
          <li key={i}>
            {it.record?.title ?? it.description ?? it.to_original_id}
            {it.record?.original_status ? ` — ${it.record.original_status}` : ""}
          </li>
        ))}
      </ul>
    </Section>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-neutral-500">{title}</p>
      <div className="text-sm">{children}</div>
    </div>
  );
}
function KV({ k, v }: { k: string; v: string | null | undefined }) {
  return (
    <div>
      <span className="text-xs text-neutral-500">{k}: </span>
      {v ? <span>{v}</span> : <span className="text-neutral-400">Não disponível na fotografia</span>}
    </div>
  );
}
function Info({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-xs text-neutral-500">{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}
function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center justify-center gap-2 py-12 text-sm text-neutral-500">{children}</div>;
}
function Empty({ text }: { text: string }) {
  return <div className="py-12 text-center text-sm text-neutral-400">{text}</div>;
}
