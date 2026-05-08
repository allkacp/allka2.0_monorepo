/**
 * components/task-status-badge.tsx
 * ============================================================
 * Badge de status de tarefa que exibe o label correto para o
 * perfil do usuário logado.
 *
 * Uso:
 *   <TaskStatusBadge status={task.status} />
 *   <TaskStatusBadge status={task.status} role="admin" />
 *   <TaskStatusBadge status={task.status} size="sm" />
 * ============================================================
 */
"use client";

import { cn } from "@/lib/utils";
import { getTaskStatusForRole } from "@/lib/task-status-display";
import type { TaskViewerRole } from "@/lib/task-status-display";

interface TaskStatusBadgeProps {
  /** Status interno armazenado no banco */
  status: string;
  /**
   * Role do viewer. Se omitido, lê de localStorage.allka_user automaticamente.
   * Passe explicitamente quando o role já estiver disponível no componente.
   */
  role?: TaskViewerRole | string;
  /** Tamanho do badge (padrão: "md") */
  size?: "xs" | "sm" | "md";
  /** Classes adicionais */
  className?: string;
}

function getRoleFromStorage(): string {
  try {
    const raw = localStorage.getItem("allka_user");
    if (raw) {
      const u = JSON.parse(raw);
      return u.role ?? u.account_type ?? "admin";
    }
  } catch {
    // SSR ou localStorage indisponível
  }
  return "admin";
}

export function TaskStatusBadge({
  status,
  role,
  size = "md",
  className,
}: TaskStatusBadgeProps) {
  const effectiveRole = role ?? getRoleFromStorage();
  const display = getTaskStatusForRole(status, effectiveRole);

  const sizeClasses = {
    xs: "px-1.5 py-0 text-[10px]",
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-0.5 text-xs",
  }[size];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium whitespace-nowrap",
        sizeClasses,
        display.color,
        className,
      )}
      title={display.internal !== display.label ? display.internal : undefined}
    >
      {display.label}
    </span>
  );
}
