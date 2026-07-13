/**
 * Reset controlado de projetos — ambiente LOCAL apenas.
 *
 * Remove todos os projetos existentes (e registros dependentes: produtos
 * vinculados, pagamentos, tarefas, etapas, cofre de credenciais, anexos,
 * respostas de briefing, histórico de atribuição, invoices/task-executions
 * ligados a projeto) e recria exatamente 15 projetos novos:
 *   - 3 criados pelo Admin
 *   - 3 criados pela Agency (agencia@allka.test)
 *   - 3 criados pela Company (company@allka.test)
 *   - 3 criados pelo Partner (partner@allka.test)
 *   - 3 rascunhos sem nenhum vínculo comercial/operacional
 *
 * Os 12 projetos com vínculo (admin/agency/company/partner) recebem
 * created_by_user_id real (autoria via token, ver Project.created_by_user_id).
 * Os 3 "sem vínculo" ficam com created_by_user_id null de propósito — são
 * fixtures inseridas direto pelo script, não passam pela API. Código
 * persistente (project_code) via sequência atômica (EntitySequence) — este
 * script, por ser ferramenta de reset de fixture, reinicia as sequências
 * "project"/"project_task" pra 0 antes de recriar, garantindo de novo
 * proj_00001..proj_00015 (em operação normal via API isso nunca acontece).
 *
 * Não confirma pagamentos, não gera tarefas, não altera usuários, produtos,
 * templates ou configurações. Recusa-se a rodar fora de localhost/127.0.0.1.
 *
 * Execução: cd apps/backend && npx tsx prisma/seed-qa-reset-15-projects.ts
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { getNextSequenceValue, formatProjectCode } from "../src/lib/sequence";

const prisma = new PrismaClient();

// ─── 1. Guarda de ambiente ────────────────────────────────────────────────
const RAW_DB_URL = process.env.DATABASE_URL ?? "";
const isLocalHost = /localhost|127\.0\.0\.1/.test(RAW_DB_URL);

function describeDbUrl(url: string) {
  try {
    const u = new URL(url);
    return { host: u.hostname, port: u.port || "(default)", database: u.pathname.replace(/^\//, "") };
  } catch {
    return { host: "?", port: "?", database: "?" };
  }
}

const dbInfo = describeDbUrl(RAW_DB_URL);

console.log("─".repeat(70));
console.log("RESET CONTROLADO DE PROJETOS — verificação de ambiente");
console.log("─".repeat(70));
console.log(`  Host      : ${dbInfo.host}`);
console.log(`  Porta     : ${dbInfo.port}`);
console.log(`  Banco     : ${dbInfo.database}`);
console.log(`  NODE_ENV  : ${process.env.NODE_ENV ?? "(não definido)"}`);
console.log(`  É local?  : ${isLocalHost ? "SIM" : "NÃO"}`);
console.log("─".repeat(70));

if (!isLocalHost) {
  console.error("\n❌ BLOQUEADO: DATABASE_URL não aponta para localhost/127.0.0.1.");
  console.error("   Este script só pode rodar contra um banco local. Nada foi apagado.");
  process.exit(1);
}
if (process.env.NODE_ENV === "production") {
  console.error("\n❌ BLOQUEADO: NODE_ENV=production. Nada foi apagado.");
  process.exit(1);
}

// ─── 2. Test users / profiles ─────────────────────────────────────────────
const TEST_EMAILS = {
  admin: "admin@allka.test",
  agencia: "agencia@allka.test",
  company: "company@allka.test",
  partner: "partner@allka.test",
} as const;

async function loadTestProfiles() {
  const [adminUser, agenciaUser, companyUser, partnerUser] = await Promise.all([
    prisma.user.findUnique({ where: { email: TEST_EMAILS.admin } }),
    prisma.user.findUnique({ where: { email: TEST_EMAILS.agencia }, include: { agency: true } }),
    prisma.user.findUnique({ where: { email: TEST_EMAILS.company } }),
    prisma.user.findUnique({ where: { email: TEST_EMAILS.partner }, include: { partner: true } }),
  ]);

  const missing: string[] = [];
  if (!adminUser) missing.push(TEST_EMAILS.admin);
  if (!agenciaUser) missing.push(TEST_EMAILS.agencia);
  else if (!agenciaUser.agency) missing.push(`${TEST_EMAILS.agencia} (sem Agency vinculada)`);
  if (!companyUser) missing.push(TEST_EMAILS.company);
  else if (!companyUser.company_id) missing.push(`${TEST_EMAILS.company} (sem company_id vinculado)`);
  if (!partnerUser) missing.push(TEST_EMAILS.partner);
  else if (!partnerUser.partner) missing.push(`${TEST_EMAILS.partner} (sem PartnerProfile vinculado)`);

  if (missing.length > 0) {
    console.error("\n❌ Usuário(s) de teste faltando ou incompletos — nada foi apagado:");
    missing.forEach((m) => console.error(`   - ${m}`));
    process.exit(1);
  }

  return {
    adminUserId: adminUser!.id,
    agenciaUserId: agenciaUser!.id,
    agencyId: agenciaUser!.agency!.id,
    companyUserId: companyUser!.id,
    companyId: companyUser!.company_id!,
    partnerUserId: partnerUser!.id,
    partnerId: partnerUser!.partner!.id,
  };
}

// ─── 3. Produtos reais do catálogo local (nenhum criado/duplicado aqui) ───
const PRODUCT_IDS = {
  trafego: "PA0001", // Gestão de Tráfego — 1200
  seo: "PA0002", // SEO — 1500
  performance: "seed-product-perf-01", // Gestão de Performance — 2500
  redesSociais: "DC0001", // Layout de Redes Sociais — 90.72
  website: "DC0005", // Layout de Website — 453.6
  midiaDisplay: "DC0002", // Criativos Mídia Display Estático — 325.08
  dataAnalytics: "PA0004", // Configuração de Data Analytics — 272.16
};

async function loadProducts() {
  const ids = Object.values(PRODUCT_IDS);
  const products = await prisma.product.findMany({ where: { id: { in: ids } } });
  const byId = new Map(products.map((p) => [p.id, p]));
  const missing = ids.filter((id) => !byId.has(id));
  if (missing.length > 0) {
    console.error(`\n❌ Produto(s) do catálogo não encontrados — nada foi apagado: ${missing.join(", ")}`);
    process.exit(1);
  }
  return byId;
}

// ─── 4. Definição dos 15 projetos ─────────────────────────────────────────
type Tier = "admin" | "agency" | "company" | "partner" | "unlinked";

interface ProjectDef {
  seedId: string;
  tier: Tier;
  title: string;
  description: string;
  type: string;
  status: string;
  progress: number;
  consultant?: string;
  consultant_email?: string;
  start_date?: Date;
  end_date?: Date;
  products?: { id: keyof typeof PRODUCT_IDS }[];
  createsPayment?: boolean;
  // "mensal" — usado só por seed-reset-company-03 (ver seção 8 do pedido:
  // "pelo menos um dos 12 projetos vinculados a usuários seja mensal").
  // Produtos e o Payment desse projeto também recebem recurrence/billing_cycle
  // "mensal" — ver loop de criação abaixo.
  lifecycle?: "avulso" | "mensal";
}

const now = Date.now();
const minute = 60_000;
// created_at estritamente crescente na ordem admin -> agency -> company -> partner -> unlinked,
// garantindo que o rank _seq (ORDER BY created_at ASC) fique 1..15 nessa ordem.
function seq(i: number) {
  return new Date(now - (16 - i) * minute);
}

// Ciclo 1 do projeto mensal — mesmo formato que resolveCycleKey() usa em
// src/lib/confirm-payment.ts (YYYY-MM do mês corrente no momento do seed).
function currentCycleKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const PROJECTS: ProjectDef[] = [
  // ── Admin (3) ────────────────────────────────────────────────────────
  {
    seedId: "seed-reset-admin-01",
    tier: "admin",
    title: "Reestruturação de Marca — Allka Ventures",
    description:
      "Diagnóstico completo de posicionamento de marca para a unidade de investimentos internos da Allka. " +
      "Objetivo: consolidar identidade visual e discurso institucional antes da rodada de apresentações a novos parceiros estratégicos no segundo semestre. " +
      "Público-alvo: investidores institucionais e fundos de venture capital B2B. Prioridade: alta — depende de aprovação da diretoria antes de avançar para produção. " +
      "Ainda em fase de escopo, sem produtos contratados.",
    type: "Consultoria",
    status: "draft",
    progress: 0,
    consultant: "Vinicius Guardia Admin",
    consultant_email: "admin@allka.test",
    start_date: undefined,
    end_date: undefined,
  },
  {
    seedId: "seed-reset-admin-02",
    tier: "admin",
    title: "Consultoria de Growth para Portfólio Interno",
    description:
      "Programa de aceleração de tráfego pago para as três verticais internas da Allka com menor maturidade de aquisição digital. " +
      "Objetivo: elevar o volume de leads qualificados em 40% até o fim do trimestre. Público-alvo: squads internos de produto e marketing. " +
      "Prioridade: média. Pagamento ainda não iniciado — aguardando aprovação orçamentária da diretoria financeira.",
    type: "Marketing Digital",
    status: "negotiation",
    progress: 5,
    consultant: "Vinicius Guardia Admin",
    consultant_email: "admin@allka.test",
    start_date: new Date("2026-08-01"),
    end_date: new Date("2026-11-30"),
    products: [{ id: "trafego" }],
  },
  {
    seedId: "seed-reset-admin-03",
    tier: "admin",
    title: "Programa de Aceleração Q3 — Clientes Estratégicos",
    description:
      "Pacote combinado de SEO técnico e gestão de performance para o grupo de contas estratégicas geridas diretamente pelo time de sucesso do cliente Allka. " +
      "Objetivo: reduzir CAC médio das contas-piloto em 25% e comprovar viabilidade antes de estender o modelo para toda a base. " +
      "Público-alvo: contas enterprise já ativas. Prioridade: alta. Checkout iniciado, pagamento ainda não confirmado.",
    type: "Marketing Digital",
    status: "awaiting-payment",
    progress: 0,
    consultant: "Vinicius Guardia Admin",
    consultant_email: "admin@allka.test",
    start_date: new Date("2026-08-15"),
    end_date: new Date("2027-01-15"),
    products: [{ id: "seo" }, { id: "performance" }],
    createsPayment: true,
  },

  // ── Agency (3) ───────────────────────────────────────────────────────
  {
    seedId: "seed-reset-agency-01",
    tier: "agency",
    title: "Reposicionamento Digital — Ótica Bellavista",
    description:
      "Diagnóstico de marca e presença digital para rede regional de óticas que está perdendo participação para concorrentes com e-commerce ativo. " +
      "Objetivo: redesenhar a jornada digital do cliente antes de investir em mídia. Público-alvo: consumidores classe B/C, 30-55 anos, região metropolitana. " +
      "Prioridade: média. Escopo ainda em levantamento com o cliente, sem produtos contratados.",
    type: "Consultoria",
    status: "draft",
    progress: 0,
    consultant: "Gabriel Franco Agency",
    consultant_email: "agencia@allka.test",
  },
  {
    seedId: "seed-reset-agency-02",
    tier: "agency",
    title: "Campanha de Lançamento — Café Raiz Orgânico",
    description:
      "Criação de identidade visual para redes sociais no lançamento da linha de cafés orgânicos certificados. " +
      "Objetivo: gerar awareness inicial e base de seguidores engajada antes da campanha de mídia paga. Público-alvo: consumidores conscientes, 25-45 anos. " +
      "Prioridade: média. Pagamento ainda não iniciado — orçamento em aprovação pelo cliente.",
    type: "Design",
    status: "negotiation",
    progress: 0,
    consultant: "Gabriel Franco Agency",
    consultant_email: "agencia@allka.test",
    start_date: new Date("2026-08-10"),
    end_date: new Date("2026-09-10"),
    products: [{ id: "redesSociais" }],
  },
  {
    seedId: "seed-reset-agency-03",
    tier: "agency",
    title: "Presença Digital Completa — Grupo Hospedar Pousadas",
    description:
      "Novo site institucional com integração de reservas, acompanhado de estratégia de SEO local para as 6 unidades da rede de pousadas. " +
      "Objetivo: reduzir dependência de OTAs e aumentar reservas diretas em 20% na próxima alta temporada. Público-alvo: viajantes que buscam hospedagem via busca orgânica. " +
      "Prioridade: alta. Checkout iniciado, pagamento ainda não confirmado.",
    type: "Desenvolvimento Web",
    status: "awaiting-payment",
    progress: 0,
    consultant: "Gabriel Franco Agency",
    consultant_email: "agencia@allka.test",
    start_date: new Date("2026-09-01"),
    end_date: new Date("2027-01-31"),
    products: [{ id: "website" }, { id: "seo" }],
    createsPayment: true,
  },

  // ── Company (3) ──────────────────────────────────────────────────────
  {
    seedId: "seed-reset-company-01",
    tier: "company",
    title: "Diagnóstico de Marca — Linha Rose Bonifácio Beauty",
    description:
      "Avaliação da percepção de marca da nova linha de cosméticos antes do lançamento nacional. " +
      "Objetivo: validar posicionamento e identidade visual junto ao público-alvo antes de comprometer verba de mídia. Público-alvo: mulheres 20-40 anos, classe A/B. " +
      "Prioridade: média. Ainda em fase de briefing interno, sem produtos contratados.",
    type: "Consultoria",
    status: "draft",
    progress: 0,
    consultant: "Rose Bonifácio Company",
    consultant_email: "company@allka.test",
  },
  {
    seedId: "seed-reset-company-02",
    tier: "company",
    title: "Loja Virtual — Rose Bonifácio E-commerce",
    description:
      "Desenvolvimento da vitrine digital para venda direta ao consumidor, integrada ao estoque físico das lojas próprias. " +
      "Objetivo: lançar o canal e-commerce até o fim do trimestre com processo de checkout simplificado. Público-alvo: clientela atual da marca migrando para o digital. " +
      "Prioridade: alta. Pagamento ainda não iniciado — aguardando validação de escopo final com o financeiro.",
    type: "E-commerce",
    status: "negotiation",
    progress: 0,
    consultant: "Rose Bonifácio Company",
    consultant_email: "company@allka.test",
    start_date: new Date("2026-08-05"),
    end_date: new Date("2026-11-05"),
    products: [{ id: "website" }],
  },
  {
    seedId: "seed-reset-company-03",
    tier: "company",
    title: "Gestão Contínua de Tráfego e Criativos — Rose Bonifácio Presentes",
    description:
      "Contratação mensal recorrente combinando tráfego pago e criativos para mídia display, para sustentar aquisição contínua da linha de presentes. " +
      "Objetivo: manter CAC estável mês a mês com otimização contínua de campanhas. Público-alvo: compradores de presente, predominantemente mobile. " +
      "Prioridade: alta. Contratação mensal — checkout do primeiro ciclo iniciado, pagamento ainda não confirmado.",
    type: "Marketing Digital",
    status: "awaiting-payment",
    progress: 0,
    consultant: "Rose Bonifácio Company",
    consultant_email: "company@allka.test",
    start_date: new Date("2026-10-15"),
    end_date: undefined, // contratação mensal recorrente, sem data fixa de término
    products: [{ id: "trafego" }, { id: "midiaDisplay" }],
    createsPayment: true,
    lifecycle: "mensal",
  },

  // ── Partner (3) ──────────────────────────────────────────────────────
  {
    seedId: "seed-reset-partner-01",
    tier: "partner",
    title: "Auditoria de Presença Digital — Studio Arqui Nova",
    description:
      "Levantamento do estado atual de site, redes sociais e SEO do escritório de arquitetura indicado pelo parceiro. " +
      "Objetivo: mapear gaps antes de propor um pacote de serviços contínuo. Público-alvo: clientes de projetos residenciais de médio/alto padrão. " +
      "Prioridade: baixa. Ainda em fase de levantamento inicial, sem produtos contratados.",
    type: "Consultoria",
    status: "draft",
    progress: 0,
    consultant: "Valdério Partner",
    consultant_email: "partner@allka.test",
  },
  {
    seedId: "seed-reset-partner-02",
    tier: "partner",
    title: "Rebranding Completo — Vinícola Serra Alta",
    description:
      "Novo site institucional com catálogo de rótulos e integração com clube de assinatura, para vinícola em processo de expansão para o mercado nacional. " +
      "Objetivo: profissionalizar a presença digital antes da entrada em novos distribuidores. Público-alvo: consumidores finais e distribuidores B2B. " +
      "Prioridade: média. Pagamento ainda não iniciado — proposta em análise pelo cliente.",
    type: "Desenvolvimento Web",
    status: "negotiation",
    progress: 0,
    consultant: "Valdério Partner",
    consultant_email: "partner@allka.test",
    start_date: new Date("2026-09-01"),
    end_date: new Date("2026-12-01"),
    products: [{ id: "website" }],
  },
  {
    seedId: "seed-reset-partner-03",
    tier: "partner",
    title: "Estratégia Integrada de Performance — Instituto Educar+",
    description:
      "Pacote de gestão de performance e configuração de analytics para instituto de ensino à distância indicado pelo parceiro, com foco em captação de matrículas para o próximo semestre letivo. " +
      "Objetivo: estruturar mensuração confiável de CAC por curso antes de escalar investimento em mídia. Público-alvo: adultos buscando requalificação profissional. " +
      "Prioridade: alta. Checkout iniciado, pagamento ainda não confirmado.",
    type: "Marketing Digital",
    status: "awaiting-payment",
    progress: 0,
    consultant: "Valdério Partner",
    consultant_email: "partner@allka.test",
    start_date: new Date("2026-08-20"),
    end_date: new Date("2027-01-20"),
    products: [{ id: "performance" }, { id: "dataAnalytics" }],
    createsPayment: true,
  },

  // ── Sem vínculo operacional (3) — rascunhos puros ───────────────────
  {
    seedId: "seed-reset-unlinked-01",
    tier: "unlinked",
    title: "Novo Projeto — Escopo em Definição",
    description: "Rascunho criado para reservar o espaço de um novo projeto ainda sem escopo, cliente ou responsável definidos.",
    type: undefined as unknown as string,
    status: "draft",
    progress: 0,
  },
  {
    seedId: "seed-reset-unlinked-02",
    tier: "unlinked",
    title: "Rascunho — Aguardando Briefing do Cliente",
    description: "Projeto iniciado a partir de um primeiro contato comercial; aguardando o cliente enviar briefing formal antes de prosseguir.",
    type: undefined as unknown as string,
    status: "draft",
    progress: 0,
  },
  {
    seedId: "seed-reset-unlinked-03",
    tier: "unlinked",
    title: "Iniciativa Não Classificada",
    description: "Registro preliminar sem classificação de categoria, cliente ou responsável — pendente de triagem.",
    type: undefined as unknown as string,
    status: "draft",
    progress: 0,
  },
];

// ─── 5. Execução ───────────────────────────────────────────────────────────
async function main() {
  const { adminUserId, agenciaUserId, agencyId, companyUserId, companyId, partnerUserId, partnerId } =
    await loadTestProfiles();
  const products = await loadProducts();

  console.log("\n✓ Usuários de teste confirmados (admin, agencia, company, partner)");
  console.log("✓ Produtos do catálogo confirmados:", [...products.values()].map((p) => p.name).join(", "));

  // ── Contagem ANTES ─────────────────────────────────────────────────────
  const before = await countAll();
  console.log("\n" + "─".repeat(70));
  console.log("CONTAGEM ANTES DA LIMPEZA");
  console.log("─".repeat(70));
  printCounts(before);

  // ── Limpeza + criação, dentro de uma única transação ───────────────────
  await prisma.$transaction(async (tx) => {
    // Filhos de ProjectCredential
    await tx.projectCredentialAccessLog.deleteMany({});
    // Filhos de ProjectTask
    await tx.taskAssignmentHistory.deleteMany({});
    await tx.taskAttachment.deleteMany({});
    await tx.taskBriefingAnswer.deleteMany({});
    await tx.projectTaskStage.deleteMany({});
    // Registros que dependem diretamente de Project
    await tx.projectCredential.deleteMany({});
    await tx.projectTask.deleteMany({});
    // PaymentItem referencia payment_id E project_product_id — precisa ser
    // limpo antes dos dois (achado ao rodar o seed depois de adicionar o
    // model PaymentItem nesta fase: FK constraint barrava a exclusão de
    // project_products sem isto).
    await tx.paymentItem.deleteMany({});
    await tx.projectProduct.deleteMany({});
    await tx.payment.deleteMany({});
    // Invoice/TaskExecution: só os que estão ligados a um projeto (campo opcional)
    await tx.invoice.deleteMany({ where: { project_id: { not: null } } });
    await tx.taskExecution.deleteMany({ where: { project_id: { not: null } } });
    // Por fim, os projetos
    await tx.project.deleteMany({});

    // Este script é uma ferramenta de fixture de teste ("recomeçar do
    // zero") — por isso, e só aqui, reiniciamos as sequências "project" e
    // "project_task" pra 0. Em operação normal (POST /api/projects,
    // confirmação de pagamento) a sequência NUNCA é reiniciada — só cresce,
    // mesmo com exclusões — mas o reset explícito de fixture é o único jeito
    // de garantir de novo proj_00001..proj_00015 depois de um reset completo.
    await tx.entitySequence.upsert({
      where: { key: "project" },
      update: { current_value: 0 },
      create: { key: "project", current_value: 0 },
    });
    await tx.entitySequence.upsert({
      where: { key: "project_task" },
      update: { current_value: 0 },
      create: { key: "project_task", current_value: 0 },
    });

    // ── Criação dos 15 projetos ───────────────────────────────────────────
    for (let i = 0; i < PROJECTS.length; i++) {
      const def = PROJECTS[i];
      const created_at = seq(i + 1);

      let ownerData: Record<string, unknown> = {};
      let createdByUserId: string | null = null;
      let pagador = "CLIENTE";
      if (def.tier === "admin") {
        createdByUserId = adminUserId;
      } else if (def.tier === "agency") {
        ownerData = { agency_id: agencyId };
        createdByUserId = agenciaUserId;
        pagador = "AGENCIA";
      } else if (def.tier === "company") {
        ownerData = { company_id: companyId };
        createdByUserId = companyUserId;
      } else if (def.tier === "partner") {
        ownerData = { partner_id: partnerId };
        createdByUserId = partnerUserId;
      }
      // unlinked: sem ownership E sem criador — os únicos 3 projetos deste
      // seed com created_by_user_id null (fixtures inseridas direto pelo
      // script, não pela API — ver comentário no schema em Project.created_by_user_id).

      const linkedProducts = (def.products ?? []).map((p) => products.get(PRODUCT_IDS[p.id])!);
      const totalValue = linkedProducts.reduce((sum, p) => sum + p.base_price, 0);
      const lifecycle = def.lifecycle ?? "avulso";

      const projectCodeSeq = await getNextSequenceValue(tx, "project");

      const project = await tx.project.create({
        data: {
          id: def.seedId,
          project_code: formatProjectCode(projectCodeSeq),
          title: def.title,
          description: def.description,
          type: def.type,
          status: def.status,
          lifecycle,
          progress: def.progress,
          value: totalValue,
          budget: totalValue,
          spent: 0,
          team_size: def.tier === "unlinked" ? 0 : 1,
          consultant: def.consultant,
          consultant_email: def.consultant_email,
          start_date: def.start_date,
          end_date: def.end_date,
          created_at,
          created_by_user_id: createdByUserId,
          ...ownerData,
        },
      });

      for (const product of linkedProducts) {
        await tx.projectProduct.create({
          data: {
            project_id: project.id,
            product_id: product.id,
            product_name_snapshot: product.name,
            product_code_snapshot: product.id,
            product_category_snapshot: product.category,
            product_price_snapshot: product.base_price,
            preco_final_cliente_snapshot: product.base_price,
            comissao_snapshot: 0,
            pagador_snapshot: pagador,
            recurrence_snapshot: lifecycle,
            status: "PENDENTE",
          },
        });
      }

      if (def.createsPayment) {
        await tx.payment.create({
          data: {
            project_id: project.id,
            amount: totalValue,
            payment_method: "CARTAO_TESTE",
            status: "PENDENTE",
            gateway: "FAKE_SANDBOX",
            // Ciclo 1 explícito pro projeto mensal — mesmo formato que
            // confirmPaymentAndGenerateProjectTasks calcularia sozinho
            // (YYYY-MM do mês corrente), então o cenário G do verify script
            // encontra esta linha PENDENTE sem precisar informar payment_id.
            // Projetos avulsos ficam com billing_cycle_key null de propósito
            // (compatibilidade com o comportamento pré-existente).
            billing_cycle_key: lifecycle === "mensal" ? currentCycleKey() : null,
            notes:
              lifecycle === "mensal"
                ? "Seed QA — contratação mensal, checkout do ciclo 1 iniciado, aguardando confirmação (não confirmar automaticamente)."
                : "Seed QA — checkout iniciado, aguardando confirmação (não confirmar automaticamente).",
          },
        });
      }

      console.log(`  ✓ [${def.tier.padEnd(9)}] [${def.status.padEnd(16)}] ${def.title}`);
    }
  });

  // ── Contagem DEPOIS + validação ─────────────────────────────────────────
  const after = await countAll();
  console.log("\n" + "─".repeat(70));
  console.log("CONTAGEM DEPOIS DA LIMPEZA + SEED");
  console.log("─".repeat(70));
  printCounts(after);

  const projects = await prisma.project.findMany({
    orderBy: { project_code: "asc" },
    select: {
      id: true,
      project_code: true,
      title: true,
      status: true,
      created_by_user_id: true,
      agency_id: true,
      company_id: true,
      partner_id: true,
      products: { select: { id: true } },
      payments: { select: { id: true, status: true } },
      project_tasks: { select: { id: true } },
    },
  });

  console.log("\n" + "─".repeat(70));
  console.log("LISTA FINAL (project_code persistido, não mais calculado)");
  console.log("─".repeat(70));
  projects.forEach((p) => {
    const owner = p.agency_id ? "agency" : p.company_id ? "company" : p.partner_id ? "partner" : "—";
    const creator = p.created_by_user_id ? "com criador" : "sem criador";
    console.log(
      `  ${p.project_code}  [${owner.padEnd(7)}] [${creator}] [${p.status.padEnd(16)}] produtos:${p.products.length} pagamentos:${p.payments.length} tarefas:${p.project_tasks.length}  ${p.title}`,
    );
  });

  const byTier = {
    admin: projects.filter((p) => p.id.startsWith("seed-reset-admin-")).length,
    agency: projects.filter((p) => p.agency_id === agencyId).length,
    company: projects.filter((p) => p.company_id === companyId).length,
    partner: projects.filter((p) => p.partner_id === partnerId).length,
    unlinked: projects.filter((p) => p.id.startsWith("seed-reset-unlinked-")).length,
  };
  const byCreator = {
    admin: projects.filter((p) => p.created_by_user_id === adminUserId).length,
    agency: projects.filter((p) => p.created_by_user_id === agenciaUserId).length,
    company: projects.filter((p) => p.created_by_user_id === companyUserId).length,
    partner: projects.filter((p) => p.created_by_user_id === partnerUserId).length,
    semCriador: projects.filter((p) => p.created_by_user_id === null).length,
  };
  const anyPaid = await prisma.payment.count({ where: { status: "PAGO" } });
  const anyPaymentItems = await prisma.paymentItem.count();
  const anyTasks = await prisma.projectTask.count();
  const anyStages = await prisma.projectTaskStage.count();
  const duplicateIdCheck = new Set(projects.map((p) => p.id)).size === projects.length;
  const duplicateCodeCheck = new Set(projects.map((p) => p.project_code)).size === projects.length;
  const expectedCodes = Array.from({ length: 15 }, (_, i) => formatProjectCode(i + 1));
  const actualCodes = projects.map((p) => p.project_code);
  const sequentialCheck = JSON.stringify(actualCodes) === JSON.stringify(expectedCodes);
  const seqRow = await prisma.entitySequence.findUnique({ where: { key: "project" } });
  const taskSeqRow = await prisma.entitySequence.findUnique({ where: { key: "project_task" } });

  console.log("\n" + "─".repeat(70));
  console.log("VALIDAÇÃO FINAL");
  console.log("─".repeat(70));
  console.log(`  Total de projetos       : ${projects.length} (esperado: 15)`);
  console.log(`  Por vínculo organizac.  : admin=${byTier.admin} agency=${byTier.agency} company=${byTier.company} partner=${byTier.partner} sem-vinculo=${byTier.unlinked}`);
  console.log(`  Por created_by_user_id  : admin=${byCreator.admin} agency=${byCreator.agency} company=${byCreator.company} partner=${byCreator.partner} sem-criador=${byCreator.semCriador}`);
  console.log(`  Pagamentos confirmados  : ${anyPaid} (esperado: 0)`);
  console.log(`  PaymentItems (de PAGO)  : ${anyPaymentItems} (esperado: 0)`);
  console.log(`  Tarefas geradas         : ${anyTasks} (esperado: 0)`);
  console.log(`  Etapas geradas          : ${anyStages} (esperado: 0)`);
  console.log(`  IDs sem duplicidade     : ${duplicateIdCheck ? "OK" : "FALHOU"}`);
  console.log(`  project_code sem dupl.  : ${duplicateCodeCheck ? "OK" : "FALHOU"}`);
  console.log(`  Códigos proj_00001-15   : ${sequentialCheck ? "OK" : "FALHOU"} (${actualCodes[0]} .. ${actualCodes[actualCodes.length - 1]})`);
  console.log(`  Sequência "project"     : ${seqRow?.current_value} (esperado: 15)`);
  console.log(`  Sequência "project_task": ${taskSeqRow?.current_value} (esperado: 0)`);

  const ok =
    projects.length === 15 &&
    byTier.admin === 3 &&
    byTier.agency === 3 &&
    byTier.company === 3 &&
    byTier.partner === 3 &&
    byTier.unlinked === 3 &&
    byCreator.admin === 3 &&
    byCreator.agency === 3 &&
    byCreator.company === 3 &&
    byCreator.partner === 3 &&
    byCreator.semCriador === 3 &&
    anyPaid === 0 &&
    anyPaymentItems === 0 &&
    anyTasks === 0 &&
    anyStages === 0 &&
    duplicateIdCheck &&
    duplicateCodeCheck &&
    sequentialCheck &&
    seqRow?.current_value === 15 &&
    (taskSeqRow?.current_value ?? 0) === 0;

  if (!ok) {
    console.error("\n❌ VALIDAÇÃO FALHOU — estado final não corresponde ao esperado.");
    process.exit(1);
  }

  console.log("\n✅ Reset + seed concluído com sucesso: 15 projetos, distribuição correta, autoria persistida, códigos proj_00001-00015, nenhum pagamento confirmado, nenhuma tarefa/etapa gerada.");
}

async function countAll() {
  const [
    projects, projectProducts, payments, paymentItems, projectTasks, projectTaskStages,
    credentials, accessLogs, attachments, briefingAnswers, assignmentHistory,
    invoicesWithProject, taskExecutionsWithProject,
  ] = await Promise.all([
    prisma.project.count(),
    prisma.projectProduct.count(),
    prisma.payment.count(),
    prisma.paymentItem.count(),
    prisma.projectTask.count(),
    prisma.projectTaskStage.count(),
    prisma.projectCredential.count(),
    prisma.projectCredentialAccessLog.count(),
    prisma.taskAttachment.count(),
    prisma.taskBriefingAnswer.count(),
    prisma.taskAssignmentHistory.count(),
    prisma.invoice.count({ where: { project_id: { not: null } } }),
    prisma.taskExecution.count({ where: { project_id: { not: null } } }),
  ]);
  return { projects, projectProducts, payments, paymentItems, projectTasks, projectTaskStages, credentials, accessLogs, attachments, briefingAnswers, assignmentHistory, invoicesWithProject, taskExecutionsWithProject };
}

function printCounts(c: Awaited<ReturnType<typeof countAll>>) {
  console.log(`  projects                : ${c.projects}`);
  console.log(`  project_products        : ${c.projectProducts}`);
  console.log(`  payments                : ${c.payments}`);
  console.log(`  payment_items           : ${c.paymentItems}`);
  console.log(`  project_tasks           : ${c.projectTasks}`);
  console.log(`  project_task_stages     : ${c.projectTaskStages}`);
  console.log(`  project_credentials     : ${c.credentials}`);
  console.log(`  credential_access_logs  : ${c.accessLogs}`);
  console.log(`  task_attachments        : ${c.attachments}`);
  console.log(`  task_briefing_answers   : ${c.briefingAnswers}`);
  console.log(`  task_assignment_history : ${c.assignmentHistory}`);
  console.log(`  invoices (com projeto)  : ${c.invoicesWithProject}`);
  console.log(`  task_executions (c/proj): ${c.taskExecutionsWithProject}`);
}

main()
  .catch((e) => {
    console.error("\n❌ ERRO:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
