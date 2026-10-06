/**
 * stage-engine.ts — Motor de execução por etapa.
 *
 * Uma tarefa pode ser executada em etapas com donos diferentes: Design faz o
 * layout, Programação constrói, o time interno publica. Cada etapa tem executor,
 * prazo e valor próprios, e a seguinte só abre quando a anterior conclui.
 *
 * A configuração vem de `CatalogTask.steps` e é materializada em
 * ProjectTaskStage na geração da tarefa (ver generate-tasks.ts). Este arquivo
 * cuida do comportamento em runtime.
 *
 * Ciclo de uma etapa:
 *
 *   BLOQUEADA ──(anterior concluiu)──▶ PENDENTE
 *       │                                 │
 *       │                        (precisa de executor)
 *       │                                 ▼
 *       │                        AGUARDANDO_EXECUTOR
 *       │                                 │ (executor definido)
 *       ▼                                 ▼
 *   (cancelada)                       EM_ANDAMENTO ──▶ CONCLUIDA
 *
 * Quando a última etapa obrigatória conclui, a tarefa NÃO encerra: vai para
 * aprovação de quem contratou (agência e, se o produto exigir, cliente) — o
 * executor terminar não é a entrega ser aceita. Ver `aprovarTarefa`.
 *
 * Origem do desenho: o motor da plataforma antiga, documentado em
 * docs/motor-tarefas-legado.md — mas adaptado ao modelo novo (nomenclatura em
 * português, Nomade/LiderArea, seleção automática já existente) em vez de
 * copiado.
 */

import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "./prisma";
import { pagarEtapasConcluidas } from "./stage-payout";
import { addBusinessMinutes } from "./sla";
import { ensureWorkCalendar } from "./work-calendar";
import { startTaskRotation } from "./task-rotation-engine";
import { atribuirLiderParaTarefa } from "./atribuir-lider";
import { nestedAlertEventCreate } from "./alert-events";
import { unmetRules, DependencyBlockedError, evaluateRule } from "./project-dependencies";
import { logProjectDecision } from "./catalog2-cycles";
import { assertRequiredDeliverablesForStage } from "./task-deliverables";

type Db = PrismaClient | Prisma.TransactionClient;

export const STAGE_STATUS = {
  BLOQUEADA: "BLOQUEADA",
  PENDENTE: "PENDENTE",
  AGUARDANDO_EXECUTOR: "AGUARDANDO_EXECUTOR",
  EM_ANDAMENTO: "EM_ANDAMENTO",
  CONCLUIDA: "CONCLUIDA",
  // Execução por etapa (A8b fase 2): a etapa entregue espera a qualificação do líder e a aprovação de quem contratou.
  EM_QUALIFICACAO: "EM_QUALIFICACAO",
  EM_APROVACAO_CLIENTE: "EM_APROVACAO_CLIENTE",
} as const;

export interface AberturaEtapa {
  stageId: string;
  titulo: string;
  status: string;
  executor_type: string;
  nomade_id: string | null;
  lider_id: string | null;
  prazo_execucao: Date | null;
  herdou_nomade: boolean;
}

/**
 * Avisa quem vai executar que a etapa abriu.
 *
 * Sem isso o motor atribui trabalho em silêncio: a etapa entra em EM_ANDAMENTO
 * e a pessoa só descobre se abrir a tela por conta própria. Falha aqui não pode
 * derrubar a transição da etapa — o aviso é acessório, o avanço não é.
 */
async function avisarExecutor(
  db: Db,
  stage: { id: string; titulo: string; nomade_id: string | null; lider_id: string | null; prazo_execucao: Date | null },
  taskTitulo: string,
): Promise<void> {
  try {
    let userId: string | null = stage.lider_id;
    let destino = "/lider/tarefas";

    if (stage.nomade_id) {
      const nomade = await db.nomade.findUnique({
        where: { id: stage.nomade_id },
        select: { user_id: true },
      });
      // Nômade sem usuário vinculado não tem como receber aviso nenhum.
      if (!nomade?.user_id) return;
      userId = nomade.user_id;
      destino = "/nomades/minhastarefas";
    }
    if (!userId) return;

    const prazo = stage.prazo_execucao
      ? ` Prazo: ${stage.prazo_execucao.toLocaleDateString("pt-BR")}.`
      : "";

    await db.systemAlert.create({
      data: {
        type: "etapa_atribuida",
        title: `Nova etapa para você: ${stage.titulo}`,
        message: `A etapa "${stage.titulo}" da tarefa "${taskTitulo}" está liberada para execução.${prazo}`,
        severity: "info",
        category: "notificacao",
        entity_type: "project_task_stage",
        entity_id: stage.id,
        user_id: userId,
        action_url: destino,
      },
    });
  } catch (err) {
    console.error("[stage-engine] falha ao notificar executor:", err);
  }
}

/** Aviso ao nômade preferido: a etapa ficou reservada a ele até o prazo (A8b-3). Nunca derruba a abertura da etapa. */
async function avisarNomadePreferido(db: Db, nomadeId: string, etapa: string, tarefa: string, ate: Date): Promise<void> {
  try {
    const n = await db.nomade.findUnique({ where: { id: nomadeId }, select: { user_id: true } });
    if (!n?.user_id) return;
    await db.systemAlert.create({
      data: {
        type: "etapa_reservada", title: `Etapa reservada para você: ${etapa}`,
        message: `A etapa "${etapa}" da tarefa "${tarefa}" ficou reservada para você. Aceite até ${ate.toLocaleString("pt-BR")}; depois disso ela abre para os demais profissionais.`,
        severity: "info", category: "alerta", entity_type: "project_task_stage", entity_id: null, user_id: n.user_id, action_url: "/nomades/minhastarefas",
      },
    });
  } catch (err) {
    console.error("[stage-engine] avisar nômade preferido:", err);
  }
}

/** Dia útil não é modelado no sistema; prazo é em dias corridos. */
function somarDias(base: Date, dias: number): Date {
  return new Date(base.getTime() + dias * 86400000);
}

function somarHoras(base: Date, horas: number): Date {
  return new Date(base.getTime() + horas * 3600000);
}

/**
 * Abre uma etapa: calcula prazos, define executor e grava o status resultante.
 *
 * `nomadeAnterior` só é usado quando a etapa pede continuidade
 * (`manter_mesmo_nomade`) — é o que evita trocar de pessoa no meio de um
 * trabalho que depende de contexto acumulado.
 */
