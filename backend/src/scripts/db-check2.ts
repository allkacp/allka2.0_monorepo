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

  const recentProjects = await prisma.project.findMany({
    where: { status: { in: ["in-progress", "awaiting-payment"] } },
    orderBy: { created_at: "desc" },
    take: 5,
    include: {
      project_products: {
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
      tasks: { select: { id: true, status: true } },
      payments: { select: { id: true, status: true, created_at: true } },
    },
  });

  console.log("\n=== Recent in-progress / awaiting-payment projects ===");
  for (const p of recentProjects) {
    console.log(`\nProject: ${p.title} (${p.id}) status=${p.status}`);
    console.log(`  Payments: ${p.payments.length}`);
    console.log(`  ProjectProducts: ${p.project_products.length}`);
    console.log(`  ProjectTasks (total): ${p.tasks.length}`);
    for (const pp of p.project_products) {
      console.log(
        `    PP: ${pp.product_name_snapshot} | tasks_for_pp=${pp.tasks.length} | active_task_links=${pp.product.task_links.length}`,
      );
    }
  }

  await prisma.$disconnect();
}

main().catch(console.error);
