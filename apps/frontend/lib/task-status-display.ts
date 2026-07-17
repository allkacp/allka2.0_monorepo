/**
 * lib/task-status-display.ts
 * ============================================================
 * Função canônica de mapeamento de status de tarefa por perfil.
 *
 * Separa o status interno (armazenado no banco) do status exibido
 * para cada tipo de usuário, evitando que termos técnicos operacionais
 * sejam expostos para agências e clientes.
 *
 * Uso:
 *   import { getTaskStatusForRole, TASK_STATUS_LABEL } from "@/lib/task-status-display";
 *
 *   const { status, label, color } = getTaskStatusForRole(task.status, userRole);
 * ============================================================
 */

// ─── Tipos ────────────────────────────────────────────────────────────────────

/**
 * Todos os status internos possíveis de uma tarefa operacional.
 * Estes são armazenados no banco e visíveis apenas para Admin e Líder (na sua área).
 */
export type TaskInternalStatus =
  | "PARA_LANCAMENTO"          // Tarefa criada, aguardando agência lançar
  | "LANCAMENTO_EM_REVISAO"    // Líder revisando o lançamento (briefing + acessos)
  | "DEVOLVIDA_PARA_AGENCIA"   // Líder devolveu para agência corrigir
  | "AGUARDANDO_ETAPA_ANTERIOR"// Etapa bloqueada: etapa anterior ainda não concluída
  | "LIBERADA_PARA_EXECUCAO"   // Etapa liberada, aguardando o nômade iniciar
  | "EM_EXECUCAO"              // Nômade está executando
  | "ENTREGUE_PELO_NOMADE"     // Nômade entregou, aguarda qualificação do líder
  | "PARA_QUALIFICACAO"        // Em fila de qualificação do líder de área
  | "REPROVADA_PELO_LIDER"     // Líder reprovou — nômade deve corrigir
  | "APROVADA_PELO_LIDER"      // Líder aprovou — aguarda aprovação da agência/cliente
  | "EM_APROVACAO_AGENCIA"     // Aguardando agência aprovar a entrega final
  | "EM_APROVACAO_CLIENTE"     // Aguardando cliente aprovar a entrega final
  | "APROVADA"                 // Aprovada por todos — encerramento em andamento
  | "REPROVADA"                // Reprovada pelo cliente/agência após aprovação do líder
  | "CONCLUIDA"                // Ciclo completo encerrado
  | "EXPIRADA"                 // Prazo de lançamento expirado sem execução
  | "CANCELADA";               // Cancelada manualmente

/**
 * Roles de usuário reconhecidos pelo sistema de exibição de status.
 * Inclui "lider" além dos roles padrão.
 */
export type TaskViewerRole =
  | "admin"
  | "lider"
  | "nomad"
  | "agency_admin"
  | "agency_user"
  | "company_admin"
  | "company_user"
  | "partner";

/** Resultado do mapeamento: status canônico exibido + label + cor Tailwind */
export interface TaskStatusDisplay {
  /** Status interno (sempre disponível) */
  internal: string;
  /** Status traduzido para o perfil */
  label: string;
  /** Classes Tailwind para badge colorido */
  color: string;
  /** Chave do variante AllkaBadge (se disponível) */
  variant?: string;
}

// ─── Configuração de labels e cores por status interno ───────────────────────

interface StatusConfig {
  /** Label exibido para Admin/Líder */
  adminLabel: string;
  /** Label exibido para o nômade */
  nomadLabel: string;
  /** Label exibido para agência (agency_admin / agency_user) */
  agencyLabel: string;
  /** Label exibido para empresa/cliente (company_admin / company_user) */
  clientLabel: string;
  /** Cor Tailwind para admin/líder */
  adminColor: string;
  /** Cor Tailwind para nômade */
  nomadColor: string;
  /** Cor Tailwind para agência */
  agencyColor: string;
  /** Cor Tailwind para cliente */
  clientColor: string;
  /** Variante AllkaBadge correspondente (para Admin/Líder) */
  variant?: string;
}

