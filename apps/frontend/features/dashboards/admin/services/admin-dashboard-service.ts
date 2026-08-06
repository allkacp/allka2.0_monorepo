/**
 * `generatePublicToken` é o mesmo nas cinco telas de dashboard — o token de
 * compartilhamento não tem nada de específico do admin. A implementação única
 * está em features/dashboards/shared/dashboard-common.tsx.
 *
 * Mantido como reexport para não alterar os imports do admin-dashboard-page.
 */
export { generatePublicToken } from "@/features/dashboards/shared/dashboard-common";
