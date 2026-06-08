import "dotenv/config";

import { prisma } from "../lib/prisma";
import { gerarTarefasDoProjeto } from "../lib/generate-tasks";

const AGENCY_NAME = "Lamego Teste Agency";

type SeedStatus =
  | "draft"
  | "negotiation"
  | "awaiting-payment"
  | "planning"
  | "in-progress"
  | "completed"
  | "cancelled";

type SeedProject = {
  title: string;
  description: string;
  status: SeedStatus;
  lifecycle: "avulso" | "mensal";
  type: string;
  productCodes: string[];
  progress: number;
  teamSize: number;
};

const CLIENTS = [
  {
    name: "Aurora Clínica Integrada",
    cnpj: "11.222.333/0001-11",
    email: "financeiro@auroraclinica.com.br",
    segment: "Saúde",
  },
  {
    name: "Casa Nativa Decor",
    cnpj: "22.333.444/0001-22",
    email: "contato@casanativa.com.br",
    segment: "Varejo",
  },
  {
    name: "Pulse Eventos",
    cnpj: "33.444.555/0001-33",
    email: "ola@pulseeventos.com.br",
    segment: "Eventos",
  },
  {
    name: "Norte Urbano Tech",
    cnpj: "44.555.666/0001-44",
    email: "admin@norteurbano.com.br",
    segment: "Tecnologia",
  },
] as const;

const PROJECTS: SeedProject[] = [
  {
    title: "Agency Demo - Rascunho Brand Kit",
    description: "Projeto em rascunho com entregas de branding e kit visual para validação interna.",
    status: "draft",
    lifecycle: "avulso",
    type: "Branding",
    productCodes: ["DC0004", "DC0006"],
    progress: 0,
    teamSize: 2,
  },
  {
    title: "Agency Demo - Rascunho Conteúdo Mensal",
    description: "Estrutura de conteúdo recorrente com produção e apoio de mídia social.",
    status: "draft",
    lifecycle: "mensal",
    type: "Marketing Digital",
    productCodes: ["DC0001", "PA0001"],
    progress: 2,
    teamSize: 3,
  },
  {
    title: "Agency Demo - Negociação Performance 360",
    description: "Proposta em negociação para tráfego pago, auditoria e acompanhamento mensal.",
    status: "negotiation",
    lifecycle: "mensal",
    type: "Performance",
    productCodes: ["PA0001", "PA0004", "PA0002"],
    progress: 8,
    teamSize: 3,
  },
  {
    title: "Agency Demo - Negociação Landing + Branding",
    description: "Pacote comercial com identidade visual e landing page para conversão.",
    status: "negotiation",
    lifecycle: "avulso",
    type: "Design e Web",
    productCodes: ["DC0005", "DC0002"],
    progress: 12,
    teamSize: 4,
  },
  {
    title: "Agency Demo - Aguardando Pagamento Site Premium",
    description: "Projeto aprovado comercialmente, aguardando confirmação de pagamento.",
    status: "awaiting-payment",
    lifecycle: "avulso",
    type: "Desenvolvimento Web",
    productCodes: ["DC0005", "PA0003"],
    progress: 5,
    teamSize: 4,
  },
  {
    title: "Agency Demo - Aguardando Pagamento Social Starter",
    description: "Combo recorrente para redes sociais com mídia e operação contínua.",
    status: "awaiting-payment",
    lifecycle: "mensal",
    type: "Marketing Digital",
    productCodes: ["DC0001", "PA0001"],
    progress: 6,
    teamSize: 3,
  },
  {
    title: "Agency Demo - Planejamento E-commerce Moda",
    description: "E-commerce completo em fase de planejamento com produtos de design e analytics.",
    status: "planning",
    lifecycle: "avulso",
    type: "E-commerce",
    productCodes: ["DC0005", "PA0004"],
    progress: 18,
    teamSize: 5,
  },
  {
    title: "Agency Demo - Planejamento SEO Local",
    description: "Plano mensal de SEO local com Google Negócios e apoio de aquisição.",
    status: "planning",
    lifecycle: "mensal",
    type: "SEO",
    productCodes: ["PA0002", "PA0003"],
    progress: 22,
    teamSize: 3,
  },
  {
    title: "Agency Demo - Em Andamento Lançamento Produto X",
    description: "Operação já em andamento com peças criativas e tráfego pago.",
    status: "in-progress",
    lifecycle: "avulso",
    type: "Campanha",
    productCodes: ["DC0002", "PA0001"],
    progress: 56,
    teamSize: 4,
  },
  {
    title: "Agency Demo - Em Andamento Growth Mensal",
    description: "Rotina mensal com mídia, SEO e análise de dados para crescimento contínuo.",
    status: "in-progress",
    lifecycle: "mensal",
    type: "Growth",
    productCodes: ["PA0001", "PA0004", "PA0002"],
    progress: 63,
    teamSize: 5,
  },
  {
    title: "Agency Demo - Concluído Rebranding Completo",
    description: "Entrega finalizada com identidade visual, papelaria e materiais de apoio.",
    status: "completed",
    lifecycle: "avulso",
    type: "Branding",
    productCodes: ["DC0004", "DC0006", "DC0002"],
    progress: 100,
    teamSize: 3,
  },
  {
    title: "Agency Demo - Concluído Consultoria Estratégica",
    description: "Projeto concluído com entregas estratégicas, presença digital e suporte recorrente.",
    status: "completed",
    lifecycle: "mensal",
    type: "Consultoria",
    productCodes: ["PA0003", "PA0005"],
    progress: 100,
    teamSize: 2,
  },
  {
    title: "Agency Demo - Cancelado Portal Corporativo",
    description: "Projeto interrompido após validação comercial, mantendo histórico completo.",
    status: "cancelled",
    lifecycle: "avulso",
    type: "Portal Web",
    productCodes: ["DC0005", "PA0004"],
    progress: 20,
    teamSize: 4,
  },
  {
    title: "Agency Demo - Cancelado Funil Social",
    description: "Campanha cancelada antes da execução, mas com vínculo de produtos e rastreio.",
    status: "cancelled",
    lifecycle: "mensal",
    type: "Aquisição",
    productCodes: ["DC0001", "PA0001", "PA0003"],
    progress: 18,
    teamSize: 3,
  },
];

