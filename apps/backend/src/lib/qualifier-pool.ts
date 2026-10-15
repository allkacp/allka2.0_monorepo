import { prisma } from "./prisma";
import { eligibleCandidatesForTask } from "./task-rotation-engine";

// Grupo de nômades qualificadores: nômades com a chave "pode qualificar" ligada no cadastro, ATIVOS e habilitados para a
// mesma área/tarefa (mesma regra de elegibilidade do rodízio de execução). A etapa vai para quem tem menos qualificações
// pendentes e, em empate, para quem qualificou há mais tempo (rodízio). Nunca o próprio executor. Sem ninguém: null (cai no líder).
export async function pickPoolQualifierUserId(taskId: string, excludeUserIds: Array<string | null | undefined> = []): Promise<string | null> {
  const exclude = new Set(excludeUserIds.filter((u): u is string => !!u));
  const candidates = await eligibleCandidatesForTask(taskId);
  if (candidates.length === 0) return null;
  const flagged = await prisma.nomade.findMany({
    where: { id: { in: candidates.map((c) => c.nomadeId) }, is_qualifier: true, status: "ativo" },
    select: { user_id: true },
  });
  const userIds = [...new Set(flagged.map((n) => n.user_id).filter((u): u is string => !!u && !exclude.has(u)))];
  if (userIds.length === 0) return null;
  if (userIds.length === 1) return userIds[0]!;
  const stages = await prisma.projectTaskStage.findMany({
    where: { especialista_id: { in: userIds }, qualificador_pool: true },
    select: { especialista_id: true, status: true, qualificada_especialista_em: true },
  });
  const pending = new Map<string, number>();
  const last = new Map<string, number>();
  for (const s of stages) {
    const id = s.especialista_id as string;
    if (s.status === "EM_QUALIFICACAO_ESPECIALISTA") pending.set(id, (pending.get(id) ?? 0) + 1);
    if (s.qualificada_especialista_em) last.set(id, Math.max(last.get(id) ?? 0, s.qualificada_especialista_em.getTime()));
  }
  return [...userIds].sort((a, b) => {
    const pa = pending.get(a) ?? 0, pb = pending.get(b) ?? 0;
    if (pa !== pb) return pa - pb;
    const la = last.get(a) ?? 0, lb = last.get(b) ?? 0; // 0 = nunca qualificou → vai primeiro
    if (la !== lb) return la - lb;
    return a < b ? -1 : 1;
  })[0]!;
}