const STATUS_CONFIG: Record<string, StatusConfig> = {
  PARA_LANCAMENTO: {
    adminLabel:   "Para Lançamento",
    nomadLabel:   "Para Lançamento",
    agencyLabel:  "Para Lançamento",
    clientLabel:  "Aguardando Início",
    adminColor:   "bg-slate-100 text-slate-700",
    nomadColor:   "bg-slate-100 text-slate-600",
    agencyColor:  "bg-slate-100 text-slate-600",
    clientColor:  "bg-slate-100 text-slate-500",
    variant: "task-para-lancamento",
  },
  LANCAMENTO_EM_REVISAO: {
    adminLabel:   "Lançamento em Revisão",
    nomadLabel:   "Aguardando Revisão",
    agencyLabel:  "Em Análise",
    clientLabel:  "Em Análise",
    adminColor:   "bg-amber-100 text-amber-700",
    nomadColor:   "bg-amber-100 text-amber-600",
    agencyColor:  "bg-amber-100 text-amber-600",
    clientColor:  "bg-amber-100 text-amber-600",
    variant: "task-aguardando-informacoes",
  },
  DEVOLVIDA_PARA_AGENCIA: {
    adminLabel:   "Devolvida para Agência",
    nomadLabel:   "Devolvida para Agência",
    agencyLabel:  "Revisar e Relançar",
    clientLabel:  "Em Ajuste",
    adminColor:   "bg-orange-100 text-orange-700",
    nomadColor:   "bg-orange-100 text-orange-600",
    agencyColor:  "bg-orange-600 text-white",
    clientColor:  "bg-orange-100 text-orange-600",
    variant: "task-reprovada",
  },
  AGUARDANDO_ETAPA_ANTERIOR: {
    adminLabel:   "Aguardando Etapa Anterior",
    nomadLabel:   "Aguardando Etapa Anterior",
    agencyLabel:  "Em Execução",
    clientLabel:  "Em Andamento",
    adminColor:   "bg-slate-100 text-slate-500",
    nomadColor:   "bg-slate-100 text-slate-500",
    agencyColor:  "bg-blue-100 text-blue-700",
    clientColor:  "bg-blue-100 text-blue-600",
    variant: "task-aguardando-etapa",
  },
  LIBERADA_PARA_EXECUCAO: {
    adminLabel:   "Liberada para Execução",
    nomadLabel:   "Disponível para Executar",
    agencyLabel:  "Em Execução",
    clientLabel:  "Em Andamento",
    adminColor:   "bg-teal-100 text-teal-700",
    nomadColor:   "bg-teal-100 text-teal-700",
    agencyColor:  "bg-blue-100 text-blue-700",
    clientColor:  "bg-blue-100 text-blue-600",
    variant: "task-liberada-execucao",
  },
  EM_EXECUCAO: {
    adminLabel:   "Em Execução",
    nomadLabel:   "Em Execução",
    agencyLabel:  "Em Execução",
    clientLabel:  "Em Andamento",
    adminColor:   "bg-yellow-100 text-yellow-700",
    nomadColor:   "bg-yellow-100 text-yellow-700",
    agencyColor:  "bg-blue-100 text-blue-700",
    clientColor:  "bg-blue-100 text-blue-600",
    variant: "task-em-execucao",
  },
  ENTREGUE_PELO_NOMADE: {
    adminLabel:   "Entregue — Aguarda Qualificação",
    nomadLabel:   "Entregue",
    agencyLabel:  "Em Execução",
    clientLabel:  "Em Andamento",
    adminColor:   "bg-indigo-100 text-indigo-700",
    nomadColor:   "bg-indigo-100 text-indigo-600",
    agencyColor:  "bg-blue-100 text-blue-700",
    clientColor:  "bg-blue-100 text-blue-600",
    variant: "task-em-revisao",
  },
  PARA_QUALIFICACAO: {
    adminLabel:   "Para Qualificação",
    nomadLabel:   "Aguardando Qualificação",
    agencyLabel:  "Em Execução",
    clientLabel:  "Em Andamento",
    adminColor:   "bg-purple-100 text-purple-700",
    nomadColor:   "bg-purple-100 text-purple-600",
    agencyColor:  "bg-blue-100 text-blue-700",
    clientColor:  "bg-blue-100 text-blue-600",
    variant: "task-qualificacao-pendente",
  },
  REPROVADA_PELO_LIDER: {
    adminLabel:   "Reprovada pelo Líder",
    nomadLabel:   "Requer Correção",
    agencyLabel:  "Em Execução",
    clientLabel:  "Em Andamento",
    adminColor:   "bg-red-100 text-red-700",
    nomadColor:   "bg-red-100 text-red-700",
    agencyColor:  "bg-blue-100 text-blue-700",
    clientColor:  "bg-blue-100 text-blue-600",
    variant: "task-reprovada",
  },
  APROVADA_PELO_LIDER: {
    adminLabel:   "Aprovada pelo Líder",
    nomadLabel:   "Aprovada — Aguarda Envio",
    agencyLabel:  "Em Análise Final",
    clientLabel:  "Em Análise Final",
    adminColor:   "bg-emerald-100 text-emerald-700",
    nomadColor:   "bg-emerald-100 text-emerald-600",
    agencyColor:  "bg-indigo-100 text-indigo-700",
    clientColor:  "bg-indigo-100 text-indigo-600",
    variant: "task-em-aprovacao",
  },
  EM_APROVACAO_AGENCIA: {
    adminLabel:   "Em Aprovação — Agência",
    nomadLabel:   "Aguardando Aprovação da Agência",
    agencyLabel:  "Aguardando sua Aprovação",
    clientLabel:  "Em Análise",
    adminColor:   "bg-indigo-100 text-indigo-700",
    nomadColor:   "bg-indigo-100 text-indigo-500",
    agencyColor:  "bg-indigo-600 text-white",
    clientColor:  "bg-indigo-100 text-indigo-600",
    variant: "task-em-aprovacao",
  },
  EM_APROVACAO_CLIENTE: {
    adminLabel:   "Em Aprovação — Cliente",
    nomadLabel:   "Aguardando Aprovação do Cliente",
    agencyLabel:  "Aguardando Aprovação do Cliente",
    clientLabel:  "Aguardando sua Aprovação",
    adminColor:   "bg-violet-100 text-violet-700",
    nomadColor:   "bg-violet-100 text-violet-500",
    agencyColor:  "bg-violet-100 text-violet-600",
    clientColor:  "bg-violet-600 text-white",
    variant: "task-aprovacao-pendente-cliente",
  },
  APROVADA: {
    adminLabel:   "Aprovada",
    nomadLabel:   "Aprovada",
    agencyLabel:  "Aprovada",
    clientLabel:  "Aprovada",
    adminColor:   "bg-green-100 text-green-700",
    nomadColor:   "bg-green-100 text-green-700",
    agencyColor:  "bg-green-100 text-green-700",
    clientColor:  "bg-green-100 text-green-700",
    variant: "task-aprovada",
  },
  REPROVADA: {
    adminLabel:   "Reprovada",
    nomadLabel:   "Reprovada",
    agencyLabel:  "Reprovada",
    clientLabel:  "Reprovada",
    adminColor:   "bg-red-100 text-red-700",
    nomadColor:   "bg-red-100 text-red-700",
    agencyColor:  "bg-red-100 text-red-700",
    clientColor:  "bg-red-100 text-red-700",
    variant: "task-reprovada",
  },
  CONCLUIDA: {
    adminLabel:   "Concluída",
    nomadLabel:   "Concluída",
    agencyLabel:  "Concluída",
    clientLabel:  "Concluída",
    adminColor:   "bg-emerald-100 text-emerald-700",
    nomadColor:   "bg-emerald-100 text-emerald-700",
    agencyColor:  "bg-emerald-100 text-emerald-700",
    clientColor:  "bg-emerald-100 text-emerald-700",
    variant: "task-concluida",
  },
  EXPIRADA: {
    adminLabel:   "Expirada",
    nomadLabel:   "Expirada",
    agencyLabel:  "Expirada",
    clientLabel:  "Expirada",
    adminColor:   "bg-rose-100 text-rose-700",
    nomadColor:   "bg-rose-100 text-rose-600",
    agencyColor:  "bg-rose-100 text-rose-600",
    clientColor:  "bg-rose-100 text-rose-600",
    variant: "task-cancelada",
  },
  CANCELADA: {
    adminLabel:   "Cancelada",
    nomadLabel:   "Cancelada",
    agencyLabel:  "Cancelada",
    clientLabel:  "Cancelada",
    adminColor:   "bg-slate-100 text-slate-500",
    nomadColor:   "bg-slate-100 text-slate-500",
    agencyColor:  "bg-slate-100 text-slate-500",
    clientColor:  "bg-slate-100 text-slate-500",
    variant: "task-cancelada",
  },

  // ── Aliases de status legados (DB pode ter estes valores) ─────────────────
  // Mapear para os novos canonicamente
  EM_LANCAMENTO:            { adminLabel: "Lançamento em Revisão",         nomadLabel: "Aguardando Revisão",           agencyLabel: "Em Análise",          clientLabel: "Em Análise",         adminColor: "bg-amber-100 text-amber-700",   nomadColor: "bg-amber-100 text-amber-600",   agencyColor: "bg-amber-100 text-amber-600",   clientColor: "bg-amber-100 text-amber-600",   variant: "task-aguardando-informacoes" },
  AGUARDANDO_INFORMACOES:   { adminLabel: "Aguardando Informações",         nomadLabel: "Aguardando Informações",       agencyLabel: "Em Análise",          clientLabel: "Em Análise",         adminColor: "bg-amber-100 text-amber-700",   nomadColor: "bg-amber-100 text-amber-600",   agencyColor: "bg-amber-100 text-amber-600",   clientColor: "bg-amber-100 text-amber-600",   variant: "task-aguardando-informacoes" },
  AGUARDANDO_NOMADE:        { adminLabel: "Aguardando Nômade",              nomadLabel: "Em Busca de Executor",         agencyLabel: "Em Execução",         clientLabel: "Em Andamento",       adminColor: "bg-cyan-100 text-cyan-700",     nomadColor: "bg-cyan-100 text-cyan-600",     agencyColor: "bg-blue-100 text-blue-700",     clientColor: "bg-blue-100 text-blue-600",     variant: "task-aguardando-nomade" },
  EM_REVISAO:               { adminLabel: "Entregue — Em Revisão",          nomadLabel: "Entregue",                     agencyLabel: "Em Execução",         clientLabel: "Em Andamento",       adminColor: "bg-purple-100 text-purple-700", nomadColor: "bg-purple-100 text-purple-600", agencyColor: "bg-blue-100 text-blue-700",     clientColor: "bg-blue-100 text-blue-600",     variant: "task-em-revisao" },
  EM_APROVACAO:             { adminLabel: "Em Aprovação",                   nomadLabel: "Aguardando Aprovação",         agencyLabel: "Aguardando sua Aprovação", clientLabel: "Em Análise",    adminColor: "bg-indigo-100 text-indigo-700", nomadColor: "bg-indigo-100 text-indigo-500", agencyColor: "bg-indigo-600 text-white",       clientColor: "bg-indigo-100 text-indigo-600", variant: "task-em-aprovacao" },
  ENTREGA_PENDENTE:         { adminLabel: "Entrega Pendente",               nomadLabel: "Prazo se Encerrando",          agencyLabel: "Em Execução",         clientLabel: "Em Andamento",       adminColor: "bg-orange-100 text-orange-700", nomadColor: "bg-orange-100 text-orange-700", agencyColor: "bg-blue-100 text-blue-700",     clientColor: "bg-blue-100 text-blue-600",     variant: "task-entrega-pendente" },
  ENTREGA_ATRASADA:         { adminLabel: "Entrega Atrasada",               nomadLabel: "Em Atraso",                    agencyLabel: "Em Execução",         clientLabel: "Em Andamento",       adminColor: "bg-red-100 text-red-700",       nomadColor: "bg-red-100 text-red-700",       agencyColor: "bg-blue-100 text-blue-700",     clientColor: "bg-blue-100 text-blue-600",     variant: "task-entrega-atrasada" },
  QUALIFICACAO_PENDENTE:    { adminLabel: "Para Qualificação",              nomadLabel: "Aguardando Qualificação",      agencyLabel: "Em Execução",         clientLabel: "Em Andamento",       adminColor: "bg-purple-100 text-purple-700", nomadColor: "bg-purple-100 text-purple-600", agencyColor: "bg-blue-100 text-blue-700",     clientColor: "bg-blue-100 text-blue-600",     variant: "task-qualificacao-pendente" },
  PAUSADA:                  { adminLabel: "Pausada",                        nomadLabel: "Pausada",                      agencyLabel: "Pausada",             clientLabel: "Pausada",            adminColor: "bg-slate-100 text-slate-600",   nomadColor: "bg-slate-100 text-slate-600",   agencyColor: "bg-slate-100 text-slate-600",   clientColor: "bg-slate-100 text-slate-500",   variant: "task-pausada" },
  MELHORIAS_FINAIS:         { adminLabel: "Melhorias Finais",               nomadLabel: "Finalização Pendente",         agencyLabel: "Em Execução",         clientLabel: "Em Andamento",       adminColor: "bg-yellow-100 text-yellow-700", nomadColor: "bg-yellow-100 text-yellow-700", agencyColor: "bg-blue-100 text-blue-700",     clientColor: "bg-blue-100 text-blue-600",     variant: "task-melhorias-finais" },
  NAO_SEGUIU_ORIENTACOES:   { adminLabel: "Não Seguiu Orientações",         nomadLabel: "Requer Correção",              agencyLabel: "Em Execução",         clientLabel: "Em Andamento",       adminColor: "bg-red-100 text-red-700",       nomadColor: "bg-red-100 text-red-700",       agencyColor: "bg-blue-100 text-blue-700",     clientColor: "bg-blue-100 text-blue-600",     variant: "task-nao-seguiu-orientacoes" },
  APROVACAO_PENDENTE_CLIENTE: { adminLabel: "Aguardando Aprovação — Cliente", nomadLabel: "Aguardando Aprovação",     agencyLabel: "Aguardando Aprovação do Cliente", clientLabel: "Aguardando sua Aprovação", adminColor: "bg-violet-100 text-violet-700", nomadColor: "bg-violet-100 text-violet-500", agencyColor: "bg-violet-100 text-violet-600", clientColor: "bg-violet-600 text-white", variant: "task-aprovacao-pendente-cliente" },
};

