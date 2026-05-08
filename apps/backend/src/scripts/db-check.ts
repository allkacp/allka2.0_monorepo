import { prisma } from "../lib/prisma";

async function main() {
  const [products, taskLinks, catalogTasks, projectProducts, projectTasks] =
    await Promise.all([
      prisma.product.count(),
      prisma.productCatalogTask.count(),
      prisma.catalogTask.count(),
      prisma.projectProduct.count(),
      prisma.projectTask.count(),
    ]);

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

  console.log("\n=== Recent projects ===");
  for (const project of recentProjects) {
    console.log(
      `\nProject: ${project.title} (${project.id}) status=${project.status}`,
    );
    console.log(`  Payments: ${project.payments.length}`);
    console.log(`  ProjectProducts: ${project.project_products.length}`);
    console.log(`  ProjectTasks (total): ${project.tasks.length}`);

    for (const projectProduct of project.project_products) {
      console.log(
        `    PP: ${projectProduct.product_name_snapshot} | tasks_for_pp=${projectProduct.tasks.length} | active_task_links=${projectProduct.product.task_links.length}`,
      );
    }
  }

  if (projectProducts > 0) {
    const sampleProjectProducts = await prisma.projectProduct.findMany({
      take: 5,
      include: {
        product: {
          include: {
            task_links: {
              where: { catalog_task: { is_active: true } },
              include: { catalog_task: true },
            },
          },
        },
        project: { select: { id: true, title: true, status: true } },
      },
    });

    for (const projectProduct of sampleProjectProducts) {
      console.log(`\nProjectProduct: ${projectProduct.id}`);
      console.log(
        `  Project: ${projectProduct.project.title} (${projectProduct.project.status})`,
      );
      console.log(`  Product: ${projectProduct.product.name}`);
      console.log(
        `  Active task_links: ${projectProduct.product.task_links.length}`,
      );

      for (const taskLink of projectProduct.product.task_links) {
        console.log(
          `    - ${taskLink.catalog_task.name} (active=${taskLink.catalog_task.is_active})`,
        );
      }
    }
  }

  if (catalogTasks > 0) {
    const catalogTaskSamples = await prisma.catalogTask.findMany({
      take: 3,
      select: { id: true, name: true, is_active: true, steps: true },
    });

    console.log("\n=== Sample CatalogTasks ===");
    for (const catalogTask of catalogTaskSamples) {
      const stepCount = catalogTask.steps
        ? JSON.parse(catalogTask.steps).length
        : 0;
      console.log(
        `  ${catalogTask.name} | active=${catalogTask.is_active} | steps=${stepCount}`,
      );
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
