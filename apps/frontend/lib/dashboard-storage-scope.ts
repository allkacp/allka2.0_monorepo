/**
 * Scopes dashboard personalization localStorage keys by the authenticated
 * user (ver auditoria lote 5, ata 2026-08-24) — sem isso, duas contas
 * diferentes do mesmo tipo de portal (ex.: duas empresas), no mesmo
 * navegador, liam e escreviam a MESMA chave (`saved-dashboards-company`),
 * compartilhando indevidamente o dashboard salvo e a seleção atual.
 *
 * Mesmo padrão já usado pela cesta de projeto
 * (getCatalogBasketStorageKey em catalog-access.ts): lê só o `id` interno,
 * opaco, do usuário já em cache da sessão (nunca e-mail, nome ou token) e
 * anexa esse id à chave de base existente. Nunca lê, escreve ou apaga a
 * chave antiga (só-portal) — ela fica intocada, então nenhuma
 * personalização é atribuída silenciosamente a uma conta arbitrária.
 *
 * Identidade ausente (sessão ainda não carregada, ou nunca logada) cai
 * num balde "anonymous" — nunca lê o balde de um usuário de verdade, nem
 * gera uma chave com "undefined"/"null"/vazio dentro.
 *
 * ── Escopo desta correção (lote 5) ──────────────────────────────────────
 * Corrigido: `DASHBOARD_STORAGE_KEY`/`CURRENT_DASHBOARD_KEY`
 * (dashboard-presets-by-role.ts) — a lista de dashboards salvos e a
 * seleção atual, para agency/company/partner/leader/nomad. É a chave
 * citada no problema confirmado do lote e a que os testes exigem.
 *
 * ── Escopo do lote 6 (ata 2026-08-24, bloco 2) ──────────────────────────
 * Corrigido agora, via `getDashboardStorageKey()` abaixo: o dashboard do
 * Admin (`saved-dashboards`, `current-dashboard-id`, `dashboard-widget-config`,
 * `admin-dashboard-metric-cards`, `admin-dashboard-widget-size`,
 * `admin-dashboard-widget-periods` — admin nunca esteve no mapa
 * `DASHBOARD_STORAGE_KEY`, ficava com seu próprio esquema sem sufixo de
 * portal nem de usuário) e os esquemas de widget único
 * (`dashboard-widget-config[-role]`, `dashboard-metric-cards[-role]`,
 * `dashboard-widget-size[-role]`, `dashboard-widget-periods[-role]`,
 * incluindo as variações reais `partner-dashboard-metric-cards` e
 * `partner-dashboard-widget-size`) nas páginas agency/company/leader/partner.
 * `leader/dashboard/page.tsx` e `partner/dashboard/page.tsx` usavam a chave
 * literal `"dashboard-widget-config"` (sem sufixo) em alguns pontos — a
 * MESMA string usada pelo admin, uma colisão de 3 vias entre Admin, Líder e
 * Parceiro; `getDashboardStorageKey()` sempre inclui o portal na chave base,
 * então essa colisão não existe mais.
 *
 * ── Escopo do lote 6, bloco 3 (ata 2026-08-24, último bloco) ────────────
 * `dashboard_global_period` era, apesar do nome, uma PREFERÊNCIA PESSOAL —
 * o filtro de período (tipo/de/até/label) que o usuário escolhe pro
 * dashboard inteiro (distinto do override por widget, esse sim chamado
 * "custom" no resto do código). Não é configuração oficial da plataforma:
 * é lida/gravada pela própria página, no mesmo `useEffect` que reage à
 * escolha do usuário no seletor de período, sem nenhum endpoint de admin
 * por trás. Confirmado como pessoal, agora escopado como as outras via
 * `getDashboardStorageKey()`.
 *
 * `dashboard_historical_data` continha dado de negócio de verdade —
 * `ManualDataEntry` (dashboard-common.tsx) guarda financeiro
 * (revenue/mrr/creditPlans/accountsReceivable/cmv), projetos/tarefas,
 * nômades/partners e churn/ticket/LTV, indexado por mês
 * (`{ "2026-08": {...} }`). Uma ÚNICA chave, sem sufixo de portal nem de
 * usuário, era lida e escrita por TODAS as 5 páginas de dashboard — dado
 * financeiro/operacional de uma conta A podia aparecer mesclado no
 * dashboard de uma conta B no mesmo navegador. Por ser dado sensível (não
 * só preferência de UI), usa `getSensitiveDashboardStorageKey()` abaixo em
 * vez de `getDashboardStorageKey()`: nunca cai no balde `anonymous`
 * compartilhado — sem sessão, o chamador fica com estado em memória
 * (`{}`) e não lê nem escreve localStorage até a sessão existir.
 *
 * `nomades/dashboard/page.tsx`: `nomade_dashboard_widgets_v1` era o único
 * esquema de widget que sobrou sem escopo — layout pessoal do nômade
 * (visibilidade/ordem/colSpan por widget), sem sufixo de usuário. Agora
 * via `getDashboardStorageKey("dashboard-widget-config", "nomad")`
 * (adicionado `"nomad"` a `DashboardStoragePortal`).
 */