export async function abrirEtapa(
  db: Db,
  stageId: string,
  opts: {
    nomadeAnterior?: string | null;
    /**
     * Se a etapa anterior pediu continuidade. A decisão é dela, não desta: o
     * campo de origem é `keepNomadOnNextStage` — "mantenha o nômade NA
     * PRÓXIMA etapa". Ler a flag da etapa que está sendo aberta inverteria o
     * significado e trocaria de executor exatamente onde não devia.
     */
    herdarNomade?: boolean;
    /** Nômade que executou a etapa citada na regra "preferir/nunca o mesmo" (A8b-3). */
    preferenciaNomadeId?: string | null;
  } = {},
): Promise<AberturaEtapa> {
  const stage = await db.projectTaskStage.findUniqueOrThrow({
    where: { id: stageId },
    include: { project_task: { select: { id: true, title: true, lider_responsavel_id: true } } },
  });

  // Portão de aprovação (antes de iniciar / depois da etapa anterior / antes de publicar): a etapa espera, sem prazo correndo.
  {
    const gates = await import("./approval-gates");
    const unmet = await gates.unmetGatesForStageStart(db, stage);
    if (unmet.length > 0) {
      const wasWaiting = stage.status === gates.STAGE_WAITING_APPROVAL;
      const waiting = await db.projectTaskStage.update({ where: { id: stageId }, data: { status: gates.STAGE_WAITING_APPROVAL, iniciada_em: null } });
      if (!wasWaiting) {
        await gates.notifyApprovers(db, stage.project_task.id, unmet);
        await (await import("./sla")).pauseTaskClocks(db, stage.project_task.id, { reason: "aprovacao_pendente", reasonText: `Aprovação pendente: ${unmet.map((g) => g.name).join("; ")}`, party: unmet[0].approver_kind === "client" ? "client" : "leader" });
        const t = await db.projectTask.findUnique({ where: { id: stage.project_task.id }, select: { project_id: true } });
        if (t) await logProjectDecision(db, { projectId: t.project_id, projectTaskId: stage.project_task.id, kind: "approval_gate_waiting", message: `A etapa "${stage.titulo}" aguarda aprovação: ${unmet.map((g) => g.name).join("; ")}.` });
      }
      return { stageId: waiting.id, titulo: waiting.titulo, status: waiting.status, executor_type: waiting.executor_type, nomade_id: null, lider_id: null, prazo_execucao: null, herdou_nomade: false };
    }
  }

  // Dependência de ETAPA (ex.: aguardando o entregável aprovado de outro produto comprado junto): só esta etapa espera.
  if (stage.catalog_step_ref) {
    const rules = await db.projectDependencyRule.findMany({ where: { task_id: stage.project_task_id, behavior: "block_stage", stage_gate: "start", dependent_stage_key: stage.catalog_step_ref, NOT: { target_kind: "connection" } } });
    const unmetDeps = (await Promise.all(rules.map((r) => evaluateRule(db, r)))).filter((s) => !s.satisfied);
    if (unmetDeps.length > 0) {
      const wasWaiting = stage.status === "AGUARDANDO_DEPENDENCIA";
      const waiting = await db.projectTaskStage.update({ where: { id: stageId }, data: { status: "AGUARDANDO_DEPENDENCIA", iniciada_em: null } });
      if (!wasWaiting) {
        const t = await db.projectTask.findUnique({ where: { id: stage.project_task.id }, select: { project_id: true, lider_responsavel_id: true } });
        if (t) {
          await logProjectDecision(db, { projectId: t.project_id, projectTaskId: stage.project_task.id, kind: "stage_waiting_dependency", message: `A etapa "${stage.titulo}" aguarda: ${unmetDeps.map((d) => d.reason).join("; ")}.` });
          await (await import("./sla")).pauseTaskClocks(db, stage.project_task.id, { reason: "material_nao_enviado", reasonText: `Aguardando entregável de outro produto: ${unmetDeps.map((d) => d.reason).join("; ")}`, party: "leader" });
        }
      }
      return { stageId: waiting.id, titulo: waiting.titulo, status: waiting.status, executor_type: waiting.executor_type, nomade_id: null, lider_id: null, prazo_execucao: null, herdou_nomade: false };
    }
    if (stage.status === "AGUARDANDO_DEPENDENCIA") await (await import("./sla")).resumeTaskClocks(db, stage.project_task_id, null, "material_nao_enviado");
  }

  const agora = new Date();
  const prazoExecucao = stage.prazo_execucao
    ? stage.prazo_execucao
    : stage.horas_execucao
      ? somarHoras(agora, stage.horas_execucao)
      : somarDias(agora, 3);

  let nomadeId: string | null = null;
  let liderId: string | null = null;
  let status: string = STAGE_STATUS.EM_ANDAMENTO;
  let herdouNomade = false;

  if (stage.executor_type === "internal") {
    // Execução interna não passa por marketplace nem por líder: já nasce
    // andando, sob responsabilidade da operação.
    status = STAGE_STATUS.EM_ANDAMENTO;
  } else if (stage.executor_type === "leader") {
    // Etapa do líder da área — reaproveita o líder já atribuído à tarefa
    // quando houver, senão fica aguardando definição.
    // Líder específico configurado na etapa tem prioridade; senão o líder da tarefa (atribuído por área).
    liderId = stage.lider_id ?? stage.project_task.lider_responsavel_id ?? null;
    status = liderId ? STAGE_STATUS.EM_ANDAMENTO : STAGE_STATUS.AGUARDANDO_EXECUTOR;
  } else {
    // nomad: continuidade tem prioridade sobre nova seleção.
    if (opts.herdarNomade && opts.nomadeAnterior) {
      nomadeId = opts.nomadeAnterior;
      herdouNomade = true;
      status = STAGE_STATUS.EM_ANDAMENTO;
    } else {
      status = STAGE_STATUS.AGUARDANDO_EXECUTOR;
    }
  }

  const atualizada = await db.projectTaskStage.update({
    where: { id: stageId },
    data: {
      status,
      nomade_id: nomadeId,
      lider_id: liderId,
      prazo_execucao: prazoExecucao,
      prazo_aprovacao: stage.prazo_aprovacao ?? somarDias(prazoExecucao, 5),
      iniciada_em: agora,
    },
  });

  // A8b-3: "preferir o mesmo" reserva a etapa ao nômade preferido por um prazo de aceite; "nunca o mesmo" o exclui da vaga.
  if (status === STAGE_STATUS.AGUARDANDO_EXECUTOR && stage.executor_type === "nomad" && stage.preferencia_nomade && opts.preferenciaNomadeId) {
    if (stage.preferencia_nomade === "never_same") {
      await db.projectTaskStage.update({ where: { id: stageId }, data: { nomade_excluido_id: opts.preferenciaNomadeId } });
    } else if (stage.preferencia_nomade === "prefer_same") {
      const cfg = await db.taskRoutingSettings.findUnique({ where: { id: "singleton" }, select: { stage_preferred_accept_minutes: true } });
      const minutos = stage.aceite_horas ? stage.aceite_horas * 60 : cfg?.stage_preferred_accept_minutes ?? 120;
      const ate = new Date(agora.getTime() + minutos * 60000);
      await db.projectTaskStage.update({ where: { id: stageId }, data: { nomade_preferido_id: opts.preferenciaNomadeId, reservada_ate: ate } });
      await avisarNomadePreferido(db, opts.preferenciaNomadeId, stage.titulo, stage.project_task.title, ate);
    }
  }

  // Só avisa quando a etapa já tem dono; se ficou AGUARDANDO_EXECUTOR, o aviso
  // sai quando a atribuição acontecer (ver atribuirExecutorDaEtapa).
  if (status === STAGE_STATUS.EM_ANDAMENTO && (nomadeId || liderId)) {
    await avisarExecutor(db, atualizada, stage.project_task.title);
  }

  return {
    stageId: atualizada.id,
    titulo: atualizada.titulo,
    status: atualizada.status,
    executor_type: atualizada.executor_type,
    nomade_id: atualizada.nomade_id,
    lider_id: atualizada.lider_id,
    prazo_execucao: atualizada.prazo_execucao,
    herdou_nomade: herdouNomade,
  };
}

/**
 * Fluxo configurado (A8): abre todas as etapas ainda não abertas cujas dependências já terminaram.
 * Quem decide o executor é a própria etapa que abre: se ela pede "o mesmo executor de X", herda o de X; senão o sistema escolhe.
 */
export async function abrirEtapasLiberadas(db: Db, taskId: string, concluida: { id: string; nomade_id: string | null } | null): Promise<AberturaEtapa[]> {
  const etapas = await db.projectTaskStage.findMany({ where: { project_task_id: taskId }, orderBy: [{ ordem: "asc" }, { created_at: "asc" }] });
  const doneRefs = new Set(etapas.filter((e) => e.status === STAGE_STATUS.CONCLUIDA && e.catalog_step_ref).map((e) => e.catalog_step_ref as string));
  const byRef = new Map(etapas.filter((e) => e.catalog_step_ref).map((e) => [e.catalog_step_ref as string, e]));
  const abertas: AberturaEtapa[] = [];
  for (const e of etapas) {
    if (![STAGE_STATUS.PENDENTE, STAGE_STATUS.BLOQUEADA].includes(e.status as never) || e.iniciada_em) continue;
    let deps: string[] = [];
    try { deps = e.depende_de_json ? (JSON.parse(e.depende_de_json) as string[]) : []; } catch { deps = []; }
    if (!deps.every((d) => doneRefs.has(d))) continue;
    const origem = e.herdar_executor_de ? byRef.get(e.herdar_executor_de) : null;
    const refPref = e.preferencia_ref ? byRef.get(e.preferencia_ref) : null;
    abertas.push(await abrirEtapa(db, e.id, {
      nomadeAnterior: origem?.nomade_id ?? null,
      herdarNomade: !!origem?.nomade_id,
      preferenciaNomadeId: refPref?.nomade_id ?? null,
    }));
  }
  void concluida;
  return abertas;
}

/**
 * Abre a primeira etapa de uma tarefa — chamado quando a tarefa é liberada
 * para execução. Idempotente: se alguma etapa já está andando, não faz nada.
 */
export async function iniciarEtapasDaTarefa(
  db: Db,
  taskId: string,
): Promise<AberturaEtapa | null> {
  const etapas = await db.projectTaskStage.findMany({
    where: { project_task_id: taskId },
    orderBy: { ordem: "asc" },
  });
  if (etapas.length === 0) return null;

  const jaAndando = etapas.some((e) =>
    [STAGE_STATUS.EM_ANDAMENTO, STAGE_STATUS.AGUARDANDO_EXECUTOR, STAGE_STATUS.EM_QUALIFICACAO, STAGE_STATUS.EM_APROVACAO_CLIENTE, "AGUARDANDO_APROVACAO", "AGUARDANDO_DEPENDENCIA"].includes(e.status as any),
  );
  if (jaAndando) return null;

  // Fluxo configurado (etapas em paralelo / dependências): abre todas as que não esperam ninguém.
  if (etapas.some((e) => e.depende_de_json != null)) {
    const abertas = await abrirEtapasLiberadas(db, taskId, null);
    return abertas[0] ?? null;
  }

  const primeira = etapas.find((e) => e.status !== STAGE_STATUS.CONCLUIDA);
  if (!primeira) return null;

  return abrirEtapa(db, primeira.id);
}

/**
 * Avisa quem precisa conferir que a entrega chegou na fila dele.
 *
 * A tela de aprovação existe dos dois lados, mas ninguém abre uma tela por
 * adivinhação: sem este aviso a tarefa fica parada esperando um aceite que a
 * pessoa não sabe que foi pedido. Mesma regra do `avisarExecutor` — falhar
 * aqui não pode derrubar a transição, o aviso é acessório.
 *
 * Endereçado a pessoas, não à organização: `SystemAlert.user_id` nulo é mural
 * do Admin (ver a migration `alerta_com_destinatario`). Como uma agência ou
 * empresa pode ter mais de um usuário, avisa todos os vinculados — quem
 * resolver primeiro resolve para todos.
 */
