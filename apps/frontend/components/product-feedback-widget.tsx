/**
 * "Ajuda e sugestões" — botão flutuante global (mesma família visual do
 * AlertsHeaderIcon/ChatWidget: ícone fixo na borda direita + <HeaderSlideScreen>)
 * que abre um formulário e envia para a Roadmap via
 * POST /api/product-feedback/work-items. Também mostra "Meus chamados".
 *
 * Nunca aparece: enquanto a checagem de acesso está carregando, se ela falhar,
 * ou se canUse=false — ver useProductFeedbackAccess() abaixo. As rotas de
 * login/primeiro-acesso/share ficam fora do <AppLayout>, então montar este
 * componente dentro do AppLayout já garante que ele nunca aparece nelas.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { MessageCircleQuestion, Send, RefreshCw, Inbox, Sparkles, Loader2 } from "lucide-react";
import { HeaderSlideScreen } from "@/components/header-slide-screen";
import { useGlobalHeaderPanel } from "@/contexts/global-header-panel-context";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiClient, ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";

type FeedbackType = "PROBLEM" | "IDEA" | "IMPROVEMENT";

const typeLabels: Record<FeedbackType, string> = {
  PROBLEM: "Algo não funcionou",
  IDEA: "Tenho uma ideia",
  IMPROVEMENT: "Quero uma melhoria",
};

export const publicStatusLabels: Record<string, string> = {
  RECEIVED: "Recebido",
  IN_PROGRESS: "Em andamento",
  IN_VALIDATION: "Em validação",
  RESOLVED: "Resolvido",
  REOPENED: "Reaberto",
  CANCELLED: "Cancelado",
};

export type PublicWorkItem = {
  protocol: string;
  type: FeedbackType;
  title: string;
  status: keyof typeof publicStatusLabels;
  updatedAt: string;
  solutionSummary: string | null;
  release: { version: string; name: string } | null;
  validated: boolean;
  publicComments: Array<{ author: string; content: string; createdAt: string }>;
};

/** Sanitized: pathname only, never querystring or fragment. */
function sanitizedPathname() {
  return window.location.pathname || "/";
}

// Revalidação periódica: nada aqui depende de um novo login para refletir
// uma mudança de acesso feita pelo Admin (bloqueio, expiração de grupo,
// desligar o produto inteiro) — cobre os 4 gatilhos exigidos: montagem
// inicial, abertura do painel, foco da aba, e um intervalo para abas que
// ficam paradas em primeiro plano. Um 403 em criar/listar (verificado de
// novo no servidor a cada chamada) também aciona isto via refresh().
export const ACCESS_REVALIDATE_INTERVAL_MS = 5 * 60_000;

