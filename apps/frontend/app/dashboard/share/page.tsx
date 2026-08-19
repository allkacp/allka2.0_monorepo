import React, { useState, useEffect, useCallback, useRef, lazy, Suspense } from "react";
import DOMPurify from "dompurify";
import { useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MessageSquare, Clock, FileText, Paperclip, X } from "lucide-react";
import { cn } from "@/lib/utils";

import {
  makeFilterState,
  filterStateFromPeriod,
  type FilterState,
  type ShareProfile,
} from "@/lib/share-token";
import {
  fetchShareData,
  fetchShareMeta,
  verifySharePin,
  fetchShareComments,
  postShareComment,
  attachmentUrl,
  type ShareApiData,
  type ShareMeta,
  type ShareComment,
  type ShareCommentAttachment,
  type CommentColor,
  ShareApiError,
} from "@/lib/share-api";
import { SharedHeader, SharedFooter } from "./_components/shared-header";
import {
  SharedLoadingScreen,
  SharedInvalidScreen,
  SharedExpiredScreen,
  SharedPinScreen,
} from "./_components/shared-state-screens";
import {
  generateShareData,
  WIDGET_TITLES,
  SharedWidgetRenderer,
  SharedFullDashboardView,
  WidgetCard,
} from "./_components/shared-widget-renderer";
import { SharedFilterBar, PERIOD_OPTIONS } from "./_components/shared-filter-bar";
import type { CommentEditorHandle } from "./_components/comment-editor";

// Tiptap só entra no bundle quando o CommentSection de fato monta o editor
// (nunca em links "view only", que não renderizam CommentSection).
const CommentEditor = lazy(() =>
  import("./_components/comment-editor").then((m) => ({ default: m.CommentEditor })),
);

type PageState = "loading" | "pin_required" | "expired" | "invalid" | "ready";

// ─── URL ↔ filter state helpers ───────────────────────────────────────────────

function paramsToFilterState(
  params: URLSearchParams,
  fallback: FilterState,
): FilterState {
  const periodType = params.get("period") ?? fallback.periodType;
  const found = PERIOD_OPTIONS.find((o) => o.value === periodType);
  return {
    periodType,
    periodLabel: params.get("periodLabel") ?? found?.label ?? fallback.periodLabel,
    dateFrom: params.get("from") ?? fallback.dateFrom,
    dateTo: params.get("to") ?? fallback.dateTo,
    status: params.get("status") ?? fallback.status,
  };
}

function syncFiltersToParams(
  next: FilterState,
  base: FilterState,
  current: URLSearchParams,
): URLSearchParams {
  const p = new URLSearchParams(current);
  if (next.periodType !== base.periodType) {
    p.set("period", next.periodType);
    p.set("periodLabel", next.periodLabel);
  } else {
    p.delete("period");
    p.delete("periodLabel");
  }
  if (next.periodType === "custom") {
    if (next.dateFrom) p.set("from", next.dateFrom);
    else p.delete("from");
    if (next.dateTo) p.set("to", next.dateTo);
    else p.delete("to");
  } else {
    p.delete("from");
    p.delete("to");
  }
  if (next.status) p.set("status", next.status);
  else p.delete("status");
  return p;
}

// ─── Comment section ──────────────────────────────────────────────────────────
// Persistência real: GET/POST /api/share/:token/comments (ver
// apps/backend/src/routes/share.ts). Antes disto, "enviar" só fazia
// setSubmitted(true) local — nada era salvo, sumia no F5.
const COMMENT_MAX_LENGTH = 500;
const VISITOR_IDENTITY_KEY = "allka_share_visitor_identity";
const MAX_ATTACHMENTS = 4;
const ATTACHMENT_MAX_SIZE = 10 * 1024 * 1024;
const ATTACHMENT_ACCEPT = "image/jpeg,image/png,image/webp,application/pdf";

type VisitorIdentity = { name: string; email: string; whatsapp: string };