async function avisarAprovadores(
  db: Db,
  taskId: string,
  nivel: NivelAprovacao,
  etapa?: string,
): Promise<void> {
  try {
    const tarefa = await db.projectTask.findUnique({
      where: { id: taskId },
      select: {
        title: true,
        task_code: true,
        responsavel_agencia_id: true,
        project: {
          select: {
            title: true,
            agency: true,
            agency_id: true,
            company_id: true,
            client_id: true,
          },
        },
      },
    });
    if (!tarefa) return;

    let destinatarios: string[] = [];

    if (nivel === "agencia") {
      // Quem já é o responsável pela tarefa tem preferência: avisar a agência
      // inteira quando existe um dono definido só espalha ruído.
      if (tarefa.responsavel_agencia_id) {
        destinatarios = [tarefa.responsavel_agencia_id];
      } else {
        // Escopo novo (agency_id) e o legado (nome da agência) convivem — ver
        // src/lib/project-scope.ts. Sem cobrir os dois, projeto antigo não
        // avisa ninguém.
        let agencyId = tarefa.project?.agency_id ?? null;
        if (!agencyId && tarefa.project?.agency) {
          const porNome = await db.agency.findFirst({
            where: { name: tarefa.project.agency },
            select: { id: true },
          });
          agencyId = porNome?.id ?? null;
        }
        if (agencyId) {
          const users = await db.user.findMany({
            where: { agency_id: agencyId },
            select: { id: true },
          });
          destinatarios = users.map((u) => u.id);
        }
      }
    } else {
      const companyId = tarefa.project?.company_id ?? tarefa.project?.client_id ?? null;
      if (companyId) {
        const users = await db.user.findMany({
          where: { company_id: companyId },
          select: { id: true },
        });
        destinatarios = users.map((u) => u.id);
      }
    }

    if (destinatarios.length === 0) return;

    const codigo = tarefa.task_code ? ` (${tarefa.task_code})` : "";
    const projeto = tarefa.project?.title ? ` do projeto "${tarefa.project.title}"` : "";
    const titulo = etapa
      ? `Etapa para aprovar: ${etapa} — ${tarefa.title}`
      : nivel === "agencia"
        ? `Entrega para conferir: ${tarefa.title}`
        : `Sua aprovação foi solicitada: ${tarefa.title}`;
    const mensagem = etapa
      ? `A etapa "${etapa}" da tarefa "${tarefa.title}"${codigo}${projeto} foi qualificada e aguarda a sua aprovação para liberar a próxima.`
      : nivel === "agencia"
        ? `A execução da tarefa "${tarefa.title}"${codigo}${projeto} terminou e está aguardando a conferência da agência.`
        : `A agência já conferiu a tarefa "${tarefa.title}"${codigo}${projeto}. Falta o seu aceite para encerrar.`;

    await db.systemAlert.createMany({
      data: destinatarios.map((userId) => ({
        type: nivel === "agencia" ? "aprovacao_pendente_agencia" : "aprovacao_pendente_cliente",
        title: titulo,
        message: mensagem,
        severity: "info",
        category: "alerta",
        entity_type: "project_task",
        entity_id: taskId,
        user_id: userId,
        action_url: nivel === "agencia" ? "/agency/tarefas" : "/company/tarefas",
      })),
    });
  } catch (err) {
    console.error("[stage-engine] avisar aprovadores:", err);
  }
}

/**
 * Avisa quem executou que a entrega voltou, e por quê.
 *
 * O motivo da reprovação é a única informação que faz a pessoa conseguir
 * corrigir; sem o aviso, a etapa reabre em silêncio e o motivo fica só no
 * banco.
 */
async function avisarReprovacao(
  db: Db,
  stageId: string,
  motivo: string,
  nivel: NivelAprovacao | "qualificacao" | "revisao",
): Promise<void> {
  try {
    const etapa = await db.projectTaskStage.findUnique({
      where: { id: stageId },
      select: {
        titulo: true,
        nomade_id: true,
        lider_id: true,
        project_task: { select: { title: true } },
      },
    });
    if (!etapa) return;

    let userId: string | null = etapa.lider_id;
    let destino = "/lider/tarefas";
    if (etapa.nomade_id) {
      const nomade = await db.nomade.findUnique({
        where: { id: etapa.nomade_id },
        select: { user_id: true },
      });
      if (!nomade?.user_id) return;
      userId = nomade.user_id;
      destino = "/nomades/minhastarefas";
    }
    if (!userId) return;

    await db.systemAlert.create({
      data: {
        type: "tarefa_reprovada",
        title: `Ajuste solicitado: ${etapa.titulo}`,
        message: `${nivel === "cliente" ? "O cliente" : nivel === "qualificacao" ? "O líder/qualificador" : nivel === "revisao" ? "O revisor" : "A agência"} pediu ajustes na tarefa "${etapa.project_task.title}". Motivo: ${motivo}`,
        severity: "warning",
        category: "alerta",
        entity_type: "project_task_stage",
        entity_id: stageId,
        user_id: userId,
        action_url: destino,
        events: nestedAlertEventCreate({
          eventType: "created",
          description: "Ocorrência gerada automaticamente — ajuste solicitado numa etapa.",
        }),
      },
    });
  } catch (err) {
    console.error("[stage-engine] avisar reprovação:", err);
  }
}

export interface ResultadoConclusao {
  etapaConcluida: string;
  /** Tarefa-pai da etapa (pra quem precisa agir depois da transação). */
  tarefaId: string;
  proxima: AberturaEtapa | null;
  /** Só true quando a tarefa realmente encerrou (após os aceites). */
  tarefaConcluida: boolean;
  /** Última etapa concluída: a tarefa foi para aprovação de quem contratou. */
  enviadaParaAprovacao: boolean;
  /** Última etapa concluída numa tarefa com revisão obrigatória: aguarda o revisor (antes da qualificação e da aprovação). */
  enviadaParaRevisao?: boolean;
  /** Última etapa concluída numa tarefa com qualificação obrigatória: aguarda o líder/qualificador. */
  enviadaParaQualificacao?: boolean;
  /** Última etapa concluída, mas a entrega ficou segura por uma dependência (anexo/aprovação/item de outro produto). */
  aguardandoDependencia?: boolean;
  /** Execução por etapa: a etapa foi aprovada mas a próxima só abre com liberação manual. */
  aguardandoLiberacao?: boolean;
  /** Execução por etapa: a etapa foi entregue e aguarda qualificação ("qualificacao") ou aprovação ("aprovacao"). */
  etapaEmConferencia?: "qualificacao" | "aprovacao";
}

/**
 * Conclui uma etapa e abre a seguinte. Quando não há próxima etapa obrigatória
 * pendente, encerra a tarefa-pai.
 */
export async function concluirEtapa(
  db: Db,
  stageId: string,
  opts: { userId?: string } = {},
): Promise<ResultadoConclusao> {
  const stage = await db.projectTaskStage.findUniqueOrThrow({
    where: { id: stageId },
    include: { project_task: { select: { id: true, status: true, requires_qualification: true, qualification_round: true, stage_execution: true } } },
  });

  if (stage.status === STAGE_STATUS.EM_QUALIFICACAO || stage.status === STAGE_STATUS.EM_APROVACAO_CLIENTE) {
    throw new DependencyBlockedError("Esta etapa já foi entregue e aguarda a conferência. Ela segue quando for aprovada, ou volta para ajuste se for reprovada.");
  }
  if (stage.status === STAGE_STATUS.CONCLUIDA) {
    return {
      etapaConcluida: stageId,
      tarefaId: stage.project_task_id,
      proxima: null,
      tarefaConcluida: false,
      enviadaParaAprovacao: false,
      enviadaParaQualificacao: false,
      enviadaParaRevisao: false,
    };
  }

  if (stage.status === "AGUARDANDO_APROVACAO") {
    throw new DependencyBlockedError("Esta etapa aguarda uma aprovação antes de começar. Ela só pode ser trabalhada depois que o portão de aprovação for aprovado.");
  }
  if (stage.status === "AGUARDANDO_DEPENDENCIA") {
    throw new DependencyBlockedError("Esta etapa aguarda o entregável de outro produto comprado junto. Ela só começa depois que ele for aprovado.");
  }
  // Dependência de etapa que bloqueia a CONCLUSÃO (ex.: não concluir a publicação sem o ativo do outro produto).
  if (stage.catalog_step_ref) {
    const concl = await db.projectDependencyRule.findMany({ where: { task_id: stage.project_task_id, behavior: "block_stage", stage_gate: "conclude", dependent_stage_key: stage.catalog_step_ref, NOT: { target_kind: "connection" } } });
    const unmetConcl = (await Promise.all(concl.map((r) => evaluateRule(db, r)))).filter((s) => !s.satisfied);
    if (unmetConcl.length) throw new DependencyBlockedError(`Esta etapa só conclui depois que: ${unmetConcl.map((d) => d.reason).join("; ")}`);
  }
  // Tarefa pausada por dependência externa (conexão): nada avança até resolver (SLA suspenso).
  if (stage.project_task.status === "PAUSADA_DEPENDENCIA_EXTERNA") {
    throw new DependencyBlockedError("A tarefa está pausada por dependência externa (conexão necessária). Resolva a pendência de conexão para continuar.");
  }
  if (stage.catalog_step_ref) {
    // Conexão exigida para CONCLUIR esta etapa específica.
    const mine = await db.projectDependencyRule.findMany({ where: { task_id: stage.project_task_id, target_kind: "connection", behavior: "block_stage", connection_dep_kind: "conclude", dependent_stage_key: stage.catalog_step_ref }, select: { id: true } });
    if (mine.length) {
      const ids = new Set(mine.map((m) => m.id));
      const unmet = (await unmetRules(db, stage.project_task_id, ["block_stage"])).filter((r) => ids.has(r.ruleId));
      if (unmet.length) throw new DependencyBlockedError(`Esta etapa só conclui com a conexão necessária: ${unmet.map((b) => b.reason).join("; ")}`);
    }
  }

  // Entregáveis OBRIGATÓRIOS do executor/líder (Pedido 3, fase 3): sem eles a etapa não conclui.
  await assertRequiredDeliverablesForStage(db, stageId);

  // Dependência "bloquear a execução final/publicação": pode iniciar e executar, mas a
  // ÚLTIMA etapa obrigatória não conclui enquanto o item vinculado não estiver pronto.
  const outrasPendentes = await db.projectTaskStage.count({
    where: { project_task_id: stage.project_task_id, obrigatoria: true, status: { not: STAGE_STATUS.CONCLUIDA }, id: { not: stageId } },
  });
  if (outrasPendentes === 0) {
    const bloqueios = await unmetRules(db, stage.project_task_id, ["block_final"]);
    if (bloqueios.length > 0) {
      throw new DependencyBlockedError(`A execução final está bloqueada: ${bloqueios.map((b) => b.reason).join("; ")}`);
    }
  }

  const agora = new Date();
  // Execução por ETAPA: a entrega do executor vai para qualificação/aprovação em vez de concluir direto.
  if (stage.project_task.stage_execution === "stage") return entregarEtapa(db, stage, opts, agora);
  await db.projectTaskStage.update({
    where: { id: stageId },
    data: {
      status: STAGE_STATUS.CONCLUIDA,
      concluida_em: agora,
      concluida_por: opts.userId ?? null,
    },
  });
  return seguirDepoisDeEtapaConcluida(db, stage, opts, agora);
}