function money(value: number) {
  return Math.round(value * 100) / 100;
}

function parseMetadata(metadata: string | null) {
  if (!metadata) return {} as Record<string, unknown>;
  try {
    const parsed = JSON.parse(metadata);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {} as Record<string, unknown>;
  }
}

function getRecurrenceSnapshot(metadata: string | null, lifecycle: SeedProject["lifecycle"]) {
  const recurrence = parseMetadata(metadata).recurrence;
  return typeof recurrence === "string" ? recurrence : lifecycle;
}

function getProjectProductStatus(projectStatus: SeedStatus) {
  if (projectStatus === "completed") return "CONCLUIDO";
  if (projectStatus === "cancelled") return "CANCELADO";
  if (projectStatus === "draft" || projectStatus === "negotiation" || projectStatus === "awaiting-payment") {
    return "PENDENTE";
  }
  return "EM_EXECUCAO";
}

function getTaskCompletionStatus(projectStatus: SeedStatus) {
  if (projectStatus === "completed") return "CONCLUIDA";
  if (projectStatus === "cancelled") return "CANCELADA";
  return null;
}

async function ensureClients() {
  const companies = [] as Array<{ id: string; name: string; cnpj: string | null }>;

  for (const client of CLIENTS) {
    const company = await prisma.company.upsert({
      where: { cnpj: client.cnpj },
      update: {
        name: client.name,
        email: client.email,
        segment: client.segment,
        status: "ativo",
      },
      create: {
        name: client.name,
        cnpj: client.cnpj,
        email: client.email,
        segment: client.segment,
        status: "ativo",
      },
    });

    companies.push({ id: company.id, name: company.name, cnpj: company.cnpj });
  }

  return companies;
}

async function getAgencyContext() {
  const agency = await prisma.agency.findFirst({ include: { user: true }, orderBy: { created_at: "asc" } });

  return {
    consultantName: agency?.user?.name ?? AGENCY_NAME,
    consultantEmail: agency?.user?.email ?? null,
    agencyName: agency?.name ?? AGENCY_NAME,
  };
}

async function loadProduct(code: string) {
  return prisma.product.findFirst({
    where: { id: { startsWith: code }, is_active: true },
    include: {
      variations: { where: { is_active: true }, orderBy: { sort_order: "asc" } },
      task_links: {
        where: { catalog_task: { is_active: true } },
        include: { catalog_task: true },
        orderBy: { sort_order: "asc" },
      },
    },
    orderBy: { created_at: "asc" },
  });
}

async function ensureProject(
  spec: SeedProject,
  companyId: string,
  consultantName: string,
  consultantEmail: string | null,
  agencyName: string,
) {
  const existing = await prisma.project.findFirst({
    where: { title: spec.title, agency: agencyName },
    select: { id: true },
  });

  const now = new Date();
  const offsetDays = PROJECTS.findIndex((item) => item.title === spec.title);
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1 + (offsetDays >= 0 ? offsetDays : 0));
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + (spec.lifecycle === "mensal" ? 2 : 1));

  if (existing) {
    await prisma.project.update({
      where: { id: existing.id },
      data: {
        description: spec.description,
        status: spec.status,
        lifecycle: spec.lifecycle,
        type: spec.type,
        client_id: companyId,
        agency: agencyName,
        company_type: "agency",
        consultant: consultantName,
        consultant_email: consultantEmail,
        team_size: spec.teamSize,
        progress: spec.progress,
        start_date: startDate,
        end_date: endDate,
      },
    });

    return { projectId: existing.id, created: false };
  }

  const project = await prisma.project.create({
    data: {
      title: spec.title,
      description: spec.description,
      status: spec.status,
      lifecycle: spec.lifecycle,
      type: spec.type,
      client_id: companyId,
      agency: agencyName,
      company_type: "agency",
      consultant: consultantName,
      consultant_email: consultantEmail,
      team_size: spec.teamSize,
      progress: spec.progress,
      value: 0,
      budget: 0,
      spent: 0,
      from_lead: false,
      bitrix_sync: false,
      portfolio_permission: false,
      overdue: false,
      start_date: startDate,
      end_date: endDate,
    },
    select: { id: true },
  });

  return { projectId: project.id, created: true };
}

