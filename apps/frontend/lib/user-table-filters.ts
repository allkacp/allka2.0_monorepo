export const USER_TYPE_OPTIONS = [
  { value: "admin", label: "Admin", color: "bg-violet-100 text-violet-700" },
  { value: "agency", label: "Agência", color: "bg-orange-100 text-orange-700" },
  { value: "partner", label: "Agência Partner", color: "bg-pink-100 text-pink-700" },
  { value: "company", label: "Empresa", color: "bg-fuchsia-100 text-fuchsia-700" },
  { value: "leader", label: "Líder", color: "bg-amber-100 text-amber-800" },
  { value: "nomad", label: "Nômade", color: "bg-blue-100 text-blue-700" },
  { value: "financial", label: "Financeiro", color: "bg-orange-100 text-orange-700" },
  { value: "team", label: "Equipe Allka", color: "bg-violet-100 text-violet-700" },
  { value: "other", label: "Outro", color: "bg-slate-100 text-slate-700" },
] as const;
export const USER_STATUS_OPTIONS = [
  { value: "active", label: "Ativo", color: "allka-badge-status-ativo" },
  { value: "blocked", label: "Bloqueado", color: "allka-badge-status-bloqueado" },
  { value: "pausado", label: "Pausado", color: "allka-badge-status-pausado" },
  { value: "suspended", label: "Suspenso", color: "bg-red-100 text-red-700" },
  { value: "accessed_after_pause", label: "Acesso após pausa", color: "bg-amber-100 text-amber-800" },
] as const;
export const USER_ACCESS_OPTIONS = [
  { value: "all", label: "Todos os acessos" },
  { value: "never", label: "Nunca acessou" },
  { value: "today", label: "Acessou hoje" },
  { value: "7days", label: "Últimos 7 dias" },
  { value: "30days", label: "Últimos 30 dias" },
  { value: "90days", label: "Últimos 90 dias" },
  { value: "inactive_90", label: "Sem acesso há 90 dias ou mais" },
  { value: "custom", label: "Intervalo de datas" },
] as const;
export type UserAccessPreset = (typeof USER_ACCESS_OPTIONS)[number]["value"];
type TableUser = { account_type?: string | null; role?: string | null; partner_status?: string | null; status?: string | null; is_active?: boolean; auto_paused?: boolean };

export function userTypeOption(user: TableUser) {
  const type = (user.account_type ?? "").toLowerCase();
  const role = (user.role ?? "").toLowerCase();
  let key: string;
  if (type === "admin") key = "admin";
  else if (["lider", "leader"].includes(type) || ["lider", "leader"].includes(role)) key = "leader";
  else if (["agency", "agencia", "agencias"].includes(type)) key = ["ativo", "active"].includes(user.partner_status ?? "") ? "partner" : "agency";
  else if (["partner", "parceiro"].includes(type)) key = "partner";
  else if (["company", "empresa", "empresas"].includes(type)) key = "company";
  else if (["nomad", "nomade", "nomades"].includes(type)) key = "nomad";
  else if (role === "financial") key = "financial";
  else if (role === "team_allka") key = "team";
  else key = "other";
  return USER_TYPE_OPTIONS.find(o => o.value === key)!;
}

export function userStatusOption(user: TableUser) {
  // Uma suspensão explícita não pode desaparecer atrás da faixa de inatividade.
  const key = user.status === "suspenso" ? "suspended" : user.status === "inativo" ? "blocked" : user.auto_paused || user.status === "pausado" ? "pausado" : user.is_active === false ? "blocked" : "active";
  return USER_STATUS_OPTIONS.find(o => o.value === key)!;
}

export function matchesUserAccess(lastLogin: string | null | undefined, preset: UserAccessPreset, from = "", to = "", now = new Date()): boolean {
  if (from || to) preset = "custom"; // integra também o painel de filtros avançados
  if (preset === "all" && !from && !to) return true;
  if (preset === "never") return !lastLogin;
  if (!lastLogin) return false;
  const time = new Date(lastLogin).getTime();
  if (!Number.isFinite(time)) return false;
  const start = new Date(now); start.setHours(0, 0, 0, 0);
  if (preset === "today") return time >= start.getTime() && time <= now.getTime();
  const days = preset === "7days" ? 7 : preset === "30days" ? 30 : preset === "90days" ? 90 : null;
  if (days != null) return time >= now.getTime() - days * 86400000 && time <= now.getTime();
  if (preset === "inactive_90") return time <= now.getTime() - 90 * 86400000;
  if (from && to && from > to) return false;
  if (from && time < new Date(`${from}T00:00:00`).getTime()) return false;
  if (to && time > new Date(`${to}T23:59:59.999`).getTime()) return false;
  return true;
}