// ─── Função principal ──────────────────────────────────────────────────────────

/**
 * Retorna o status de exibição correto para o perfil do usuário.
 *
 * @param internalStatus - Status armazenado no banco (campo `status` da ProjectTask)
 * @param role - Role do usuário logado
 * @returns TaskStatusDisplay com label e cor adequados ao perfil
 *
 * @example
 * const display = getTaskStatusForRole("PARA_QUALIFICACAO", "agency_admin");
 * // → { internal: "PARA_QUALIFICACAO", label: "Em Execução", color: "bg-blue-100 text-blue-700" }
 *
 * const display2 = getTaskStatusForRole("PARA_QUALIFICACAO", "admin");
 * // → { internal: "PARA_QUALIFICACAO", label: "Para Qualificação", color: "bg-purple-100 text-purple-700" }
 */
export function getTaskStatusForRole(
  internalStatus: string,
  role: TaskViewerRole | string,
): TaskStatusDisplay {
  const cfg = STATUS_CONFIG[internalStatus];

  if (!cfg) {
    // Status desconhecido — exibir como-está para todos
    return {
      internal: internalStatus,
      label: internalStatus.replace(/_/g, " "),
      color: "bg-slate-100 text-slate-600",
    };
  }

  const isAdmin  = role === "admin";
  const isLider  = role === "lider";
  const isNomad  = role === "nomad" || role === "nomad_admin";
  const isAgency = role === "agency_admin" || role === "agency_user";
  // Client = company_admin, company_user, partner (parceiro não vê detalhes técnicos)
  const isClient = role === "company_admin" || role === "company_user" || role === "partner";

  if (isAdmin || isLider) {
    return {
      internal: internalStatus,
      label:    cfg.adminLabel,
      color:    cfg.adminColor,
      variant:  cfg.variant,
    };
  }

  if (isNomad) {
    return {
      internal: internalStatus,
      label:    cfg.nomadLabel,
      color:    cfg.nomadColor,
      variant:  cfg.variant,
    };
  }

  if (isAgency) {
    return {
      internal: internalStatus,
      label:    cfg.agencyLabel,
      color:    cfg.agencyColor,
    };
  }

  if (isClient) {
    return {
      internal: internalStatus,
      label:    cfg.clientLabel,
      color:    cfg.clientColor,
    };
  }

  // Fallback: mostrar label de admin
  return {
    internal: internalStatus,
    label:    cfg.adminLabel,
    color:    cfg.adminColor,
    variant:  cfg.variant,
  };
}

