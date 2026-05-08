/**
 * seed-gestao-trafego.cjs
 * ============================================================
 * Reconfigura o fluxo operacional de Gestão de Tráfego (PA0001).
 *
 * ANTES: 4 CatalogTasks separadas (T01 Onboarding, T02 Configuração,
 *        T03 Monitoramento Semanal, T04 Relatório Mensal)
 *
 * DEPOIS: 1 CatalogTask principal "Gestão de Tráfego" com 7 etapas
 *         internas (ProjectTaskStage):
 *         E01 — Verificação de briefing e acessos   (Líder)
 *         E02 — Feedback 1 / Semana 1               (Nômade)
 *         E03 — Feedback 2 / Semana 2               (Nômade)
 *         E04 — Feedback 3 / Semana 3               (Nômade)
 *         E05 — Feedback 4 / Semana 4               (Nômade)
 *         E06 — Relatório final                     (Nômade + Líder + Cliente)
 *         E07 — Remoção de acessos                  (Nômade)
 *
 * IDEMPOTENTE: pode ser executado várias vezes sem duplicar dados.
 *
 * Uso:
 *   cd apps/backend && node seed-gestao-trafego.cjs
 * ============================================================
 */

"use strict";

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// ─── Definição das 7 etapas ───────────────────────────────────────────────────

const STEPS = [
  {
    id: "PA0001-E01",
    name: "Verificação de briefing e acessos",
    description:
      "Líder de Performance confere o briefing preenchido pela agência, verifica os acessos compartilhados e decide aprovar (liberar etapa 2) ou devolver para a agência corrigir.",
    order: 1,
    estimatedHours: 0.5,
    responsibleType: "leader",
    requiresLeaderApproval: true,
    canReturnToAgency: true,
    internalGuidance:
      "Verificar: objetivo, verba, plataformas, URL de destino, pixel instalado, acessos ao gerenciador. Se briefing incompleto ou acessos não compartilhados → devolver com comentário obrigatório.",
  },
  {
    id: "PA0001-E02",
    name: "Feedback 1 / Semana 1",
    description:
      "Nômade executa a primeira semana: configura/ajusta campanhas, monitora métricas e entrega resumo. Líder qualifica internamente antes de liberar semana 2.",
    order: 2,
    estimatedHours: 2,
    durationDays: 7,
    responsibleType: "nomad",
    requiresLeaderApproval: true,
    allowNextOnSubmit: true,
    visibilityForClient: "EM_EXECUCAO",
    internalGuidance:
      "Nômade entrega resumo semanal (CTR, CPC, CPA, ROAS, investimento). Líder qualifica. Aprovado → libera semana 2. Reprovado → nômade ajusta na mesma etapa. Para agência/cliente: status permanece Em execução.",
  },
  {
    id: "PA0001-E03",
    name: "Feedback 2 / Semana 2",
    description:
      "Segunda semana: otimizações com base nos dados da semana 1. Nômade entrega resumo. Líder qualifica.",
    order: 3,
    estimatedHours: 2,
    durationDays: 7,
    responsibleType: "nomad",
    requiresLeaderApproval: true,
    allowNextOnSubmit: true,
    visibilityForClient: "EM_EXECUCAO",
    internalGuidance:
      "Comparar com semana 1. Se agência pediu correção da semana anterior, absorver como ajuste na semana atual — não voltar etapas.",
  },
  {
    id: "PA0001-E04",
    name: "Feedback 3 / Semana 3",
    description:
      "Terceira semana: otimizações avançadas, testes A/B de criativos ou segmentações. Nômade entrega resumo. Líder qualifica.",
    order: 4,
    estimatedHours: 2,
    durationDays: 7,
    responsibleType: "nomad",
    requiresLeaderApproval: true,
    allowNextOnSubmit: true,
    visibilityForClient: "EM_EXECUCAO",
    internalGuidance:
      "Identificar padrões nas 3 semanas. Consolidar aprendizados para o relatório final.",
  },
  {
    id: "PA0001-E05",
    name: "Feedback 4 / Semana 4",
    description:
      "Quarta semana: finalização do ciclo mensal, ajustes finais e coleta de dados para o relatório. Nômade entrega resumo. Líder qualifica.",
    order: 5,
    estimatedHours: 2,
    durationDays: 7,
    responsibleType: "nomad",
    requiresLeaderApproval: true,
    allowNextOnSubmit: false,
    visibilityForClient: "EM_EXECUCAO",
    internalGuidance:
      "Após aprovação, liberar etapa 6 (Relatório final). Exportar todos os dados das plataformas.",
  },
  {
    id: "PA0001-E06",
    name: "Relatório final",
    description:
      "Nômade compila relatório mensal completo com dados de todas as semanas. Líder qualifica antes do envio para agência/cliente aprovar.",
    order: 6,
    estimatedHours: 2,
    responsibleType: "nomad",
    requiresLeaderApproval: true,
    requiresClientApproval: true,
    internalGuidance:
      "Relatório: investimento total, impressões, cliques, CTR, conversões, CPA, ROAS, evolução semanal, recomendações. Líder aprova → agência/cliente aprova → libera etapa 7.",
  },
  {
    id: "PA0001-E07",
    name: "Remoção de acessos",
    description:
      "Remover todos os acessos compartilhados durante o ciclo. Se o mesmo nômade continua no próximo ciclo, registrar justificativa e manter documentado.",
    order: 7,
    estimatedHours: 0.5,
    responsibleType: "nomad",
    requiresLeaderApproval: false,
    internalGuidance:
      "Remover: gerenciador de anúncios (BM, Google Ads), pixels, acessos compartilhados. Se ciclo continua com o mesmo nômade: documentar manutenção do acesso no campo observações. Remoção encerra a tarefa.",
  },
];

