"use client";

// Contratação em nome de empresa/agência, feita pelo Admin Master —
// achado do usuário 2026-09-23: "como administrador eu posso conseguir
// contratar... aparece a qual projeto eu quero colocar essa contratação...
// posso vincular a uma agência, posso colocar como que eu dei de graça, um
// brinde... posso descontar da carteira da própria agência... sempre tenho
// que colocar o motivo... posso gerar um link de pagamento."
//
// Reaproveita o MESMO motor de cotação/checkout do cliente por baixo
// (POST /api/admin/catalog2/checkout, que usa configureProduct/createQuote/
// attachCatalog2QuoteToProject com um ClientContext de impersonation da
// conta-alvo) — nunca uma segunda implementação de preço.

import { useEffect, useState } from "react";
import { Search, Loader2, Wallet, Gift, Link2, AlertTriangle, CheckCircle2, Copy, ExternalLink, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { exportAdminCheckoutInvoicePDF } from "@/lib/admin-checkout-invoice-export";

type Target = { kind: "company" | "agency"; id: string; name: string; email: string | null; wallet_balance: number };
type TargetProject = { id: string; title: string; project_code: string; status: string; created_at: string };
type Settlement = "ALLKOINS" | "BRINDE" | "LINK_PAGAMENTO";
type CheckoutSuccess = {
  project: { id: string; title: string; project_code: string };
  target: { kind: "company" | "agency"; id: string; name: string };
  settlement: Settlement;
  message: string;
  payment?: { id: string; amount: number; paid_at: string | null } | null;
  invoice?: { invoice_number: string } | null;
};

function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function projectUrl(id: string) {
  return `${typeof window === "undefined" ? "" : window.location.origin}/admin/projetos?produto=${id}`;
}

export function AdminCheckoutModal({
  open,
  onClose,
  productId,
  selection,
  period,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  productId: string;
  selection: Record<string, any>;
  period?: string | null;
  onSuccess?: (result: { project: any; message: string }) => void;
}) {
  const { toast } = useToast();
  const [result, setResult] = useState<CheckoutSuccess | null>(null);
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Target[]>([]);
  const [searching, setSearching] = useState(false);
  const [target, setTarget] = useState<Target | null>(null);

  const [projects, setProjects] = useState<TargetProject[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);

  const [settlement, setSettlement] = useState<Settlement>("BRINDE");
  const [motivo, setMotivo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setTarget(null);
      setProjects([]);
      setProjectId(null);
      setSettlement("BRINDE");
      setMotivo("");
      setError(null);
      setResult(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open || target) return;
    const q = query.trim();
    let cancelled = false;
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const r: any = await apiClient.searchAdminCheckoutTargets(q);
        if (!cancelled) setResults(r?.data ?? []);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, open, target]);

  useEffect(() => {
    if (!target) return;
    setLoadingProjects(true);
    setProjectId(null);
    apiClient
      .listAdminCheckoutTargetProjects(target.kind, target.id)
      .then((r: any) => setProjects(r?.data ?? []))
      .catch(() => setProjects([]))
      .finally(() => setLoadingProjects(false));
  }, [target]);

  const canSubmit = !!target && motivo.trim().length >= 5 && !submitting;

  async function handleSubmit() {
    if (!target) return;
    setSubmitting(true);
    setError(null);
    try {
      const res: CheckoutSuccess = await apiClient.adminCatalog2Checkout({
        product: productId,
        selection,
        period: period ?? undefined,
        target: { kind: target.kind, id: target.id },
        project_id: projectId,
        settlement,
        motivo: motivo.trim(),
      });
      setResult(res);
      onSuccess?.({ project: res.project, message: res.message ?? "Contratação concluída." });
    } catch (e: any) {
      setError(e?.message ?? "Não foi possível concluir a contratação.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDownloadInvoice() {
    if (!result?.payment) return;
    setDownloadingInvoice(true);
    try {
      await exportAdminCheckoutInvoicePDF(
        {
          invoiceNumber: result.invoice?.invoice_number ?? null,
          projectTitle: result.project.title,
          projectCode: result.project.project_code,
          targetName: result.target.name,
          targetKind: result.target.kind,
          amount: result.payment.amount,
          paidAt: result.payment.paid_at,
          settlement: result.settlement,
          motivo: motivo.trim(),
          paymentId: result.payment.id,
        },
        `fatura-${result.project.project_code}.pdf`,
      );
    } catch {
      toast({ title: "Não foi possível gerar o PDF", description: "Tente novamente em instantes.", variant: "destructive" });
    } finally {
      setDownloadingInvoice(false);
    }
  }

  async function copyProjectLink() {
    try {
      await navigator.clipboard.writeText(projectUrl(result!.project.id));
      toast({ title: "Link copiado" });
    } catch {
      toast({ title: "Não foi possível copiar o link", variant: "destructive" });
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        {result ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                Contratação concluída
              </DialogTitle>
              <DialogDescription>{result.message}</DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5">
                <p className="text-sm font-semibold">{result.project.title}</p>
                <p className="text-[11px] text-muted-foreground">
                  {result.project.project_code} · {result.target.name} ({result.target.kind === "company" ? "empresa" : "agência"})
                </p>
                {result.payment && (
                  <p className="mt-1 text-sm font-bold text-violet-700 dark:text-violet-300">{fmtBRL(result.payment.amount)}</p>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm" className="gap-1.5">
                  <a href={projectUrl(result.project.id)} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5" /> Abrir projeto
                  </a>
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={copyProjectLink}>
                  <Copy className="h-3.5 w-3.5" /> Copiar link
                </Button>
                {result.payment && (
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={handleDownloadInvoice} disabled={downloadingInvoice}>
                    {downloadingInvoice ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
                    Baixar fatura (PDF)
                  </Button>
                )}
              </div>

              {result.settlement === "LINK_PAGAMENTO" && (
                <p className="text-[11px] text-muted-foreground">
                  Este pedido ainda não foi pago — o responsável foi notificado para finalizar o pagamento.
                </p>
              )}
            </div>

            <DialogFooter>
              <Button onClick={onClose}>Fechar</Button>
            </DialogFooter>
          </>
        ) : (
          <>
        <DialogHeader>
          <DialogTitle>Contratar em nome de empresa/agência</DialogTitle>
          <DialogDescription>
            Como Admin Master, você contrata este produto para outra conta — nunca para si mesmo. Escolha a conta,
            o projeto, a forma de acerto e informe o motivo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* ── Conta-alvo ─────────────────────────────────────────── */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Empresa ou agência</label>
            {target ? (
              <div className="mt-1 flex items-center justify-between rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 dark:border-violet-900/50 dark:bg-violet-950/20">
                <div>
                  <p className="text-sm font-semibold">{target.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {target.kind === "company" ? "Empresa" : "Agência"}
                    {target.email ? ` · ${target.email}` : ""} · Saldo allkoin: {fmtBRL(target.wallet_balance)}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setTarget(null)}>Trocar</Button>
              </div>
            ) : (
              <div className="mt-1">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar por nome/e-mail… (dica: contas de teste começam com [TESTE])"
                    className="pl-8"
                  />
                </div>
                {searching && <p className="mt-1 text-[11px] text-muted-foreground">Buscando…</p>}
                {!searching && query.trim().length > 0 && results.length === 0 && (
                  <p className="mt-1 text-[11px] text-muted-foreground">Nenhuma empresa/agência encontrada.</p>
                )}
                {results.length > 0 && (
                  <div className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-border divide-y">
                    {results.map((r) => (
                      <button
                        key={`${r.kind}:${r.id}`}
                        type="button"
                        onClick={() => setTarget(r)}
                        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted/60"
                      >
                        <span>
                          {r.name}{" "}
                          <span className="text-[10px] font-medium uppercase text-muted-foreground">
                            {r.kind === "company" ? "empresa" : "agência"}
                          </span>
                        </span>
                        <span className="text-[11px] text-muted-foreground">{fmtBRL(r.wallet_balance)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Projeto ───────────────────────────────────────────── */}
          {target && (
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Projeto</label>
              <div className="mt-1 space-y-1.5">
                <button
                  type="button"
                  onClick={() => setProjectId(null)}
                  className={cn(
                    "w-full rounded-lg border-2 px-3 py-2 text-left text-sm",
                    projectId === null ? "border-violet-500 bg-violet-50 dark:bg-violet-950/20" : "border-border hover:border-violet-300",
                  )}
                >
                  Criar novo projeto
                </button>
                {loadingProjects && <p className="text-[11px] text-muted-foreground">Carregando projetos…</p>}
                {!loadingProjects && projects.length > 0 && (
                  <div className="max-h-32 overflow-y-auto space-y-1.5">
                    {projects.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setProjectId(p.id)}
                        className={cn(
                          "flex w-full items-center justify-between rounded-lg border-2 px-3 py-2 text-left text-sm",
                          projectId === p.id ? "border-violet-500 bg-violet-50 dark:bg-violet-950/20" : "border-border hover:border-violet-300",
                        )}
                      >
                        <span className="truncate">{p.title}</span>
                        <span className="shrink-0 text-[10px] text-muted-foreground">{p.project_code} · {p.status}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Forma de acerto ───────────────────────────────────── */}
          {target && (
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Forma de acerto</label>
              <div className="mt-1 grid grid-cols-1 gap-1.5">
                <button
                  type="button"
                  onClick={() => setSettlement("ALLKOINS")}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border-2 px-3 py-2 text-left text-sm",
                    settlement === "ALLKOINS" ? "border-violet-500 bg-violet-50 dark:bg-violet-950/20" : "border-border hover:border-violet-300",
                  )}
                >
                  <Wallet className="h-4 w-4 text-violet-600" />
                  <span className="flex-1">Debitar da carteira allkoin ({fmtBRL(target.wallet_balance)})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSettlement("BRINDE")}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border-2 px-3 py-2 text-left text-sm",
                    settlement === "BRINDE" ? "border-violet-500 bg-violet-50 dark:bg-violet-950/20" : "border-border hover:border-violet-300",
                  )}
                >
                  <Gift className="h-4 w-4 text-pink-600" />
                  <span className="flex-1">Brinde / cortesia (sem cobrança)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSettlement("LINK_PAGAMENTO")}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border-2 px-3 py-2 text-left text-sm",
                    settlement === "LINK_PAGAMENTO" ? "border-violet-500 bg-violet-50 dark:bg-violet-950/20" : "border-border hover:border-violet-300",
                  )}
                >
                  <Link2 className="h-4 w-4 text-sky-600" />
                  <span className="flex-1">Gerar pedido pendente e notificar (paga depois)</span>
                </button>
              </div>
            </div>
          )}

          {/* ── Motivo ────────────────────────────────────────────── */}
          {target && (
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Motivo da contratação (obrigatório)</label>
              <Textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ex.: cortesia por atraso na entrega, contratação combinada por telefone, teste comercial…"
                className="mt-1"
                rows={3}
              />
            </div>
          )}

          {error && (
            <div className="flex items-start gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit} className="gap-1.5">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Confirmar contratação
          </Button>
        </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
