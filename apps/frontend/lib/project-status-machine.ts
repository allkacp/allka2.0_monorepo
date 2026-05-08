import type { ProjectStatus, ProjectLifecycle } from "@/types/project"

// ── Labels ────────────────────────────────────────────────────────────────────

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  "draft":            "Rascunho",
  "awaiting-payment": "Ag. Pagamento",
  "planning":         "Planejamento",
  "in-progress":      "Em Andamento",
  "paused":           "Pausado",
  "completed":        "Concluído",
  "cancelled":        "Cancelado",
}

/** Tailwind classes for each status (badge style) */
export const STATUS_BADGE_CLASSES: Record<ProjectStatus, string> = {
  "draft":            "bg-slate-100 text-slate-700 border-slate-200",
  "awaiting-payment": "bg-cyan-100 text-cyan-800 border-cyan-200",
  "planning":         "bg-orange-100 text-orange-800 border-orange-200",
  "in-progress":      "bg-blue-100 text-blue-800 border-blue-200",
  "paused":           "bg-amber-100 text-amber-800 border-amber-200",
  "completed":        "bg-emerald-100 text-emerald-800 border-emerald-200",
  "cancelled":        "bg-red-100 text-red-800 border-red-200",
}

export const STATUS_DOT_CLASSES: Record<ProjectStatus, string> = {
  "draft":            "bg-slate-400",
  "awaiting-payment": "bg-cyan-500",
  "planning":         "bg-orange-500",
  "in-progress":      "bg-blue-500",
  "paused":           "bg-amber-400",
  "completed":        "bg-emerald-500",
  "cancelled":        "bg-red-500",
}

// ── Initial status ─────────────────────────────────────────────────────────────

/**
 * Determines the status when a project is first created.
 * @param savedAsDraft - true when user explicitly saves as draft
 */
export function getInitialStatus(savedAsDraft: boolean): ProjectStatus {
  return savedAsDraft ? "draft" : "awaiting-payment"
}

// ── Admin manual overrides ─────────────────────────────────────────────────────
//
// Most status transitions are system-triggered (payment confirmed, tasks released,
// billing cycle reset). Admins can only manually override to a limited set.

/**
 * Returns the status options an admin can manually set from a given status.
 */
export function getAdminOverrideOptions(current: ProjectStatus): ProjectStatus[] {
  if (current === "cancelled") return []        // cancelled is terminal
  if (current === "completed") return ["cancelled"]
  if (current === "paused")    return ["in-progress", "cancelled"]
  // active statuses: admin can pause or cancel
  return ["paused", "cancelled"].filter(s => s !== current) as ProjectStatus[]
}

export function canAdminOverride(from: ProjectStatus, to: ProjectStatus): boolean {
  return getAdminOverrideOptions(from).includes(to)
}

// ── System transitions ─────────────────────────────────────────────────────────

/**
 * Returns the next automatic system transition for a given status and lifecycle.
 * Returns null if the transition depends on an external event not yet occurred.
 */
export function getNextSystemTransition(
  status: ProjectStatus,
  lifecycle: ProjectLifecycle,
): { next: ProjectStatus; trigger: string } | null {
  switch (status) {
    case "draft":
      return { next: "awaiting-payment", trigger: "Projeto enviado para cobrança" }
    case "awaiting-payment":
      return { next: "planning", trigger: "Pagamento confirmado" }
    case "planning":
      return { next: "in-progress", trigger: "Todas as tarefas liberadas para execução" }
    case "in-progress":
      if (lifecycle === "avulso")
        return { next: "completed", trigger: "Todas as tarefas concluídas" }
      if (lifecycle === "mensal")
        return { next: "awaiting-payment", trigger: "Novo ciclo de cobrança iniciado (billingDay atingido)" }
      return null
    default:
      return null
  }
}

// ── Billing cycle helpers ──────────────────────────────────────────────────────

/**
 * Computes the next billing date given a day-of-month (1–28) and a reference date.
 */
export function computeNextBillingDate(billingDay: number, fromDate = new Date()): Date {
  const next = new Date(fromDate)
  // If today is already past the billing day this month, move to next month
  if (next.getDate() >= billingDay) {
    next.setMonth(next.getMonth() + 1)
  }
  next.setDate(billingDay)
  return next
}

/**
 * Formats a Date as pt-BR short date (DD/MM/YYYY).
 */
export function formatPtBRDate(date: Date): string {
  return date.toLocaleDateString("pt-BR", {
    day:   "2-digit",
    month: "2-digit",
    year:  "numeric",
  })
}
