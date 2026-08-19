// Ponte entre o `DashboardRole` do frontend (maiúsculo — ver
// lib/dashboard-widget-roles.ts) e o `profile` persistido no backend
// (minúsculo — mesmo vocabulário de ShareLink.profile, ver
// routes/dashboard-templates.ts). Existem dois vocabulários porque o
// DashboardRole já era usado em várias telas antes deste item; em vez de
// renomear tudo, só convertemos na borda (aqui).
import type { DashboardRole } from "@/lib/dashboard-widget-roles";

export function dashboardRoleToProfile(role: DashboardRole): string {
  return role.toLowerCase();
}

export function profileToDashboardRole(profile: string): DashboardRole {
  return profile.toUpperCase() as DashboardRole;
}
