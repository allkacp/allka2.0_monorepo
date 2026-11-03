// Apresentação das tarefas de execução (lista e detalhe usam as MESMAS fontes):
// cada informação vem do seu próprio vínculo — o consultor é do projeto
// (agência), o Líder é da tarefa, e o cliente é o cadastro escolhido no projeto
// (ou o cliente legado, em projetos antigos). Nada é inferido de outro campo.

type TaskProjectLike = {
  consultant?: string | null;
  consultant_user?: { name?: string | null } | null;
  client?: { name?: string | null } | null;
  client_record?: { name?: string | null } | null;
} | null | undefined;

/** "T000001" (backend) → "tar00001" (padrão de código sequencial da plataforma). */
export function formatTaskCode(raw?: string | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (!digits) return raw;
  return `tar${String(parseInt(digits, 10)).padStart(5, "0")}`;
}

/** Código operacional exibido: o da tarefa; a referência do modelo (code_snapshot) só quando a tarefa não tem código próprio. */
export function taskDisplayCode(task: { task_code?: string | null; code_snapshot?: string | null }): string | null {
  return task.task_code ? formatTaskCode(task.task_code) : (task.code_snapshot ?? null);
}

/** Cliente do projeto: cliente legado (client_id) ou o cadastro de cliente escolhido no projeto. */
export function taskClientName(project: TaskProjectLike): string | null {
  return project?.client?.name || project?.client_record?.name || null;
}

/** Consultor do projeto (usuário da agência escolhido no projeto; texto antigo como reserva). Nunca é o Líder. */
export function taskConsultantName(project: TaskProjectLike): string | null {
  return project?.consultant_user?.name || project?.consultant || null;
}

/** Líder atribuído à tarefa. Sem atribuição = null (a tela diz "Sem líder atribuído"). */
export function taskLeaderName(task: { lider_responsavel?: { name?: string | null } | null }): string | null {
  return task.lider_responsavel?.name || null;
}

export const NO_LEADER_LABEL = "Sem líder atribuído";
