/**
 * Quem está logado, para os contextos globais decidirem se devem buscar dados.
 *
 * O App monta TODOS os providers (Partner, Empresa, Agência, Company…) para
 * qualquer usuário autenticado — a árvore é única, não há uma por portal. Como
 * cada provider buscava sem olhar para quem estava logado, um nômade pedia
 * `/partners/me`, `/clients` e `/agencies`, levava 403 em todos e o console de
 * todo portal não-admin nascia cheio de erro. O ruído não quebrava a tela, mas
 * escondia falha de verdade no meio.
 *
 * A correção é o provider perguntar antes de buscar, não desmontar a árvore:
 * os contextos continuam existindo (nenhum consumidor quebra), só não pedem o
 * que não podem ver.
 */

export type TipoConta = "admin" | "agencias" | "empresas" | "nomades" | "lider" | "desconhecido";

function usuarioArmazenado(): Record<string, any> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("allka_user");
    return raw ? (JSON.parse(raw) as Record<string, any>) : null;
  } catch {
    return null;
  }
}

export function tipoDaContaLogada(): TipoConta {
  const u = usuarioArmazenado();
  if (!u) return "desconhecido";

  const accountType = String(u.account_type ?? "").toLowerCase();
  const role = String(u.role ?? "").toLowerCase();

  if (accountType === "admin" || role === "admin") return "admin";
  if (accountType === "agencias" || role.startsWith("agency")) return "agencias";
  if (accountType === "empresas" || role.startsWith("company")) return "empresas";
  if (accountType === "nomades" || role.startsWith("nomad")) return "nomades";
  if (accountType === "lider" || role === "lider") return "lider";
  return "desconhecido";
}

/**
 * Partner não é um account_type separado — é a Agency com PartnerProfile
 * ativo (ver src/lib/project-scope.ts no backend). Duas condições, então:
 *
 * - tem de ser agência (admin não tem "meu perfil de parceiro"; o dele daria
 *   404 sempre);
 * - e essa agência tem de ser parceira de fato. O `/login` e o `/me` já
 *   devolvem `partner_status` (ver routes/auth.ts), então dá para saber sem
 *   sondar a API — antes o front descobria isso levando 404 em `/partners/me`
 *   e 403 nas duas chamadas seguintes, em toda navegação.
 */
export function podeConsultarPartner(): boolean {
  if (tipoDaContaLogada() !== "agencias") return false;
  const u = usuarioArmazenado();
  return String(u?.partner_status ?? "").toLowerCase() === "active";
}

export function podeConsultarEmpresa(): boolean {
  const t = tipoDaContaLogada();
  return t === "empresas" || t === "admin";
}

export function podeConsultarAgencia(): boolean {
  const t = tipoDaContaLogada();
  return t === "agencias" || t === "admin";
}

/** `/clients` (Companies) é restrito a quem administra clientes. */
export function podeConsultarClientes(): boolean {
  const t = tipoDaContaLogada();
  return t === "admin" || t === "agencias";
}