const BRIEFING_QUESTIONS = [
  { key: "objetivo", label: "Objetivo principal das campanhas", type: "select", options: ["Conversão", "Geração de leads", "Tráfego para o site", "Awareness", "Outro"] },
  { key: "plataformas", label: "Plataformas de veiculação", type: "multiselect", options: ["Meta Ads (Facebook/Instagram)", "Google Ads (Pesquisa)", "Google Ads (Display)", "TikTok Ads", "LinkedIn Ads", "Outra"] },
  { key: "verba_mensal", label: "Verba mensal de mídia (R$)", type: "text" },
  { key: "url_destino", label: "URL do site ou landing page de destino", type: "text" },
  { key: "pixel_instalado", label: "Pixel / tags de rastreamento já instalados?", type: "select", options: ["Sim, todos instalados", "Parcialmente instalado", "Não instalado", "Não sei"] },
  { key: "acesso_bm", label: "Acesso ao gerenciador (BM / Google Ads) já compartilhado?", type: "select", options: ["Sim", "Não — será compartilhado na etapa 1", "Não sei"] },
  { key: "publico_alvo", label: "Descrição do público-alvo (localidade, perfil, segmento)", type: "textarea" },
  { key: "historico", label: "Conta nova ou com histórico de campanhas?", type: "select", options: ["Conta nova", "Conta com histórico", "Não sei"] },
  { key: "criativos", label: "Criativos (imagens/vídeos) serão fornecidos pela agência?", type: "select", options: ["Sim", "Não — nômade cria", "Mix dos dois"] },
  { key: "observacoes", label: "Observações adicionais", type: "textarea" },
];

