/**
 * AllkaBadge — componente de badge global da plataforma Allka.
 *
 * Usa as classes CSS definidas em app/globals.css (.allka-badge-*).
 * Suporta todos os domínios: status de empresa/usuário, projeto, tarefa,
 * plano, tipo de conta, parceiro, prioridade e financeiro.
 */

import React from "react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

// ─── Variant → CSS class map ───────────────────────────────────────────────

export const ALLKA_BADGE_CLASS: Record<string, string> = {
  // Status de empresa / usuário
  "status-ativo": "allka-badge-status-ativo",
  "status-inativo": "allka-badge-status-inativo",
  "status-pendente": "allka-badge-status-pendente",
  "status-bloqueado": "allka-badge-status-bloqueado",
  "status-pausado": "allka-badge-status-pausado",

  // DPO / LGPD
  "dpo-ok": "allka-badge-dpo-ok",
  "dpo-warning": "allka-badge-dpo-warning",
  "policy-pending": "allka-badge-policy-pending",

  // Planos
  "plano-lite": "allka-badge-plano-lite",
  "plano-start": "allka-badge-plano-start",
  "plano-standard": "allka-badge-plano-standard",
  "plano-growth": "allka-badge-plano-growth",
  "plano-scale": "allka-badge-plano-scale",
  "plano-squad": "allka-badge-plano-squad",
  "plano-enterprise": "allka-badge-plano-enterprise",

  // Tipo de conta
  "tipo-empresa": "allka-badge-tipo-empresa",
  "tipo-agencia": "allka-badge-tipo-agencia",
  "tipo-outro": "allka-badge-tipo-outro",

  // Nível parceiro
  bronze: "allka-badge-bronze",
  silver: "allka-badge-silver",
  gold: "allka-badge-gold",
  platinum: "allka-badge-platinum",
  diamond: "allka-badge-diamond",
  partner: "allka-badge-partner",

  // Status de projeto
  "projeto-draft": "allka-badge-projeto-draft",
  "projeto-pending-approval": "allka-badge-projeto-pending-approval",
  "projeto-negotiation": "allka-badge-projeto-negotiation",
  "projeto-awaiting-payment": "allka-badge-projeto-awaiting-payment",
  "projeto-planning": "allka-badge-projeto-planning",
  "projeto-in-progress": "allka-badge-projeto-in-progress",
  "projeto-completed": "allka-badge-projeto-completed",
  "projeto-cancelled": "allka-badge-projeto-cancelled",

  // Status de tarefa
  "task-para-lancamento": "allka-badge-task-para-lancamento",
  "task-em-lancamento": "allka-badge-task-em-lancamento",
  "task-aguardando-informacoes": "allka-badge-task-aguardando-informacoes",
  "task-aguardando-etapa": "allka-badge-task-aguardando-etapa",
  "task-liberada-execucao": "allka-badge-task-liberada-execucao",
  "task-em-execucao": "allka-badge-task-em-execucao",
  "task-em-revisao": "allka-badge-task-em-revisao",
  "task-melhorias-finais": "allka-badge-task-melhorias-finais",
  "task-em-aprovacao": "allka-badge-task-em-aprovacao",
  "task-aprovacao-pendente-cliente": "allka-badge-task-aprovacao-pendente-cliente",
  "task-aprovada": "allka-badge-task-aprovada",
  "task-reprovada": "allka-badge-task-reprovada",
  "task-concluida": "allka-badge-task-concluida",
  "task-pausada": "allka-badge-task-pausada",
  "task-cancelada": "allka-badge-task-cancelada",
  "task-aguardando-nomade": "allka-badge-task-aguardando-nomade",
  "task-entrega-pendente": "allka-badge-task-entrega-pendente",
  "task-entrega-atrasada": "allka-badge-task-entrega-atrasada",
  "task-qualificacao-pendente": "allka-badge-task-qualificacao-pendente",
  "task-nao-seguiu-orientacoes": "allka-badge-task-nao-seguiu-orientacoes",
  // Novos status internos do ciclo completo
  "task-lancamento-em-revisao": "allka-badge-task-lancamento-em-revisao",
  "task-devolvida-agencia":     "allka-badge-task-devolvida-agencia",
  "task-entregue-nomade":       "allka-badge-task-entregue-nomade",
  "task-reprovada-lider":       "allka-badge-task-reprovada-lider",
  "task-aprovada-lider":        "allka-badge-task-aprovada-lider",

  // Prioridade
  "priority-low": "allka-badge-priority-low",
  "priority-medium": "allka-badge-priority-medium",
  "priority-high": "allka-badge-priority-high",
  "priority-urgent": "allka-badge-priority-urgent",

  // Financeiro
  "financial-paid": "allka-badge-financial-paid",
  "financial-pending": "allka-badge-financial-pending",
  "financial-overdue": "allka-badge-financial-overdue",
  "financial-rejected": "allka-badge-financial-rejected",
  "financial-refunded": "allka-badge-financial-refunded",
};