function readVisitorIdentity(): VisitorIdentity | null {
  try {
    const raw = localStorage.getItem(VISITOR_IDENTITY_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Se a pessoa já está logada na própria Allka neste navegador, usa o nome/
 *  e-mail da conta pra exibição — mas isto é só UX (evita perguntar de
 *  novo); a identidade que vale de verdade é a resolvida pelo backend a
 *  partir do JWT no momento do envio (ver postShareComment). */
function readAuthenticatedIdentity(): { name?: string; email?: string } | null {
  try {
    if (!localStorage.getItem("allka_token")) return null;
    const user = JSON.parse(localStorage.getItem("allka_user") || "null");
    if (!user?.email) return null;
    return { name: user.name, email: user.email };
  } catch {
    return null;
  }
}

const COLOR_TEXT: Record<CommentColor, string> = {
  default: "text-foreground",
  slate: "text-slate-600 dark:text-slate-400",
  blue: "text-blue-600 dark:text-blue-400",
  green: "text-emerald-600 dark:text-emerald-400",
  amber: "text-amber-600 dark:text-amber-400",
  red: "text-red-600 dark:text-red-400",
  purple: "text-violet-600 dark:text-violet-400",
  pink: "text-pink-600 dark:text-pink-400",
};

// Comentário "html" já foi sanitizado no backend (allowedTags/allowedClasses
// fechados — ver sanitizeRichContent em routes/share.ts); esta segunda
// passagem no cliente é defesa em profundidade, nunca a única linha de
// defesa.
const RICH_SANITIZE_CONFIG = {
  ALLOWED_TAGS: ["p", "br", "strong", "em", "span"],
  ALLOWED_ATTR: ["class"],
};

// Memoizado: sem isso, digitar no editor (que sobe `commentLength` até o
// CommentSection a cada tecla) re-renderiza a lista inteira de comentários
// e roda DOMPurify.sanitize de novo em cada um a cada tecla — na prática
// parecia a página "recarregando" sozinha enquanto o editor estava aberto.
const CommentBody = React.memo(function CommentBody({ comment }: { comment: ShareComment }) {
  if (!comment.content) return null;
  if (comment.contentFormat === "html") {
    const clean = DOMPurify.sanitize(comment.content, RICH_SANITIZE_CONFIG);
    return (
      <div
        className="text-sm leading-relaxed wrap-break-word [&_p]:m-0"
        dangerouslySetInnerHTML={{ __html: clean }}
      />
    );
  }
  return (
    <p className={cn("text-sm whitespace-pre-wrap wrap-break-word", COLOR_TEXT[comment.color])}>
      {comment.content}
    </p>
  );
});

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function CommentAttachmentView({ token, attachment }: { token: string; attachment: ShareCommentAttachment }) {
  const url = attachmentUrl(token, attachment.id);
  if (attachment.mimeType.startsWith("image/")) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="block">
        <img
          src={url}
          alt={attachment.filename}
          className="max-h-48 rounded-lg border border-border/50 object-cover"
        />
      </a>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 rounded-lg border border-border/50 bg-background px-3 py-2 text-xs hover:bg-muted/50 transition-colors w-fit"
    >
      <FileText className="h-4 w-4 text-destructive shrink-0" />
      <span className="truncate max-w-[200px]">{attachment.filename}</span>
      <span className="text-muted-foreground">({formatFileSize(attachment.size)})</span>
    </a>
  );
}

// Memoizado pela mesma razão de CommentBody: isola cada item da lista de
// re-renders disparados pelo estado do editor (ex.: contador de
// caracteres) enquanto o usuário digita.
const CommentListItem = React.memo(function CommentListItem({
  comment: c,
  token,
}: {
  comment: ShareComment;
  token: string;
}) {
  return (
    <li className="rounded-xl bg-muted/40 px-4 py-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="text-xs leading-tight">
          <p className="font-semibold">{c.authorName || c.authorEmail}</p>
          <p className="text-muted-foreground">{c.authorEmail}</p>
          {c.authorWhatsapp && <p className="text-muted-foreground">WhatsApp: {c.authorWhatsapp}</p>}
        </div>
        <span className="text-[10px] text-muted-foreground shrink-0">
          {new Date(c.createdAt).toLocaleString("pt-BR")}
        </span>
      </div>
      <CommentBody comment={c} />
      {c.attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {c.attachments.map((a) => (
            <CommentAttachmentView key={a.id} token={token} attachment={a} />
          ))}
        </div>
      )}
    </li>
  );
});

function CommentSection({ token }: { token: string }) {
  const authenticated = readAuthenticatedIdentity();
  const [visitorIdentity, setVisitorIdentity] = useState<VisitorIdentity | null>(readVisitorIdentity);
  const [identifyName, setIdentifyName] = useState("");
  const [identifyEmail, setIdentifyEmail] = useState("");
  const [identifyWhatsapp, setIdentifyWhatsapp] = useState("");
  const [identifyError, setIdentifyError] = useState("");

  const [comments, setComments] = useState<ShareComment[]>([]);
  const [listState, setListState] = useState<"loading" | "ready" | "error">("loading");
  const [commentLength, setCommentLength] = useState(0);
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<CommentEditorHandle>(null);

  const isIdentified = !!authenticated || !!visitorIdentity;

  const loadComments = useCallback(() => {
    setListState("loading");
    fetchShareComments(token)
      .then((list) => { setComments(list); setListState("ready"); })
      .catch(() => setListState("error"));
  }, [token]);

  useEffect(() => { loadComments(); }, [loadComments]);

  const handleIdentify = () => {
    const email = identifyEmail.trim().toLowerCase();
    const name = identifyName.trim();
    if (!name) {
      setIdentifyError("Informe seu nome.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setIdentifyError("Informe um e-mail válido.");
      return;
    }
    const identity: VisitorIdentity = { name, email, whatsapp: identifyWhatsapp.trim() };
    setVisitorIdentity(identity);
    try {
      localStorage.setItem(VISITOR_IDENTITY_KEY, JSON.stringify(identity));
    } catch {}
    setIdentifyError("");
  };

  const handleFilesSelected = (list: FileList | null) => {
    if (!list) return;
    setFileError("");
    const incoming = Array.from(list);
    const combined = [...files, ...incoming];
    if (combined.length > MAX_ATTACHMENTS) {
      setFileError(`No máximo ${MAX_ATTACHMENTS} arquivos.`);
      return;
    }
    for (const f of incoming) {
      if (!ATTACHMENT_ACCEPT.split(",").includes(f.type)) {
        setFileError(`Tipo não permitido: ${f.type || f.name}`);
        return;
      }
      if (f.size > ATTACHMENT_MAX_SIZE) {
        setFileError(`"${f.name}" excede 10 MB.`);
        return;
      }
    }
    setFiles(combined);
  };

  const removeFile = (idx: number) => setFiles((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = async () => {
    const html = editorRef.current?.getHTML() ?? "";
    const empty = editorRef.current?.isEmpty() ?? true;
    if ((empty && files.length === 0) || sending) return;
    setSending(true);
    setSendError("");
    try {
      const created = await postShareComment(token, {
        content: empty ? "" : html,
        contentFormat: "html",
        authorName: authenticated ? undefined : visitorIdentity?.name,
        authorEmail: authenticated ? undefined : visitorIdentity?.email,
        authorWhatsapp: authenticated ? undefined : visitorIdentity?.whatsapp,
        files,
      });
      if (created.duplicate) {
        setSendError("Esse comentário já foi enviado.");
      } else {
        setComments((prev) => [...prev, created]);
        editorRef.current?.clear();
        setCommentLength(0);
        setFiles([]);
      }
    } catch (err) {
      setSendError(err instanceof ShareApiError ? err.message : "Não foi possível enviar o comentário.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-card rounded-2xl border border-border/60 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-border/50 flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Comentários</h3>
      </div>

      <div className="p-5 space-y-4">
        {/* ── Lista ── */}
        {listState === "loading" && (
          <p className="text-xs text-muted-foreground">Carregando comentários…</p>
        )}
        {listState === "error" && (
          <div className="flex items-center justify-between gap-2 text-sm text-destructive">
            <span>Não foi possível carregar os comentários.</span>
            <Button size="sm" variant="outline" onClick={loadComments}>Tentar novamente</Button>
          </div>
        )}
        {listState === "ready" && comments.length === 0 && (
          <p className="text-xs text-muted-foreground">Nenhum comentário ainda. Seja o primeiro.</p>
        )}
        {listState === "ready" && comments.length > 0 && (
          <ul className="space-y-3">
            {comments.map((c) => (
              <CommentListItem key={c.id} comment={c} token={token} />
            ))}
          </ul>
        )}

        {/* ── Identificação do visitante (só se ainda não identificado) ── */}
        {!isIdentified ? (
          <div className="space-y-2 pt-2 border-t border-border/50">
            <p className="text-xs text-muted-foreground">
              Informe seu nome e e-mail para comentar. WhatsApp é opcional.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder="Seu nome"
                value={identifyName}
                onChange={(e) => setIdentifyName(e.target.value)}
                className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <input
                type="email"
                placeholder="seu@email.com"
                value={identifyEmail}
                onChange={(e) => setIdentifyEmail(e.target.value)}
                className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <input
                type="text"
                placeholder="WhatsApp (opcional)"
                value={identifyWhatsapp}
                onChange={(e) => setIdentifyWhatsapp(e.target.value)}
                className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <Button size="sm" className="btn-brand shrink-0" onClick={handleIdentify}>
                Continuar
              </Button>
            </div>
            {identifyError && <p className="text-xs text-destructive">{identifyError}</p>}
          </div>
        ) : (
          <div className="space-y-3 pt-2 border-t border-border/50">
            <p className="text-xs text-muted-foreground">
              Comentando como{" "}
              <span className="font-medium text-foreground">
                {authenticated ? (authenticated.name || authenticated.email) : (visitorIdentity!.name || visitorIdentity!.email)}
              </span>
            </p>
            <Suspense
              fallback={
                <div className="w-full h-[72px] rounded-xl border border-input bg-background flex items-center justify-center text-xs text-muted-foreground">
                  Carregando editor…
                </div>
              }
            >
              <CommentEditor
                ref={editorRef}
                placeholder="Escreva seu comentário ou anotação sobre esses dados…"
                maxLength={COMMENT_MAX_LENGTH}
                disabled={sending}
                onLengthChange={setCommentLength}
                onAttachClick={() => fileInputRef.current?.click()}
                attachDisabled={files.length >= MAX_ATTACHMENTS}
              />
            </Suspense>
            <input
              ref={fileInputRef}
              type="file"
              accept={ATTACHMENT_ACCEPT}
              multiple
              className="hidden"
              onChange={(e) => { handleFilesSelected(e.target.files); e.target.value = ""; }}
            />

            {files.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {files.map((f, idx) => (
                  <div
                    key={`${f.name}-${idx}`}
                    className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-muted/30 px-2 py-1 text-xs"
                  >
                    <span className="truncate max-w-[140px]">{f.name}</span>
                    <button type="button" onClick={() => removeFile(idx)} className="text-muted-foreground hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {fileError && <p className="text-xs text-destructive">{fileError}</p>}

            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {commentLength} / {COMMENT_MAX_LENGTH} caracteres
              </p>
              <Button
                size="sm"
                className="btn-brand"
                onClick={handleSubmit}
                disabled={(commentLength === 0 && files.length === 0) || sending}
              >
                {sending ? "Enviando…" : "Enviar"}
              </Button>
            </div>
            {sendError && <p className="text-xs text-destructive">{sendError}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function DashboardSharePage() {
  // Apesar do nome do param (histórico), o valor aqui pode ser o token
  // opaco OU a URL amigável (ShareLink.slug) — o backend resolve os dois
  // pra um único ShareLink (ver findShareLinkByIdentifier em
  // routes/share.ts) e reaplica todas as checagens normais depois. Este
  // componente não precisa saber qual dos dois está recebendo.
  const { token } = useParams<{ token: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const [pageState, setPageState] = useState<PageState>("loading");
  const [config, setConfig] = useState<ShareMeta | null>(null);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);
  const [pinChecking, setPinChecking] = useState(false);

  // The original filter state derived from the token — never mutated after init.
  const [originalFilters, setOriginalFilters] = useState<FilterState>(makeFilterState());
  // The active (possibly viewer-overridden) filter state.
  const [activeFilters, setActiveFilters] = useState<FilterState>(makeFilterState());

  // Real API data state
  const [dataState, setDataState] = useState<"loading" | "ready" | "error">("loading");
  const [shareData, setShareData] = useState<ShareApiData | null>(null);
  const [dataError, setDataError] = useState<string>("");
  const [retryCount, setRetryCount] = useState(0);

  // ── Resolve token via backend (nunca decodificado no cliente) ──
  const initOnce = useRef(false);
  useEffect(() => {
    if (!token) { setPageState("invalid"); return; }
    let cancelled = false;
    fetchShareMeta(token)
      .then((meta) => {
        if (cancelled) return;
        setConfig(meta);
        if (!initOnce.current) {
          initOnce.current = true;
          const base = filterStateFromPeriod(
            meta.period
              ? { ...meta.period, label: meta.period.label ?? "" }
              : undefined,
          );
          setOriginalFilters(base);
          setActiveFilters(paramsToFilterState(searchParams, base));
        }
        setPageState(meta.pinRequired ? "pin_required" : "ready");
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ShareApiError && err.status === 410) {
          setPageState("expired");
        } else {
          setPageState("invalid");
        }
      });
    return () => { cancelled = true; };
  }, [token]); // searchParams intentionally omitted — read once on init

  const handlePinSubmit = async () => {
    if (!token || pinChecking) return;
    setPinChecking(true);
    try {
      const valid = await verifySharePin(token, pinInput);
      if (valid) {
        setPinError(false);
        setPageState("ready");
      } else {
        setPinError(true);
      }
    } finally {
      setPinChecking(false);
    }
  };

  // ── Filter handlers ──
  const handleFilterChange = useCallback(
    (next: FilterState) => {
      setActiveFilters(next);
      setSearchParams(
        syncFiltersToParams(next, originalFilters, searchParams),
        { replace: true },
      );
    },
    [originalFilters, searchParams, setSearchParams],
  );

  const handleFilterReset = useCallback(() => {
    setActiveFilters(originalFilters);
    const p = new URLSearchParams(searchParams);
    ["period", "periodLabel", "from", "to", "status"].forEach((k) => p.delete(k));
    setSearchParams(p, { replace: true });
  }, [originalFilters, searchParams, setSearchParams]);

  // Fetch real data from API whenever page becomes ready, filters change, or user retries.
  useEffect(() => {
    if (pageState !== "ready" || !token) return;
    let cancelled = false;
    setDataState("loading");
    fetchShareData(token, activeFilters)
      .then((d) => {
        if (!cancelled) {
          setShareData(d);
          setDataState("ready");
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setDataError(err instanceof ShareApiError ? err.message : "Erro ao carregar dados");
          setDataState("error");
        }
      });
    return () => { cancelled = true; };
  }, [pageState, token, activeFilters, retryCount]); // eslint-disable-line react-hooks/exhaustive-deps

  // Use real API data; fall back to mock while loading for seamless filter transitions.
  const data = shareData ?? generateShareData(activeFilters);

  // ── State gates ──
  if (pageState === "loading") return <SharedLoadingScreen />;
  if (pageState === "invalid") return <SharedInvalidScreen />;
  if (pageState === "expired") return <SharedExpiredScreen />;
  if (pageState === "pin_required") {
    return (
      <SharedPinScreen
        value={pinInput}
        onChange={(v) => {
          setPinInput(v);
          if (pinError) setPinError(false);
        }}
        onSubmit={handlePinSubmit}
        error={pinError}
        checking={pinChecking}
        targetTitle={config?.target.title ?? ""}
      />
    );
  }

  if (!config) return <SharedInvalidScreen />;

  // ── Ready — main layout ──
  // IMPORTANT: body has `overflow: hidden` globally (globals.css line 269).
  // This container uses `fixed inset-0 overflow-y-auto` to scroll independently.
  const widgetTitle = WIDGET_TITLES[config.target.id] ?? config.target.title;
  const { type } = config.target;

  // Viewers can change filters only if the token explicitly allows it.
  const canFilter = config.allowFilterChanges === true;

  const displayPeriod = canFilter
    ? activeFilters.periodLabel
    : (config.period?.label ?? null);

  const periodModified =
    canFilter && activeFilters.periodLabel !== (config.period?.label ?? "");

  return (
    <div className="fixed inset-0 overflow-y-auto bg-slate-50 dark:bg-background">
      <div className="min-h-full flex flex-col">
        {/* ── Header ── */}
        <SharedHeader config={config} widgetTitle={widgetTitle} />

        {/* ── Main content ── */}
        <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6">

          {/* Content label + title + period */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                {type === "widget" ? "Widget" : "Dashboard"}
              </p>
              <h2 className="text-base sm:text-lg font-bold text-foreground">
                {type === "dashboard" ? config.target.title : widgetTitle}
              </h2>
              {displayPeriod && (
                <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 shrink-0" />
                  {displayPeriod}
                  {periodModified && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                      style={{ background: "rgba(200,26,127,0.1)", color: "#c81a7f" }}>
                      modificado
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>

          {/* ── Filter bar (comment permission only) ── */}
          {canFilter && (
            <SharedFilterBar
              filters={activeFilters}
              originalFilters={originalFilters}
              onChange={handleFilterChange}
              onReset={handleFilterReset}
              profile={config.profile as ShareProfile}
            />
          )}

          {/* ── Widget or full dashboard ── */}
          {dataState === "error" ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center space-y-3">
              <p className="text-sm font-medium text-destructive">{dataError}</p>
              <Button variant="outline" size="sm" onClick={() => setRetryCount((c) => c + 1)}>
                Tentar novamente
              </Button>
            </div>
          ) : dataState === "loading" && !shareData ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          ) : (
            <div className="relative">
              {dataState === "loading" && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/40 rounded-2xl">
                  <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                </div>
              )}
              {type === "widget" ? (
                <WidgetCard title={widgetTitle}>
                  <SharedWidgetRenderer widgetId={config.target.id} data={data} />
                </WidgetCard>
              ) : (
                <SharedFullDashboardView data={data} />
              )}
            </div>
          )}

          {/* ── Comment section (only for "comment" permission) ── */}
          {config.permission === "comment" && (
            <CommentSection token={token!} />
          )}
        </main>

        {/* ── Footer ── */}
        <SharedFooter config={config} />
      </div>
    </div>
  );
}
