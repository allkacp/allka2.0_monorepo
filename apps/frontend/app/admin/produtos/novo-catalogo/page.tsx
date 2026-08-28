"use client";

import { useCallback, useEffect, useState } from "react";
import { Boxes, Loader2, Lock, ChevronRight, X } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// Novo catálogo — TELA DE VALIDAÇÃO (sprint de produtos, bloco 2/6).
// Só Admin Master. Não é o construtor visual (isso é o bloco 3). Serve para
// ver que a estrutura nova existe e está separada do catálogo atual.

const STATUS_LABEL: Record<string, string> = {
  em_preparacao: "Em preparação",
  disponivel: "Disponível",
  temporariamente_inativo: "Temporariamente inativo",
  arquivado: "Arquivado",
};
const STATUS_TONE: Record<string, string> = {
  em_preparacao: "bg-neutral-100 text-neutral-700",
  disponivel: "bg-emerald-100 text-emerald-700",
  temporariamente_inativo: "bg-amber-100 text-amber-700",
  arquivado: "bg-neutral-200 text-neutral-500",
};

export default function AdminNovoCatalogoPage() {
  const [state, setState] = useState<"loading" | "ready" | "forbidden" | "error">("loading");
  const [overview, setOverview] = useState<any>(null);
  const [pillars, setPillars] = useState<any[]>([]);
  const [fourF, setFourF] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [specialties, setSpecialties] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [detailId, setDetailId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [ov, pl, ff, cat, sp, prods] = await Promise.all([
        apiClient.getCatalog2Overview(),
        apiClient.getCatalog2Pillars(),
        apiClient.getCatalog2FourF(),
        apiClient.getCatalog2Categories(),
        apiClient.getCatalog2Specialties(),
        apiClient.getCatalog2Products(),
      ]);
      setOverview(ov);
      setPillars(pl.data);
      setFourF(ff.data);
      setCategories(cat.data);
      setSpecialties(sp.data);
      setProducts(prods.data);
      setState("ready");
    } catch (err: any) {
      if (err?.status === 404) setState("forbidden");
      else setState("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (state === "loading") return <Centered><Loader2 className="h-5 w-5 animate-spin" /> Carregando…</Centered>;
  if (state === "forbidden")
    return (
      <Centered>
        <Lock className="h-5 w-5" /> Esta área é exclusiva do Admin Master neste momento.
      </Centered>
    );
  if (state === "error") return <Centered>Não foi possível carregar. Tente novamente mais tarde.</Centered>;

  const c = overview.counts;

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4 md:p-6">
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-xl font-semibold text-neutral-900 dark:text-neutral-50">
          <Boxes className="h-5 w-5" /> Novo catálogo — fundação
        </h1>
        <p className="text-sm text-neutral-500">
          Arquitetura limpa e versionada que receberá os 36 produtos definitivos. Separada do catálogo operacional atual
          (162 produtos) e do banco Legacy. O construtor visual completo vem no próximo bloco.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Stat k="Produtos (novo catálogo)" v={c.products} hint="nunca os 162 atuais" />
        <Stat k="Pilares" v={c.pillars} />
        <Stat k="Classificações 4F" v={c.four_f} />
        <Stat k="Categorias" v={c.categories} />
        <Stat k="Especialidades" v={c.specialties} />
        <Stat k="Versões em rascunho" v={c.draft_versions} />
      </div>

      {overview.is_empty ? (
        <div className="rounded-lg border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500 dark:border-neutral-700">
          {overview.empty_message}
        </div>
      ) : (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">Produtos e situações</h2>
          <ul className="divide-y divide-neutral-100 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
            {products.map((p) => (
              <li key={p.id}>
                <button
                  onClick={() => setDetailId(p.id)}
                  className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">{p.internal_name}</div>
                    <div className="text-xs text-neutral-500">
                      {p.pillar?.name ?? "sem pilar"} · {p.category?.name ?? "sem categoria"} · 4F: {p.four_f.join(", ") || "—"} ·{" "}
                      {p.version_count} versão(ões){p.draft_count > 0 ? ` (${p.draft_count} rascunho)` : ""}
                      {p.published_version_id ? " · publicada" : " · sem versão publicada"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={STATUS_TONE[p.status] ?? "bg-neutral-100"}>{STATUS_LABEL[p.status] ?? p.status}</Badge>
                    <ChevronRight className="h-4 w-4 text-neutral-400" />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <RefList title="Pilares" items={pillars} />
        <RefList title="Classificações 4F" items={fourF} />
        <RefList title="Categorias" items={categories} />
        <RefList title="Especialidades" items={specialties} />
      </div>

      <p className="rounded-lg bg-neutral-100 px-3 py-2 text-xs text-neutral-500 dark:bg-neutral-800">
        Esta tela não substitui o catálogo operacional atual. Os 162 produtos de hoje continuam intactos.
      </p>

      {detailId && <ProductDetail id={detailId} onClose={() => setDetailId(null)} />}
    </div>
  );
}

function ProductDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    apiClient.getCatalog2Product(id).then(setData).catch(() => setError(true));
  }, [id]);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4" role="dialog" aria-modal="true" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="absolute inset-0 bg-black/50" aria-hidden="true" />
      <div className="relative flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-neutral-900">
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-3 dark:border-neutral-800">
          <h2 className="font-semibold">Estrutura do produto</h2>
          <button onClick={onClose} aria-label="Fechar" className="rounded p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4 text-sm">
          {error ? (
            <p className="text-red-600">Não foi possível carregar.</p>
          ) : !data ? (
            <Centered><Loader2 className="h-5 w-5 animate-spin" /> Carregando…</Centered>
          ) : (
            <ProductBody data={data} />
          )}
        </div>
      </div>
    </div>
  );
}

function ProductBody({ data }: { data: any }) {
  return (
    <div className="space-y-4">
      <div>
        <div className="text-lg font-semibold">{data.internal_name}</div>
        <div className="text-xs text-neutral-500">
          {data.pillar?.name ?? "sem pilar"} · {data.category?.name ?? "sem categoria"} · 4F: {data.four_f.join(", ") || "—"} ·{" "}
          situação: {STATUS_LABEL[data.status] ?? data.status}
          {data.is_new ? " · etiqueta “Novo” ativa (derivada da data de publicação)" : ""}
        </div>
      </div>

      {data.versions.map((v: any) => (
        <div key={v.id} className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
          <div className="mb-2 flex items-center gap-2">
            <span className="font-medium">Versão {v.version_number}</span>
            <Badge className={v.state === "publicada" ? "bg-emerald-100 text-emerald-700" : "bg-neutral-100 text-neutral-600"}>
              {v.state === "publicada" ? (v.is_published_current ? "publicada (atual)" : "publicada") : "rascunho"}
            </Badge>
            {v.published_at && (
              <span className="text-xs text-neutral-400">em {new Date(v.published_at).toLocaleDateString("pt-BR")}</span>
            )}
          </div>
          <p className="text-xs text-neutral-500">{v.summary || "(sem resumo)"}</p>

          <Group title={`Variações — obrigatórias (${v.variations.length})`}>
            {v.variations.map((va: any) => (
              <li key={va.id}>
                <strong>{va.name}</strong>: {va.options.map((o: any) => o.label).join(" / ") || "(sem opções)"}
              </li>
            ))}
          </Group>
          <Group title={`Adicionais — opcionais (${v.addons.length})`}>
            {v.addons.map((a: any) => (
              <li key={a.id}>{a.name}</li>
            ))}
          </Group>
          <Group title={`Tarefas (ordenadas) — ${v.tasks.length}`}>
            {v.tasks.map((t: any) => (
              <li key={t.id}>
                <strong>#{t.sort_order} {t.name}</strong> — execução: {t.execution_mode}
                {t.specialty ? ` · especialidade: ${t.specialty.name}` : ""}
                {t.ai ? " · IA preparada (revisão humana obrigatória)" : ""}
                {t.steps.length > 0 && (
                  <ul className="ml-4 list-inside list-decimal text-xs text-neutral-500">
                    {t.steps.map((s: any) => (
                      <li key={s.id}>{s.name}</li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </Group>
          {v.conditions.length > 0 && (
            <Group title={`Condições (fundação) — ${v.conditions.length}`}>
              {v.conditions.map((c: any) => (
                <li key={c.id}>
                  {c.name} <span className="text-neutral-400">(afeta {c.applies_to})</span>
                </li>
              ))}
            </Group>
          )}
        </div>
      ))}
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">{title}</p>
      <ul className="ml-1 list-inside list-disc text-sm">{children}</ul>
    </div>
  );
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
function RefList({ title, items }: { title: string; items: any[] }) {
  return (
    <div className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-neutral-500">
        {title} ({items.length})
      </p>
      <ul className="space-y-0.5 text-sm">
        {items.map((it) => (
          <li key={it.id}>{it.name}</li>
        ))}
      </ul>
    </div>
  );
}
function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center justify-center gap-2 py-12 text-sm text-neutral-500">{children}</div>;
}