const EXECUTION_RULES = [
  "A tarefa é executada em ciclo mensal com 7 etapas internas sequenciais",
  "Etapa 1 é de responsabilidade exclusiva do Líder de Performance — não iniciar as demais sem aprovação",
  "Etapas semanais (2–5) têm duração de 7 dias cada; a próxima semana pode ser liberada após o envio da semana atual",
  "Líder qualifica internamente as entregas semanais — cliente/agência vê apenas 'Em execução'",
  "Se o líder reprovar uma semana, o nômade corrige na mesma etapa; não volta ao passado",
  "Relatório final (etapa 6) é aprovado pelo líder antes de ir para agência/cliente",
  "Remoção de acessos (etapa 7) encerra o ciclo — registrar justificativa se o mesmo nômade continuar",
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=".repeat(60));
  console.log("  SEED: Gestão de Tráfego — Fluxo Operacional Correto");
  console.log("=".repeat(60));

  // ── 1. Verificar produto PA0001 ──────────────────────────────────────────
  const product = await prisma.product.findUnique({ where: { id: "PA0001" } });
  if (!product) {
    console.error("\n❌ Produto PA0001 não encontrado. Execute seed-all-products primeiro.");
    process.exit(1);
  }
  console.log(`\n✅ Produto: ${product.name} (${product.id})`);

  // ── 2. Upsert CatalogTask PA0001-T01 com nova definição ─────────────────
  console.log("\n── Etapa 2: Atualizar CatalogTask PA0001-T01");

  const newTaskData = {
    name: "Gestão de Tráfego",
    category: "Performance e Anúncios Patrocinados",
    task_type: "execution",
    description:
      "Gerenciamento completo de campanhas pagas por ciclo mensal: verificação de briefing e acessos pelo líder, execução semanal pelo nômade habilitado, relatório final consolidado e remoção de acessos.",
    objective:
      "Entregar um ciclo mensal completo de gestão de tráfego, com campanhas otimizadas semana a semana, relatório de performance ao final e encerramento seguro de todos os acessos compartilhados.",
    estimated_hours: 13,
    default_deadline_days: 35,
    default_priority: "high",
    complexity: "advanced",
    requires_access: true,
    requires_briefing: true,
    steps: JSON.stringify(STEPS),
    briefing_questions: JSON.stringify(BRIEFING_QUESTIONS),
    execution_rules: JSON.stringify(EXECUTION_RULES),
    status: "ativa",
    is_active: true,
  };

  const ct01 = await prisma.catalogTask.upsert({
    where: { code: "PA0001-T01" },
    update: newTaskData,
    create: { code: "PA0001-T01", ...newTaskData },
  });
  console.log(`  ✅ PA0001-T01 "${ct01.name}" — id: ${ct01.id}`);

  // ── 3. Garantir link ProductCatalogTask ──────────────────────────────────
  await prisma.productCatalogTask.upsert({
    where: { product_id_catalog_task_id: { product_id: "PA0001", catalog_task_id: ct01.id } },
    update: { sort_order: 1, phase: "PA0001-E01", is_mandatory: true },
    create: { product_id: "PA0001", catalog_task_id: ct01.id, sort_order: 1, is_mandatory: true, phase: "PA0001-E01" },
  });
  console.log("  🔗 Link PA0001 ↔ PA0001-T01 garantido");

  // ── 4. Remover tasks antigas T02, T03, T04 ──────────────────────────────
  console.log("\n── Etapa 4: Remover CatalogTasks antigas");
  const oldCodes = ["PA0001-T02", "PA0001-T03", "PA0001-T04"];

  for (const code of oldCodes) {
    const old = await prisma.catalogTask.findUnique({ where: { code } });
    if (!old) {
      console.log(`  ⏭  ${code} — não encontrado, pulando`);
      continue;
    }

    // Deletar ProjectTasks vinculadas (cascata elimina stages, briefing, attachments)
    const { count: ptCount } = await prisma.projectTask.deleteMany({
      where: { catalog_task_id: old.id },
    });
    if (ptCount > 0) console.log(`  🗑  ${code}: ${ptCount} ProjectTask(s) deletada(s)`);

    // Deletar links ProductCatalogTask
    await prisma.productCatalogTask.deleteMany({ where: { catalog_task_id: old.id } });

    // Deletar CatalogTask
    await prisma.catalogTask.delete({ where: { id: old.id } });
    console.log(`  🗑  CatalogTask ${code} removida`);
  }

  // ── 5. Atualizar ProjectTasks existentes para PA0001-T01 ─────────────────
  console.log("\n── Etapa 5: Atualizar ProjectTasks existentes");
  const existingPTs = await prisma.projectTask.findMany({
    where: { catalog_task_id: ct01.id },
    include: { stages: true },
  });

  if (existingPTs.length === 0) {
    console.log("  ℹ  Nenhuma ProjectTask existente para PA0001-T01");
  } else {
    for (const pt of existingPTs) {
      // Atualizar campos da task
      await prisma.projectTask.update({
        where: { id: pt.id },
        data: {
          title: "Gestão de Tráfego",
          name_snapshot: "Gestão de Tráfego",
          steps_snapshot: JSON.stringify(STEPS),
          briefing_snapshot: JSON.stringify(BRIEFING_QUESTIONS),
          status: "PARA_LANCAMENTO",
          code_snapshot: "PA0001-T01",
        },
      });

      // Recriar stages com a nova estrutura de 7 etapas
      await prisma.projectTaskStage.deleteMany({ where: { project_task_id: pt.id } });

      for (const step of STEPS) {
        await prisma.projectTaskStage.create({
          data: {
            project_task_id: pt.id,
            catalog_step_ref: step.id,
            titulo: step.name,
            descricao: step.description ?? null,
            ordem: step.order,
            status: "PENDENTE",
            obrigatoria: true,
            depende_da_etapa_anterior: step.order > 1,
            briefing_necessario: step.id === "PA0001-E01",
          },
        });
      }
      console.log(`  ✅ Task ${pt.id}: 7 etapas recriadas (status → PARA_LANCAMENTO)`);
    }
  }

  // ── Resumo ───────────────────────────────────────────────────────────────
  console.log("\n" + "=".repeat(60));
  console.log("  ✅ Gestão de Tráfego configurada com sucesso!");
  console.log("");
  console.log("  Estrutura:");
  console.log("  · 1 tarefa principal: Gestão de Tráfego (PA0001-T01)");
  STEPS.forEach((s) => {
    const resp = s.responsibleType === "leader" ? "👤 Líder" : "🧭 Nômade";
    const dur = s.durationDays ? ` [${s.durationDays} dias]` : "";
    console.log(`    E0${s.order} — ${s.name}${dur} → ${resp}`);
  });
  console.log("=".repeat(60));
}

main()
  .catch((e) => {
    console.error("\n❌ Erro:", e.message ?? e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