type StageComTarefa = Prisma.ProjectTaskStageGetPayload<{ include: { project_task: { select: { id: true; status: true; requires_qualification: true; qualification_round: true; stage_execution: true } } } }>;

/** Tudo o que acontece DEPOIS de uma etapa ficar concluída: reabre portões, libera as próximas etapas e encerra a tarefa quando acabou. */
async function seguirDepoisDeEtapaConcluida(db: Db, stage: StageComTarefa, opts: { userId?: string }, agora: Date): Promise<ResultadoConclusao> {
  const stageId = stage.id;
  const modoEtapa = stage.project_task.stage_execution === "stage";
  let aguardandoLiberacao = false;
  // Etapa de retorno concluída de novo: portões reprovados voltam a ficar pendentes (nova rodada).
  if (stage.catalog_step_ref) {
    const done = await db.catalog2TaskStep.findUnique({ where: { id: stage.catalog_step_ref }, select: { key: true } });
    if (done) await (await import("./approval-gates")).reopenRejectedGates(db, stage.project_task_id, done.key);
  }

  // A próxima etapa é a seguinte NA LISTA, não a de "ordem maior": dados
  // vindos da plataforma antiga trazem ordem repetida (três etapas "número
  // 1"), e comparar só por ordem faria a sequência parar na primeira.
  const todas = await db.projectTaskStage.findMany({
    where: { project_task_id: stage.project_task_id },
    orderBy: [{ ordem: "asc" }, { created_at: "asc" }],
    select: { id: true, status: true },
  });
  const todasFlow = await db.projectTaskStage.findMany({ where: { project_task_id: stage.project_task_id }, select: { id: true, depende_de_json: true } });
  const posicaoAtual = todas.findIndex((e) => e.id === stageId);
  const seguinte = todas
    .slice(posicaoAtual + 1)
    .find((e) => e.status !== STAGE_STATUS.CONCLUIDA);

  let proxima: AberturaEtapa | null = null;
  const fluxoConfigurado = todasFlow.some((e) => e.depende_de_json != null);
  if (modoEtapa && !stage.libera_proxima_auto) {
    // Liberação manual: a próxima etapa só abre quando o líder/administrador liberar (ver liberarProximasEtapas).
    aguardandoLiberacao = true;
  } else if (fluxoConfigurado) {
    const abertas = await abrirEtapasLiberadas(db, stage.project_task_id, stage);
    proxima = abertas[0] ?? null;
    if (abertas.length) {
      const { recalcTaskConnections } = await import("./connections/flow");
      await recalcTaskConnections(db, stage.project_task_id, opts.userId ? { id: opts.userId } : null);
    }
  } else if (seguinte) {
    proxima = await abrirEtapa(db, seguinte.id, {
      // Continuidade só faz sentido a partir de quem acabou de executar, e
      // quem decide é a etapa que está fechando (`keepNomadOnNextStage`).
      nomadeAnterior: stage.nomade_id,
      herdarNomade: stage.manter_mesmo_nomade,
    });
    // Conexão exigida para a próxima etapa: se faltar, a tarefa fica pausada por dependência externa (SLA suspenso).
    const { recalcTaskConnections } = await import("./connections/flow");
    await recalcTaskConnections(db, stage.project_task_id, opts.userId ? { id: opts.userId } : null);
  }

  // Tarefa encerra quando não sobra etapa obrigatória em aberto.
  const pendentesObrigatorias = await db.projectTaskStage.count({
    where: {
      project_task_id: stage.project_task_id,
      obrigatoria: true,
      status: { not: STAGE_STATUS.CONCLUIDA },
    },
  });

  // Executor terminar não é a tarefa terminar: quem contratou ainda confere.
  // A tarefa vai para aprovação da agência e só encerra depois do aceite —
  // ver PATCH /api/project-tasks/:id/aprovar. Com qualificação obrigatória, antes
  // disso o líder/qualificador precisa aceitar. Com dependência "exigir antes da
  // entrega" pendente, a entrega fica segura até o item/aprovação existir.
  let tarefaConcluida = false;
  let enviadaParaAprovacao = false;
  let enviadaParaQualificacao = false;
  let enviadaParaRevisao = false;
  let aguardandoDependencia = false;
  if (pendentesObrigatorias === 0 && !["CONCLUIDA", "CANCELADA"].includes(stage.project_task.status)) {
    const seguradasRegras = await unmetRules(db, stage.project_task_id, ["require_before_delivery"]);
    const seguradasGates = await (await import("./approval-gates")).unmetDeliveryGates(db, stage.project_task_id);
    const seguradas = [...seguradasRegras, ...seguradasGates.map((g) => ({ reason: `aprovação "${g.name}"` }))];
    if (seguradas.length > 0) {
      if (seguradasGates.length > 0) {
        await (await import("./approval-gates")).notifyApprovers(db, stage.project_task_id, seguradasGates);
        await (await import("./sla")).pauseTaskClocks(db, stage.project_task_id, { reason: "aprovacao_pendente", reasonText: `Aprovação pendente: ${seguradasGates.map((g) => g.name).join("; ")}`, party: seguradasGates[0].approver_kind === "client" ? "client" : "leader" });
      }
      await db.projectTask.update({ where: { id: stage.project_task_id }, data: { status: "AGUARDANDO_DEPENDENCIA_PRODUTO", data_conclusao: agora } });
      const t = await db.projectTask.findUnique({ where: { id: stage.project_task_id }, select: { project_id: true, project_product_id: true, title: true } });
      if (t) {
        await logProjectDecision(db, {
          projectId: t.project_id, projectProductId: t.project_product_id, projectTaskId: stage.project_task_id, kind: "dependency_blocked",
          message: `A entrega de "${t.title}" aguarda: ${seguradas.map((s) => s.reason).join("; ")}.`,
        });
      }
      aguardandoDependencia = true;
    } else {
      if (modoEtapa) {
        // Cada etapa já foi qualificada e aprovada: a tarefa encerra direto, sem repetir o aceite no fim.
        await db.projectTask.update({ where: { id: stage.project_task_id }, data: { status: "CONCLUIDA", data_conclusao: agora, completed_at: agora } });
        tarefaConcluida = true;
      } else {
        const destino = await enviarParaAceite(db, stage.project_task_id, { userId: opts.userId, agora });
        enviadaParaQualificacao = destino === "qualificacao";
        enviadaParaRevisao = destino === "revisao";
        enviadaParaAprovacao = destino === "aprovacao";
      }
    }
  }

  return { etapaConcluida: stageId, tarefaId: stage.project_task_id, proxima, tarefaConcluida, enviadaParaAprovacao, enviadaParaQualificacao, enviadaParaRevisao, aguardandoDependencia, aguardandoLiberacao };
}

// ─── Execução por ETAPA (A8b fase 2, reunião 2026-10-05) ──────────────────────────────────────────────
// Quando a tarefa tem stage_execution = "stage", cada etapa percorre: executor entrega → qualificação do líder (se exigida) →
// aprovação de quem contratou (se a etapa não é interna) → concluída → libera a próxima (automática, se configurado).
// Reprovação em qualquer ponto devolve a etapa ao MESMO executor, com o MESMO prazo, e conta uma rodada de ajuste.
// Tarefas em modo "task" (padrão) não passam por nada disto.

export class EtapaDecisaoError extends Error {
  constructor(message: string, public httpStatus = 422) {
    super(message);
    this.name = "EtapaDecisaoError";
  }
}
export type TipoDecisaoEtapa = "qualificacao" | "aprovacao";
export type DecisaoEtapa = "aprovar" | "reprovar" | "comentar";

const baseResultado = (stage: StageComTarefa): ResultadoConclusao => ({
  etapaConcluida: stage.id,
  tarefaId: stage.project_task_id,
  proxima: null,
  tarefaConcluida: false,
  enviadaParaAprovacao: false,
  enviadaParaQualificacao: false,
  enviadaParaRevisao: false,
});