const SESSION_USER_STORAGE_KEY = "allka_user";
const ANONYMOUS_BUCKET = "anonymous";

/** Lê o id interno (opaco) do usuário autenticado, direto da sessão em
 * cache — nunca de parâmetro de URL ou de qualquer entrada não confiável. */
export function readSessionUserId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_USER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const id = parsed?.id;
    if (id === undefined || id === null) return null;
    const str = String(id).trim();
    return str.length > 0 ? str : null;
  } catch {
    return null;
  }
}

/** Deriva a chave isolada por usuário a partir de uma chave de base
 * (geralmente já isolada por portal, ex.: "saved-dashboards-company").
 * `userId` ausente/vazio nunca produz uma chave "undefined"/"null"/vazia —
 * cai no balde `anonymous`, isolado de qualquer usuário real. */
export function getUserScopedStorageKey(
  baseKey: string,
  userId: string | null | undefined,
): string {
  const safeUserId = userId && userId.trim().length > 0 ? userId.trim() : ANONYMOUS_BUCKET;
  return `${baseKey}::user:${safeUserId}`;
}

/** Atalho: lê a identidade da sessão atual e já deriva a chave escopada.
 * Cada chamada relê a sessão — nunca fica presa numa identidade antiga
 * capturada antes de um logout/login (ver auditoria: navegação de
 * login/logout desmonta e remonta a página de dashboard, então cada
 * leitura/gravação nova já reflete a sessão atual). */
export function getCurrentUserScopedStorageKey(baseKey: string): string {
  return getUserScopedStorageKey(baseKey, readSessionUserId());
}

/** Configuração pessoal de dashboard que ainda usava um esquema de widget
 * único (pré-multi-dashboard) — cada uma virou uma chave escopada por
 * portal + usuário via `getDashboardStorageKey()`. */
export type DashboardStorageLogicalKey =
  | "saved-dashboards"
  | "current-dashboard-id"
  | "dashboard-widget-config"
  | "dashboard-metric-cards"
  | "dashboard-widget-size"
  | "dashboard-widget-periods"
  | "dashboard_global_period"
  | "dashboard_historical_data";

export type DashboardStoragePortal =
  | "admin"
  | "agency"
  | "company"
  | "partner"
  | "leader"
  | "nomad";

/** Getter centralizado pras chaves pessoais de dashboard que ainda eram
 * literais espalhadas pelas páginas (admin e o esquema de widget único de
 * agency/company/leader/partner). Recebe a chave lógica e o portal, deriva
 * a chave base (`${logicalKey}-${portal}`, sempre distinguindo o portal —
 * é isso que resolve a colisão de 3 vias que Admin/Líder/Parceiro tinham
 * na chave literal `"dashboard-widget-config"`) e escopa por cima pelo
 * usuário autenticado da sessão atual. Mesma regra de identidade ausente
 * de `getCurrentUserScopedStorageKey`: nunca lê o balde de outro usuário. */
export function getDashboardStorageKey(
  logicalKey: DashboardStorageLogicalKey,
  portal: DashboardStoragePortal,
): string {
  return getCurrentUserScopedStorageKey(`${logicalKey}-${portal}`);
}

/** Igual a `getDashboardStorageKey()`, mas pra dado potencialmente
 * sensível (financeiro, de projeto, de desempenho — não apenas preferência
 * de UI). A diferença: NUNCA cai no balde `anonymous` compartilhado. Sem
 * sessão disponível, retorna `null` — o chamador deve usar estado padrão
 * em memória (nunca ler nem escrever localStorage) até a sessão existir,
 * em vez de gravar dado real num balde que qualquer usuário anônimo no
 * mesmo navegador acabaria lendo depois. */
export function getSensitiveDashboardStorageKey(
  logicalKey: DashboardStorageLogicalKey,
  portal: DashboardStoragePortal,
): string | null {
  const userId = readSessionUserId();
  if (!userId) return null;
  return getUserScopedStorageKey(`${logicalKey}-${portal}`, userId);
}