async function syncProjectProducts(projectId: string, spec: SeedProject) {
  type LoadedProduct = NonNullable<Awaited<ReturnType<typeof loadProduct>>>;
  const products: LoadedProduct[] = [];

  for (const code of spec.productCodes) {
    const product = await loadProduct(code);
    if (!product) {
      console.warn(`⚠️  Produto ${code} não encontrado, pulando vínculo em ${spec.title}`);
      continue;
    }
    products.push(product);
  }

  let totalValue = 0;

  for (const product of products) {
    const variation = product.variations[0] ?? null;
    const basePrice = variation?.price ?? product.base_price ?? 0;
    const commission = money(basePrice * 0.1);
    const finalPrice = money(basePrice + commission);

    totalValue += finalPrice;

    const current = await prisma.projectProduct.findUnique({
      where: { project_id_product_id: { project_id: projectId, product_id: product.id } },
    });

    const commonData = {
      variation_id: variation?.id ?? null,
      product_name_snapshot: product.name,
      product_code_snapshot: product.id,
      product_category_snapshot: product.category,
      product_price_snapshot: basePrice,
      recurrence_snapshot: getRecurrenceSnapshot(product.metadata, spec.lifecycle),
      preco_final_cliente_snapshot: finalPrice,
      comissao_snapshot: commission,
      pagador_snapshot: "CLIENTE",
      status: getProjectProductStatus(spec.status),
      start_date:
        spec.status === "draft" || spec.status === "negotiation" || spec.status === "awaiting-payment"
          ? null
          : new Date(),
      expected_end_date: spec.lifecycle === "mensal" ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null,
    };

    if (current) {
      await prisma.projectProduct.update({
        where: { id: current.id },
        data: commonData,
      });
      continue;
    }

    await prisma.projectProduct.create({
      data: {
        project_id: projectId,
        product_id: product.id,
        ...commonData,
      },
    });
  }

  if (totalValue > 0) {
    await prisma.project.update({
      where: { id: projectId },
      data: {
        value: totalValue,
        budget: totalValue,
        spent: spec.status === "completed" ? totalValue : spec.status === "in-progress" ? money(totalValue * 0.55) : 0,
      },
    });
  }
}

async function normalizeCompletedStates(projectId: string, status: SeedStatus) {
  const taskStatus = getTaskCompletionStatus(status);
  if (!taskStatus) return;

  const taskIds = await prisma.projectTask.findMany({
    where: { project_id: projectId },
    select: { id: true },
  });

  if (taskIds.length === 0) return;

  const stamp = new Date();

  await prisma.projectTask.updateMany({
    where: { project_id: projectId },
    data: {
      status: taskStatus,
      completed_at: stamp,
      data_conclusao: stamp,
    },
  });

  await prisma.projectTaskStage.updateMany({
    where: { project_task_id: { in: taskIds.map((task) => task.id) } },
    data: { status: taskStatus },
  });
}

async function main() {
  console.log("═══════════════════════════════════════════════════");
  console.log("  🌱  Seed Agency local: projetos por status");
  console.log("═══════════════════════════════════════════════════");

  const clients = await ensureClients();
  const agencyContext = await getAgencyContext();

  let created = 0;
  let reused = 0;

  for (let index = 0; index < PROJECTS.length; index += 1) {
    const spec = PROJECTS[index];
    const client = clients[index % clients.length];

    const { projectId, created: wasCreated } = await ensureProject(
      spec,
      client.id,
      agencyContext.consultantName,
      agencyContext.consultantEmail,
      agencyContext.agencyName,
    );

    if (wasCreated) created += 1;
    else reused += 1;

    await syncProjectProducts(projectId, spec);
    await gerarTarefasDoProjeto(projectId);
    await normalizeCompletedStates(projectId, spec.status);

    console.log(`✓ ${spec.status.padEnd(16)} ${spec.title}`);
  }

  console.log("");
  console.log(`Projetos processados: ${PROJECTS.length}`);
  console.log(`Novos criados:        ${created}`);
  console.log(`Reaproveitados:       ${reused}`);
  console.log(`Agency usada:         ${agencyContext.agencyName}`);
}

main()
  .catch((error) => {
    console.error("❌ Erro no seed Agency:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });