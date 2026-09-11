// Fotografia de PROJETOS, PRODUTOS CONTRATADOS, TAREFAS e ETAPAS DE EXECUÇÃO
// — bloco seguinte ao de identidade/organizações. Maior domínio histórico
// ainda sem cobertura no Legado (dezenas de milhares de registros no banco
// operacional real).
//
// Reaproveita o MESMO mecanismo genérico de snapshot (RawRecord/RawRelation/
// SnapshotCollection, sanitizeForLegacy, runImport) — nenhum schema/migration
// novo. Só a COLETA (leitura do operacional) é o que este arquivo acrescenta.
//
// ── Escala ──────────────────────────────────────────────────────────────
// Projetos são lidos em PÁGINAS (skip/take, nunca um findMany() sem limite
// sobre a tabela inteira). Cada página busca suas entidades-filhas (produtos
// contratados, tarefas, etapas, anexos, dependências, histórico) com
// `WHERE ... IN (...)` escopado aos ids da própria página — nunca um JOIN
// aninhado cobrindo o domínio inteiro de uma vez. Dentro de uma página, os
// ids de tarefa também são fatiados (CHUNK_IDS) antes de entrar numa
// cláusula IN, para nunca gerar uma consulta com dezenas de milhares de
// parâmetros de uma só vez. A GRAVAÇÃo (upsert em lotes de 50) já era
// paginada desde o mecanismo original (ver runImport) — não precisou mudar.
//
// ── Segurança ───────────────────────────────────────────────────────────
// NUNCA lido/copiado: ProjectCredential (cofre de credenciais do projeto),
// tokens de OAuth de ProjectConnection, ou qualquer segredo. Anexos
// (TaskAttachment/ProjectAttachment) preservam só METADADOS + uma
// REFERÊNCIA ao arquivo original — o binário nunca é copiado, e cada
// registro marca explicitamente `file_available_in_snapshot: false`.
// Campos financeiros (value/budget/spent, *_snapshot de preço/comissão,
// faturas) são deliberadamente EXCLUÍDOS — financeiro é outro bloco.
import { PrismaClient as OperationalPrisma } from "@prisma/client";
import { fileRef, isoDates, safeJsonParse, type RawRecord, type RawRelation, type SnapshotCollection } from "./importer";
import { findManyChunked } from "./pagination";

const PROJECT_PAGE_SIZE = 200;

export interface CollectProjectExecutionOptions {
  /** Projetos por página de leitura (padrão 200). Nunca um findMany() sem limite. */
  pageSize?: number;
  /** Chamado após cada página processada — só para observabilidade (progresso), nunca obrigatório. */
  onPage?: (info: { page: number; projectsInPage: number; recordsSoFar: number }) => void;
}