/** Quem aprova no nível de "quem contratou": a agência (quando o projeto tem uma) ou a empresa. */
async function nivelDoProjeto(db: Db, taskId: string): Promise<NivelAprovacao> {
  const t = await db.projectTask.findUnique({ where: { id: taskId }, select: { project: { select: { agency_id: true, agency: true } } } });
  return t?.project?.agency_id || t?.project?.agency ? "agencia" : "cliente";
}

/** O executor entregou a etapa: vai para a qualificação do líder (se a etapa exige) ou direto para a aprovação/conclusão. */
async function entregarEtapa(db: Db, stage: StageComTarefa, opts: { userId?: string }, agora: Date): Promise<ResultadoConclusao> {
  const round = (stage.rodada_ajuste ?? 0) + 1;
  if (stage.exige_qualificacao) {
    await db.projectTaskStage.update({ where: { id: stage.id }, data: { status: STAGE_STATUS.EM_QUALIFICACAO, entregue_em: agora, concluida_por: opts.userId ?? null } });
    await db.projectTaskStageReview.create({ data: { stage_id: stage.id, kind: "qualificacao", decision: "solicitada", round, actor_user_id: opts.userId ?? null } });
    return { ...baseResultado(stage), enviadaParaQualificacao: true, etapaEmConferencia: "qualificacao" };
  }
  await db.projectTaskStage.update({ where: { id: stage.id }, data: { entregue_em: agora, concluida_por: opts.userId ?? null } });
  return seguirParaAprovacaoOuConcluir(db, stage, opts, agora, round);
}

/** Depois da qualificação (ou sem ela): o cliente aprova a etapa; etapa interna conclui sem passar pelo cliente. */
async function seguirParaAprovacaoOuConcluir(db: Db, stage: StageComTarefa, opts: { userId?: string }, agora: Date, round: number): Promise<ResultadoConclusao> {
  if (stage.visivel_ao_cliente) {
    // B5: prazo de aprovação da etapa, em horas úteis do calendário da plataforma (sem configuração, vale o prazo antigo).
    let prazoAprovacao: Date | undefined;
    if (stage.aprovacao_horas) { await ensureWorkCalendar(db); prazoAprovacao = addBusinessMinutes(agora, stage.aprovacao_horas * 60); }
    await db.projectTaskStage.update({ where: { id: stage.id }, data: { status: STAGE_STATUS.EM_APROVACAO_CLIENTE, ...(prazoAprovacao ? { prazo_aprovacao: prazoAprovacao } : {}) } });
    await db.projectTaskStageReview.create({ data: { stage_id: stage.id, kind: "aprovacao", decision: "solicitada", round, actor_user_id: opts.userId ?? null } });
    await avisarAprovadores(db, stage.project_task_id, await nivelDoProjeto(db, stage.project_task_id), stage.titulo);
    return { ...baseResultado(stage), enviadaParaAprovacao: true, etapaEmConferencia: "aprovacao" };
  }
  await db.projectTaskStage.update({ where: { id: stage.id }, data: { status: STAGE_STATUS.CONCLUIDA, concluida_em: agora, aprovada_em: agora } });
  return seguirDepoisDeEtapaConcluida(db, stage, opts, agora);
}

/** Qualificação (líder) ou aprovação (quem contratou) de UMA etapa. Reprovar devolve ao mesmo executor, com o mesmo prazo. */
export async function decidirEtapa(
  db: Db,
  stageId: string,
  opts: { tipo: TipoDecisaoEtapa; decisao: DecisaoEtapa; userId: string; comentario?: string | null },
): Promise<ResultadoConclusao & { decisao: DecisaoEtapa; status: string }> {
  const stage = await db.projectTaskStage.findUniqueOrThrow({
    where: { id: stageId },
    include: { project_task: { select: { id: true, status: true, requires_qualification: true, qualification_round: true, stage_execution: true } } },
  });
  if (stage.project_task.stage_execution !== "stage") throw new EtapaDecisaoError("Esta tarefa não usa execução por etapa.");
  const esperado = opts.tipo === "qualificacao" ? STAGE_STATUS.EM_QUALIFICACAO : STAGE_STATUS.EM_APROVACAO_CLIENTE;
  if (stage.status !== esperado) {
    throw new EtapaDecisaoError(`A etapa está "${stage.status}" e não aguarda ${opts.tipo === "qualificacao" ? "qualificação" : "aprovação"} agora.`);
  }
  const texto = (opts.comentario ?? "").trim();
  const round = (stage.rodada_ajuste ?? 0) + 1;
  const agora = new Date();
  const base = baseResultado(stage);

  if (opts.decisao === "comentar") {
    if (!texto) throw new EtapaDecisaoError("Escreva o comentário.");
    await db.projectTaskStageReview.create({ data: { stage_id: stage.id, kind: opts.tipo, decision: "comentario", round, comment: texto, actor_user_id: opts.userId } });
    return { ...base, decisao: "comentar", status: stage.status };
  }

  if (opts.decisao === "reprovar") {
    if (texto.length < 3) throw new EtapaDecisaoError("Informe o motivo da reprovação (mínimo 3 caracteres).");
    // Volta para o MESMO executor. Prazo: o mesmo, a não ser que a etapa tenha prazo de refação (B4) — aí conta N horas úteis a partir de agora.
    let prazoRefacao: Date | undefined;
    if (stage.refacao_horas) { await ensureWorkCalendar(db); prazoRefacao = addBusinessMinutes(agora, stage.refacao_horas * 60); }
    await db.projectTaskStage.update({ where: { id: stage.id }, data: { status: STAGE_STATUS.EM_ANDAMENTO, rodada_ajuste: { increment: 1 }, entregue_em: null, concluida_por: null, ...(prazoRefacao ? { prazo_execucao: prazoRefacao } : {}) } });
    await db.projectTaskStageReview.create({ data: { stage_id: stage.id, kind: opts.tipo, decision: "reprovada", round, comment: texto, actor_user_id: opts.userId } });
    await avisarReprovacao(db, stage.id, texto, opts.tipo === "qualificacao" ? "qualificacao" : "cliente");
    return { ...base, decisao: "reprovar", status: STAGE_STATUS.EM_ANDAMENTO };
  }

  await db.projectTaskStageReview.create({ data: { stage_id: stage.id, kind: opts.tipo, decision: "aprovada", round, comment: texto || null, actor_user_id: opts.userId } });
  if (opts.tipo === "qualificacao") {
    await db.projectTaskStage.update({ where: { id: stage.id }, data: { qualificada_em: agora } });
    const r = await seguirParaAprovacaoOuConcluir(db, stage, { userId: opts.userId }, agora, round);
    return { ...r, decisao: "aprovar", status: stage.visivel_ao_cliente ? STAGE_STATUS.EM_APROVACAO_CLIENTE : STAGE_STATUS.CONCLUIDA };
  }
  await db.projectTaskStage.update({ where: { id: stage.id }, data: { status: STAGE_STATUS.CONCLUIDA, concluida_em: agora, aprovada_em: agora } });
  const r = await seguirDepoisDeEtapaConcluida(db, stage, { userId: opts.userId }, agora);
  return { ...r, decisao: "aprovar", status: STAGE_STATUS.CONCLUIDA };
}

/** Liberação MANUAL da(s) próxima(s) etapa(s): vale para etapas aprovadas cuja configuração não libera sozinha. */
export async function liberarProximasEtapas(db: Db, taskId: string): Promise<AberturaEtapa[]> {
  const task = await db.projectTask.findUnique({ where: { id: taskId }, select: { stage_execution: true, status: true } });
  if (!task || task.stage_execution !== "stage") throw new EtapaDecisaoError("Esta tarefa não usa execução por etapa.");
  const etapas = await db.projectTaskStage.findMany({ where: { project_task_id: taskId }, orderBy: [{ ordem: "asc" }, { created_at: "asc" }] });
  let abertas: AberturaEtapa[] = [];
  if (etapas.some((e) => e.depende_de_json != null)) {
    abertas = await abrirEtapasLiberadas(db, taskId, null);
  } else {
    const i = etapas.findIndex((e) => e.status !== STAGE_STATUS.CONCLUIDA);
    const alvo = i >= 0 ? etapas[i] : null;
    const anteriorOk = i <= 0 || etapas[i - 1].status === STAGE_STATUS.CONCLUIDA;
    if (alvo && anteriorOk && [STAGE_STATUS.PENDENTE, STAGE_STATUS.BLOQUEADA].includes(alvo.status as never) && !alvo.iniciada_em) abertas = [await abrirEtapa(db, alvo.id)];
  }
  if (abertas.length === 0) throw new EtapaDecisaoError("Não há etapa pronta para liberar agora (a anterior precisa estar aprovada).");
  return abertas;
}

