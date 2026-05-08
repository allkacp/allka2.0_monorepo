import { prisma } from "../lib/prisma";

async function main() {
  const products = await prisma.product.count();
  const taskLinks = await prisma.productCatalogTask.count();
  const catalogTasks = await prisma.catalogTask.count();
  const projectProducts = await prisma.projectProduct.count();
  const projectTasks = await prisma.projectTask.count();

  console.log("=== DB CHECK ===");
  console.log("products:", products);
  console.log("catalog_tasks:", catalogTasks);
  console.log("product_task_links:", taskLinks);
  console.log("project_products:", projectProducts);
  console.log("project_tasks:", projectTasks);

  // Note: on Project, relation for products is called "products" (not project_products)
  // and project tasks is "project_tasks"
  const recentProjects = await prisma.project.findMany({
    where: { status: { in: ["in-progress", "awaiting-payment"] } },
    orderBy: { created_at: "desc" },
    take: 5,
    include: {
      products: {        // <-- correct relation name on Project model
        include: {
          product: {
            include: {
              task_links: {
                where: { catalog_task: { is_active: true } },
              },
            },
          },
          tasks: { select: { id: true, status: true } },
        },
      },
      project_tasks: { select: { id: true, status: true } },
      payments: { select: { id: true, status: true, created_at: true } },
    },
  });

  console.log("\n=== Recent in-progress / awaiting-payment projects ===");
  for (const p of recentProjects) {
    console.log(`\nProject: ${p.title} (${p.id}) status=${p.status}`);
    console.log(`  Payments: ${p.payments.length}`);
    console.log(`  ProjectProducts (via products): ${p.products.length}`);
    console.log(`  ProjectTasks (via project_tasks): ${p.project_tasks.length}`);
    for (const pp of p.products) {
      console.log(
        `    PP: ${pp.product_name_snapshot} | tasks_for_pp=${pp.tasks.length} | active_task_links=${pp.product.task_links.length}`,
      );
    }
  }

  // Check generate-tasks path specifically
  console.log("\n=== Verifying generate-tasks query ===");
  const testPP = await prisma.projectProduct.findFirst({
    include: {
      product: {
        include: {
          task_links: {
            where: { catalog_task: { is_active: true } },
            include: { catalog_task: true },
            orderBy: { sort_order: "asc" },
          },
        },
      },
    },
  });
  if (testPP) {
    console.log(`ProjectProduct query works. Product: ${testPP.product.name}, task_links: ${testPP.product.task_links.length}`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
