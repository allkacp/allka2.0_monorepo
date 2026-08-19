"use client";

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { EmbeddedSlideScreen } from "@/components/embedded-slide-screen";
import { useAccountType } from "@/contexts/account-type-context";
import { resolveCatalogIdentity, resolveCatalogProjectDestination } from "@/lib/catalog-access";
import { Sparkles, Send, Loader2, CheckCircle2, Package, ArrowRight } from "lucide-react";

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

interface TurnResult {
  reply_text: string;
  stage: "gathering" | "proposal";
  project_title: string;
  selected_products: SelectedProduct[];
}

function parsePayload(m: IallkaMessage): TurnResult | null {
  if (!m.structured_payload) return null;
  try {
    return JSON.parse(m.structured_payload) as TurnResult;
  } catch {
    return null;
  }
}

interface IallkaAssistantPanelProps {
  open: boolean;
  onClose: () => void;
}

export function IallkaAssistantPanel({ open, onClose }: IallkaAssistantPanelProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { accountType } = useAccountType();
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
      .catch((err: any) => setError(err?.message || "Não foi possível iniciar o assistente"))
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

  async function handleSend() {
    const text = input.trim();
    if (!text || !sessionId || sending) return;
    setInput("");
    setError(null);
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setSending(true);
    try {
      const result: TurnResult = await apiClient.sendIallkaMessage(sessionId, text);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: result.reply_text, structured_payload: JSON.stringify(result) },
      ]);
    } catch (err: any) {
      setError(err?.message || "O assistente não respondeu — tente de novo.");
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
    <EmbeddedSlideScreen
      open={open}
      onClose={() => {
        onClose();
        if (approvedProjectId) resetForNextOpen();
      }}
      title="IALLKA"
      subtitle="Assistente de IA para montar um projeto"
    >
      <div className="flex-1 min-h-0 flex flex-col bg-slate-50 dark:bg-slate-900">
        <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-5 py-5 space-y-3">
          {starting && messages.length === 0 && (
            <div className="flex items-center justify-center py-10 gap-2 text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Iniciando IALLKA...</span>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={m.id || i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              {m.role === "assistant" && (
                <div className="h-7 w-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shrink-0 mr-2 mt-0.5 shadow-sm">
                  <Sparkles className="h-3.5 w-3.5 text-white" />
                </div>
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
          ))}

          {sending && (
            <div className="flex justify-start">
              <div className="h-7 w-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shrink-0 mr-2 shadow-sm">
                <Sparkles className="h-3.5 w-3.5 text-white" />
              </div>
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
                onClick={handleSend}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </EmbeddedSlideScreen>
  );
}