/** Líder/administrador avisa quem contratou de um problema numa etapa interna (ex.: acesso ou briefing errado): a etapa passa a ficar visível para o cliente. */
export async function avisarClienteDaEtapa(db: Db, stageId: string, opts: { userId: string; mensagem: string }): Promise<void> {
  const texto = opts.mensagem.trim();
  if (texto.length < 3) throw new EtapaDecisaoError("Escreva o que o cliente precisa corrigir (mínimo 3 caracteres).");
  const stage = await db.projectTaskStage.findUniqueOrThrow({ where: { id: stageId }, include: { project_task: { select: { id: true, stage_execution: true } } } });
  if (stage.project_task.stage_execution !== "stage") throw new EtapaDecisaoError("Esta tarefa não usa execução por etapa.");
  await db.projectTaskStage.update({ where: { id: stageId }, data: { visivel_ao_cliente: true } });
  await db.projectTaskStageReview.create({ data: { stage_id: stageId, kind: "aviso_cliente", decision: "comentario", round: (stage.rodada_ajuste ?? 0) + 1, comment: texto, actor_user_id: opts.userId } });
  const nivel = await nivelDoProjeto(db, stage.project_task_id);
  const tarefa = await db.projectTask.findUnique({ where: { id: stage.project_task_id }, select: { title: true, project: { select: { agency_id: true, company_id: true, client_id: true } } } });
  const donos: string[] = [];
  if (nivel === "agencia" && tarefa?.project?.agency_id) donos.push(...(await db.user.findMany({ where: { agency_id: tarefa.project.agency_id }, select: { id: true } })).map((u) => u.id));
  const companyId = tarefa?.project?.company_id ?? tarefa?.project?.client_id;
  if (companyId) donos.push(...(await db.user.findMany({ where: { company_id: companyId }, select: { id: true } })).map((u) => u.id));
  const destinatarios = [...new Set(donos)];
  if (destinatarios.length) {
    await db.systemAlert.createMany({
      data: destinatarios.map((userId) => ({
        type: "aviso_etapa_cliente", title: `Atenção na etapa "${stage.titulo}"`, message: `A equipe encontrou um problema na etapa "${stage.titulo}" da tarefa "${tarefa?.title ?? ""}": ${texto}`,
        severity: "warning", category: "alerta", entity_type: "project_task", entity_id: stage.project_task_id, user_id: userId, action_url: "/company/tarefas",
      })),
    });
  }
}

/** Depois de pronta a etapa de execução por etapa, garante que o líder/qualificador seja avisado (fora da transação). */
export async function garantirQualificadorDaEtapa(stageId: string): Promise<void> {
  try {
    const etapa = await prisma.projectTaskStage.findUnique({ where: { id: stageId }, select: { id: true, titulo: true, status: true, lider_id: true, project_task_id: true, project_task: { select: { title: true, task_code: true, lider_responsavel_id: true } } } });
    if (!etapa || etapa.status !== STAGE_STATUS.EM_QUALIFICACAO) return;
    let liderId = etapa.lider_id ?? etapa.project_task.lider_responsavel_id;
    if (!liderId) {
      await atribuirLiderParaTarefa(etapa.project_task_id).catch(() => null);
      liderId = (await prisma.projectTask.findUnique({ where: { id: etapa.project_task_id }, select: { lider_responsavel_id: true } }))?.lider_responsavel_id ?? null;
    }
    if (!liderId) return; // atribuirLider já avisa o admin quando não há líder
    await prisma.systemAlert.create({
      data: {
        type: "qualificacao_pendente", title: `Etapa para qualificar: ${etapa.titulo}`,
        message: `A etapa "${etapa.titulo}" da tarefa "${etapa.project_task.title}" foi entregue e aguarda a sua qualificação (aprovar, pedir ajustes ou comentar).`,
        severity: "info", category: "alerta", entity_type: "project_task", entity_id: etapa.project_task_id, user_id: liderId, action_url: "/leader/tarefas",
      },
    });
  } catch (err) {
    console.error("[stage-engine] garantir qualificador da etapa:", err);
  }
}

/** Atribui executor a TODAS as etapas que ficaram aguardando (etapas em paralelo podem abrir várias de uma vez). Idempotente. */
export async function atribuirExecutoresPendentes(taskId: string): Promise<void> {
  // Gancho pós-transação de toda mudança de etapa: etapas que acabaram de fechar pagam o nômade quando a tarefa paga "a cada etapa" (A8b-4).
  await pagarEtapasConcluidas(taskId).catch((err) => console.error("[stage-payout] pagar etapas:", err));
  const pend = await prisma.projectTaskStage.findMany({ where: { project_task_id: taskId, status: STAGE_STATUS.AGUARDANDO_EXECUTOR }, select: { id: true }, orderBy: { ordem: "asc" } });
  for (const p of pend) await atribuirExecutorDaEtapa(p.id).catch((err) => console.error("[stage-engine] atribuir executor:", err));
}


/**
 * Manda a entrega concluída para o próximo aceite: qualificação do líder (quando a
 * tarefa exige) ou conferência de quem contratou. Reaproveitada quando uma dependência
 * que segurava a entrega é cumprida.
 */
export async function enviarParaAceite(
  db: Db,
  taskId: string,
  opts: { userId?: string; agora?: Date } = {},
): Promise<"revisao" | "qualificacao" | "aprovacao" | "nenhum"> {
  const agora = opts.agora ?? new Date();
  const task = await db.projectTask.findUnique({ where: { id: taskId }, select: { status: true, requires_review: true, review_round: true, requires_qualification: true, qualification_round: true } });
  if (!task || ["CONCLUIDA", "CANCELADA"].includes(task.status)) return "nenhum";
  if (task.requires_review) {
    // Revisão obrigatória (conferência técnica): vem ANTES da qualificação e da aprovação.
    // A cada nova entrega começa uma rodada nova, e o aceite anterior deixa de valer.
    const round = (task.review_round ?? 0) + 1;
    await db.projectTask.update({
      where: { id: taskId },
      data: { status: "AGUARDANDO_REVISAO", data_conclusao: agora, review_round: round, reviewed_at: null, reviewed_by: null, qualified_at: null, qualified_by: null },
    });
    await db.projectTaskReview.create({ data: { project_task_id: taskId, round, decision: "solicitada", actor_user_id: opts.userId ?? null } });
    return "revisao";
  }
  return seguirParaQualificacaoOuAprovacao(db, taskId, task, opts.userId, agora);
}

/** Depois da execução (e da revisão, se houver): qualificação do líder ou conferência de quem contratou. */
async function seguirParaQualificacaoOuAprovacao(
  db: Db,
  taskId: string,
  task: { requires_qualification: boolean; qualification_round: number | null },
  userId: string | undefined,
  agora: Date,
): Promise<"qualificacao" | "aprovacao"> {
  if (task.requires_qualification) {
    // Qualificação obrigatória: a entrega NÃO segue pra agência/cliente. Fica aguardando o
    // aceite interno do líder/qualificador — a cada nova entrega começa uma rodada nova.
    const round = (task.qualification_round ?? 0) + 1;
    await db.projectTask.update({
      where: { id: taskId },
      data: { status: "AGUARDANDO_QUALIFICACAO", data_conclusao: agora, qualified_at: null, qualified_by: null, qualification_round: round },
    });
    await db.projectTaskQualification.create({ data: { project_task_id: taskId, round, decision: "solicitada", actor_user_id: userId ?? null } });
    return "qualificacao";
  }
  await db.projectTask.update({ where: { id: taskId }, data: { status: "EM_APROVACAO", data_conclusao: agora } });
  await avisarAprovadores(db, taskId, "agencia");
  return "aprovacao";
}

/**
 * Define o executor de uma etapa que está aguardando.
 *
 * Para etapa de nômade sem continuidade, reaproveita a seleção automática já
 * existente no sistema (que trabalha no nível da tarefa) e traz o resultado
 * para a etapa — em vez de duplicar a regra de escolha em dois lugares.
 */
export async function atribuirExecutorDaEtapa(
  stageId: string,
): Promise<{ status: string; nomade_id: string | null; lider_id: string | null }> {
  const stage = await prisma.projectTaskStage.findUniqueOrThrow({
    where: { id: stageId },
    include: { project_task: { select: { id: true, title: true, status: true, nomade_responsavel_id: true } } },
  });

  if (stage.status !== STAGE_STATUS.AGUARDANDO_EXECUTOR) {
    return { status: stage.status, nomade_id: stage.nomade_id, lider_id: stage.lider_id };
  }

  if (stage.executor_type === "leader") {
    // Etapa do líder sem ninguém definido: aciona a atribuição automática por
    // área, a mesma usada no fluxo de tarefa. Sem isto a etapa ficaria parada
    // em AGUARDANDO_EXECUTOR sem ninguém ser avisado.
    await atribuirLiderParaTarefa(stage.project_task_id).catch(() => null);
    const tarefa = await prisma.projectTask.findUnique({
      where: { id: stage.project_task_id },
      select: { lider_responsavel_id: true },
    });
    if (tarefa?.lider_responsavel_id) {
      const atualizada = await prisma.projectTaskStage.update({
        where: { id: stageId },
        data: { lider_id: tarefa.lider_responsavel_id, status: STAGE_STATUS.EM_ANDAMENTO },
      });
      await avisarExecutor(prisma, atualizada, stage.project_task.title);
      return { status: atualizada.status, nomade_id: null, lider_id: atualizada.lider_id };
    }
    return { status: stage.status, nomade_id: null, lider_id: null };
  }

  if (stage.executor_type === "nomad" && stage.project_task.nomade_responsavel_id && (await prisma.projectTask.findUnique({ where: { id: stage.project_task_id }, select: { stage_execution: true } }))?.stage_execution === "stage") {
    // Execução por etapa (A8b-3): a tarefa já tem um nômade (de outra etapa). Esta etapa NÃO herda ninguém calado: fica na vaga para quem tiver
    // afinidade (respeitando a reserva do preferido e a exclusão de "nunca o mesmo"). Quem pede "o mesmo executor" já herdou na abertura.
    return { status: stage.status, nomade_id: null, lider_id: null };
  }

  if (stage.executor_type === "nomad") {
    // A etapa não escolhe mais um nômade silenciosamente. A tarefa entra no
    // mesmo rodízio de oferta usado pelas tarefas sem etapas, para que o
    // nômade aceite ou recuse. Isso também preserva cada lote contratado:
    // um lote de 3 unidades é UMA oferta/tarefa; 1+1+3 são três ofertas.
    await startTaskRotation(stage.project_task_id).catch(() => null);
    const tarefa = await prisma.projectTask.findUnique({
      where: { id: stage.project_task_id },
      select: { nomade_responsavel_id: true },
    });
    if (tarefa?.nomade_responsavel_id) {
      const atualizada = await prisma.projectTaskStage.update({
        where: { id: stageId },
        data: { nomade_id: tarefa.nomade_responsavel_id, status: STAGE_STATUS.EM_ANDAMENTO },
      });
      // Etapa andando ⇒ tarefa em execução. Sem isto a tarefa ficaria
      // AGUARDANDO_NOMADE (estado deixado pela seleção) mesmo com a etapa
      // já tendo executor.
      if (["LIBERADA_PARA_EXECUCAO", "AGUARDANDO_NOMADE"].includes(stage.project_task.status)) {
        await prisma.projectTask.update({
          where: { id: stage.project_task_id },
          data: { status: "EM_EXECUCAO", data_inicio_execucao: new Date() },
        });
      }
      await avisarExecutor(prisma, atualizada, stage.project_task.title);
      return { status: atualizada.status, nomade_id: atualizada.nomade_id, lider_id: null };
    }
  }

  return { status: stage.status, nomade_id: stage.nomade_id, lider_id: stage.lider_id };
}

