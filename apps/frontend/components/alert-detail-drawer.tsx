/**
 * "Detalhes" de uma ocorrência de alerta (ata 2026-08, 8º lote —
 * "visualização detalhada e histórico real"). Distinto de "Ver origem":
 * este painel abre DENTRO da Central de Alertas (StandardModalDialog, que
 * já empilha corretamente sobre o HeaderSlideScreen do AlertsPanel, sem
 * fechá-lo), enquanto "Ver origem" é um <a target="_blank"> que leva pra
 * tela real da tarefa/projeto numa aba nova.
 *
 * Busca GET /system-alerts/:id sob demanda (nunca reaproveita dados do
 * feed, que não tem histórico/origem/destino resolvidos) — com timeout,
 * cancelamento no unmount e estados 404/403/erro/timeout próprios, mesmo
 * padrão já estabelecido pro deep-link de tarefa.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Bot, CheckCircle2, ExternalLink, Loader2 } from "lucide-react";
import { StandardModalDialog } from "@/components/standard-modal-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertBannerImage } from "@/components/alert-banner-image";
import { AlertTimeline, type AlertTimelineEvent } from "@/components/alert-timeline";
import { apiClient, ApiError } from "@/lib/api-client";
import {
  criticalityFromSeverity, criticalityLabel, criticalityIcon, criticalityBadgeColor,
  systemAlertLink, isSafeInternalPath, RESOLUTION_ACTION_LABEL,
} from "@/components/alerts-header-icon";
import type { AccountType } from "@/contexts/account-type-context";

export interface AlertDetailDrawerProps {
  alertId: string | null;
  open: boolean;
  onClose: () => void;
  accountType: AccountType;
}

interface AlertDetail {
  id: string;
  title: string;
  message: string;
  severity: "info" | "warning" | "error";
  situacao: "ativo" | "arquivado" | "expirado" | "dispensado" | "resolvido" | "resolvido_automaticamente";
  // Resolução formal (ata 2026-08, 10º lote) — null quando não resolvido.
  // Alertas antigos que eventualmente tenham situacao "resolvido" por
  // outro caminho (não deveria acontecer com o campo novo, mas tratado
  // honestamente mesmo assim) vêm com este objeto ausente/incompleto —
  // ver renderização abaixo, nunca inventa autor/ação/data.
  resolution: {
    resolved_at: string;
    action: string | null;
    description: string | null;
    resolved_by: { id: string; name: string } | null;
  } | null;
  // Resolução AUTOMÁTICA pelo motor (ata 2026-08, bloco 1/2) — a condição
  // real deixou de existir. Distinta de `resolution` (humana). Autor sempre
  // o rótulo, nunca um usuário.
  automatic_resolution: {
    resolved_at: string;
    reason: string | null;
    message: string | null;
    resolved_by_label: string;
  } | null;
  // Alerta automático de tarefa controlado pela condição real (ata 2026-08):
  // não tem "Resolver alerta"; encerra sozinho quando a situação da tarefa
  // deixa de atender à regra.
  condition_controlled?: boolean;
  type?: string | null;
  created_at: string;
  expires_at: string | null;
  has_image: boolean;
  image_url: string | null;
  image_alt: string | null;
  origin:
    | { type: "automatico" }
    | { type: "padrao_regra"; rule_name: string | null; standard_name: string | null }
    | { type: "programado"; schedule_name: string | null }
    | { type: "avulso"; created_by: { id: string; name: string } | null };
  destinatario: { kind: "geral" } | { kind: "pessoa"; id: string; name: string; email: string } | { kind: "indisponivel" };
  entity_type: string | null;
  entity_id: string | null;
  entity_parent_id: string | null;
  destination: { entity_type: string; label: string; name: string | null; code: string | null; status: "disponivel" | "removido" | "sem_acesso" } | null;
  events: AlertTimelineEvent[];
}

const SITUACAO_LABEL: Record<AlertDetail["situacao"], string> = {
  ativo: "Ativo",
  arquivado: "Arquivado",
  expirado: "Expirado",
  dispensado: "Dispensado",
  resolvido: "Resolvido",
  resolvido_automaticamente: "Resolvido automaticamente",
};

const ORIGIN_LABEL: Record<AlertDetail["origin"]["type"], string> = {
  automatico: "Automático",
  padrao_regra: "Padrão/Regra",
  programado: "Programado",
  avulso: "Avulso",
};

const DESTINATION_STATUS_LABEL: Record<NonNullable<AlertDetail["destination"]>["status"], string> = {
  disponivel: "Disponível",
  removido: "Removido",
  sem_acesso: "Sem acesso",
};

export function AlertDetailDrawer({ alertId, open, onClose, accountType }: AlertDetailDrawerProps) {
  const [status, setStatus] = useState<"loading" | "success" | "not_found" | "forbidden" | "error" | "timeout">("loading");
  const [detail, setDetail] = useState<AlertDetail | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // clientEventId de "details_opened" (ata 2026-08, 9º lote — reparo
  // idempotência): useMemo, não useRef solto — precisa ser o MESMO valor
  // durante toda uma abertura (inclusive na dupla invocação do efeito que
  // o Strict Mode do React faz de propósito em dev), e um valor NOVO
  // sempre que `open`/`alertId` mudam (fechar+reabrir de propósito, ou
  // trocar de alerta = nova abertura legítima = novo evento). A garantia
  // de não duplicar é do SERVIDOR (índice único em client_event_id) — o
  // `sentRef` abaixo é só otimização pra não repetir a chamada de rede à
  // toa, nunca a única linha de defesa.
  const detailsOpenedEventId = useMemo(
    () => (open && alertId ? crypto.randomUUID() : null),
    [open, alertId],
  );
  const sentDetailsOpenedFor = useRef<string | null>(null);
  // Debounce simples de clique duplo em "Ver origem" — puramente uma
  // conveniência de UX (evita o segundo POST na maioria dos casos); a
  // garantia real contra duplicar continua sendo o índice único do
  // client_event_id gerado a cada clique, protegido no servidor mesmo se
  // este debounce falhar (StrictMode, corrida, retry de rede).
  const originClickLockRef = useRef(false);

  // Reseta a rolagem pro topo só numa abertura REAL — abrir (open
  // false->true) ou trocar de alerta (alertId muda) enquanto aberto. Nunca
  // no retry (retryNonce não está nas deps) nem numa atualização dos MESMOS
  // dados — que atrapalharia a leitura em andamento (ata 2026-08, 9º lote).
  // O Dialog (Radix Presence) pode montar o nó real um ou dois quadros
  // DEPOIS do commit deste efeito — por isso o retry via rAF em vez de um
  // scrollContainerRef.current?.scrollTo(...) direto, que perderia a
  // primeira abertura sempre que o nó ainda não existisse no momento exato
  // em que este efeito roda.
  useEffect(() => {
    if (!open) return;
    let rafId: number;
    let cancelled = false;
    function tryScroll() {
      if (cancelled) return;
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({ top: 0 });
      } else {
        rafId = requestAnimationFrame(tryScroll);
      }
    }
    tryScroll();
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    };
  }, [open, alertId]);

  useEffect(() => {
    if (!open || !alertId || !detailsOpenedEventId) return;
    let cancelled = false;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    setStatus("loading");
    setErrorMsg(null);

    apiClient
      .getSystemAlertDetail(alertId, controller.signal)
      .then((data: AlertDetail) => {
        if (cancelled) return;
        setDetail(data);
        setStatus("success");
        if (sentDetailsOpenedFor.current !== detailsOpenedEventId) {
          sentDetailsOpenedFor.current = detailsOpenedEventId;
          apiClient.recordSystemAlertEvent(alertId, "details_opened", detailsOpenedEventId).catch(() => {});
        }
      })
      .catch((err: any) => {
        if (cancelled) return;
        if (err?.name === "AbortError") {
          setStatus("timeout");
          return;
        }
        const httpStatus = err instanceof ApiError ? err.status : undefined;
        if (httpStatus === 404) setStatus("not_found");
        else if (httpStatus === 401 || httpStatus === 403) setStatus("forbidden");
        else {
          setErrorMsg(err?.message || "Não foi possível carregar os detalhes.");
          setStatus("error");
        }
      })
      .finally(() => clearTimeout(timeoutId));

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [open, alertId, retryNonce, detailsOpenedEventId]);

  useEffect(() => {
    if (!open) {
      setDetail(null);
    }
  }, [open]);

  const criticality = detail ? criticalityFromSeverity[detail.severity] : "amarelo";
  const CriticalityIcon = criticalityIcon[criticality];

  const originLink =
    detail?.entity_type && detail.entity_id
      ? systemAlertLink(detail.entity_type, detail.entity_id, accountType, detail.entity_parent_id)
      : null;

  function handleOriginClick() {
    if (!alertId) return;
    // Debounce de UX (não é a garantia de correção — ver comentário no
    // useRef acima). "Ver origem" é um <a target="_blank"> de verdade —
    // a navegação em si nunca é bloqueada por isto nem pela chamada de
    // evento, que é fire-and-forget e nunca mostra erro técnico ao
    // usuário se falhar.
    if (originClickLockRef.current) return;
    originClickLockRef.current = true;
    setTimeout(() => {
      originClickLockRef.current = false;
    }, 800);
    apiClient.recordSystemAlertEvent(alertId, "origin_clicked", crypto.randomUUID()).catch(() => {});
  }

  return (
    <StandardModalDialog
      open={open}
      onClose={onClose}
      title="Detalhes do alerta"
      size="large"
      // Reparo "overlay ausente sobre a Central de Alertas" (ata 2026-08,
      // 9º lote): o overlay padrão do Dialog (z-50, ver ui/dialog.tsx) fica
      // ABAIXO do HeaderSlideScreen que hospeda a Central (z-60) — sem
      // isso, o overlay ficava visualmente invisível atrás do painel que
      // deveria escurecer, e o conteúdo de trás (abas/filtros/cards)
      // continuava nítido e clicável. z-65 fica entre a Central (z-60) e
      // este painel (z-70, ver standard-modal-dialog.tsx).
      overlayClassName="z-65 bg-slate-900/40 backdrop-blur-[2px]"
      scrollRef={scrollContainerRef}
    >
      <div className="p-5 space-y-5">
        {status === "loading" && (
          <div className="flex flex-col items-center justify-center min-h-60 gap-3 text-center" role="status" aria-label="Carregando detalhes">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" aria-hidden="true" />
            <p className="text-sm text-slate-500 dark:text-slate-400">Carregando detalhes...</p>
          </div>
        )}

        {status === "not_found" && (
          <DetailErrorState
            title="Alerta não encontrado"
            message="Este alerta não existe mais ou você não possui acesso a ele."
          />
        )}
        {status === "forbidden" && (
          <DetailErrorState
            title="Você não possui acesso a este alerta"
            message="Fale com o responsável se acredita que deveria ter acesso."
          />
        )}
        {(status === "timeout" || status === "error") && (
          <DetailErrorState
            title="Não foi possível carregar os detalhes"
            message={status === "timeout" ? "O carregamento demorou demais. Tente novamente." : errorMsg || "Ocorreu um erro de rede ou no servidor."}
            onRetry={() => setRetryNonce((n) => n + 1)}
          />
        )}

        {status === "success" && detail && (
          <>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">{detail.title}</h3>
              <Badge className={`text-xs gap-1 ${criticalityBadgeColor[criticality]}`}>
                <CriticalityIcon className="h-3 w-3" aria-hidden="true" />
                {criticalityLabel[criticality]}
              </Badge>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{detail.message}</p>

            {detail.has_image && detail.image_url && (
              <AlertBannerImage src={apiClient.resolveAlertImageUrl(detail.image_url)} alt={detail.image_alt} />
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <Field label="Situação" value={SITUACAO_LABEL[detail.situacao]} />
              <Field label="Criado em" value={new Date(detail.created_at).toLocaleString("pt-BR")} />
              {detail.expires_at && <Field label="Expira em" value={new Date(detail.expires_at).toLocaleString("pt-BR")} />}
              <Field label="Origem" value={ORIGIN_LABEL[detail.origin.type]} />
              {detail.origin.type === "padrao_regra" && (
                <Field label="Regra/Padrão" value={[detail.origin.rule_name, detail.origin.standard_name].filter(Boolean).join(" — ") || "—"} />
              )}
              {detail.origin.type === "programado" && detail.origin.schedule_name && (
                <Field label="Programação" value={detail.origin.schedule_name} />
              )}
              {detail.origin.type === "avulso" && detail.origin.created_by && (
                <Field label="Criado por" value={detail.origin.created_by.name} />
              )}
              <Field
                label="Destinatário"
                value={
                  detail.destinatario.kind === "geral"
                    ? "Geral (público)"
                    : detail.destinatario.kind === "pessoa"
                      ? detail.destinatario.name
                      : "Indisponível"
                }
              />
              <Field
                label="Entidade vinculada"
                value={detail.destination ? [detail.destination.label, detail.destination.name].filter(Boolean).join(": ") : "Sem destino"}
              />
              {detail.destination && (
                <Field label="Situação do destino" value={DESTINATION_STATUS_LABEL[detail.destination.status]} />
              )}
            </div>

            {originLink && isSafeInternalPath(originLink) ? (
              <a
                href={originLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleOriginClick}
                className="inline-flex items-center gap-1.5 text-sm h-9 px-3 rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors w-fit"
              >
                Ver origem
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            ) : (
              <p className="text-xs text-slate-400">
                {detail.destination?.status === "removido"
                  ? "A tela vinculada não está mais disponível."
                  : detail.destination?.status === "sem_acesso"
                    ? "Você não tem acesso à tela vinculada."
                    : "Este alerta é informativo e não possui uma tela vinculada."}
              </p>
            )}

            {/* Alerta automático de tarefa AINDA ATIVO (ata 2026-08) — não
                tem "Resolver alerta": explica que a resolução é controlada
                pela condição real da tarefa. Texto sempre visível. */}
            {detail.condition_controlled && detail.situacao !== "resolvido" && detail.situacao !== "resolvido_automaticamente" && (
              <div className="rounded-lg border border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/30 p-3.5 space-y-1.5">
                <div className="flex items-center gap-1.5 text-sky-800 dark:text-sky-300">
                  <Bot className="h-4 w-4" aria-hidden="true" />
                  <h4 className="text-xs font-semibold">Resolução automática</h4>
                </div>
                <p className="text-xs text-sky-800/90 dark:text-sky-300/80">
                  Este alerta será resolvido quando a situação real da tarefa deixar de atender à regra que o criou.
                </p>
                <p className="text-xs text-sky-800/90 dark:text-sky-300/80">
                  {detail.type === "task.due_soon"
                    ? "O alerta será encerrado quando a tarefa for entregue/concluída, cancelada, sair da janela de aviso ou passar para atraso."
                    : "Conclua ou entregue a tarefa, cancele-a ou regularize o prazo."}
                </p>
              </div>
            )}

            {/* Bloco "Resolução" (ata 2026-08, 10º lote) — só quando
                situacao é "resolvido". Alerta antigo que eventualmente
                tenha essa situação sem os dados novos (não deveria
                acontecer com o campo dedicado deste lote, mas tratado
                honestamente mesmo assim) mostra o aviso explicativo, nunca
                inventa autor/ação/data. */}
            {detail.situacao === "resolvido" && (
              <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-3.5 space-y-2">
                <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  <h4 className="text-xs font-semibold">Resolução</h4>
                </div>
                {detail.resolution && detail.resolution.action && detail.resolution.resolved_by ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <Field label="Situação" value="Resolvido" />
                    <Field label="Ação realizada" value={RESOLUTION_ACTION_LABEL[detail.resolution.action as keyof typeof RESOLUTION_ACTION_LABEL] ?? detail.resolution.action} />
                    <Field label="Resolvido por" value={detail.resolution.resolved_by.name} />
                    <Field label="Data e hora" value={new Date(detail.resolution.resolved_at).toLocaleString("pt-BR")} />
                    {detail.resolution.description && (
                      <div className="sm:col-span-2">
                        <div className="text-[10px] uppercase tracking-wide text-slate-400">Descrição</div>
                        <p className="text-slate-700 dark:text-slate-200 mt-0.5 whitespace-pre-wrap">{detail.resolution.description}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80">
                    Este alerta foi marcado como resolvido antes do registro detalhado de resoluções.
                  </p>
                )}
              </div>
            )}

            {/* Bloco "Resolução automática" (ata 2026-08, bloco 1/2) — a
                condição real que criou o alerta deixou de existir. Sem
                formulário nem comentário humano: o motivo é gerado pelo
                servidor e o autor é o Motor da Allka, nunca uma pessoa. */}
            {detail.situacao === "resolvido_automaticamente" && detail.automatic_resolution && (
              <div className="rounded-lg border border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/30 p-3.5 space-y-2">
                <div className="flex items-center gap-1.5 text-sky-800 dark:text-sky-300">
                  <Bot className="h-4 w-4" aria-hidden="true" />
                  <h4 className="text-xs font-semibold">Resolução automática</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <Field label="Tipo" value="Resolução automática" />
                  <Field label="Responsável" value={detail.automatic_resolution.resolved_by_label} />
                  <Field label="Data e hora" value={new Date(detail.automatic_resolution.resolved_at).toLocaleString("pt-BR")} />
                  {/* A condição/regra que originou o alerta já aparece no
                      bloco "Origem" acima ("Regra/Padrão") — não repetimos
                      aqui pra não duplicar a mesma informação. */}
                  {detail.automatic_resolution.message && (
                    <div className="sm:col-span-2">
                      <div className="text-[10px] uppercase tracking-wide text-slate-400">Motivo</div>
                      <p className="text-slate-700 dark:text-slate-200 mt-0.5">{detail.automatic_resolution.message}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div>
              <h4 className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">Histórico</h4>
              <AlertTimeline events={detail.events} />
            </div>
          </>
        )}
      </div>
    </StandardModalDialog>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-slate-400">{label}</div>
      <div className="text-slate-700 dark:text-slate-200 mt-0.5">{value}</div>
    </div>
  );
}

function DetailErrorState({ title, message, onRetry }: { title: string; message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-60 gap-4 text-center px-6">
      <div className="rounded-full bg-red-50 dark:bg-red-950/40 p-4">
        <AlertTriangle className="h-6 w-6 text-red-500" />
      </div>
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{title}</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">{message}</p>
      </div>
      {onRetry && (
        <Button size="sm" onClick={onRetry} className="btn-brand">
          Tentar novamente
        </Button>
      )}
    </div>
  );
}
