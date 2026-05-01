/**
 * seed-project-products.cjs
 * Vincula produtos reais aos projetos existentes e gera tarefas de execução.
 * Run: node seed-project-products.cjs (from backend/)
 */
const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

async function main() {
  // 1. Buscar projetos existentes
  const projects = await p.project.findMany({
    select: { id: true, title: true, status: true },
    orderBy: { created_at: "asc" },
  });

  if (projects.length === 0) {
    console.error("Nenhum projeto encontrado. Execute seed-projects.cjs primeiro.");
    process.exit(1);
  }
  console.log(`Projetos encontrados: ${projects.length}`);

  // 2. Buscar produtos reais com seus modelos de tarefas
  const products = await p.product.findMany({
    include: {
      task_links: {
        include: { catalog_task: true },
        orderBy: { sort_order: "asc" },
      },
    },
    where: { is_active: true },
    orderBy: { created_at: "asc" },
  });

  if (products.length === 0) {
    console.error("Nenhum produto encontrado.");
    process.exit(1);
  }
  console.log(`Produtos encontrados: ${products.length}`);

  // 3. Definir quais produtos vincular a quais projetos
  // (usando produtos reais e projetos reais existentes)
  const bindings = [
    // Projeto "Site Institucional + SEO" → Layout de Website + SEO
    { projectTitle: "Site Institucional + SEO",      productId: "DC0005" }, // Layout de Website
    { projectTitle: "Site Institucional + SEO",      productId: "PA0002" }, // SEO
    // Projeto "Campanha Redes Sociais" → Layout Redes Sociais + Gestão de Tráfego
    { projectTitle: "Campanha Redes Sociais",        productId: "DC0001" }, // Layout Redes Sociais
    { projectTitle: "Campanha Redes Sociais",        productId: "PA0001" }, // Gestão de Tráfego
    // Projeto "E-commerce Completo" → Layout Website + Data Analytics
    { projectTitle: "E-commerce Completo",           productId: "DC0005" }, // Layout Website
    { projectTitle: "E-commerce Completo",           productId: "PA0004" }, // Configuração Data Analytics
    // Projeto "Identidade Visual & Branding" → Papelaria + Criativos + Template
    { projectTitle: "Identidade Visual & Branding",  productId: "DC0004" }, // Papelaria
    { projectTitle: "Identidade Visual & Branding",  productId: "DC0002" }, // Criativos Mídia Display
    { projectTitle: "Identidade Visual & Branding",  productId: "DC0006" }, // Template Criativos
    // Projeto "App Mobile — Controle de Frotas" → Análise UX
    { projectTitle: "App Mobile",                    productId: "PA0005" }, // Análise UX
    // Projeto "Consultoria em Marketing Digital" → Gestão de Tráfego + Google Negócios
    { projectTitle: "Consultoria em Marketing Digital", productId: "PA0001" }, // Gestão Tráfego
    { projectTitle: "Consultoria em Marketing Digital", productId: "PA0003" }, // Google Negócios
  ];

  let totalPP = 0;
  let totalTasks = 0;
  let skipped = 0;

  for (const binding of bindings) {
    // Encontrar projeto por título parcial
    const project = projects.find((pr) =>
      pr.title.toLowerCase().includes(binding.projectTitle.toLowerCase()),
    );
    if (!project) {
      console.warn(`  ⚠  Projeto "${binding.projectTitle}" não encontrado, pulando.`);
      continue;
    }

    // Encontrar produto (id começa com o código)
    const product = products.find((pr) => pr.id.startsWith(binding.productId));
    if (!product) {
      console.warn(`  ⚠  Produto "${binding.productId}" não encontrado, pulando.`);
      continue;
    }

    // Verificar se já existe vínculo
    const existing = await p.projectProduct.findUnique({
      where: { project_id_product_id: { project_id: project.id, product_id: product.id } },
    });
    if (existing) {
      console.log(`  → já existe: ${project.title} ↔ ${product.name}`);
      skipped++;
      continue;
    }

    // Criar ProjectProduct
    const pp = await p.projectProduct.create({
      data: {
        project_id: project.id,
        product_id: product.id,
        product_name_snapshot: product.name,
        product_code_snapshot: product.id,
        product_category_snapshot: product.category,
        product_price_snapshot: product.base_price,
        status: project.status === "in-progress" ? "EM_EXECUCAO" : "PENDENTE",
      },
    });
    totalPP++;
    console.log(`  ✓  Vinculado: [${project.title}] ↔ [${product.name}] (${product.task_links.length} modelos)`);

    // Gerar ProjectTasks a partir dos modelos (CatalogTask) do produto
    for (const link of product.task_links) {
      const ct = link.catalog_task;
      await p.projectTask.create({
        data: {
          project_id: project.id,
          project_product_id: pp.id,
          product_id: product.id,
          catalog_task_id: ct.id,
          code_snapshot: ct.code,
          name_snapshot: ct.name,
          category_snapshot: ct.category,
          title: ct.name,
          description: ct.description || null,
          status: "A_FAZER",
          priority: ct.default_priority || "medium",
          sort_order: link.sort_order,
          phase: link.phase || null,
          checklist_snapshot: ct.checklist || null,
          steps_snapshot: ct.steps || null,
          briefing_snapshot: ct.briefing_questions || null,
        },
      });
      totalTasks++;
    }
  }

  console.log(`\nSeed concluído:`);
  console.log(`  ProjectProducts criados: ${totalPP}`);
  console.log(`  ProjectTasks geradas:   ${totalTasks}`);
  console.log(`  Vínculos já existentes:  ${skipped}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => p.$disconnect());
