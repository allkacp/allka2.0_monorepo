"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Store, Loader2, Lock, Package } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import {
  STANDARD_SHELL_PANEL_CLASS,
  StandardPageBanner,
} from "@/components/standard-page-shell";
import { PinToTrayButton } from "@/components/pin-to-tray-button";

// Catálogo de Produtos — visão administrativa COMERCIAL dos produtos
// catalog2 (reunião 2026-09, consolidação "catálogo2 como cadastro
// definitivo"). Só Admin Master (o backend reaplica em /api/admin/catalog2/*
// — mesma origem de dados do Cadastro de Produtos, /admin/produtos). Nunca
// mostra os 162 produtos antigos. Sem ações de escrita/publicação — isso é
// função do Cadastro de Produtos; aqui é só leitura.
//
// Campos ausentes mostram mensagem honesta (nunca inventam preço/prazo/
// tarefa) — os textos vêm do próprio backend (/readiness), que já não finge
// preço "R$ 0,00" quando não há tarefa cadastrada.

const STATUS_LABEL: Record<string, string> = {
  em_preparacao: "Em preparação",
  disponivel: "Disponível",
  temporariamente_inativo: "Suspenso",
  arquivado: "Arquivado",
};
const STATUS_TONE: Record<string, string> = {
  em_preparacao: "bg-muted text-muted-foreground",
  disponivel: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  temporariamente_inativo: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  arquivado: "bg-muted text-muted-foreground",
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
  category: { name: string } | null;
  summary: string | null;
  published_version_number: number | null;
}

export default function AdminCatalogoProdutosPage() {
  const [state, setState] = useState<"loading" | "ready" | "forbidden" | "error">("loading");
  const [readinessProducts, setReadinessProducts] = useState<ReadinessProduct[]>([]);
  const [listById, setListById] = useState<Record<string, ListProduct>>({});

  const load = useCallback(async () => {
    setState("loading");
    try {
      const [readiness, list] = await Promise.all([
        apiClient.getCatalog2Readiness(),
        apiClient.getCatalog2Products({ page_size: 100 }),
      ]);
      setReadinessProducts(readiness.products ?? []);
      const byId: Record<string, ListProduct> = {};
      for (const p of list.data ?? []) byId[p.id] = p;
      setListById(byId);
      setState("ready");
    } catch (err: any) {
      if (err?.status === 404) setState("forbidden");
      else setState("error");
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const rows = useMemo(
    () => readinessProducts.filter((p) => !p.is_test_local),
    [readinessProducts],
  );
  const fixture = useMemo(
    () => readinessProducts.find((p) => p.is_test_local) ?? null,
    [readinessProducts],
  );

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
      <div className="h-full min-h-0 flex flex-col">
        <div className="shrink-0 -mb-[11px]">
          <StandardPageBanner
            icon={Store}
            title="Catálogo de Produtos"
            description="Visão comercial dos produtos novos (catalog2) — o que já está pronto e o que falta para cada um."
            actions={
              <PinToTrayButton id="page-catalogo-produtos" label="Catálogo de Produtos" icon={Store} path="/admin/catalogo-produtos" />
            }
          />
        </div>

        <p className="mx-1 mt-2 rounded-lg bg-muted px-3 py-2 text-sm text-foreground">
          O catálogo antigo, com 162 produtos, não aparece mais aqui — ele segue no banco só para não quebrar
          projetos antigos já ligados a ele. Edite um produto pelo Cadastro de Produtos.
        </p>

        <div className="mt-3 flex-1 min-h-0 overflow-y-auto">
          {rows.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              Nenhum produto cadastrado ainda.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[880px] text-left text-sm">
                <thead className="bg-muted text-xs text-muted-foreground">
                  <tr>
                    <th className="p-2">Produto</th>
                    <th className="p-2">Categoria</th>
                    <th className="p-2">Descrição</th>
                    <th className="p-2">Status</th>
                    <th className="p-2">Versão</th>
                    <th className="p-2">Preço</th>
                    <th className="p-2">Prazo</th>
                    <th className="p-2">Tarefas</th>
                    <th className="p-2">Etapas</th>
                    <th className="p-2">Pendências</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((p) => {
                    const l = listById[p.id];
                    const precoNote = p.items.preco?.note ?? "Preço ainda não configurado.";
                    const prazoNote = p.items.prazo?.note ?? "Prazo ainda não definido.";
                    return (
                      <tr key={p.id} className="border-t align-top">
                        <td className="p-2 font-medium">{p.name}</td>
                        <td className="p-2 text-muted-foreground">{l?.category?.name ?? "Sem categoria"}</td>
                        <td className="max-w-[220px] p-2 text-muted-foreground">
                          {l?.summary || "Produto em preparação — descrição ainda não escrita."}
                        </td>
                        <td className="p-2">
                          <Badge className={STATUS_TONE[p.status] ?? "bg-muted text-muted-foreground"}>
                            {STATUS_LABEL[p.status] ?? p.status}
                          </Badge>
                        </td>
                        <td className="p-2 text-muted-foreground">
                          {l?.published_version_number ? `v${l.published_version_number} publicada` : "sem versão publicada"}
                        </td>
                        <td className="p-2 text-muted-foreground">{precoNote}</td>
                        <td className="p-2 text-muted-foreground">{prazoNote}</td>
                        <td className="p-2 text-muted-foreground">
                          {p.task_count > 0 ? p.task_count : "Tarefas ainda não cadastradas"}
                        </td>
                        <td className="p-2 text-muted-foreground">
                          {p.step_count > 0 ? p.step_count : "—"}
                        </td>
                        <td className="p-2">
                          {p.blockers.length === 0 && p.pendings.length === 0 ? (
                            <span className="text-xs text-muted-foreground">nenhuma</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {p.blockers.map((b) => (
                                <Badge key={b} className="bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200">{b}</Badge>
                              ))}
                              {p.pendings.map((b) => (
                                <Badge key={b} className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">{b}</Badge>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {fixture && (
            <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Package className="h-3.5 w-3.5" />
              1 produto de demonstração ("[TESTE LOCAL] …") existe para testes e fica fora desta lista — nunca é um
              produto real.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex h-full items-center justify-center gap-2 py-12 text-sm text-muted-foreground">{children}</div>;
}