// ─── Revisão obrigatória (conferência técnica, ANTES da qualificação e da aprovação) ───
// Execução → REVISÃO (se exigida) → qualificação (se exigida) → aprovação da agência →
// aprovação do cliente (se exigida) → conclusão. O revisor pode aprovar (segue o fluxo),
// reprovar ou pedir ajustes (comentário obrigatório; volta ao executor e reabre a última
// etapa) ou só comentar. Cada decisão guarda a rodada, o autor e o tempo gasto revisando.
// Ajuste interno NÃO conta como alteração grátis do cliente.

export type DecisaoRevisao = "aprovar" | "reprovar" | "ajustes" | "comentar";

export class RevisaoError extends Error {
  httpStatus: number;
  constructor(message: string, httpStatus = 422) {
    super(message);
    this.httpStatus = httpStatus;
  }
}

/** Quem revisa: o revisor designado na tarefa; sem designação, o líder responsável. */
export function revisorDaTarefa(t: { reviewer_user_id: string | null; lider_responsavel_id: string | null }): string | null {
  return t.reviewer_user_id ?? t.lider_responsavel_id ?? null;
}

/** Depois de a tarefa entrar em AGUARDANDO_REVISAO (fora da transação da entrega): garante um revisor e avisa. Nunca lança. */
export async function garantirRevisor(taskId: string): Promise<void> {
  try {
    let tarefa = await prisma.projectTask.findUnique({
      where: { id: taskId },
      select: { title: true, task_code: true, status: true, reviewer_user_id: true, lider_responsavel_id: true },
    });
    if (!tarefa || tarefa.status !== "AGUARDANDO_REVISAO") return;
    let revisor = revisorDaTarefa(tarefa);
    if (!revisor) {
      await atribuirLiderParaTarefa(taskId).catch(() => null);
      tarefa = await prisma.projectTask.findUnique({
        where: { id: taskId },
        select: { title: true, task_code: true, status: true, reviewer_user_id: true, lider_responsavel_id: true },
      });
      revisor = tarefa ? revisorDaTarefa(tarefa) : null;
    }
    if (!tarefa || !revisor) return; // atribuirLider já avisa o admin quando não há líder
    const codigo = tarefa.task_code ? ` (${tarefa.task_code})` : "";
    await prisma.systemAlert.create({
      data: {
        type: "revisao_pendente",
        title: `Entrega para revisar: ${tarefa.title}`,
        message: `A execução da tarefa "${tarefa.title}"${codigo} terminou e aguarda a sua revisão (aprovar, reprovar, pedir ajustes ou comentar).`,
        severity: "info",
        category: "alerta",
        entity_type: "project_task",
        entity_id: taskId,
        user_id: revisor,
        action_url: "/leader/tarefas",
      },
    });
  } catch (err) {
    console.error("[stage-engine] garantir revisor:", err);
  }
}

export async function revisarTarefa(
  db: Db,
  taskId: string,
  opts: { userId: string; decisao: DecisaoRevisao; comentario?: string | null; minutos?: number | null },
): Promise<{ status: string; round: number; proximo: "qualificacao" | "aprovacao" | null; etapaReaberta: string | null }> {
  const tarefa = await db.projectTask.findUniqueOrThrow({ where: { id: taskId } });
  if (!tarefa.requires_review) throw new RevisaoError("Esta tarefa não exige revisão.");
  const comentario = opts.comentario?.trim() || null;
  const round = Math.max(tarefa.review_round, 1);
  const minutos = typeof opts.minutos === "number" && Number.isInteger(opts.minutos) && opts.minutos >= 0 && opts.minutos <= 10_000 ? opts.minutos : null;

  if (opts.decisao === "comentar") {
    if (!comentario) throw new RevisaoError("Escreva o comentário.");
    await db.projectTaskReview.create({ data: { project_task_id: taskId, round, decision: "comentario", comment: comentario, actor_user_id: opts.userId, minutes_spent: minutos } });
    return { status: tarefa.status, round, proximo: null, etapaReaberta: null };
  }

  if (tarefa.status !== "AGUARDANDO_REVISAO") {
    throw new RevisaoError(`Tarefa com status "${tarefa.status}" não está aguardando revisão.`);
  }
  const agora = new Date();

  if (opts.decisao === "aprovar") {
    await db.projectTaskReview.create({ data: { project_task_id: taskId, round, decision: "aprovada", comment: comentario, actor_user_id: opts.userId, minutes_spent: minutos } });
    await db.projectTask.update({ where: { id: taskId }, data: { reviewed_at: agora, reviewed_by: opts.userId } });
    const destino = await seguirParaQualificacaoOuAprovacao(db, taskId, { requires_qualification: tarefa.requires_qualification, qualification_round: tarefa.qualification_round }, opts.userId, agora);
    return { status: destino === "qualificacao" ? "AGUARDANDO_QUALIFICACAO" : "EM_APROVACAO", round, proximo: destino, etapaReaberta: null };
  }

  // reprovar | ajustes
  if (!comentario) throw new RevisaoError("Explique o que precisa ser ajustado.");
  await db.projectTaskReview.create({
    data: { project_task_id: taskId, round, decision: opts.decisao === "ajustes" ? "ajustes" : "reprovada", comment: comentario, actor_user_id: opts.userId, minutes_spent: minutos },
  });
  await db.projectTask.update({
    where: { id: taskId },
    // Ajuste interno: NÃO incrementa `reprovacoes` (alterações grátis são do cliente).
    data: { status: "EM_AJUSTES", reviewed_at: null, reviewed_by: null, data_conclusao: null, completed_at: null },
  });
  const ultima = await db.projectTaskStage.findFirst({
    where: { project_task_id: taskId, status: STAGE_STATUS.CONCLUIDA },
    orderBy: [{ ordem: "desc" }, { created_at: "desc" }],
  });
  if (ultima) {
    await db.projectTaskStage.update({
      where: { id: ultima.id },
      data: { status: STAGE_STATUS.EM_ANDAMENTO, concluida_em: null, concluida_por: null },
    });
    await avisarReprovacao(db, ultima.id, comentario, "revisao");
  }
  return { status: "EM_AJUSTES", round, proximo: null, etapaReaberta: ultima?.id ?? null };
}

// ─── Qualificação obrigatória (aceite INTERNO, antes de agência/cliente) ──────
// A tarefa com qualificação obrigatória, ao terminar a execução, fica em
// AGUARDANDO_QUALIFICACAO. O líder/qualificador pode: aprovar (segue para a
// aprovação de quem contratou/cliente), reprovar pedindo ajustes (volta ao
// executor em EM_AJUSTES — NÃO conta como alteração grátis do cliente) ou só
// comentar. "Revisão" (conferência técnica) não substitui esta etapa.

export type DecisaoQualificacao = "aprovar" | "reprovar" | "comentar";

/**
 * Depois de a tarefa entrar em AGUARDANDO_QUALIFICACAO (fora da transação da
 * entrega): garante um líder qualificador e avisa. Nunca lança.
 */
export async function garantirQualificador(taskId: string): Promise<void> {
  try {
    // Execução por etapa: quem aguarda qualificação é a ETAPA entregue, não a tarefa.
    const emQual = await prisma.projectTaskStage.findFirst({ where: { project_task_id: taskId, status: STAGE_STATUS.EM_QUALIFICACAO }, select: { id: true } });
    if (emQual) { await garantirQualificadorDaEtapa(emQual.id); return; }
    let tarefa = await prisma.projectTask.findUnique({
      where: { id: taskId },
      select: { title: true, task_code: true, status: true, lider_responsavel_id: true },
    });
    if (!tarefa || tarefa.status !== "AGUARDANDO_QUALIFICACAO") return;
    if (!tarefa.lider_responsavel_id) {
      await atribuirLiderParaTarefa(taskId).catch(() => null);
      tarefa = await prisma.projectTask.findUnique({
        where: { id: taskId },
        select: { title: true, task_code: true, status: true, lider_responsavel_id: true },
      });
    }
    if (!tarefa?.lider_responsavel_id) return; // atribuirLider já avisa o admin quando não há líder
    const codigo = tarefa.task_code ? ` (${tarefa.task_code})` : "";
    await prisma.systemAlert.create({
      data: {
        type: "qualificacao_pendente",
        title: `Entrega para qualificar: ${tarefa.title}`,
        message: `A execução da tarefa "${tarefa.title}"${codigo} terminou e aguarda a sua qualificação (aprovar, pedir ajustes ou comentar).`,
        severity: "info",
        category: "alerta",
        entity_type: "project_task",
        entity_id: taskId,
        user_id: tarefa.lider_responsavel_id,
        action_url: "/leader/tarefas",
      },
    });
  } catch (err) {
    console.error("[stage-engine] garantir qualificador:", err);
  }
}