// ─── Hook React ────────────────────────────────────────────────────────────────

/**
 * Hook que retorna a função de mapeamento já com o role do usuário logado injetado.
 *
 * @example
 * const getStatus = useTaskStatusDisplay();
 * const display = getStatus("PARA_QUALIFICACAO");
 * // display.label === "Para Qualificação" (admin) ou "Em Execução" (agência)
 */
export function useTaskStatusDisplay() {
  // Ler role do usuário logado (mesmo padrão usado em toda a plataforma)
  let role: string = "admin";
  try {
    const raw = localStorage.getItem("allka_user");
    if (raw) {
      const u = JSON.parse(raw);
      role = u.role ?? u.account_type ?? "admin";
    }
  } catch {
    // SSR / não disponível
  }

  return (internalStatus: string): TaskStatusDisplay =>
    getTaskStatusForRole(internalStatus, role as TaskViewerRole);
}

// ─── Tabela de labels administrativos (atalho) ────────────────────────────────

/**
 * Map rápido: status interno → label para Admin/Líder.
 * Útil em componentes que já sabem que estão no contexto admin.
 */
export const TASK_STATUS_LABEL: Record<string, string> = Object.fromEntries(
  Object.entries(STATUS_CONFIG).map(([k, v]) => [k, v.adminLabel])
);

/**
 * Map rápido: status interno → cor Tailwind para Admin/Líder.
 */
export const TASK_STATUS_COLOR: Record<string, string> = Object.fromEntries(
  Object.entries(STATUS_CONFIG).map(([k, v]) => [k, v.adminColor])
);

/**
 * Todos os status internos do ciclo operacional completo, em ordem.
 */
export const TASK_STATUS_ORDER: TaskInternalStatus[] = [
  "PARA_LANCAMENTO",
  "LANCAMENTO_EM_REVISAO",
  "DEVOLVIDA_PARA_AGENCIA",
  "AGUARDANDO_ETAPA_ANTERIOR",
  "LIBERADA_PARA_EXECUCAO",
  "EM_EXECUCAO",
  "ENTREGUE_PELO_NOMADE",
  "PARA_QUALIFICACAO",
  "REPROVADA_PELO_LIDER",
  "APROVADA_PELO_LIDER",
  "EM_APROVACAO_AGENCIA",
  "EM_APROVACAO_CLIENTE",
  "APROVADA",
  "REPROVADA",
  "CONCLUIDA",
  "EXPIRADA",
  "CANCELADA",
];
