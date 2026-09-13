"use client";

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { HeaderSlideScreen } from "@/components/header-slide-screen";
import { IallkaAuraAvatar } from "@/components/iallka-aura-avatar";
import { useAccountType } from "@/contexts/account-type-context";
import { useIallkaContext } from "@/contexts/iallka-context";
import { resolveCatalogIdentity, resolveCatalogProjectDestination } from "@/lib/catalog-access";
import { Send, Loader2, CheckCircle2, Package, ArrowRight } from "lucide-react";

interface IallkaMessage {
  id?: string;
  role: "user" | "assistant";
  content: string;
  structured_payload?: string | null;
}

interface SelectedProduct {
  product_id: string;
  variation_id?: string;
  reasoning: string;
}

interface Catalog2Recommendation {
  product_id: string;
  reasoning: string;
  product_name?: string;
  status?: string;
  can_configure?: boolean;
}

interface KnowledgeSource {
  type: "produto" | "documento" | "projeto";
  name: string;
  detail?: string;
}

interface TurnResult {
  reply_text: string;
  stage: "gathering" | "proposal";
  project_title: string;
  selected_products: SelectedProduct[];
  catalog2_recommendations?: Catalog2Recommendation[];
  /** Fontes reais usadas neste turno (calculadas no servidor — ver
   * lib/iallka-knowledge.ts) — reunião 10/09, "base de conhecimento". */
  sources?: KnowledgeSource[];
}

function parsePayload(m: IallkaMessage): TurnResult | null {
  if (!m.structured_payload) return null;
  try {
    return JSON.parse(m.structured_payload) as TurnResult;
  } catch {
    return null;
  }
}

// Nunca finge sucesso nem inventa causa — traduz o que o backend já
// respondeu (a permissão real continua sendo decidida lá, nunca aqui) pra
// uma frase honesta, sem expor detalhe técnico.
function friendlyIallkaError(err: any): string {
  // O backend já devolve uma mensagem honesta (ver routes/iallka.ts) —
  // nunca uma segunda cópia fixa aqui que possa ficar desatualizada quando
  // a matriz de acesso mudar (ex.: Company passou a ser permitida em
  // 2026-09-11, e o texto fixo antigo ainda dizia "só admin e agência").
  return err?.message || "O assistente não respondeu agora — tente de novo em instantes.";
}

interface IallkaAssistantPanelProps {
  open: boolean;
  onClose: () => void;
}