export async function collectProjectExecutionSnapshot(
  db: OperationalPrisma,
  opts: CollectProjectExecutionOptions = {},
): Promise<SnapshotCollection> {
  const pageSize = opts.pageSize && opts.pageSize > 0 ? opts.pageSize : PROJECT_PAGE_SIZE;

  const records: RawRecord[] = [];
  const relations: RawRelation[] = [];

  let skip = 0;
  let page = 0;
  for (;;) {
    const projects = await db.project.findMany({
      skip,
      take: pageSize,
      orderBy: [{ created_at: "asc" }, { id: "asc" }],
      select: {
        id: true,
        title: true,
        description: true,
        client_id: true,
        agency_id: true,
        company_id: true,
        partner_id: true,
        created_by_user_id: true,
        project_code: true,
        status: true,
        lifecycle: true,
        type: true,
        progress: true,
        agency: true,
        company_type: true,
        team_size: true,
        overdue: true,
        from_lead: true,
        start_date: true,
        end_date: true,
        created_at: true,
        updated_at: true,
        archived_at: true,
        archive_reason: true,
        archived_by_user_id: true,
        admin_responsible_user_id: true,
        legacy_id: true,
        legacy_client_id: true,
      },
    });
    if (projects.length === 0) break;
    page++;

    const projectIds = projects.map((p) => p.id);

    for (const p of projects) {
      records.push({
        entity_type: "project",
        source_table: "projects",
        original_id: p.id,
        original_code: p.project_code,
        title: p.title,
        subtitle: p.description ? p.description.slice(0, 200) : null,
        original_status: p.status,
        dates: { ...isoDates(p), start_date: p.start_date?.toISOString() ?? null, end_date: p.end_date?.toISOString() ?? null, archived_at: p.archived_at?.toISOString() ?? null },
        content: {
          id: p.id,
          project_code: p.project_code,
          title: p.title,
          status: p.status,
          lifecycle: p.lifecycle,
          type: p.type,
          progress: p.progress,
          agency_label: p.agency,
          company_type: p.company_type,
          team_size: p.team_size,
          overdue: p.overdue,
          from_lead: p.from_lead,
          archive_reason: p.archive_reason,
          legacy_id: p.legacy_id,
          legacy_client_id: p.legacy_client_id,
        },
        search_category: p.type,
        search_active: p.archived_at == null,
      });

      // Empresa/agência/parceiro/autor — só emite a relação para o campo que
      // de fato estiver preenchido (nunca mistura os três vínculos de dono).
      if (p.client_id) {
        relations.push({ from_original_id: p.id, from_entity_type: "project", to_original_id: p.client_id, to_entity_type: "company", relation_type: "project_legacy_client", description: null });
      }
      if (p.company_id) {
        relations.push({ from_original_id: p.id, from_entity_type: "project", to_original_id: p.company_id, to_entity_type: "company", relation_type: "project_company", description: null });
      }
      if (p.agency_id) {
        relations.push({ from_original_id: p.id, from_entity_type: "project", to_original_id: p.agency_id, to_entity_type: "agency", relation_type: "project_agency", description: null });
      }
      if (p.partner_id) {
        relations.push({ from_original_id: p.id, from_entity_type: "project", to_original_id: p.partner_id, to_entity_type: "partner_profile", relation_type: "project_partner", description: null });
      }
      if (p.created_by_user_id) {
        relations.push({ from_original_id: p.id, from_entity_type: "project", to_original_id: p.created_by_user_id, to_entity_type: "user", relation_type: "project_created_by", description: null });
      }
      if (p.archived_by_user_id) {
        relations.push({ from_original_id: p.id, from_entity_type: "project", to_original_id: p.archived_by_user_id, to_entity_type: "user", relation_type: "project_archived_by", description: null });
      }
      if (p.admin_responsible_user_id) {
        relations.push({ from_original_id: p.id, from_entity_type: "project", to_original_id: p.admin_responsible_user_id, to_entity_type: "user", relation_type: "project_admin_responsible", description: null });
      }
    }

    // ── Produtos contratados no projeto ──────────────────────────────────
    const projectProducts = await db.projectProduct.findMany({
      where: { project_id: { in: projectIds } },
      select: {
        id: true,
        project_id: true,
        product_id: true,
        variation_id: true,
        catalog2_product_id: true,
        catalog2_version_id: true,
        product_name_snapshot: true,
        product_code_snapshot: true,
        product_category_snapshot: true,
        recurrence_snapshot: true,
        status: true,
        origin: true,
        start_date: true,
        expected_end_date: true,
        created_at: true,
        updated_at: true,
        legacy_id: true,
      },
    });
    for (const pp of projectProducts) {
      records.push({
        entity_type: "project_product",
        source_table: "project_products",
        original_id: pp.id,
        original_code: pp.product_code_snapshot,
        title: pp.product_name_snapshot,
        subtitle: pp.product_category_snapshot,
        original_status: pp.status,
        dates: { ...isoDates(pp), start_date: pp.start_date?.toISOString() ?? null, expected_end_date: pp.expected_end_date?.toISOString() ?? null },
        // Financeiro (preço/comissão/pagador/alterações) fica FORA — outro bloco.
        content: {
          id: pp.id,
          project_id: pp.project_id,
          product_name_snapshot: pp.product_name_snapshot,
          product_code_snapshot: pp.product_code_snapshot,
          product_category_snapshot: pp.product_category_snapshot,
          recurrence_snapshot: pp.recurrence_snapshot,
          status: pp.status,
          origin: pp.origin,
          legacy_id: pp.legacy_id,
        },
        search_category: pp.product_category_snapshot,
        search_active: pp.status !== "CANCELADO",
      });
      relations.push({ from_original_id: pp.id, from_entity_type: "project_product", to_original_id: pp.project_id, to_entity_type: "project", relation_type: "belongs_to_project", description: null });
      // Nunca mistura: só um dos dois catálogos é emitido, o que de fato veio contratado.
      if (pp.product_id) {
        relations.push({ from_original_id: pp.id, from_entity_type: "project_product", to_original_id: pp.product_id, to_entity_type: "product", relation_type: "contracted_old_product", description: null });
      }
      if (pp.catalog2_product_id) {
        relations.push({ from_original_id: pp.id, from_entity_type: "project_product", to_original_id: pp.catalog2_product_id, to_entity_type: "catalog2_product", relation_type: "contracted_catalog2_product", description: null });
      }
    }

    // ── Tarefas de projeto ────────────────────────────────────────────────
    const projectTasks = await db.projectTask.findMany({
      where: { project_id: { in: projectIds } },
      select: {
        id: true,
        project_id: true,
        project_product_id: true,
        product_id: true,
        catalog_task_id: true,
        catalog2_task_id: true,
        task_code: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        assignee_id: true,
        responsavel_agencia_id: true,
        nomade_responsavel_id: true,
        lider_responsavel_id: true,
        due_date: true,
        start_date: true,
        completed_at: true,
        data_lancamento: true,
        data_liberacao_execucao: true,
        data_inicio_execucao: true,
        data_conclusao: true,
        aprovado_agencia_em: true,
        aprovado_agencia_por: true,
        aprovado_cliente_em: true,
        aprovado_cliente_por: true,
        reprovado_em: true,
        reprovado_por: true,
        reprovacao_motivo: true,
        reprovacao_nivel: true,
        reprovacoes: true,
        exige_aprovacao_cliente: true,
        sort_order: true,
        fase: true,
        phase: true,
        observations: true,
        created_at: true,
        updated_at: true,
        legacy_id: true,
        legacy_model: true,
      },
    });
    const taskIds = projectTasks.map((t) => t.id);

    for (const t of projectTasks) {
      records.push({
        entity_type: "project_task",
        source_table: "project_tasks",
        original_id: t.id,
        original_code: t.task_code,
        title: t.title,
        subtitle: t.description ? t.description.slice(0, 200) : null,
        original_status: t.status,
        dates: {
          ...isoDates(t),
          due_date: t.due_date?.toISOString() ?? null,
          start_date: t.start_date?.toISOString() ?? null,
          completed_at: t.completed_at?.toISOString() ?? null,
          data_lancamento: t.data_lancamento?.toISOString() ?? null,
          data_liberacao_execucao: t.data_liberacao_execucao?.toISOString() ?? null,
          data_inicio_execucao: t.data_inicio_execucao?.toISOString() ?? null,
          data_conclusao: t.data_conclusao?.toISOString() ?? null,
          aprovado_agencia_em: t.aprovado_agencia_em?.toISOString() ?? null,
          aprovado_cliente_em: t.aprovado_cliente_em?.toISOString() ?? null,
          reprovado_em: t.reprovado_em?.toISOString() ?? null,
        },
        // Status/transições/aprovações preservados; financeiro (invoices de
        // multa/emergencial) e blobs JSON de snapshot (redundantes com o
        // modelo de catálogo já preservado) ficam FORA.
        content: {
          id: t.id,
          project_id: t.project_id,
          project_product_id: t.project_product_id,
          task_code: t.task_code,
          title: t.title,
          description: t.description,
          status: t.status,
          priority: t.priority,
          aprovado_agencia_por: t.aprovado_agencia_por,
          aprovado_cliente_por: t.aprovado_cliente_por,
          reprovado_por: t.reprovado_por,
          reprovacao_motivo: t.reprovacao_motivo,
          reprovacao_nivel: t.reprovacao_nivel,
          reprovacoes: t.reprovacoes,
          exige_aprovacao_cliente: t.exige_aprovacao_cliente,
          sort_order: t.sort_order,
          fase: t.fase ?? t.phase,
          legacy_id: t.legacy_id,
          legacy_model: t.legacy_model,
        },
        search_category: t.fase ?? t.phase,
        search_active: !["CONCLUIDA", "CANCELADA"].includes(t.status),
      });

      relations.push({ from_original_id: t.id, from_entity_type: "project_task", to_original_id: t.project_id, to_entity_type: "project", relation_type: "belongs_to_project", description: null });
      relations.push({ from_original_id: t.id, from_entity_type: "project_task", to_original_id: t.project_product_id, to_entity_type: "project_product", relation_type: "belongs_to_project_product", description: null });
      if (t.product_id) relations.push({ from_original_id: t.id, from_entity_type: "project_task", to_original_id: t.product_id, to_entity_type: "product", relation_type: "task_from_old_product", description: null });
      if (t.catalog_task_id) relations.push({ from_original_id: t.id, from_entity_type: "project_task", to_original_id: t.catalog_task_id, to_entity_type: "catalog_task", relation_type: "task_from_catalog_task", description: null });
      if (t.catalog2_task_id) relations.push({ from_original_id: t.id, from_entity_type: "project_task", to_original_id: t.catalog2_task_id, to_entity_type: "catalog2_task", relation_type: "task_from_catalog2_task", description: null });
      if (t.assignee_id) relations.push({ from_original_id: t.id, from_entity_type: "project_task", to_original_id: t.assignee_id, to_entity_type: "user", relation_type: "task_assignee", description: null });
      if (t.responsavel_agencia_id) relations.push({ from_original_id: t.id, from_entity_type: "project_task", to_original_id: t.responsavel_agencia_id, to_entity_type: "user", relation_type: "task_responsible_agency_user", description: null });
      if (t.lider_responsavel_id) relations.push({ from_original_id: t.id, from_entity_type: "project_task", to_original_id: t.lider_responsavel_id, to_entity_type: "user", relation_type: "task_lider_responsavel", description: null });
      if (t.nomade_responsavel_id) relations.push({ from_original_id: t.id, from_entity_type: "project_task", to_original_id: t.nomade_responsavel_id, to_entity_type: "nomade", relation_type: "task_nomade_responsavel", description: null });
    }

    // ── Etapas de tarefa ──────────────────────────────────────────────────
    const stages = await findManyChunked(taskIds, (ids) =>
      db.projectTaskStage.findMany({
        where: { project_task_id: { in: ids } },
        select: {
          id: true,
          project_task_id: true,
          source_key: true,
          catalog_step_ref: true,
          titulo: true,
          descricao: true,
          ordem: true,
          status: true,
          obrigatoria: true,
          depende_da_etapa_anterior: true,
          executor_type: true,
          nomade_id: true,
          lider_id: true,
          categoria: true,
          prazo_execucao: true,
          prazo_aprovacao: true,
          iniciada_em: true,
          concluida_em: true,
          concluida_por: true,
          created_at: true,
          updated_at: true,
        },
      }),
    );
    for (const s of stages) {
      records.push({
        entity_type: "project_task_stage",
        source_table: "project_task_stages",
        original_id: s.id,
        original_code: s.source_key ?? s.catalog_step_ref,
        title: s.titulo,
        subtitle: s.descricao ? s.descricao.slice(0, 200) : null,
        original_status: s.status,
        dates: { ...isoDates(s), prazo_execucao: s.prazo_execucao?.toISOString() ?? null, prazo_aprovacao: s.prazo_aprovacao?.toISOString() ?? null, iniciada_em: s.iniciada_em?.toISOString() ?? null, concluida_em: s.concluida_em?.toISOString() ?? null },
        content: {
          id: s.id,
          project_task_id: s.project_task_id,
          titulo: s.titulo,
          descricao: s.descricao,
          ordem: s.ordem,
          status: s.status,
          obrigatoria: s.obrigatoria,
          depende_da_etapa_anterior: s.depende_da_etapa_anterior,
          executor_type: s.executor_type,
          categoria: s.categoria,
          concluida_por: s.concluida_por,
        },
        search_category: s.categoria,
        search_active: s.status !== "CONCLUIDA",
      });
      relations.push({ from_original_id: s.id, from_entity_type: "project_task_stage", to_original_id: s.project_task_id, to_entity_type: "project_task", relation_type: "belongs_to_task", description: null });
      if (s.lider_id) relations.push({ from_original_id: s.id, from_entity_type: "project_task_stage", to_original_id: s.lider_id, to_entity_type: "user", relation_type: "stage_lider_responsavel", description: null });
      if (s.nomade_id) relations.push({ from_original_id: s.id, from_entity_type: "project_task_stage", to_original_id: s.nomade_id, to_entity_type: "nomade", relation_type: "stage_nomade_responsavel", description: null });
    }

    // ── Respostas de briefing (perguntas/respostas preenchidas na tarefa) ──
    const briefingAnswers = await findManyChunked(taskIds, (ids) =>
      db.taskBriefingAnswer.findMany({
        where: { project_task_id: { in: ids } },
        select: { id: true, project_task_id: true, question_key: true, question_text: true, answer: true, files: true, created_at: true, updated_at: true },
      }),
    );
    for (const b of briefingAnswers) {
      const files = Array.isArray(safeJsonParse(b.files)) ? (safeJsonParse(b.files) as Array<{ name?: string; url?: string }>) : [];
      records.push({
        entity_type: "task_briefing_answer",
        source_table: "task_briefing_answers",
        original_id: b.id,
        original_code: b.question_key,
        title: b.question_key,
        subtitle: b.answer ? b.answer.slice(0, 200) : null,
        original_status: null,
        dates: isoDates(b),
        content: {
          id: b.id,
          project_task_id: b.project_task_id,
          question_key: b.question_key,
          question_text: b.question_text,
          answer: b.answer,
          // Arquivos referenciados na resposta: metadado + referência, NUNCA o binário.
          file_refs: files.map((f) => ({ name: f.name ?? null, ...fileRef(f.url ?? null) })),
        },
        search_category: null,
        search_active: null,
      });
      relations.push({ from_original_id: b.id, from_entity_type: "task_briefing_answer", to_original_id: b.project_task_id, to_entity_type: "project_task", relation_type: "belongs_to_task", description: null });
    }

    // ── Anexos de tarefa/etapa (entregas, referências) — só metadado ──────
    const taskAttachments = await findManyChunked(taskIds, (ids) =>
      db.taskAttachment.findMany({
        where: { project_task_id: { in: ids } },
        select: { id: true, project_task_id: true, project_task_stage_id: true, type: true, name: true, url: true, size: true, mime_type: true, observations: true, uploaded_by: true, created_at: true },
      }),
    );
    for (const a of taskAttachments) {
      records.push({
        entity_type: "task_attachment",
        source_table: "task_attachments",
        original_id: a.id,
        original_code: null,
        title: a.name,
        subtitle: a.type,
        original_status: null,
        dates: { created_at: a.created_at.toISOString(), updated_at: null },
        content: {
          id: a.id,
          project_task_id: a.project_task_id,
          project_task_stage_id: a.project_task_stage_id,
          type: a.type,
          name: a.name,
          size: a.size,
          mime_type: a.mime_type,
          observations: a.observations,
          uploaded_by: a.uploaded_by,
          file_ref: fileRef(a.url),
        },
        search_category: a.type,
        search_active: null,
      });
      relations.push({ from_original_id: a.id, from_entity_type: "task_attachment", to_original_id: a.project_task_id, to_entity_type: "project_task", relation_type: "belongs_to_task", description: null });
      if (a.project_task_stage_id) {
        relations.push({ from_original_id: a.id, from_entity_type: "task_attachment", to_original_id: a.project_task_stage_id, to_entity_type: "project_task_stage", relation_type: "belongs_to_stage", description: null });
      }
    }

    // ── Anexos de contexto do projeto — só metadado ───────────────────────
    const projectAttachments = await db.projectAttachment.findMany({
      where: { project_id: { in: projectIds } },
      select: { id: true, project_id: true, name: true, file_name: true, mime_type: true, size: true, uploaded_by: true, created_at: true },
    });
    for (const a of projectAttachments) {
      records.push({
        entity_type: "project_attachment",
        source_table: "project_attachments",
        original_id: a.id,
        original_code: null,
        title: a.name,
        subtitle: null,
        original_status: null,
        dates: { created_at: a.created_at.toISOString(), updated_at: null },
        content: {
          id: a.id,
          project_id: a.project_id,
          name: a.name,
          mime_type: a.mime_type,
          size: a.size,
          uploaded_by: a.uploaded_by,
          file_ref: fileRef(a.file_name),
        },
        search_category: null,
        search_active: null,
      });
      relations.push({ from_original_id: a.id, from_entity_type: "project_attachment", to_original_id: a.project_id, to_entity_type: "project", relation_type: "belongs_to_project", description: null });
    }

    // ── Histórico operacional: atribuição, dependências, gatilhos, eventos,
    //    exceções e ofertas ────────────────────────────────────────────────
    const assignmentHistory = await findManyChunked(taskIds, (ids) =>
      db.taskAssignmentHistory.findMany({
        where: { project_task_id: { in: ids } },
        select: { id: true, project_task_id: true, nomade_id: true, criterio: true, nota_nomade: true, automatico: true, resultado: true, detalhes: true, created_at: true },
      }),
    );
    for (const h of assignmentHistory) {
      records.push({
        entity_type: "task_assignment_history",
        source_table: "task_assignment_history",
        original_id: h.id,
        original_code: null,
        title: `Atribuição — ${h.resultado}`,
        subtitle: h.criterio,
        original_status: h.resultado,
        dates: { created_at: h.created_at.toISOString(), updated_at: null },
        content: { id: h.id, project_task_id: h.project_task_id, nomade_id: h.nomade_id, criterio: h.criterio, nota_nomade: h.nota_nomade, automatico: h.automatico, resultado: h.resultado, detalhes: safeJsonParse(h.detalhes) },
        search_category: null,
        search_active: null,
      });
      relations.push({ from_original_id: h.id, from_entity_type: "task_assignment_history", to_original_id: h.project_task_id, to_entity_type: "project_task", relation_type: "belongs_to_task", description: null });
      if (h.nomade_id) relations.push({ from_original_id: h.id, from_entity_type: "task_assignment_history", to_original_id: h.nomade_id, to_entity_type: "nomade", relation_type: "assigned_nomade", description: null });
    }

    const dependencies = await db.taskDependency.findMany({
      where: { project_id: { in: projectIds } },
      select: { id: true, project_id: true, task_id: true, depends_on_task_id: true, created_by_user_id: true, created_at: true },
    });
    for (const d of dependencies) {
      records.push({
        entity_type: "task_dependency",
        source_table: "task_dependencies",
        original_id: d.id,
        original_code: null,
        title: null,
        subtitle: null,
        original_status: null,
        dates: { created_at: d.created_at.toISOString(), updated_at: null },
        content: { id: d.id, project_id: d.project_id, task_id: d.task_id, depends_on_task_id: d.depends_on_task_id, created_by_user_id: d.created_by_user_id },
        search_category: null,
        search_active: null,
      });
      relations.push({ from_original_id: d.task_id, from_entity_type: "project_task", to_original_id: d.depends_on_task_id, to_entity_type: "project_task", relation_type: "depends_on_task", description: null });
      relations.push({ from_original_id: d.id, from_entity_type: "task_dependency", to_original_id: d.task_id, to_entity_type: "project_task", relation_type: "dependency_of_task", description: null });
    }

    const releaseTriggers = await findManyChunked(taskIds, (ids) =>
      db.taskReleaseTrigger.findMany({
        where: { task_id: { in: ids } },
        select: { id: true, task_id: true, trigger_type: true, status: true, scheduled_at: true, payment_reference_type: true, satisfied_by_user_id: true, satisfied_at: true, satisfaction_note: true, created_at: true },
      }),
    );
    for (const rt of releaseTriggers) {
      records.push({
        entity_type: "task_release_trigger",
        source_table: "task_release_triggers",
        original_id: rt.id,
        original_code: null,
        title: rt.trigger_type,
        subtitle: rt.satisfaction_note ?? null,
        original_status: rt.status,
        dates: { created_at: rt.created_at.toISOString(), updated_at: null, scheduled_at: rt.scheduled_at?.toISOString() ?? null, satisfied_at: rt.satisfied_at?.toISOString() ?? null },
        content: { id: rt.id, task_id: rt.task_id, trigger_type: rt.trigger_type, status: rt.status, payment_reference_type: rt.payment_reference_type, satisfaction_note: rt.satisfaction_note },
        search_category: rt.trigger_type,
        search_active: rt.status === "pending",
      });
      relations.push({ from_original_id: rt.id, from_entity_type: "task_release_trigger", to_original_id: rt.task_id, to_entity_type: "project_task", relation_type: "belongs_to_task", description: null });
      if (rt.satisfied_by_user_id) relations.push({ from_original_id: rt.id, from_entity_type: "task_release_trigger", to_original_id: rt.satisfied_by_user_id, to_entity_type: "user", relation_type: "satisfied_by_user", description: null });
    }

    const releaseEvents = await findManyChunked(taskIds, (ids) =>
      db.taskReleaseEvent.findMany({
        where: { task_id: { in: ids } },
        select: { id: true, task_id: true, event_type: true, actor_user_id: true, description: true, metadata_json: true, created_at: true },
      }),
    );
    for (const ev of releaseEvents) {
      records.push({
        entity_type: "task_release_event",
        source_table: "task_release_events",
        original_id: ev.id,
        original_code: null,
        title: ev.event_type,
        subtitle: ev.description ? ev.description.slice(0, 200) : null,
        original_status: null,
        dates: { created_at: ev.created_at.toISOString(), updated_at: null },
        content: { id: ev.id, task_id: ev.task_id, event_type: ev.event_type, description: ev.description, metadata: safeJsonParse(ev.metadata_json) },
        search_category: ev.event_type,
        search_active: null,
      });
      relations.push({ from_original_id: ev.id, from_entity_type: "task_release_event", to_original_id: ev.task_id, to_entity_type: "project_task", relation_type: "belongs_to_task", description: null });
      if (ev.actor_user_id) relations.push({ from_original_id: ev.id, from_entity_type: "task_release_event", to_original_id: ev.actor_user_id, to_entity_type: "user", relation_type: "event_actor", description: null });
    }

    const dependencyOverrides = await findManyChunked(taskIds, (ids) =>
      db.taskDependencyOverride.findMany({
        where: { task_id: { in: ids } },
        select: { id: true, task_id: true, reason: true, authorized_by_user_id: true, created_at: true },
      }),
    );
    for (const o of dependencyOverrides) {
      records.push({
        entity_type: "task_dependency_override",
        source_table: "task_dependency_overrides",
        original_id: o.id,
        original_code: null,
        title: "Exceção de dependência autorizada",
        subtitle: o.reason ? o.reason.slice(0, 200) : null,
        original_status: null,
        dates: { created_at: o.created_at.toISOString(), updated_at: null },
        content: { id: o.id, task_id: o.task_id, reason: o.reason, authorized_by_user_id: o.authorized_by_user_id },
        search_category: null,
        search_active: null,
      });
      relations.push({ from_original_id: o.id, from_entity_type: "task_dependency_override", to_original_id: o.task_id, to_entity_type: "project_task", relation_type: "belongs_to_task", description: null });
      relations.push({ from_original_id: o.id, from_entity_type: "task_dependency_override", to_original_id: o.authorized_by_user_id, to_entity_type: "user", relation_type: "authorized_by_user", description: null });
    }

    const taskOffers = await findManyChunked(taskIds, (ids) =>
      db.taskOffer.findMany({
        where: { project_task_id: { in: ids } },
        select: { id: true, project_task_id: true, nomade_id: true, episode_key: true, rotation_order: true, status: true, offered_at: true, expires_at: true, responded_at: true, decline_reason: true, close_reason: true, created_at: true },
      }),
    );
    for (const off of taskOffers) {
      records.push({
        entity_type: "task_offer",
        source_table: "task_offers",
        original_id: off.id,
        original_code: null,
        title: `Oferta #${off.rotation_order} — ${off.status}`,
        subtitle: off.decline_reason ?? off.close_reason ?? null,
        original_status: off.status,
        dates: { created_at: off.created_at.toISOString(), updated_at: null, offered_at: off.offered_at.toISOString(), expires_at: off.expires_at.toISOString(), responded_at: off.responded_at?.toISOString() ?? null },
        content: { id: off.id, project_task_id: off.project_task_id, nomade_id: off.nomade_id, episode_key: off.episode_key, rotation_order: off.rotation_order, status: off.status, decline_reason: off.decline_reason, close_reason: off.close_reason },
        search_category: null,
        search_active: off.status === "pendente",
      });
      relations.push({ from_original_id: off.id, from_entity_type: "task_offer", to_original_id: off.project_task_id, to_entity_type: "project_task", relation_type: "belongs_to_task", description: null });
      relations.push({ from_original_id: off.id, from_entity_type: "task_offer", to_original_id: off.nomade_id, to_entity_type: "nomade", relation_type: "offered_to_nomade", description: null });
    }

    opts.onPage?.({ page, projectsInPage: projects.length, recordsSoFar: records.length });

    if (projects.length < pageSize) break;
    skip += pageSize;
  }

  const sourceCounts: Record<string, number> = {};
  for (const r of records) sourceCounts[r.entity_type] = (sourceCounts[r.entity_type] ?? 0) + 1;
  sourceCounts.relations = relations.length;

  return { records, relations, sourceCounts };
}
