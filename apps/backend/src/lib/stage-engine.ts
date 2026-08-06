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
import { selecionarNomadeParaTarefa } from "./selecionar-nomade";
import { atribuirLiderParaTarefa } from "./atribuir-lider";

type Db = PrismaClient | Prisma.TransactionClient;

export const STAGE_STATUS = {
  BLOQUEADA: "BLOQUEADA",
  PENDENTE: "PENDENTE",
  AGUARDANDO_EXECUTOR: "AGUARDANDO_EXECUTOR",
  EM_ANDAMENTO: "EM_ANDAMENTO",
  CONCLUIDA: "CONCLUIDA",
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
  } = {},
): Promise<AberturaEtapa> {
  const stage = await db.projectTaskStage.findUniqueOrThrow({
    where: { id: stageId },
    include: { project_task: { select: { id: true, title: true, lider_responsavel_id: true } } },
  });

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
    liderId = stage.project_task.lider_responsavel_id ?? null;
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
    [STAGE_STATUS.EM_ANDAMENTO, STAGE_STATUS.AGUARDANDO_EXECUTOR].includes(e.status as any),
  );
  if (jaAndando) return null;

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
    const titulo =
      nivel === "agencia"
        ? `Entrega para conferir: ${tarefa.title}`
        : `Sua aprovação foi solicitada: ${tarefa.title}`;
    const mensagem =
      nivel === "agencia"
        ? `A execução da tarefa "${tarefa.title}"${codigo}${projeto} terminou e está aguardando a conferência da agência.`
        : `A agência já conferiu a tarefa "${tarefa.title}"${codigo}${projeto}. Falta o seu aceite para encerrar.`;

    await db.systemAlert.createMany({
      data: destinatarios.map((userId) => ({
        type: nivel === "agencia" ? "aprovacao_pendente_agencia" : "aprovacao_pendente_cliente",
        title: titulo,
        message: mensagem,
        severity: "info",
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
  nivel: NivelAprovacao,
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
        message: `${nivel === "cliente" ? "O cliente" : "A agência"} pediu ajustes na tarefa "${etapa.project_task.title}". Motivo: ${motivo}`,
        severity: "warning",
        entity_type: "project_task_stage",
        entity_id: stageId,
        user_id: userId,
        action_url: destino,
      },
    });
  } catch (err) {
    console.error("[stage-engine] avisar reprovação:", err);
  }
}

export interface ResultadoConclusao {
  etapaConcluida: string;
  proxima: AberturaEtapa | null;
  /** Só true quando a tarefa realmente encerrou (após os aceites). */
  tarefaConcluida: boolean;
  /** Última etapa concluída: a tarefa foi para aprovação de quem contratou. */
  enviadaParaAprovacao: boolean;
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
    include: { project_task: { select: { id: true, status: true } } },
  });

  if (stage.status === STAGE_STATUS.CONCLUIDA) {
    return {
      etapaConcluida: stageId,
      proxima: null,
      tarefaConcluida: false,
      enviadaParaAprovacao: false,
    };
  }

  const agora = new Date();
  await db.projectTaskStage.update({
    where: { id: stageId },
    data: {
      status: STAGE_STATUS.CONCLUIDA,
      concluida_em: agora,
      concluida_por: opts.userId ?? null,
    },
  });

  // A próxima etapa é a seguinte NA LISTA, não a de "ordem maior": dados
  // vindos da plataforma antiga trazem ordem repetida (três etapas "número
  // 1"), e comparar só por ordem faria a sequência parar na primeira.
  const todas = await db.projectTaskStage.findMany({
    where: { project_task_id: stage.project_task_id },
    orderBy: [{ ordem: "asc" }, { created_at: "asc" }],
    select: { id: true, status: true },
  });
  const posicaoAtual = todas.findIndex((e) => e.id === stageId);
  const seguinte = todas
    .slice(posicaoAtual + 1)
    .find((e) => e.status !== STAGE_STATUS.CONCLUIDA);

  let proxima: AberturaEtapa | null = null;
  if (seguinte) {
    proxima = await abrirEtapa(db, seguinte.id, {
      // Continuidade só faz sentido a partir de quem acabou de executar, e
      // quem decide é a etapa que está fechando (`keepNomadOnNextStage`).
      nomadeAnterior: stage.nomade_id,
      herdarNomade: stage.manter_mesmo_nomade,
    });
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
  // ver PATCH /api/project-tasks/:id/aprovar.
  let tarefaConcluida = false;
  let enviadaParaAprovacao = false;
  if (pendentesObrigatorias === 0 && !["CONCLUIDA", "CANCELADA"].includes(stage.project_task.status)) {
    await db.projectTask.update({
      where: { id: stage.project_task_id },
      data: { status: "EM_APROVACAO", data_conclusao: agora },
    });
    enviadaParaAprovacao = true;
    await avisarAprovadores(db, stage.project_task_id, "agencia");
  }

  return { etapaConcluida: stageId, proxima, tarefaConcluida, enviadaParaAprovacao };
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

  if (stage.executor_type === "nomad") {
    await selecionarNomadeParaTarefa(stage.project_task_id).catch(() => null);
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
