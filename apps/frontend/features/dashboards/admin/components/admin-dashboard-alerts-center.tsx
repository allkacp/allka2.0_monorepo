/**
 * O AlertsCenter do admin era byte a byte igual ao das outras quatro telas de
 * dashboard. Agora existe uma implementação só, em
 * features/dashboards/shared/dashboard-common.tsx.
 *
 * Este arquivo continua existindo como reexport para não mexer nos imports do
 * admin-dashboard-page.tsx — quem importa daqui recebe exatamente o mesmo
 * componente de antes.
 */
export { AlertsCenter } from "@/features/dashboards/shared/dashboard-common";
