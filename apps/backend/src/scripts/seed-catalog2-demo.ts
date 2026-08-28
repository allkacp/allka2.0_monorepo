/**
 * Fixture LOCAL da fundação do novo catálogo (sprint de produtos, bloco 2/6).
 *
 *   npm run catalog2:seed-demo
 *   npm run catalog2:seed-demo -- --remove
 *
 * Cria NO MÁXIMO UM produto demonstrativo, prefixado com `[TESTE LOCAL]`,
 * com: 1 versão publicada + 1 versão rascunho, 1 variação (com opções), 1
 * adicional, tarefas ordenadas e etapas ordenadas (uma tarefa híbrida com
 * campos de IA). NUNCA se mistura aos 36 produtos da planilha. Não roda
 * automaticamente — é um script explícito e repetível.
 */
import { prisma } from "../lib/prisma";
import { ensureCatalog2Foundation } from "../lib/catalog2-foundation";
import { publishVersion } from "../lib/catalog2-service";

const SLUG = "teste-local-produto-demonstrativo";
const NAME = "[TESTE LOCAL] Produto Demonstrativo";

async function remove() {
  const p = await prisma.catalog2Product.findUnique({ where: { slug: SLUG } });
  if (!p) {
    console.log("Nada a remover.");
    return;
  }
  // Desamarra a versão publicada e apaga tudo (as versões cascateiam pelas
  // tarefas/variações/adicionais; o produto é Restrict, então limpamos antes).
  await prisma.catalog2Product.update({ where: { id: p.id }, data: { published_version_id: null } });
  await prisma.catalog2ProductVersion.deleteMany({ where: { product_id: p.id } });
  await prisma.catalog2ProductFourF.deleteMany({ where: { product_id: p.id } });
  await prisma.catalog2Product.delete({ where: { id: p.id } });
  console.log("Fixture removido.");
}

async function main() {
  if (process.argv.includes("--remove")) {
    await remove();
    return;
  }
  await ensureCatalog2Foundation();

  const existing = await prisma.catalog2Product.findUnique({ where: { slug: SLUG } });
  if (existing) {
    console.log(`Fixture já existe: ${existing.id}. Use --remove para recriar.`);
    return;
  }

  const pillar = await prisma.catalog2Pillar.findUnique({ where: { key: "redes_conteudo" } });
  const category = await prisma.catalog2Category.findUnique({ where: { key: "design" } });
  const fF = await prisma.catalog2FourF.findMany({ where: { key: { in: ["fluxo", "forca"] } } });
  const designer = await prisma.catalog2Specialty.findUnique({ where: { key: "designer" } });
  const redator = await prisma.catalog2Specialty.findUnique({ where: { key: "redator" } });

  // Produto + versão 1 (rascunho -> será publicada)
  const product = await prisma.catalog2Product.create({
    data: {
      slug: SLUG,
      internal_name: NAME,
      pillar_id: pillar?.id ?? null,
      category_id: category?.id ?? null,
      origin: "existente",
      status: "em_preparacao",
      four_f: { create: fF.map((f) => ({ four_f_id: f.id })) },
    },
  });

  const v1 = await prisma.catalog2ProductVersion.create({
    data: {
      product_id: product.id,
      version_number: 1,
      state: "rascunho",
      title: "Peça de Comunicação (demo)",
      summary: "Arte + copy + legenda para redes sociais.",
      full_description: "Versão 1 — usada para validar a arquitetura do novo catálogo.",
      variations: {
        create: [
          {
            key: "formato",
            name: "Formato",
            sort_order: 1,
            options: {
              create: [
                { key: "estatico", label: "Estático", sort_order: 1 },
                { key: "carrossel", label: "Carrossel", sort_order: 2 },
                { key: "motion", label: "Motion", sort_order: 3 },
              ],
            },
          },
        ],
      },
      addons: {
        create: [
          {
            key: "legenda_extra",
            name: "Pacote de legendas extra",
            description: "Add-on opcional — não é uma escolha obrigatória.",
            sort_order: 1,
          },
        ],
      },
      tasks: {
        create: [
          {
            key: "briefing",
            name: "Alinhar briefing",
            objective: "Entender o objetivo da peça.",
            sort_order: 1,
            execution_mode: "humano",
            specialty_id: redator?.id ?? null,
            steps: {
              create: [
                { key: "coletar", name: "Coletar referências", sort_order: 1 },
                { key: "validar", name: "Validar com o cliente", sort_order: 2 },
              ],
            },
          },
          {
            key: "criacao",
            name: "Criar a arte",
            objective: "Produzir a peça visual.",
            sort_order: 2,
            execution_mode: "hibrido",
            specialty_id: designer?.id ?? null,
            steps: {
              create: [
                { key: "rascunho", name: "Gerar rascunho", sort_order: 1 },
                { key: "refino", name: "Refinar com direção de arte", sort_order: 2 },
                { key: "entrega", name: "Exportar e entregar", sort_order: 3 },
              ],
            },
            ai: {
              create: {
                provider: "(a definir)",
                model: "(a definir)",
                est_input_tokens: 1200,
                est_output_tokens: 800,
                cost_note: "Placeholder — sem cálculo de preço neste bloco.",
                human_review_required: true,
              },
            },
          },
        ],
      },
      conditions: {
        create: [
          {
            key: "urgencia",
            name: "Prazo urgente",
            applies_to: "prazo",
            trigger_note: "Cliente marca 'urgente' na contratação.",
            effect_note: "Poderá reduzir o prazo (regra real virá no bloco 3).",
          },
        ],
      },
    },
  });

  // Publica a v1 e cria a v2 rascunho.
  await publishVersion(v1.id, "system");
  await prisma.catalog2ProductVersion.create({
    data: {
      product_id: product.id,
      version_number: 2,
      state: "rascunho",
      title: "Peça de Comunicação (demo) — revisão em andamento",
      summary: "Rascunho da próxima versão.",
      full_description: "Versão 2 — em rascunho, editável.",
    },
  });

  const fresh = await prisma.catalog2Product.findUnique({ where: { id: product.id } });
  console.log(
    JSON.stringify(
      { product_id: product.id, slug: SLUG, status: fresh?.status, published_version_id: fresh?.published_version_id },
      null,
      2,
    ),
  );
  console.log('\nPara remover: npm run catalog2:seed-demo -- --remove');
}

main().finally(() => prisma.$disconnect());
