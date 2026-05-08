/**
 * Canonical project status type — single source of truth.
 *
 * Transition rules (system-controlled):
 *   draft            → awaiting-payment  (system: project submitted / payment link sent)
 *   awaiting-payment → planning          (system: payment confirmed)
 *   planning         → in-progress       (admin: all tasks released for execution)
 *   in-progress      → paused            (admin: manual override)
 *   paused           → in-progress       (admin: resume)
 *   in-progress      → completed         (system: avulso only — all tasks done)
 *   any              → cancelled         (admin or client)
 *
 *   --- mensal cycle ---
 *   in-progress/planning → awaiting-payment  (system: billingDay reached, new cycle)
 *   Tasks not launched before next cycle → status "expirado" (future: Tarefas module)
 */
export type ProjectStatus =
  | "draft"
  | "awaiting-payment"
  | "planning"
  | "in-progress"
  | "paused"
  | "completed"
  | "cancelled"

/**
 * "avulso"  — One-time project. Tasks have 3 months to be launched after opening.
 *             When all tasks are done, status → completed automatically.
 * "mensal"  — Recurring monthly project. Billing triggered on billingDay each month.
 *             After payment: tasks open → planning. After launch: in-progress.
 *             At next billingDay: un-launched tasks expire, cycle resets.
 */
export type ProjectLifecycle = "avulso" | "mensal"

/**
 * Separate from status. A project can be Ativo or Inativo regardless of its
 * workflow status — EXCEPT that cancelled projects are always Inativo.
 */
export type ProjectActiveState = "ativo" | "inativo"

/**
 * Billing configuration for monthly (mensal) projects.
 */
export interface BillingConfig {
  /** Day of month (1–28) when the billing cycle is triggered */
  billingDay: number
  /** ISO date string for the very first billing cycle start date */
  billingStartDate?: string
}