// ─── Utility maps for use in page files ────────────────────────────────────

/** Maps project status string → AllkaBadge variant key */
export const PROJECT_STATUS_VARIANT: Record<string, string> = {
  draft: "projeto-draft",
  "pending-approval": "projeto-pending-approval",
  negotiation: "projeto-negotiation",
  "awaiting-payment": "projeto-awaiting-payment",
  planning: "projeto-planning",
  "in-progress": "projeto-in-progress",
  completed: "projeto-completed",
  cancelled: "projeto-cancelled",
};

/** Maps TaskStatus string → AllkaBadge variant key */
export const TASK_STATUS_VARIANT: Record<string, string> = {
  // Status canônicos do banco
  PARA_LANCAMENTO:              "task-para-lancamento",
  EM_LANCAMENTO:                "task-em-lancamento",
  AGUARDANDO_INFORMACOES:       "task-aguardando-informacoes",
  AGUARDANDO_ETAPA:             "task-aguardando-etapa",
  LIBERADA_PARA_EXECUCAO:       "task-liberada-execucao",
  EM_EXECUCAO:                  "task-em-execucao",
  EM_REVISAO:                   "task-em-revisao",
  MELHORIAS_FINAIS:             "task-melhorias-finais",
  EM_APROVACAO:                 "task-em-aprovacao",
  APROVACAO_PENDENTE_CLIENTE:   "task-aprovacao-pendente-cliente",
  APROVADA:                     "task-aprovada",
  REPROVADA:                    "task-reprovada",
  CONCLUIDA:                    "task-concluida",
  PAUSADA:                      "task-pausada",
  CANCELADA:                    "task-cancelada",
  AGUARDANDO_NOMADE:            "task-aguardando-nomade",
  ENTREGA_PENDENTE:             "task-entrega-pendente",
  ENTREGA_ATRASADA:             "task-entrega-atrasada",
  QUALIFICACAO_PENDENTE:        "task-qualificacao-pendente",
  NAO_SEGUIU_ORIENTACOES:       "task-nao-seguiu-orientacoes",
  // Novos status internos do ciclo completo
  LANCAMENTO_EM_REVISAO:        "task-lancamento-em-revisao",
  DEVOLVIDA_PARA_AGENCIA:       "task-devolvida-agencia",
  AGUARDANDO_ETAPA_ANTERIOR:    "task-aguardando-etapa",
  ENTREGUE_PELO_NOMADE:         "task-entregue-nomade",
  PARA_QUALIFICACAO:            "task-qualificacao-pendente",
  REPROVADA_PELO_LIDER:         "task-reprovada-lider",
  APROVADA_PELO_LIDER:          "task-aprovada-lider",
  EM_APROVACAO_AGENCIA:         "task-em-aprovacao",
  EM_APROVACAO_CLIENTE:         "task-aprovacao-pendente-cliente",
  EXPIRADA:                     "task-cancelada",
};

/** Maps priority string → AllkaBadge variant key */
export const PRIORITY_VARIANT: Record<string, string> = {
  low: "priority-low",
  medium: "priority-medium",
  high: "priority-high",
  urgent: "priority-urgent",
};

/** Maps withdrawal/payment status → AllkaBadge variant key */
export const FINANCIAL_STATUS_VARIANT: Record<string, string> = {
  pending: "financial-pending",
  paid: "financial-paid",
  approved: "financial-paid",
  rejected: "financial-rejected",
  overdue: "financial-overdue",
  refunded: "financial-refunded",
};

// ─── Component ─────────────────────────────────────────────────────────────

interface AllkaBadgeProps {
  /** Variant key — see ALLKA_BADGE_CLASS for all options */
  variant: string;
  /** Text label (falls back to variant if omitted) */
  label?: string;
  /** Optional Lucide icon */
  icon?: LucideIcon;
  /** sm = text-[10px] px-2 py-0.5 | md (default) = standard allka-badge sizing */
  size?: "sm" | "md";
  className?: string;
  children?: React.ReactNode;
}

export function AllkaBadge({
  variant,
  label,
  icon: Icon,
  size = "md",
  className,
  children,
}: AllkaBadgeProps) {
  const variantCls = ALLKA_BADGE_CLASS[variant] ?? "";
  const sizeCls =
    size === "sm"
      ? "!text-[10px] !px-2 !py-0.5 gap-1"
      : "";

  return (
    <span
      className={cn(
        "allka-badge",
        variantCls,
        sizeCls,
        className,
      )}
    >
      {Icon && <Icon className={size === "sm" ? "h-3 w-3 shrink-0" : "h-3.5 w-3.5 shrink-0"} />}
      {children ?? label ?? variant}
    </span>
  );
}

export default AllkaBadge;