export class QualificacaoError extends Error {
  httpStatus: number;
  constructor(message: string, httpStatus = 422) {
    super(message);
    this.httpStatus = httpStatus;
  }
}

export async function qualificarTarefa(
  db: Db,
  taskId: string,
  opts: { userId: string; decisao: DecisaoQualificacao; comentario?: string | null },
): Promise<{ status: string; round: number; proximoNivel: NivelAprovacao | null; etapaReaberta: string | null }> {
  const tarefa = await db.projectTask.findUniqueOrThrow({ where: { id: taskId } });
  if (!tarefa.requires_qualification) throw new QualificacaoError("Esta tarefa não exige qualificação.");
  const comentario = opts.comentario?.trim() || null;
  const round = Math.max(tarefa.qualification_round, 1);

  if (opts.decisao === "comentar") {
    if (!comentario) throw new QualificacaoError("Escreva o comentário.");
    await db.projectTaskQualification.create({ data: { project_task_id: taskId, round, decision: "comentario", comment: comentario, actor_user_id: opts.userId } });
    return { status: tarefa.status, round, proximoNivel: null, etapaReaberta: null };
  }

  if (tarefa.status !== "AGUARDANDO_QUALIFICACAO") {
    throw new QualificacaoError(`Tarefa com status "${tarefa.status}" não está aguardando qualificação.`);
  }
  const agora = new Date();

  if (opts.decisao === "aprovar") {
    await db.projectTaskQualification.create({ data: { project_task_id: taskId, round, decision: "aprovada", comment: comentario, actor_user_id: opts.userId } });
    // Segue o fluxo já existente: aceite de quem contratou (agência) e, se
    // configurado, do cliente. O aceite do cliente só acontece DEPOIS desta etapa.
    await db.projectTask.update({
      where: { id: taskId },
      data: { status: "EM_APROVACAO", qualified_at: agora, qualified_by: opts.userId },
    });
    await avisarAprovadores(db, taskId, "agencia");
    return { status: "EM_APROVACAO", round, proximoNivel: nivelPendente(tarefa), etapaReaberta: null };
  }

  // reprovar
  if (!comentario) throw new QualificacaoError("Explique o que precisa ser ajustado.");
  await db.projectTaskQualification.create({ data: { project_task_id: taskId, round, decision: "reprovada", comment: comentario, actor_user_id: opts.userId } });
  await db.projectTask.update({
    where: { id: taskId },
    // Ajuste interno: NÃO incrementa `reprovacoes` (alterações grátis são do cliente).
    data: { status: "EM_AJUSTES", qualified_at: null, qualified_by: null, data_conclusao: null, completed_at: null },
  });
  const ultima = await db.projectTaskStage.findFirst({
    where: { project_task_id: taskId, status: STAGE_STATUS.CONCLUIDA },
    orderBy: [{ ordem: "desc" }, { created_at: "desc" }],
  });
  if (ultima) {
    await db.projectTaskStage.update({
      where: { id: ultima.id },
      data: { status: STAGE_STATUS.EM_ANDAMENTO, concluida_em: null, concluida_por: null },
    });
    await avisarReprovacao(db, ultima.id, comentario, "qualificacao");
  }
  return { status: "EM_AJUSTES", round, proximoNivel: null, etapaReaberta: ultima?.id ?? null };
}

// ─── Aprovação em dois níveis ───────────────────────────────────────────────
// A entrega passa por dois aceites: quem contratou (agência) e o cliente final.
// A tarefa só vira histórico depois do segundo — ou do primeiro, quando o
// produto não exige aceite do cliente (`exige_aprovacao_cliente = false`).

export type NivelAprovacao = "agencia" | "cliente";

export interface ResultadoAprovacao {
  status: string;
  nivel: NivelAprovacao;
  concluida: boolean;
  proximoNivel: NivelAprovacao | null;
}

/** Qual aceite falta para esta tarefa, olhando o que já foi registrado. */
export function nivelPendente(tarefa: {
  aprovado_agencia_em: Date | null;
  aprovado_cliente_em: Date | null;
  exige_aprovacao_cliente: boolean;
}): NivelAprovacao | null {
  if (!tarefa.aprovado_agencia_em) return "agencia";
  if (tarefa.exige_aprovacao_cliente && !tarefa.aprovado_cliente_em) return "cliente";
  return null;
}

export async function aprovarTarefa(
  db: Db,
  taskId: string,
  opts: { userId: string; nivel?: NivelAprovacao },
): Promise<ResultadoAprovacao> {
  const tarefa = await db.projectTask.findUniqueOrThrow({ where: { id: taskId } });

  const nivel = opts.nivel ?? nivelPendente(tarefa);
  if (!nivel) {
    return {
      status: tarefa.status,
      nivel: "cliente",
      concluida: tarefa.status === "CONCLUIDA",
      proximoNivel: null,
    };
  }

  const agora = new Date();
  const dados: Record<string, unknown> =
    nivel === "agencia"
      ? { aprovado_agencia_em: agora, aprovado_agencia_por: opts.userId }
      : { aprovado_cliente_em: agora, aprovado_cliente_por: opts.userId };

  // Depois deste aceite, ainda falta algum?
  const depois = {
    aprovado_agencia_em: nivel === "agencia" ? agora : tarefa.aprovado_agencia_em,
    aprovado_cliente_em: nivel === "cliente" ? agora : tarefa.aprovado_cliente_em,
    exige_aprovacao_cliente: tarefa.exige_aprovacao_cliente,
  };
  const proximoNivel = nivelPendente(depois);

  if (proximoNivel === null) {
    dados.status = "CONCLUIDA";
    dados.data_conclusao = agora;
    dados.completed_at = agora;
  } else {
    dados.status = "APROVACAO_PENDENTE_CLIENTE";
  }

  const atualizada = await db.projectTask.update({ where: { id: taskId }, data: dados });

  // A bola passou para o cliente: ele precisa saber que está esperando por ele.
  if (proximoNivel === "cliente") {
    await avisarAprovadores(db, taskId, "cliente");
  }

  return {
    status: atualizada.status,
    nivel,
    concluida: proximoNivel === null,
    proximoNivel,
  };
}

/**
 * Reprovação devolve a tarefa para execução e reabre a última etapa concluída
 * — é ela que precisa ser refeita. Sem reabrir, a tarefa voltaria "em
 * execução" sem nenhuma etapa ativa e ninguém teria o que fazer.
 */
export async function reprovarTarefa(
  db: Db,
  taskId: string,
  opts: { userId: string; motivo: string; nivel?: NivelAprovacao },
): Promise<{ status: string; etapaReaberta: string | null; reprovacoes: number }> {
  const tarefa = await db.projectTask.findUniqueOrThrow({ where: { id: taskId } });
  const agora = new Date();
  const nivel = opts.nivel ?? (tarefa.aprovado_agencia_em ? "cliente" : "agencia");

  const atualizada = await db.projectTask.update({
    where: { id: taskId },
    data: {
      status: "EM_EXECUCAO",
      reprovado_em: agora,
      reprovado_por: opts.userId,
      reprovacao_motivo: opts.motivo,
      reprovacao_nivel: nivel,
      reprovacoes: { increment: 1 },
      // Aceites anteriores caem: o trabalho mudou, tudo é conferido de novo.
      aprovado_agencia_em: null,
      aprovado_agencia_por: null,
      aprovado_cliente_em: null,
      aprovado_cliente_por: null,
      qualified_at: null,
      qualified_by: null,
      data_conclusao: null,
      completed_at: null,
    },
  });

  const ultima = await db.projectTaskStage.findFirst({
    where: { project_task_id: taskId, status: STAGE_STATUS.CONCLUIDA },
    orderBy: [{ ordem: "desc" }, { created_at: "desc" }],
  });

  if (ultima) {
    await db.projectTaskStage.update({
      where: { id: ultima.id },
      data: { status: STAGE_STATUS.EM_ANDAMENTO, concluida_em: null, concluida_por: null },
    });
    await avisarReprovacao(db, ultima.id, opts.motivo, nivel);
  }

  return {
    status: atualizada.status,
    etapaReaberta: ultima?.id ?? null,
    reprovacoes: atualizada.reprovacoes,
  };
}

/**
 * Prazo do produto = soma das etapas que contam para o prazo. As marcadas com
 * `conta_no_prazo = false` (ex.: espera de acesso do cliente) ficam de fora,
 * porque não é tempo de trabalho da Allka.
 */
export function calcularPrazoVisivel(
  etapas: Array<{ conta_no_prazo: boolean; horas_execucao: number | null }>,
): number {
  const horas = etapas
    .filter((e) => e.conta_no_prazo)
    .reduce((soma, e) => soma + (e.horas_execucao ?? 0), 0);
  return Math.ceil(horas / 8);
}