function useProductFeedbackAccess() {
  // null = ainda carregando (ou falhou) — nunca mostra o botão nesse estado.
  const [canUse, setCanUse] = useState<boolean | null>(null);

  const refresh = useCallback(() => {
    apiClient
      .getProductFeedbackAccess()
      .then((res: { enabled: boolean; canUse: boolean }) => setCanUse(Boolean(res?.canUse)))
      .catch(() => setCanUse(null));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [refresh]);

  useEffect(() => {
    const id = setInterval(refresh, ACCESS_REVALIDATE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  return { canUse, refresh };
}

export function ProductFeedbackWidget() {
  const { isActive, openPanel, closePanel } = useGlobalHeaderPanel();
  const open = isActive("product-feedback");
  const setOpen = (v: boolean) => (v ? openPanel("product-feedback") : closePanel("product-feedback"));

  const { canUse, refresh: refreshAccess } = useProductFeedbackAccess();

  const [view, setView] = useState<"form" | "list">("form");
  const [type, setType] = useState<FeedbackType>("PROBLEM");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState("");
  const [expectedResult, setExpectedResult] = useState("");
  const [actualResult, setActualResult] = useState("");
  const [impact, setImpact] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [protocol, setProtocol] = useState("");
  const [improving, setImproving] = useState(false);
  const [improveError, setImproveError] = useState("");

  // Generated once per logical "new ticket" attempt and reused across
  // every retry of that same submit (network timeout, clicking "Enviar"
  // again after a transient error) — never regenerated per HTTP call.
  // resetForm() is what starts a genuinely new attempt, so that's the only
  // place this gets cleared; a plain retry of a failed submit does NOT
  // call resetForm(), so it reuses the same id and the backend's
  // idempotency ledger recognizes it as the same submission rather than
  // creating a second ticket.
  const clientSubmissionIdRef = useRef<string | null>(null);
  function getClientSubmissionId(): string {
    if (!clientSubmissionIdRef.current) {
      clientSubmissionIdRef.current = crypto.randomUUID();
    }
    return clientSubmissionIdRef.current;
  }

  const [items, setItems] = useState<PublicWorkItem[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [listError, setListError] = useState("");

  const loadList = useCallback(async () => {
    setLoadingList(true);
    setListError("");
    try {
      const res = await apiClient.getProductFeedbackWorkItems();
      setItems(res?.items ?? []);
    } catch (err) {
      // Um 403 aqui significa que o acesso mudou depois que o botão já
      // tinha aparecido (bloqueio, grupo expirado, produto desligado) — o
      // servidor já recusou de verdade; isto só sincroniza a UI sem exigir
      // um novo login (ver useProductFeedbackAccess acima).
      if (err instanceof ApiError && err.status === 403) refreshAccess();
      setListError(err instanceof Error ? err.message : "Não foi possível carregar seus chamados.");
    } finally {
      setLoadingList(false);
    }
  }, [refreshAccess]);

  useEffect(() => {
    if (open && view === "list") void loadList();
  }, [open, view, loadList]);

  // Atualização automática enquanto a tela "Meus chamados" está aberta.
  useEffect(() => {
    if (!open || view !== "list") return;
    const id = setInterval(() => void loadList(), 30_000);
    return () => clearInterval(id);
  }, [open, view, loadList]);

  function resetForm() {
    setType("PROBLEM");
    setTitle("");
    setDescription("");
    setSteps("");
    setExpectedResult("");
    setActualResult("");
    setImpact("");
    setError("");
    setProtocol("");
    setImproveError("");
    // A genuinely new attempt starts here — the next submit mints a fresh
    // clientSubmissionId instead of reusing whatever attempt came before.
    clientSubmissionIdRef.current = null;
  }

  // "Melhorar com IA": reescreve título/descrição/passos/resultados juntos
  // (fazem sentido em conjunto, não campo a campo) em linguagem clara para o
  // desenvolvedor/QA que vai tratar o chamado — nunca inventa conteúdo para
  // um campo que o usuário deixou vazio (ver improveFeedbackTicket no
  // backend). O usuário ainda revisa/ajusta antes de enviar, como em todo
  // outro "Melhorar com IA" da plataforma.
  async function handleImproveWithAI() {
    if (improving) return;
    if (!title.trim() && !description.trim()) return;
    setImproving(true);
    setImproveError("");
    try {
      const res = await apiClient.aiImproveFeedbackTicket({
        type,
        title: title.trim(),
        description: description.trim(),
        steps: steps.trim(),
        expected_result: expectedResult.trim(),
        actual_result: actualResult.trim(),
      });
      setTitle(res.title);
      setDescription(res.description);
      if (steps.trim()) setSteps(res.steps);
      if (expectedResult.trim()) setExpectedResult(res.expected_result);
      if (actualResult.trim()) setActualResult(res.actual_result);
    } catch (err) {
      setImproveError(err instanceof ApiError ? err.message : "Não foi possível melhorar o texto agora. Tente novamente.");
    } finally {
      setImproving(false);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await apiClient.createProductFeedbackWorkItem({
        clientSubmissionId: getClientSubmissionId(),
        type,
        title: title.trim(),
        description: description.trim(),
        pathname: sanitizedPathname(),
        pageTitle: document.title || undefined,
        steps: steps.trim() || undefined,
        expectedResult: expectedResult.trim() || undefined,
        actualResult: actualResult.trim() || undefined,
        impact: impact.trim() || undefined,
      });
      setProtocol(res.protocol);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) refreshAccess();
      setError(err instanceof ApiError ? err.message : "Não foi possível enviar. Tente novamente em instantes.");
    } finally {
      setSubmitting(false);
    }
  }

  if (canUse !== true) return null;

  function openForm() {
    refreshAccess();
    resetForm();
    setView("form");
    setOpen(true);
  }

  return (
    <>
      {/* Desktop/laptop trigger — same family as the other header-adjacent
          floating icons (alerts, chat, tray). "lg:block" (not "xl:block")
          on purpose: the mobile bottom nav below is "lg:hidden", so the
          breakpoints must meet exactly here or there's a dead zone between
          lg and xl (~1024–1280px, common laptop/tablet-landscape widths)
          where neither trigger would render. */}
      <div className="hidden lg:block fixed top-[245px] right-[8px] z-50 group">
        <button
          type="button"
          onClick={openForm}
          aria-label="Ajuda e sugestões"
          className="relative flex items-center justify-center h-10 w-10 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors"
        >
          <MessageCircleQuestion className="h-5 w-5 shrink-0" />
        </button>
        <span className="pointer-events-none absolute top-full right-0 mt-2 whitespace-nowrap rounded-lg bg-gray-900/95 px-2.5 py-1.5 text-[11px] text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-xl border border-white/10 z-50">
          Ajuda e sugestões
        </span>
      </div>

      {/* Mobile/tablet trigger — floats above the bottom tab nav (which is
          itself "lg:hidden fixed bottom-0"), never underneath it or inside
          its safe-area padding. A solid brand-colored circular button
          (unlike the desktop icon-only style) because this sits over the
          light page background here, not the dark header/sidebar bar. */}
      <button
        type="button"
        onClick={openForm}
        aria-label="Ajuda e sugestões"
        className="lg:hidden fixed right-4 z-45 flex items-center justify-center h-14 w-14 rounded-full text-white shadow-[0_8px_24px_-4px_rgba(0,0,0,0.35)] active:scale-95 transition-transform"
        style={{
          bottom: "calc(72px + env(safe-area-inset-bottom, 0px) + 12px)",
          background: "var(--app-brand-gradient, var(--brand-gradient, linear-gradient(135deg, #0a1628, #1e3a8a, #0a1628)))",
        }}
      >
        <MessageCircleQuestion className="h-6 w-6 shrink-0" />
      </button>

      <HeaderSlideScreen
        open={open}
        onClose={() => setOpen(false)}
        title="Ajuda e sugestões"
        subtitle={view === "form" ? "Conte o que aconteceu — a equipe recebe o chamado com o protocolo de acompanhamento." : "Seus chamados enviados"}
        footer={
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-1">
              <Button
                variant={view === "form" ? "default" : "ghost"}
                size="sm"
                className={cn("text-xs", view === "form" && "btn-brand")}
                onClick={() => {
                  resetForm();
                  setView("form");
                }}
              >
                Novo chamado
              </Button>
              <Button
                variant={view === "list" ? "default" : "ghost"}
                size="sm"
                className={cn("text-xs gap-1.5", view === "list" && "btn-brand")}
                onClick={() => setView("list")}
              >
                <Inbox className="h-3.5 w-3.5" />
                Meus chamados
              </Button>
            </div>
            {view === "list" && (
              <Button variant="ghost" size="sm" className="text-xs gap-1.5" onClick={() => void loadList()} disabled={loadingList}>
                <RefreshCw className={cn("h-3.5 w-3.5", loadingList && "animate-spin")} />
                Atualizar
              </Button>
            )}
          </div>
        }
      >
        <div className="flex-1 overflow-y-auto p-6 w-full">
          {view === "form" ? (
            protocol ? (
              <div className="flex flex-col items-center justify-center text-center py-10 gap-3">
                <div className="text-3xl font-semibold text-emerald-600">{protocol}</div>
                <p className="text-sm text-gray-600 dark:text-gray-400 max-w-sm">
                  Chamado enviado! Você pode acompanhar o andamento em <strong>Meus chamados</strong>.
                </p>
                <Button className="btn-brand text-xs mt-2" size="sm" onClick={() => setView("list")}>
                  Ver meus chamados
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">Tipo</label>
                  <Select value={type} onValueChange={(v) => setType(v as FeedbackType)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(typeLabels) as FeedbackType[]).map((value) => (
                        <SelectItem key={value} value={value}>
                          {typeLabels[value]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">Título</label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={200}
                    required
                    minLength={3}
                    placeholder="Resuma em poucas palavras"
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">Descrição</label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    minLength={3}
                    rows={4}
                    placeholder="Descreva com o máximo de detalhe possível"
                  />
                </div>

                {type === "PROBLEM" && (
                  <div>
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">
                      Passos para reproduzir (opcional)
                    </label>
                    <Textarea value={steps} onChange={(e) => setSteps(e.target.value)} rows={3} />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">
                      Resultado esperado (opcional)
                    </label>
                    <Textarea value={expectedResult} onChange={(e) => setExpectedResult(e.target.value)} rows={2} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">
                      Resultado obtido (opcional)
                    </label>
                    <Textarea value={actualResult} onChange={(e) => setActualResult(e.target.value)} rows={2} />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">Impacto (opcional)</label>
                  <Textarea value={impact} onChange={(e) => setImpact(e.target.value)} rows={2} />
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs self-start"
                  disabled={improving || (!title.trim() && !description.trim())}
                  onClick={() => void handleImproveWithAI()}
                >
                  {improving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  {improving ? "Melhorando..." : "Melhorar textos com IA"}
                </Button>
                {improveError && <p className="text-xs text-red-600 dark:text-red-400">{improveError}</p>}

                <div className="text-[11px] text-gray-400 dark:text-gray-500">
                  Página atual enviada junto: <code className="font-mono">{sanitizedPathname()}</code>
                </div>

                {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}

                <Button type="submit" className="btn-brand gap-1.5 self-end text-xs" disabled={submitting}>
                  <Send className="h-3.5 w-3.5" />
                  {submitting ? "Enviando..." : "Enviar"}
                </Button>
              </form>
            )
          ) : (
            <div className="space-y-3">
              {listError && <p className="text-xs text-red-600 dark:text-red-400">{listError}</p>}
              {loadingList && items.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-6">Carregando...</p>
              )}
              {!loadingList && !listError && items.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-6">
                  Você ainda não enviou nenhum chamado.
                </p>
              )}
              {items.map((item) => (
                <div
                  key={item.protocol}
                  className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-sm font-semibold">{item.protocol}</span>
                    <span
                      className={cn(
                        "text-[10px] font-medium px-2 py-0.5 rounded-full border",
                        item.status === "RESOLVED"
                          ? "border-emerald-300 text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-950/30"
                          : item.status === "CANCELLED"
                            ? "border-gray-300 text-gray-500 bg-gray-50 dark:bg-gray-900/30"
                            : "border-blue-300 text-blue-700 bg-blue-50 dark:text-blue-300 dark:bg-blue-950/30",
                      )}
                    >
                      {publicStatusLabels[item.status] ?? item.status}
                    </span>
                  </div>
                  <p className="text-sm font-medium mt-1">{item.title}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {typeLabels[item.type]} · Atualizado em{" "}
                    {new Date(item.updatedAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                  {item.solutionSummary && (
                    <p className="text-xs mt-2">
                      <strong>Solução:</strong> {item.solutionSummary}
                    </p>
                  )}
                  {item.release && (
                    <p className="text-xs mt-1 text-gray-500 dark:text-gray-400">
                      Release {item.release.version} — {item.release.name}
                    </p>
                  )}
                  {item.publicComments.length > 0 && (
                    <div className="mt-2 space-y-1.5 border-t border-gray-100 dark:border-gray-800 pt-2">
                      {item.publicComments.map((c, idx) => (
                        <div key={idx} className="text-xs">
                          <span className="font-medium">{c.author}:</span> {c.content}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </HeaderSlideScreen>
    </>
  );
}