export function IallkaAssistantPanel({ open, onClose }: IallkaAssistantPanelProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { accountType } = useAccountType();
  const { suggestions, contextLine, screenContext } = useIallkaContext();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<IallkaMessage[]>([]);
  const [starting, setStarting] = useState(false);
  const [sending, setSending] = useState(false);
  const [approving, setApproving] = useState(false);
  const [approvedProjectId, setApprovedProjectId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || sessionId || starting) return;
    setStarting(true);
    setError(null);
    apiClient
      .createIallkaSession()
      .then((session: any) => {
        setSessionId(session.id);
        setMessages(session.messages || []);
      })
      .catch((err: any) => setError(friendlyIallkaError(err)))
      .finally(() => setStarting(false));
  }, [open, sessionId, starting]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  function resetForNextOpen() {
    setSessionId(null);
    setMessages([]);
    setInput("");
    setError(null);
    setApprovedProjectId(null);
  }

  // `visibleText` é o que aparece na bolha do usuário; `sentText` é o que
  // realmente vai pro backend. Toda pergunta recebe o contexto curto e
  // seguro da tela atual — inclusive texto digitado livremente — para que a
  // Aura saiba se a conversa é sobre projetos, produtos ou tarefas, sem um
  // campo novo na API e sem enviar dado que a própria tela não exiba.
  async function handleSend(overrideText?: string) {
    const visibleText = (overrideText ?? input).trim();
    if (!visibleText || !sessionId || sending) return;
    const sentText = contextLine ? `${contextLine} ${visibleText}` : visibleText;
    setInput("");
    setError(null);
    setMessages((prev) => [...prev, { role: "user", content: visibleText }]);
    setSending(true);
    try {
      const result: TurnResult = await apiClient.sendIallkaMessage(sessionId, sentText, screenContext.projectId);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: result.reply_text, structured_payload: JSON.stringify(result) },
      ]);
    } catch (err: any) {
      setError(friendlyIallkaError(err));
    } finally {
      setSending(false);
    }
  }

  async function handleApprove() {
    if (!sessionId) return;
    setApproving(true);
    setError(null);
    try {
      const res = await apiClient.approveIallkaSession(sessionId);
      setApprovedProjectId(res.project.id);
      toast({ title: "Projeto criado", description: `"${res.project.title}" foi criado como rascunho.` });
    } catch (err: any) {
      setError(err?.message || "Não foi possível aprovar a proposta.");
    } finally {
      setApproving(false);
    }
  }

  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
  const lastProposal = lastAssistant ? parsePayload(lastAssistant) : null;
  const showProposalCard = !approvedProjectId && lastProposal?.stage === "proposal" && lastProposal.selected_products.length > 0;

  return (
    <HeaderSlideScreen
      open={open}
      onClose={() => {
        onClose();
        if (approvedProjectId) resetForNextOpen();
      }}
      title="Aura"
      subtitle="Aura, a inteligência artificial da Allka — entende a tela atual e ajuda você a avançar"
    >
      <div className="flex-1 min-h-0 flex flex-col bg-slate-50 dark:bg-slate-900">
        <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-5 py-5 space-y-3">
          {starting && messages.length === 0 && (
            <div className="flex items-center justify-center py-10 gap-2 text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Iniciando a Aura...</span>
            </div>
          )}

          {messages.map((m, i) => {
            const payload = m.role === "assistant" ? parsePayload(m) : null;
            const sources = payload?.sources ?? [];
            return (
              <div key={m.id || i} className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}>
                <div className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  {m.role === "assistant" && (
                    <IallkaAuraAvatar expression={payload?.stage === "proposal" ? "smile" : "attentive"} className="h-7 w-7 mr-2 mt-0.5 shadow-sm ring-1 ring-violet-300/70" />
                  )}
                  <div
                    className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm shadow-sm whitespace-pre-wrap ${
                      m.role === "user"
                        ? "bg-blue-600 text-white rounded-br-sm"
                        : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-bl-sm"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
                {/* Fontes reais usadas neste turno (reunião 10/09, "base de
                    conhecimento") — nunca um caminho técnico/prompt/token,
                    só o que foi consultado de verdade. */}
                {sources.length > 0 && (
                  <p className="ml-9 mt-1 max-w-[80%] text-[10px] text-slate-400 dark:text-slate-500">
                    Fontes: {sources.map((s) => s.name).join(", ")}
                  </p>
                )}
                {payload?.catalog2_recommendations && payload.catalog2_recommendations.length > 0 && (
                  <div className="ml-9 mt-2 max-w-[80%] rounded-xl border border-violet-200 bg-violet-50/70 p-2.5 text-xs dark:border-violet-800 dark:bg-violet-950/20">
                    <p className="font-semibold text-violet-800 dark:text-violet-200">Sugestões do novo catálogo</p>
                    <div className="mt-1.5 space-y-1.5">
                      {payload.catalog2_recommendations.map((product) => (
                        <div key={product.product_id} className="rounded-lg bg-white/70 px-2 py-1.5 text-slate-700 dark:bg-slate-900/40 dark:text-slate-200">
                          <p className="font-medium">{product.product_name ?? "Produto do Catalog2"}</p>
                          <p className="mt-0.5 text-[11px]">{product.reasoning}</p>
                          <p className={`mt-1 text-[10px] font-medium ${product.can_configure ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300"}`}>
                            {product.can_configure ? "Disponível para configurar no catálogo" : "Em preparação — ainda não gera orçamento, cesta ou projeto"}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {sending && (
            <div className="flex justify-start">
              <IallkaAuraAvatar expression="thinking" className="h-7 w-7 mr-2 shadow-sm ring-1 ring-violet-300/70" />
              <div className="px-3.5 py-2.5 rounded-2xl rounded-bl-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-500" />
                <span className="text-xs text-slate-400">pensando...</span>
              </div>
            </div>
          )}

          {showProposalCard && (
            <div className="rounded-2xl border border-violet-200 dark:border-violet-800 bg-violet-50/60 dark:bg-violet-950/20 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-violet-600 dark:text-violet-400 shrink-0" />
                <p className="text-sm font-semibold text-violet-800 dark:text-violet-300">{lastProposal!.project_title}</p>
              </div>
              <div className="space-y-2">
                {lastProposal!.selected_products.map((p) => (
                  <div key={`${p.product_id}-${p.variation_id || ""}`} className="text-xs text-slate-600 dark:text-slate-300 bg-white/70 dark:bg-slate-900/40 rounded-lg px-3 py-2">
                    <p className="font-medium text-slate-700 dark:text-slate-200">{p.reasoning}</p>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Button
                  size="sm"
                  className="h-9 px-4 text-xs btn-brand border-0 shadow-md gap-1.5"
                  disabled={approving}
                  onClick={handleApprove}
                >
                  {approving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  Aprovar e criar projeto
                </Button>
                <span className="text-[11px] text-violet-600/70 dark:text-violet-400/70">
                  ou continue digitando abaixo pra pedir um ajuste
                </span>
              </div>
            </div>
          )}

          {approvedProjectId && (
            <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20 p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <p className="text-sm text-emerald-800 dark:text-emerald-300">Projeto criado como rascunho.</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-3 text-xs gap-1"
                onClick={() => {
                  onClose();
                  const identity = resolveCatalogIdentity(accountType);
                  const dest = resolveCatalogProjectDestination(identity, approvedProjectId);
                  if (dest) navigate(dest.pathname, dest.state ? { state: dest.state } : undefined);
                }}
              >
                Ver projeto <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          )}

          {/* Sugestões contextuais (reunião 10/09) — só antes da conversa
              render, pra não poluir depois que a pessoa já está digitando.
              Cada uma envia a MESMA API de sempre (sendIallkaMessage), só
              com uma linha de contexto segura (rota/categoria/busca/aberto)
              prefixada — nunca um campo novo, nunca dado sensível. */}
          {!approvedProjectId && !starting && messages.length <= 1 && suggestions.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {suggestions.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  disabled={!sessionId || sending}
                  onClick={() => handleSend(s.text)}
                  className="rounded-full border border-violet-200 dark:border-violet-800 bg-violet-50/70 dark:bg-violet-950/20 px-3 py-1.5 text-xs text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {s.text}
                </button>
              ))}
            </div>
          )}

          {error && (
            <p className="text-xs text-red-600 dark:text-red-400 text-center">{error}</p>
          )}
        </div>

        {!approvedProjectId && (
          <div className="shrink-0 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3">
            <div className="flex items-end gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Me conte tudo que sabe e deseja para este projeto..."
                className="text-sm resize-none min-h-[44px] max-h-32"
                rows={1}
                disabled={!sessionId || sending}
              />
              <Button
                size="icon"
                className="h-9 w-9 shrink-0 bg-blue-600 hover:bg-blue-700 rounded-full"
                disabled={!input.trim() || !sessionId || sending}
                onClick={() => handleSend()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </HeaderSlideScreen>
  );
}
