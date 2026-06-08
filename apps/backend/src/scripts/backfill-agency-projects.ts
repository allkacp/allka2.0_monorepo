import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { gerarTarefasDoProjeto } from "../lib/generate-tasks";

const prisma = new PrismaClient();

const AGENCY_STATUSES = [
  "draft",
  "awaiting-payment",
  "planning",
  "in-progress",
  "completed",
  "cancelled",
] as const;

const BLOCKED_STATUSES = new Set(["draft", "awaiting-payment", "negotiation"]);
const LIVE_STATUSES = new Set(["planning", "in-progress", "paused"]);
const COMPLETED_STATUS = "completed";
const CANCELLED_STATUS = "cancelled";
const OPEN_TASK_STATUSES = new Set([
  "PARA_LANCAMENTO",
  "EM_LANCAMENTO",
  "AGUARDANDO_INFORMACOES",
  "LIBERADA_PARA_EXECUCAO",
  "EM_EXECUCAO",
  "EM_REVISAO",
  "EM_APROVACAO",
  "AGUARDANDO_NOMADE",
]);

type ProductRecord = Awaited<ReturnType<typeof prisma.product.findMany>>[number];

function parseMetadata(product: ProductRecord): Record<string, any> {
  if (!product.metadata) return {};
  try {
    const parsed = JSON.parse(product.metadata);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function normalizeRecurrence(value: unknown): "avulso" | "mensal" | null {
  if (typeof value !== "string") return null;
  const text = value.toLowerCase();
  if (text.includes("mensal")) return "mensal";
  if (text.includes("avulso")) return "avulso";
  return null;
}

function isLifecycleCompatible(product: ProductRecord, lifecycle: string) {
  const recurrence = normalizeRecurrence(parseMetadata(product).recurrence);
  if (!recurrence) return true;
  if (lifecycle === "mensal") return recurrence === "mensal";
  if (lifecycle === "avulso") return recurrence === "avulso";
  return true;
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function money(value: number) {
  return Math.round(value * 100) / 100;
}

async function getDefaultAgencyContext() {
  const [company, user, agency] = await Promise.all([
    prisma.company.findFirst({ orderBy: { created_at: "asc" } }),
    prisma.user.findFirst({
      where: { account_type: "agencias", is_active: true },
      orderBy: { created_at: "asc" },
    }),
    prisma.agency.findFirst({
      include: { user: true },
      orderBy: { created_at: "asc" },
    }),
  ]);

  return {
    company,
    consultantName: user?.name ?? agency?.user?.name ?? null,
    consultantEmail: user?.email ?? agency?.user?.email ?? null,
    agencyName: agency?.name ?? user?.name ?? "Agency",
  };
}

function getProjectLifecycle(status: string): "avulso" | "mensal" {
  if (status === "planning" || status === "in-progress" || status === "completed") {
    return "mensal";
  }
  return "avulso";
}

function getProjectProgress(status: string) {
  switch (status) {
    case "draft":
      return 0;
    case "awaiting-payment":
      return 5;
    case "planning":
      return 15;
    case "in-progress":
      return 55;
    case "completed":
      return 100;
    case "cancelled":
      return 20;
    default:
      return 0;
  }
}

async function ensureDemoStatusProjects() {
  const defaultContext = await getDefaultAgencyContext();
  if (!defaultContext.company) {
    throw new Error("Nenhuma empresa encontrada para criar projetos de demonstração");
  }

  const existingProjects = await prisma.project.findMany({
    where: {
      type: { contains: "Marketing" },
      status: { in: [...AGENCY_STATUSES] },
    },
    select: { id: true, status: true },
  });

  const existingByStatus = new Set(existingProjects.map((project) => project.status));
  const missingStatuses = AGENCY_STATUSES.filter((status) => !existingByStatus.has(status));

  if (missingStatuses.length === 0) {
    return [] as Array<{ id: string; status: string; created: boolean }>;
  }

  const created: Array<{ id: string; status: string; created: boolean }> = [];

  for (const status of missingStatuses) {
    const title = `${defaultContext.company.name} — ${status.replace("-", " ")}`;
    const project = await prisma.project.create({
      data: {
        title,
        description: `Projeto de demonstração criado automaticamente para garantir cobertura do status ${status}.`,
        client_id: defaultContext.company.id,
        status,
        lifecycle: getProjectLifecycle(status),
        type: "Marketing Digital",
        value: 0,
        budget: 0,
        spent: 0,
        progress: getProjectProgress(status),
        agency: defaultContext.agencyName,
        company_type: "agency",
        consultant: defaultContext.consultantName,
        consultant_email: defaultContext.consultantEmail,
        team_size: 1,
        bitrix_sync: false,
        portfolio_permission: false,
        overdue: false,
        from_lead: false,
        start_date: new Date(),
      },
      select: { id: true, status: true },
    });
    created.push({ ...project, created: true });
  }

  return created;
}

async function ensureLinkedProducts(project: { id: string; title: string; status: string; lifecycle: string; value: number; start_date: Date | null; updated_at: Date; created_at: Date; products: Array<any>; payments: Array<any> }) {
  const linkedProductIds = new Set(project.products.map((item) => item.product_id));
  const eligibleProducts = await prisma.product.findMany({
    where: {
      is_active: true,
      task_links: { some: { catalog_task: { is_active: true } } },
    },
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

  const compatibleProducts = eligibleProducts.filter((product) => isLifecycleCompatible(product, project.lifecycle));
  const productPool = compatibleProducts.length > 0 ? compatibleProducts : eligibleProducts;
  const shuffledPool = shuffle(productPool.filter((product) => !linkedProductIds.has(product.id)));

  const missingCount = project.products.length === 0 ? 1 : 0;
  const createdLinks: string[] = [];

  for (let i = 0; i < missingCount; i += 1) {
    const product = shuffledPool[i] ?? productPool.find((item) => !linkedProductIds.has(item.id));
    if (!product) {
      throw new Error("Não foi possível encontrar produtos ativos e contratáveis para o backfill.");
    }

    const variation = product.variations[0] ?? null;
    const basePrice = variation?.price ?? product.base_price ?? 0;
    const commissionAmount = money(basePrice * 0.1);

    const projectProduct = await prisma.projectProduct.create({
      data: {
        project_id: project.id,
        product_id: product.id,
        variation_id: variation?.id ?? null,
        product_name_snapshot: product.name,
        product_code_snapshot: product.id,
        product_category_snapshot: product.category,
        product_price_snapshot: basePrice,
        recurrence_snapshot: normalizeRecurrence(parseMetadata(product).recurrence) ?? project.lifecycle,
        preco_final_cliente_snapshot: money(basePrice + commissionAmount),
        comissao_snapshot: commissionAmount,
        pagador_snapshot: "CLIENTE",
        status:
          project.status === "completed"
            ? "CONCLUIDO"
            : project.status === "cancelled"
              ? "CANCELADO"
              : BLOCKED_STATUSES.has(project.status)
                ? "PENDENTE"
                : "EM_EXECUCAO",
        start_date: project.start_date ?? project.created_at,
        expected_end_date: project.lifecycle === "mensal" ? new Date((project.start_date ?? project.created_at).getTime() + 30 * 24 * 60 * 60 * 1000) : null,
      },
      select: { id: true, product_id: true },
    });

    linkedProductIds.add(projectProduct.product_id);
    createdLinks.push(projectProduct.product_id);
  }

  const updateData: Record<string, unknown> = {};
  if (project.value <= 0 && project.products.length + createdLinks.length > 0) {
    const linkedProducts = await prisma.projectProduct.findMany({
      where: { project_id: project.id },
      select: { preco_final_cliente_snapshot: true },
    });
    const totalValue = linkedProducts.reduce(
      (sum, item) => sum + (Number(item.preco_final_cliente_snapshot) || 0),
      0,
    );
    if (totalValue > 0) updateData.value = money(totalValue);
  }

  if (Object.keys(updateData).length > 0) {
    await prisma.project.update({ where: { id: project.id }, data: updateData });
  }

  return createdLinks;
}

async function normalizeExistingProjectProducts(project: { id: string; status: string; lifecycle: string; start_date: Date | null; created_at: Date; products: Array<any>; payments: Array<any> }) {
  const anchorDate = project.payments.find((payment) => payment.paid_at)?.paid_at ?? project.start_date ?? project.created_at;

  for (const projectProduct of project.products) {
    const product = projectProduct.product;
    const metadata = parseMetadata(product);
    const recurrence = normalizeRecurrence(metadata.recurrence) ?? project.lifecycle;
    const basePrice = Number(projectProduct.product_price_snapshot) || Number(product.base_price) || 0;
    const commissionAmount = Number(projectProduct.comissao_snapshot) || money(basePrice * 0.1);
    const finalPrice = Number(projectProduct.preco_final_cliente_snapshot) || money(basePrice + commissionAmount);

    const data: Record<string, unknown> = {};

    if (!projectProduct.product_name_snapshot) data.product_name_snapshot = product.name;
    if (!projectProduct.product_code_snapshot) data.product_code_snapshot = product.id;
    if (!projectProduct.product_category_snapshot) data.product_category_snapshot = product.category;
    if (!projectProduct.product_price_snapshot) data.product_price_snapshot = basePrice;
    if (!projectProduct.recurrence_snapshot) data.recurrence_snapshot = recurrence;
    if (!projectProduct.preco_final_cliente_snapshot) data.preco_final_cliente_snapshot = finalPrice;
    if (!projectProduct.comissao_snapshot) data.comissao_snapshot = commissionAmount;
    if (!projectProduct.pagador_snapshot) data.pagador_snapshot = "CLIENTE";
    if (!projectProduct.start_date && project.status !== "draft") data.start_date = anchorDate;
    if (!projectProduct.expected_end_date && recurrence === "mensal") {
      data.expected_end_date = new Date(anchorDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    }

    const currentStatus = projectProduct.status;
    let desiredStatus = currentStatus;
    if (project.status === COMPLETED_STATUS && currentStatus !== "CANCELADO") {
      desiredStatus = "CONCLUIDO";
    } else if (project.status === CANCELLED_STATUS && currentStatus !== "CONCLUIDO") {
      desiredStatus = "CANCELADO";
    } else if (LIVE_STATUSES.has(project.status) && currentStatus === "PENDENTE") {
      desiredStatus = "EM_EXECUCAO";
    } else if (BLOCKED_STATUSES.has(project.status) && currentStatus !== "CANCELADO" && currentStatus !== "CONCLUIDO") {
      desiredStatus = "PENDENTE";
    }

    if (desiredStatus !== currentStatus) {
      data.status = desiredStatus;
    }

    if (Object.keys(data).length > 0) {
      await prisma.projectProduct.update({ where: { id: projectProduct.id }, data });
    }
  }
}

async function normalizeTasks(project: { id: string; status: string; lifecycle: string; start_date: Date | null; created_at: Date; updated_at: Date; payments: Array<{ paid_at: Date | null; created_at: Date }>; project_tasks: Array<{ id: string; status: string }> }) {
  const hasPayments = project.payments.length > 0;
  const paymentAnchor = project.payments.find((payment) => payment.paid_at)?.paid_at ?? project.payments[0]?.created_at ?? project.start_date ?? project.created_at;

  const openTaskCount = project.project_tasks.filter((task) => OPEN_TASK_STATUSES.has(task.status)).length;
  const totalTaskCount = project.project_tasks.length;

  if (BLOCKED_STATUSES.has(project.status)) {
    if (openTaskCount > 0) {
      await prisma.projectTask.updateMany({
        where: {
          project_id: project.id,
          status: { in: [...OPEN_TASK_STATUSES] },
        },
        data: {
          status: "CANCELADA",
          completed_at: paymentAnchor,
          data_conclusao: paymentAnchor,
        },
      });
    }
    return;
  }

  const shouldGenerateTasks =
    LIVE_STATUSES.has(project.status) ||
    project.status === COMPLETED_STATUS ||
    (project.status === CANCELLED_STATUS && (hasPayments || totalTaskCount > 0));

  if (shouldGenerateTasks && totalTaskCount === 0) {
    await gerarTarefasDoProjeto(project.id, {
      paidAt: paymentAnchor,
    });
  }

  if (project.status === COMPLETED_STATUS) {
    await prisma.projectTask.updateMany({
      where: {
        project_id: project.id,
        status: { notIn: ["CONCLUIDA", "CANCELADA"] },
      },
      data: {
        status: "CONCLUIDA",
        completed_at: paymentAnchor,
        data_conclusao: paymentAnchor,
      },
    });

    const taskIds = (await prisma.projectTask.findMany({
      where: { project_id: project.id },
      select: { id: true },
    })).map((task) => task.id);

    if (taskIds.length > 0) {
      await prisma.projectTaskStage.updateMany({
        where: { project_task_id: { in: taskIds } },
        data: { status: "CONCLUIDA" },
      });
    }
    return;
  }

  if (project.status === CANCELLED_STATUS) {
    await prisma.projectTask.updateMany({
      where: {
        project_id: project.id,
        status: { in: [...OPEN_TASK_STATUSES] },
      },
      data: {
        status: "CANCELADA",
        completed_at: paymentAnchor,
        data_conclusao: paymentAnchor,
      },
    });
  }
}

async function main() {
  console.log("═══════════════════════════════════════════════════");
  console.log("  🔧  Backfill seguro dos projetos Agency");
  console.log("═══════════════════════════════════════════════════");

  const createdDemoProjects = await ensureDemoStatusProjects();
  if (createdDemoProjects.length > 0) {
    console.log(`🧪 Projetos de demonstração criados: ${createdDemoProjects.length}`);
  } else {
    console.log("✅ Nenhum projeto de demonstração adicional foi necessário");
  }

  const agencyProjects = await prisma.project.findMany({
    where: {
      type: { contains: "Marketing" },
    },
    include: {
      products: {
        include: {
          product: {
            include: {
              variations: { where: { is_active: true }, orderBy: { sort_order: "asc" } },
              task_links: {
                where: { catalog_task: { is_active: true } },
                include: { catalog_task: true },
                orderBy: { sort_order: "asc" },
              },
            },
          },
        },
        orderBy: { created_at: "asc" },
      },
      payments: { orderBy: { created_at: "desc" } },
      project_tasks: { orderBy: { created_at: "asc" } },
    },
    orderBy: { created_at: "asc" },
  });

  let productsCreated = 0;
  let productsUpdated = 0;
  let tasksTouched = 0;

  for (const project of agencyProjects) {
    const beforeProducts = project.products.length;
    const beforeTasks = project.project_tasks.length;

    await ensureLinkedProducts(project);

    const refreshedProject = await prisma.project.findUnique({
      where: { id: project.id },
      include: {
        products: {
          include: {
            product: {
              include: {
                variations: { where: { is_active: true }, orderBy: { sort_order: "asc" } },
                task_links: {
                  where: { catalog_task: { is_active: true } },
                  include: { catalog_task: true },
                  orderBy: { sort_order: "asc" },
                },
              },
            },
          },
          orderBy: { created_at: "asc" },
        },
        payments: { orderBy: { created_at: "desc" } },
        project_tasks: { orderBy: { created_at: "asc" } },
      },
    });

    if (!refreshedProject) {
      continue;
    }

    await normalizeExistingProjectProducts(refreshedProject as any);
    await normalizeTasks(refreshedProject as any);

    const afterProducts = refreshedProject.products.length;
    const afterTasks = (await prisma.projectTask.count({ where: { project_id: project.id } }));

    if (afterProducts > beforeProducts) {
      productsCreated += afterProducts - beforeProducts;
    }
    if (afterTasks > beforeTasks) {
      tasksTouched += afterTasks - beforeTasks;
    }

    if (afterProducts > 0) {
      console.log(`✅ ${project.title} | produtos=${afterProducts} | tarefas=${afterTasks}`);
    } else {
      console.log(`⚠️  ${project.title} | sem produtos vinculados`);
    }
  }

  const summaryProjects = await prisma.project.count({ where: { type: { contains: "Marketing" } } });
  const summaryProducts = await prisma.projectProduct.count({
    where: {
      project: { type: { contains: "Marketing" } },
    },
  });
  const summaryTasks = await prisma.projectTask.count({
    where: {
      project: { type: { contains: "Marketing" } },
    },
  });

  console.log("═══════════════════════════════════════════════════");
  console.log("  ✅  Backfill concluído");
  console.log(`   Projetos Agency : ${summaryProjects}`);
  console.log(`   Produtos ligados: ${summaryProducts}`);
  console.log(`   Tarefas Agency  : ${summaryTasks}`);
  console.log(`   Produtos criados: ${productsCreated}`);
  console.log(`   Tarefas novas   : ${tasksTouched}`);
  console.log("═══════════════════════════════════════════════════");
}

main()
  .catch((err) => {
    console.error("❌ Erro no backfill Agency:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });